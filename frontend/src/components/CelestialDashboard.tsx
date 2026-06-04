import React, { useState } from 'react';
import { Sun, Moon, Sparkles, Compass, Activity, Flame, Droplets, Wind, Mountain, TrendingUp, Info } from 'lucide-react';

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
  transit_planet: string;
  aspect: string;
  natal_planet: string;
  orb: number;
  description: string;
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
  sun: 'Core identity & purpose',
  moon: 'Emotional core & intuition',
  mercury: 'Communication & logic',
  venus: 'Love, values & aesthetics',
  mars: 'Drive, action & energy',
  jupiter: 'Expansion, luck & wisdom',
  saturn: 'Structure & discipline',
  ascendant: 'Outward persona & rising sign',
  midheaven: 'Career & public calling',
};

const SIGN_ELEMENTS: Record<string, { name: 'Fire' | 'Earth' | 'Air' | 'Water'; color: string; bg: string; border: string; icon: any }> = {
  Aries: { name: 'Fire', color: 'text-amber-200/90', bg: 'bg-amber-500/5', border: 'border-amber-500/10', icon: Flame },
  Leo: { name: 'Fire', color: 'text-amber-200/90', bg: 'bg-amber-500/5', border: 'border-amber-500/10', icon: Flame },
  Sagittarius: { name: 'Fire', color: 'text-amber-200/90', bg: 'bg-amber-500/5', border: 'border-amber-500/10', icon: Flame },
  Taurus: { name: 'Earth', color: 'text-emerald-300', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10', icon: Mountain },
  Virgo: { name: 'Earth', color: 'text-emerald-300', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10', icon: Mountain },
  Capricorn: { name: 'Earth', color: 'text-emerald-300', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10', icon: Mountain },
  Gemini: { name: 'Air', color: 'text-sky-300', bg: 'bg-sky-500/5', border: 'border-sky-500/10', icon: Wind },
  Libra: { name: 'Air', color: 'text-sky-300', bg: 'bg-sky-500/5', border: 'border-sky-500/10', icon: Wind },
  Aquarius: { name: 'Air', color: 'text-sky-300', bg: 'bg-sky-500/5', border: 'border-sky-500/10', icon: Wind },
  Cancer: { name: 'Water', color: 'text-indigo-300', bg: 'bg-indigo-500/5', border: 'border-indigo-500/10', icon: Droplets },
  Scorpio: { name: 'Water', color: 'text-indigo-300', bg: 'bg-indigo-500/5', border: 'border-indigo-500/10', icon: Droplets },
  Pisces: { name: 'Water', color: 'text-indigo-300', bg: 'bg-indigo-500/5', border: 'border-indigo-500/10', icon: Droplets },
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
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 glassmorphism rounded-2xl border border-slate-800/60 min-h-[480px] relative overflow-hidden">
        <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-slate-800 animate-spin" style={{ animationDuration: '30s' }} />
          <Compass className="w-6 h-6 text-slate-500 animate-pulse" />
        </div>
        <h3 className="text-sm font-medium text-slate-200 mb-1.5">Celestial Placements</h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          Provide your birth details to generate your natal chart and analyze active daily transits.
        </p>
      </div>
    );
  }

  // Active tab fallback
  const currentTab = activeTab === 'chart' && !chart ? 'transits' : activeTab === 'transits' && !transits ? 'chart' : activeTab;

  return (
    <div className="w-full flex flex-col glassmorphism rounded-2xl overflow-hidden shadow-lg border border-slate-800/60 h-[580px]">
      {/* Tab bar header */}
      <div className="flex bg-slate-900/35 border-b border-slate-900/60">
        {chart && (
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex-1 py-3.5 text-xs font-semibold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 border-b ${
              currentTab === 'chart'
                ? 'text-amber-200 border-amber-300/40 bg-slate-900/20 font-medium'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Natal Chart
          </button>
        )}
        {transits && (
          <button
            onClick={() => setActiveTab('transits')}
            className={`flex-1 py-3.5 text-xs font-semibold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 border-b ${
              currentTab === 'transits'
                ? 'text-amber-200 border-amber-300/40 bg-slate-900/20 font-medium'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Daily Transits
          </button>
        )}
      </div>

      {/* Content scroll area */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {currentTab === 'chart' && chart && (
          <div className="space-y-4 animate-message">
            {/* Metadata Summary */}
            <div className="flex justify-between items-center px-4 py-2 bg-slate-950/40 border border-slate-900/60 rounded-xl text-[10px] text-slate-500 font-mono">
              <span>Geo: {chart.metadata.lat.toFixed(2)}°, {chart.metadata.lon.toFixed(2)}°</span>
              <span className="text-amber-200/70">{chart.metadata.timezone}</span>
            </div>

            {/* Placements List */}
            <div className="space-y-2">
              {/* Rising / Ascendant */}
              {(() => {
                const placement = chart.ascendant;
                const config = SIGN_ELEMENTS[placement.sign] || { name: 'Air', color: 'text-slate-300', bg: 'bg-slate-500/5', border: 'border-slate-500/10', icon: Sparkles };
                const ElementIcon = config.icon;
                return (
                  <div className="flex items-center justify-between p-3 bg-slate-900/20 border border-slate-900/50 rounded-xl hover:border-slate-800 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950/30 border border-indigo-900/20 flex items-center justify-center text-indigo-400">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Ascendant</div>
                        <div className="text-[10px] text-slate-500 font-light">{PLANET_DESCRIPTIONS.ascendant}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center justify-end gap-1">
                          <span>{SIGN_EMOJIS[placement.sign]}</span>
                          <span>{placement.sign}</span>
                        </div>
                        <div className="text-[10px] font-mono text-amber-200/90 mt-0.5">{formatDegree(placement.degree)}</div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${config.border} ${config.bg} ${config.color}`} title={config.name}>
                        <ElementIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Midheaven */}
              {chart.midheaven && (() => {
                const placement = chart.midheaven;
                const config = SIGN_ELEMENTS[placement.sign] || { name: 'Air', color: 'text-slate-300', bg: 'bg-slate-500/5', border: 'border-slate-500/10', icon: Sparkles };
                const ElementIcon = config.icon;
                return (
                  <div className="flex items-center justify-between p-3 bg-slate-900/20 border border-slate-900/50 rounded-xl hover:border-slate-800 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950/30 border border-indigo-900/20 flex items-center justify-center text-indigo-400">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Midheaven (MC)</div>
                        <div className="text-[10px] text-slate-500 font-light">{PLANET_DESCRIPTIONS.midheaven}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center justify-end gap-1">
                          <span>{SIGN_EMOJIS[placement.sign]}</span>
                          <span>{placement.sign}</span>
                        </div>
                        <div className="text-[10px] font-mono text-amber-200/90 mt-0.5">{formatDegree(placement.degree)}</div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${config.border} ${config.bg} ${config.color}`} title={config.name}>
                        <ElementIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Planets */}
              {Object.entries(chart.planets).map(([planet, placement]) => {
                const sign = placement.sign;
                const config = SIGN_ELEMENTS[sign] || { name: 'Air', color: 'text-slate-300', bg: 'bg-slate-500/5', border: 'border-slate-500/10', icon: Sparkles };
                const ElementIcon = config.icon;
                const PlanetIcon = planet === 'sun' ? Sun : planet === 'moon' ? Moon : Sparkles;
                
                return (
                  <div key={planet} className="flex items-center justify-between p-3 bg-slate-900/20 border border-slate-900/50 rounded-xl hover:border-slate-800 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950/30 border border-indigo-900/20 flex items-center justify-center text-indigo-400 capitalize">
                        <PlanetIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 capitalize">{planet}</div>
                        <div className="text-[10px] text-slate-500 font-light">{PLANET_DESCRIPTIONS[planet]}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center justify-end gap-1">
                          <span>{SIGN_EMOJIS[sign]}</span>
                          <span>{sign}</span>
                        </div>
                        <div className="text-[10px] font-mono text-amber-200/90 mt-0.5">{formatDegree(placement.degree)}</div>
                      </div>
                      <div className={`p-1.5 rounded-lg border ${config.border} ${config.bg} ${config.color}`} title={config.name}>
                        <ElementIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Houses Grid (Equal System) */}
            <div className="p-4 bg-slate-950/30 border border-slate-900/60 rounded-xl">
              <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-500 mb-3">
                House Cusps (Equal System)
              </h4>
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                {Object.entries(chart.houses).map(([house, pos]) => {
                  const num = house.split('_')[1];
                  return (
                    <div key={house} className="p-2 bg-slate-900/10 rounded-lg border border-slate-900/50">
                      <div className="text-[9px] text-slate-500 font-light">H{num}</div>
                      <div className="font-semibold text-slate-300 mt-0.5 truncate">{SIGN_EMOJIS[pos.sign]} {pos.sign}</div>
                      <div className="text-[8px] text-amber-200/80 mt-0.5">{formatDegree(pos.degree)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'transits' && transits && (
          <div className="space-y-4 animate-message">
            {/* Transit Metadata Summary */}
            <div className="flex justify-between items-center px-4 py-2 bg-slate-950/40 border border-slate-900/60 rounded-xl text-[10px] text-slate-500 font-mono">
              <span>Sky Date: {transits.date}</span>
              <span className="text-amber-200/70">{transits.aspect_count} Aspects Detected</span>
            </div>

            {/* Aspects List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-500">
                Active Aspects
              </h4>
              
              {transits.aspects.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono bg-slate-950/10 border border-dashed border-slate-900/40 rounded-xl">
                  No major aspects forming today.
                </div>
              ) : (
                <div className="space-y-2">
                  {transits.aspects.map((asp, i) => {
                    // Aspect visual indicators
                    let aspectBadge = 'text-sky-300 bg-sky-500/5 border-sky-500/10';
                    if (asp.aspect === 'conjunction') aspectBadge = 'text-amber-200/90 bg-amber-500/5 border-amber-500/10';
                    else if (asp.aspect === 'trine') aspectBadge = 'text-emerald-300 bg-emerald-500/5 border-emerald-500/10';
                    else if (asp.aspect === 'square') aspectBadge = 'text-orange-300 bg-orange-500/5 border-orange-500/10';
                    else if (asp.aspect === 'opposition') aspectBadge = 'text-rose-300 bg-rose-500/5 border-rose-500/10';

                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-900/20 border border-slate-900/50 rounded-xl">
                        <div className="text-xs">
                          <span className="font-semibold text-slate-200">{asp.transit_planet}</span>
                          <span className="text-slate-500 text-[10px] mx-1">transit to natal</span>
                          <span className="font-semibold text-slate-200">{asp.natal_planet}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded border capitalize ${aspectBadge}`}>
                            {asp.aspect}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {asp.orb.toFixed(1)}°
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current Transit Positions */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono tracking-widest uppercase text-slate-500">
                Transit Positions
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(transits.transit_positions).map(([planet, pos]) => (
                  <div key={planet} className="p-2.5 bg-slate-900/20 border border-slate-900/50 rounded-lg flex flex-col justify-center">
                    <span className="text-[9px] text-slate-500 capitalize">{planet}</span>
                    <span className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                      {SIGN_EMOJIS[pos.sign]} {pos.sign}
                    </span>
                    <span className="text-[9px] font-mono text-amber-200/80 mt-0.5">{formatDegree(pos.degree)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info bar */}
      <div className="px-5 py-3 bg-slate-900/35 border-t border-slate-900/60 flex items-center gap-2 text-[9px] text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        <span>Ephemeris planetary alignments calculated mathematically in UTC.</span>
      </div>
    </div>
  );
}
