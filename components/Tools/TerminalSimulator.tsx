
import React, { useState, useRef, useEffect } from 'react';

const TerminalSimulator: React.FC = () => {
  const [history, setHistory] = useState<string[]>([
    "DevFlow Terminal v1.0.0",
    "Type 'help' for available commands.",
    ""
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [history]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim().toLowerCase();
    let response = '';

    switch(cmd) {
      case 'help':
        response = 'Available: help, clear, whoami, ls, date, version';
        break;
      case 'clear':
        setHistory([]);
        setInput('');
        return;
      case 'whoami':
        response = 'dev-user@devflow-workspace';
        break;
      case 'ls':
        response = 'src/  public/  node_modules/  package.json  tsconfig.json';
        break;
      case 'date':
        response = new Date().toString();
        break;
      case 'version':
        response = '1.0.0-beta';
        break;
      default:
        response = `Command not found: ${cmd}`;
    }

    setHistory(prev => [...prev, `$ ${input}`, response, ""]);
    setInput('');
  };

  return (
    <div className="h-full bg-black text-green-500 p-4 code-font text-sm overflow-auto rounded-lg border border-zinc-800">
      <div className="space-y-1">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
        <form onSubmit={handleCommand} className="flex gap-2">
          <span>$</span>
          <input 
            autoFocus
            className="bg-transparent border-none outline-none flex-1 text-green-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalSimulator;
