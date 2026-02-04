
import React, { useState } from 'react';

interface ApiTesterProps {
  payload: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
  };
}

const ApiTester: React.FC<ApiTesterProps> = ({ payload }) => {
  const [method, setMethod] = useState(payload.method || 'GET');
  const [url, setUrl] = useState(payload.url || '');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      setResponse({
        status: 200,
        statusText: "OK",
        data: { message: "Successfully fetched data from simulated endpoint", timestamp: new Date().toISOString() }
      });
    } catch (err) {
      setResponse({ error: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111] rounded-lg border border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex gap-2 items-center">
        <select 
          value={method} 
          onChange={(e) => setMethod(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded text-sm outline-none focus:border-blue-500"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
          <option>PATCH</option>
        </select>
        <input 
          type="text" 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded text-sm outline-none focus:border-blue-500"
        />
        <button 
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Response</h3>
          <div className="bg-zinc-900 rounded p-4 border border-zinc-800 min-h-[200px] code-font text-sm whitespace-pre-wrap">
            {response ? JSON.stringify(response, null, 2) : 'No response yet. Send a request to see output.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTester;
