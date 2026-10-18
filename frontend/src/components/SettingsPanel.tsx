import React, { useState } from 'react';
import { Settings as SettingsIcon, Mic, Shield, Volume2, Save, ExternalLink, Sparkles, Check, Cpu, Globe, User } from 'lucide-react';
import type { VoiceProvider } from '../hooks/useVoiceEngine';

interface SettingsPanelProps {
  userName?: string;
  setUserName?: (name: string) => void;
  wakeWord: string;
  setWakeWord: (val: string) => void;
  wakeWordEnabled: boolean;
  setWakeWordEnabled: (val: boolean) => void;
  voicePitch: number;
  setVoicePitch: (val: number) => void;
  voiceRate: number;
  setVoiceRate: (val: number) => void;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
  voiceProvider: VoiceProvider;
  setVoiceProvider: (provider: VoiceProvider) => void;
  localNeuralVoice?: string;
  updateLocalNeuralVoice?: (id: string) => void;
  fishApiKey: string;
  updateFishApiKey: (key: string) => void;
  fishVoiceId: string;
  updateFishVoiceId: (id: string) => void;
  onTestVoice: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  userName = 'sir',
  setUserName,
  wakeWord,
  setWakeWord,
  wakeWordEnabled,
  setWakeWordEnabled,
  voicePitch,
  setVoicePitch,
  voiceRate,
  setVoiceRate,
  availableVoices,
  selectedVoice,
  setSelectedVoice,
  voiceProvider,
  setVoiceProvider,
  localNeuralVoice = 'en-GB-RyanNeural',
  updateLocalNeuralVoice,
  fishApiKey,
  updateFishApiKey,
  fishVoiceId,
  updateFishVoiceId,
  onTestVoice
}) => {
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    // Sync with backend voice config
    fetch('/api/voice/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: voiceProvider,
        fish_audio_api_key: fishApiKey,
        fish_audio_voice_id: fishVoiceId,
        fish_audio_model: 's2.1-pro-free'
      })
    }).catch(console.error);

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="hud-font font-bold text-lg text-cyan-200">
              JARVIS SYSTEM CONFIGURATION
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operator profile, free local neural voice, Web Speech API, wake-word, and safety limits.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn-jarvis text-xs"
        >
          {savedNotice ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          {savedNotice ? 'CONFIGURATION SAVED!' : 'APPLY SETTINGS'}
        </button>
      </div>

      {/* Operator Profile Section */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-4 shadow-[0_0_20px_rgba(92,200,255,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 hud-font">
            <User className="w-4 h-4 text-cyan-400" />
            <span>OPERATOR PROFILE & CALLSIGN</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 mono-font">
            ACTIVE: {userName.toUpperCase()}
          </span>
        </div>

        <div>
          <label className="text-xs text-slate-300 block mb-1 font-semibold">
            Your Name / Callsign (Used in Greetings & Executive Briefings)
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName?.(e.target.value)}
            placeholder="sir"
            className="w-full max-w-md bg-slate-950/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-cyan-200 focus:border-cyan-400 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            JARVIS will welcome you with personalized greetings (*&ldquo;Good morning, {userName}&rdquo;*) when the system initializes.
          </p>
        </div>
      </div>

      {/* Primary Voice Synthesis Engine Selector */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-4 shadow-[0_0_20px_rgba(92,200,255,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 hud-font">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>VOICE SYNTHESIS ENGINE</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 mono-font">
            {voiceProvider === 'local_neural' ? 'OPTION 2: LOCAL NEURAL' : voiceProvider === 'browser' ? 'OPTION 1: SERVERLESS WEB SPEECH' : 'CLOUD FISH AUDIO'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Choice 1: Local Neural TTS (Option 2) */}
          <button
            onClick={() => setVoiceProvider('local_neural')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              voiceProvider === 'local_neural'
                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(92,200,255,0.3)] ring-1 ring-cyan-400'
                : 'bg-black/40 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="hud-font font-bold text-xs text-cyan-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Local Neural
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                  RECOMMENDED
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Studio-grade British JARVIS voice (<span className="text-cyan-300 font-mono">RyanNeural</span>). 100% free, runs on local FastAPI backend.
              </p>
            </div>
            <span className="text-[10px] text-cyan-400 font-bold mt-2">Zero API keys • Open Source</span>
          </button>

          {/* Choice 2: Browser Web Speech API (Option 1) */}
          <button
            onClick={() => setVoiceProvider('browser')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              voiceProvider === 'browser'
                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(92,200,255,0.3)] ring-1 ring-cyan-400'
                : 'bg-black/40 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="hud-font font-bold text-xs text-cyan-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" /> Web Speech API
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-300 font-bold">
                  SERVERLESS
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Zero latency synthesis running directly in the browser with tuned British pitch (0.95) & rate (1.05).
              </p>
            </div>
            <span className="text-[10px] text-sky-400 font-bold mt-2">Zero Latency • 100% Free</span>
          </button>

          {/* Choice 3: Fish Audio S2.1 Pro */}
          <button
            onClick={() => setVoiceProvider('fish_audio')}
            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
              voiceProvider === 'fish_audio'
                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(92,200,255,0.3)] ring-1 ring-cyan-400'
                : 'bg-black/40 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="hud-font font-bold text-xs text-cyan-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Fish Audio S2.1
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40 text-purple-300 font-bold">
                  CLOUD CLONE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                AI voice cloning model from Fish Audio API. Requires free API key and custom voice reference ID.
              </p>
            </div>
            <span className="text-[10px] text-purple-400 font-bold mt-2">Voice Cloning • Free Tier</span>
          </button>
        </div>

        {/* Dynamic Detail Settings based on active provider */}
        {voiceProvider === 'local_neural' && (
          <div className="p-4 rounded-lg bg-black/40 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-slate-200 font-semibold text-xs block">Local Neural Model Voice</label>
                <p className="text-[11px] text-slate-400">High-fidelity British AI models rendered on your local PC.</p>
              </div>
              <select
                value={localNeuralVoice}
                onChange={(e) => updateLocalNeuralVoice?.(e.target.value)}
                className="bg-slate-900 border border-cyan-500/40 rounded-lg px-3 py-1.5 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 mono-font"
              >
                <option value="en-GB-RyanNeural">JARVIS British Male (Ryan) [Recommended]</option>
                <option value="en-GB-ThomasNeural">British Male (Thomas)</option>
                <option value="en-GB-SoniaNeural">British Female (Sonia)</option>
                <option value="en-US-GuyNeural">US Male (Guy)</option>
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>Status: <strong className="text-emerald-400">FastAPI Neural Backend Ready</strong></span>
              <button
                onClick={onTestVoice}
                className="px-3 py-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-xs font-semibold hud-font hover:bg-cyan-900/60"
              >
                Test Voice Audio
              </button>
            </div>
          </div>
        )}

        {voiceProvider === 'browser' && (
          <div className="p-4 rounded-lg bg-black/40 border border-cyan-500/30 space-y-3">
            <div>
              <label className="text-slate-200 block mb-1 font-semibold text-xs">Browser Speech Voice</label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const v = availableVoices.find(item => item.name === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-slate-400 mb-1 text-xs">
                  <span>Speaking Rate</span>
                  <span className="mono-font text-cyan-300">{voiceRate}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={voiceRate}
                  onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1 text-xs">
                  <span>Voice Pitch</span>
                  <span className="mono-font text-cyan-300">{voicePitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={voicePitch}
                  onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {voiceProvider === 'fish_audio' && (
          <div className="p-4 rounded-lg bg-black/40 border border-purple-500/30 space-y-3 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">Fish Audio API Key</label>
                <a 
                  href="https://fish.audio/app/api-keys" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-purple-400 hover:underline text-[11px] inline-flex items-center gap-1"
                >
                  Get Free Key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={fishApiKey}
                onChange={(e) => updateFishApiKey(e.target.value)}
                placeholder="Paste your Fish Audio API key here..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 mono-font"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">JARVIS Voice Model ID</label>
              <input
                type="text"
                value={fishVoiceId}
                onChange={(e) => updateFishVoiceId(e.target.value)}
                placeholder="e.g. 9a9cf47702da476aa4629e2506d4a857"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-400 mono-font"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Voice Recognition & Wake-Word */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 hud-font">
            <Mic className="w-4 h-4" />
            <span>VOICE RECOGNITION & WAKE-WORD</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Wake-Word Phrase</label>
              <input
                type="text"
                value={wakeWord}
                onChange={(e) => setWakeWord(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Saying this call name triggers JARVIS to chime and acknowledge.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-slate-800">
              <div>
                <span className="font-semibold text-slate-200 block">Wake-Word Detection</span>
                <span className="text-slate-500 text-[11px]">Continuously listen for &quot;{wakeWord}&quot;</span>
              </div>
              <input
                type="checkbox"
                checked={wakeWordEnabled}
                onChange={(e) => setWakeWordEnabled(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Safety & Authorization Boundaries */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 hud-font">
            <Shield className="w-4 h-4" />
            <span>OPERATING SYSTEM SAFETY PROTOCOLS</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <span>Risk Tier 1 (Low): Telemetry, Read-Only FS, Weather</span>
              <span className="text-emerald-400 font-bold">AUTO-PERMIT</span>
            </div>
            <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-500/30 flex items-center justify-between">
              <span>Risk Tier 2 (Medium): App Launch, Safe Writing</span>
              <span className="text-sky-400 font-bold">AUTO-LOGGED</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
              <span>Risk Tier 3 (High): App Termination, Reminders</span>
              <span className="text-amber-400 font-bold">AUDITED</span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
              <span>Risk Tier 4 (Critical): Shutdown, Deletion, Execution</span>
              <span className="text-rose-400 font-bold">INTERCEPT REQUIRED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
