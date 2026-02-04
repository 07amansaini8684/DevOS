
import React, { useState } from 'react';

interface FormGeneratorProps {
  payload: {
    schema?: Record<string, any>;
  };
}

const FormGenerator: React.FC<FormGeneratorProps> = ({ payload }) => {
  const schema = payload.schema || {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    role: ["Admin", "User", "Guest"],
    active: true
  };

  const [formData, setFormData] = useState<any>(
    Object.keys(schema).reduce((acc: any, key) => {
      acc[key] = Array.isArray(schema[key]) ? schema[key][0] : schema[key];
      return acc;
    }, {})
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(JSON.stringify(formData, null, 2));
  };

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <span className="text-sm font-medium text-zinc-400">Dynamic Form Generator</span>
      </div>
      <div className="flex-1 overflow-auto p-6 flex gap-8">
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 max-w-md">
          {Object.keys(schema).map(key => {
            const val = schema[key];
            return (
              <div key={key}>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">{key}</label>
                {Array.isArray(val) ? (
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-sm outline-none focus:border-blue-500"
                    value={formData[key]}
                    onChange={e => setFormData({...formData, [key]: e.target.value})}
                  >
                    {val.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                ) : typeof val === 'boolean' ? (
                  <input 
                    type="checkbox" 
                    checked={formData[key]}
                    onChange={e => setFormData({...formData, [key]: e.target.checked})}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900"
                  />
                ) : (
                  <input 
                    type={typeof val === 'number' ? 'number' : 'text'}
                    className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-sm outline-none focus:border-blue-500"
                    value={formData[key]}
                    onChange={e => setFormData({...formData, [key]: e.target.value})}
                  />
                )}
              </div>
            );
          })}
          <button className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded text-sm font-medium transition-colors">
            Save Changes
          </button>
        </form>
        
        <div className="flex-1 bg-zinc-900/30 p-4 rounded border border-zinc-800">
           <h3 className="text-xs font-semibold text-zinc-600 uppercase mb-4">Live Preview (Data)</h3>
           <pre className="code-font text-xs text-zinc-400">
             {JSON.stringify(formData, null, 2)}
           </pre>
        </div>
      </div>
    </div>
  );
};

export default FormGenerator;
