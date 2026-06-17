"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { chatApi } from "@/lib/api";
import { joinConversation, sendTyping, getSocket } from "@/lib/socket";
import {
  Send, Bot, User, AlertTriangle, CheckCircle, Ticket,
  ChevronRight, LogOut, Sparkles, Loader2, Wifi
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  intent?: string;
  confidence?: number;
  timestamp: Date;
}

interface ChatMeta {
  conversation_id?: string;
  intent?: string;
  confidence?: number;
  sentiment?: string;
  escalated?: boolean;
  ticket_id?: string;
  suggested_replies?: string[];
}

export default function ChatPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      content: "Hi! I'm your AI support assistant. I can help resolve most issues instantly. What can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [meta, setMeta] = useState<ChatMeta>({});
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  // Join Socket.IO room when conversation starts
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
      const socket = getSocket();
      socket.on("new_message", (data: any) => {
        if (data.sender === "support_staff") {
          addMessage("agent", `[Support Staff]: ${data.content}`);
        }
      });
      socket.on("agent_takeover", (data: any) => {
        addMessage("system", "✅ A support specialist has joined and will assist you now.");
      });
    }
  }, [conversationId]);

  const addMessage = (role: Message["role"], content: string, extra?: Partial<Message>) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date(), ...extra },
    ]);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (conversationId) {
      sendTyping(conversationId, true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => sendTyping(conversationId, false), 1500);
    }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    setInput("");
    setLoading(true);
    addMessage("user", messageText);

    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

    // Stream via SSE
    try {
      setStreaming(true);
      setStreamContent("");

      const token = localStorage.getItem("support_token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageText, conversation_id: conversationId, history }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              fullContent += data.token;
              setStreamContent(fullContent);
            } else if (data.done) {
              setStreamContent("");
              addMessage("agent", fullContent, {
                intent: data.intent,
                confidence: data.confidence,
              });
              if (data.conversation_id && !conversationId) {
                setConversationId(data.conversation_id);
              }
              setMeta({
                conversation_id: data.conversation_id || conversationId,
                intent: data.intent,
                confidence: data.confidence,
                escalated: data.escalated,
                ticket_id: data.ticket_id,
                suggested_replies: data.suggested_replies || [],
              });
              if (data.escalated) {
                addMessage("system", `🎫 Ticket created: ${data.ticket_id}. A specialist will follow up shortly.`);
              }
            } else if (data.error) {
              addMessage("system", `❌ Error: ${data.error}`);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      // Fallback to sync
      try {
        const data = await chatApi.send(messageText, conversationId, history);
        addMessage("agent", data.response, { intent: data.intent, confidence: data.confidence });
        if (!conversationId && data.conversation_id) setConversationId(data.conversation_id);
        setMeta(data);
      } catch {
        addMessage("system", "❌ Failed to connect to support. Please try again.");
      }
    } finally {
      setStreaming(false);
      setLoading(false);
      setStreamContent("");
      inputRef.current?.focus();
    }
  }, [input, loading, messages, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getSentimentColor = (s?: string) =>
    ({ angry: "text-red-400", frustrated: "text-orange-400", happy: "text-green-400" }[s || ""] || "text-slate-400");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500/20 border border-brand-500/30 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">SupportAI</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">AI Agent Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {meta.intent && (
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-2 text-xs">
              <Sparkles className="w-3 h-3 text-brand-400" />
              <span className="text-slate-300 capitalize">{meta.intent}</span>
              {meta.confidence && (
                <span className="text-slate-500">{Math.round(meta.confidence * 100)}%</span>
              )}
            </div>
          )}
          <span className="text-sm text-slate-400">{user?.full_name}</span>
          <button onClick={() => { logout(); router.push("/login"); }}
            className="btn-ghost p-2">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-4 gap-3 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex animate-slide-up ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
            {msg.role === "agent" && (
              <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot className="w-3.5 h-3.5 text-brand-400" />
              </div>
            )}
            <div className={
              msg.role === "user" ? "bubble-user" :
              msg.role === "system" ? "bubble-system" : "bubble-agent"
            }>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.intent && (
                <div className="mt-1.5 flex items-center gap-1.5 opacity-60">
                  <span className="text-xs capitalize">{msg.intent}</span>
                  {msg.confidence && (
                    <span className="text-xs">· {Math.round(msg.confidence * 100)}%</span>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 bg-surface-3 rounded-lg flex items-center justify-center ml-2 mt-1 shrink-0">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && streamContent && (
          <div className="flex justify-start animate-slide-up">
            <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center mr-2 mt-1 shrink-0">
              <Bot className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="bubble-agent">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{streamContent}<span className="inline-block w-0.5 h-4 bg-brand-400 animate-pulse ml-0.5 align-text-bottom" /></p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && !streamContent && (
          <div className="flex justify-start">
            <div className="w-7 h-7 bg-brand-500/20 border border-brand-500/30 rounded-lg flex items-center justify-center mr-2 shrink-0">
              <Bot className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="bubble-agent flex items-center gap-1 py-4">
              <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
              <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
              <div className="typing-dot w-2 h-2 bg-slate-400 rounded-full" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Suggested replies */}
      {meta.suggested_replies && meta.suggested_replies.length > 0 && !loading && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-2 flex gap-2 flex-wrap">
          {meta.suggested_replies.map((reply, i) => (
            <button
              key={i}
              onClick={() => sendMessage(reply)}
              className="text-xs px-3 py-1.5 rounded-full bg-surface-2 hover:bg-brand-500/20 border border-white/10 hover:border-brand-500/40 text-slate-300 hover:text-white transition-all duration-150"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <footer className="glass border-t border-white/5 px-4 py-3 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={input}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Describe your issue..."
            disabled={loading}
            className="input flex-1"
          />
          <button
            id="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-brand px-3 py-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {meta.escalated && meta.ticket_id && (
          <div className="max-w-3xl mx-auto mt-2 flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Escalated to support team · Ticket: <strong>{meta.ticket_id}</strong></span>
          </div>
        )}
      </footer>
    </div>
  );
}
