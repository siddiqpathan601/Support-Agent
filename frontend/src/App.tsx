import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import { BirthDetailsForm, BirthDetailsSummary, type BirthDetails } from './components/BirthDetailsForm';
import { Sparkles, Moon, Star } from 'lucide-react';

export default function App() {
  const [birthDetails, setBirthDetails] = useState<BirthDetails | null>(() => {
    try {
      const stored = localStorage.getItem('astroagent_birth_details');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showForm, setShowForm] = useState(!birthDetails);

  const handleBirthSubmit = (details: BirthDetails) => {
    setBirthDetails(details);
    setShowForm(false);
    localStorage.setItem('astroagent_birth_details', JSON.stringify(details));
  };

  const handleEdit = () => setShowForm(true);

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
      <div className="w-full max-w-2xl z-10 flex flex-col items-center gap-4">
        {/* Title Brand Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono tracking-wider">
            <Moon className="w-3.5 h-3.5" />
            <span>ARADHANA · ASTRO COMPANION</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-purple-300 to-slate-200">
            AstroAgent
          </h1>
          <p className="text-sm md:text-base text-slate-400 font-light max-w-md mx-auto">
            Your celestial AI companion — powered by real ephemeris data and Gemini.
          </p>
        </div>

        {/* Birth Details Section */}
        {showForm ? (
          <BirthDetailsForm onSubmit={handleBirthSubmit} />
        ) : (
          <>
            {birthDetails && (
              <BirthDetailsSummary details={birthDetails} onEdit={handleEdit} />
            )}
            <ChatInterface birthDetails={birthDetails} />
          </>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500 font-mono">
            Readings are for reflection and guidance, not certainty. · Aradhana Take-Home
          </p>
        </div>
      </div>
    </div>
  );
}
