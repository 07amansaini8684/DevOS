
import React from 'react';

interface JsonViewerProps {
  payload: {
    jsonObject: any;
  };
}

const JsonViewer: React.FC<JsonViewerProps> = ({ payload }) => {
  const jsonStr = JSON.stringify(payload.jsonObject || {}, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonStr);
    alert('Copied to clipboard!');
  };

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <span className="text-sm font-medium text-zinc-400">JSON Viewer</span>
        <button 
          onClick={copyToClipboard}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded border border-zinc-700 transition-colors"
        >
          Copy JSON
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="code-font text-sm text-green-400">
          {jsonStr}
        </pre>
      </div>
    </div>
  );
};

export default JsonViewer;
