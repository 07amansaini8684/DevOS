
export enum ToolType {
  ApiTester = 'ApiTester',
  JsonViewer = 'JsonViewer',
  FormGenerator = 'FormGenerator',
  TableViewer = 'TableViewer',
  ChartBuilder = 'ChartBuilder',
  CodeGenerator = 'CodeGenerator',
  LogViewer = 'LogViewer',
  MarkdownViewer = 'MarkdownViewer',
  EnvManager = 'EnvManager',
  TerminalSimulator = 'TerminalSimulator'
}

export interface ToolInstance {
  id: string;
  type: ToolType;
  title: string;
  payload: any;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolResult?: {
    tool: ToolType;
    payload: any;
  };
}

export interface WorkspaceState {
  activeToolId: string | null;
  openTools: ToolInstance[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  view: 'home' | 'workspace';
}
