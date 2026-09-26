import * as fs from 'fs';
import { ALLOWED_DIR } from './constants.js';

export function readFile(fileName: string): string {
	const filePath = process.cwd() + ALLOWED_DIR + '/' + fileName;
	return fs.readFileSync(filePath, 'utf-8');
}
