import React from 'react';
import type { AssistantState } from '../hooks/useVoiceEngine';
import { Mic, MicOff, Volume2, Radio, AlertCircle, Sparkles } from 'lucide-react';

interface JarvisOrbProps {
  state: AssistantState;
  audioLevels: number[];
  onClick?: () => void;
  statusText?: string;
  onTestVoice?: () => void;
  isMicActive?: boolean;
  interimTranscript?: string;
  micPermissionDenied?: boolean;
}

export const JarvisOrb: React.FC<JarvisOrbProps> = ({
  state,
  audioLevels,
  onClick,
  statusText,
  onTestVoice,
  isMicActive,
  interimTranscript,
  micPermissionDenied
}) => {
  const getStateColors = () => {
    switch (state) {
      case 'LISTENING':
        return {
          glow: 'rgba(92, 200, 255, 0.85)',
          core: '#5CC8FF',
          outerRing: 'rgba(92, 200, 255, 0.7)',
          accent: 'text-cyan-300',
          label: 'VOICE MATRIX LISTENING',
          sublabel: 'Say "Jarvis" or issue your command...',
          statusGradient: 'from-cyan-500/20 to-sky-600/30'
        };
      case 'THINKING':
        return {
          glow: 'rgba(192, 132, 252, 0.9)',
          core: '#C084FC',
          outerRing: 'rgba(192, 132, 252, 0.75)',
          accent: 'text-purple-300',
          label: 'NEURAL REASONING MATRIX',
          sublabel: 'Ollama is synthesizing intelligent response...',
          statusGradient: 'from-purple-500/20 to-indigo-600/30'
        };
      case 'SPEAKING':
        return {
          glow: 'rgba(98, 214, 167, 0.95)',
          core: '#62D6A7',
          outerRing: 'rgba(98, 214, 167, 0.8)',
          accent: 'text-emerald-300',
          label: 'VOCAL SYNTHESIS ACTIVE',
          sublabel: 'Jarvis is speaking...',
          statusGradient: 'from-emerald-500/20 to-teal-600/30'
        };
      case 'EXECUTING':
        return {
          glow: 'rgba(255, 209, 102, 0.85)',
          core: '#FFD166',
          outerRing: 'rgba(255, 209, 102, 0.7)',
          accent: 'text-amber-300',
          label: 'SYSTEM EXECUTION',
          sublabel: 'Operating system tool in progress...',
          statusGradient: 'from-amber-500/20 to-yellow-600/30'
        };
      case 'ERROR':
        return {
          glow: 'rgba(255, 107, 107, 0.9)',
          core: '#FF6B6B',
          outerRing: 'rgba(255, 107, 107, 0.7)',
          accent: 'text-rose-300',
          label: 'SYSTEM ANOMALY',
          sublabel: 'Permission or neural failure...',
          statusGradient: 'from-rose-500/20 to-red-600/30'
        };
      case 'IDLE':
      default:
        return {
          glow: 'rgba(92, 200, 255, 0.45)',
          core: '#5CC8FF',
          outerRing: 'rgba(92, 200, 255, 0.35)',
          accent: 'text-cyan-400',
          label: isMicActive ? 'STANDBY // READY' : 'MICROPHONE STANDBY',
          sublabel: isMicActive ? 'Say "Jarvis" or type a command' : 'Click to enable microphone & wake word',
          statusGradient: 'from-cyan-500/10 to-blue-600/20'
        };
    }
  };

  const current = getStateColors();
  const avgAudio = audioLevels.reduce((a, b) => a + b, 0) / (audioLevels.length || 1);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-xl mx-auto py-2">
      {/* Outer Holographic Reactor Housing */}
      <div 
        onClick={onClick}
        title={isMicActive ? "Click to pause microphone" : "Click to activate microphone & wake word"}
        className="relative w-72 h-72 sm:w-84 sm:h-84 cursor-pointer flex items-center justify-center group"
      >
        {/* Layer 1: Ambient Radial Flare with Breath & Audio Pulsing */}
        <div 
          className="absolute inset-0 rounded-full filter blur-3xl transition-all duration-700 pointer-events-none"
          style={{ 
            background: current.glow,
            transform: state === 'SPEAKING' 
              ? `scale(${1.15 + (avgAudio / 70)})` 
              : state === 'THINKING' 
              ? 'scale(1.2)' 
              : 'scale(1.0)',
            opacity: state === 'IDLE' ? 0.35 : 0.7
          }}
        />

        {/* Layer 2: Ultra-outer telemetry radar scale with tick marks */}
        <div 
          className="absolute w-full h-full rounded-full border border-cyan-500/20 pointer-events-none flex items-center justify-center"
          style={{
            animation: state === 'THINKING' ? 'spin-slow 6s linear infinite' : 'spin-slow 35s linear infinite'
          }}
        >
          {/* Degree angle indicators */}
          <span className="absolute top-1 text-[8px] mono-font text-cyan-400/70">000°</span>
          <span className="absolute right-1 text-[8px] mono-font text-cyan-400/70">090°</span>
          <span className="absolute bottom-1 text-[8px] mono-font text-cyan-400/70">180°</span>
          <span className="absolute left-1 text-[8px] mono-font text-cyan-400/70">270°</span>
          
          {/* Orbital Satellite Node */}
          <div 
            className="absolute -top-1 w-2.5 h-2.5 rounded-full shadow-[0_0_12px_#5CC8FF]"
            style={{ backgroundColor: current.core }}
          />
        </div>

        {/* Layer 3: Dashed rotating gear ring (Fast spin on Thinking) */}
        <div 
          className="absolute w-[88%] h-[88%] rounded-full border-2 border-dashed pointer-events-none transition-all duration-500"
          style={{ 
            borderColor: current.outerRing,
            animation: state === 'THINKING' 
              ? 'spin-slow 3s linear infinite' 
              : 'spin-slow 22s linear infinite'
          }}
        />

        {/* Layer 4: Reverse Segmented Dotted Ring */}
        <div 
          className="absolute w-[76%] h-[76%] rounded-full border border-dotted border-cyan-300/40 pointer-events-none"
          style={{ 
            animation: state === 'THINKING' 
              ? 'spin-reverse 4s linear infinite' 
              : 'spin-reverse 18s linear infinite'
          }}
        />

        {/* Layer 5: HUD Crosshair Brackets with Cardinal Dots */}
        <div className="absolute w-[66%] h-[66%] rounded-full border border-cyan-500/30 flex items-center justify-center pointer-events-none">
          <div className="absolute w-full h-[1px] bg-cyan-400/20 rotate-45" />
          <div className="absolute w-full h-[1px] bg-cyan-400/20 -rotate-45" />
          <div className="absolute top-0 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_#5CC8FF]" />
          <div className="absolute bottom-0 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_#5CC8FF]" />
          <div className="absolute left-0 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_#5CC8FF]" />
          <div className="absolute right-0 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_#5CC8FF]" />
        </div>

        {/* Layer 6: Middle Pulse Ring (Expands dynamically on vocal feedback) */}
        <div 
          className="absolute w-[54%] h-[54%] rounded-full border flex items-center justify-center transition-all duration-150 pointer-events-none"
          style={{
            borderColor: current.core,
            boxShadow: `0 0 24px ${current.glow}, inset 0 0 16px ${current.glow}`,
            transform: state === 'SPEAKING' 
              ? `scale(${1.05 + (avgAudio / 90)})` 
              : state === 'THINKING'
              ? 'scale(1.08)'
              : 'scale(1.0)'
          }}
        >
          {/* Inner Gyro Ring */}
          <div 
            className="w-[88%] h-[88%] rounded-full border border-cyan-200/40"
            style={{
              animation: 'spin-slow 10s linear infinite'
            }}
          />
        </div>

        {/* Layer 7: Core Arc Reactor Sphere */}
        <div 
          className="relative w-28 h-28 sm:w-34 sm:h-34 rounded-full flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-105 z-10"
          style={{ 
            background: 'radial-gradient(circle at 35% 35%, rgba(20, 45, 75, 0.95) 0%, rgba(6, 12, 20, 0.98) 70%, rgba(2, 4, 8, 1) 100%)',
            border: `2px solid ${current.core}`,
            boxShadow: `0 0 40px ${current.glow}, inset 0 0 25px ${current.glow}`
          }}
        >
          {/* Inner Energy Core with Pulse Sparkle */}
          <div 
            className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg hud-font tracking-widest text-cyan-50 relative transition-transform duration-200"
            style={{ 
              backgroundColor: current.core,
              boxShadow: `0 0 28px ${current.core}`,
              transform: state === 'SPEAKING' ? `scale(${1 + avgAudio / 100})` : 'scale(1)'
            }}
          >
            {state === 'THINKING' ? (
              <Sparkles className="w-5 h-5 text-white animate-spin" />
            ) : isMicActive ? (
              <span>◉</span>
            ) : (
              <span>◎</span>
            )}
          </div>

          <span className="text-[10px] mono-font tracking-widest font-bold mt-1 text-cyan-200 uppercase">
            {state === 'IDLE' ? (isMicActive ? 'STANDBY' : 'CLICK ME') : state}
          </span>
        </div>
      </div>

      {/* Kinetic Audio Frequency Spectrum */}
      <div className="flex items-center justify-center gap-1.5 h-10 mt-3 px-6 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        {audioLevels.slice(0, 24).map((lvl, idx) => (
          <div
            key={idx}
            className="w-1 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(4, Math.min(34, lvl))}px`,
              backgroundColor: current.core,
              boxShadow: isMicActive && lvl > 8 ? `0 0 8px ${current.core}` : 'none',
              opacity: isMicActive ? 0.95 : 0.25
            }}
          />
        ))}
      </div>

      {/* State Badge & Prompt Label */}
      <div className="mt-3 text-center px-4">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r ${current.statusGradient} border border-cyan-500/40 shadow-[0_0_15px_rgba(92,200,255,0.15)]`}>
          <span 
            className={`w-2 h-2 rounded-full ${isMicActive || state === 'THINKING' ? 'animate-ping' : ''}`}
            style={{ backgroundColor: current.core }}
          />
          <span className={`hud-font font-bold text-xs tracking-wider ${current.accent}`}>
            {current.label}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-1 max-w-sm truncate">
          {statusText || current.sublabel}
        </p>
      </div>

      {/* Real-time Voice Recognition Ticker */}
      {interimTranscript && (
        <div className="mt-3 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/70 shadow-[0_0_20px_rgba(92,200,255,0.35)] flex items-center gap-2 max-w-md animate-pulse">
          <Radio className="w-3.5 h-3.5 text-cyan-300 shrink-0 animate-spin" />
          <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Heard:</span>
          <span className="text-xs mono-font font-bold text-cyan-200 truncate">
            &ldquo;{interimTranscript}&rdquo;
          </span>
        </div>
      )}

      {/* Permission Warning */}
      {micPermissionDenied && (
        <div className="mt-3 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 max-w-md">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Microphone access blocked. Please enable microphone permission in your browser address bar.</span>
        </div>
      )}

      {/* Audio Quick Test and Mic Controls */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onClick}
          className={`px-4 py-2 rounded-lg hud-font font-bold text-xs flex items-center gap-2 transition-all ${
            isMicActive
              ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-300 shadow-[0_0_18px_rgba(92,200,255,0.5)]'
              : 'bg-cyan-600/30 hover:bg-cyan-500/40 border border-cyan-400/70 text-cyan-200 shadow-[0_0_15px_rgba(92,200,255,0.35)] animate-pulse'
          }`}
        >
          {isMicActive ? <Mic className="w-4 h-4 text-cyan-300" /> : <MicOff className="w-4 h-4 text-amber-300" />}
          <span>{isMicActive ? 'MIC ONLINE // SAY "JARVIS"' : 'CLICK TO ENABLE MIC'}</span>
        </button>

        {onTestVoice && (
          <button
            onClick={onTestVoice}
            className="px-3.5 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 text-xs font-semibold hud-font flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(98,214,167,0.2)]"
            title="Test British speech synthesis audio playback"
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>TEST VOICE SPEECH</span>
          </button>
        )}
      </div>
    </div>
  );
};
