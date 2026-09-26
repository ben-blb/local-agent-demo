import * as fs from 'fs';

const ALLOWED_DIR = '/data';

function listFiles(directory: string): string[] {
	return fs.readdirSync(directory);
}

export function listAllowedFiles(): string[] {
	return listFiles(process.cwd() + ALLOWED_DIR);
}
