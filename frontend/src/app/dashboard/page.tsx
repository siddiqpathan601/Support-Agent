"use client";

import { useQuery } from "@tanstack/react-query";
import { ticketsApi, dashboardApi } from "@/lib/api";
import Link from "next/link";
import { Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Users, Zap, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#6579f8", "#a78bfa", "#38bdf8", "#34d399", "#fb923c", "#f87171"];

export default function DashboardPage() {
  const { data: metrics } = useQuery({ queryKey: ["metrics"], queryFn: dashboardApi.metrics, refetchInterval: 30000 });
  const { data: intents } = useQuery({ queryKey: ["intents"], queryFn: () => dashboardApi.intentDistribution(7) });
  const { data: recentTickets } = useQuery({ queryKey: ["recent-tickets"], queryFn: dashboardApi.recentTickets, refetchInterval: 15000 });
  const { data: ticketStats } = useQuery({ queryKey: ["ticket-stats"], queryFn: ticketsApi.stats, refetchInterval: 15000 });

  const metricCards = [
    { label: "Tickets Today", value: metrics?.tickets_today ?? "—", icon: Ticket, color: "text-brand-400" },
    { label: "Open Tickets", value: metrics?.open_tickets ?? "—", icon: AlertTriangle, color: "text-orange-400" },
    { label: "Resolved", value: metrics?.resolved_tickets ?? "—", icon: CheckCircle, color: "text-green-400" },
    { label: "AI Success Rate", value: metrics ? `${Math.round(metrics.ai_success_rate * 100)}%` : "—", icon: Zap, color: "text-purple-400" },
    { label: "Escalation Rate", value: metrics ? `${Math.round(metrics.escalation_rate * 100)}%` : "—", icon: TrendingUp, color: "text-yellow-400" },
    { label: "Avg Resolution", value: metrics ? `${metrics.avg_resolution_time_minutes}m` : "—", icon: Clock, color: "text-sky-400" },
  ];

  const statusData = ticketStats ? [
    { name: "Open", value: ticketStats.open || 0 },
    { name: "Pending", value: ticketStats.pending || 0 },
    { name: "Resolved", value: ticketStats.resolved || 0 },
    { name: "Closed", value: ticketStats.closed || 0 },
  ] : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Support Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time support intelligence dashboard</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="metric-card">
            <Icon className={`w-4 h-4 ${color}`} />
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intent Distribution */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Intent Distribution (7 days)</h2>
          </div>
          {intents && intents.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={intents} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="intent" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1e1e35", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" fill="#6579f8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              No intent data yet — start chatting!
            </div>
          )}
        </div>

        {/* Ticket Status Pie */}
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Ticket Status</h2>
          </div>
          {statusData.some(d => d.value > 0) ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e1e35", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-slate-400">{d.name}</span>
                    <span className="text-white font-medium ml-auto pl-4">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-slate-500 text-sm">
              No tickets yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Tickets</h2>
        {recentTickets && recentTickets.length > 0 ? (
          <div className="space-y-2">
            {recentTickets.map((t: any) => (
              <Link key={t.id} href={`/dashboard/tickets/${t.id}`} className="flex items-center gap-4 p-3 rounded-lg bg-surface-2/50 hover:bg-surface-2 hover:border-brand-500/30 border border-transparent transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{t.id}</p>
                </div>
                <span className={`badge badge-${t.category}`}>{t.category}</span>
                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                <span className={`badge badge-${t.status}`}>{t.status}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-8">No tickets created yet</p>
        )}
      </div>
    </div>
  );
}
