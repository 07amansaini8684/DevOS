import React, { useMemo, useState, useCallback, useEffect } from 'react';

const SECRET_KEYS = /^(API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|AUTH|_KEY|_SECRET)$/i;
const URL_PATTERN = /^https?:\/\/|^[a-z][a-z0-9+.-]*:\/\//i;

type EnvType = 'string' | 'number' | 'boolean' | 'url' | 'secret';

interface EnvEntry {
  key: string;
  value: string;
  type: EnvType;
  comment?: string;
}

function detectType(key: string, value: string): EnvType {
  if (SECRET_KEYS.test(key) || /KEY|SECRET|TOKEN|PASSWORD/i.test(key)) return 'secret';
  const v = value.trim();
  if (/^(true|false)$/i.test(v)) return 'boolean';
  if (v !== '' && !Number.isNaN(Number(v)) && /^-?\d+(\.\d+)?$/.test(v)) return 'number';
  if (URL_PATTERN.test(v)) return 'url';
  return 'string';
}

/** When pasted .env loses newlines (e.g. from chat), split on " KEY=" boundaries so each pair gets its own line */
function restoreEnvNewlines(content: string): string {
  if (!content || content.length < 2) return content;
  const lines = content.split(/\r?\n/);
  // If already multiple lines, keep as-is (newlines preserved)
  if (lines.length > 1) return content;
  const single = (lines[0] ?? content).trim();
  if (!single) return content;
  // Single line: split at space followed by KEY= or KEY = (env key pattern then =)
  const parts = single.split(/\s+(?=[A-Za-z_][A-Za-z0-9_]*\s*=)/);
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join('\n');
}

function parseEnvContent(raw: string): EnvEntry[] {
  const normalized = restoreEnvNewlines(raw || '');
  const entries: EnvEntry[] = [];
  const lines = normalized.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1).replace(/\\(.)/g, '$1');
    const type = detectType(key, value);
    entries.push({ key, value, type });
  }
  return entries;
}

function serializeEnv(entries: EnvEntry[]): string {
  return entries.map((e) => `${e.key}=${e.value}`).join('\n');
}

function typeBadgeColor(t: EnvType): string {
  switch (t) {
    case 'number': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'boolean': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'url': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'secret': return 'bg-red-500/20 text-red-400 border-red-500/40';
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40';
  }
}

function validateUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface EnvManagerProps {
  payload?: {
    envContent?: string;
    env?: string;
  };
}

