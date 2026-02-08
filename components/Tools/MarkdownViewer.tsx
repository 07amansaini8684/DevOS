import React, { useMemo, useState, useCallback } from 'react';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

/** When pasted content loses newlines (e.g. from chat), restore block boundaries so parser sees structure */
function restoreMarkdownNewlines(content: string): string {
  if (!content || content.length < 20) return content;
  const hasFewNewlines = (content.match(/\n/g)?.length ?? 0) < content.length / 80;
  if (!hasFewNewlines) return content;

  let s = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Headings (longest first so #### doesn't become # + ###)
  s = s.replace(/\s(######)\s/g, '\n$1 ');
  s = s.replace(/\s(#####)\s/g, '\n$1 ');
  s = s.replace(/\s(####)\s/g, '\n$1 ');
  s = s.replace(/\s(###)\s/g, '\n$1 ');
  s = s.replace(/\s(##)\s/g, '\n$1 ');
  s = s.replace(/\s(#)\s/g, '\n$1 ');
  // Code fence
  s = s.replace(/\s(```[\w]*)\s/g, '\n$1\n');
  s = s.replace(/\s(```)\s*$/gm, '\n$1');
  // Horizontal rule
  s = s.replace(/\s(---)\s/g, '\n$1\n');
  s = s.replace(/\s(\*\*\*)\s/g, '\n$1\n');
  // List items: "  - ", " - " after period/newline, "  * ", "  1. "
  s = s.replace(/\s{2,}([-*+])\s/g, '\n$1 ');
  s = s.replace(/([.\n])\s+(-\s)/g, '$1\n$2');
  s = s.replace(/(\n---|\n##|\n###)\s+(-\s)/g, '$1\n$2');
  s = s.replace(/\s+(-\s)(?=[A-Z])/g, '\n$1');
  s = s.replace(/\s{2,}(\d+\.)\s/g, '\n$1 ');
  // Table row boundary: "||" -> "|\n|"
  s = s.replace(/\|\s*\|/g, '|\n|');
  // Blockquote
  s = s.replace(/\s(>)\s/g, '\n$1 ');
  // Normalize multiple newlines
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = content.split('\n');
  const idCount: Record<string, number> = {};
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/#+$/, '').trim();
      let id = slugify(text);
      idCount[id] = (idCount[id] || 0) + 1;
      if (idCount[id] > 1) id = `${id}-${idCount[id]}`;
      items.push({ level, text, id });
    }
  }
  return items;
}

/** Render inline markdown: **bold**, *italic*, ~~strikethrough~~, `code`, [link](url), ![alt](src) */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^`([^`]+)`/);
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (codeMatch) {
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-zinc-800 text-blue-300 text-[13px] font-mono">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    if (strikeMatch) {
      parts.push(<del key={key++} className="text-zinc-500">{strikeMatch[1]}</del>);
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    if (linkMatch) {
      const href = linkMatch[2];
      parts.push(
        <a key={key++} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="text-blue-400 hover:text-blue-300 underline break-all">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }
    if (imgMatch) {
      parts.push(
        <img key={key++} src={imgMatch[2]} alt={imgMatch[1]} loading="lazy" className="max-w-full h-auto rounded border border-zinc-700 my-2" />
      );
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }
    const next = remaining.match(/^(?:`|~~|\*\*|\*|\[|!\[)/);
    if (next) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      const idx = remaining.search(/[`*\[!~]/);
      const chunk = idx < 0 ? remaining : remaining.slice(0, idx);
      if (chunk) parts.push(chunk);
      remaining = idx < 0 ? '' : remaining.slice(idx);
    }
  }
  return parts;
}

type Block =
  | { type: 'h1'; text: string; id: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'h3'; text: string; id: string }
  | { type: 'h4'; text: string; id: string }
  | { type: 'h5'; text: string; id: string }
  | { type: 'h6'; text: string; id: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'blockquote'; lines: { depth: number; text: string }[] }
  | { type: 'ul'; items: { indent: number; text: string }[] }
  | { type: 'ol'; items: { indent: number; text: string }[] }
  | { type: 'tasklist'; items: { checked: boolean; text: string }[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'hr' }
  | { type: 'p'; text: string };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const h4 = line.match(/^####\s+(.+)$/);
    const h5 = line.match(/^#####\s+(.+)$/);
    const h6 = line.match(/^######\s+(.+)$/);
    if (h1) {
      const text = h1[1].replace(/#+$/, '').trim();
      blocks.push({ type: 'h1', text, id: slugify(text) });
      i++;
      continue;
    }
    if (h2) {
      const text = h2[1].replace(/#+$/, '').trim();
      blocks.push({ type: 'h2', text, id: slugify(text) });
      i++;
      continue;
    }
    if (h3) {
      const text = h3[1].replace(/#+$/, '').trim();
      blocks.push({ type: 'h3', text, id: slugify(text) });
      i++;
      continue;
    }
    if (h4) {
      const text = h4[1].replace(/#+$/, '').trim();
      blocks.push({ type: 'h4', text, id: slugify(text) });
      i++;
      continue;
    }
    if (h5) {
      const text = h5[1].replace(/#+$/, '').trim();
      blocks.push({ type: 'h5', text, id: slugify(text) });
      i++;
      continue;
    }
    if (h6) {
      const text = h6[1].replace(/#+$/, '').trim();
      blocks.push({ type: 'h6', text, id: slugify(text) });
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }
    if (line.startsWith('>')) {
      const quoteLines: { depth: number; text: string }[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        const m = lines[i].match(/^(>+)\s?(.*)$/);
        if (m) quoteLines.push({ depth: m[1].length, text: m[2] });
        i++;
      }
      blocks.push({ type: 'blockquote', lines: quoteLines });
      continue;
    }
    const taskMatch = line.match(/^\s*[-*+]\s+\[([ x])\]\s+(.*)$/i);
    if (taskMatch) {
      const items: { checked: boolean; text: string }[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*+]\s+\[([ x])\]\s+/i)) {
        const m = lines[i].match(/^\s*[-*+]\s+\[([ x])\]\s+(.*)$/i);
        if (m) items.push({ checked: m[1].toLowerCase() === 'x', text: m[2] });
        i++;
      }
      blocks.push({ type: 'tasklist', items });
      continue;
    }
    if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const items: { indent: number; text: string }[] = [];
      const isOl = /^\s*\d+\.\s/.test(line);
      const bulletRe = isOl ? /^\s*(\d+\.)\s+(.*)$/ : /^\s*([-*+])\s+(.*)$/;
      while (i < lines.length) {
        const m = lines[i].match(bulletRe);
        if (!m) break;
        const indent = lines[i].length - lines[i].trimStart().length;
        items.push({ indent, text: m[2] });
        i++;
      }
      blocks.push(isOl ? { type: 'ol', items } : { type: 'ul', items });
      continue;
    }
    if (/^[-*_]\s*[-*_]\s*[-*_]*\s*$/.test(line.trim()) || /^---+$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    const tableLine = line.trim();
    if (tableLine.startsWith('|') && tableLine.endsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const cells = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        if (cells.length > 0) rows.push(cells);
        i++;
      }
      if (rows.length >= 2 && rows[1].every((c) => /^:?-+:?$/.test(c))) {
        rows.splice(1, 1);
      }
      if (rows.length > 0) blocks.push({ type: 'table', rows });
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    blocks.push({ type: 'p', text: line });
    i++;
  }
  return blocks;
}

interface MarkdownViewerProps {
  payload: {
    content?: string;
    markdownContent?: string;
  };
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ payload }) => {
  const raw = payload.content ?? payload.markdownContent ?? '';
  const content = raw.trim() || '# No content\n\nPaste or provide markdown to preview.';
  const [showRaw, setShowRaw] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  /** Restore newlines when pasted content arrives as one paragraph (e.g. from chat) */
  const normalized = useMemo(() => restoreMarkdownNewlines(content), [content]);
  const toc = useMemo(() => extractToc(normalized), [normalized]);
  const blocks = useMemo(() => parseBlocks(normalized), [normalized]);

  const copyAll = useCallback(() => {
    navigator.clipboard.writeText(normalized);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1500);
  }, [normalized]);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
  }, []);

  return (
    <div className="h-full bg-[#0d0d0d] rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 p-3 border-b border-zinc-800 bg-zinc-900/95 shrink-0">
        <h2 className="text-sm font-medium text-zinc-300">Markdown Viewer</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRaw((r) => !r)}
            className="px-2 py-1.5 rounded text-[11px] border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          >
            {showRaw ? 'Preview' : 'Raw'}
          </button>
          <button
            type="button"
            onClick={copyAll}
            className="px-2 py-1.5 rounded text-[11px] border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          >
            {copyDone ? 'Copied' : 'Copy all'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {toc.length > 0 && !showRaw && (
          <aside className="hidden lg:block w-56 shrink-0 border-r border-zinc-800 overflow-auto py-4 pl-4">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">On this page</p>
            <nav className="space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-[12px] text-zinc-400 hover:text-zinc-200 truncate"
                  style={{ paddingLeft: `${(item.level - 1) * 8}px` }}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 overflow-auto min-w-0">
          <div className="p-6 md:p-10 max-w-3xl mx-auto">
            {showRaw ? (
              <pre className="font-mono text-xs text-zinc-400 whitespace-pre-wrap break-words bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                {normalized}
              </pre>
            ) : (
              <article className="max-w-none">
                {blocks.map((block, idx) => {
                  switch (block.type) {
                    case 'h1':
                      return (
                        <h1 key={idx} id={block.id} className="text-3xl font-bold mt-10 mb-4 pb-2 border-b border-zinc-700 text-zinc-100 scroll-mt-24">
                          {renderInline(block.text)}
                        </h1>
                      );
                    case 'h2':
                      return (
                        <h2 key={idx} id={block.id} className="text-2xl font-semibold mt-8 mb-3 text-zinc-200 scroll-mt-24">
                          {renderInline(block.text)}
                        </h2>
                      );
                    case 'h3':
                      return (
                        <h3 key={idx} id={block.id} className="text-xl font-semibold mt-6 mb-2 text-zinc-200 scroll-mt-24">
                          {renderInline(block.text)}
                        </h3>
                      );
                    case 'h4':
                      return (
                        <h4 key={idx} id={block.id} className="text-lg font-medium mt-4 mb-2 text-zinc-300 scroll-mt-24">
                          {renderInline(block.text)}
                        </h4>
                      );
                    case 'h5':
                      return (
                        <h5 key={idx} id={block.id} className="text-base font-medium mt-3 mb-1 text-zinc-300 scroll-mt-24">
                          {renderInline(block.text)}
                        </h5>
                      );
                    case 'h6':
                      return (
                        <h6 key={idx} id={block.id} className="text-sm font-medium mt-2 mb-1 text-zinc-400 scroll-mt-24">
                          {renderInline(block.text)}
                        </h6>
                      );
                    case 'code':
                      return (
                        <div key={idx} className="my-6 rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/80">
                            {block.lang && (
                              <span className="text-[10px] uppercase text-zinc-500 font-medium">{block.lang}</span>
                            )}
                            <button
                              type="button"
                              onClick={() => copyCode(block.code)}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-auto"
                            >
                              Copy code
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-[13px] text-zinc-300 font-mono whitespace-pre">
                            {block.code}
                          </pre>
                        </div>
                      );
                    case 'blockquote':
                      return (
                        <blockquote
                          key={idx}
                          className="border-l-4 border-zinc-600 pl-4 py-1 my-4 text-zinc-400 italic bg-zinc-800/30 rounded-r"
                        >
                          {block.lines.map((l, j) => (
                            <p key={j} className="mb-1" style={{ paddingLeft: (l.depth - 1) * 12 }}>{renderInline(l.text)}</p>
                          ))}
                        </blockquote>
                      );
                    case 'ul':
                      return (
                        <ul key={idx} className="list-disc pl-6 mb-4 space-y-1 text-zinc-300">
                          {block.items.map((item, j) => (
                            <li key={j} style={{ paddingLeft: Math.floor(item.indent / 2) * 12 }}>{renderInline(item.text)}</li>
                          ))}
                        </ul>
                      );
                    case 'ol':
                      return (
                        <ol key={idx} className="list-decimal pl-6 mb-4 space-y-1 text-zinc-300">
                          {block.items.map((item, j) => (
                            <li key={j} style={{ paddingLeft: Math.floor(item.indent / 2) * 12 }}>{renderInline(item.text)}</li>
                          ))}
                        </ol>
                      );
                    case 'tasklist':
                      return (
                        <ul key={idx} className="list-none pl-0 mb-4 space-y-2 text-zinc-300">
                          {block.items.map((item, j) => (
                            <li key={j} className="flex items-center gap-2">
                              <span className="shrink-0 w-4 h-4 rounded border border-zinc-600 bg-zinc-800 flex items-center justify-center">
                                {item.checked && <span className="text-emerald-400">✓</span>}
                              </span>
                              <span className={item.checked ? 'line-through text-zinc-500' : ''}>{renderInline(item.text)}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    case 'table':
                      return (
                        <div key={idx} className="overflow-x-auto my-6 rounded-lg border border-zinc-700">
                          <table className="w-full text-sm border-collapse">
                            <thead className="bg-zinc-800/80">
                              <tr>
                                {block.rows[0]?.map((cell, j) => (
                                  <th key={j} className="text-left p-3 border-b border-zinc-700 text-zinc-200 font-semibold">
                                    {renderInline(cell)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.slice(1).map((row, ri) => (
                                <tr key={ri} className="hover:bg-zinc-800/30 transition-colors">
                                  {row.map((cell, j) => (
                                    <td key={j} className="p-3 border-b border-zinc-800 text-zinc-300">
                                      {renderInline(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    case 'hr':
                      return <hr key={idx} className="my-8 border-zinc-700" />;
                    case 'p':
                      return (
                        <p key={idx} className="mb-4 text-zinc-300 leading-relaxed text-[15px]">
                          {renderInline(block.text)}
                        </p>
                      );
                    default:
                      return null;
                  }
                })}
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MarkdownViewer;
