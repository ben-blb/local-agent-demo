import ollama from 'ollama';
import { stdin, stdout } from 'process';
import * as readline from 'readline';
import { tools } from './tools/index.js';
import { listAllowedFiles } from './tools/list_files.tool.js';

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
