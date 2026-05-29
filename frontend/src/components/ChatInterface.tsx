import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, Loader } from 'lucide-react';
import { sendChatMessage } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      content: "Welcome, seeker of the stars. I am AstroAgent. How can I guide you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading) return;

    const userMessageId = Math.random().toString(36).substring(7);
    const userMsg: Message = {
      id: userMessageId,
      sender: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(trimmedMessage);
      
      const agentMessageId = Math.random().toString(36).substring(7);
      const agentMsg: Message = {
        id: agentMessageId,
        sender: 'agent',
        content: response.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error(err);
      setError('Failed to connect to the celestial backend. Is the server running?');
    } finally {
      setIsLoading(false);
    }
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
            <h2 className="font-semibold text-slate-100 tracking-wide text-sm md:text-base">AstroAgent</h2>
            <p className="text-[10px] md:text-xs text-purple-400 font-light tracking-widest uppercase">Cosmic AI System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs text-emerald-400 font-medium font-mono">ONLINE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm md:text-base transition-all duration-300 ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-cosmic-600 to-purple-600 text-white rounded-br-none shadow-md shadow-purple-900/20 border border-purple-400/20'
                  : 'bg-cosmic-900/80 text-slate-100 rounded-bl-none border border-purple-900/40'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              <div
                className={`text-[9px] mt-1.5 font-light tracking-wide ${
                  msg.sender === 'user' ? 'text-purple-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-cosmic-900/80 border border-purple-900/40 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-3 animate-pulse">
              <Loader className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-xs text-purple-300 font-mono tracking-widest uppercase">Consulting stars...</span>
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
      <form onSubmit={handleSubmit} className="p-4 bg-cosmic-950/80 border-t border-purple-500/10 flex gap-2 items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Transmit a query to the celestial realm..."
          className="flex-1 bg-cosmic-900/50 hover:bg-cosmic-900/80 focus:bg-cosmic-900 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-none transition-all duration-200"
          disabled={isLoading}
        />
        <button
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
