import { stdin, stdout } from 'process';
import * as readline from 'readline';
import { agentLoop } from './agent.loop.js';

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
		await agentLoop(line.trim(), OLLAMA_MODEL).catch((error) => {
			console.error('Error in agent loop:', error);
		});
		stdout.write('\n');
		rl.prompt();
	}
}).on('close', () => {
	console.log('Exiting agent demo.');
	process.exit(0);
});
