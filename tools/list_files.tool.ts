import * as fs from 'fs';
import { ALLOWED_DIR } from './constants.js';

function listFiles(directory: string): string[] {
	return fs.readdirSync(directory);
}

export function listAllowedFiles(): string[] {
	return listFiles(process.cwd() + ALLOWED_DIR);
}
