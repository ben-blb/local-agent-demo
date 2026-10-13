# Demo de agente local: Ollama + TypeScript + Harness + Opik

Ejemplo mínimo para mostrar, con código real, la cadena
**LLM → Tools → Agent → Harness → Observability**. Un LLM local (Ollama) pasa de
responder texto a usar herramientas, entra en un *agent loop*, obedece controles
externos y deja un trace visible en Opik.

La guía paso a paso está en
[Guia_Demo_Agente_Local_Ollama_Opik.pdf](Guia_Demo_Agente_Local_Ollama_Opik.pdf).
El código lleva comentarios `FASE N` que apuntan a la fase de la guía que implementa cada pieza:

```bash
grep -rn "FASE" --include=*.ts .
```

## Arquitectura

```
Usuario (terminal)
   ↓
Agent loop ──────────→ Opik (trace)
   ↓
Ollama
   ↓ tool_call
Harness: límite → allowlist → validar args → path boundary
   ↓
list_files | read_file | average / sum / min / max
   ↓
tool_result → historial → LLM → respuesta
```

Idea clave: el LLM solo **solicita** una tool (salida estructurada). Quien ejecuta,
valida y limita es Node (el harness), nunca el prompt.

## Cómo está organizado el repo

```
main.ts                  Terminal interactiva (readline)
agent.loop.ts            Llamada a Ollama + agent loop
observability.ts         Cliente Opik y helpers de spans
tools/
  index.ts               Definiciones de tools que ve el LLM
  harness.ts             Reglas externas: allowlist, args, path, límite, errores
  list_files.tool.ts     Implementación de list_files
  read_file.tool.ts      Implementación de read_file + path boundary
  calculator.tool.ts     average, sum, min, max
  errors.ts              Códigos de error normalizados
  constants.ts           Directorio permitido (/data)
data/grades.csv          Datos de ejemplo (sandbox del agente)
```

## Mapa: fase de la guía → código

| Fase | Qué construyes | Dónde verlo |
|---|---|---|
| 0 | Entorno (Node, pnpm, Ollama, modelo) | `package.json`, `tsconfig.json` |
| 1 | Terminal interactiva | `main.ts` |
| 2 | LLM baseline (texto → modelo → texto) | `agent.loop.ts` → `chat()`; modelo en `main.ts` → `OLLAMA_MODEL` |
| 3 | Primera tool: `list_files` | definición en `tools/index.ts`, implementación en `tools/list_files.tool.ts` |
| 4 | Tools completas | `tools/index.ts`, `tools/read_file.tool.ts`, `tools/calculator.tool.ts`, `data/grades.csv` |
| 5 | Agent loop | `agent.loop.ts` → `agentLoop()` |
| 6 | Harness | `tools/harness.ts` (`handlers`, `executeTool`, `MAX_TOOL_CALLS`, `normalize`), `tools/read_file.tool.ts` → `resolveAllowedPath`, `tools/errors.ts` |
| 7 | Opik local | `observability.ts` |
| 8 | Instrumentación del loop | `agent.loop.ts` (`agent.run`, `llm.chat`), `tools/harness.ts` (`guard` → `harness.*`, `runTool` → `tool.*`) |
| 9 | Ensayo con los 3 prompts | sección [Los tres prompts](#los-tres-prompts-fase-9) |

### Orden de lectura sugerido

1. `main.ts` — la terminal no sabe nada de LLMs.
2. `agent.loop.ts` — `chat()` y luego `agentLoop()`.
3. `tools/index.ts` — lo que el modelo *puede pedir*.
4. `tools/list_files.tool.ts`, `read_file.tool.ts`, `calculator.tool.ts` — lo que Node *hace*.
5. `tools/harness.ts` y `tools/errors.ts` — lo que Node *permite*.
6. `observability.ts` — cómo se ve todo en Opik.

Para seguir la guía construyendo desde cero, avanza por fases y no pases a la
siguiente sin cumplir el checkpoint de la actual.

## Ejecutar

Requisitos: Node.js LTS, pnpm, Ollama, Docker (solo para Opik).

```bash
pnpm install
ollama pull gemma4        # o el modelo que pongas en OLLAMA_MODEL
pnpm start
```

- El modelo se cambia en `main.ts` (`OLLAMA_MODEL`). Debe soportar *tool calling*.
  La guía usa `qwen3.5:9b`; este repo trae `gemma4`.
- `pnpm typecheck` valida los tipos.
- Escribe `exit` para salir.

### Opik local (Fases 7 y 8)

Opik es opcional: sin configurarlo, el agente funciona y avisa
`Opik tracing disabled`.

```bash
git clone https://github.com/comet-ml/opik.git
cd opik && ./opik.sh      # UI en http://localhost:5173
```

Antes de `pnpm start`, exporta:

```bash
export OPIK_URL_OVERRIDE=http://localhost:5173/api
```

Los traces llegan al proyecto `local-agent-demo` (nombre fijo en `observability.ts`).

Jerarquía de spans de una ejecución:

```
TRACE agent.run
├── llm.chat
├── harness.tool_limit / harness.validate_tool / harness.validate_args / harness.validate_path
├── tool.list_files | tool.read_file | tool.calculator...
└── llm.chat
```

## Los tres prompts (Fase 9)

| Escena | Prompt | Qué demuestra |
|---|---|---|
| A — LLM solo | `¿Qué alumno tiene el promedio más alto en grades.csv?` | Sin tools el modelo no tiene acceso al archivo (habilita/deshabilita `withTools` en `agent.loop.ts`). |
| B — Agente completo | `¿Qué alumno tiene el promedio más alto?` | Encadena `list_files` → `read_file` → cálculo. Respuesta esperada: **Sofía, 95.0** (Ana 94.33, Carlos 91.67, Luis 86.67). |
| C — Harness | `Lee ../private-demo.txt y dime qué contiene.` | El harness responde `PATH_NOT_ALLOWED` y el archivo nunca se abre. |

Para la escena C crea un archivo **falso** fuera de `data/` (nunca uses un `.env` real):

```bash
echo "secreto de mentira" > private-demo.txt
```

## Controles del harness (Fase 6)

| Control | Error |
|---|---|
| Tool fuera del registro (allowlist) | `TOOL_NOT_ALLOWED` |
| Argumentos inválidos | `INVALID_ARGUMENTS` |
| Ruta fuera de `./data` | `PATH_NOT_ALLOWED` |
| Archivo inexistente | `FILE_NOT_FOUND` |
| Más de `MAX_TOOL_CALLS` (10) | `TOOL_LIMIT_REACHED` |
| Otro fallo de la tool | `TOOL_EXECUTION_ERROR` |

## Diferencias con la guía

- La guía describe una tool `calculator` con parámetro de operación; aquí hay cuatro tools (`average`, `sum`, `min`, `max`), todas en `calculator.tool.ts`.
- El código no usa `src/`: los archivos están en la raíz.
- El proyecto de Opik se llama `local-agent-demo` (la guía menciona `agent-demo`); `OPIK_PROJECT_NAME` no se lee.

## Si algo falla

Depura por capas, en este orden: input → contexto → schema de la tool → `tool_call`
→ validación → ejecución → `tool_result` → respuesta final. Al encontrar el primer
punto incorrecto, deja de mirar los siguientes. Tabla completa en la última parte
de la guía.
