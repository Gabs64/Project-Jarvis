import React, { useEffect, useRef } from 'react';
import type { AssistantState } from '../hooks/useVoiceEngine';

interface HoloBackgroundProps {
  state: AssistantState;
  audioLevels?: number[];
  isMicActive?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  color: string;
  lineWidth: number;
}

interface SynapseRay {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  speed: number;
  color: string;
  alpha: number;
}

export const HoloBackground: React.FC<HoloBackgroundProps> = ({
  state,
  audioLevels = [],
  isMicActive = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const audioLevelsRef = useRef(audioLevels);
  const isMicActiveRef = useRef(isMicActive);
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  stateRef.current = state;
  audioLevelsRef.current = audioLevels;
  isMicActiveRef.current = isMicActive;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Color palette based on state
    const getColorScheme = (st: AssistantState) => {
      switch (st) {
        case 'THINKING':
          return {
            primary: 'rgba(192, 132, 252,',
            secondary: 'rgba(92, 200, 255,',
            accent: 'rgba(232, 121, 249,',
            glow: 'rgba(168, 85, 247, 0.25)',
            ringColor: 'rgba(192, 132, 252, 0.4)'
          };
        case 'SPEAKING':
          return {
            primary: 'rgba(98, 214, 167,',
            secondary: 'rgba(52, 211, 153,',
            accent: 'rgba(92, 200, 255,',
            glow: 'rgba(16, 185, 129, 0.25)',
            ringColor: 'rgba(98, 214, 167, 0.4)'
          };
        case 'EXECUTING':
          return {
            primary: 'rgba(255, 209, 102,',
            secondary: 'rgba(251, 191, 36,',
            accent: 'rgba(245, 158, 11,',
            glow: 'rgba(245, 158, 11, 0.25)',
            ringColor: 'rgba(255, 209, 102, 0.4)'
          };
        case 'ERROR':
          return {
            primary: 'rgba(255, 107, 107,',
            secondary: 'rgba(244, 63, 94,',
            accent: 'rgba(239, 68, 68,',
            glow: 'rgba(239, 68, 68, 0.25)',
            ringColor: 'rgba(255, 107, 107, 0.4)'
          };
        case 'LISTENING':
          return {
            primary: 'rgba(92, 200, 255,',
            secondary: 'rgba(56, 189, 248,',
            accent: 'rgba(14, 165, 233,',
            glow: 'rgba(14, 165, 233, 0.3)',
            ringColor: 'rgba(92, 200, 255, 0.5)'
          };
        case 'IDLE':
        default:
          return {
            primary: 'rgba(92, 200, 255,',
            secondary: 'rgba(56, 189, 248,',
            accent: 'rgba(30, 58, 138,',
            glow: 'rgba(14, 165, 233, 0.12)',
            ringColor: 'rgba(92, 200, 255, 0.25)'
          };
      }
    };

    // Initialize Particles
    let particles: Particle[] = [];
    const particleCount = Math.min(85, Math.floor((width * height) / 16000));

    const initParticles = () => {
      particles = [];
      const scheme = getColorScheme(stateRef.current);
      for (let i = 0; i < particleCount; i++) {
        const isCyan = Math.random() > 0.3;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 2 + 1,
          baseRadius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          baseAlpha: Math.random() * 0.5 + 0.2,
          pulseSpeed: Math.random() * 0.02 + 0.01,
          pulsePhase: Math.random() * Math.PI * 2,
          color: isCyan ? scheme.primary : scheme.secondary
        });
      }
    };

    initParticles();

    // Shockwaves collection
    const shockwaves: Shockwave[] = [];
    const synapses: SynapseRay[] = [];
    let radarAngle = 0;
    let gridOffset = 0;
    let lastShockwaveTime = 0;
    let lastSynapseTime = 0;

    const render = (time: number) => {
      const currentState = stateRef.current;
      const currentScheme = getColorScheme(currentState);
      const mouse = mousePosRef.current;
      const centerX = width * 0.38; // Slightly centered around the Command/Orb stage on desktop
      const centerY = height * 0.48;

      // Clear with dark tech gradient background
      ctx.clearRect(0, 0, width, height);

      // 1. Perspective Cybernetic Grid Matrix
      ctx.save();
      ctx.strokeStyle = currentState === 'THINKING' 
        ? 'rgba(168, 85, 247, 0.07)' 
        : currentState === 'SPEAKING'
        ? 'rgba(52, 211, 153, 0.07)'
        : 'rgba(92, 200, 255, 0.04)';
      ctx.lineWidth = 1;

      gridOffset = (gridOffset + (currentState === 'THINKING' ? 0.6 : 0.2)) % 40;
      const gridSize = 45;

      // Vertical grid lines
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal grid lines with drifting animation
      for (let y = gridOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Ambient Glowing Core Orb Flare on canvas
      const glowGrad = ctx.createRadialGradient(
        centerX, centerY, 10,
        centerX, centerY, Math.min(width, height) * 0.55
      );
      glowGrad.addColorStop(0, currentScheme.glow);
      glowGrad.addColorStop(0.5, 'rgba(5, 12, 22, 0.05)');
      glowGrad.addColorStop(1, 'rgba(5, 7, 10, 0)');

      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Rotating Hologram Radar Arcs & Telemetry Crossbars
      ctx.save();
      ctx.translate(centerX, centerY);

      // Radar rotation speed adjusts with state
      const radarSpeed = currentState === 'THINKING' ? 0.035 : currentState === 'SPEAKING' ? 0.02 : 0.007;
      radarAngle += radarSpeed;

      // Radar Sweep Cone
      const sweepGradient = ctx.createConicGradient(radarAngle, 0, 0);
      sweepGradient.addColorStop(0, 'rgba(92, 200, 255, 0)');
      sweepGradient.addColorStop(0.75, 'rgba(92, 200, 255, 0)');
      sweepGradient.addColorStop(1, currentScheme.ringColor);

      ctx.beginPath();
      ctx.arc(0, 0, 320, 0, Math.PI * 2);
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Concentric Thin Holographic Rings
      const ringCount = 4;
      for (let r = 1; r <= ringCount; r++) {
        const radius = r * 85;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = currentScheme.ringColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(r % 2 === 0 ? [4, 8] : [2, 14]);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset dash

      // Rotating dashed satellite ring
      ctx.save();
      ctx.rotate(-radarAngle * 1.5);
      ctx.beginPath();
      ctx.arc(0, 0, 240, 0, Math.PI * 0.4);
      ctx.strokeStyle = currentScheme.accent + ' 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 240, Math.PI, Math.PI * 1.4);
      ctx.strokeStyle = currentScheme.accent + ' 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // 4. State-Driven Shockwaves & Synaptic Bursts
      // Trigger shockwaves during speaking or thinking
      if (
        (currentState === 'THINKING' && time - lastShockwaveTime > 900) ||
        (currentState === 'SPEAKING' && time - lastShockwaveTime > 550) ||
        (currentState === 'LISTENING' && time - lastShockwaveTime > 1400) ||
        (currentState === 'IDLE' && time - lastShockwaveTime > 3200)
      ) {
        lastShockwaveTime = time;
        const avgAudio = audioLevelsRef.current.reduce((a, b) => a + b, 0) / (audioLevelsRef.current.length || 1);
        shockwaves.push({
          x: centerX,
          y: centerY,
          radius: 40,
          maxRadius: currentState === 'SPEAKING' ? 380 + avgAudio * 3 : 320,
          alpha: currentState === 'SPEAKING' ? 0.75 : currentState === 'THINKING' ? 0.6 : 0.35,
          speed: currentState === 'THINKING' ? 3.5 : currentState === 'SPEAKING' ? 4.2 : 1.8,
          color: currentScheme.primary,
          lineWidth: currentState === 'SPEAKING' ? 2.5 : 1.5
        });
      }

      // Update & Draw Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.alpha = Math.max(0, sw.alpha - 0.009 * (sw.speed / 2));

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${sw.color} ${sw.alpha})`;
        ctx.lineWidth = sw.lineWidth;
        ctx.stroke();
      }

      // 5. Neural Synapse Pulses during THINKING & IDLE
      if (currentState === 'THINKING' && time - lastSynapseTime > 200 && particles.length > 2) {
        lastSynapseTime = time;
        const p1 = particles[Math.floor(Math.random() * particles.length)];
        const p2 = particles[Math.floor(Math.random() * particles.length)];
        if (p1 && p2 && p1 !== p2) {
          synapses.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            progress: 0,
            speed: 0.05 + Math.random() * 0.04,
            color: Math.random() > 0.5 ? 'rgba(192, 132, 252,' : 'rgba(92, 200, 255,',
            alpha: 0.9
          });
        }
      }

      // Draw Synapses
      for (let i = synapses.length - 1; i >= 0; i--) {
        const syn = synapses[i];
        syn.progress += syn.speed;
        syn.alpha -= 0.015;

        if (syn.progress >= 1 || syn.alpha <= 0) {
          synapses.splice(i, 1);
          continue;
        }

        const currX = syn.x1 + (syn.x2 - syn.x1) * syn.progress;
        const currY = syn.y1 + (syn.y2 - syn.y1) * syn.progress;

        // Draw lightning trace
        ctx.beginPath();
        ctx.moveTo(syn.x1, syn.y1);
        ctx.lineTo(currX, currY);
        ctx.strokeStyle = `${syn.color} ${syn.alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw glowing spark head
        ctx.beginPath();
        ctx.arc(currX, currY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${syn.color} ${syn.alpha})`;
        ctx.shadowColor = '#5CC8FF';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 6. Particle Constellation Network
      const connectionDist = currentState === 'THINKING' ? 140 : 110;
      const speedMultiplier = currentState === 'THINKING' ? 2.2 : currentState === 'SPEAKING' ? 1.6 : 1.0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Animate pulse
        p.pulsePhase += p.pulseSpeed * speedMultiplier;
        p.alpha = p.baseAlpha + Math.sin(p.pulsePhase) * 0.2;
        p.radius = p.baseRadius + Math.sin(p.pulsePhase) * 0.5;

        // Move particle
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        // Boundary wrapping
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse Parallax / Repulsion
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            const force = (120 - dist) / 120;
            p.x -= (dx / dist) * force * 3.5;
            p.y -= (dy / dist) * force * 3.5;
          }
        }

        // Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = `${currentScheme.primary} ${Math.max(0.1, p.alpha)})`;
        ctx.fill();

        // Draw Interconnection Lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDist) {
            const lineAlpha = (1 - dist / connectionDist) * 0.25 * (currentState === 'THINKING' ? 1.8 : 1);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${currentScheme.primary} ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {/* Dynamic Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-90 transition-opacity duration-1000"
      />

      {/* Cyber Scanline Overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30"
      />

      {/* Sci-Fi HUD Corner Brackets */}
      <div className="absolute top-12 left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute top-12 right-4 w-12 h-12 border-t-2 border-r-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-500/30 pointer-events-none" />
    </div>
  );
};
