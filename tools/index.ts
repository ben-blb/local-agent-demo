import type { Tool } from 'ollama';

// FASE 3 y 4 — Definiciones visibles para el LLM (nombre, descripción, schema).
// Solo le dicen qué PUEDE pedir; la ejecución real vive en `*.tool.ts` y el
// control en `harness.ts`.

// FASE 4 — calculator: operaciones conocidas sobre una lista de números.
const numbersTool =(name: string, what: string): Tool => ({
	type: 'function',
	function: {
		name,
		description: `Calculate the ${what} of a list of numbers`,
		parameters: {
			type: 'object',
			properties: {
				numbers: {
					type: 'array',
					items: { type: 'number' },
					description: `The list of numbers to calculate the ${what} of`,
				},
			},
			required: ['numbers'],
		},
	},
});

export const tools: Tool[] = [
	// FASE 3 — primera tool: list_files (implementación en list_files.tool.ts)
	{
		type: 'function',
		function: {
			name: 'list_files',
			description: 'List all files in the allowed directory',
			parameters: { type: 'object', properties: {} },
		},
	},
	// FASE 4 — read_file (implementación en read_file.tool.ts)
	{
		type: 'function',
		function: {
			name: 'read_file',
			description: 'Read the contents of a file in the allowed directory',
			parameters: {
				type: 'object',
				properties: {
					filename: {
						type: 'string',
						description: 'The name of the file to read',
					},
				},
				required: ['filename'],
			},
		},
	},
	numbersTool('average', 'average'),
	numbersTool('sum', 'sum'),
	numbersTool('min', 'minimum'),
	numbersTool('max', 'maximum'),
];
