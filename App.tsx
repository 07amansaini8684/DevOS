import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTamboThread } from '@tambo-ai/react';
import { useWorkspaceStore } from './store/workspaceStore';
import { ToolType } from './types';
import { TOOL_REGISTRY } from './config/toolRegistry';
import { tamboComponentToTool, tamboComponentToLabel, extractUrlFromMessageContent, getLastUserMessageContent, getLastUserMessageText, getLastUserMessageTextLikeEnv, getLastUserMessageTextLikeLogs, extractJsonFromText, extractCommandFromUserMessage } from './services/tamboToWorkspace';
import TamboChat from './components/TamboChat.tsx';

// Tool imports
import ApiTester from './components/Tools/ApiTester';
import JsonViewer from './components/Tools/JsonViewer';
import FormGenerator from './components/Tools/FormGenerator';
import TableViewer from './components/Tools/TableViewer';
import ChartBuilder from './components/Tools/ChartBuilder';
import ChartViewer from './components/Tools/ChartViewer';
import CodeGenerator from './components/Tools/CodeGenerator';
import LogViewer from './components/Tools/LogViewer';
import MarkdownViewer from './components/Tools/MarkdownViewer';
import EnvManager from './components/Tools/EnvManager';
import TerminalSimulator from './components/Tools/TerminalSimulator';

const HOME_HELP_SEEN_KEY = 'devos_home_help_seen';
const HOW_TO_USE_VIDEO_URL = 'https://jam.dev/c/55d1526a-fbe0-4737-81cc-005f51003f67';

