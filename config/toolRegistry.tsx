
import React from 'react';
import { ToolType } from '../types';

export interface ToolMetadata {
  type: ToolType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const TOOL_REGISTRY: Record<ToolType, ToolMetadata> = {
  [ToolType.ApiTester]: {
    type: ToolType.ApiTester,
    label: 'API Tester',
    description: 'Test REST endpoints and view responses.',
    color: '#3b82f6',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  },
  [ToolType.JsonViewer]: {
    type: ToolType.JsonViewer,
    label: 'JSON Viewer',
    description: 'Format and explore complex JSON structures.',
    color: '#10b981',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  },
  [ToolType.FormGenerator]: {
    type: ToolType.FormGenerator,
    label: 'Form Builder',
    description: 'Generate interactive forms from JSON schemas.',
    color: '#f59e0b',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/></svg>
  },
  [ToolType.TableViewer]: {
    type: ToolType.TableViewer,
    label: 'Table Viewer',
    description: 'Explore tabular data with search and filters.',
    color: '#8b5cf6',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
  },
  [ToolType.ChartBuilder]: {
    type: ToolType.ChartBuilder,
    label: 'Chart Builder',
    description: 'Visualize metrics with dynamic charts.',
    color: '#ec4899',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  },
  [ToolType.CodeGenerator]: {
    type: ToolType.CodeGenerator,
    label: 'Code Generator',
    description: 'Generate boilerplate and scripts instantly.',
    color: '#6366f1',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
  },
  [ToolType.LogViewer]: {
    type: ToolType.LogViewer,
    label: 'Log Viewer',
    description: 'Real-time system log monitoring.',
    color: '#ef4444',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  },
  [ToolType.MarkdownViewer]: {
    type: ToolType.MarkdownViewer,
    label: 'Markdown Reader',
    description: 'Read and render documentation files.',
    color: '#71717a',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
  },
  [ToolType.EnvManager]: {
    type: ToolType.EnvManager,
    label: 'Env Manager',
    description: 'Securely manage environment variables.',
    color: '#fbbf24',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3.5"/></svg>
  },
  [ToolType.TerminalSimulator]: {
    type: ToolType.TerminalSimulator,
    label: 'Terminal',
    description: 'Simulated shell for quick commands.',
    color: '#22c55e',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
  }
};
