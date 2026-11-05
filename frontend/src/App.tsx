import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceEngine } from './hooks/useVoiceEngine';
import { PermissionDialog } from './components/PermissionDialog';

interface LogEntry {
  id: string;
  time: string;
  text: string;
  cls?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function App() {
  const [bootOff, setBootOff] = useState(false);
  const [timeStr, setTimeStr] = useState('00:00:00');
  const [dateStr, setDateStr] = useState('');

  // Device facts
  const [cores, setCores] = useState<string>('–');
  const [deviceMem, setDeviceMem] = useState<string>('–');
  const [power, setPower] = useState<string>('–');
  const [linkStatus, setLinkStatus] = useState<string>('–');
  const [displaySize, setDisplaySize] = useState<string>('–');

  // Load telemetry
  const [cpuDisplay, setCpuDisplay] = useState('0%');
  const [memDisplay, setMemDisplay] = useState('0%');
  const [netDisplay, setNetDisplay] = useState('0 ms');
  const [cpuPoints, setCpuPoints] = useState('');
  const [memPoints, setMemPoints] = useState('');
  const [netPoints, setNetPoints] = useState('');

  // Log & Command state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Dangerous action confirmation modal
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    tool: string;
    arguments?: Record<string, any>;
    promptText: string;
    riskLevel?: string;
  } | null>(null);

  // Refs for canvas & telemetry
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const targetRef = useRef<number>(0.18);
  const audioLevelsRef = useRef<number[]>(new Array(24).fill(8));
  const typingTimerRef = useRef<any>(null);
  const userManuallyMutedRef = useRef<boolean>(false);
  const liveTelemetryRef = useRef<{ cpu?: number; mem?: number; ramTotalGb?: number }>({});
  const cpuValRef = useRef<number>(22);
  const memValRef = useRef<number>(48);
  const netValRef = useRef<number>(24);

  const stopSpeakingRef = useRef<((interrupted?: boolean) => void) | null>(null);
  const speakRef = useRef<((text: string, onEnd?: () => void) => void) | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  const isMicActiveStateRef = useRef<boolean>(false);

  const wakeWord = import.meta.env.VITE_WAKE_WORD || 'jarvis';
  const wakeWordEnabled = import.meta.env.VITE_WAKE_WORD_ENABLED
    ? import.meta.env.VITE_WAKE_WORD_ENABLED !== 'false'
    : true;
  const voicePitch = Number(import.meta.env.VITE_VOICE_PITCH) || 0.95;
  const voiceRate = Number(import.meta.env.VITE_VOICE_RATE) || 1.05;

