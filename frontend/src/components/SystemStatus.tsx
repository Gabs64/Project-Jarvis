import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity, Clock, Mic, Sparkles } from 'lucide-react';

interface TelemetryData {
  cpu?: { percent: number; cores: number };
  memory?: { used_gb: number; total_gb: number; percent: number };
  disk?: { free_gb: number; total_gb: number; percent: number };
  network?: { bytes_sent_mb: number; bytes_recv_mb: number };
  battery?: { percent: number; power_plugged: boolean } | null;
}

interface SystemStatusProps {
  telemetry: TelemetryData | null;
  isAiOnline: boolean;
  isMicActive: boolean;
  isWsConnected: boolean;
  operatorName?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  telemetry,
  isAiOnline,
  isMicActive,
  isWsConnected,
  operatorName = 'SIR'
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const cpuPercent = telemetry?.cpu?.percent ?? 24;
  const memPercent = telemetry?.memory?.percent ?? 58;
  const diskFree = telemetry?.disk?.free_gb ?? 184;

  return (
    <header className="w-full bg-[#0B1118]/85 border-b border-cyan-500/20 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs backdrop-blur-md z-20">
      {/* Brand & Connection State */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="hud-font font-bold text-base tracking-wider text-cyan-300">
            JARVIS
          </span>
          <span className="text-[10px] mono-font px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
            v1.0 OS
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-400">CORE:</span>
            <span className={`font-semibold ${isWsConnected ? 'text-emerald-300' : 'text-rose-400'}`}>
              {isWsConnected ? 'LINKED' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Sparkles className={`w-3.5 h-3.5 ${isAiOnline ? 'text-cyan-400' : 'text-slate-500'}`} />
            <span className="text-slate-400">AI:</span>
            <span className={isAiOnline ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
              {isAiOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Mic className={`w-3.5 h-3.5 ${isMicActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-slate-400">VOICE:</span>
            <span className={isMicActive ? 'text-cyan-300' : 'text-slate-500'}>
              {isMicActive ? 'LISTENING' : 'STANDBY'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-700/60">
            <span className="text-slate-400">OPERATOR:</span>
            <span className="font-bold text-cyan-300 hud-font tracking-wide uppercase">
              {operatorName}
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Bar */}
      <div className="flex items-center gap-4 sm:gap-6 mono-font text-slate-300">
        <div className="flex items-center gap-1.5" title="CPU Load">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">CPU</span>
          <span className={`font-bold ${cpuPercent > 80 ? 'text-rose-400' : 'text-cyan-300'}`}>
            {cpuPercent}%
          </span>
        </div>

        <div className="flex items-center gap-1.5" title="RAM Utilization">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">RAM</span>
          <span className={`font-bold ${memPercent > 85 ? 'text-amber-400' : 'text-cyan-300'}`}>
            {memPercent}%
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5" title="Disk Free">
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">DISK</span>
          <span className="font-bold text-slate-200">
            {diskFree} GB
          </span>
        </div>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-700/60" title="Local System Time">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-cyan-300 tracking-wider">
            {timeStr}
          </span>
        </div>
      </div>
    </header>
  );
};
