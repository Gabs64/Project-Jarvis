import { useState, useEffect, useRef, useCallback } from 'react';

export type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'EXECUTING' | 'ERROR';
export type VoiceProvider = 'local_neural' | 'fish_audio' | 'browser';

interface UseVoiceEngineProps {
  wakeWord?: string;
  wakeWordEnabled?: boolean;
  voicePitch?: number;
  voiceRate?: number;
  onSpeechRecognized: (transcript: string) => void;
  onStateChange?: (state: AssistantState) => void;
}

// Shared AudioContext for chimes
let sharedAudioCtx: AudioContext | null = null;

const getSharedAudioContext = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

// Persistent HTML5 Audio element for neural speech playback
const getSpeechAudioPlayer = (): HTMLAudioElement => {
  let player = document.getElementById('jarvis-speech-player') as HTMLAudioElement;
  if (!player) {
    player = document.createElement('audio');
    player.id = 'jarvis-speech-player';
    player.style.display = 'none';
    player.volume = 1.0;
    document.body.appendChild(player);
  }
  return player;
};

// Cybernetic Web Audio API chimes
const playAudioChime = (type: 'activate' | 'acknowledge' | 'wake') => {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (type === 'activate' || type === 'wake') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc1.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.14); // E6
      osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc2.frequency.exponentialRampToValueAtTime(1975.5, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.17);
      osc2.stop(ctx.currentTime + 0.17);
    } else if (type === 'acknowledge') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.09); // C6

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    console.warn("Chime notice:", e);
  }
};

const containsWakeWord = (raw: string, customWakeWord = 'jarvis'): boolean => {
  if (!raw) return false;
  const lower = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lower) return false;

  const target = (customWakeWord || 'jarvis').toLowerCase().trim();
  if (lower.includes(target)) return true;

  // Broad list of speech recognition phonetic variations for "jarvis"
  const patterns = [
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?jarvis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?javis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?jervis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?jar\s*vis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?travis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?service\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?harvest\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?darvis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?charvis\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?job\s*is\b/i,
    /\b(?:hey\s+|hi\s+|ok\s+|okay\s+|yo\s+)?j\s*a\s*r\s*v\s*i\s*s\b/i,
  ];

  return patterns.some(p => p.test(lower));
};

const extractCommand = (raw: string, customWakeWord = 'jarvis'): string => {
  let clean = raw.trim();
  const pattern = new RegExp(
    `^(?:hey\\s+|hi\\s+|ok\\s+|okay\\s+|yo\\s+)?(?:${customWakeWord}|jarvis|javis|jervis|jar\\s*vis|travis|service|harvest|darvis|charvis|job\\s*is)[,\\s.!?:;]*`,
    'i'
  );
  clean = clean.replace(pattern, '').trim();
  return clean;
};

