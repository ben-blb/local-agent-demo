import * as fs from 'fs';
import { ALLOWED_DIR } from './constants.js';

// FASE 3 — Implementación real de list_files: Node accede al filesystem, solo
// dentro de ./data. El LLM únicamente la solicita (definición en index.ts).
function listFiles(directory: string): string[] {
	return fs.readdirSync(directory);
}

export function listAllowedFiles(): string[] {
	return listFiles(process.cwd() + ALLOWED_DIR);
}
