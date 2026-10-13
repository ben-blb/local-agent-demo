// FASE 6 — Códigos de error normalizados: estables y comprensibles para el agente.
export type ToolErrorCode =
	| 'TOOL_NOT_ALLOWED'
	| 'INVALID_ARGUMENTS'
	| 'PATH_NOT_ALLOWED'
	| 'FILE_NOT_FOUND'
	| 'TOOL_LIMIT_REACHED'
	| 'TOOL_EXECUTION_ERROR';

export class ToolError extends Error {
	constructor(
		readonly code: ToolErrorCode,
		message: string,
	) {
		super(message);
	}
}
