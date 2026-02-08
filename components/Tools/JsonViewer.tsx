import React, { useState, useCallback, useMemo } from 'react';

const MAX_INITIAL_DEPTH = 2;

interface JsonViewerProps {
  payload: {
    /** JSON as object or string (spec); component normalizes and parses */
    data?: object | string;
    /** Legacy: pre-parsed object from Tambo JsonView */
    jsonObject?: unknown;
  };
}

function normalizeData(payload: JsonViewerProps['payload']): { parsed: object | null; error: string | null } {
  const raw = payload.data ?? payload.jsonObject;
  if (raw === undefined || raw === null) return { parsed: {}, error: null };
  if (typeof raw === 'object' && !Array.isArray(raw) && raw !== null) return { parsed: raw as object, error: null };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as object;
      return { parsed, error: null };
    } catch (e) {
      return { parsed: null, error: e instanceof Error ? e.message : 'Invalid JSON format' };
    }
  }
  return { parsed: null, error: 'Invalid JSON format' };
}

type JsonValue = object | unknown[] | string | number | boolean | null;

function isExpandable(value: JsonValue): value is object | unknown[] {
  return value !== null && typeof value === 'object';
}

interface JsonNodeProps {
  path: string;
  keyLabel: string;
  value: JsonValue;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (path: string) => void;
  searchQuery: string;
  initialMaxDepth: number;
}

function JsonNode({ path, keyLabel, value, depth, expanded, onToggle, searchQuery, initialMaxDepth }: JsonNodeProps) {
  const isExpanded = expanded[path] ?? depth < initialMaxDepth;
  const hasChildren = isExpandable(value);
  const canExpand = hasChildren && (Array.isArray(value) ? value.length > 0 : Object.keys(value as object).length > 0);

  const keyMatch = searchQuery
    ? keyLabel.toLowerCase().includes(searchQuery.toLowerCase())
    : true;
  const valueStr = typeof value === 'string' ? value : '';
  const valueMatch = searchQuery && valueStr
    ? valueStr.toLowerCase().includes(searchQuery.toLowerCase())
    : true;
  const childrenMatch = hasChildren && searchQuery
    ? (Array.isArray(value)
        ? value.some((_, i) => JSON.stringify(value[i]).toLowerCase().includes(searchQuery.toLowerCase()))
        : Object.entries(value as object).some(
            ([k, v]) =>
              k.toLowerCase().includes(searchQuery.toLowerCase()) ||
              JSON.stringify(v).toLowerCase().includes(searchQuery.toLowerCase())
          ))
    : true;
  const visible = !searchQuery || keyMatch || valueMatch || (hasChildren && childrenMatch);
  if (!visible) return null;

  if (!hasChildren) {
    const display =
      value === null
        ? 'null'
        : typeof value === 'string'
          ? `"${value}"`
          : String(value);
    return (
      <div className="flex gap-2 py-0.5 text-sm" style={{ paddingLeft: `${depth * 12}px` }}>
        <span className="text-amber-200/90 shrink-0">{keyLabel}:</span>
        <span className="text-emerald-300 break-all">{display}</span>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => ({ key: String(i), value: v }))
    : Object.entries(value as object).map(([k, v]) => ({ key: k, value: v }));

  return (
    <div className="py-0.5 text-sm">
      <button
        type="button"
        onClick={() => canExpand && onToggle(path)}
        className="flex items-center gap-1.5 hover:bg-white/5 rounded px-0.5 -mx-0.5"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <span className="text-zinc-500 w-4 shrink-0">{isExpanded ? '▼' : '▶'}</span>
        <span className="text-amber-200/90 shrink-0">{keyLabel}</span>
        <span className="text-zinc-500 text-xs">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {isExpanded &&
        entries.map(({ key, value: childValue }) => (
          <JsonNode
            key={path + '.' + key}
            path={`${path}.${key}`}
            keyLabel={key}
            value={childValue as JsonValue}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            searchQuery={searchQuery}
            initialMaxDepth={initialMaxDepth}
          />
        ))}
    </div>
  );
}

const JsonViewer: React.FC<JsonViewerProps> = ({ payload }) => {
  const { parsed, error } = useMemo(() => normalizeData(payload), [payload.data, payload.jsonObject]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const onToggle = useCallback((path: string) => {
    setExpandedNodes((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const expandAll = useCallback(() => {
    if (!parsed) return;
    const collect: string[] = [];
    function walk(obj: object, path: string) {
      collect.push(path);
      if (Array.isArray(obj)) obj.forEach((v, i) => isExpandable(v) && walk(v as object, `${path}.${i}`));
      else Object.entries(obj).forEach(([k, v]) => isExpandable(v) && walk(v as object, `${path}.${k}`));
    }
    walk(parsed, 'root');
    setExpandedNodes(() => collect.reduce<Record<string, boolean>>((acc, p) => ({ ...acc, [p]: true }), {}));
  }, [parsed]);

  const collapseAll = useCallback(() => setExpandedNodes({}), []);

  const copyJson = useCallback(() => {
    if (!parsed) return;
    navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
  }, [parsed]);

  if (error) {
    return (
      <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">JSON Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Inspect and explore structured JSON data.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-amber-400 flex items-center gap-2">
            <span aria-hidden>⚠</span>
            <span>Invalid JSON format</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <header className="p-3 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <h2 className="text-sm font-medium text-zinc-300">JSON Viewer</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Inspect and explore structured JSON data.</p>
      </header>

      <div className="border-b border-zinc-800 px-3 py-2 flex flex-wrap items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[120px] max-w-[200px] bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-zinc-700 transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-zinc-700 transition-colors"
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={copyJson}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-zinc-700 transition-colors"
          >
            Copy JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 font-mono">
        {parsed && (
          <JsonNode
            path="root"
            keyLabel={Array.isArray(parsed) ? '[]' : '{}'}
            value={parsed}
            depth={0}
            expanded={expandedNodes}
            onToggle={onToggle}
            searchQuery={searchQuery}
            initialMaxDepth={MAX_INITIAL_DEPTH}
          />
        )}
      </div>
    </div>
  );
};

export default JsonViewer;
