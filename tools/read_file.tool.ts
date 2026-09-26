import * as fs from 'fs';
import * as path from 'path';
import { ALLOWED_DIR } from './constants.js';
import { ToolError } from './errors.js';

export function readFile(fileName: string): string {
	const root = fs.realpathSync(path.join(process.cwd(), ALLOWED_DIR));
	const target = path.resolve(root, fileName);
	let real: string;
	try {
		real = fs.realpathSync(target);
	} catch {
		assertInside(root, target);
		throw new ToolError('FILE_NOT_FOUND', `File not found: ${fileName}`);
	}
	assertInside(root, real);
	return fs.readFileSync(real, 'utf-8');
}

function assertInside(root: string, target: string): void {
	const rel = path.relative(root, target);
	if (rel.startsWith('..') || path.isAbsolute(rel)) {
		throw new ToolError(
			'PATH_NOT_ALLOWED',
			'Path is outside the allowed directory',
		);
	}
}
