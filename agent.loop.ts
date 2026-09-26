import ollama, { type Message, type ToolCall } from 'ollama';
import type { Trace } from 'opik';
import { stdout } from 'process';
import {
	endSpan,
	flushTraces,
	opik,
	toErrorInfo,
	truncate,
} from './observability.js';
import { executeTool, MAX_TOOL_CALLS } from './tools/harness.js';
import { tools } from './tools/index.js';

type Outcome = 'completed' | 'tool_limit_reached' | 'error';

interface ChatStep {
	content: string;
	thinking: string;
	toolCalls: ToolCall[];
}

async function chat(
	trace: Trace,
	model: string,
	messages: Message[],
	withTools: boolean,
): Promise<ChatStep> {
	const last = messages[messages.length - 1]!;
	const span = trace.span({
		name: 'llm.chat',
		type: 'llm',
		model,
		provider: 'ollama',
		input: {
			message_count: messages.length,
			tools_enabled: withTools,
			last_message: { role: last.role, content: truncate(last.content) },
		},
	});
	const started = Date.now();
	try {
		const stream = await ollama.chat({
			model,
			messages,
			tools: withTools ? tools : undefined,
			think: true,
			stream: true,
		});

		let thinking = '';
		let content = '';
		const toolCalls: ToolCall[] = [];
		let section: 'thinking' | 'content' | null = null;
		let usage: Record<string, number> | undefined;

		for await (const chunk of stream) {
			const { thinking: t, content: c, tool_calls } = chunk.message;
			if (t) {
				if (section !== 'thinking') stdout.write('\nThinking: ');
				section = 'thinking';
				thinking += t;
				stdout.write(t);
			}
			if (c) {
				if (section !== 'content') stdout.write('\nAgent: ');
				section = 'content';
				content += c;
				stdout.write(c);
			}
			if (tool_calls) toolCalls.push(...tool_calls);
			if (chunk.done) {
				usage = {
					prompt_tokens: chunk.prompt_eval_count,
					completion_tokens: chunk.eval_count,
					total_tokens: chunk.prompt_eval_count + chunk.eval_count,
				};
			}
		}
		stdout.write('\n');

		span.update({
			output: {
				content: truncate(content),
				thinking_chars: thinking.length,
				tool_calls: toolCalls.map((c) => c.function.name),
			},
			metadata: { duration_ms: Date.now() - started },
			...(usage && { usage }),
		});
		endSpan(span);
		return { content, thinking, toolCalls };
	} catch (error) {
		span.update({ metadata: { duration_ms: Date.now() - started } });
		endSpan(span, error);
		throw error;
	}
}

export async function agentLoop(message: string, model: string): Promise<void> {
	const trace = opik.trace({
		name: 'agent.run',
		input: { question: message },
		metadata: { model },
	});
	const messages: Message[] = [{ role: 'user', content: message }];
	let toolCallCount = 0;
	let outcome: Outcome = 'completed';
	let answer = '';

	try {
		while (true) {
			// Once the budget is spent, drop tools so the model must answer
			const budgetSpent = toolCallCount >= MAX_TOOL_CALLS;
			const { content, thinking, toolCalls } = await chat(
				trace,
				model,
				messages,
				!budgetSpent,
			);
			answer = content;

			messages.push({
				role: 'assistant',
				content,
				thinking,
				tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
			});

			if (toolCalls.length === 0 || budgetSpent) break;

			for (const call of toolCalls) {
				const { name, arguments: args } = call.function;
				console.log(`Tool called: ${name} ${JSON.stringify(args)}`);
				const result = executeTool(trace, name, args, ++toolCallCount);
				if (!result.ok) {
					console.log(`Tool error: ${result.error.code}`);
					if (result.error.code === 'TOOL_LIMIT_REACHED') {
						outcome = 'tool_limit_reached';
					}
				}
				messages.push({
					role: 'tool',
					content: JSON.stringify(result),
					tool_name: name,
				});
			}
		}
	} catch (error) {
		outcome = 'error';
		trace.update({ errorInfo: toErrorInfo(error) });
		throw error;
	} finally {
		trace.update({
			output: { answer },
			metadata: { model, tool_calls: toolCallCount, outcome },
		});
		trace.end();
		await flushTraces();
	}
}
