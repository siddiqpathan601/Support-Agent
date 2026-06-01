import React, { useState } from 'react';
import { Calendar, Clock, MapPin, User, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

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
    <div className="w-full max-w-2xl glassmorphism rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

      {/* Header */}
      <div className="px-6 py-5 bg-cosmic-900/60 border-b border-purple-500/15 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
            Birth Details
          </h2>
        </div>
        <p className="text-xs text-slate-400 font-light max-w-sm mx-auto">
          Share your birth details so I can cast your celestial chart. All readings are for reflection and guidance.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-xs text-purple-300 font-medium mb-1.5 uppercase tracking-wider">
            <User className="w-3.5 h-3.5" /> Full Name
          </label>
          <input
            id="birth-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-cosmic-900/50 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="flex items-center gap-2 text-xs text-purple-300 font-medium mb-1.5 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" /> Birth Date
          </label>
          <input
            id="birth-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full bg-cosmic-900/50 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all appearance-none [color-scheme:dark]"
          />
          {errors.date && (
            <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.date}
            </p>
          )}
        </div>

        {/* Time */}
        <div>
          <label className="flex items-center gap-2 text-xs text-purple-300 font-medium mb-1.5 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Birth Time
          </label>
          <div className="flex items-center gap-3">
            <input
              id="birth-time"
              type="time"
              value={unknownTime ? '' : time}
              onChange={e => setTime(e.target.value)}
              disabled={unknownTime}
              className="flex-1 bg-cosmic-900/50 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none transition-all disabled:opacity-40 [color-scheme:dark]"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unknownTime}
              onChange={e => setUnknownTime(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-purple-500/30 bg-cosmic-900/50 text-purple-500 focus:ring-purple-500/30"
            />
            <span className="text-xs text-slate-400">I don't know my birth time (defaults to 12:00 noon)</span>
          </label>
        </div>

        {/* Place */}
        <div>
          <label className="flex items-center gap-2 text-xs text-purple-300 font-medium mb-1.5 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" /> Birth Place
          </label>
          <input
            id="birth-place"
            type="text"
            value={place}
            onChange={e => setPlace(e.target.value)}
            placeholder="City, Country"
            className="w-full bg-cosmic-900/50 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
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
          className="w-full bg-gradient-to-r from-cosmic-600 to-purple-600 hover:from-cosmic-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-medium text-sm tracking-wide shadow-lg hover:shadow-purple-500/20 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Cast My Chart
        </button>
      </form>
    </div>
  );
}

// ── Summary Bar Component ───────────────────────────────────────────────────

export function BirthDetailsSummary({ details, onEdit }: BirthDetailsSummaryProps) {
  return (
    <div className="w-full max-w-2xl glassmorphism-card rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs text-slate-300 overflow-hidden">
        <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className="truncate">
          <span className="text-purple-300 font-medium">{details.name}</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>{details.date}</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>{details.time}</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>{details.place}</span>
        </span>
      </div>
      <button
        id="edit-birth-details"
        onClick={onEdit}
        className="text-xs text-purple-400 hover:text-purple-300 font-medium whitespace-nowrap transition-colors"
      >
        Edit
      </button>
    </div>
  );
}
