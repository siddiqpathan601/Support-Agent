"use client";

import { useQuery } from "@tanstack/react-query";
import { knowledgeApi, dashboardApi } from "@/lib/api";
import { useState, useRef } from "react";
import { Upload, FileText, Database, Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: kbStats, refetch: refetchStats } = useQuery({
    queryKey: ["kb-stats"],
    queryFn: knowledgeApi.stats,
    refetchInterval: 30000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["metrics-admin"],
    queryFn: dashboardApi.metrics,
    refetchInterval: 30000,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);
    try {
      const result = await knowledgeApi.upload(file);
      setUploadStatus({
        type: "success",
        message: `✅ "${file.name}" indexed with ${result.chunks_indexed} chunks`,
      });
      refetchStats();
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: err.response?.data?.detail || "Upload failed",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear the entire knowledge base? This cannot be undone.")) return;
    try {
      await knowledgeApi.clear();
      setUploadStatus({ type: "success", message: "Knowledge base cleared" });
      refetchStats();
    } catch {
      setUploadStatus({ type: "error", message: "Failed to clear KB" });
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin Panel</h1>
        <p className="text-slate-400 text-sm mt-1">Knowledge base management & system overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KB Upload */}
        <div className="glass p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Knowledge Base</h2>
            {kbStats && (
              <span className="ml-auto text-xs text-slate-500">
                {kbStats.total_chunks} chunks indexed
              </span>
            )}
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-brand-500/40 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200 hover:bg-brand-500/5"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-slate-500" />
            )}
            <div className="text-center">
              <p className="text-sm text-slate-300">
                {uploading ? "Uploading & indexing..." : "Click to upload document"}
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, Markdown · Max 10MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>

          {uploadStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              uploadStatus.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {uploadStatus.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {uploadStatus.message}
            </div>
          )}

          {kbStats && (
            <div className="bg-surface-2 rounded-lg p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Backend</span>
                <span className="text-slate-300">{kbStats.backend}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="text-green-400">{kbStats.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total chunks</span>
                <span className="text-slate-300">{kbStats.total_chunks}</span>
              </div>
            </div>
          )}

          <button onClick={handleClear} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear Knowledge Base
          </button>
        </div>

        {/* System metrics */}
        <div className="glass p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">System Performance</h2>
          </div>

          {metrics ? (
            <div className="space-y-3">
              {[
                { label: "AI Success Rate", value: `${Math.round(metrics.ai_success_rate * 100)}%`, good: metrics.ai_success_rate > 0.8 },
                { label: "Escalation Rate", value: `${Math.round(metrics.escalation_rate * 100)}%`, good: metrics.escalation_rate < 0.2 },
                { label: "Avg Resolution Time", value: `${metrics.avg_resolution_time_minutes}m`, good: metrics.avg_resolution_time_minutes < 60 },
                { label: "Total Conversations", value: metrics.total_conversations },
                { label: "Open Tickets", value: metrics.open_tickets },
              ].map(({ label, value, good }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className={`text-sm font-medium ${good === undefined ? "text-white" : good ? "text-green-400" : "text-orange-400"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-2 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
