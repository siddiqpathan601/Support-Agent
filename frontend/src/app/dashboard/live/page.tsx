"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { useEffect } from "react";
import { joinSupportRoom, getSocket } from "@/lib/socket";
import { MessageSquare, AlertCircle, Clock, User } from "lucide-react";

export default function LivePage() {
  const { data: conversations = [], refetch } = useQuery({
    queryKey: ["live-conversations"],
    queryFn: dashboardApi.liveConversations,
    refetchInterval: 10000,
  });

  useEffect(() => {
    joinSupportRoom();
    const socket = getSocket();
    socket.on("escalation_alert", (data: any) => {
      refetch();
    });
    return () => { socket.off("escalation_alert"); };
  }, [refetch]);

  const sentimentIcon = (score?: number) => {
    if (!score) return "😐";
    if (score < -0.5) return "😡";
    if (score < -0.2) return "😤";
    if (score > 0.3) return "😊";
    return "😐";
  };

  const sentimentColor = (score?: number) => {
    if (!score) return "text-slate-400";
    if (score < -0.5) return "text-red-400";
    if (score < -0.2) return "text-orange-400";
    return "text-green-400";
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Live Conversations</h1>
          <p className="text-slate-400 text-sm mt-1">
            {conversations.filter((c: any) => c.status === "escalated").length} escalated ·{" "}
            {conversations.filter((c: any) => c.status === "active").length} active
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-20 text-slate-500">
          <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
          <p>No active conversations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {conversations.map((c: any) => (
            <div key={c.id} className={`glass p-4 space-y-3 hover:border-brand-500/30 transition-all duration-200 ${c.status === "escalated" ? "border-orange-500/30" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-slate-400">{c.user_id?.slice(0, 12)}...</p>
                    <span className={`badge ${c.status === "escalated" ? "badge-critical" : "badge-open"} text-xs`}>
                      {c.status}
                    </span>
                  </div>
                </div>
                <span className={`text-lg ${sentimentColor(c.sentiment_score)}`}>
                  {sentimentIcon(c.sentiment_score)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {c.message_count} messages
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(c.updated_at).toLocaleTimeString()}
                </div>
              </div>

              {c.status === "escalated" && (
                <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 rounded-lg px-2 py-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Requires human attention
                </div>
              )}

              <button
                className="w-full text-xs btn-brand py-1.5"
                onClick={() => {
                  const { takeoverConversation } = require("@/lib/socket");
                  takeoverConversation(c.id);
                }}
              >
                Take Over
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
