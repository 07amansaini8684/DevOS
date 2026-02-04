
import React, { useState } from 'react';

interface TableViewerProps {
  payload: {
    columns?: string[];
    data?: any[];
  };
}

const TableViewer: React.FC<TableViewerProps> = ({ payload }) => {
  const [search, setSearch] = useState('');
  const data = payload.data || [];
  const columns = payload.columns || (data.length > 0 ? Object.keys(data[0]) : []);

  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center gap-4 bg-zinc-900/50">
        <div className="flex items-center gap-2 flex-1">
           <input 
            type="text" 
            placeholder="Search table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs bg-zinc-950 border border-zinc-700 px-3 py-1.5 rounded text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button className="bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded border border-zinc-700">
          Add Record
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-zinc-900 z-10 shadow-sm">
            <tr>
              {columns.map(col => (
                <th key={col} className="p-3 border-b border-zinc-800 text-zinc-400 font-medium capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={idx} className="hover:bg-zinc-900/40 border-b border-zinc-800/50 transition-colors">
                {columns.map(col => (
                  <td key={col} className="p-3 text-zinc-300">
                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="p-10 text-center text-zinc-500 italic">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableViewer;
