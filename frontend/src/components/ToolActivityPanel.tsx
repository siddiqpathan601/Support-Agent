import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench, Clock, AlertTriangle, Check } from 'lucide-react';
import type { ToolCallEvent } from '../services/api';

interface ToolActivityPanelProps {
  toolCalls: ToolCallEvent[];
}

export default function ToolActivityPanel({ toolCalls }: ToolActivityPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls.length === 0) return null;

  return (
    <div className="w-full mt-1 mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-amber-200/70 hover:text-amber-100 hover:underline font-mono tracking-wider transition-colors"
      >
        <Wrench className="w-3 h-3 text-indigo-400" />
        <span>{toolCalls.length} internal computation{toolCalls.length > 1 ? 's' : ''} logged</span>
        {expanded
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        }
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-message">
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="bg-slate-950/60 border border-slate-900/60 rounded-xl px-3.5 py-2.5 text-xs font-mono"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-900/40 pb-1.5">
                <div className="flex items-center gap-1.5">
                  {tc.error
                    ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    : <Check className="w-3.5 h-3.5 text-emerald-400" />
                  }
                  <span className="font-semibold text-slate-200">
                    {tc.name || 'unknown_tool'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{Math.round(tc.ms)}ms</span>
                </div>
              </div>

              {/* Input params */}
              {tc.input && Object.keys(tc.input).length > 0 && (
                <div className="mb-1 text-slate-500 text-[10px]">
                  <span className="text-slate-600">Parameters:</span>{' '}
                  <span className="text-slate-400">
                    {Object.entries(tc.input).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </span>
                </div>
              )}

              {/* Output summary */}
              <div className="text-[10px]">
                <span className="text-slate-600">Output:</span>{' '}
                <span className={tc.error ? 'text-rose-400' : 'text-slate-300'}>
                  {tc.error || tc.output_summary || 'Void output'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