// Recognizes clear, high-intent actions even without an explicit wake word
const isDirectCommand = (raw: string): boolean => {
  if (!raw) return false;
  const lower = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!lower) return false;
  const directPatterns = [
    /^(?:open|launch|start|run)\b/i,
    /^(?:close|exit|terminate|kill)\b/i,
    /^(?:play|pause|resume|next|previous|prev)\b/i,
    /^(?:volume\s+(?:up|down|mute|increase|decrease)|mute|unmute)\b/i,
    /^(?:what(?:'s|\s+is)\s+(?:the\s+)?(?:time|date|day|weather))\b/i,
    /^(?:take\s+(?:a\s+)?screenshot|capture\s+screen|lock\s+(?:screen|pc|computer|workstation))\b/i,
    /^(?:system\s+status|how\s+is\s+my\s+computer|system\s+metrics|system\s+telemetry)\b/i,
    /^(?:search|google|look\s+up|find)\b/i,
    /^(?:turn\s+(?:on|off)|switch\s+(?:on|off))\b/i,
    /^(?:remind\s+me|set\s+(?:a\s+)?reminder)\b/i,
    /^(?:stop|quiet|cancel|silence)\b/i,
    /^spotify\b/i
  ];
  return directPatterns.some(pattern => pattern.test(lower));
};

export function useVoiceEngine({
  wakeWord = 'jarvis',
  wakeWordEnabled = true,
  voicePitch = 0.95,
  voiceRate = 1.05,
  onSpeechRecognized,
  onStateChange
}: UseVoiceEngineProps) {
  const [isMicActive, setIsMicActive] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(24).fill(8));
  
  // Browser Speech Synthesis state
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Voice Provider state
  const [voiceProvider, setVoiceProviderState] = useState<VoiceProvider>(() => {
    return (localStorage.getItem('jarvis_voice_provider') as VoiceProvider) || (import.meta.env.VITE_VOICE_PROVIDER as VoiceProvider) || 'local_neural';
  });
  const [localNeuralVoice, setLocalNeuralVoice] = useState<string>(() => {
    return localStorage.getItem('jarvis_local_neural_voice') || import.meta.env.VITE_LOCAL_NEURAL_VOICE || 'en-GB-RyanNeural';
  });
  const [fishApiKey, setFishApiKey] = useState<string>(() => {
    return localStorage.getItem('jarvis_fish_api_key') || import.meta.env.VITE_FISH_AUDIO_API_KEY || '';
  });
  const [fishVoiceId, setFishVoiceId] = useState<string>(() => {
    return localStorage.getItem('jarvis_fish_voice_id') || import.meta.env.VITE_FISH_AUDIO_VOICE_ID || '9a9cf47702da476aa4629e2506d4a857';
  });

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const currentSpeakingTextRef = useRef<string>('');
  const isMicActiveRef = useRef<boolean>(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const lastWakeWordTimeRef = useRef<number>(0);
  const lastSpeechEndTimeRef = useRef<number>(0);
  const listeningTimeoutRef = useRef<any>(null);
  const restartTimerRef = useRef<any>(null);
  const lastRestartTimeRef = useRef<number>(0);
  const visualizerIntervalRef = useRef<any>(null);

  // Sync refs to prevent stale closures inside speech recognition
  const assistantStateRef = useRef<AssistantState>(assistantState);
  assistantStateRef.current = assistantState;

  const wakeWordRef = useRef<string>(wakeWord);
  wakeWordRef.current = wakeWord;

  const wakeWordEnabledRef = useRef<boolean>(wakeWordEnabled);
  wakeWordEnabledRef.current = wakeWordEnabled;

  const onSpeechRecognizedRef = useRef(onSpeechRecognized);
  onSpeechRecognizedRef.current = onSpeechRecognized;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const setVoiceProvider = (provider: VoiceProvider) => {
    setVoiceProviderState(provider);
    localStorage.setItem('jarvis_voice_provider', provider);
  };

  const updateLocalNeuralVoice = (voiceId: string) => {
    setLocalNeuralVoice(voiceId);
    localStorage.setItem('jarvis_local_neural_voice', voiceId);
  };

  const updateFishApiKey = (key: string) => {
    setFishApiKey(key);
    localStorage.setItem('jarvis_fish_api_key', key);
  };

  const updateFishVoiceId = (id: string) => {
    setFishVoiceId(id);
    localStorage.setItem('jarvis_fish_voice_id', id);
  };

  const updateState = useCallback((newState: AssistantState) => {
    setAssistantState(newState);
    onStateChangeRef.current?.(newState);
  }, []);

  // Unlock browser audio hardware on user gesture
  const unlockAudioHardware = () => {
    getSharedAudioContext();
    const player = getSpeechAudioPlayer();
    // Play short silent buffer to unlock HTMLAudioElement
    player.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    player.play().catch(() => {});
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  };

  // Automatically unlock audio on first user gesture anywhere
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudioHardware();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);
    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // Schedule a listening timeout that falls back to IDLE after inactivity
  const scheduleListeningTimeout = useCallback((seconds = 10) => {
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
    listeningTimeoutRef.current = setTimeout(() => {
      if (assistantStateRef.current === 'LISTENING') {
        updateState('IDLE');
        setInterimTranscript('');
      }
    }, seconds * 1000);
  }, [updateState]);

  // Load British voices for Browser fallback
  useEffect(() => {
    const loadVoices = () => {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;
      
      setAvailableVoices(voices);
      
      const preferred = voices.find(v => 
        (v.lang.includes('en-GB') || v.lang.includes('GB')) && 
        (v.name.toLowerCase().includes('male') || v.name.includes('George') || v.name.includes('Oliver') || v.name.includes('Daniel') || v.name.includes('Ryan') || v.name.includes('Natural'))
      ) || voices.find(v => v.lang.includes('en-GB')) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferred) {
        setSelectedVoice(preferred);
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Dynamic visualizer bars that respond to speech activity smoothly
  useEffect(() => {
    const updateVisualizer = () => {
      const isSpeaking = isSpeakingRef.current;
      const isHearingUser = Boolean(interimTranscript);
      const isListening = assistantState === 'LISTENING';

      if (isSpeaking || isHearingUser) {
        const levels = [];
        for (let i = 0; i < 24; i++) {
          const wave = Math.sin(Date.now() / 120 + i * 0.45);
          const rand = Math.random() * 8;
          const height = Math.max(6, Math.min(34, Math.floor(16 + wave * 14 + rand)));
          levels.push(height);
        }
        setAudioLevel(levels);
      } else if (isListening) {
        const levels = [];
        for (let i = 0; i < 24; i++) {
          const wave = Math.sin(Date.now() / 250 + i * 0.3);
          const height = Math.max(5, Math.floor(10 + wave * 5));
          levels.push(height);
        }
        setAudioLevel(levels);
      } else if (isMicActive) {
        // Idle breathing pattern
        const base = Math.floor(6 + Math.sin(Date.now() / 600) * 3);
        setAudioLevel(new Array(24).fill(base));
      } else {
        setAudioLevel(new Array(24).fill(6));
      }
    };

    visualizerIntervalRef.current = setInterval(updateVisualizer, 60);
    return () => {
      if (visualizerIntervalRef.current) clearInterval(visualizerIntervalRef.current);
    };
  }, [assistantState, isMicActive, interimTranscript]);

  const startListening = async () => {
    unlockAudioHardware();
    setIsMicActive(true);
    isMicActiveRef.current = true;
    setMicPermissionDenied(false);
    updateState('LISTENING');
    scheduleListeningTimeout(15);

    // Start browser speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        if (err.name !== 'InvalidStateError') {
          console.warn("SpeechRecognition start notice:", err);
        }
      }
    }

    playAudioChime('activate');
  };

  const stopListening = () => {
    isMicActiveRef.current = false;
    setIsMicActive(false);
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setInterimTranscript('');
    updateState('IDLE');
  };

  const toggleListening = () => {
    if (isMicActive) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Initialize Speech Recognition ONCE on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API unavailable in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsMicActive(true);
      isMicActiveRef.current = true;
      setMicPermissionDenied(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interim += transcriptPart;
        }
      }

      const activeText = (finalTranscript || interim).trim();
      if (!activeText) return;

      const heardLower = activeText.toLowerCase();
      const now = Date.now();

      // 1. Interruption / Barge-in: When user speaks while Jarvis is currently talking
      if (isSpeakingRef.current) {
        const speakingLower = currentSpeakingTextRef.current.toLowerCase();
        // Check if recognized phrase is purely speaker bleed echoing Jarvis's own TTS output
        const isEchoOfSelf = Boolean(
          speakingLower && (
            speakingLower.includes(heardLower) ||
            (heardLower.length > 6 && speakingLower.includes(heardLower.slice(0, 16)))
          )
        );

        const hasInterruptWord = /\b(stop|quiet|cancel|wait|shut up|hush|silence|hold on|pause|jarvis)\b/i.test(heardLower);
        const hasDirectCmd = isDirectCommand(activeText) || containsWakeWord(heardLower, wakeWordRef.current);

        // If user actively intervened (not speaker self-echo) OR uttered interrupt / command words:
        if (!isEchoOfSelf || hasInterruptWord || hasDirectCmd) {
          // Immediately halt Jarvis speaking!
          stopSpeaking(true);
          updateState('LISTENING');
          scheduleListeningTimeout(15);

          // If user uttered a pure stop/cancel keyword:
          if (/^(?:stop|quiet|cancel|wait|shut up|hush|silence|pause)$/i.test(heardLower.trim())) {
            setInterimTranscript('');
            updateState('IDLE');
            return;
          }

          // Otherwise, Jarvis was halted and is now actively listening to the user's command!
          setInterimTranscript(activeText);
        } else {
          // Discard speaker bleed
          return;
        }
      }

      // 2. Discard speaker echo arriving within 600ms of natural speech ending
      if (lastSpeechEndTimeRef.current > 0 && now - lastSpeechEndTimeRef.current < 600) {
        return;
      }

      setInterimTranscript(activeText);

      // 3. Wake-word detection (e.g. "Jarvis, open spotify" or "Jarvis")
      if (wakeWordEnabledRef.current && containsWakeWord(heardLower, wakeWordRef.current)) {
        const command = extractCommand(activeText, wakeWordRef.current);

        // Case A: User said wake word + command together: "Jarvis, open spotify"
        if (command && command.length > 1) {
          if (finalTranscript.trim()) {
            if (now - lastWakeWordTimeRef.current > 800) {
              lastWakeWordTimeRef.current = now;
              playAudioChime('acknowledge');
              setInterimTranscript('');
              updateState('THINKING');
              onSpeechRecognizedRef.current(command);
              return;
            }
          }
        } else {
          // Case B: User said wake word ONLY: "Jarvis"
          if (now - lastWakeWordTimeRef.current > 1500) {
            lastWakeWordTimeRef.current = now;
            playAudioChime('wake');
            setInterimTranscript('Jarvis (Listening...)');
            speak("Yes, sir? How may I assist you?", undefined, true);
            updateState('LISTENING');
            scheduleListeningTimeout(15);
            return;
          }
        }
        return;
      }

      // 4. Follow-up command if Jarvis is actively waiting in LISTENING state
      if (assistantStateRef.current === 'LISTENING') {
        if (finalTranscript.trim()) {
          const finalText = finalTranscript.trim();
          const extracted = wakeWordEnabledRef.current ? extractCommand(finalText, wakeWordRef.current) : finalText;
          const commandToRun = extracted || finalText;

          if (commandToRun && !containsWakeWord(commandToRun, wakeWordRef.current)) {
            playAudioChime('acknowledge');
            setInterimTranscript('');
            updateState('THINKING');
            onSpeechRecognizedRef.current(commandToRun);
            return;
          }
        }
        return;
      }

      // 5. Direct actionable command (e.g. "open spotify", "launch chrome", "volume up", "what time is it")
      // Direct high-confidence commands work seamlessly even if wake word prefix was omitted
      if (isDirectCommand(activeText)) {
        if (finalTranscript.trim()) {
          const finalText = finalTranscript.trim();
          const extracted = extractCommand(finalText, wakeWordRef.current) || finalText;
          playAudioChime('acknowledge');
          setInterimTranscript('');
          updateState('THINKING');
          onSpeechRecognizedRef.current(extracted);
          return;
        }
        return;
      }

      // 6. If wake-word is disabled in settings, execute any final phrase
      if (!wakeWordEnabledRef.current && finalTranscript.trim()) {
        const finalText = finalTranscript.trim();
        playAudioChime('acknowledge');
        setInterimTranscript('');
        updateState('THINKING');
        onSpeechRecognizedRef.current(finalText);
        return;
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === 'not-allowed') {
        console.warn("SpeechRecognition not allowed by browser.");
        setIsMicActive(false);
        isMicActiveRef.current = false;
        setMicPermissionDenied(true);
        updateState('IDLE');
      }
    };

    recognition.onend = () => {
      // Auto-restart continuous listening safely with rate-limiting
      if (isMicActiveRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);

        const now = Date.now();
        const timeSinceRestart = now - lastRestartTimeRef.current;
        const delay = timeSinceRestart < 1000 ? 500 : 150;
        lastRestartTimeRef.current = now;

        restartTimerRef.current = setTimeout(() => {
          if (isMicActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err: any) {
              if (err.name !== 'InvalidStateError') {
                console.warn("SpeechRecognition auto-restart notice:", err);
              }
            }
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  // Clean Markdown & format for natural speech
  const cleanSpeechText = (raw: string): string => {
    return raw
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\{[\s\S]*?\}/g, '')
      .trim();
  };

  // Browser Speech Synthesis (Option 1)
  const speakBrowser = (textToSpeak: string, onEnd?: () => void, keepListeningAfter: boolean = false) => {
    if (!('speechSynthesis' in window)) {
      updateState(keepListeningAfter ? 'LISTENING' : 'IDLE');
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    activeUtteranceRef.current = utterance;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      currentSpeakingTextRef.current = textToSpeak;
      updateState('SPEAKING');
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      currentSpeakingTextRef.current = '';
      lastSpeechEndTimeRef.current = Date.now();
      activeUtteranceRef.current = null;
      if (keepListeningAfter) {
        updateState('LISTENING');
        scheduleListeningTimeout(10);
      } else {
        updateState('IDLE');
      }
      onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e);
      isSpeakingRef.current = false;
      currentSpeakingTextRef.current = '';
      lastSpeechEndTimeRef.current = Date.now();
      activeUtteranceRef.current = null;
      updateState(keepListeningAfter ? 'LISTENING' : 'IDLE');
    };

    // 40ms timeout ensures Chrome async cancel queue does not swallow the new utterance
    setTimeout(() => {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    }, 40);
  };

  // Unified Speech method: Option 2 (Local Neural) -> Option 3 (Fish Audio) -> Option 1 (Browser Fallback)
  const speak = async (rawText: string, onEnd?: () => void, keepListeningAfter: boolean = false) => {
    const textToSpeak = cleanSpeechText(rawText);
    if (!textToSpeak) {
      updateState(keepListeningAfter ? 'LISTENING' : 'IDLE');
      return;
    }

    stopSpeaking();
    unlockAudioHardware();

    // 1. Try Local Neural TTS (Option 2 - Studio British JARVIS voice, 100% free, no API key needed)
    if (voiceProvider === 'local_neural') {
      try {
        updateState('THINKING');
        const res = await fetch('/api/voice/local-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voice: localNeuralVoice,
            rate: '+5%',
            pitch: '-4Hz'
          })
        });

        if (!res.ok) {
          throw new Error(`Local TTS HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const player = getSpeechAudioPlayer();
        player.src = audioUrl;
        player.volume = 1.0;

        player.onplay = () => {
          isSpeakingRef.current = true;
          currentSpeakingTextRef.current = textToSpeak;
          updateState('SPEAKING');
        };

        player.onended = () => {
          isSpeakingRef.current = false;
          currentSpeakingTextRef.current = '';
          lastSpeechEndTimeRef.current = Date.now();
          URL.revokeObjectURL(audioUrl);
          if (keepListeningAfter) {
            updateState('LISTENING');
            scheduleListeningTimeout(10);
          } else {
            updateState('IDLE');
          }
          onEnd?.();
        };

        player.onerror = () => {
          isSpeakingRef.current = false;
          currentSpeakingTextRef.current = '';
          lastSpeechEndTimeRef.current = Date.now();
          speakBrowser(textToSpeak, onEnd, keepListeningAfter);
        };

        try {
          await player.play();
          return;
        } catch (playErr) {
          console.warn("HTML5 audio playback blocked by browser, attempting speech synthesis fallback:", playErr);
          speakBrowser(textToSpeak, onEnd, keepListeningAfter);
          return;
        }
      } catch (err) {
        console.warn("Local neural TTS fallback to browser voice:", err);
        speakBrowser(textToSpeak, onEnd, keepListeningAfter);
        return;
      }
    }

    // 2. Try Fish Audio if enabled and API key is present
    if (voiceProvider === 'fish_audio' && fishApiKey) {
      try {
        updateState('THINKING');
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            api_key: fishApiKey,
            voice_id: fishVoiceId,
            model: 's2.1-pro-free'
          })
        });

        if (!res.ok) {
          throw new Error(`Fish Audio HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const player = getSpeechAudioPlayer();
        player.src = audioUrl;

        player.onplay = () => {
          isSpeakingRef.current = true;
          currentSpeakingTextRef.current = textToSpeak;
          updateState('SPEAKING');
        };

        player.onended = () => {
          isSpeakingRef.current = false;
          currentSpeakingTextRef.current = '';
          lastSpeechEndTimeRef.current = Date.now();
          URL.revokeObjectURL(audioUrl);
          if (keepListeningAfter) {
            updateState('LISTENING');
            scheduleListeningTimeout(10);
          } else {
            updateState('IDLE');
          }
          onEnd?.();
        };

        player.onerror = () => {
          isSpeakingRef.current = false;
          currentSpeakingTextRef.current = '';
          lastSpeechEndTimeRef.current = Date.now();
          speakBrowser(textToSpeak, onEnd, keepListeningAfter);
        };

        await player.play();
        return;
      } catch (err) {
        console.warn("Fish Audio fallback to British system voice:", err);
      }
    }

    // 3. Default British speech synthesis fallback (Option 1 - Serverless)
    speakBrowser(textToSpeak, onEnd, keepListeningAfter);
  };

  const stopSpeaking = (interruptedByUser: boolean = false) => {
    const player = document.getElementById('jarvis-speech-player') as HTMLAudioElement;
    if (player) {
      player.pause();
      player.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    currentSpeakingTextRef.current = '';
    // If interrupted by user, do not lock out subsequent speech recognition
    lastSpeechEndTimeRef.current = interruptedByUser ? 0 : Date.now();
    activeUtteranceRef.current = null;
  };

  const testVoiceSpeech = () => {
    unlockAudioHardware();
    playAudioChime('wake');
    speak("Voice output operational, sir. Standing by for your instructions.");
  };

  return {
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
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
    testVoiceSpeech,
    setAssistantState: updateState
  };
}
