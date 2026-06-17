"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import { Ticket, Filter, ChevronDown, RefreshCw } from "lucide-react";

export default function TicketsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["tickets", statusFilter, priorityFilter],
    queryFn: () => ticketsApi.list({ status: statusFilter || undefined, priority: priorityFilter || undefined }),
    refetchInterval: 30000,
  });

  const updateTicket = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => ticketsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });

  const statusColors: Record<string, string> = {
    open: "badge-open", pending: "badge-pending",
    resolved: "badge-resolved", closed: "badge-closed",
  };
  const priorityColors: Record<string, string> = {
    critical: "badge-critical", high: "badge-high",
    medium: "badge-medium", low: "badge-low",
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tickets</h1>
          <p className="text-slate-400 text-sm mt-1">{tickets.length} tickets</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {[
          { label: "Status", value: statusFilter, onChange: setStatusFilter, opts: ["", "open", "pending", "resolved", "closed"] },
          { label: "Priority", value: priorityFilter, onChange: setPriorityFilter, opts: ["", "critical", "high", "medium", "low"] },
        ].map(({ label, value, onChange, opts }) => (
          <select key={label} value={value} onChange={(e) => onChange(e.target.value)}
            className="input text-sm pr-8">
            <option value="">All {label}s</option>
            {opts.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Ticket className="w-10 h-10 mb-3 opacity-30" />
            <p>No tickets found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Ticket ID", "Title", "Category", "Priority", "Status", "Created", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    <Link href={`/dashboard/tickets/${t.id}`} className="hover:text-brand-400 hover:underline">
                      {t.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white max-w-[200px] truncate font-medium">
                    <Link href={`/dashboard/tickets/${t.id}`} className="hover:text-brand-400 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><span className={`badge badge-${t.category}`}>{t.category}</span></td>
                  <td className="px-4 py-3"><span className={priorityColors[t.priority] || "badge"}>{t.priority}</span></td>
                  <td className="px-4 py-3"><span className={statusColors[t.status] || "badge"}>{t.status}</span></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={t.status}
                      onChange={(e) => updateTicket.mutate({ id: t.id, data: { status: e.target.value } })}
                      className="text-xs bg-surface-3 border border-white/10 rounded px-2 py-1 text-slate-300"
                    >
                      {["open", "pending", "resolved", "closed"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
