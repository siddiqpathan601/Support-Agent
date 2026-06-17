"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ticketsApi, chatApi } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Ticket, Calendar, User, UserCheck, ShieldAlert,
  CheckCircle, MessageSquare, Clock, RefreshCw, Send, Save, AlertTriangle
} from "lucide-react";

export default function TicketDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // 1. Fetch Ticket details
  const { data: ticket, isLoading: ticketLoading, refetch: refetchTicket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => ticketsApi.get(id),
  });

  // 2. Fetch Conversation details if conversation_id exists
  const { data: conversation, isLoading: convoLoading } = useQuery({
    queryKey: ["conversation", ticket?.conversation_id],
    queryFn: () => chatApi.getConversation(ticket.conversation_id),
    enabled: !!ticket?.conversation_id,
  });

  // 3. Update Ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: (data: any) => ticketsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", id] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const saveResolutionNotes = async () => {
    setSavingNotes(true);
    try {
      await updateTicketMutation.mutateAsync({ resolution_notes: resolutionNotes });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  if (ticketLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto opacity-50" />
        <h2 className="text-xl font-semibold text-white">Ticket not found</h2>
        <p className="text-slate-400 text-sm">The ticket with ID &ldquo;{id}&rdquo; could not be retrieved.</p>
        <Link href="/dashboard/tickets" className="btn-brand inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    open: "badge-open", pending: "badge-pending",
    resolved: "badge-resolved", closed: "badge-closed",
  };
  const priorityColors: Record<string, string> = {
    critical: "badge-critical", high: "badge-high",
    medium: "badge-medium", low: "badge-low",
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tickets" className="btn-ghost p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-mono text-slate-400 font-semibold">{ticket.id}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[ticket.status]}`}>
                {ticket.status}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${priorityColors[ticket.priority]}`}>
                {ticket.priority} priority
              </span>
            </div>
            <p className="text-white text-lg font-semibold mt-1">{ticket.title}</p>
          </div>
        </div>
        <button onClick={() => { refetchTicket(); }} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column — Ticket Information */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass p-5 space-y-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider border-b border-white/5 pb-2">Ticket Info</h2>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-slate-200 capitalize font-medium">{ticket.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned To:</span>
                <span className="text-slate-200 font-medium">{ticket.assigned_to || "Unassigned"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created At:</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Updated:</span>
                <span className="text-slate-200 font-medium">
                  {new Date(ticket.updated_at).toLocaleString()}
                </span>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolved At:</span>
                  <span className="text-slate-200 font-medium text-green-400">
                    {new Date(ticket.resolved_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Change Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => updateTicketMutation.mutate({ status: e.target.value })}
                  className="input w-full text-sm py-1.5"
                >
                  {["open", "pending", "resolved", "closed"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Change Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => updateTicketMutation.mutate({ priority: e.target.value })}
                  className="input w-full text-sm py-1.5"
                >
                  {["low", "medium", "high", "critical"].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Escalation Reason */}
          {ticket.escalation_reason && (
            <div className="glass p-5 bg-orange-500/5 border-orange-500/20 space-y-3">
              <div className="flex items-center gap-2 text-orange-400">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Escalation Reason</h3>
              </div>
              <p className="text-sm text-slate-300 bg-surface-2 p-3 rounded-lg border border-white/5 leading-relaxed font-mono">
                {ticket.escalation_reason}
              </p>
            </div>
          )}

          {/* Resolution Notes */}
          <div className="glass p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Resolution Notes</h2>
              <CheckCircle className="w-4 h-4 text-slate-400" />
            </div>
            
            <textarea
              value={resolutionNotes || ticket.resolution_notes || ""}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Record steps taken to resolve this ticket..."
              className="input w-full text-sm h-32 resize-none"
            />
            
            <button
              onClick={saveResolutionNotes}
              disabled={savingNotes}
              className="btn-brand w-full flex items-center justify-center gap-2 text-xs py-2"
            >
              <Save className="w-3.5 h-3.5" />
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>

        {/* Right column — Conversation Context */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-5 flex flex-col h-[650px]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <MessageSquare className="w-5 h-5 text-brand-400" />
              <div>
                <h2 className="text-sm font-semibold text-white">Conversation Transcript</h2>
                <p className="text-xs text-slate-400">Context of the support session leading to escalation</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 px-2">
              {convoLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !conversation || conversation.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                  <MessageSquare className="w-8 h-8 opacity-30 animate-pulse" />
                  <p>No conversation transcript available</p>
                </div>
              ) : (
                conversation.messages.map((m: any) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "customer" ? "justify-end" : m.sender === "system" ? "justify-center" : "justify-start"}`}
                  >
                    <div className={
                      m.sender === "customer" ? "bubble-user" :
                      m.sender === "system" ? "bubble-system" : "bubble-agent"
                    }>
                      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-1 mb-1 opacity-60 text-[10px]">
                        <span className="font-semibold capitalize">
                          {m.sender === "customer" ? "Customer" : m.sender === "support_staff" ? "Support Agent" : "AI Agent"}
                        </span>
                        <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      {m.intent && (
                        <div className="mt-1 flex items-center gap-1.5 opacity-60 text-[10px] font-mono">
                          <span className="capitalize">Intent: {m.intent}</span>
                          {m.confidence && <span>({Math.round(m.confidence * 100)}% conf)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-white/5 pt-3 text-center">
              <span className="text-xs text-slate-500">
                Tickets are managed internally. Customers are notified of resolution status via email.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
