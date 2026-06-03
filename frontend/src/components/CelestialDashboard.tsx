import React, { useState } from 'react';
import { Sun, Moon, Sparkles, Compass, Activity, Flame, Droplets, Wind, Mountain, TrendingUp, Info, ShieldAlert } from 'lucide-react';

interface Placement {
  sign: string;
  degree: number;
  longitude?: number;
}

interface BirthChartData {
  planets: Record<string, Placement>;
  ascendant: Placement;
  midheaven: Placement;
  houses: Record<string, Placement>;
  metadata: {
    date: string;
    time: string;
    place: string;
    lat: number;
    lon: number;
    timezone: string;
  };
}

interface TransitAspect {
  planet1: string;
  planet2: string;
  aspect: number;
  diff: number;
  type: string;
}

interface TransitData {
  date: string;
  transit_positions: Record<string, Placement>;
  aspects: TransitAspect[];
  aspect_count: number;
}

interface CelestialDashboardProps {
  chart: BirthChartData | null;
  transits: TransitData | null;
}

const SIGN_EMOJIS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

const PLANET_DESCRIPTIONS: Record<string, string> = {
  sun: 'Core identity, vitality, ego, and soul purpose.',
  moon: 'Emotions, subconscious patterns, instincts, and comfort.',
  mercury: 'Communication, intellect, learning, and logical thinking.',
  venus: 'Love, harmony, relationships, values, and aesthetics.',
  mars: 'Drive, action, ambition, passion, and physical energy.',
  jupiter: 'Expansion, luck, wisdom, philosophy, and abundance.',
  saturn: 'Discipline, boundaries, structures, and life lessons.',
  ascendant: 'First impression, outward persona, and approach to life.',
  midheaven: 'Career, public reputation, ambition, and social calling.',
};

