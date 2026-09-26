import type { Tool } from 'ollama';

const numbersTool = (name: string, what: string): Tool => ({
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
	{
		type: 'function',
		function: {
			name: 'list_files',
			description: 'List all files in the allowed directory',
			parameters: { type: 'object', properties: {} },
		},
	},
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
