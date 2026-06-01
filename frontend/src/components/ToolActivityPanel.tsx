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
        className="flex items-center gap-2 text-[11px] text-purple-400/70 hover:text-purple-300 font-mono transition-colors"
      >
        <Wrench className="w-3 h-3" />
        <span>{toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''} called</span>
        {expanded
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />
        }
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-in slide-in-from-top-2">
          {toolCalls.map((tc, i) => (
            <div
              key={i}
              className="bg-cosmic-950/60 border border-purple-500/10 rounded-lg px-3 py-2.5 text-xs"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {tc.error
                    ? <AlertTriangle className="w-3 h-3 text-amber-400" />
                    : <Check className="w-3 h-3 text-emerald-400" />
                  }
                  <span className="font-mono font-medium text-purple-300">
                    {tc.name || 'unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-2.5 h-2.5" />
                  <span className="font-mono">{Math.round(tc.ms)}ms</span>
                </div>
              </div>

              {/* Input */}
              {tc.input && Object.keys(tc.input).length > 0 && (
                <div className="mb-1">
                  <span className="text-slate-500">Input: </span>
                  <span className="text-slate-400 font-mono">
                    {Object.entries(tc.input).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </span>
                </div>
              )}

              {/* Output summary */}
              <div>
                <span className="text-slate-500">Output: </span>
                <span className="text-slate-300">
                  {tc.error || tc.output_summary || 'No output'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
