
import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const levels: LogEntry['level'][] = ['info', 'warn', 'error', 'debug'];
      const messages = [
        "Incoming request on /api/v1/users",
        "DB Connection successful",
        "Cache hit for key 'session_123'",
        "Slow query detected: SELECT * FROM large_table",
        "User authentication failed for user@example.com",
        "Garbage collection triggered",
        "Internal Server Error: Unexpected token }",
      ];
      
      const newLog: LogEntry = {
        timestamp: new Date().toLocaleTimeString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)]
      };
      
      setLogs(prev => [...prev.slice(-100), newLog]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(l => filter === 'all' || l.level === filter);

  return (
    <div className="h-full bg-[#0a0a0a] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <span className="text-sm font-medium text-zinc-400">System Logs</span>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-xs px-2 py-1 rounded outline-none"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
      </div>
      <div className="flex-1 overflow-auto p-4 code-font text-xs space-y-1">
        {filteredLogs.map((log, i) => (
          <div key={i} className="flex gap-4">
            <span className="text-zinc-600 shrink-0">{log.timestamp}</span>
            <span className={`shrink-0 w-12 font-bold ${
              log.level === 'error' ? 'text-red-500' : 
              log.level === 'warn' ? 'text-yellow-500' : 
              log.level === 'info' ? 'text-blue-500' : 'text-zinc-500'
            }`}>
              {log.level.toUpperCase()}
            </span>
            <span className="text-zinc-300">{log.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default LogViewer;
