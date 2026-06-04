import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, AlertCircle, Loader, Trash2, Moon } from 'lucide-react';
import { streamChat, type ToolCallEvent, type BirthDetails } from '../services/api';
import ToolActivityPanel from './ToolActivityPanel';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string; // ISO string for serialization
  toolCalls?: ToolCallEvent[];
}

interface ChatInterfaceProps {
  birthDetails: BirthDetails | null;
  onChartComputed?: (chart: any) => void;
  onTransitsComputed?: (transits: any) => void;
}

const STORAGE_KEY = 'astroagent_conversation';

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Message[];
    }
  } catch {
    // corrupted data
  }
  return [
    {
      id: 'welcome',
      sender: 'agent',
      content:
        "Namaste, seeker of the stars ✨ I am Aradhana, your astrology companion. Ask me about your birth chart, today's cosmic energy, or any astrology question.",
      timestamp: new Date().toISOString(),
    },
  ];
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full — silently fail
  }
}

export default function ChatInterface({ birthDetails, onChartComputed, onTransitsComputed }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync historical chart/transits to dashboard on mount
  useEffect(() => {
    messages.forEach((m) => {
      m.toolCalls?.forEach((tc) => {
        if (tc.name === 'compute_birth_chart' && tc.output?.chart) {
          onChartComputed?.(tc.output.chart);
        }
        if (tc.name === 'get_daily_transits' && tc.output) {
          onTransitsComputed?.(tc.output);
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist on every message change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, streamingContent, scrollToBottom]);

  // Build conversation history for the API (exclude welcome msg)
  const buildHistory = useCallback((): { role: string; content: string }[] => {
    return messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      sender: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    setStreamingContent('');
    setStreamingToolCalls([]);

    const history = buildHistory();

    await streamChat(
      trimmed,
      birthDetails,
      history,
      // onToolCall
      (tool: ToolCallEvent) => {
        setStreamingToolCalls((prev) => [...prev, tool]);
        if (tool.name === 'compute_birth_chart' && tool.output?.chart) {
          onChartComputed?.(tool.output.chart);
        }
        if (tool.name === 'get_daily_transits' && tool.output) {
          onTransitsComputed?.(tool.output);
        }
      },
      // onToken
      (token: string) => {
        setStreamingContent((prev) => prev + token);
      },
      // onDone
      () => {
        // Finalize: move streaming content into a real message
        setStreamingContent((current) => {
          setStreamingToolCalls((tools) => {
            const agentMsg: Message = {
              id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
              sender: 'agent',
              content: current,
              timestamp: new Date().toISOString(),
              toolCalls: tools.length > 0 ? tools : undefined,
            };
            setMessages((prev) => [...prev, agentMsg]);
            return [];
          });
          return '';
        });
        setIsLoading(false);
      },
      // onError
      (err: string) => {
        setError(err);
        setIsLoading(false);
        setStreamingContent('');
        setStreamingToolCalls([]);
      }
    );
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        content:
          "Namaste, seeker of the stars ✨ I am Aradhana, your astrology companion. Ask me about your birth chart, today's cosmic energy, or any astrology question.",
        timestamp: new Date().toISOString(),
      },
    ]);
    setStreamingContent('');
    setStreamingToolCalls([]);
    setError(null);
    onChartComputed?.(null);
    onTransitsComputed?.(null);
  };

  return (
    <div className="flex flex-col h-[580px] w-full glassmorphism rounded-2xl overflow-hidden shadow-xl relative border border-slate-800/60">
      {/* Top Header */}
      <div className="px-6 py-4 bg-slate-900/35 border-b border-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-slate-950 border border-amber-500/20 flex items-center justify-center shadow-md">
              <Sparkles className="w-4.5 h-4.5 text-amber-200/90 animate-pulse" />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#090520]" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200 tracking-wide text-sm">
              Aradhana
            </h2>
            <p className="text-[9px] text-amber-200/80 font-mono tracking-widest uppercase">
              Astrology Companion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="clear-conversation"
            onClick={handleClear}
            className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all p-2 rounded-lg"
            title="Reset conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.map((msg) => (
          <div key={msg.id} className="w-full">
            {msg.sender === 'user' ? (
              /* User message: Aligned right, rounded purple gradient */
              <div className="animate-message flex justify-end w-full">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-500/20 text-white px-4 py-3 text-sm shadow-md">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  <div className="text-[8px] mt-1.5 text-indigo-200 text-right font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Agent message: Aligned left, rounded dark card with Avatar */
              <div className="animate-message flex justify-start items-start w-full">
                {/* Custom Avatar */}
                <div className="w-8 h-8 rounded-full bg-slate-950 border border-amber-500/20 text-amber-200/80 flex items-center justify-center mr-2.5 flex-shrink-0 shadow-sm mt-0.5">
                  <Moon className="w-3.5 h-3.5 fill-current text-amber-200/30" />
                </div>
                <div className="flex-1 max-w-[80%]">
                  <div className="rounded-2xl rounded-tl-sm bg-slate-900/40 border border-slate-800/80 text-slate-200 px-4 py-3 text-sm shadow-md">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                    <div className="text-[8px] mt-1.5 text-slate-500 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {/* Tool logs linked under bubble */}
                  {msg.toolCalls && (
                    <div className="mt-1 ml-0.5">
                      <ToolActivityPanel toolCalls={msg.toolCalls} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming & Tool Logs Indicators */}
        {(isLoading || streamingContent) && (
          <div className="w-full space-y-2">
            {streamingToolCalls.length > 0 && (
              <div className="w-full flex justify-start items-start">
                <div className="w-8 h-8 flex-shrink-0 mr-2.5" /> {/* alignment spacer */}
                <div className="flex-1 max-w-[80%]">
                  <ToolActivityPanel toolCalls={streamingToolCalls} />
                </div>
              </div>
            )}

            <div className="animate-message flex justify-start items-start w-full">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-amber-500/20 text-amber-200/80 flex items-center justify-center mr-2.5 flex-shrink-0 shadow-sm mt-0.5">
                <Loader className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              </div>
              <div className="max-w-[80%]">
                <div className="rounded-2xl rounded-tl-sm bg-slate-900/40 border border-slate-800/80 px-4 py-3 shadow-md">
                  {streamingContent ? (
                    <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {streamingContent}
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse ml-1 align-middle" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-light tracking-wide">
                        Consulting the celestial positions...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center p-2">
            <div className="flex items-center gap-2 text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-xl px-4 py-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form pill wrapper */}
      <div className="p-4 bg-slate-900/30 border-t border-slate-900/60">
        <form
          onSubmit={handleSubmit}
          className="bg-slate-950/70 border border-slate-800/80 focus-within:border-indigo-500/40 rounded-xl p-1.5 flex items-center shadow-lg transition-all duration-300"
        >
          <input
            id="chat-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your natal chart placements, daily transits..."
            className="flex-1 bg-transparent border-none outline-none px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500"
            disabled={isLoading}
          />
          <button
            id="send-message"
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-20 disabled:cursor-not-allowed text-white p-2.5 rounded-lg shadow-md hover:shadow-indigo-500/10 transition-all flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
