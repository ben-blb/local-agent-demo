import ollama, { type Message, type ToolCall } from 'ollama';
import { stdout } from 'process';
import { executeTool, limitReached, MAX_TOOL_CALLS } from './tools/harness.js';
import { tools } from './tools/index.js';

export async function agentLoop(message: string, model: string): Promise<void> {
	const messages: Message[] = [{ role: 'user', content: message }];
	let toolCallCount = 0;

	while (true) {
		const budgetSpent = toolCallCount >= MAX_TOOL_CALLS;
		const stream = await ollama.chat({
			model,
			messages,
			tools: budgetSpent ? undefined : tools,
			think: true,
			stream: true,
		});

		let thinking = '';
		let content = '';
		const toolCalls: ToolCall[] = [];
		let section: 'thinking' | 'content' | null = null;

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
		}
		stdout.write('\n');

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
			const result =
				++toolCallCount > MAX_TOOL_CALLS
					? limitReached()
					: executeTool(name, args);
			if (!result.ok) console.log(`Tool error: ${result.error.code}`);
			messages.push({
				role: 'tool',
				content: JSON.stringify(result),
				tool_name: name,
			});
		}
	}
}
