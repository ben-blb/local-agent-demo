import { Opik, type Span } from 'opik';

// FASE 7 y 8 — Cliente de Opik y helpers de tracing. Si Opik no está
// configurado, el agente sigue funcionando sin enviar traces.
const projectName = 'local-agent-demo';

// Reads OPIK_URL_OVERRIDE / OPIK_API_KEY / OPIK_WORKSPACE from the environment.
// The SDK throws when they are missing, so fall back to a client that keeps
// spans in memory and is never flushed, instead of breaking the agent.
let tracingEnabled = true;

function createClient(): Opik {
	try {
		return new Opik({ projectName });
	} catch (error) {
		tracingEnabled = false;
		console.warn(
			`Opik tracing disabled: ${error instanceof Error ? error.message : error}`,
		);
		return new Opik({
			projectName,
			trackDisable: true,
			holdUntilFlush: true,
		});
	}
}

export const opik = createClient();

export async function flushTraces(): Promise<void> {
	if (tracingEnabled) await opik.flush().catch(() => {});
}

export function truncate(text: string, max = 500): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function toErrorInfo(error: unknown) {
	const e = error instanceof Error ? error : new Error(String(error));
	return {
		exceptionType: e.name,
		message: e.message,
		traceback: e.stack ?? '',
	};
}

export function endSpan(span: Span, error?: unknown): void {
	if (error !== undefined) span.update({ errorInfo: toErrorInfo(error) });
	span.end();
}
