import React, { useState, useEffect, useRef } from 'react';
import { generateCodeFromTask } from '../../services/geminiService';

interface CodeGeneratorProps {
  payload: {
    task?: string;
    language?: string;
    framework?: string;
    /** Pre-filled code (display-only, no generation) */
    code?: string;
    title?: string;
  };
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({ payload }) => {
  console.log('[CodeGenerator] Render payload:', payload);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasRunInitialGenerate = useRef(false);

  const { task, language, framework, code: initialCode, title } = payload;
  const isTaskMode = Boolean(task?.trim());
  const displayCode = isTaskMode ? generatedCode : (initialCode ?? '// No code provided');
  const displayTitle = title || (isTaskMode ? 'Generated Code' : 'Code');

  const runGenerate = async () => {
    if (!task?.trim()) {
      console.log('[CodeGenerator] runGenerate skipped: no task');
      return;
    }
    console.log('[CodeGenerator] runGenerate started:', { task: task.trim(), language, framework });
    setIsLoading(true);
    setError(null);
    const { code, error: err } = await generateCodeFromTask(task.trim(), language, framework);
    console.log('[CodeGenerator] runGenerate done:', { codeLength: code?.length ?? 0, error: err ?? null });
    setGeneratedCode(code);
    setError(err);
    setIsLoading(false);
  };

  // Auto-generate only once on mount when task exists; Regenerate button triggers manually
  useEffect(() => {
    console.log('[CodeGenerator] useEffect mount:', { task: task ?? null, hasRun: hasRunInitialGenerate.current });
    if (!task?.trim() || hasRunInitialGenerate.current) return;
    hasRunInitialGenerate.current = true;
    console.log('[CodeGenerator] Triggering initial generate for task:', task.trim());
    runGenerate();
  }, []);

  const handleCopy = () => {
    const text = isTaskMode ? generatedCode : (initialCode ?? '');
    if (text) navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-white">Code Generator</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Generates production-ready code from a task. Props are controlled by Tambo.
        </p>
      </div>

      {/* Control section: task, language/framework, Regenerate */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        {isTaskMode && (
          <>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Task</span>
              <p className="text-sm text-zinc-200 mt-1 font-medium">{task}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {language && (
                <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-800 px-2 py-1 rounded tracking-widest">
                  {language}
                </span>
              )}
              {framework && (
                <span className="text-[10px] uppercase font-bold text-blue-600/80 bg-blue-500/10 px-2 py-1 rounded tracking-widest border border-blue-500/20">
                  {framework}
                </span>
              )}
              <button
                type="button"
                onClick={runGenerate}
                disabled={isLoading}
                className="ml-auto text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded border border-blue-500/30 transition-colors"
              >
                {isLoading ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </>
        )}
        {!isTaskMode && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">{displayTitle}</span>
            {language && (
              <span className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-800 px-2 py-1 rounded tracking-widest">
                {language}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Output: code block, copy, loading */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
        <div className="flex-1 overflow-auto p-4 bg-zinc-950 relative">
          {isTaskMode && isLoading && !generatedCode && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
              <div className="flex flex-col items-center gap-2 text-zinc-500 text-sm">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span>Generating code...</span>
              </div>
            </div>
          )}
          <pre className="code-font text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
            <code>{displayCode || '// No code generated yet'}</code>
          </pre>
        </div>
        <div className="p-3 border-t border-zinc-800 flex justify-end bg-zinc-900/30">
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded border border-zinc-700 transition-colors font-medium"
          >
            Copy Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeGenerator;
