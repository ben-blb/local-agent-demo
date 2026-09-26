import type { Trace } from 'opik';
import { endSpan } from '../observability.js';
import { average, max, min, sum } from './calculator.tool.js';
import { ToolError } from './errors.js';
import { listAllowedFiles } from './list_files.tool.js';
import { readFile, resolveAllowedPath } from './read_file.tool.js';

export const MAX_TOOL_CALLS = 10;

export type ToolResult =
	| { ok: true; result: unknown }
	| { ok: false; error: { code: string; message: string } };

type Args = Record<string, unknown>;

interface ToolDef<P = unknown, A = P> {
	/** Name used for the tool.* span */
	span: string;
	parse: (args: Args) => P;
	/** Path boundary check; only tools that touch the filesystem define it */
	authorize?: (parsed: P) => A;
	run: (input: A) => unknown;
}

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

const calculator = (run: (n: number[]) => number): ToolDef<number[]> => ({
	span: 'calculator',
	parse: numbersArg,
	run,
});

// The registry is the allowlist: only names listed here can ever run.
const handlers: Record<string, ToolDef<any, any>> = {
	list_files: {
		span: 'list_files',
		parse: () => undefined,
		run: listAllowedFiles,
	},
	read_file: {
		span: 'read_file',
		parse: filenameArg,
		authorize: resolveAllowedPath,
		run: readFile,
	},
	average: calculator(average),
	sum: calculator(sum),
	min: calculator(min),
	max: calculator(max),
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

/** Runs a harness rule inside a guardrail span recording allow/deny + reason. */
function guard<T>(
	trace: Trace,
	name: string,
	rule: string,
	input: Record<string, unknown>,
	check: () => T,
): T {
	const span = trace.span({
		name,
		type: 'guardrail',
		input: { rule, ...input },
	});
	try {
		const value = check();
		span.update({ output: { rule, decision: 'allow' } });
		return value;
	} catch (error) {
		span.update({
			output: {
				rule,
				decision: 'deny',
				code: normalize(error).code,
				reason: normalize(error).message,
			},
		});
		throw error;
	} finally {
		span.end();
	}
}

/**
 * Runs one tool call under the harness rules, recording harness.* and tool.*
 * spans under `trace`. Never throws.
 */
export function executeTool(
	trace: Trace,
	name: string,
	args: unknown,
	callNumber: number,
): ToolResult {
	try {
		guard(
			trace,
			'harness.tool_limit',
			'max_tool_calls',
			{ tool: name, call_number: callNumber, max: MAX_TOOL_CALLS },
			() => {
				if (callNumber > MAX_TOOL_CALLS) {
					throw new ToolError(
						'TOOL_LIMIT_REACHED',
						`Tool call limit (${MAX_TOOL_CALLS}) reached; answer with what you have`,
					);
				}
			},
		);
		const def = guard(
			trace,
			'harness.validate_tool',
			'tool_allowlist',
			{ tool: name },
			() => {
				if (!Object.hasOwn(handlers, name)) {
					throw new ToolError(
						'TOOL_NOT_ALLOWED',
						`Unknown tool: ${name}`,
					);
				}
				return handlers[name]!;
			},
		);
		const safeArgs: Args =
			args && typeof args === 'object' && !Array.isArray(args)
				? (args as Args)
				: {};
		const parsed = guard(
			trace,
			'harness.validate_args',
			'argument_schema',
			{ tool: name, arguments: safeArgs },
			() => def.parse(safeArgs),
		);
		const input = def.authorize
			? guard(
					trace,
					'harness.validate_path',
					'path_boundary',
					{ tool: name, arguments: safeArgs },
					() => def.authorize!(parsed),
				)
			: parsed;
		return runTool(trace, name, def, safeArgs, input);
	} catch (error) {
		return { ok: false, error: normalize(error) };
	}
}

function runTool(
	trace: Trace,
	name: string,
	def: ToolDef<any, any>,
	args: Args,
	input: unknown,
): ToolResult {
	const span = trace.span({
		name: `tool.${def.span}`,
		type: 'tool',
		input: { tool_name: name, arguments: args },
	});
	let result: ToolResult;
	let failure: unknown;
	try {
		result = { ok: true, result: def.run(input) };
	} catch (error) {
		failure = error;
		result = { ok: false, error: normalize(error) };
	}
	span.update({ output: result as unknown as Record<string, unknown> });
	endSpan(span, failure);
	return result;
}
