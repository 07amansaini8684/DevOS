
import { create } from 'zustand';
import { ToolInstance, ToolType, ChatMessage, WorkspaceState as StateType } from '../types';
import { parseIntent } from '../services/geminiService';

interface WorkspaceActions {
  sendMessage: (content: string) => Promise<void>;
  createTool: (type: ToolType, payload?: any) => void;
  setActiveTool: (id: string | null) => void;
  closeTool: (id: string) => void;
  setView: (view: 'home' | 'workspace') => void;
}

export const useWorkspaceStore = create<StateType & WorkspaceActions>((set, get) => ({
  activeToolId: null,
  openTools: [],
  chatHistory: [
    { id: '1', role: 'assistant', content: '👋 I am your AI Developer Workspace assistant. Describe what you need, and I will load the right tool for you.' }
  ],
  isLoading: false,
  view: 'home',

  setView: (view) => set({ view }),

  sendMessage: async (content: string) => {
    if (!content.trim()) return;

    set(state => ({
      isLoading: true,
      chatHistory: [...state.chatHistory, { id: Date.now().toString(), role: 'user', content }]
    }));

    const result = await parseIntent(content);

    let newToolInstance: ToolInstance | null = null;
    
    if (result.tool) {
      newToolInstance = {
        id: Math.random().toString(36).substr(2, 9),
        type: result.tool as ToolType,
        title: `${result.tool} #${get().openTools.length + 1}`,
        payload: result.payload,
        timestamp: Date.now()
      };
    }

    set(state => ({
      isLoading: false,
      activeToolId: newToolInstance ? newToolInstance.id : state.activeToolId,
      openTools: newToolInstance ? [...state.openTools, newToolInstance] : state.openTools,
      chatHistory: [
        ...state.chatHistory, 
        { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: result.message || "I've updated your workspace.",
          toolResult: result.tool ? { tool: result.tool as ToolType, payload: result.payload } : undefined
        }
      ]
    }));
  },

  createTool: (type: ToolType, payload: any = {}) => {
    const newToolInstance: ToolInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type: type,
      title: `${type} #${get().openTools.length + 1}`,
      payload: payload,
      timestamp: Date.now()
    };
    set(state => ({
      openTools: [...state.openTools, newToolInstance],
      activeToolId: newToolInstance.id,
      chatHistory: [...state.chatHistory, { 
        id: Date.now().toString(), 
        role: 'system', 
        content: `Directly initialized ${type} tool.` 
      }]
    }));
  },

  setActiveTool: (id: string | null) => set({ activeToolId: id }),

  closeTool: (id: string) => set(state => {
    const remaining = state.openTools.filter(t => t.id !== id);
    return {
      openTools: remaining,
      activeToolId: state.activeToolId === id ? (remaining.length > 0 ? remaining[remaining.length - 1].id : null) : state.activeToolId
    };
  }),
}));
