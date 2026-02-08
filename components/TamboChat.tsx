import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTamboThread,
  useTamboThreadInput,
  GenerationStage,
} from '@tambo-ai/react';
import { tamboComponentToLabel } from '../services/tamboToWorkspace';
import octoSight from '../assets/Octo-Sight.avif';

function getMessageText(content: unknown): string {
  if (!Array.isArray(content)) return String(content ?? '');
  return (content as Array<{ type?: string; text?: string }>)
    .map((part) => (part?.type === 'text' && part?.text ? part.text : ''))
    .join('\n')
    .trim();
}

function MessageContent({ content }: { content: Array<{ type?: string; text?: string }> }) {
  if (!Array.isArray(content)) return <p className="text-zinc-400">{String(content)}</p>;
  return (
    <>
      {content.map((part, i) =>
        part.type === 'text' && part.text ? (
          <p key={i} className="whitespace-pre-wrap break-words">
            {part.text}
          </p>
        ) : null
      )}
    </>
  );
}

function MessageActions({
  messageText,
  onEdit,
  isUser,
}: {
  messageText: string;
  onEdit: () => void;
  isUser: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={`flex items-center gap-1 mt-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied' : 'Copy'}
          className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded border border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/50 transition-colors"
        >
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="text-zinc-500 hover:text-blue-400 p-1.5 rounded border border-zinc-700/50 hover:border-blue-500/50 bg-zinc-800/50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function TamboChat() {
  const { thread, generationStage, generationStatusMessage, isIdle } = useTamboThread();
  const { value, setValue, submit, isPending } = useTamboThreadInput();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isPending) return;
    submit();
    setValue('');
  };

  const stageLabel =
    generationStage === GenerationStage.CHOOSING_COMPONENT
      ? 'Choosing component...'
      : generationStage === GenerationStage.FETCHING_CONTEXT
        ? 'Fetching context...'
        : generationStage === GenerationStage.HYDRATING_COMPONENT
          ? 'Building UI...'
          : generationStage === GenerationStage.STREAMING_RESPONSE
            ? 'Streaming...'
            : generationStatusMessage || null;

  const isEmpty = thread.messages.length === 0;
  const isWorking = !isIdle || isPending;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6 space-y-6 relative">
        {/* Empty state: show Octo-Sight when chat has no messages */}
        {isEmpty && !isWorking && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            <div className="mb-6" style={{ filter: 'invert(1) brightness(1.1)'}}>
              <img
                src={octoSight}
                alt=""
                className="w-32 h-32 object-contain opacity-90"
              />
            </div>
            <p className="text-sm text-zinc-500 text-center max-w-xs font-medium">
              Ask me to test an API, build a chart, open a tool, or generate code.
            </p>
          </motion.div>
        )}

        {/* Loading state: assistant working — big Octo-Sight when empty, compact when there are messages */}
        {isWorking && isEmpty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            <div className="mb-4" style={{ filter: 'invert(1) brightness(1.1)', backgroundColor: '#eeeeee', borderRadius: '10px' }}>
              <img
                src={octoSight}
                alt=""
                className="w-28 h-28 object-contain opacity-80 animate-pulse filter invert-100 brightness(1.1)"
                style={{ backgroundColor: '#eeeeee', borderRadius: '10px' , filter: 'invert(1) brightness(1.1)' }}
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ filter: 'invert(1)' }}
                className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full"
              />
              {stageLabel || (isPending ? 'Sending...' : 'Thinking...')}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {thread.messages.map((message) => {
            const messageText = getMessageText(message.content);
            const isUser = message.role === 'user';
            const handleEdit = () => {
              setValue(messageText);
              inputRef.current?.focus();
            };
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-xl ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : message.role === 'system'
                        ? 'bg-zinc-800/20 text-zinc-500 italic text-[11px] border-none'
                        : 'bg-zinc-900 text-zinc-300 border border-zinc-800/50 rounded-tl-none'
                  }`}
                >
                  <MessageContent content={message.content as Array<{ type?: string; text?: string }>} />
                </div>
                {messageText && (
                  <MessageActions
                    messageText={messageText}
                    onEdit={handleEdit}
                    isUser={isUser}
                  />
                )}
                {(message as { component?: { componentName?: string | null } }).component?.componentName && (
                  <div className="mt-2 text-[11px] text-zinc-500 italic">
                    → Opened {tamboComponentToLabel((message as { component: { componentName: string } }).component.componentName)} in workspace
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {stageLabel && !isIdle && thread.messages.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <img src={octoSight} alt="" className="w-8 h-8 object-contain opacity-70 animate-pulse filter invert-100 brightness(1.1)" style={{ backgroundColor: '#eeeeee', borderRadius: '10px' }} />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full shrink-0"
            />
            {stageLabel}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 border-t border-zinc-800 bg-[#0a0a0a]">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={(el) => { inputRef.current = el; }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask Tambo to build a chart, table, code, or any tool..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-5 pr-12 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={isPending || !value.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