const EnvManager: React.FC<EnvManagerProps> = ({ payload }) => {
  const raw = (payload?.envContent ?? payload?.env ?? '').trim();
  const parsed = useMemo(() => parseEnvContent(raw), [raw]);
  const [entries, setEntries] = useState<EnvEntry[]>(parsed);
  useEffect(() => {
    setEntries(parsed);
  }, [raw, parsed]);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [envTab, setEnvTab] = useState<'development' | 'staging' | 'production'>('development');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newRow, setNewRow] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q));
  }, [entries, search]);

  const duplicates = useMemo(() => {
    const keys = entries.map((e) => e.key);
    return keys.filter((k, i) => keys.indexOf(k) !== i);
  }, [entries]);

  const invalidUrls = useMemo(
    () => entries.filter((e) => e.type === 'url' && !validateUrl(e.value)).map((e) => e.key),
    [entries]
  );

  const updateEntry = useCallback((key: string, updates: Partial<EnvEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...updates, type: detectType(updates.key ?? e.key, updates.value ?? e.value) } : e))
    );
  }, []);

  const addEntry = useCallback((key: string, value: string) => {
    if (!key.trim()) return;
    setEntries((prev) => [...prev, { key: key.trim(), value: value.trim(), type: detectType(key.trim(), value.trim()) }]);
    setNewRow(false);
    setNewKey('');
    setNewValue('');
    setEditingKey(null);
  }, []);

  const removeEntry = useCallback((key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
    setEditingKey(null);
  }, []);

  const toggleSecret = useCallback((key: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(serializeEnv(entries));
  }, [entries]);

  const downloadEnv = useCallback(() => {
    const blob = new Blob([serializeEnv(entries)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `.env.${envTab}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [entries, envTab]);

  const exportJson = useCallback(() => {
    const obj = entries.reduce<Record<string, string>>((acc, e) => {
      acc[e.key] = e.value;
      return acc;
    }, {});
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  }, [entries]);

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <header className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 shrink-0">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Environment Variables</h2>
          <p className="text-xs text-zinc-500 mt-0.5">View and edit .env configuration.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-36 bg-zinc-950 border border-zinc-700 px-2 py-1.5 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
          {['development', 'staging', 'production'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setEnvTab(tab as 'development' | 'staging' | 'production')}
              className={`px-2 py-1 rounded text-[10px] uppercase border ${envTab === tab ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            onClick={copyToClipboard}
            className="px-2 py-1.5 rounded text-[11px] border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={downloadEnv}
            className="px-2 py-1.5 rounded text-[11px] border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          >
            Download .env
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="px-2 py-1.5 rounded text-[11px] border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => setNewRow(true)}
            className="px-3 py-1.5 rounded text-[11px] bg-blue-600 hover:bg-blue-500 text-white"
          >
            Add variable
          </button>
        </div>
      </header>

      {(duplicates.length > 0 || invalidUrls.length > 0) && (
        <div className="px-4 py-2 border-b border-zinc-800 bg-amber-500/10 flex flex-wrap gap-4 text-[11px] text-amber-400">
          {duplicates.length > 0 && <span>Duplicate keys: {duplicates.join(', ')}</span>}
          {invalidUrls.length > 0 && <span>Invalid URL: {invalidUrls.join(', ')}</span>}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800">
            <tr>
              <th className="p-3 border-b border-zinc-800 text-zinc-400 font-medium">Key</th>
              <th className="p-3 border-b border-zinc-800 text-zinc-400 font-medium">Value</th>
              <th className="p-3 border-b border-zinc-800 text-zinc-400 font-medium w-24">Type</th>
              <th className="p-3 border-b border-zinc-800 text-zinc-400 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {newRow && (
              <tr className="bg-zinc-900/50 border-b border-zinc-800">
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="KEY"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 px-2 py-1.5 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).closest('td')?.nextElementSibling?.querySelector('input')?.focus()}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 px-2 py-1.5 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addEntry(newKey, newValue);
                      if (e.key === 'Escape') setNewRow(false);
                    }}
                  />
                </td>
                <td className="p-2" />
                <td className="p-2 flex items-center gap-1">
                  <button type="button" onClick={() => addEntry(newKey, newValue)} className="text-[11px] text-blue-400 hover:text-blue-300">
                    Add
                  </button>
                  <button type="button" onClick={() => { setNewRow(false); setNewKey(''); setNewValue(''); }} className="text-zinc-500 hover:text-zinc-300 text-xs">
                    Cancel
                  </button>
                </td>
              </tr>
            )}
            {filtered.map((entry) => (
              <tr key={entry.key} className="hover:bg-zinc-900/40 border-b border-zinc-800/50">
                <td className="p-3 align-middle">
                  {editingKey === entry.key ? (
                    <input
                      type="text"
                      defaultValue={entry.key}
                      className="w-full bg-zinc-950 border border-zinc-700 px-2 py-1 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== entry.key) {
                          setEntries((prev) => prev.map((x) => (x.key === entry.key ? { ...x, key: v } : x)));
                        }
                        setEditingKey(null);
                      }}
                      onKeyDown={(e) => e.key === 'Escape' && setEditingKey(null)}
                      autoFocus
                    />
                  ) : (
                    <span className="font-mono text-zinc-300">{entry.key}</span>
                  )}
                </td>
                <td className="p-3 align-middle">
                  {editingKey === entry.key ? (
                    <input
                      type={entry.type === 'secret' && !visibleSecrets[entry.key] ? 'password' : 'text'}
                      defaultValue={entry.value}
                      className="w-full bg-zinc-950 border border-zinc-700 px-2 py-1 rounded text-xs text-zinc-200 focus:outline-none focus:border-blue-500 font-mono"
                      onBlur={(e) => updateEntry(entry.key, { value: e.target.value })}
                      onKeyDown={(e) => e.key === 'Escape' && setEditingKey(null)}
                    />
                  ) : (
                    <span className="font-mono text-zinc-300">
                      {entry.type === 'secret' && !visibleSecrets[entry.key] ? '••••••••••••' : entry.value}
                    </span>
                  )}
                </td>
                <td className="p-3 align-middle">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${typeBadgeColor(entry.type)}`}>
                    {entry.type}
                  </span>
                  {invalidUrls.includes(entry.key) && (
                    <span className="ml-1 text-amber-400" title="Invalid URL">⚠</span>
                  )}
                </td>
                <td className="p-3 align-middle">
                  {entry.type === 'secret' && (
                    <button
                      type="button"
                      onClick={() => toggleSecret(entry.key)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 mr-2"
                    >
                      {visibleSecrets[entry.key] ? 'Hide' : 'Show'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingKey(editingKey === entry.key ? null : entry.key)}
                    className="text-zinc-500 hover:text-zinc-300 p-1 rounded"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.key)}
                    className="text-zinc-500 hover:text-red-400 p-1 rounded ml-0.5"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !newRow && (
          <div className="p-8 text-center text-zinc-500 text-sm">
            {entries.length === 0 ? 'No environment variables. Add one or paste .env content.' : 'No matches for search.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvManager;
