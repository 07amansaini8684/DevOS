
import React from 'react';

interface MarkdownViewerProps {
  payload: {
    markdownContent?: string;
  };
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ payload }) => {
  const content = payload.markdownContent || '# Workspace Documentation\n\nWelcome to your developer workspace. Use the chat to generate content, test APIs, or view logs.\n\n## Getting Started\n- Type "Generate login form" to see the Form Builder.\n- Type "Format this JSON" followed by raw data to use the JSON Viewer.';

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-4xl font-black mb-6 border-b border-zinc-800 pb-4 text-white tracking-tight">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-zinc-100">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold mt-6 mb-2 text-zinc-200">{line.slice(4)}</h3>;
      }
      if (line.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 mb-2 ml-2">
            <span className="text-blue-500 font-bold">•</span>
            <span className="text-zinc-400">{line.slice(2)}</span>
          </div>
        );
      }
      if (line.startsWith('```')) {
        return <div key={i} className="my-6 p-4 bg-zinc-950 rounded-lg border border-zinc-800 code-font text-sm text-blue-300 overflow-x-auto">{line}</div>;
      }
      if (!line.trim()) return <div key={i} className="h-4" />;
      
      return <p key={i} className="mb-4 text-zinc-400 leading-relaxed text-sm antialiased">{line}</p>;
    });
  };

  return (
    <div className="h-full bg-[#0d0d0d] rounded-xl border border-zinc-800 flex flex-col overflow-hidden shadow-inner">
      <div className="flex-1 overflow-auto p-12 max-w-4xl mx-auto w-full">
        <div className="prose prose-invert max-w-none">
          {renderMarkdown(content)}
        </div>
      </div>
    </div>
  );
};

export default MarkdownViewer;
