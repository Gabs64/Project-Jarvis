import { useState, useEffect, useRef, useCallback } from 'react';

export type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'EXECUTING' | 'ERROR';
export type VoiceProvider = 'local_neural' | 'fish_audio' | 'browser';

interface UseVoiceEngineProps {
  wakeWord?: string;
  wakeWordEnabled?: boolean;
  voicePitch?: number;
  voiceRate?: number;
  onSpeechRecognized: (transcript: string) => void;
  onWakeWord?: () => void;
  onStateChange?: (state: AssistantState) => void;
  onSpeechProgress?: (textSpokenSoFar: string, isFinished: boolean) => void;
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
    /^(?:status|scan|diagnostics|diagnostic|help|clear|time|date|briefing|morning\s+briefing)\b/i,
    /^(?:who|what|when|where|why|how|can\s+you|could\s+you|would\s+you|tell\s+me|explain|define|show\s+me|give\s+me|do\s+you|are\s+you|is\s+it|is\s+there|hello|hi|hey|good\s+(?:morning|afternoon|evening|night)|thank|thanks)\b/i,
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
  onWakeWord,
  onStateChange,
  onSpeechProgress
}: UseVoiceEngineProps) {
  const onSpeechProgressRef = useRef(onSpeechProgress);
  onSpeechProgressRef.current = onSpeechProgress;
  const speechProgressTimerRef = useRef<any>(null);

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
    const saved = localStorage.getItem('jarvis_voice_provider') as VoiceProvider;
    if (saved === 'fish_audio') return 'fish_audio';
    // If previously saved as 'browser' or unset, auto-migrate to 'local_neural' to restore authentic JARVIS voice
    if (!saved || saved === 'browser') {
      localStorage.setItem('jarvis_voice_provider', 'local_neural');
      return 'local_neural';
    }
    return saved;
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
  const silenceCommitTimerRef = useRef<any>(null);
  const wakeOnlyTimerRef = useRef<any>(null);
  const lastCommittedTextRef = useRef<string>('');
  const lastCommittedTimeRef = useRef<number>(0);
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

  const onWakeWordRef = useRef(onWakeWord);
  onWakeWordRef.current = onWakeWord;

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

        // ONLY halt if user uttered an explicit interrupt/command AND it is not self echo:
        if (!isEchoOfSelf && (hasInterruptWord || hasDirectCmd)) {
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

      // 2. Discard speaker echo arriving within 450ms of natural speech ending
      if (lastSpeechEndTimeRef.current > 0 && now - lastSpeechEndTimeRef.current < 450) {
        return;
      }

      // Clear pending timers while user is actively speaking
      if (silenceCommitTimerRef.current) {
        clearTimeout(silenceCommitTimerRef.current);
        silenceCommitTimerRef.current = null;
      }
      if (wakeOnlyTimerRef.current) {
        clearTimeout(wakeOnlyTimerRef.current);
        wakeOnlyTimerRef.current = null;
      }

      // Deduplicate if fast silence-commit already dispatched this utterance
      const normalizedActive = heardLower.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      if (
        lastCommittedTextRef.current &&
        now - lastCommittedTimeRef.current < 2800 &&
        (normalizedActive === lastCommittedTextRef.current ||
          lastCommittedTextRef.current.includes(normalizedActive))
      ) {
        return;
      }

      const dispatchCommand = (cmdToRun: string) => {
        const cleanCmd = cmdToRun.trim();
        if (!cleanCmd) return;
        const norm = cleanCmd.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
        if (
          lastCommittedTextRef.current &&
          Date.now() - lastCommittedTimeRef.current < 2500 &&
          norm === lastCommittedTextRef.current
        ) {
          return;
        }
        lastCommittedTextRef.current = norm;
        lastCommittedTimeRef.current = Date.now();
        lastWakeWordTimeRef.current = Date.now();
        if (silenceCommitTimerRef.current) {
          clearTimeout(silenceCommitTimerRef.current);
          silenceCommitTimerRef.current = null;
        }
        if (wakeOnlyTimerRef.current) {
          clearTimeout(wakeOnlyTimerRef.current);
          wakeOnlyTimerRef.current = null;
        }
        playAudioChime('acknowledge');
        setInterimTranscript('');
        updateState('THINKING');
        // Flush recognition buffer so next utterance starts clean
        try {
          recognition.stop();
        } catch {}
        onSpeechRecognizedRef.current(cleanCmd);
      };

      setInterimTranscript(activeText);

      // 3. Wake-word detection (e.g. "Jarvis, open spotify" or "Jarvis")
      if (wakeWordEnabledRef.current && containsWakeWord(heardLower, wakeWordRef.current)) {
        const command = extractCommand(activeText, wakeWordRef.current);

        // Case A: User said wake word + command together: "Jarvis, open spotify"
        if (command && command.length > 1) {
          if (finalTranscript.trim()) {
            dispatchCommand(command);
            return;
          } else {
            // Fast silence commit (550ms) so user doesn't wait 2s for Chrome's isFinal
            silenceCommitTimerRef.current = setTimeout(() => {
              dispatchCommand(command);
            }, 550);
            return;
          }
        } else {
          // Case B: User said wake word ONLY: "Jarvis" — wait 420ms in case user continues speaking a command
          wakeOnlyTimerRef.current = setTimeout(() => {
            const tNow = Date.now();
            if (tNow - lastWakeWordTimeRef.current > 1200) {
              lastWakeWordTimeRef.current = tNow;
              lastCommittedTextRef.current = normalizedActive;
              lastCommittedTimeRef.current = tNow;
              playAudioChime('wake');
              setInterimTranscript('Jarvis (Listening...)');
              if (onWakeWordRef.current) {
                onWakeWordRef.current();
              } else {
                speak("Yes, sir? How may I assist you?", undefined, true);
              }
              updateState('LISTENING');
              scheduleListeningTimeout(15);
            }
          }, 420);
          return;
        }
      }

      // 4. Follow-up command if Jarvis is actively waiting in LISTENING state
      if (assistantStateRef.current === 'LISTENING') {
        const extracted = wakeWordEnabledRef.current ? extractCommand(activeText, wakeWordRef.current) : activeText;
        const commandToRun = (extracted || activeText).trim();

        if (commandToRun && !containsWakeWord(commandToRun, wakeWordRef.current)) {
          if (finalTranscript.trim()) {
            dispatchCommand(commandToRun);
            return;
          } else if (commandToRun.length > 1) {
            silenceCommitTimerRef.current = setTimeout(() => {
              dispatchCommand(commandToRun);
            }, 550);
            return;
          }
        }
        return;
      }

      // 5. Direct actionable command or question (works seamlessly even without wake word prefix)
      if (isDirectCommand(activeText)) {
        const extracted = extractCommand(activeText, wakeWordRef.current) || activeText;
        if (finalTranscript.trim()) {
          dispatchCommand(extracted);
          return;
        } else if (extracted.length > 2) {
          silenceCommitTimerRef.current = setTimeout(() => {
            dispatchCommand(extracted);
          }, 550);
          return;
        }
        return;
      }

      // 6. If wake-word is disabled in settings, execute any phrase
      if (!wakeWordEnabledRef.current) {
        if (finalTranscript.trim()) {
          dispatchCommand(finalTranscript.trim());
          return;
        } else if (activeText.length > 2) {
          silenceCommitTimerRef.current = setTimeout(() => {
            dispatchCommand(activeText);
          }, 550);
          return;
        }
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
  const speakBrowser = (
    textToSpeak: string,
    onEnd?: () => void,
    keepListeningAfter: boolean = false,
    onProgress?: (textSpokenSoFar: string, isFinished: boolean) => void,
    originalRawText?: string
  ) => {
    if (!('speechSynthesis' in window)) {
      onProgress?.(originalRawText || textToSpeak, true);
      onSpeechProgressRef.current?.(originalRawText || textToSpeak, true);
      updateState(keepListeningAfter ? 'LISTENING' : 'IDLE');
      return;
    }

    const wasBusy = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    if (wasBusy) {
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

    const targetText = originalRawText || textToSpeak;

    utterance.onboundary = (event) => {
      if (typeof event.charIndex === 'number') {
        const idx = event.charIndex;
        const nextSpace = targetText.indexOf(' ', idx);
        const endPos = nextSpace === -1 ? targetText.length : nextSpace;
        const partial = targetText.slice(0, endPos);
        onProgress?.(partial, false);
        onSpeechProgressRef.current?.(partial, false);
      }
    };

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      currentSpeakingTextRef.current = textToSpeak;
      updateState('SPEAKING');

      // Unveil first word immediately on speech start
      const firstSpace = targetText.indexOf(' ');
      const firstWord = firstSpace === -1 ? targetText : targetText.slice(0, firstSpace);
      onProgress?.(firstWord, false);
      onSpeechProgressRef.current?.(firstWord, false);
    };

    utterance.onend = () => {
      onProgress?.(targetText, true);
      onSpeechProgressRef.current?.(targetText, true);
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
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        onProgress?.(targetText, true);
        onSpeechProgressRef.current?.(targetText, true);
      }
      isSpeakingRef.current = false;
      currentSpeakingTextRef.current = '';
      lastSpeechEndTimeRef.current = Date.now();
      activeUtteranceRef.current = null;
      updateState(keepListeningAfter ? 'LISTENING' : 'IDLE');
    };

    if (wasBusy) {
      setTimeout(() => {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 30);
    } else {
      window.speechSynthesis.speak(utterance);
    }
  };

  // Unified Speech method: Option 2 (Local Neural) -> Option 3 (Fish Audio) -> Option 1 (Browser Fallback)
  const speak = async (
    rawText: string,
    onEnd?: () => void,
    keepListeningAfter: boolean = false,
    onProgress?: (textSpokenSoFar: string, isFinished: boolean) => void
  ) => {
    const textToSpeak = cleanSpeechText(rawText);
    if (!textToSpeak) {
      onProgress?.(rawText, true);
      onSpeechProgressRef.current?.(rawText, true);
      updateState(keepListeningAfter ? 'LISTENING' : 'IDLE');
      return;
    }

    stopSpeaking();
    unlockAudioHardware();

    const words = rawText.split(/(\s+)/);
    const totalTokens = words.length;

    // Helper to clear ticker
    const clearSubtitleTicker = () => {
      if (speechProgressTimerRef.current) {
        clearInterval(speechProgressTimerRef.current);
        speechProgressTimerRef.current = null;
      }
    };

    // 1. Try Local Neural TTS (Option 2 - Studio British JARVIS voice - en-GB-RyanNeural)
    if (voiceProvider === 'local_neural') {
      try {
        updateState('THINKING');
        const res = await fetch('/api/voice/local-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voice: localNeuralVoice || 'en-GB-RyanNeural',
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

        const updateAudioSubtitle = () => {
          if (player.paused || player.ended || !isSpeakingRef.current) {
            clearSubtitleTicker();
            return;
          }
          const cur = player.currentTime;
          const dur = player.duration;
          if (dur && isFinite(dur) && dur > 0) {
            const ratio = Math.min(1.0, Math.max(0, cur / dur));
            // Progressive word index synced to audio elapsed time
            const tokensToShow = Math.min(totalTokens, Math.max(1, Math.round(ratio * totalTokens * 1.02)));
            const currentText = words.slice(0, tokensToShow).join('');
            onProgress?.(currentText, false);
            onSpeechProgressRef.current?.(currentText, false);
          }
        };

        player.onplay = () => {
          isSpeakingRef.current = true;
          currentSpeakingTextRef.current = textToSpeak;
          updateState('SPEAKING');

          // Immediately unveil initial word
          const initText = words.slice(0, Math.min(2, totalTokens)).join('');
          onProgress?.(initText, false);
          onSpeechProgressRef.current?.(initText, false);

          clearSubtitleTicker();
          speechProgressTimerRef.current = setInterval(updateAudioSubtitle, 35);
        };

        player.onended = () => {
          clearSubtitleTicker();
          onProgress?.(rawText, true);
          onSpeechProgressRef.current?.(rawText, true);
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

        player.onerror = (e) => {
          console.warn("Local neural audio playback error:", e);
          clearSubtitleTicker();
          isSpeakingRef.current = false;
          currentSpeakingTextRef.current = '';
          lastSpeechEndTimeRef.current = Date.now();
          URL.revokeObjectURL(audioUrl);
          speakBrowser(textToSpeak, onEnd, keepListeningAfter, onProgress, rawText);
        };

        try {
          await player.play();
          return;
        } catch (playErr) {
          console.warn("HTML5 audio playback blocked by browser, attempting speech synthesis fallback:", playErr);
          speakBrowser(textToSpeak, onEnd, keepListeningAfter, onProgress, rawText);
          return;
        }
      } catch (err) {
        console.warn("Local neural TTS fallback to browser voice:", err);
        speakBrowser(textToSpeak, onEnd, keepListeningAfter, onProgress, rawText);
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

        const updateFishSubtitle = () => {
          if (player.paused || player.ended || !isSpeakingRef.current) {
            clearSubtitleTicker();
            return;
          }
          const dur = player.duration;
          if (dur && dur > 0) {
            const cur = player.currentTime;
            const ratio = Math.min(1.0, Math.max(0, cur / dur));
            const tokensToShow = Math.min(totalTokens, Math.max(1, Math.round(ratio * totalTokens * 1.03)));
            const currentText = words.slice(0, tokensToShow).join('');
            onProgress?.(currentText, false);
            onSpeechProgressRef.current?.(currentText, false);
          }
        };

        player.onplay = () => {
          isSpeakingRef.current = true;
          currentSpeakingTextRef.current = textToSpeak;
          updateState('SPEAKING');

          const initText = words.slice(0, Math.min(2, totalTokens)).join('');
          onProgress?.(initText, false);
          onSpeechProgressRef.current?.(initText, false);

          clearSubtitleTicker();
          speechProgressTimerRef.current = setInterval(updateFishSubtitle, 35);
        };

        player.onended = () => {
          clearSubtitleTicker();
          onProgress?.(rawText, true);
          onSpeechProgressRef.current?.(rawText, true);
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
          clearSubtitleTicker();
          isSpeakingRef.current = false;
          currentSpeakingTextRef.current = '';
          lastSpeechEndTimeRef.current = Date.now();
          speakBrowser(textToSpeak, onEnd, keepListeningAfter, onProgress, rawText);
        };

        await player.play();
        return;
      } catch (err) {
        console.warn("Fish Audio fallback to British system voice:", err);
      }
    }

    // 3. Default British speech synthesis fallback (Option 1 - Serverless)
    speakBrowser(textToSpeak, onEnd, keepListeningAfter, onProgress, rawText);
  };

  const stopSpeaking = (interruptedByUser: boolean = false) => {
    if (speechProgressTimerRef.current) {
      clearInterval(speechProgressTimerRef.current);
      speechProgressTimerRef.current = null;
    }
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
