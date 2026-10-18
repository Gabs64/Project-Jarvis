import React from 'react';
import { Sun, CloudSun, Calendar, CheckSquare, Activity, X, Volume2 } from 'lucide-react';

interface BriefingData {
  greeting: string;
  text: string;
  date: string;
  time: string;
  weather: string;
  reminders_count: number;
  tasks_count: number;
  reminders: Array<{ id: number; title: string; scheduled_time: string }>;
  tasks: Array<{ id: number; title: string; priority: string }>;
  system: { cpu: number; memory: number; disk_free_gb: number };
}

interface BriefingModalProps {
  isOpen: boolean;
  briefing: BriefingData | null;
  onClose: () => void;
  onSpeak: (text: string) => void;
}

export const BriefingModal: React.FC<BriefingModalProps> = ({
  isOpen,
  briefing,
  onClose,
  onSpeak
}) => {
  if (!isOpen || !briefing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0B121C] border border-cyan-500/50 rounded-xl p-6 shadow-[0_0_50px_rgba(92,200,255,0.2)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="hud-font font-bold text-lg text-cyan-200">
                DAILY EXECUTIVE BRIEFING
              </h2>
              <p className="text-xs text-slate-400 mono-font">
                {briefing.date} // {briefing.time}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spoken Text Audio Preview */}
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 mb-5 relative">
          <p className="text-sm leading-relaxed text-slate-200 italic">
            &ldquo;{briefing.text}&rdquo;
          </p>
          <button
            onClick={() => onSpeak(briefing.text)}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-semibold hud-font transition-all"
          >
            <Volume2 className="w-4 h-4" />
            VOCALIZE BRIEFING
          </button>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Weather & Conditions */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 hud-font mb-2">
              <CloudSun className="w-4 h-4" />
              <span>ENVIRONMENT CONDITIONS</span>
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {briefing.weather}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Atmospheric sensors nominal
            </p>
          </div>

          {/* System Load */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 hud-font mb-2">
              <Activity className="w-4 h-4" />
              <span>DIAGNOSTIC STATUS</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-1.5 bg-black/40 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CPU</span>
                <span className="font-bold text-cyan-300">{briefing.system.cpu}%</span>
              </div>
              <div className="p-1.5 bg-black/40 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">RAM</span>
                <span className="font-bold text-cyan-300">{briefing.system.memory}%</span>
              </div>
              <div className="p-1.5 bg-black/40 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DISK</span>
                <span className="font-bold text-slate-200">{briefing.system.disk_free_gb} GB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders & Agenda */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-purple-500/20">
            <div className="flex items-center justify-between text-xs font-bold text-purple-400 hud-font mb-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>UPCOMING REMINDERS</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/30 text-[10px]">
                {briefing.reminders_count}
              </span>
            </div>
            {briefing.reminders.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No reminders scheduled today.</p>
            ) : (
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.reminders.map((rem) => (
                  <li key={rem.id} className="p-1.5 bg-black/30 rounded border border-slate-800 flex justify-between">
                    <span className="font-medium text-slate-200">{rem.title}</span>
                    <span className="text-purple-300 mono-font text-[11px]">{rem.scheduled_time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-emerald-500/20">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 hud-font mb-2">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                <span>ACTIVE TASKS</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-[10px]">
                {briefing.tasks_count}
              </span>
            </div>
            {briefing.tasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No pending tasks on file.</p>
            ) : (
              <ul className="space-y-1.5 text-xs text-slate-300">
                {briefing.tasks.map((tsk) => (
                  <li key={tsk.id} className="p-1.5 bg-black/30 rounded border border-slate-800 flex justify-between">
                    <span className="font-medium text-slate-200">{tsk.title}</span>
                    <span className="text-emerald-300 text-[10px] uppercase font-bold">{tsk.priority}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
