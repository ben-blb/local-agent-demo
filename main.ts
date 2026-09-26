import ollama from 'ollama';
import { stdin, stdout } from 'process';
import * as readline from 'readline';
import { average, max, min, sum } from './tools/calculator.tool.js';
import { tools } from './tools/index.js';
import { listAllowedFiles } from './tools/list_files.tool.js';
import { readFile } from './tools/read_file.tool.js';

const OLLAMA_MODEL = 'gemma4';

console.log('Agent demo started. Type "exit" to quit.');
const rl = readline.createInterface({
	input: stdin,
	output: stdout,
	prompt: '> ',
});

rl.prompt();

rl.on('line', async (line) => {
	if (line.trim() === 'exit') {
		rl.close();
	} else {
		const response = await ollama.chat({
			model: OLLAMA_MODEL,
			messages: [{ role: 'user', content: line }],
			stream: true,
			tools: tools,
		});

		for await (const part of response) {
			stdout.write(part.message.content);
			if (part.message.tool_calls) {
				for (const call of part.message.tool_calls) {
					stdout.write(`\nTool called: ${call.function.name}\n`);
					stdout.write(
						`Arguments: ${JSON.stringify(call.function.arguments)}\n`,
					);
					if (call.function.name === 'list_files') {
						const files = listAllowedFiles();
						stdout.write(
							`Files in allowed directory: ${files.join(', ')}\n`,
						);
					} else if (call.function.name === 'read_file') {
						const fileName = call.function.arguments.filename;
						if (typeof fileName === 'string') {
							try {
								const content = readFile(fileName);
								stdout.write(
									`Content of ${fileName}:\n${content}\n`,
								);
							} catch (error: any) {
								stdout.write(
									`Error reading file: ${error.message}\n`,
								);
							}
						} else {
							stdout.write(
								'Invalid argument for read_file tool.\n',
							);
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
							let result;
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
							stdout.write(
								`Result of ${call.function.name}: ${result}\n`,
							);
						} else {
							stdout.write(
								'Invalid argument for calculator tool.\n',
							);
						}
					}
				}
			}
		}
		stdout.write('\n');
		rl.prompt();
	}
}).on('close', () => {
	console.log('Exiting agent demo.');
	process.exit(0);
});
