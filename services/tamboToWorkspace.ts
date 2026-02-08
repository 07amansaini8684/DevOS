import { ToolType } from '../types';

export interface TamboComponentMessage {
  componentName: string;
  props: Record<string, unknown>;
}

/**
 * Maps Tambo's component name + props to our workspace ToolType and payload
 * so we can open the tool on the right panel with the AI-generated data.
 */
export function tamboComponentToTool(
  componentName: string,
  props: Record<string, unknown>
): { type: ToolType; payload: Record<string, unknown> } | null {
  const p = props as Record<string, unknown>;
  switch (componentName) {
    case 'Graph':
      return { type: ToolType.ChartBuilder, payload: { data: p.data, type: p.type } };
    case 'ChartViewer':
      return { type: ToolType.ChartViewer, payload: { data: p.data } };
    case 'Table':
      return { type: ToolType.TableViewer, payload: { data: p.data ?? p.jsonContent, columns: p.columns } };
    case 'CodeBlock':
      return { type: ToolType.CodeGenerator, payload: { code: p.code, language: p.language, title: p.title } };
    case 'CodeGenerator':
      return { type: ToolType.CodeGenerator, payload: { task: p.task, language: p.language, framework: p.framework } };
    case 'JsonView':
      // Pass data as object or string; JsonViewer normalizes and shows parse errors
      return {
        type: ToolType.JsonViewer,
        payload: { data: p.data ?? p.jsonContent ?? '{}' },
      };
    case 'ApiRequest': {
      const headers: Record<string, string> = {};
      if (typeof p.contentType === 'string') headers['Content-Type'] = p.contentType;
      if (typeof p.authorization === 'string') headers['Authorization'] = p.authorization;
      return {
        type: ToolType.ApiTester,
        payload: {
          method: p.method,
          url: p.url,
          headers: Object.keys(headers).length ? headers : undefined,
          body: p.body,
        },
      };
    }
    case 'Markdown':
      return { type: ToolType.MarkdownViewer, payload: { content: p.content ?? p.markdownContent, markdownContent: p.markdownContent ?? p.content } };
    case 'FormBuilder': {
      const schema: Record<string, unknown> =
        p.firstName !== undefined || p.lastName !== undefined || p.email !== undefined ||
        (Array.isArray(p.roleOptions) && p.roleOptions.length > 0) || p.active !== undefined
          ? {
              ...(p.firstName !== undefined && { firstName: p.firstName }),
              ...(p.lastName !== undefined && { lastName: p.lastName }),
              ...(p.email !== undefined && { email: p.email }),
              ...(Array.isArray(p.roleOptions) && p.roleOptions.length > 0 && { role: p.roleOptions }),
              ...(p.active !== undefined && { active: p.active }),
            }
          : {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john@example.com',
              role: ['Admin', 'User', 'Guest'],
              active: true,
            };
      return { type: ToolType.FormGenerator, payload: { schema } };
    }
    case 'LogViewer':
      return { type: ToolType.LogViewer, payload: { logs: p.logs } };
    case 'EnvManager':
      return { type: ToolType.EnvManager, payload: { envContent: p.envContent ?? p.env } };
    case 'Terminal':
      return { type: ToolType.TerminalSimulator, payload: { command: p.command ?? '' } };
    default:
      return null;
  }
}

/** Extract first https? URL from message content (text parts) for fallback when component props lack url */
export function extractUrlFromMessageContent(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const text = content
    .map((part: { type?: string; text?: string }) => (part?.type === 'text' && part?.text ? part.text : ''))
    .join(' ');
  const match = text.match(/https?:\/\/[^\s"'<>)\]]+/i);
  return match ? match[0].replace(/[.,;:)]+$/, '') : null;
}

/** Get the last user message from the thread (for extracting URL user typed before assistant replied) */
export function getLastUserMessageContent(messages: Array<{ role: string; content: unknown }>): unknown {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return null;
}

/** Get the last user message as plain text (for CodeGenerator task fallback when Tambo omits task) */
export function getLastUserMessageText(messages: Array<{ role: string; content: unknown }>): string {
  const content = getLastUserMessageContent(messages);
  if (!content) return '';
  if (Array.isArray(content)) {
    return content
      .map((part: { type?: string; text?: string }) => (part?.type === 'text' && part?.text ? part.text : ''))
      .join('\n')
      .trim();
  }
  return typeof content === 'string' ? content.trim() : '';
}

function contentToText(content: unknown): string {
  if (!content) return '';
  if (Array.isArray(content)) {
    return content
      .map((part: { type?: string; text?: string }) => (part?.type === 'text' && part?.text ? part.text : ''))
      .join('\n')
      .trim();
  }
  return typeof content === 'string' ? content.trim() : '';
}

/** Find the most recent user message that looks like .env content (contains KEY=value). Used when last message might be a short follow-up. */
export function getLastUserMessageTextLikeEnv(messages: Array<{ role: string; content: unknown }>): string {
  const envLike = /[A-Za-z_][A-Za-z0-9_]*\s*=/;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    const text = contentToText(messages[i].content);
    if (text && envLike.test(text)) return text;
  }
  return getLastUserMessageText(messages);
}

