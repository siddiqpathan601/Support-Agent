import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import { BirthDetailsForm, BirthDetailsSummary, type BirthDetails } from './components/BirthDetailsForm';
import CelestialDashboard from './components/CelestialDashboard';
import { Sparkles, Moon, Star } from 'lucide-react';

export default function App() {
  const [birthDetails, setBirthDetails] = useState<BirthDetails | null>(() => {
    try {
      const stored = localStorage.getItem('astroagent_birth_details');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showForm, setShowForm] = useState(!birthDetails);
  const [computedChart, setComputedChart] = useState<any>(null);
  const [computedTransits, setComputedTransits] = useState<any>(null);

  const handleBirthSubmit = (details: BirthDetails) => {
    setBirthDetails(details);
    setShowForm(false);
    localStorage.setItem('astroagent_birth_details', JSON.stringify(details));
  };

  const handleEdit = () => setShowForm(true);

  return (
    <div className="relative min-h-screen bg-[#02000f] text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto">
      {/* Soft, Calming Cosmic Background Glows */}
      <div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] rounded-full bg-indigo-950/20 cosmic-glow-1 pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[800px] h-[800px] rounded-full bg-purple-950/20 cosmic-glow-2 pointer-events-none" />

      {/* Decorative Star Accents - Extremely subtle */}
      <div className="absolute top-[15%] left-[8%] text-amber-200/10 animate-pulse pointer-events-none">
        <Star className="w-5 h-5 fill-current" />
      </div>
      <div className="absolute bottom-[20%] right-[10%] text-indigo-400/10 animate-pulse pointer-events-none" style={{ animationDelay: '3s' }}>
        <Star className="w-4 h-4 fill-current" />
      </div>
      <div className="absolute top-[25%] right-[12%] text-amber-200/15 animate-bounce pointer-events-none" style={{ animationDuration: '8s' }}>
        <Sparkles className="w-4 h-4" />
      </div>

      {/* Header Space */}
      <header className="w-full max-w-6xl z-10 flex flex-col items-center gap-2 mb-6 mt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-indigo-500/10 text-indigo-300 text-[10px] font-mono tracking-widest uppercase">
          <Moon className="w-3 h-3 text-amber-200/80" />
          <span>Aradhana Astro Companion</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-100 mt-2 font-sans">
          Astro<span className="text-amber-200/90 font-light">Agent</span>
        </h1>
        <p className="text-xs text-slate-400 font-light text-center max-w-sm">
          A stateful AI astrologer companion powered by true planetary calculation & LangGraph.
        </p>
      </header>

      {/* Main Layout Container */}
      <main className={`w-full ${showForm ? 'max-w-xl' : 'max-w-6xl'} z-10 flex-1 flex flex-col items-center justify-center gap-6`}>
        {showForm ? (
          <BirthDetailsForm onSubmit={handleBirthSubmit} />
        ) : (
          <div className="w-full flex flex-col gap-6">
            {birthDetails && (
              <BirthDetailsSummary details={birthDetails} onEdit={handleEdit} />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-stretch">
              {/* Chat Area (Left Side) */}
              <div className="lg:col-span-6 flex flex-col">
                <ChatInterface
                  birthDetails={birthDetails}
                  onChartComputed={setComputedChart}
                  onTransitsComputed={setComputedTransits}
                />
              </div>
              
              {/* Right Panel (Planetary positions / transits) */}
              <div className="lg:col-span-6 flex flex-col">
                <CelestialDashboard
                  chart={computedChart}
                  transits={computedTransits}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl z-10 mt-8 mb-2 text-center border-t border-slate-900/60 pt-4">
        <p className="text-[10px] text-slate-500 font-mono tracking-wide">
          All calculations are mathematical models. Framework details are for introspection and guidance, never prediction.
        </p>
      </footer>
    </div>
  );
}
