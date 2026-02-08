import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';

const LEVELS = ['error', 'warn', 'info', 'debug', 'success'] as const;
type LogLevel = (typeof LEVELS)[number];

const LEVEL_REG = /\[?(ERROR|WARN|INFO|DEBUG|SUCCESS)\]?/i;

interface LogBlock {
  id: number;
  level: LogLevel;
  lines: string[];
  isStack: boolean;
  raw: string;
}

function detectLevel(line: string): LogLevel {
  const m = line.match(LEVEL_REG);
  if (m) {
    const l = m[1].toLowerCase();
    if (LEVELS.includes(l as LogLevel)) return l as LogLevel;
  }
  if (/error|exception|failed|fatal/i.test(line)) return 'error';
  if (/warn|warning/i.test(line)) return 'warn';
  if (/debug|trace/i.test(line)) return 'debug';
  if (/success|ok|completed/i.test(line)) return 'success';
  return 'info';
}

function isStackLine(line: string): boolean {
  return /^\s*(at\s|\.{3}\s)/m.test(line) || /^\s+at\s/.test(line) || (/^\s{2,}/.test(line) && line.trim().length > 0);
}

function parseLogs(raw: string[]): LogBlock[] {
  const blocks: LogBlock[] = [];
  let i = 0;
  let id = 0;
  while (i < raw.length) {
    const line = raw[i];
    if (line == null) {
      i++;
      continue;
    }
    const level = detectLevel(line);
    const looksLikeError = /Error:|TypeError|ReferenceError|SyntaxError|at\s+\S+\s+\(/.test(line);
    const nextIsStack = i + 1 < raw.length && isStackLine(raw[i + 1]);
    if (looksLikeError && nextIsStack) {
      const blockLines: string[] = [line];
      i++;
      while (i < raw.length && (isStackLine(raw[i]) || (raw[i].trim() === '' && i + 1 < raw.length && isStackLine(raw[i + 1])))) {
        blockLines.push(raw[i]);
        i++;
      }
      blocks.push({ id: id++, level: 'error', lines: blockLines, isStack: true, raw: blockLines.join('\n') });
      continue;
    }
    blocks.push({ id: id++, level, lines: [line], isStack: false, raw: line });
    i++;
  }
  return blocks;
}

/** Split a long single line that looks like concatenated log lines (e.g. newlines were stripped when pasted) */
function splitLogicalLogLines(s: string): string[] {
  if (s.length < 80) return [s];
  // Split before: "] [INFO]" style, or "[2026-02-08T..." ISO timestamp, or "  at " stack lines
  const parts = s.split(
    /(?=\]\s*\[(?:INFO|ERROR|WARN|DEBUG|SUCCESS)\])|(?=\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?Z?\])|(?=\s{2}at\s\S)/
  );
  if (parts.length > 1) {
    return parts.map((p) => (p ?? '').trim()).filter(Boolean);
  }
  return [s];
}

function normalizeInput(logs: unknown): string[] {
  if (logs == null) return [];
  if (typeof logs === 'string') {
    const byNewline = logs.split(/\r?\n/);
    if (byNewline.length === 1 && byNewline[0].length > 80) {
      const fallback = splitLogicalLogLines(byNewline[0]);
      if (fallback.length > 1) return fallback;
    }
    return byNewline.filter((s) => s != null);
  }
  if (Array.isArray(logs)) {
    return logs
      .flatMap((l) => (l != null && typeof l === 'string' ? l.split(/\r?\n/) : [String(l ?? '')]))
      .filter((s) => s != null);
  }
  return [String(logs)];
}

const MAX_LINES = 5000;

interface LogViewerProps {
  payload?: {
    logs?: string | string[] | unknown;
  };
}

