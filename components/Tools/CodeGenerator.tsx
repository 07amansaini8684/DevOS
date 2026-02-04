
import React from 'react';

interface CodeGeneratorProps {
  payload: {
    language?: string;
    code?: string;
    title?: string;
  };
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({ payload }) => {
  const code = payload.code || '// No code generated yet';
  const language = payload.language || 'javascript';

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <span className="text-sm font-medium text-zinc-400">{payload.title || 'Generated Code'}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded tracking-widest">{language}</span>
          <button 
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded border border-zinc-700 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-zinc-950">
        <pre className="code-font text-sm leading-relaxed text-zinc-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeGenerator;
