import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Sparkles, AlertCircle } from 'lucide-react';

export interface BirthDetails {
  name: string;
  date: string;
  time: string;
  place: string;
}

interface BirthDetailsFormProps {
  onSubmit: (details: BirthDetails) => void;
}

interface BirthDetailsSummaryProps {
  details: BirthDetails;
  onEdit: () => void;
}

// ── Form Component ──────────────────────────────────────────────────────────

export function BirthDetailsForm({ onSubmit }: BirthDetailsFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [unknownTime, setUnknownTime] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Name is required';
    if (!date) {
      errs.date = 'Birth date is required';
    } else {
      const d = new Date(date);
      if (d > new Date()) errs.date = 'Birth date must be in the past';
    }
    if (!place.trim()) errs.place = 'Birth place is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      date,
      time: unknownTime ? '12:00' : (time || '12:00'),
      place: place.trim(),
    });
  };

  return (
    <div className="w-full glassmorphism rounded-2xl overflow-hidden shadow-xl border border-slate-800/60 relative">
      {/* Header */}
      <div className="px-6 py-6 bg-slate-900/30 border-b border-slate-900/60 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-200" />
          <h2 className="text-base font-medium text-slate-100 tracking-wide">
            Casting Your Birth Chart
          </h2>
        </div>
        <p className="text-xs text-slate-400 font-light max-w-sm mx-auto">
          Casting requires birth details to load planetary alignments from the ephemeris.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
            <User className="w-3.5 h-3.5 text-indigo-400" /> Name
          </label>
          <input
            id="birth-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Priya"
            className="w-full bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Birth Date
          </label>
          <input
            id="birth-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all appearance-none [color-scheme:dark]"
          />
          {errors.date && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.date}
            </p>
          )}
        </div>

        {/* Time */}
        <div>
          <label className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Birth Time
          </label>
          <div className="flex items-center gap-3">
            <input
              id="birth-time"
              type="time"
              value={unknownTime ? '' : time}
              onChange={e => setTime(e.target.value)}
              disabled={unknownTime}
              className="flex-1 bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all disabled:opacity-30 [color-scheme:dark]"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={e => setUnknownTime(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/30"
            />
            <span className="text-xs text-slate-400">Time unknown (defaults to 12:00 noon)</span>
          </label>
        </div>

        {/* Place */}
        <div>
          <label className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1.5 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Birth Place
          </label>
          <input
            id="birth-place"
            type="text"
            value={place}
            onChange={e => setPlace(e.target.value)}
            placeholder="e.g. Mumbai, India"
            className="w-full bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
          />
          {errors.place && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.place}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          id="submit-birth-details"
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-3.5 rounded-xl font-medium text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/10"
        >
          <Sparkles className="w-4 h-4 text-amber-200" />
          Cast My Chart
        </button>
      </form>
    </div>
  );
}

// ── Summary Bar Component ───────────────────────────────────────────────────

export function BirthDetailsSummary({ details, onEdit }: BirthDetailsSummaryProps) {
  return (
    <div className="w-full max-w-6xl glassmorphism rounded-xl px-5 py-3 flex items-center justify-between gap-4 border border-slate-800/50 shadow-md">
      <div className="flex items-center gap-2.5 text-xs text-slate-300 overflow-hidden">
        <Sparkles className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
        <span className="truncate tracking-wide">
          Chart active: <span className="text-amber-100 font-medium">{details.name}</span>
          <span className="mx-2 text-slate-700">|</span>
          <span className="text-slate-400">{details.date}</span>
          <span className="mx-2 text-slate-700">|</span>
          <span className="text-slate-400">{details.time}</span>
          <span className="mx-2 text-slate-700">|</span>
          <span className="text-slate-400">{details.place}</span>
        </span>
      </div>
      <button
        id="edit-birth-details"
        onClick={onEdit}
        className="text-[10px] text-amber-200/80 hover:text-amber-100 hover:underline tracking-wider uppercase font-medium whitespace-nowrap transition-all"
      >
        Edit details
      </button>
    </div>
  );
}
