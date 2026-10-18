import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, Settings, Brain, Home, CheckSquare, Zap, 
  LayoutDashboard, Sparkles, Mic, AlertCircle
} from 'lucide-react';
import { useVoiceEngine } from './hooks/useVoiceEngine';
import { JarvisOrb } from './components/JarvisOrb';
import { SystemStatus } from './components/SystemStatus';
import { QuickActions } from './components/QuickActions';
import { ConversationPanel, type ChatMessage } from './components/ConversationPanel';
import { PermissionDialog } from './components/PermissionDialog';
import { BriefingModal } from './components/BriefingModal';
import { MemoryPanel } from './components/MemoryPanel';
import { SmartDevicePanel } from './components/SmartDevicePanel';
import { TaskPanel } from './components/TaskPanel';
import { AutomationPanel } from './components/AutomationPanel';
import { LogsPanel } from './components/LogsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { HoloBackground } from './components/HoloBackground';

type ActiveTab = 'command' | 'memory' | 'devices' | 'tasks' | 'automations' | 'logs' | 'settings';

const getWelcomeGreeting = (name: string = 'sir') => {
  const hour = new Date().getHours();
  let salutation = 'Good morning';
  if (hour >= 12 && hour < 18) {
    salutation = 'Good afternoon';
  } else if (hour >= 18) {
    salutation = 'Good evening';
  }
  return `${salutation}, ${name}. All JARVIS core systems are online and ready for your command.`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('command');
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('jarvis_user_name') || 'sir';
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialName = localStorage.getItem('jarvis_user_name') || 'sir';
    const welcome = getWelcomeGreeting(initialName);
    return [
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: welcome,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  
  // Settings state
  const [wakeWord, setWakeWord] = useState('jarvis');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [voicePitch, setVoicePitch] = useState(0.95);
  const [voiceRate, setVoiceRate] = useState(1.05);

  const handleUpdateUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('jarvis_user_name', name);
  };

  // Dangerous action confirmation state
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    tool: string;
    arguments?: Record<string, any>;
    promptText: string;
    riskLevel?: string;
  } | null>(null);

  // Briefing modal state
  const [briefingData, setBriefingData] = useState<any | null>(null);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const stopSpeakingRef = useRef<((interrupted?: boolean) => void) | null>(null);
  const speakRef = useRef<((text: string, onEnd?: () => void) => void) | null>(null);
  const setAssistantStateRef = useRef<((state: any) => void) | null>(null);

  // Handle incoming speech transcript or text command
  const handleUserCommand = useCallback(async (
    text: string, 
    confirmed: boolean = false, 
    pendingTool?: string, 
    pendingArgs?: any
  ) => {
    if (!text.trim()) return;

    // Halt any ongoing speech playback when a command is dispatched
    stopSpeakingRef.current?.(true);

    // Check if user is confirming or canceling via voice while dialog is open
    if (pendingConfirmation) {
      const lower = text.toLowerCase();
      if (['yes', 'proceed', 'confirm', 'do it', 'sure'].some(w => lower.includes(w))) {
        confirmDangerousAction();
        return;
      } else if (['no', 'cancel', 'stop', 'abort'].some(w => lower.includes(w))) {
        cancelDangerousAction();
        return;
      }
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add operator message to conversation
    const userMsgId = 'msg-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp
      }
    ]);

    // Send through WebSocket if connected, or direct REST API
    try {
      setAssistantStateRef.current?.('THINKING');
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          confirmed,
          pending_tool: pendingTool,
          pending_args: pendingArgs
        })
      });
      const data = await res.json();

      // Check if confirmation is requested
      if (data.requires_confirmation) {
        setPendingConfirmation({
          tool: data.pending_tool,
          arguments: data.pending_args,
          promptText: data.text,
          riskLevel: 'HIGH'
        });
      }

      // Add assistant response to conversation
      const replyMsgId = 'reply-' + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: replyMsgId,
          role: 'assistant',
          content: data.text,
          toolCalls: data.tool_calls,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Vocalize response via Voice Engine
      if (data.text) {
        speakRef.current?.(data.text);
      } else {
        setAssistantStateRef.current?.('IDLE');
      }

    } catch (err: any) {
      console.error(err);
      setAssistantStateRef.current?.('ERROR');
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: "System anomaly detected during neural synthesis, sir.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      speakRef.current?.("System anomaly detected during neural synthesis, sir.");
    }
  }, [pendingConfirmation]);

  // Voice Engine setup
  const {
    isMicActive,
    micPermissionDenied,
    assistantState,
    interimTranscript,
    audioLevel,
    selectedVoice,
    availableVoices,
    setSelectedVoice,
    voiceProvider,
    setVoiceProvider,
    localNeuralVoice,
    updateLocalNeuralVoice,
    fishApiKey,
    updateFishApiKey,
    fishVoiceId,
    updateFishVoiceId,
    toggleListening,
    speak,
    stopSpeaking,
    testVoiceSpeech,
    setAssistantState
  } = useVoiceEngine({
    wakeWord,
    wakeWordEnabled,
    voicePitch,
    voiceRate,
    onSpeechRecognized: handleUserCommand
  });

  stopSpeakingRef.current = stopSpeaking;
  speakRef.current = speak;
  setAssistantStateRef.current = setAssistantState;

  // Confirm dangerous action handler
  const confirmDangerousAction = () => {
    if (!pendingConfirmation) return;
    const { tool, arguments: args } = pendingConfirmation;
    setPendingConfirmation(null);
    handleUserCommand("Confirmed", true, tool, args);
  };

  const cancelDangerousAction = () => {
    setPendingConfirmation(null);
    speak("Action cancelled, sir.");
  };

  // Vocalize welcome greeting on initial load
  const hasSpokenWelcome = useRef(false);
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    const timer = setTimeout(() => {
      if (!hasSpokenWelcome.current) {
        hasSpokenWelcome.current = true;
        const welcomeText = getWelcomeGreeting(userName);
        speak(welcomeText);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [speak, userName]);

  // Open Morning Briefing
  const triggerMorningBriefing = async () => {
    try {
      const res = await fetch('/api/system/briefing');
      const data = await res.json();
      setBriefingData(data);
      setIsBriefingOpen(true);
      speak(data.text);
    } catch (e) {
      console.error(e);
    }
  };

  // Connect WebSocket for live telemetry & events
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Connect to backend port directly or proxy
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/jarvis`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'system.telemetry') {
              setTelemetry(msg.data);
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setIsWsConnected(false);
          ws.close();
        };

        wsRef.current = ws;
      } catch (err) {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#05070A] text-[#EAF4FA] relative">
      {/* 0. Sci-Fi Holographic Interactive Background */}
      <HoloBackground
        state={assistantState}
        audioLevels={audioLevel}
        isMicActive={isMicActive}
      />

      {/* 1. Top HUD Telemetry Status Bar */}
      <SystemStatus
        telemetry={telemetry}
        isAiOnline={true}
        isMicActive={isMicActive}
        isWsConnected={isWsConnected}
        operatorName={userName}
      />

      {/* 1b. Interactive Mic Activation & Live Wake-Word Status Banner */}
      {!isMicActive && (
        <div 
          onClick={toggleListening}
          className="bg-gradient-to-r from-cyan-950 via-sky-950 to-cyan-950 border-b border-cyan-400/50 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-cyan-900/60 transition-all shadow-[0_4px_20px_rgba(92,200,255,0.2)] shrink-0"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="text-xs hud-font font-bold text-cyan-200 tracking-wider">
              MICROPHONE STANDBY // CLICK ANYWHERE HERE OR PRESS &ldquo;ACTIVATE&rdquo; TO START WAKE-WORD DETECTION (&ldquo;JARVIS&rdquo;)
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 text-xs font-bold hud-font">
            <Mic className="w-3.5 h-3.5 text-cyan-300" />
            <span>ACTIVATE VOICE</span>
          </div>
        </div>
      )}

      {micPermissionDenied && (
        <div className="bg-red-950 border-b border-red-500/60 px-4 py-2 flex items-center gap-2 text-rose-200 text-xs hud-font shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>MICROPHONE ACCESS BLOCKED // Please allow microphone access in your browser address bar to use voice commands.</span>
        </div>
      )}

      {isMicActive && (
        <div className="bg-[#060D17] border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-between text-xs mono-font shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 font-bold">JARVIS LISTENING</span>
            <span className="text-slate-400 hidden sm:inline">| Call <span className="text-cyan-300 font-bold">&ldquo;{wakeWord}&rdquo;</span> or speak your instruction directly</span>
          </div>
          {interimTranscript && (
            <div className="flex items-center gap-2 text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded border border-cyan-500/40 max-w-md truncate">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Heard:</span>
              <span className="italic font-mono text-cyan-200">&ldquo;{interimTranscript}&rdquo;</span>
            </div>
          )}
        </div>
      )}

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-56 bg-[#080D14]/90 border-b lg:border-b-0 lg:border-r border-cyan-500/20 flex lg:flex-col justify-between p-3 shrink-0 backdrop-blur-md">
          <div className="flex lg:flex-col gap-1 w-full overflow-x-auto lg:overflow-visible">
            {[
              { id: 'command', label: 'Command Hub', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" /> },
              { id: 'tasks', label: 'Productivity', icon: <CheckSquare className="w-4 h-4" /> },
              { id: 'devices', label: 'Smart Home', icon: <Home className="w-4 h-4" /> },
              { id: 'automations', label: 'Automations', icon: <Zap className="w-4 h-4" /> },
              { id: 'logs', label: 'Audit Logs', icon: <Shield className="w-4 h-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hud-font transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 shadow-[0_0_15px_rgba(92,200,255,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-cyan-400' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="hidden lg:block p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-[11px] mono-font text-slate-400">
            <div className="text-cyan-400 font-bold hud-font mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> VOICE RECOGNITION
            </div>
            Say <span className="text-cyan-300 font-bold">&ldquo;{wakeWord}&rdquo;</span> to activate audio interface.
          </div>
        </aside>

        {/* Center Main Stage (Dynamic Tabs) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'command' && (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6">
              {/* Top Subtitle Banner */}
              <div className="text-center">
                <h1 className="hud-font font-bold text-2xl sm:text-3xl text-cyan-200 tracking-widest cyan-glow">
                  AUTONOMOUS DESKTOP INTELLIGENCE
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                  Neural speech processing, restricted operating-system tooling, file sandbox, and smart IoT control.
                </p>
              </div>

              {/* Central Reactive Orb Visualizer */}
              <div className="flex-1 flex items-center justify-center my-2">
                <JarvisOrb
                  state={assistantState}
                  audioLevels={audioLevel}
                  onClick={toggleListening}
                  onTestVoice={testVoiceSpeech}
                  isMicActive={isMicActive}
                  interimTranscript={interimTranscript}
                  micPermissionDenied={micPermissionDenied}
                  statusText={
                    assistantState === 'LISTENING' 
                      ? 'Listening for "Jarvis" or voice instruction...'
                      : assistantState === 'SPEAKING'
                      ? 'Vocalizing audio response...'
                      : assistantState === 'THINKING'
                      ? 'Analyzing natural language intent...'
                      : undefined
                  }
                />
              </div>

              {/* Quick Actions Bar */}
              <QuickActions
                isMicActive={isMicActive}
                onToggleMic={toggleListening}
                onActionClick={handleUserCommand}
                onOpenBriefing={triggerMorningBriefing}
              />
            </div>
          )}

          {activeTab === 'memory' && <MemoryPanel />}
          {activeTab === 'devices' && <SmartDevicePanel />}
          {activeTab === 'tasks' && <TaskPanel />}
          {activeTab === 'automations' && <AutomationPanel />}
          {activeTab === 'logs' && <LogsPanel />}
          {activeTab === 'settings' && (
            <SettingsPanel
              userName={userName}
              setUserName={handleUpdateUserName}
              wakeWord={wakeWord}
              setWakeWord={setWakeWord}
              wakeWordEnabled={wakeWordEnabled}
              setWakeWordEnabled={setWakeWordEnabled}
              voicePitch={voicePitch}
              setVoicePitch={setVoicePitch}
              voiceRate={voiceRate}
              setVoiceRate={setVoiceRate}
              availableVoices={availableVoices}
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
              voiceProvider={voiceProvider}
              setVoiceProvider={setVoiceProvider}
              localNeuralVoice={localNeuralVoice}
              updateLocalNeuralVoice={updateLocalNeuralVoice}
              fishApiKey={fishApiKey}
              updateFishApiKey={updateFishApiKey}
              fishVoiceId={fishVoiceId}
              updateFishVoiceId={updateFishVoiceId}
              onTestVoice={testVoiceSpeech}
            />
          )}
        </main>

        {/* Right Side: Conversation Log Panel */}
        <aside className="w-full lg:w-[420px] xl:w-[460px] h-72 lg:h-full shrink-0 z-10">
          <ConversationPanel
            messages={messages}
            onSendMessage={handleUserCommand}
            isSpeaking={assistantState === 'SPEAKING'}
            onStopSpeaking={stopSpeaking}
            isMicActive={isMicActive}
            onToggleMic={toggleListening}
            onSpeakText={speak}
            assistantState={assistantState}
          />
        </aside>
      </div>

      {/* Security Permission Dialog Intercept */}
      <PermissionDialog
        isOpen={pendingConfirmation !== null}
        tool={pendingConfirmation?.tool || ''}
        arguments={pendingConfirmation?.arguments}
        promptText={pendingConfirmation?.promptText || ''}
        riskLevel={pendingConfirmation?.riskLevel || 'HIGH'}
        onConfirm={confirmDangerousAction}
        onCancel={cancelDangerousAction}
      />

      {/* Morning Briefing Modal */}
      <BriefingModal
        isOpen={isBriefingOpen}
        briefing={briefingData}
        onClose={() => setIsBriefingOpen(false)}
        onSpeak={speak}
      />
    </div>
  );
}
