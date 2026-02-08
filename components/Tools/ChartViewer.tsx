import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const MAX_ROWS = 500;
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

type ChartType = 'bar' | 'line' | 'pie' | 'area';

interface ChartViewerProps {
  payload: {
    data?: unknown;
  };
}

function isNumeric(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function extractRows(data: unknown): Record<string, unknown>[] | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const arr = data as unknown[];
    if (arr.length === 0) return [];
    const first = arr[0];
    if (first !== null && typeof first === 'object' && !Array.isArray(first))
      return arr.slice(0, MAX_ROWS) as Record<string, unknown>[];
    return null;
  }
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const key of ['analytics', 'data', 'series', 'values', 'items']) {
      const val = obj[key];
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0];
        if (first !== null && typeof first === 'object' && !Array.isArray(first))
          return (val as Record<string, unknown>[]).slice(0, MAX_ROWS);
      }
    }
    const firstArray = Object.values(obj).find((v) => Array.isArray(v) && v.length > 0);
    if (firstArray && Array.isArray(firstArray)) {
      const first = firstArray[0];
      if (first !== null && typeof first === 'object' && !Array.isArray(first))
        return (firstArray as Record<string, unknown>[]).slice(0, MAX_ROWS);
    }
  }
  return null;
}

function detectColumns(rows: Record<string, unknown>[]): {
  labelKey: string;
  numericKeys: string[];
  suggestedType: ChartType;
} {
  if (rows.length === 0)
    return { labelKey: 'name', numericKeys: [], suggestedType: 'bar' };

  const first = rows[0];
  const keys = Object.keys(first);
  const labelCandidates = ['name', 'label', 'day', 'category', 'id', 'x'];
  let labelKey = keys.find((k) => labelCandidates.includes(k)) ?? keys.find((k) => typeof first[k] === 'string') ?? (keys[0] || 'name');
  let numericKeys = keys.filter((k) => k !== labelKey && isNumeric(first[k]));
  if (numericKeys.length === 0) {
    const anyNumeric = keys.filter((k) => k !== labelKey && rows.some((r) => isNumeric(r[k])));
    if (anyNumeric.length > 0) numericKeys = anyNumeric;
  }

  let suggestedType: ChartType = 'bar';
  if (numericKeys.length === 0) suggestedType = 'bar';
  else if (rows.length <= 10 && numericKeys.length === 1) suggestedType = 'pie';
  else {
    const xVal = first[labelKey];
    const looksLikeTime =
      typeof xVal === 'string' &&
      /^\d{4}-\d{2}-\d{2}|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{1,2}/i.test(String(xVal));
    const sorted =
      rows.length >= 2 &&
      numericKeys.every((nk) => {
        let prev = rows[0][nk] as number;
        for (let i = 1; i < rows.length; i++) {
          const next = rows[i][nk] as number;
          if (typeof prev !== 'number' || typeof next !== 'number') return false;
          if (next < prev) return false;
          prev = next;
        }
        return true;
      });
    if (looksLikeTime || sorted) suggestedType = 'line';
    else suggestedType = 'bar';
  }

  return { labelKey, numericKeys, suggestedType };
}

/** Normalize payload.data (string = JSON, array/object = use or extract array) */
function normalizeInput(raw: unknown): {
  rows: Record<string, unknown>[] | null;
  error: string | null;
} {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { rows: null, error: 'Invalid JSON' };
    }
  }
  const rows = extractRows(data);
  if (rows === null) return { rows: null, error: 'Cannot generate chart from input' };
  if (rows.length === 0) return { rows: [], error: null };
  const { numericKeys } = detectColumns(rows);
  if (numericKeys.length === 0) return { rows: null, error: 'No numeric data available' };
  return { rows, error: null };
}

const ChartViewer: React.FC<ChartViewerProps> = ({ payload }) => {
  const { rows, error } = useMemo(() => normalizeInput(payload.data), [payload.data]);
  const config = useMemo(() => (rows && rows.length > 0 ? detectColumns(rows) : null), [rows]);
  const [chartType, setChartType] = useState<ChartType>(config?.suggestedType ?? 'bar');

  const chartData = useMemo(() => {
    if (!rows || !config) return [];
    const { labelKey, numericKeys } = config;
    return rows.map((r) => {
      const out: Record<string, unknown> = { name: String(r[labelKey] ?? '') };
      numericKeys.forEach((k) => (out[k] = r[k]));
      return out;
    });
  }, [rows, config]);

  if (error) {
    return (
      <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">Chart Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Visualize structured data.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-amber-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">Chart Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Visualize structured data.</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-zinc-500">No data to display.</p>
        </div>
      </div>
    );
  }

  if (!config || config.numericKeys.length === 0) {
    return (
      <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-sm font-medium text-zinc-300">Chart Viewer</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-amber-400">No numeric data available</p>
        </div>
      </div>
    );
  }

  const { labelKey, numericKeys } = config;
  const tooltipStyle = { backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', fontSize: '12px' };

  const renderChart = () => {
    switch (chartType) {
      case 'pie': {
        const pieData = chartData.map((d) => ({
          name: String(d.name),
          value: Number(d[numericKeys[0]]),
        }));
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [Number(v).toLocaleString(), numericKeys[0]]} contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        );
      }
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [Number(v).toLocaleString(), undefined]} />
            <Legend />
            {numericKeys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={{ fill: COLORS[i % COLORS.length] }} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [Number(v).toLocaleString(), undefined]} />
            <Legend />
            {numericKeys.map((k, i) => (
              <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />
            ))}
          </AreaChart>
        );
      default:
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip cursor={{ fill: '#222' }} contentStyle={tooltipStyle} formatter={(v: number) => [Number(v).toLocaleString(), undefined]} />
            <Legend />
            {numericKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="h-full bg-[#111] rounded-lg border border-zinc-800 flex flex-col overflow-hidden">
      <header className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-900/50 shrink-0">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Chart Viewer</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Visualize structured data. Auto-detected axes.</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['bar', 'line', 'pie', 'area'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setChartType(t)}
              className={`px-3 py-1.5 rounded text-xs capitalize transition-colors border ${
                chartType === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 min-h-[280px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartViewer;