  const say = useCallback((txt: string, cls?: string) => {
    const n = new Date();
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      time: `${pad(n.getHours())}:${pad(n.getMinutes())}`,
      text: txt,
      cls,
    };
    setLogs((prev) => {
      const next = [...prev, entry];
      return next.length > 8 ? next.slice(next.length - 8) : next;
    });
  }, []);

  const localCmds = useCallback((key: string): string | null | undefined => {
    switch (key) {
      case 'help':
        return 'Commands: status, scan, time, diagnostics, clear — or speak “Jarvis” + any command.';
      case 'status':
        return `All systems nominal. Processor at ${Math.round(cpuValRef.current)}%, memory at ${Math.round(memValRef.current)}%, latency ${Math.round(netValRef.current)} ms.`;
      case 'time':
        return 'It is ' + new Date().toLocaleTimeString() + '.';
      case 'scan':
        return 'Scan complete. 0 threats, 0 anomalies detected.';
      case 'diagnostics':
      case 'diagnostic':
        return 'Core, display and network checks passed.';
      default:
        return undefined;
    }
  }, []);

  const handleUserCommand = useCallback(
    async (
      rawText: string,
      confirmed: boolean = false,
      pendingTool?: string,
      pendingArgs?: any
    ) => {
      const v = rawText.trim();
      if (!v) return;

      stopSpeakingRef.current?.(true);

      const key = v.toLowerCase().replace(/[^a-z]/g, '');
      if (key === 'clear') {
        setLogs([]);
        return;
      }

      if (!confirmed) {
        say('› ' + v, 'me');
      }

      // Check voice confirmation for pending dangerous action
      if (pendingConfirmation && !confirmed) {
        const lower = v.toLowerCase();
        if (['yes', 'proceed', 'confirm', 'do it', 'sure'].some((w) => lower.includes(w))) {
          const { tool, arguments: args } = pendingConfirmation;
          setPendingConfirmation(null);
          handleUserCommand('Confirmed', true, tool, args);
          return;
        } else if (['no', 'cancel', 'stop', 'abort'].some((w) => lower.includes(w))) {
          setPendingConfirmation(null);
          say('Action cancelled, sir.', 'warn');
          speakRef.current?.('Action cancelled, sir.');
          return;
        }
      }

      setIsProcessing(true);
      targetRef.current = 0.9;

      // Built-in quick HUD diagnostics
      if (key === 'scan' || key === 'diagnostics' || key === 'diagnostic' || key === 'help') {
        const reply = localCmds(key)!;
        setTimeout(() => {
          say(reply);
          setIsProcessing(false);
          targetRef.current = 0.18;
          speakRef.current?.(reply);
        }, 650);
        return;
      }

      try {
        const t0 = performance.now();
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: v,
            confirmed,
            pending_tool: pendingTool,
            pending_args: pendingArgs,
          }),
        });
        const latency = Math.max(4, Math.min(120, Math.round(performance.now() - t0)));
        netValRef.current = latency;

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.requires_confirmation) {
          setPendingConfirmation({
            tool: data.pending_tool,
            arguments: data.pending_args,
            promptText: data.text,
            riskLevel: 'HIGH',
          });
        }

        const replyText = data.text || 'Command executed, sir.';
        say(replyText, data.requires_confirmation ? 'warn' : undefined);
        setIsProcessing(false);
        targetRef.current = 0.18;
        speakRef.current?.(replyText);
      } catch {
        const fallback = localCmds(key);
        setIsProcessing(false);
        targetRef.current = 0.18;
        if (fallback) {
          say(fallback);
          speakRef.current?.(fallback);
        } else {
          const msg = `I don’t know “${v}” yet. Type help to see what I can do.`;
          say(msg, 'warn');
          speakRef.current?.(msg);
        }
      }
    },
    [localCmds, pendingConfirmation, say]
  );

  const handleWakeWord = useCallback(() => {
    say('› ' + wakeWord, 'me');
    say('Yes, sir? How may I assist you?');
  }, [say, wakeWord]);

  const {
    isMicActive,
    micPermissionDenied,
    assistantState,
    interimTranscript,
    audioLevel,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoiceEngine({
    wakeWord,
    wakeWordEnabled,
    voicePitch,
    voiceRate,
    onSpeechRecognized: handleUserCommand,
    onWakeWord: handleWakeWord,
  });

  stopSpeakingRef.current = stopSpeaking;
  speakRef.current = speak;
  startListeningRef.current = startListening;
  isMicActiveStateRef.current = isMicActive;
  audioLevelsRef.current = audioLevel;

  const handleToggleMic = useCallback(() => {
    if (isMicActive) {
      userManuallyMutedRef.current = true;
      stopListening();
    } else {
      userManuallyMutedRef.current = false;
      startListening();
    }
  }, [isMicActive, startListening, stopListening]);

  const handleCoreClick = useCallback(() => {
    if (assistantState === 'SPEAKING') {
      stopSpeaking(true);
      return;
    }
    handleToggleMic();
  }, [assistantState, handleToggleMic, stopSpeaking]);

  // Auto-activate voice recognition on boot and first user interaction (unless manually muted)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isMicActiveStateRef.current && !userManuallyMutedRef.current) {
        startListeningRef.current?.();
      }
    }, 1400);

    const activateOnGesture = () => {
      if (!isMicActiveStateRef.current && !userManuallyMutedRef.current) {
        startListeningRef.current?.();
      }
      window.removeEventListener('click', activateOnGesture);
      window.removeEventListener('keydown', activateOnGesture);
    };

    window.addEventListener('click', activateOnGesture);
    window.addEventListener('keydown', activateOnGesture);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', activateOnGesture);
      window.removeEventListener('keydown', activateOnGesture);
    };
  }, []);

  // Sync core energy target with voice / assistant state
  useEffect(() => {
    if (
      isProcessing ||
      assistantState === 'THINKING' ||
      assistantState === 'SPEAKING' ||
      assistantState === 'EXECUTING'
    ) {
      targetRef.current = 0.9;
    } else if (Boolean(interimTranscript)) {
      targetRef.current = 0.72;
    } else if (isMicActive || assistantState === 'LISTENING') {
      targetRef.current = 0.36;
    } else {
      targetRef.current = 0.18;
    }
  }, [assistantState, interimTranscript, isMicActive, isProcessing]);

  // 1. Live Clock
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setTimeStr(`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`);
      setDateStr(
        n.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 2. Device Facts
  useEffect(() => {
    const updateFacts = () => {
      setCores(String(navigator.hardwareConcurrency || 'n/a'));
      const navMem = (navigator as any).deviceMemory;
      if (liveTelemetryRef.current.ramTotalGb) {
        setDeviceMem(`${Math.round(liveTelemetryRef.current.ramTotalGb)} GB`);
      } else {
        setDeviceMem(navMem ? `${navMem} GB` : 'n/a');
      }
      setLinkStatus(navigator.onLine ? 'Connected' : 'Offline');
      setDisplaySize(`${window.screen.width} × ${window.screen.height}`);
    };
    updateFacts();
    window.addEventListener('online', updateFacts);
    window.addEventListener('offline', updateFacts);

    try {
      if ('getBattery' in navigator) {
        (navigator as any)
          .getBattery()
          .then((b: any) => {
            const u = () =>
              setPower(`${Math.round(b.level * 100)}%${b.charging ? ' · charging' : ''}`);
            u();
            b.onlevelchange = u;
            b.onchargingchange = u;
          })
          .catch(() => setPower('Mains'));
      } else {
        setPower('Mains');
      }
    } catch {
      setPower('Mains');
    }

    return () => {
      window.removeEventListener('online', updateFacts);
      window.removeEventListener('offline', updateFacts);
    };
  }, []);

  // 3. WebSocket live telemetry connection
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/jarvis`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setIsWsConnected(true);
          setLinkStatus('Connected');
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'system.telemetry' && msg.data) {
              const d = msg.data;
              const cpuVal = typeof d.cpu?.percent === 'number' ? d.cpu.percent : d.cpu_percent;
              const memVal = typeof d.memory?.percent === 'number' ? d.memory.percent : d.ram_percent;
              const memTotal = typeof d.memory?.total_gb === 'number' ? d.memory.total_gb : d.ram_total_gb;
              const coresVal = d.cpu?.cores;

              liveTelemetryRef.current = {
                cpu: typeof cpuVal === 'number' ? cpuVal : undefined,
                mem: typeof memVal === 'number' ? memVal : undefined,
                ramTotalGb: typeof memTotal === 'number' ? memTotal : undefined,
              };

              if (typeof memTotal === 'number') {
                setDeviceMem(`${Math.round(memTotal)} GB`);
              }
              if (coresVal) {
                setCores(String(coresVal));
              }
            }
          } catch {
            // ignore
          }
        };
        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };
        ws.onerror = () => {
          setIsWsConnected(false);
          ws.close();
        };
      } catch {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 3000);
      }
    };

    connectWs();
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // 4. Telemetry Sparklines (Load)
  useEffect(() => {
    const H: { cpu: number[]; mem: number[]; net: number[] } = {
      cpu: [],
      mem: [],
      net: [],
    };

    const toPoints = (arr: number[]) => {
      const w = 100 / 59;
      return arr.map((v, i) => `${(i * w).toFixed(1)},${(25 - v * 24).toFixed(1)}`).join(' ');
    };

    const step = () => {
      if (typeof liveTelemetryRef.current.cpu === 'number') {
        cpuValRef.current = Math.max(1, Math.min(100, liveTelemetryRef.current.cpu));
      } else {
        cpuValRef.current = Math.max(4, Math.min(96, cpuValRef.current + (Math.random() - 0.5) * 14));
      }

      if (typeof liveTelemetryRef.current.mem === 'number') {
        memValRef.current = Math.max(1, Math.min(100, liveTelemetryRef.current.mem));
      } else {
        memValRef.current = Math.max(30, Math.min(80, memValRef.current + (Math.random() - 0.5) * 2));
      }

      netValRef.current = Math.max(8, Math.min(90, netValRef.current + (Math.random() - 0.5) * 10));

      const pairs: [keyof typeof H, number, number][] = [
        ['cpu', cpuValRef.current, 100],
        ['mem', memValRef.current, 100],
        ['net', netValRef.current, 120],
      ];

      pairs.forEach(([k, v, m]) => {
        H[k].push(v / m);
        if (H[k].length > 60) H[k].shift();
      });

      setCpuPoints(toPoints(H.cpu));
      setMemPoints(toPoints(H.mem));
      setNetPoints(toPoints(H.net));
      setCpuDisplay(`${Math.round(cpuValRef.current)}%`);
      setMemDisplay(`${Math.round(memValRef.current)}%`);
      setNetDisplay(`${Math.round(netValRef.current)} ms`);
    };

    for (let i = 0; i < 60; i++) step();
    const id = setInterval(step, 800);
    return () => clearInterval(id);
  }, []);

  // 5. Boot sequence & greeting
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    const timer = setTimeout(() => {
      if (bootedRef.current) return;
      bootedRef.current = true;
      setBootOff(true);
      const hr = new Date().getHours();
      const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
      const welcome = `${greet}. Systems are online.`;
      say(welcome);
      speakRef.current?.(welcome);
    }, 900);
    return () => clearTimeout(timer);
  }, [say]);

  // 6. Global '/' shortcut to focus command input & Escape to halt speech
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        stopSpeakingRef.current?.(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 7. Canvas Core Animation (Audio-reactive)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const c = cv.getContext('2d');
    if (!c) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0;
    let Hh = 0;
    let dpr = 1;

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      W = r.width;
      Hh = r.height;
      cv.width = W * dpr;
      cv.height = Hh * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    size();
    window.addEventListener('resize', size);

    const ICE = '125,243,255';
    let level = 0.18;
    let last = performance.now();
    let fr = 0;
    let acc = 0;
    let rafId = 0;

    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      acc += dt;
      fr++;
      if (acc >= 1) {
        if (fpsRef.current) {
          fpsRef.current.textContent = `${Math.round(fr / acc)} fps`;
        }
        fr = 0;
        acc = 0;
      }

      // Compute live audio boost from useVoiceEngine audioLevels
      const bars = audioLevelsRef.current;
      const avgAudio =
        bars && bars.length > 0
          ? bars.reduce((s, b) => s + b, 0) / bars.length / 34
          : 0.18;
      const dynamicTarget = Math.max(targetRef.current, avgAudio);

      level += (dynamicTarget - level) * 0.08;
      const t = reduce ? 0 : now / 1000;
      const cx = W / 2;
      const cy = Hh / 2;
      const R = Math.min(W, Hh) * 0.42;

      c.clearRect(0, 0, W, Hh);

      if (R > 0) {
        // glow
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9);
        g.addColorStop(0, `rgba(${ICE},${0.16 + level * 0.2})`);
        g.addColorStop(0.5, `rgba(${ICE},.04)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(cx, cy, R * 0.9, 0, 7);
        c.fill();

        c.save();
        c.translate(cx, cy);

        // outer hairline + ticks
        c.strokeStyle = `rgba(${ICE},.22)`;
        c.lineWidth = 1;
        c.beginPath();
        c.arc(0, 0, R, 0, 7);
        c.stroke();

        c.save();
        c.rotate(t * 0.05);
        for (let i = 0; i < 180; i++) {
          const a = (i / 180) * 6.2832;
          const L = i % 15 === 0 ? 12 : i % 5 === 0 ? 7 : 3;
          c.strokeStyle = `rgba(${ICE},${i % 15 === 0 ? 0.7 : 0.25})`;
          c.beginPath();
          c.moveTo(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4));
          c.lineTo(Math.cos(a) * (R - 4 - L), Math.sin(a) * (R - 4 - L));
          c.stroke();
        }
        c.restore();

        // arc segments
        const arcs: [number, number, number, number][] = [
          [0.82, 0.35, 1.4, 2.2],
          [0.74, -0.5, 0.9, 1.6],
          [0.66, 0.8, 0.5, 2.6],
        ];
        arcs.forEach(([k, sp, len, w], i) => {
          c.strokeStyle = `rgba(${ICE},${0.55 + level * 0.4})`;
          c.lineWidth = w;
          c.lineCap = 'round';
          for (let s = 0; s < 2; s++) {
            const a0 = t * sp + s * 3.1416 + i;
            c.beginPath();
            c.arc(0, 0, R * k, a0, a0 + len);
            c.stroke();
          }
        });

        // dashed inner
        c.save();
        c.rotate(-t * 0.25);
        c.setLineDash([2, 10]);
        c.strokeStyle = `rgba(${ICE},.45)`;
        c.lineWidth = 1;
        c.beginPath();
        c.arc(0, 0, R * 0.56, 0, 7);
        c.stroke();
        c.restore();

        // orbit dot
        const oa = t * 0.9;
        c.fillStyle = `rgb(${ICE})`;
        c.shadowColor = `rgb(${ICE})`;
        c.shadowBlur = 12;
        c.beginPath();
        c.arc(Math.cos(oa) * R * 0.9, Math.sin(oa) * R * 0.9, 2.6, 0, 7);
        c.fill();
        c.shadowBlur = 0;

        // waveform core
        const N = 96;
        const base = R * 0.34;
        c.beginPath();
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * 6.2832;
          const barIdx = bars && bars.length > 0 ? i % bars.length : 0;
          const barMod = bars && bars.length > 0 ? (bars[barIdx] - 6) / 28 : 0;
          const n =
            Math.sin(a * 5 + t * 2.2) * 0.5 +
            Math.sin(a * 9 - t * 3.1) * 0.3 +
            Math.sin(a * 3 + t * 1.1) * 0.2 +
            barMod * 0.25;
          const r = base + n * level * R * 0.12 + Math.sin(t * 1.6) * R * 0.008;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i) c.lineTo(x, y);
          else c.moveTo(x, y);
        }
        c.closePath();
        c.strokeStyle = `rgba(${ICE},.95)`;
        c.lineWidth = 1.6;
        c.shadowColor = `rgb(${ICE})`;
        c.shadowBlur = 14;
        c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = `rgba(${ICE},${0.05 + level * 0.08})`;
        c.fill();

        // center point
        c.fillStyle = '#fff';
        c.globalAlpha = 0.9;
        c.beginPath();
        c.arc(0, 0, 2 + level * 2, 0, 7);
        c.fill();
        c.globalAlpha = 1;

        c.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', size);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = inputVal.trim();
    if (!v) return;
    setInputVal('');
    handleUserCommand(v);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    targetRef.current = 0.5;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      if (!isProcessing && assistantState === 'IDLE') {
        targetRef.current = 0.18;
      }
    }, 700);
  };

  const isBusy =
    isProcessing ||
    assistantState === 'THINKING' ||
    assistantState === 'EXECUTING' ||
    assistantState === 'SPEAKING';

  const stateText =
    isProcessing || assistantState === 'THINKING' || assistantState === 'EXECUTING'
      ? 'PROCESSING'
      : assistantState === 'SPEAKING'
      ? 'SPEAKING'
      : interimTranscript
      ? `HEARD: "${interimTranscript.toUpperCase().slice(0, 28)}"`
      : isMicActive
      ? `LISTENING · SAY "${wakeWord.toUpperCase()}"`
      : 'STANDING BY';

  const confirmDangerousAction = () => {
    if (!pendingConfirmation) return;
    const { tool, arguments: args } = pendingConfirmation;
    setPendingConfirmation(null);
    handleUserCommand('Confirmed', true, tool, args);
  };

  const cancelDangerousAction = () => {
    setPendingConfirmation(null);
    say('Action cancelled, sir.', 'warn');
    speak('Action cancelled, sir.');
  };

  return (
    <>
      <div className={`boot ${bootOff ? 'off' : ''}`} id="boot">
        <div />
      </div>

      <div className="hud">
        <header>
          <div className="brand">
            JARVIS
            <small>
              {isWsConnected ? 'Online · all systems nominal' : 'Online · local core active'}
              {isMicActive ? ` · voice active (“${wakeWord}”)` : ''}
            </small>
          </div>
          <div className="clock">
            <span id="t">{timeStr}</span>
            <small id="d">{dateStr}</small>
          </div>
        </header>

        <aside>
          <div className="panel">
            <h3>Load</h3>
            <div className="m">
              <span>Processor</span>
              <b id="cpu">{cpuDisplay}</b>
              <svg viewBox="0 0 100 26" preserveAspectRatio="none">
                <line className="base" x1="0" x2="100" y1="25" y2="25" />
                <polyline id="cpuL" points={cpuPoints} />
              </svg>
            </div>
            <div className="m">
              <span>Memory</span>
              <b id="mem">{memDisplay}</b>
              <svg viewBox="0 0 100 26" preserveAspectRatio="none">
                <line className="base" x1="0" x2="100" y1="25" y2="25" />
                <polyline id="memL" points={memPoints} />
              </svg>
            </div>
            <div className="m">
              <span>Network</span>
              <b id="net">{netDisplay}</b>
              <svg viewBox="0 0 100 26" preserveAspectRatio="none">
                <line className="base" x1="0" x2="100" y1="25" y2="25" />
                <polyline id="netL" points={netPoints} />
              </svg>
            </div>
          </div>
        </aside>

        <main>
          <canvas
            id="core"
            ref={canvasRef}
            aria-label="Assistant core"
            onClick={handleCoreClick}
            style={{ cursor: 'pointer' }}
            title={
              assistantState === 'SPEAKING'
                ? 'Click to stop speaking'
                : isMicActive
                ? 'Voice listening active (click to mute)'
                : 'Click to activate voice commands'
            }
          />
          <div
            className={`state ${isBusy ? 'busy' : ''}`}
            id="state"
            onClick={handleCoreClick}
            style={{ cursor: 'pointer' }}
          >
            {stateText}
          </div>
        </main>

        <aside>
          <div className="panel">
            <h3>This device</h3>
            <div className="kv">
              <i>Cores</i>
              <em id="k1">{cores}</em>
            </div>
            <div className="kv">
              <i>Memory</i>
              <em id="k2">{deviceMem}</em>
            </div>
            <div className="kv">
              <i>Power</i>
              <em id="k3">{power}</em>
            </div>
            <div className="kv">
              <i>Link</i>
              <em id="k4" className="ok">
                {linkStatus}
              </em>
            </div>
            <div className="kv">
              <i>Display</i>
              <em id="k5">{displaySize}</em>
            </div>
            <div className="kv">
              <i>Frame rate</i>
              <em id="k6" ref={fpsRef}>
                –
              </em>
            </div>
          </div>

          <div id="log" aria-live="polite">
            {logs.map((item) => (
              <div key={item.id} className={item.cls}>
                <time>{item.time}</time>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </aside>

        <footer>
          <form className="cmd" id="f" autoComplete="off" onSubmit={handleSubmit}>
            <span>›</span>
            <input
              ref={inputRef}
              id="in"
              value={inputVal}
              onChange={handleInputChange}
              placeholder="Ask Jarvis or say “Jarvis”. Try “status”, “scan” or “help”"
              aria-label="Command"
            />
            <kbd>/</kbd>
            <button
              type="button"
              onClick={handleToggleMic}
              className={
                micPermissionDenied ? 'mic-denied' : isMicActive ? 'mic-on' : undefined
              }
              title={
                micPermissionDenied
                  ? 'Microphone permission blocked in browser'
                  : isMicActive
                  ? 'Voice listening active — click to mute'
                  : 'Click to enable continuous voice listening'
              }
            >
              {micPermissionDenied ? 'Mic · Blocked' : isMicActive ? 'Voice · On' : 'Voice · Off'}
            </button>
            <button type="submit">Send</button>
          </form>
        </footer>
      </div>

      <PermissionDialog
        isOpen={pendingConfirmation !== null}
        tool={pendingConfirmation?.tool || ''}
        arguments={pendingConfirmation?.arguments}
        promptText={pendingConfirmation?.promptText || ''}
        riskLevel={pendingConfirmation?.riskLevel || 'HIGH'}
        onConfirm={confirmDangerousAction}
        onCancel={cancelDangerousAction}
      />
    </>
  );
}
