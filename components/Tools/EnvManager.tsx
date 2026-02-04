
import React, { useState } from 'react';

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

const EnvManager: React.FC = () => {
  const [envs, setEnvs] = useState<EnvVar[]>([
    { key: 'API_KEY', value: 'sk-1234567890', isSecret: true },
    { key: 'DATABASE_URL', value: 'postgresql://user:pass@localhost:5432/db', isSecret: true },
    { key: 'PORT', value: '3000', isSecret: false },
    { key: 'NODE_ENV', value: 'development', isSecret: false },
  ]);

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const toggleSecret = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <span className="text-sm font-medium text-zinc-400">Environment Variables</span>
        <button className="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1 rounded">Add Variable</button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {envs.map((env) => (
            <div key={env.key} className="flex items-center gap-4 bg-zinc-900/50 p-3 rounded border border-zinc-800">
              <div className="w-1/3">
                <span className="code-font text-sm text-zinc-400">{env.key}</span>
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="code-font text-sm text-zinc-100">
                  {env.isSecret && !visibleSecrets[env.key] ? '••••••••••••••••' : env.value}
                </span>
                {env.isSecret && (
                  <button 
                    onClick={() => toggleSecret(env.key)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase font-bold tracking-tight"
                  >
                    {visibleSecrets[env.key] ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
              <button className="text-zinc-600 hover:text-red-500">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnvManager;
