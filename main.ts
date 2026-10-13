import { stdin, stdout } from 'process';
import * as readline from 'readline';
import { agentLoop } from './agent.loop.js';

// FASE 2 — El modelo es un valor configurable en un solo lugar (guía: fija el
// nombre exacto del modelo, no uses `latest`).
const OLLAMA_MODEL = 'gemma4';

// FASE 1 — Terminal interactiva: lee una línea, la pasa a `agentLoop` y vuelve
// a preguntar. No sabe nada de Ollama ni de tools; `exit` termina el programa.
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
