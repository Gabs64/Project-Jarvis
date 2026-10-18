import { 
  Camera, Sun, Globe, Lock, Home, 
  CheckSquare, Mic, MicOff, RefreshCw
} from 'lucide-react';

interface QuickActionsProps {
  isMicActive: boolean;
  onToggleMic: () => void;
  onActionClick: (command: string) => void;
  onOpenBriefing: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  isMicActive,
  onToggleMic,
  onActionClick,
  onOpenBriefing
}) => {
  const actions = [
    {
      label: 'Briefing',
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      onClick: onOpenBriefing,
      title: 'Generate Full Morning Briefing'
    },
    {
      label: 'Screenshot',
      icon: <Camera className="w-4 h-4 text-cyan-400" />,
      onClick: () => onActionClick('Take a screenshot'),
      title: 'Capture Desktop Display'
    },
    {
      label: 'Search Web',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      onClick: () => onActionClick('Search the web for latest AI news'),
      title: 'Perform Search'
    },
    {
      label: 'Lock PC',
      icon: <Lock className="w-4 h-4 text-rose-400" />,
      onClick: () => onActionClick('Lock my computer'),
      title: 'Lock Windows Session'
    },
    {
      label: 'Smart Lights',
      icon: <Home className="w-4 h-4 text-emerald-400" />,
      onClick: () => onActionClick('Turn on the living room lights'),
      title: 'Toggle Living Room Lights'
    },
    {
      label: 'Reminders',
      icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
      onClick: () => onActionClick('What are my upcoming reminders?'),
      title: 'Query Scheduled Reminders'
    },
    {
      label: 'Apps Running',
      icon: <RefreshCw className="w-4 h-4 text-indigo-400" />,
      onClick: () => onActionClick('What applications are running?'),
      title: 'List Active Applications'
    }
  ];

  return (
    <div className="w-full flex items-center justify-center gap-2 flex-wrap py-2 px-4">
      {/* Primary Voice Button */}
      <button
        onClick={onToggleMic}
        className={`px-4 py-2 rounded-lg hud-font font-bold text-xs flex items-center gap-2 transition-all ${
          isMicActive 
            ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(92,200,255,0.4)] animate-pulse'
            : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300'
        }`}
      >
        {isMicActive ? <Mic className="w-4 h-4 text-cyan-300" /> : <MicOff className="w-4 h-4 text-slate-400" />}
        {isMicActive ? 'MIC ACTIVE' : 'VOICE INPUT'}
      </button>

      {/* Quick Action Chips */}
      {actions.map((act, index) => (
        <button
          key={index}
          onClick={act.onClick}
          title={act.title}
          className="bg-slate-900/70 hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-cyan-200 px-3 py-1.5 rounded-lg text-xs hud-font flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
        >
          {act.icon}
          <span>{act.label}</span>
        </button>
      ))}
    </div>
  );
};
