import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ToolType } from '../../types';

type LineKind = 'prompt' | 'stdout' | 'stderr';
interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
}

type RunStatus = 'idle' | 'running' | 'success' | 'failed';
const LINE_DELAY_MS = 80;
const PROMPT = '$';

/** Detect output type for auto-opening the right tool */
function detectOutputType(output: string): { type: ToolType; payload: Record<string, unknown> } | null {
  const trimmed = output.trim();
  if (!trimmed) return null;
  // JSON (array or object)
  const jsonStart = trimmed.search(/\s*(\[|\{)/);
  if (jsonStart >= 0) {
    const slice = trimmed.slice(jsonStart).trim();
    const endObj = slice.startsWith('{') ? slice.lastIndexOf('}') : slice.lastIndexOf(']');
    if (endObj > 0) {
      const candidate = slice.slice(0, endObj + 1);
      try {
        JSON.parse(candidate);
        return { type: ToolType.JsonViewer, payload: { data: candidate } };
      } catch {
        // not valid JSON
      }
    }
  }
  // Logs: [timestamp], [INFO], server starting, compiling, ready on port
  if (
    /\[.*\]\s*\[?(INFO|ERROR|WARN|DEBUG)\]?/i.test(trimmed) ||
    /(server starting|compiling|ready on port|listening on|started)/i.test(trimmed) ||
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/m.test(trimmed)
  ) {
    return { type: ToolType.LogViewer, payload: { logs: output } };
  }
  // Markdown: # heading, ##, **, -, 1.
  if (/^#+\s/m.test(trimmed) || /^#{1,6}\s+\w/.test(trimmed) || (/^[-*]\s/m.test(trimmed) && trimmed.length > 100)) {
    return { type: ToolType.MarkdownViewer, payload: { content: output } };
  }
  // Tabular: multiple columns (same number of spaces/tabs per line) or | sep
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length >= 2 && lines.some((l) => l.includes('|'))) {
    return { type: ToolType.TableViewer, payload: { data: output } };
  }
  return null;
}

/** Simulated command execution: streams lines one by one. In production you would call a backend API that runs real commands. */
async function runCommand(
  command: string,
  onChunk?: (line: string, isStderr: boolean) => void
): Promise<{ exitCode: number; fullOutput: string }> {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);
  const allLines: string[] = [];
  let exitCode = 0;

  const emit = (line: string, isStderr = false) => {
    allLines.push(line);
    onChunk?.(line, isStderr);
  };

  const stream = async (lines: string[], isStderr = false) => {
    for (const line of lines) {
      await new Promise((r) => setTimeout(r, LINE_DELAY_MS));
      emit(line, isStderr);
    }
  };

  // echo — output the rest of the line (strip one layer of surrounding " or ', trailing ;)
  if (cmd === 'echo') {
    const rest = command.trim().slice(4).trim().replace(/;\s*$/, '');
    const stripped =
      (rest.startsWith('"') && rest.endsWith('"')) || (rest.startsWith("'") && rest.endsWith("'"))
        ? rest.slice(1, -1)
        : rest;
    await stream(['', stripped]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // mkdir — simulate creating directory(ies)
  if (cmd === 'mkdir') {
    const names = args.filter((a) => a !== '-p' && !a.startsWith('-'));
    if (names.length === 0) {
      await stream([''], false);
      await stream(['mkdir: missing operand'], true);
      return { exitCode: 1, fullOutput: allLines.join('\n') };
    }
    const lines = names.map((n) => `mkdir: created directory '${n}'`);
    await stream(['', ...lines]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // pwd, whoami, date
  if (cmd === 'pwd') {
    await stream(['', '/Users/developer/DevOS']);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }
  if (cmd === 'whoami') {
    await stream(['', 'developer']);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }
  if (cmd === 'date') {
    await stream(['', new Date().toString()]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // npm run dev / start
  if ((cmd === 'npm' && (args[0] === 'run' && (args[1] === 'dev' || args[1] === 'start'))) || cmd === 'yarn' && args[0] === 'dev') {
    await stream([
      '',
      '[ server starting... ]',
      '[ compiling... ]',
      'vite v5.x.x building for development...',
      'ready in 1234 ms',
      '[ ready on port 3000 ]',
      'Local:   http://localhost:3000/',
    ]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // npm install
  if (cmd === 'npm' && args[0] === 'install') {
    await stream([
      '',
      'added 247 packages in 12s',
      'auditing packages...',
      'found 0 vulnerabilities',
    ]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // node -v
  if (cmd === 'node' && (args[0] === '-v' || args[0] === '--version')) {
    await stream(['', 'v20.10.0']);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // ls / dir
  if (cmd === 'ls' || cmd === 'dir') {
    const dir = args[0] && args[0] !== '-' ? args[0] + '/' : '';
    await stream([
      '',
      dir + 'src/',
      dir + 'public/',
      dir + 'node_modules/',
      dir + 'package.json',
      dir + 'tsconfig.json',
      dir + 'README.md',
      dir + 'vite.config.ts',
    ]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // git status
  if (cmd === 'git' && args[0] === 'status') {
    await stream([
      '',
      'On branch main',
      'Changes not staged for commit:',
      '  modified:   src/App.tsx',
      '  modified:   components/Tools/TerminalSimulator.tsx',
      '',
      'no changes added to commit',
    ]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // curl -> JSON (simulate)
  if (cmd === 'curl' && args.length > 0) {
    const url = args.find((a) => a.startsWith('http'));
    const isJson = !url || /json|api|todos|users/i.test(url ?? '');
    if (isJson) {
      await stream([
        '',
        '[ { "id": 1, "title": "Sample", "completed": false }, { "id": 2, "title": "Another", "completed": true } ]',
      ]);
      return { exitCode: 0, fullOutput: allLines.join('\n') };
    }
  }

  // cat README / file
  if (cmd === 'cat' && args.length > 0) {
    const file = args[0] ?? '';
    if (/readme|\.md$/i.test(file)) {
      await stream([
        '',
        '# Project Name',
        '',
        '## Getting started',
        '',
        '```bash',
        'npm install',
        'npm run dev',
        '```',
        '',
        '## License',
        'MIT',
      ]);
      return { exitCode: 0, fullOutput: allLines.join('\n') };
    }
  }

  // clear
  if (cmd === 'clear' || cmd === 'cls') {
    return { exitCode: 0, fullOutput: '__CLEAR__' };
  }

  // help
  if (cmd === 'help') {
    await stream([
      '',
      'Available: echo, mkdir, pwd, whoami, date, npm run dev, npm install, node -v, ls, git status, curl <url>, cat <file>, clear, help',
    ]);
    return { exitCode: 0, fullOutput: allLines.join('\n') };
  }

  // command not found / unknown
  await stream([''], false);
  await stream([`command not found: ${cmd}`], true);
  exitCode = 127;
  return { exitCode, fullOutput: allLines.join('\n') };
}

interface TerminalSimulatorProps {
  payload?: { command?: string };
  createTool?: (type: ToolType, payload: Record<string, unknown>) => void;
}

const TerminalSimulator: React.FC<TerminalSimulatorProps> = ({ payload, createTool }) => {
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { id: 0, kind: 'stdout', text: 'DevOS Terminal — try: echo "Hello", mkdir foo, ls, npm run dev, help' },
    { id: 1, kind: 'stdout', text: '' },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [scrollLock, setScrollLock] = useState(false);
  const [suggestedTool, setSuggestedTool] = useState<{ type: ToolType; payload: Record<string, unknown> } | null>(null);
  const nextId = useRef(2);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastOutputRef = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    if (!scrollLock) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scrollLock]);

  const appendLine = useCallback(
    (kind: LineKind, text: string) => {
      const id = nextId.current++;
      setLines((prev) => [...prev, { id, kind, text }]);
      setTimeout(scrollToBottom, 0);
    },
    [scrollToBottom]
  );

  const run = useCallback(
    async (cmd: string) => {
      if (!cmd.trim()) return;
      setHistory((h) => {
        const next = h[h.length - 1] === cmd ? h : [...h, cmd];
        return next.slice(-100);
      });
      setHistoryIndex(-1);
      setStatus('running');
      setExitCode(null);
      setSuggestedTool(null);
      lastOutputRef.current = '';

      appendLine('prompt', `${PROMPT} ${cmd}`);
      const outputLines: string[] = [];

      try {
        const { exitCode: code, fullOutput } = await runCommand(cmd, (line, isStderr) => {
          outputLines.push(line);
          appendLine(isStderr ? 'stderr' : 'stdout', line);
        });
        setExitCode(code);
        setStatus(code === 0 ? 'success' : 'failed');

        if (fullOutput === '__CLEAR__') {
          setLines([]);
          nextId.current = 0;
          return;
        }
        lastOutputRef.current = fullOutput;

        const detected = detectOutputType(fullOutput);
        if (detected && createTool) setSuggestedTool(detected);
      } catch (e) {
        setExitCode(1);
        setStatus('failed');
        appendLine('stderr', (e instanceof Error ? e.message : String(e)));
      }
      appendLine('stdout', '');
    },
    [appendLine, createTool]
  );

  const initialCommandRun = useRef(false);
  // Run initial command from payload once (e.g. Tambo "run npm run dev")
  useEffect(() => {
    const initialCommand = (payload?.command ?? '').trim();
    if (initialCommand && !initialCommandRun.current) {
      initialCommandRun.current = true;
      run(initialCommand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when payload.command is set
  }, [payload?.command]);

  useEffect(() => {
    if (!scrollLock) bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [lines, scrollLock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'running' || !input.trim()) return;
    run(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(history[next] ?? '');
      }
    }
  };

  const copyOutput = () => {
    const text = lines.map((l) => (l.kind === 'prompt' ? l.text : l.text)).join('\n');
    void navigator.clipboard.writeText(text);
  };

  const clearTerminal = () => {
    setLines([{ id: nextId.current++, kind: 'stdout', text: '' }]);
    setStatus('idle');
    setExitCode(null);
    setSuggestedTool(null);
  };

  const openDetectedTool = () => {
    if (suggestedTool && createTool) {
      createTool(suggestedTool.type, suggestedTool.payload);
      setSuggestedTool(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] rounded-lg border border-zinc-800 overflow-hidden font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs uppercase tracking-wider">Terminal</span>
          {status === 'running' && (
            <span className="flex items-center gap-1.5 text-amber-400 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Running
            </span>
          )}
          {status === 'success' && exitCode !== null && (
            <span className="text-emerald-500 text-xs">✔ Command completed (exit code {exitCode})</span>
          )}
          {status === 'failed' && exitCode !== null && (
            <span className="text-red-400 text-xs">✖ Command failed (exit code {exitCode})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScrollLock((s) => !s)}
            className={`px-2 py-1 rounded text-xs ${scrollLock ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'}`}
            title={scrollLock ? 'Unlock scroll' : 'Lock scroll'}
          >
            {scrollLock ? '🔒 Locked' : 'Scroll'}
          </button>
          <button
            type="button"
            onClick={copyOutput}
            className="px-2 py-1 rounded text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={clearTerminal}
            className="px-2 py-1 rounded text-xs text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Suggested tool chip */}
      {suggestedTool && createTool && (
        <div className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between shrink-0">
          <span className="text-blue-300 text-xs">
            Output detected → open in <strong>{suggestedTool.type}</strong>?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openDetectedTool}
              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              Open
            </button>
            <button type="button" onClick={() => setSuggestedTool(null)} className="px-2 py-1 rounded text-zinc-400 hover:bg-zinc-700 text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Output area */}
      <div className="flex-1 overflow-auto p-3 min-h-0">
        <div className="space-y-0.5">
          {lines.map((line) => (
            <div
              key={line.id}
              className={`whitespace-pre-wrap break-all ${
                line.kind === 'prompt' ? 'text-emerald-400' : line.kind === 'stderr' ? 'text-red-400' : 'text-[#e6edf3]'
              }`}
            >
              {line.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
          <span className="text-emerald-400 shrink-0">{PROMPT}</span>
          <input
            ref={inputRef}
            type="text"
            autoFocus
            autoComplete="off"
            disabled={status === 'running'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none flex-1 text-[#e6edf3] placeholder-zinc-500 disabled:opacity-60"
            placeholder={status === 'running' ? 'Running...' : 'Enter command'}
          />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalSimulator;