/** Find the most recent user message that looks like log output (timestamps, [INFO], [ERROR], etc.). Use for LogViewer so full paste is used even if last message is short. */
export function getLastUserMessageTextLikeLogs(messages: Array<{ role: string; content: unknown }>): string {
  const logLike = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i; // ISO timestamp
  const levelLike = /\]\s*(INFO|ERROR|WARN|DEBUG|AUTH|CRON|WORKER)\s/i;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    const text = contentToText(messages[i].content);
    if (text && (logLike.test(text) || levelLike.test(text))) return text;
  }
  return getLastUserMessageText(messages);
}

/** Extract shell command from user message (e.g. "run npm run dev" -> "npm run dev", "check node version" -> "node -v"). */
export function extractCommandFromUserMessage(text: string): string {
  const t = text.trim();
  if (!t) return '';
  const runPrefix = /^(?:run|execute|please run|can you run|try running?|run this)\s+/i;
  const withoutRun = t.replace(runPrefix, '').trim();
  if (withoutRun !== t) return withoutRun;
  // "check node version" -> node -v; "list files" -> ls; "start server" -> npm run dev
  if (/check\s+node\s+version|node\s+version/i.test(t)) return 'node -v';
  if (/list\s+files?|show\s+files?|dir\s+contents?/i.test(t)) return 'ls';
  if (/start\s+(?:the\s+)?server|run\s+server/i.test(t)) return 'npm run dev';
  if (/git\s+status|status\s+of\s+repo/i.test(t)) return 'git status';
  if (/install\s+(?:deps?|packages?|npm)/i.test(t)) return 'npm install';
  return t;
}

/** Extract a JSON object or array from text (e.g. user pasted JSON in chat). Returns raw string for JsonViewer. */
export function extractJsonFromText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    // Try to find JSON substring: first { or [, then match brackets
    const startObj = trimmed.indexOf('{');
    const startArr = trimmed.indexOf('[');
    let start: number;
    let open: string;
    let close: string;
    if (startObj >= 0 && (startArr < 0 || startObj < startArr)) {
      start = startObj;
      open = '{';
      close = '}';
    } else if (startArr >= 0) {
      start = startArr;
      open = '[';
      close = ']';
    } else {
      return null;
    }
    let depth = 0;
    let inString: string | null = null;
    let i = start;
    while (i < trimmed.length) {
      const c = trimmed[i];
      if (inString) {
        if (c === inString && trimmed[i - 1] !== '\\') inString = null;
        i++;
        continue;
      }
      if (c === '"' || c === "'") {
        inString = c;
        i++;
        continue;
      }
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          const candidate = trimmed.slice(start, i + 1);
          try {
            JSON.parse(candidate);
            return candidate;
          } catch {
            return null;
          }
        }
      }
      i++;
    }
  }
  return null;
}

/** Human-readable label for Tambo component name (for "Opened X in workspace") */
export function tamboComponentToLabel(componentName: string): string {
  const labels: Record<string, string> = {
    Graph: 'Chart',
    ChartViewer: 'Chart Viewer',
    Table: 'Table',
    CodeBlock: 'Code',
    CodeGenerator: 'Code Generator',
    JsonView: 'JSON Viewer',
    ApiRequest: 'API Tester',
    Markdown: 'Markdown',
    FormBuilder: 'Form',
    LogViewer: 'Log Viewer',
    EnvManager: 'Env Manager',
    Terminal: 'Terminal',
  };
  return labels[componentName] ?? componentName;
}
