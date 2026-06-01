import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, AlertCircle, Loader, Trash2 } from 'lucide-react';
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

export default function ChatInterface({ birthDetails }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

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
  };

  return (
    <div className="flex flex-col h-[550px] w-full max-w-2xl glassmorphism rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

      {/* Header */}
      <div className="px-6 py-4 bg-cosmic-900/60 border-b border-purple-500/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cosmic-600 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-cosmic-950" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 tracking-wide text-sm md:text-base">
              Aradhana
            </h2>
            <p className="text-[10px] md:text-xs text-purple-400 font-light tracking-widest uppercase">
              Cosmic AI Companion
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="clear-conversation"
            onClick={handleClear}
            className="text-slate-500 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-emerald-400 font-medium font-mono">
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm md:text-base transition-all duration-300 ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cosmic-600 to-purple-600 text-white rounded-br-none shadow-md shadow-purple-900/20 border border-purple-400/20'
                    : 'bg-cosmic-900/80 text-slate-100 rounded-bl-none border border-purple-900/40'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>
                <div
                  className={`text-[9px] mt-1.5 font-light tracking-wide ${
                    msg.sender === 'user' ? 'text-purple-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            {/* Tool activity panel for agent messages */}
            {msg.sender === 'agent' && msg.toolCalls && (
              <div className="ml-0 mt-1">
                <ToolActivityPanel toolCalls={msg.toolCalls} />
              </div>
            )}
          </div>
        ))}

        {/* Streaming content */}
        {(isLoading || streamingContent) && (
          <div>
            {/* Show tool calls as they arrive */}
            {streamingToolCalls.length > 0 && (
              <div className="mb-2">
                <ToolActivityPanel toolCalls={streamingToolCalls} />
              </div>
            )}

            <div className="flex justify-start">
              <div className="max-w-[85%] bg-cosmic-900/80 border border-purple-900/40 rounded-2xl rounded-bl-none px-4 py-3">
                {streamingContent ? (
                  <div className="text-sm md:text-base text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-text-bottom" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 animate-pulse">
                    <Loader className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-xs text-purple-300 font-mono tracking-widest uppercase">
                      Consulting the stars...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center p-2">
            <div className="flex items-center gap-2 text-rose-400 bg-rose-950/30 border border-rose-500/20 rounded-xl px-4 py-2 text-xs">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-cosmic-950/80 border-t border-purple-500/10 flex gap-2 items-center"
      >
        <input
          id="chat-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Aradhana about your chart, today's energy, or astrology..."
          className="flex-1 bg-cosmic-900/50 hover:bg-cosmic-900/80 focus:bg-cosmic-900 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-none transition-all duration-200"
          disabled={isLoading}
        />
        <button
          id="send-message"
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3.5 rounded-xl shadow-lg hover:shadow-purple-500/10 transition-all duration-300 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