const HomePage: React.FC<{ onEnter: (tool?: ToolType) => void }> = ({ onEnter }) => {
  const [showHomeHelpDialog, setShowHomeHelpDialog] = React.useState(false);
  const hasCheckedFirstVisit = useRef(false);

  useEffect(() => {
    if (hasCheckedFirstVisit.current) return;
    hasCheckedFirstVisit.current = true;
    try {
      if (!localStorage.getItem(HOME_HELP_SEEN_KEY)) setShowHomeHelpDialog(true);
    } catch (_) {}
  }, []);

  const closeHomeHelp = () => {
    try { localStorage.setItem(HOME_HELP_SEEN_KEY, '1'); } catch (_) {}
    setShowHomeHelpDialog(false);
  };

  const toolCategories = [
    {
      title: 'CORE TOOLS',
      tools: [
        { type: ToolType.ApiTester, status: 'LIVE' },
        { type: ToolType.CodeGenerator, status: 'LIVE' },
        { type: ToolType.JsonViewer, status: 'LIVE' },
        { type: ToolType.TableViewer, status: 'LIVE' },
      ]
    },
    {
      title: 'UTILITIES',
      tools: [
        { type: ToolType.MarkdownViewer, status: 'LIVE' },
        { type: ToolType.EnvManager, status: 'LIVE' },
        { type: ToolType.LogViewer, status: 'LIVE' },
        { type: ToolType.TerminalSimulator, status: 'LIVE' },
      ]
    }
  ];

  // Featured tools for the specified layout
  const row1ToolTypes = [ToolType.ApiTester, ToolType.CodeGenerator, ToolType.JsonViewer];
  const row2ToolType = ToolType.TableViewer;

  const row1Tools = row1ToolTypes.map(type => TOOL_REGISTRY[type]);
  const row2Tool = TOOL_REGISTRY[row2ToolType];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full min-h-screen bg-[#0a0a0a] text-[#A1A1AA] flex justify-center py-10 px-4 md:px-10 font-sans antialiased"
    >
      <div className="w-full max-w-[1250px] flex flex-col lg:flex-row gap-10">

        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-10 flex flex-col gap-6"
          >
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-10 px-2 opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                <span className="text-[10px] font-black tracking-[0.2em] uppercase">TOOL HUB</span>
              </div>

              {toolCategories.map((cat, idx) => (
                <div key={idx} className="mb-10 last:mb-0">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-[#52525B] mb-5 px-2 uppercase">{cat.title}</h3>
                  <ul className="space-y-1">
                    {cat.tools.map(tool => (
                      <motion.li
                        key={tool.type}
                        whileHover={tool.status === 'LIVE' ? { x: 4, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
                        whileTap={tool.status === 'LIVE' ? { scale: 0.98 } : {}}
                        onClick={() => tool.status === 'LIVE' && onEnter(tool.type)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${tool.status === 'LIVE' ? 'cursor-pointer group' : 'opacity-40 cursor-not-allowed'
                          }`}
                      >
                        <span className={`text-xs font-semibold ${tool.status === 'LIVE' ? 'group-hover:text-white' : ''}`}>
                          {TOOL_REGISTRY[tool.type].label}
                        </span>
                        {tool.status === 'LIVE' && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">LIVE</span>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col gap-16 min-w-0">

          {/* HERO SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 md:p-16 relative overflow-hidden flex flex-col justify-center min-h-[400px] shadow-2xl"
          >
            <div className="flex justify-between items-start mb-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" /></svg>
                </div>
                <span className="text-lg font-black tracking-tight text-white uppercase">DevFlow.ai</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHomeHelpDialog(true)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                title="How to use (video)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              </button>
            </div>
            <div className="max-w-2xl relative z-10">
              <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
                Accelerate Your <br /> <span className="text-[#00BFA5]">Dev Workflow.</span>
              </h1>
              <p className="text-[#71717A] text-sm md:text-base leading-relaxed max-w-md font-semibold">
                Universal tools for modern developers. Unified, fast, and driven by intelligence.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
          </motion.section>

          {/* AVAILABLE TOOLS SECTION (Refined 3-column Grid) */}
          <section>
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-[10px] font-black uppercase tracking-[0.4em] text-[#52525B] mb-10 px-4"
            >
              AVAILABLE WORKSPACE TOOLS
            </motion.h2>

            <div className="space-y-8">
              {/* Row 1: 3 Tools (Standard Column Width) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {row1Tools.map((tool, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ y: -5 }}
                    onClick={() => onEnter(tool.type)}
                    className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-xl group hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div
                        style={{ backgroundColor: `${tool.color}15`, borderColor: `${tool.color}25`, color: tool.color }}
                        className="w-10 h-10 border rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                      >
                        {tool.icon}
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 tracking-tight">{tool.label}</h3>
                    <p className="text-[11px] text-[#71717A] leading-relaxed mb-6 font-semibold line-clamp-2">{tool.description}</p>
                    <button className="mt-auto flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white hover:text-blue-400 transition-colors">
                      OPEN <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Row 2: 1 Tool (1/3 Width) + Enterprise Box (2/3 Width) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 4th Tool: Table Viewer (Takes 1 of 3 columns) */}
                <motion.div
                  whileHover={{ y: -5 }}
                  onClick={() => onEnter(row2Tool.type)}
                  className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 flex flex-col shadow-xl group hover:border-white/10 transition-all cursor-pointer md:col-span-1"
                >
                  <div className="flex justify-between items-center mb-8">
                    <div
                      style={{ backgroundColor: `${row2Tool.color}15`, borderColor: `${row2Tool.color}25`, color: row2Tool.color }}
                      className="w-12 h-12 border rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    >
                      {row2Tool.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 tracking-tight">{row2Tool.label}</h3>
                  <p className="text-xs text-[#71717A] leading-relaxed mb-8 font-semibold">{row2Tool.description}</p>
                  <button className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white hover:text-blue-400 transition-colors">
                    OPEN TOOL <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </button>
                </motion.div>

                {/* Enterprise Promo Box (Takes 2 of 3 columns) */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 flex flex-col shadow-xl md:col-span-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">FOR TEAMS & ENTERPRISE</span>
                      <span className="text-xs font-bold text-white">Deploy DevFlow to your organization</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#71717A] leading-relaxed mb-10 font-semibold max-w-2xl">
                    Looking to roll out standardized debugging, documentation, and API tooling across your whole engineering department? We offer dedicated support, SSO integration, and custom toolchains for high-growth teams.
                  </p>
                  <button className="mt-auto w-fit px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center gap-2">
                    CONTACT SALES <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* INFO SECTION */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-16 py-10 px-4">
            <div>
              <h2 className="text-2xl font-black text-white mb-6">What is DevFlow.ai?</h2>
              <p className="text-sm text-[#71717A] leading-relaxed mb-10 font-medium">
                DevFlow.ai is a comprehensive AI-driven ecosystem for engineers. We leverage advanced language models to automate the tedious parts of development, letting you focus on architectural decisions that matter.
              </p>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white border border-white/5 shrink-0">01</div>
                <div>
                  <h4 className="text-sm font-black text-white mb-1">Lightning Fast</h4>
                  <p className="text-xs text-[#52525B] font-semibold">Instantiate complex dev environments in under a second.</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white mb-6">Who is it for?</h2>
              <p className="text-sm text-[#71717A] leading-relaxed mb-10 font-medium">
                Whether you're a full-stack engineer, a technical lead, or a computer science student, our tools adapt to your specific workflow and language preferences.
              </p>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-black text-white border border-white/5 shrink-0">02</div>
                <div>
                  <h4 className="text-sm font-black text-white mb-1">Architecturally Sound</h4>
                  <p className="text-xs text-[#52525B] font-semibold">Grounded in modern design patterns and industry-standard security protocols.</p>
                </div>
              </div>
            </div>
          </section>

          {/* LARGE BOTTOM CTA */}
          <section className="relative group">
            <div className="bg-white rounded-[3rem] p-12 md:p-20 flex flex-col items-center text-center overflow-hidden shadow-2xl transition-transform group-hover:scale-[1.01] duration-500">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">READY TO SCALE YOUR PRODUCTIVITY?</span>
              <h2 className="text-3xl md:text-5xl font-black text-black mb-8 leading-tight tracking-tighter">
                Join thousands of developers <br className="hidden md:block" /> streamlining production with AI.
              </h2>
              <p className="text-sm text-zinc-600 max-w-lg mb-12 font-medium">
                Try the AI Code Generator today and see how quickly you can build robust, production-ready modules.
              </p>
              <button
                onClick={() => onEnter(ToolType.CodeGenerator)}
                className="flex items-center gap-3 px-8 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-black/10"
              >
                LAUNCH WORKSPACE <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
              </button>
            </div>
            <div className="absolute inset-0 bg-blue-600 rounded-[3.5rem] scale-105 blur-[80px] opacity-10 -z-10  transition-opacity" />
          </section>

          <footer className="py-20 border-t border-white/5 text-center text-[10px] font-black uppercase tracking-[0.4em] text-[#3F3F46]">
            © 2024 DEVFLOW.AI • THE INTELLIGENT WORKSPACE • ALL RIGHTS RESERVED
          </footer>
        </div>
      </div>

      {/* Home: How to use — video walkthrough (first-time auto-open) */}
      <AnimatePresence>
        {showHomeHelpDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={closeHomeHelp}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-white">How to use DevOS — Video walkthrough</h2>
                <button
                  type="button"
                  onClick={closeHomeHelp}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="p-5 flex-1 overflow-auto space-y-4">
                <p className="text-sm text-zinc-400">
                  Watch this short walkthrough to see how to use the workspace, chat with the AI, and open tools.
                </p>
                <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10">
                  <iframe
                    title="How to use DevOS"
                    src={HOW_TO_USE_VIDEO_URL}
                    className="w-full h-full min-h-[280px]"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <a
                  href={HOW_TO_USE_VIDEO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  Open video in new tab
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
              <div className="p-5 border-t border-white/10 bg-white/5 shrink-0">
                <button
                  type="button"
                  onClick={closeHomeHelp}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ToolRenderer: React.FC<{ tool: any; createTool?: (type: ToolType, payload: Record<string, unknown>) => void }> = ({ tool, createTool }) => {
  React.useEffect(() => {
    console.log('[Workspace] ToolRenderer → tool mounted:', { type: tool.type, title: tool.title, payload: tool.payload });
  }, [tool.id, tool.type, tool.title, tool.payload]);
  switch (tool.type) {
    case ToolType.ApiTester: return <ApiTester payload={tool.payload} />;
    case ToolType.JsonViewer: return <JsonViewer payload={tool.payload} />;
    case ToolType.FormGenerator: return <FormGenerator payload={tool.payload} />;
    case ToolType.TableViewer: return <TableViewer payload={tool.payload} />;
    case ToolType.ChartBuilder: return <ChartBuilder payload={tool.payload} />;
    case ToolType.ChartViewer: return <ChartViewer payload={tool.payload} />;
    case ToolType.CodeGenerator: return <CodeGenerator payload={tool.payload} />;
    case ToolType.LogViewer: return <LogViewer payload={tool.payload} />;
    case ToolType.MarkdownViewer: return <MarkdownViewer payload={tool.payload} />;
    case ToolType.EnvManager: return <EnvManager payload={tool.payload} />;
    case ToolType.TerminalSimulator: return <TerminalSimulator payload={tool.payload} createTool={createTool} />;
    default: return <div className="p-8 text-zinc-500">Component mapping not found.</div>;
  }
};

const WORKSPACE_HELP_SEEN_KEY = 'devos_workspace_help_seen';

const WorkspaceUI: React.FC = () => {
  const { openTools, activeToolId, createTool, setActiveTool, closeTool, setView } = useWorkspaceStore();
  const { thread } = useTamboThread();
  const activeTool = openTools.find(t => t.id === activeToolId);
  const openedMessageIds = useRef<Set<string>>(new Set());
  const [showHelpDialog, setShowHelpDialog] = React.useState(false);
  const hasCheckedFirstVisit = useRef(false);

  // Auto-open help dialog the first time user lands on the workspace (from home)
  useEffect(() => {
    if (hasCheckedFirstVisit.current) return;
    hasCheckedFirstVisit.current = true;
    try {
      if (!localStorage.getItem(WORKSPACE_HELP_SEEN_KEY)) {
        setShowHelpDialog(true);
      }
    } catch (_) {}
  }, []);

  // Flow: User Input → ChatPanel → AI Model → Intent + Component + Props → Tambo → Workspace → <Tool />
  // When Tambo returns a component (componentName + props), open that tool on the right panel and focus it.
  useEffect(() => {
    thread.messages.forEach((msg) => {
      const comp = (msg as { component?: { componentName?: string | null; props?: Record<string, unknown> } }).component;
      if (msg.role !== 'assistant' || !comp?.componentName || openedMessageIds.current.has(msg.id)) return;

      const props = comp.props ?? {};
      console.log('[Tambo → Workspace] Assistant message with component:', {
        messageId: msg.id,
        componentName: comp.componentName,
        propsFromTambo: props,
        messageContentPreview: Array.isArray(msg.content)
          ? (msg.content as { text?: string }[]).map((p) => p.text?.slice(0, 80)).join(' | ')
          : msg.content,
      });

      let mapped = tamboComponentToTool(comp.componentName, props);
      if (mapped) {
        console.log('[Tambo → Workspace] Mapped to tool (before enrichment):', {
          type: mapped.type,
          payload: mapped.payload,
        });

        // When Tambo doesn't pass URL in props, try assistant message text, then the user's last message (they typed the URL)
        if (mapped.type === ToolType.ApiTester && !mapped.payload.url) {
          const extractedUrl =
            extractUrlFromMessageContent(msg.content) ??
            extractUrlFromMessageContent(getLastUserMessageContent(thread.messages));
          if (extractedUrl) {
            mapped = {
              type: mapped.type,
              payload: {
                ...mapped.payload,
                method: (mapped.payload.method as string) || 'GET',
                url: extractedUrl,
              },
            };
            console.log('[Tambo → Workspace] Enriched ApiTester payload (URL from message text):', {
              url: extractedUrl,
              payload: mapped.payload,
            });
          }
        }

        // When CodeGenerator is opened with empty task, use the last user message as the task (e.g. "generate express login route")
        if (mapped.type === ToolType.CodeGenerator) {
          const task = (mapped.payload.task as string)?.trim();
          if (!task) {
            const fallbackTask = getLastUserMessageText(thread.messages);
            if (fallbackTask) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, task: fallbackTask },
              };
              console.log('[Tambo → Workspace] Enriched CodeGenerator payload (task from last user message):', {
                task: fallbackTask,
                payload: mapped.payload,
              });
            }
          }
        }

        // When JsonViewer is opened with empty/default data, use JSON from the last user message (e.g. pasted payload)
        if (mapped.type === ToolType.JsonViewer) {
          const data = mapped.payload.data as string | undefined;
          const isEmpty =
            data === undefined ||
            data === '' ||
            (typeof data === 'string' && data.trim() === '') ||
            (typeof data === 'string' && data.trim() === '{}');
          if (isEmpty) {
            const userText = getLastUserMessageText(thread.messages);
            const extractedJson = extractJsonFromText(userText);
            if (extractedJson) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, data: extractedJson },
              };
              console.log('[Tambo → Workspace] Enriched JsonViewer payload (data from last user message):', {
                dataLength: extractedJson.length,
                payload: mapped.payload,
              });
            }
          }
        }

        // When ChartViewer is opened with empty/default data, use JSON from the last user message (e.g. pasted analytics)
        if (mapped.type === ToolType.ChartViewer) {
          const data = mapped.payload.data;
          const isEmpty =
            data === undefined ||
            data === null ||
            (typeof data === 'string' && (data.trim() === '' || data.trim() === '[]')) ||
            (Array.isArray(data) && data.length === 0);
          if (isEmpty) {
            const userText = getLastUserMessageText(thread.messages);
            const extractedJson = extractJsonFromText(userText);
            if (extractedJson) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, data: extractedJson },
              };
              console.log('[Tambo → Workspace] Enriched ChartViewer payload (data from last user message):', {
                dataLength: extractedJson.length,
                payload: mapped.payload,
              });
            }
          }
        }

        // When TableViewer is opened with empty/default data, use JSON from the last user message (e.g. pasted table data)
        if (mapped.type === ToolType.TableViewer) {
          const data = mapped.payload.data;
          const isEmpty =
            data === undefined ||
            data === null ||
            (typeof data === 'string' && (data.trim() === '' || data.trim() === '[]')) ||
            (Array.isArray(data) && data.length === 0);
          if (isEmpty) {
            const userText = getLastUserMessageText(thread.messages);
            const extractedJson = extractJsonFromText(userText);
            if (extractedJson) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, data: extractedJson },
              };
              console.log('[Tambo → Workspace] Enriched TableViewer payload (data from last user message):', {
                dataLength: extractedJson.length,
                payload: mapped.payload,
              });
            }
          }
        }

        // When LogViewer is opened with empty logs, use the message that looks like logs (full paste, not a short follow-up)
        if (mapped.type === ToolType.LogViewer) {
          const logs = mapped.payload.logs;
          const isEmpty =
            logs === undefined ||
            logs === null ||
            (typeof logs === 'string' && !logs.trim()) ||
            (Array.isArray(logs) && logs.length === 0);
          if (isEmpty) {
            const userText = getLastUserMessageTextLikeLogs(thread.messages);
            if (userText) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, logs: userText },
              };
              console.log('[Tambo → Workspace] Enriched LogViewer payload (logs from user message that looks like logs):', {
                logsLength: typeof userText === 'string' ? userText.length : 0,
                payload: mapped.payload,
              });
            }
          }
        }

        // When MarkdownViewer is opened with empty content, use the last user message (e.g. pasted markdown)
        if (mapped.type === ToolType.MarkdownViewer) {
          const md = mapped.payload.content ?? mapped.payload.markdownContent;
          const isEmpty = md === undefined || md === null || (typeof md === 'string' && !md.trim());
          if (isEmpty) {
            const userText = getLastUserMessageText(thread.messages);
            if (userText) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, content: userText, markdownContent: userText },
              };
              console.log('[Tambo → Workspace] Enriched MarkdownViewer payload (content from last user message):', {
                payload: mapped.payload,
              });
            }
          }
        }

        // When EnvManager is opened with empty env, use the last user message (e.g. pasted .env)
        if (mapped.type === ToolType.EnvManager) {
          const env = mapped.payload.envContent ?? mapped.payload.env;
          const isEmpty = env === undefined || env === null || (typeof env === 'string' && !env.trim());
          if (isEmpty) {
            const userText = getLastUserMessageTextLikeEnv(thread.messages);
            if (userText) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, envContent: userText },
              };
              console.log('[Tambo → Workspace] Enriched EnvManager payload (envContent from last user message that looks like .env):', {
                payload: mapped.payload,
              });
            }
          }
        }

        // When Terminal is opened, run command from props or extract from last user message (e.g. "run npm run dev")
        if (mapped.type === ToolType.TerminalSimulator) {
          const cmd = (mapped.payload.command as string)?.trim();
          if (!cmd) {
            const userText = getLastUserMessageText(thread.messages);
            const extracted = extractCommandFromUserMessage(userText);
            if (extracted) {
              mapped = {
                type: mapped.type,
                payload: { ...mapped.payload, command: extracted },
              };
              console.log('[Tambo → Workspace] Enriched Terminal payload (command from last user message):', {
                command: extracted,
                payload: mapped.payload,
              });
            }
          }
        }

        openedMessageIds.current.add(msg.id);
        createTool(mapped.type, mapped.payload);
        console.log('[Tambo → Workspace] createTool called → tool will render with payload:', mapped.payload);
      }
    });
  }, [thread.messages, createTool]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex h-screen w-full bg-[#050505] overflow-hidden text-zinc-200 z-50"
    >
      {/* COMPACT LEFT ICON BAR */}
      <div className="w-16 flex-shrink-0 border-r border-zinc-800 flex flex-col items-center py-6 gap-6 bg-[#080808] z-20">
        <motion.div
          whileHover={{ scale: 1.1, backgroundColor: '#3b82f6' }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-2 shadow-lg cursor-pointer transition-colors"
          onClick={() => setView('home')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        </motion.div>

        <div className="h-px w-8 bg-zinc-800" />

        {Object.values(TOOL_REGISTRY).map(meta => (
          <motion.button
            key={meta.type}
            whileHover={{ scale: 1.1, color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => createTool(meta.type)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500 transition-all relative group"
            title={meta.label}
          >
            {meta.icon}
            <span className="absolute left-full ml-4 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {meta.label}
            </span>
          </motion.button>
        ))}
      </div>

      {/* CHAT INTERFACE - LEFT HALF (Tambo AI generative UI) */}
      <div className="flex-1 flex flex-col border-r border-zinc-800 bg-[#0c0c0c] relative z-10 min-w-[300px]">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">TAMBO AI</span>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpDialog(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors"
            title="How to use"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          </button>
        </div>
        <TamboChat />
      </div>

      {/* DYNAMIC WORKSPACE (TAMBO TABS) - RIGHT HALF */}
      <div className="w-[55%] flex-shrink-0 flex flex-col overflow-hidden bg-[#080808]">
        {/* TAMBO TAB BAR */}
        <div className="h-12 flex items-center bg-[#0d0d0d] border-b border-zinc-800 px-2 gap-1 overflow-x-auto no-scrollbar">
          <AnimatePresence>
            {openTools.map(tool => (
              <motion.div
                key={tool.id}
                layoutId={`tab-${tool.id}`}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center gap-2 px-4 h-9 rounded-lg cursor-pointer transition-all border shrink-0 ${activeToolId === tool.id
                    ? 'bg-zinc-900 border-zinc-700 text-white shadow-lg'
                    : 'bg-transparent border-transparent text-zinc-600 hover:bg-zinc-900/50 hover:text-zinc-400'
                  }`}
              >
                <div style={{ color: TOOL_REGISTRY[tool.type].color }} className="opacity-80">
                  {TOOL_REGISTRY[tool.type].icon}
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[120px]">
                  {tool.title}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTool(tool.id); }}
                  className="p-1 hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
                {activeToolId === tool.id && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {openTools.length === 0 && (
            <div className="flex items-center px-4 text-[10px] font-black text-zinc-800 uppercase tracking-widest">
              No Active Tools
            </div>
          )}
        </div>

        {/* WORKSPACE AREA */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {activeTool ? (
              <motion.div
                key={activeTool.id}
                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                className="flex-1 p-6 overflow-hidden flex flex-col"
              >
                <div className="flex-1 overflow-hidden shadow-2xl rounded-3xl border border-zinc-800 bg-[#111] flex flex-col">
                  <ToolRenderer tool={activeTool} createTool={createTool} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 bg-zinc-900/50 rounded-[2rem] flex items-center justify-center text-zinc-800 mb-8 border border-zinc-800/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" /><path d="M3 9h18" /><path d="M3 15h18" /></svg>
                </div>
                <h2 className="text-xl font-black text-zinc-800 uppercase tracking-[0.4em] mb-4">Workspace Empty</h2>
                <p className="text-sm text-zinc-700 max-w-xs font-semibold leading-relaxed">
                  Summon a tool via the AI console or choose one from the sidebar to begin building.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* IDE STATUS BAR */}
        <div className="h-7 bg-[#050505] border-t border-zinc-900 px-4 flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              MAIN BRANCH
            </div>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
              DEVFLOW.AI V1.0
            </div>
          </div>
          <div className="flex items-center gap-4">
            {openTools.length} ACTIVE TOOLS
            <span className="text-blue-500">AI READY</span>
          </div>
        </div>
      </div>

      {/* How to use — dialog (info icon + first-time auto-open) */}
      <AnimatePresence>
        {showHelpDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              try { localStorage.setItem(WORKSPACE_HELP_SEEN_KEY, '1'); } catch (_) {}
              setShowHelpDialog(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#111] border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">How to use DevOS</h2>
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem(WORKSPACE_HELP_SEEN_KEY, '1'); } catch (_) {}
                    setShowHelpDialog(false);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="p-6 overflow-auto max-h-[60vh] space-y-4 text-sm text-zinc-300">
                <p className="text-zinc-400">
                  This is your AI-powered workspace. You can open tools by chatting with the AI or by clicking the sidebar.
                </p>
                <ul className="space-y-3 list-none">
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold shrink-0">1.</span>
                    <span><strong className="text-zinc-200">Chat (left)</strong> — Type what you want (e.g. “test this API”, “show my logs”, “run npm run dev”). The AI will open the right tool and fill it when possible.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold shrink-0">2.</span>
                    <span><strong className="text-zinc-200">Sidebar (far left)</strong> — Click any icon to open that tool directly (API Tester, JSON Viewer, Terminal, etc.).</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold shrink-0">3.</span>
                    <span><strong className="text-zinc-200">Tabs (top right)</strong> — Each open tool has a tab. Click to switch; use the × to close.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-500 font-bold shrink-0">4.</span>
                    <span><strong className="text-zinc-200">Home</strong> — Click the house icon in the sidebar to go back to the launch screen.</span>
                  </li>
                </ul>
                <p className="text-zinc-500 text-xs pt-2">
                  Tip: paste JSON, logs, or .env content in chat and ask the AI to open the right viewer — it will load your data into the tool.
                </p>
              </div>
              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem(WORKSPACE_HELP_SEEN_KEY, '1'); } catch (_) {}
                    setShowHelpDialog(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const App: React.FC = () => {
  const { view, setView, createTool } = useWorkspaceStore();
  const handleLaunch = (toolType?: ToolType) => {
    if (toolType) createTool(toolType);
    setView('workspace');
  };

  return (
    <AnimatePresence mode="wait">
      {view === 'home' ? (
        <HomePage key="home" onEnter={handleLaunch} />
      ) : (
        <WorkspaceUI key="workspace" />
      )}
    </AnimatePresence>
  );
};

export default App;
