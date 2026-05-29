import React from 'react';
import ChatInterface from './components/ChatInterface';
import { Sparkles, Moon, Star } from 'lucide-react';

export default function App() {
  return (
    <div className="relative min-h-screen bg-[#030014] text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Cosmic Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cosmic-800/20 cosmic-glow-1 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/15 cosmic-glow-2 pointer-events-none" />
      
      {/* Decorative Stars */}
      <div className="absolute top-1/4 left-1/12 text-purple-500/20 animate-pulse pointer-events-none">
        <Star className="w-6 h-6" />
      </div>
      <div className="absolute bottom-1/4 right-1/12 text-cosmic-400/20 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}>
        <Star className="w-4 h-4" />
      </div>
      <div className="absolute top-[15%] right-[15%] text-purple-400/35 animate-bounce pointer-events-none" style={{ animationDuration: '6s' }}>
        <Sparkles className="w-5 h-5" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-2xl z-10 flex flex-col items-center gap-6">
        {/* Title Brand Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono tracking-wider">
            <Moon className="w-3.5 h-3.5" />
            <span>PROJECT SKELETON v1.0.0</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-purple-300 to-slate-200">
            AstroAgent
          </h1>
          <p className="text-sm md:text-base text-slate-400 font-light max-w-md mx-auto">
            A real-time FastAPI + LangGraph celestial AI agent powered by modern React & TailwindCSS.
          </p>
        </div>

        {/* Chat Interface */}
        <ChatInterface />
        
        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500 font-mono">
            Crafted for the Take-Home Assignment. AstroAgent node is active.
          </p>
        </div>
      </div>
    </div>
  );
}
