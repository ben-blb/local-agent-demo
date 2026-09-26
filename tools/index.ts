export const tools = [
	{
		type: 'function',
		function: {
			name: 'list_files',
			description: 'List all files in the allowed directory',
		},
	},
	{
		type: 'function',
		function: {
			name: 'read_file',
			description: 'Read the contents of a file in the allowed directory',
			parameters: {
				type: 'string',
				name: 'filename',
				description: 'The name of the file to read',
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'average',
			description: 'Calculate the average of a list of numbers',
			parameters: {
				numbers: {
					type: 'array',
					items: {
						type: 'number',
					},
					description:
						'The list of numbers to calculate the average of',
				},
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'sum',
			description: 'Calculate the sum of a list of numbers',
			arguments: {
				numbers: {
					type: 'array',
					items: {
						type: 'number',
					},
					description: 'The list of numbers to calculate the sum of',
				},
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'min',
			description: 'Calculate the minimum of a list of numbers',
			arguments: {
				numbers: {
					type: 'array',
					items: {
						type: 'number',
					},
					description:
						'The list of numbers to calculate the minimum of',
				},
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'max',
			description: 'Calculate the maximum of a list of numbers',
			arguments: {
				numbers: {
					type: 'array',
					items: {
						type: 'number',
					},
					description:
						'The list of numbers to calculate the maximum of',
				},
			},
		},
	},
];
