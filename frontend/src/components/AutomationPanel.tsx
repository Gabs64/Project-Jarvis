import React, { useState, useEffect } from 'react';
import { Zap, Clock, Battery, Power } from 'lucide-react';

interface AutomationItem {
  id: number;
  name: string;
  trigger: any;
  actions: any[];
  enabled: boolean;
  created_at?: string;
}

export const AutomationPanel: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      setAutomations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggle = async (id: number, current: boolean) => {
    try {
      await fetch(`/api/automations/${id}/toggle?enabled=${!current}`, { method: 'POST' });
      fetchAutomations();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <div className="pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="hud-font font-bold text-lg text-cyan-200">
            AUTONOMOUS ROUTINE ENGINE
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Scheduled task pipelines, event listeners, and environmental triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {automations.map((auto) => (
          <div
            key={auto.id}
            className={`p-5 rounded-xl border transition-all shadow-lg ${
              auto.enabled
                ? 'bg-[#0D1522]/90 border-cyan-500/40'
                : 'bg-[#080D14]/80 border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  auto.enabled ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-500'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{auto.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    {auto.trigger?.type === 'schedule' ? (
                      <>
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Daily at {auto.trigger.time}</span>
                      </>
                    ) : (
                      <>
                        <Battery className="w-3 h-3 text-amber-400" />
                        <span>Battery &lt; {auto.trigger?.threshold}%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleToggle(auto.id, auto.enabled)}
                className={`p-2 rounded-lg border transition-all ${
                  auto.enabled
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
                title="Toggle Automation"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            {/* Actions list */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Action Pipeline ({auto.actions?.length || 0}):
              </span>
              <div className="space-y-1.5">
                {auto.actions?.map((act: any, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-black/40 border border-slate-800 text-xs mono-font text-slate-300 flex items-center justify-between">
                    <span className="text-cyan-300 font-semibold">{act.tool || act}</span>
                    <span className="text-[10px] text-slate-500">Step {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
