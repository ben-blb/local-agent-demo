import ollama from 'ollama';
import { stdout } from 'process';
import { average, max, min, sum } from './tools/calculator.tool.js';
import { tools } from './tools/index.js';
import { listAllowedFiles } from './tools/list_files.tool.js';
import { readFile } from './tools/read_file.tool.js';

export async function agentLoop(message: string, model: string): Promise<void> {
	const messages = [{ role: 'user', content: message }];
	while (true) {
		const response = await ollama.chat({
			model,
			messages,
			tools: tools,
			think: true,
		});

		messages.push(response.message);
		console.log(`Thinking: ${response.message.thinking}`);
		console.log(`Agent: ${response.message.content}`);

		const toolCalls = response.message.tool_calls || [];
		if (toolCalls.length > 0) {
			for (const call of toolCalls) {
				let result;
				console.log(`Tool called: ${call.function.name}`);
				console.log(
					`Arguments: ${JSON.stringify(call.function.arguments)}`,
				);
				if (call.function.name === 'list_files') {
					result = listAllowedFiles();
				} else if (call.function.name === 'read_file') {
					const fileName = call.function.arguments.filename;
					if (typeof fileName === 'string') {
						try {
							result = readFile(fileName);
						} catch (error: any) {
							stdout.write(
								`Error reading file: ${error.message}\n`,
							);
							result = `Error reading file: ${error.message}`;
						}
					} else {
						stdout.write('Invalid argument for read_file tool.\n');
						result = 'Invalid argument for read_file tool';
					}
				} else if (
					call.function.name === 'average' ||
					call.function.name === 'sum' ||
					call.function.name === 'min' ||
					call.function.name === 'max'
				) {
					const numbers = call.function.arguments.numbers;
					if (
						Array.isArray(numbers) &&
						numbers.every((num) => typeof num === 'number')
					) {
						switch (call.function.name) {
							case 'average':
								result = average(numbers);
								break;
							case 'sum':
								result = sum(numbers);
								break;
							case 'min':
								result = min(numbers);
								break;
							case 'max':
								result = max(numbers);
								break;
						}
					} else {
						stdout.write('Invalid argument for calculator tool.\n');
						result = 'Invalid argument for calculator tool';
					}
				}
				messages.push({
					role: 'tool',
					content: String(result),
					tool_name: call.function.name,
				});
			}
		} else {
			break;
		}
	}
}
