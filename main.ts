import * as readline from 'readline';
import { stdin, stdout } from 'process';
console.log('Agent demo started. Type "exit" to quit.');
const rl = readline.createInterface({
  input: stdin,
  output: stdout,
  prompt: '> '
});

rl.prompt();


rl.on('line', (line) => {
  if (line.trim() === 'exit') {
    rl.close();
  } else {
    console.log(`You typed: ${line}`);
    rl.prompt();
  }
}).on('close', () => {
  console.log('Exiting agent demo.');
  process.exit(0);
});