const SIGN_ELEMENTS: Record<string, { name: 'Fire' | 'Earth' | 'Air' | 'Water'; color: string; bg: string; border: string; glow: string; icon: any }> = {
  Aries: { name: 'Fire', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', icon: Flame },
  Leo: { name: 'Fire', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', icon: Flame },
  Sagittarius: { name: 'Fire', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]', icon: Flame },
  Taurus: { name: 'Earth', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', icon: Mountain },
  Virgo: { name: 'Earth', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', icon: Mountain },
  Capricorn: { name: 'Earth', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]', icon: Mountain },
  Gemini: { name: 'Air', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]', icon: Wind },
  Libra: { name: 'Air', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]', icon: Wind },
  Aquarius: { name: 'Air', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.15)]', icon: Wind },
  Cancer: { name: 'Water', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]', icon: Droplets },
  Scorpio: { name: 'Water', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]', icon: Droplets },
  Pisces: { name: 'Water', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]', icon: Droplets },
};

function formatDegree(deg: number): string {
  const degrees = Math.floor(deg);
  const minutes = Math.round((deg - degrees) * 60);
  return `${degrees}°${minutes.toString().padStart(2, '0')}'`;
}

export default function CelestialDashboard({ chart, transits }: CelestialDashboardProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'transits'>('chart');

  if (!chart && !transits) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 glassmorphism rounded-2xl border border-purple-500/10 min-h-[450px] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-spin" style={{ animationDuration: '20s' }} />
          <div className="absolute inset-2 rounded-full border border-dashed border-purple-500/35 animate-spin" style={{ animationDuration: '10s', animationDirection: 'reverse' }} />
          <Compass className="w-8 h-8 text-purple-400/60 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Celestial Insight Dashboard</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Your birth chart and real-time transit telemetry will materialize here once computed.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-center text-[10px] text-slate-500 font-mono">
          <span className="px-2 py-1 rounded bg-cosmic-950/40 border border-purple-500/5">GEOPY GEOCODING</span>
          <span className="px-2 py-1 rounded bg-cosmic-950/40 border border-purple-500/5">PYEPHEM EPHEMERIS</span>
          <span className="px-2 py-1 rounded bg-cosmic-950/40 border border-purple-500/5">DAILY TRANSITS</span>
        </div>
      </div>
    );
  }

  // Active tab falls back to the one that has data
  const currentTab = activeTab === 'chart' && !chart ? 'transits' : activeTab === 'transits' && !transits ? 'chart' : activeTab;

  return (
    <div className="w-full flex flex-col glassmorphism rounded-2xl overflow-hidden shadow-2xl relative border border-purple-500/15">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/20 via-purple-500 to-purple-500/20" />

      {/* Tabs */}
      <div className="flex bg-cosmic-950/40 border-b border-purple-500/10">
        {chart && (
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border-b-2 ${
              currentTab === 'chart'
                ? 'text-purple-300 border-purple-500 bg-purple-500/5 font-medium'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Compass className="w-4 h-4" />
            Natal Chart
          </button>
        )}
        {transits && (
          <button
            onClick={() => setActiveTab('transits')}
            className={`flex-1 py-3 text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border-b-2 ${
              currentTab === 'transits'
                ? 'text-purple-300 border-purple-500 bg-purple-500/5 font-medium'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            Daily Transits
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 overflow-y-auto max-h-[580px] min-h-[400px]">
        {currentTab === 'chart' && chart && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 bg-cosmic-950/40 border border-purple-500/10 rounded-xl text-xs text-slate-400 font-mono">
              <div>
                <span className="text-purple-300 font-semibold">{chart.metadata.place}</span>
              </div>
              <div className="flex gap-3">
                <span>{chart.metadata.date}</span>
                <span>{chart.metadata.time}</span>
                <span>TZ: {chart.metadata.timezone}</span>
              </div>
            </div>

            {/* Placements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Ascendant */}
              {(() => {
                const sign = chart.ascendant.sign;
                const config = SIGN_ELEMENTS[sign] || { name: 'Air', color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30', glow: '', icon: Sparkles };
                const Icon = config.icon;
                return (
                  <div className={`p-3.5 bg-cosmic-950/40 border ${config.border} ${config.glow} rounded-xl hover:bg-cosmic-900/40 transition-all duration-300 group`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-purple-500/10 text-purple-300">
                          <Compass className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-200 text-sm">Rising / Ascendant</span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                        {config.name}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5 mt-2">
                      <span className="text-xl">{SIGN_EMOJIS[sign] || ''}</span>
                      <span>{sign}</span>
                      <span className="text-xs font-mono text-purple-400 font-normal ml-auto">
                        {formatDegree(chart.ascendant.degree)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 font-light leading-relaxed">
                      {PLANET_DESCRIPTIONS.ascendant}
                    </p>
                  </div>
                );
              })()}

              {/* Midheaven */}
              {chart.midheaven && (() => {
                const sign = chart.midheaven.sign;
                const config = SIGN_ELEMENTS[sign] || { name: 'Air', color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30', glow: '', icon: Sparkles };
                return (
                  <div className={`p-3.5 bg-cosmic-950/40 border ${config.border} ${config.glow} rounded-xl hover:bg-cosmic-900/40 transition-all duration-300 group`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-purple-500/10 text-purple-300">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-200 text-sm">Midheaven (MC)</span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                        {config.name}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5 mt-2">
                      <span className="text-xl">{SIGN_EMOJIS[sign] || ''}</span>
                      <span>{sign}</span>
                      <span className="text-xs font-mono text-purple-400 font-normal ml-auto">
                        {formatDegree(chart.midheaven.degree)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 font-light leading-relaxed">
                      {PLANET_DESCRIPTIONS.midheaven}
                    </p>
                  </div>
                );
              })()}

              {/* Major Planets */}
              {Object.entries(chart.planets).map(([planetName, placement]) => {
                const sign = placement.sign;
                const config = SIGN_ELEMENTS[sign] || { name: 'Air', color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/30', glow: '', icon: Sparkles };
                const Icon = planetName === 'sun' ? Sun : planetName === 'moon' ? Moon : config.icon;
                return (
                  <div key={planetName} className={`p-3.5 bg-cosmic-950/40 border ${config.border} ${config.glow} rounded-xl hover:bg-cosmic-900/40 transition-all duration-300 group`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-purple-500/10 text-purple-300">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-200 text-sm capitalize">{planetName}</span>
                      </div>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                        {config.name}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-slate-100 flex items-center gap-1.5 mt-2">
                      <span className="text-xl">{SIGN_EMOJIS[sign] || ''}</span>
                      <span>{sign}</span>
                      <span className="text-xs font-mono text-purple-400 font-normal ml-auto">
                        {formatDegree(placement.degree)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 font-light leading-relaxed">
                      {PLANET_DESCRIPTIONS[planetName] || 'Celestial body coordinates.'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Houses collapsable summary */}
            <div className="mt-4 p-4 bg-cosmic-950/30 border border-purple-500/10 rounded-xl">
              <h4 className="text-xs font-mono tracking-wider uppercase text-purple-300 mb-3 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5" /> House Cusps (Equal System)
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs font-mono">
                {Object.entries(chart.houses).map(([houseName, data]) => {
                  const num = houseName.split('_')[1];
                  return (
                    <div key={houseName} className="p-2 bg-cosmic-950/50 rounded-lg border border-purple-500/5 hover:border-purple-500/15 transition-all">
                      <div className="text-[10px] text-slate-500">House {num}</div>
                      <div className="font-semibold text-slate-200 mt-0.5 truncate">{SIGN_EMOJIS[data.sign] || ''} {data.sign}</div>
                      <div className="text-[9px] text-slate-400 font-light mt-0.5">{formatDegree(data.degree)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'transits' && transits && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="flex justify-between items-center p-3 bg-cosmic-950/40 border border-purple-500/10 rounded-xl text-xs text-slate-400 font-mono">
              <div>Cosmic Sky Telemetry</div>
              <div className="text-purple-300 font-semibold">Today: {transits.date}</div>
            </div>

            {/* Aspects List */}
            <div>
              <h4 className="text-xs font-mono tracking-wider uppercase text-purple-300 mb-3 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Planetary Aspects ({transits.aspect_count} Active)
              </h4>
              
              {transits.aspects.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono bg-cosmic-950/20 border border-dashed border-purple-500/5 rounded-xl">
                  No major geometric aspects active today.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transits.aspects.map((asp, i) => {
                    // Styling for aspects
                    let aspectBadge = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
                    let label = 'Conjunction';
                    if (asp.aspect === 60) {
                      aspectBadge = 'bg-teal-500/10 text-teal-300 border-teal-500/20';
                      label = 'Sextile';
                    } else if (asp.aspect === 90) {
                      aspectBadge = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
                      label = 'Square';
                    } else if (asp.aspect === 120) {
                      aspectBadge = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                      label = 'Trine';
                    } else if (asp.aspect === 180) {
                      aspectBadge = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                      label = 'Opposition';
                    }

                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-cosmic-950/40 border border-purple-500/5 rounded-xl hover:border-purple-500/20 transition-all">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-slate-100 capitalize">{asp.planet1}</span>
                          <span className="text-slate-500 text-[10px] font-mono">and</span>
                          <span className="font-semibold text-sm text-slate-100 capitalize">{asp.planet2}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${aspectBadge}`}>
                            {label} ({asp.aspect}°)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                            orb: {asp.diff.toFixed(2)}°
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transit Positions Grid */}
            <div className="mt-5">
              <h4 className="text-xs font-mono tracking-wider uppercase text-purple-300 mb-3 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5" /> Current Transit Positions
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
                {Object.entries(transits.transit_positions).map(([planet, pos]) => (
                  <div key={planet} className="p-2.5 bg-cosmic-950/30 border border-purple-500/5 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 capitalize">{planet}</div>
                      <div className="font-bold text-slate-200 mt-0.5 truncate">
                        {SIGN_EMOJIS[pos.sign] || ''} {pos.sign}
                      </div>
                    </div>
                    <div className="text-[10px] text-purple-400 font-semibold">{formatDegree(pos.degree)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Disclaimer */}
      <div className="px-5 py-3 bg-cosmic-950/60 border-t border-purple-500/10 flex items-center gap-2 text-[10px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-purple-500/60 flex-shrink-0" />
        <span>Ephemeris computations powered by Swiss Ephemeris algorithm equivalents. Readings are guides, not guarantees.</span>
      </div>
    </div>
  );
}
