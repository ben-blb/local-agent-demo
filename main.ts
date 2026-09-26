import ollama from 'ollama';
import { stdin, stdout } from 'process';
import * as readline from 'readline';

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
		});

		for await (const part of response) {
			stdout.write(part.message.content);
		}
		stdout.write('\n');
		rl.prompt();
	}
}).on('close', () => {
	console.log('Exiting agent demo.');
	process.exit(0);
});
