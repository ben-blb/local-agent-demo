import { average, max, min, sum } from './calculator.tool.js';
import { ToolError } from './errors.js';
import { listAllowedFiles } from './list_files.tool.js';
import { readFile } from './read_file.tool.js';

export const MAX_TOOL_CALLS = 10;

export type ToolResult =
	| { ok: true; result: unknown }
	| { ok: false; error: { code: string; message: string } };

type Args = Record<string, unknown>;

function numbersArg(args: Args): number[] {
	const { numbers } = args;
	if (
		!Array.isArray(numbers) ||
		numbers.length === 0 ||
		!numbers.every((n) => typeof n === 'number' && Number.isFinite(n))
	) {
		throw new ToolError(
			'INVALID_ARGUMENTS',
			'"numbers" must be a non-empty array of finite numbers',
		);
	}
	return numbers;
}

function filenameArg(args: Args): string {
	const { filename } = args;
	if (typeof filename !== 'string' || filename.length === 0) {
		throw new ToolError(
			'INVALID_ARGUMENTS',
			'"filename" must be a non-empty string',
		);
	}
	return filename;
}

const handlers: Record<string, (args: Args) => unknown> = {
	list_files: () => listAllowedFiles(),
	read_file: (args) => readFile(filenameArg(args)),
	average: (args) => average(numbersArg(args)),
	sum: (args) => sum(numbersArg(args)),
	min: (args) => min(numbersArg(args)),
	max: (args) => max(numbersArg(args)),
};

function normalize(error: unknown): { code: string; message: string } {
	if (error instanceof ToolError) {
		return { code: error.code, message: error.message };
	}
	const code = (error as NodeJS.ErrnoException)?.code;
	if (code === 'ENOENT') {
		return { code: 'FILE_NOT_FOUND', message: 'File not found' };
	}
	if (code === 'EISDIR') {
		return { code: 'INVALID_ARGUMENTS', message: 'Path is a directory' };
	}
	return { code: 'TOOL_EXECUTION_ERROR', message: 'Tool execution failed' };
}

export function executeTool(name: string, args: unknown): ToolResult {
	try {
		if (!Object.hasOwn(handlers, name)) {
			throw new ToolError('TOOL_NOT_ALLOWED', `Unknown tool: ${name}`);
		}
		const safeArgs =
			args && typeof args === 'object' && !Array.isArray(args)
				? (args as Args)
				: {};
		return { ok: true, result: handlers[name]!(safeArgs) };
	} catch (error) {
		return { ok: false, error: normalize(error) };
	}
}

export function limitReached(): ToolResult {
	return {
		ok: false,
		error: {
			code: 'TOOL_LIMIT_REACHED',
			message: `Tool call limit (${MAX_TOOL_CALLS}) reached; answer with what you have`,
		},
	};
}
