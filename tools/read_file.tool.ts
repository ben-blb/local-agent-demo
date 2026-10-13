import * as fs from 'fs';
import * as path from 'path';
import { ALLOWED_DIR } from './constants.js';
import { ToolError } from './errors.js';

// FASE 4 — Implementación de read_file (`readFile`, abajo).
// FASE 6 — Path boundary: `resolveAllowedPath` resuelve rutas absolutas y
// bloquea todo lo que quede fuera de ./data (p. ej. ../private-demo.txt).
/** Path boundary: returns the real path of a file inside ALLOWED_DIR. */
export function resolveAllowedPath(fileName: string): string {
	const root = fs.realpathSync(path.join(process.cwd(), ALLOWED_DIR));
	const target = path.resolve(root, fileName);
	// realpath also resolves symlinks so they cannot point outside the root
	let real: string;
	try {
		real = fs.realpathSync(target);
	} catch {
		// Missing file: still reject traversal before reporting not found
		assertInside(root, target);
		throw new ToolError('FILE_NOT_FOUND', `File not found: ${fileName}`);
	}
	assertInside(root, real);
	return real;
}

export function readFile(allowedPath: string): string {
	return fs.readFileSync(allowedPath, 'utf-8');
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
