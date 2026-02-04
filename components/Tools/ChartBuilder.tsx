
import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface ChartBuilderProps {
  payload: {
    type?: 'bar' | 'line' | 'area';
    data?: any[];
    config?: any;
  };
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ payload }) => {
  const [type, setType] = useState(payload.type || 'bar');
  const data = payload.data || [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 },
  ];

  const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : ['value'];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
            <Legend />
            {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={['#3b82f6', '#10b981', '#f59e0b'][i % 3]} />)}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
            <Legend />
            {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} fill={['#3b82f6', '#10b981', '#f59e0b'][i % 3]} stroke={['#3b82f6', '#10b981', '#f59e0b'][i % 3]} />)}
          </AreaChart>
        );
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip cursor={{fill: '#222'}} contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
            <Legend />
            {keys.map((k, i) => <Bar key={k} dataKey={k} fill={['#3b82f6', '#10b981', '#f59e0b'][i % 3]} />)}
          </BarChart>
        );
    }
  };

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
        <h3 className="text-sm font-medium">Chart Visualization</h3>
        <div className="flex gap-2">
          {['bar', 'line', 'area'].map(t => (
            <button 
              key={t}
              onClick={() => setType(t as any)}
              className={`px-3 py-1 rounded text-xs capitalize transition-colors border ${type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartBuilder;