const LogViewer: React.FC<LogViewerProps> = ({ payload }) => {
  const rawLines = useMemo(() => normalizeInput(payload?.logs), [payload?.logs]);
  const truncated = rawLines.length > MAX_LINES ? rawLines.slice(0, MAX_LINES) : rawLines;
  const blocks = useMemo(() => parseLogs(truncated), [truncated]);

  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set(LEVELS));
  const [search, setSearch] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const filtered = useMemo(() => blocks.filter((b) => levelFilter.has(b.level)), [blocks, levelFilter]);

  const searchLower = search.toLowerCase().trim();
  const matchingIndices = useMemo(() => {
    if (!searchLower) return [];
    return filtered.map((b, i) => (b.raw.toLowerCase().includes(searchLower) ? i : -1)).filter((i) => i >= 0);
  }, [filtered, searchLower]);

  const currentMatchIndex = searchLower && matchingIndices.length > 0 ? matchingIndices[searchIndex % matchingIndices.length] : -1;

  const toggleLevel = useCallback((level: LogLevel) => {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next.size > 0 ? next : new Set(LEVELS);
    });
  }, []);

  const jumpNext = useCallback(() => {
    if (matchingIndices.length === 0) return;
    setSearchIndex((i) => (i + 1) % matchingIndices.length);
  }, [matchingIndices.length]);

  const jumpPrev = useCallback(() => {
    if (matchingIndices.length === 0) return;
    setSearchIndex((i) => (i - 1 + matchingIndices.length) % matchingIndices.length);
  }, [matchingIndices.length]);

  useEffect(() => {
    if (currentMatchIndex >= 0) {
      const el = matchRefs.current.get(currentMatchIndex);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentMatchIndex]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [filtered.length, autoScroll]);

  const copyLine = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const copyFull = useCallback(() => {
    navigator.clipboard.writeText(rawLines.join('\n'));
  }, [rawLines]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedBlocks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const levelColors: Record<LogLevel, string> = {
    error: 'text-red-400 border-red-500/40 bg-red-500/5',
    warn: 'text-amber-400 border-amber-500/40 bg-amber-500/5',
    info: 'text-zinc-300 border-zinc-600/30 bg-zinc-800/20',
    debug: 'text-zinc-500 border-zinc-700/20 bg-zinc-800/10',
    success: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/5',
  };

  const highlightMatch = (text: string | undefined) => {
    const s = (text ?? '').toString();
    if (!searchLower) return s;
    const parts = s.split(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchLower ? <mark key={i} className="bg-yellow-500/50 text-inherit">{part}</mark> : part
    );
  };

  let lineNum = 0;

  if (rawLines.length === 0) {
    return (
      <div className="h-full bg-[#0a0a0a] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">Log Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Paste logs or provide log output to analyze.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-zinc-500">No logs to display. Paste terminal or server logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0a0a0a] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-20 p-3 border-b border-zinc-800 flex flex-wrap items-center gap-2 bg-zinc-900/95 shrink-0">
        <h2 className="text-sm font-medium text-zinc-300 shrink-0">Log Viewer</h2>
        <div className="flex items-center gap-1 flex-wrap">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLevel(l)}
              className={`px-2 py-1 rounded text-[10px] uppercase border transition-colors ${levelFilter.has(l) ? levelColors[l] : 'text-zinc-600 border-zinc-700 bg-transparent'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchIndex(0); }}
            className="flex-1 min-w-[100px] max-w-[200px] bg-zinc-950 border border-zinc-700 px-2 py-1 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          {searchLower && matchingIndices.length > 0 && (
            <span className="text-[10px] text-zinc-500 shrink-0">
              {searchIndex + 1}/{matchingIndices.length}
            </span>
          )}
          {searchLower && matchingIndices.length > 0 && (
            <>
              <button type="button" onClick={jumpPrev} className="p-1 rounded hover:bg-zinc-800 text-zinc-400" title="Previous">←</button>
              <button type="button" onClick={jumpNext} className="p-1 rounded hover:bg-zinc-800 text-zinc-400" title="Next">→</button>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAutoScroll((a) => !a)}
          className={`px-2 py-1 rounded text-[10px] border ${autoScroll ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-zinc-700 text-zinc-500'}`}
        >
          {autoScroll ? 'Follow ✓' : 'Pause'}
        </button>
        <button type="button" onClick={copyFull} className="px-2 py-1 rounded text-[10px] border border-zinc-700 text-zinc-400 hover:bg-zinc-800">
          Copy all
        </button>
      </header>

      <div className="flex-1 overflow-auto font-mono text-xs break-words">
        {rawLines.length > MAX_LINES && (
          <div className="sticky top-0 z-10 px-3 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-400 text-[11px]">
            Showing first {MAX_LINES} of {rawLines.length} lines. Paste smaller log or use search.
          </div>
        )}
        <div className="py-1">
          {filtered.map((block, blockIdx) => {
            const isMatch = currentMatchIndex === blockIdx;
            const expanded = expandedBlocks.has(block.id);
            const isCollapsedStack = block.isStack && block.lines.length > 1 && !expanded;

            return (
              <div
                key={block.id}
                ref={(el) => { if (el) matchRefs.current.set(blockIdx, el); }}
                data-line-index={blockIdx}
                className={`border-l-2 pl-2 pr-2 py-0.5 select-text ${levelColors[block.level]} ${isMatch ? 'ring-1 ring-blue-500/50 bg-blue-500/10' : ''}`}
              >
                {isCollapsedStack ? (
                  <div className="flex items-center gap-2 min-h-[20px]">
                    <span className="w-8 shrink-0 text-zinc-600 text-[10px] select-none">{++lineNum}</span>
                    <button type="button" onClick={() => toggleExpand(block.id)} className="flex-1 min-w-0 text-left hover:underline flex items-center gap-1 break-all">
                      <span className="shrink-0 text-zinc-500">▶</span>
                      {highlightMatch(block.lines[0] ?? '')}
                      <span className="text-zinc-500">… +{block.lines.length - 1} lines</span>
                    </button>
                    <button type="button" onClick={() => copyLine(block.raw)} className="shrink-0 p-1 rounded opacity-60 hover:opacity-100" title="Copy block">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    {(block.lines ?? []).map((line, lineIdx) => (
                      <div key={`${block.id}-${lineIdx}`} className="flex items-center gap-2 min-h-[20px]">
                        <span className="w-8 shrink-0 text-zinc-600 text-[10px] select-none">{++lineNum}</span>
                        <span
                          className="flex-1 min-w-0 break-all cursor-pointer hover:opacity-80"
                          onClick={() => copyLine(line ?? '')}
                          title="Click to copy"
                        >
                          {highlightMatch(line ?? '')}
                        </span>
                        <button type="button" onClick={() => copyLine(line ?? '')} className="shrink-0 p-1 rounded opacity-0 hover:opacity-100 text-zinc-500" title="Copy line">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                      </div>
                    ))}
                    {block.isStack && block.lines.length > 1 && (
                      <div className="flex items-center gap-2 min-h-[20px] pl-10">
                        <button type="button" onClick={() => toggleExpand(block.id)} className="text-zinc-500 hover:text-zinc-400 text-[10px]">
                          ▼ Collapse stack
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div ref={scrollRef} />
      </div>
    </div>
  );
};

export default LogViewer;
