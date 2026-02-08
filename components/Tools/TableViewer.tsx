import React, { useMemo, useState, useCallback } from 'react';

const PAGE_SIZE = 10;
const TABLE_KEYS = ['users', 'data', 'items', 'rows', 'results', 'records', 'list'];

interface TableViewerProps {
  payload: {
    data?: unknown;
    columns?: string[];
  };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function extractRows(data: unknown): Record<string, unknown>[] | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0];
    if (first !== null && typeof first === 'object' && !Array.isArray(first))
      return data as Record<string, unknown>[];
    return null;
  }
  if (isPlainObject(data)) {
    for (const key of TABLE_KEYS) {
      const val = data[key];
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0];
        if (first !== null && typeof first === 'object' && !Array.isArray(first))
          return val as Record<string, unknown>[];
      }
    }
    const firstArray = Object.values(data).find(
      (v) => Array.isArray(v) && v.length > 0 && isPlainObject((v as unknown[])[0])
    );
    if (firstArray && Array.isArray(firstArray))
      return firstArray as Record<string, unknown>[];
  }
  return null;
}

function normalizeInput(raw: unknown): { rows: Record<string, unknown>[] | null; error: string | null } {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { rows: null, error: 'Invalid JSON' };
    }
  }
  const rows = extractRows(data);
  if (rows === null) return { rows: null, error: 'Data is not tabular' };
  return { rows, error: null };
}

function getColumns(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  const set = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
  return Array.from(set);
}

function isNumericColumn(rows: Record<string, unknown>[], key: string): boolean {
  return rows.every((r) => {
    const v = r[key];
    return v === null || v === undefined || (typeof v === 'number' && !Number.isNaN(v));
  });
}

function cellDisplay(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function isExpandable(value: unknown): boolean {
  return (typeof value === 'object' && value !== null) || Array.isArray(value);
}

const TableViewer: React.FC<TableViewerProps> = ({ payload }) => {
  const { rows, error } = useMemo(() => normalizeInput(payload.data), [payload.data]);
  const columns = useMemo(() => (rows && rows.length > 0 ? getColumns(rows) : []), [rows]);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [copiedRow, setCopiedRow] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((v) => String(cellDisplay(v)).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    if (!sortKey || filtered.length === 0) return filtered;
    const numeric = isNumericColumn(filtered, sortKey);
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (numeric && typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      const as = cellDisplay(av);
      const bs = cellDisplay(bv);
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [sorted, currentPage]
  );

  const toggleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      const nextDir = prevKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
      setSortDir(nextDir);
      return key;
    });
  }, [sortDir]);

  const toggleExpand = useCallback((idx: number) => {
    setExpandedRows((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const copyCell = useCallback((value: unknown) => {
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    navigator.clipboard.writeText(text);
  }, []);

  const copyRow = useCallback((row: Record<string, unknown>, rowIdx: number) => {
    navigator.clipboard.writeText(JSON.stringify(row));
    setCopiedRow(rowIdx);
    setTimeout(() => setCopiedRow(null), 1500);
  }, []);

  if (error) {
    return (
      <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">Table Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">View structured data in a table.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-amber-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">Table Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">View structured data in a table.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-zinc-500">No table data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <header className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 shrink-0">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Table Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Search, sort, and copy. Expand rows for nested data.</p>
        </div>
        <input
          type="text"
          placeholder="Search table..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full min-w-[160px] max-w-xs bg-zinc-950 border border-zinc-700 px-3 py-1.5 rounded text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
      </header>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse font-mono">
          <thead className="sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800 shadow-sm">
            <tr>
              <th className="w-8 p-2 border-b border-zinc-800 text-zinc-500" />
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="p-3 border-b border-zinc-800 text-zinc-400 font-medium capitalize whitespace-nowrap cursor-pointer hover:bg-zinc-800/50 hover:text-zinc-300 select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortKey === col && (
                      <span className="text-blue-400 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
              <th className="w-20 p-2 border-b border-zinc-800 text-zinc-500 text-xs font-normal">Copy</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => {
              const globalIdx = currentPage * PAGE_SIZE + i;
              const expanded = expandedRows.has(globalIdx);
              const hasNested = columns.some((col) => isExpandable(row[col]));
              return (
                <React.Fragment key={globalIdx}>
                  <tr className="hover:bg-zinc-900/40 border-b border-zinc-800/50 transition-colors group">
                    <td className="p-2 align-top">
                      {hasNested && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(globalIdx)}
                          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                          title={expanded ? 'Collapse' : 'Expand'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={expanded ? 'rotate-90' : ''}>
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </button>
                      )}
                    </td>
                    {columns.map((col) => {
                      const val = row[col];
                      const expandable = isExpandable(val);
                      return (
                        <td
                          key={col}
                          role="button"
                          tabIndex={0}
                          onClick={() => copyCell(val)}
                          onKeyDown={(e) => e.key === 'Enter' && copyCell(val)}
                          className="p-3 text-zinc-300 align-top max-w-[200px] cursor-pointer hover:bg-zinc-800/50 rounded px-1 -mx-1"
                          title="Click to copy"
                        >
                          {expandable ? (
                            typeof val === 'object' && val !== null && !Array.isArray(val)
                              ? `{…}`
                              : Array.isArray(val)
                                ? `[${(val as unknown[]).length}]`
                                : cellDisplay(val)
                          ) : (
                            <span className="truncate block">{cellDisplay(val)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 align-top">
                      <button
                        type="button"
                        onClick={() => copyRow(row, globalIdx)}
                        title="Copy row JSON"
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedRow === globalIdx ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                  {expanded && hasNested && (
                    <tr className="bg-zinc-900/60 border-b border-zinc-800/50">
                      <td className="p-0" />
                      <td colSpan={columns.length + 1} className="p-3 text-zinc-400 text-xs">
                        <pre className="whitespace-pre-wrap break-all font-mono bg-zinc-950 rounded p-3 border border-zinc-800 max-h-48 overflow-auto">
                          {JSON.stringify(row, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="p-10 text-center text-zinc-500">
            No table data found
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-zinc-800 flex items-center justify-between gap-2 bg-zinc-900/30 shrink-0">
          <span className="text-xs text-zinc-500">
            {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableViewer;
