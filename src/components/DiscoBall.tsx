import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Zap, Flame } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface DiscoBallProps {
  isPlaying?: boolean; // Whether song is currently playing in player
  intensity?: number;  // Base intensity 0 to 100
}

interface ConcertColorPalette {
  name: string;
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  strobe: [number, number, number];
}

const PALETTES: ConcertColorPalette[] = [
  {
    name: '80s Synthwave & Neon Pop',
    primary: [236, 72, 153],   // neon pink
    secondary: [6, 182, 212],   // electric cyan
    accent: [168, 85, 247],    // purple
    strobe: [255, 255, 255],    // pure white
  },
  {
    name: 'Stadium Rock & Glam',
    primary: [245, 158, 11],   // gold
    secondary: [239, 68, 68],   // fiery red
    accent: [217, 70, 239],    // magenta
    strobe: [254, 240, 138],    // pale gold
  },
  {
    name: 'Cyber Rave & Club Night',
    primary: [16, 185, 129],   // neon mint
    secondary: [99, 102, 241],  // indigo electric
    accent: [244, 63, 94],     // rose
    strobe: [224, 242, 254],    // ice blue
  },
];

export const DiscoBall: React.FC<DiscoBallProps> = ({ 
  isPlaying = false,
  intensity = 75 
}) => {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<'show' | 'subtle'>('show');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashOverlayRef = useRef<HTMLDivElement | null>(null);

  // Real-time Concert Stage Lighting & Rhythm Beat Animation
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Disco specular reflection dots
    const dotsCount = 55;
    const dots: Array<{
      x: number;
      y: number;
      radius: number;
      speedX: number;
      speedY: number;
      colorIdx: number;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    for (let i = 0; i < dotsCount; i++) {
      dots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 4 + 1.5,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1.2,
        colorIdx: Math.floor(Math.random() * 4),
        alpha: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.05 + 0.02,
      });
    }

    // Moving Head Spotlight Cones
    const spotlights = [
      { originX: 0.12, originY: 0, angleBase: Math.PI * 0.28, sweepRange: 0.38, sweepSpeed: 0.0018 },
      { originX: 0.28, originY: 0, angleBase: Math.PI * 0.38, sweepRange: 0.42, sweepSpeed: 0.0022 },
      { originX: 0.50, originY: 0, angleBase: Math.PI * 0.50, sweepRange: 0.55, sweepSpeed: 0.0028 },
      { originX: 0.72, originY: 0, angleBase: Math.PI * 0.62, sweepRange: 0.42, sweepSpeed: 0.0021 },
      { originX: 0.88, originY: 0, angleBase: Math.PI * 0.72, sweepRange: 0.38, sweepSpeed: 0.0019 },
    ];

    // Lasers
    const lasers = [
      { startX: 0, startY: 0.2, targetX: 1, targetY: 0.8, colorIdx: 0, phase: 0 },
      { startX: 1, startY: 0.2, targetX: 0, targetY: 0.85, colorIdx: 1, phase: 1.2 },
      { startX: 0.5, startY: 0, targetX: 0.2, targetY: 1, colorIdx: 2, phase: 2.4 },
      { startX: 0.5, startY: 0, targetX: 0.8, targetY: 1, colorIdx: 0, phase: 3.6 },
    ];

    let startTime = performance.now();
    const bpm = 124; // Standard energetic concert tempo
    const beatDurationMs = (60 / bpm) * 1000; // ~483.8ms per beat

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = now - startTime;

      // Rhythm beat calculations
      const beatFraction = (elapsed % beatDurationMs) / beatDurationMs;
      const beatIndex = Math.floor((elapsed / beatDurationMs) % 4); // 0, 1, 2, 3 in a 4/4 measure
      const barIndex = Math.floor(elapsed / (beatDurationMs * 4));

      // Color Palette progression (every 16 bars ~30s it shifts palette)
      const paletteIndex = Math.floor(barIndex / 16) % PALETTES.length;
      const curPalette = PALETTES[paletteIndex];

      // Voice level reactivity from microphone
      let voiceLevel = 0;
      try {
        voiceLevel = AudioEngine.getInstance().getOverallVoiceLevel();
      } catch (e) {}
      const voiceFactor = Math.min(1.0, voiceLevel / 60);

      // Beat Pulses (Kick on 0 & 2, Snare on 1 & 3)
      let beatPulse = 0;
      if (isPlaying) {
        if (beatIndex === 0 || beatIndex === 2) {
          // Kick pulse (heavy with snappy decay)
          beatPulse = Math.pow(Math.max(0, 1 - beatFraction * 1.5), 2.5);
        } else {
          // Snare / clap accent pulse
          beatPulse = Math.pow(Math.max(0, 1 - beatFraction * 2.0), 3.0) * 0.85;
        }

        // Add special strobe blinder burst every 8th bar on 4th beat
        if (barIndex % 8 === 7 && beatIndex === 3) {
          const strobeSub = Math.sin(beatFraction * Math.PI * 8);
          if (strobeSub > 0.5) beatPulse = 1.0;
        }
      } else {
        // Subtle ambient breathing when song is paused
        beatPulse = 0.18 + Math.sin(elapsed * 0.002) * 0.08;
      }

      // Combine beat pulse with singer voice boost
      const effectiveIntensity = (intensity / 100);
      const totalEnergy = Math.min(1.0, (beatPulse * 0.7 + voiceFactor * 0.6) * (mode === 'show' ? 1.0 : 0.45));

      // 1. Update Flash Background Overlay (Piscando o fundo do site)
      if (flashOverlayRef.current) {
        const pCol = curPalette.primary;
        const sCol = curPalette.secondary;
        const aCol = curPalette.accent;
        const strobeCol = curPalette.strobe;

        // When singing loud or on heavy kick beat: add a bright flash of light to the background
        const flashAlpha = Math.max(0.08, totalEnergy * 0.55 * effectiveIntensity);
        const topAlpha = Math.max(0.12, (totalEnergy * 0.75 + voiceFactor * 0.4) * effectiveIntensity);

        const isDropStrobe = (barIndex % 8 === 7 && beatIndex === 3 && beatFraction > 0.5);
        const strobeAlpha = isDropStrobe || voiceLevel > 65 ? 0.25 : 0;

        flashOverlayRef.current.style.background = `
          radial-gradient(circle at 15% 15%, rgba(${pCol[0]}, ${pCol[1]}, ${pCol[2]}, ${topAlpha}) 0%, transparent 55%),
          radial-gradient(circle at 85% 15%, rgba(${sCol[0]}, ${sCol[1]}, ${sCol[2]}, ${topAlpha}) 0%, transparent 55%),
          radial-gradient(ellipse at 50% 0%, rgba(${aCol[0]}, ${aCol[1]}, ${aCol[2]}, ${topAlpha * 0.9}) 0%, transparent 65%),
          radial-gradient(circle at 50% 85%, rgba(${pCol[0]}, ${pCol[1]}, ${pCol[2]}, ${flashAlpha * 0.8}) 0%, transparent 60%),
          rgba(${strobeCol[0]}, ${strobeCol[1]}, ${strobeCol[2]}, ${strobeAlpha})
        `;
      }

      // 2. Render Volumetric Moving Head Spotlights across the Canvas
      const maxDim = Math.max(canvas.width, canvas.height);
      const beamLength = maxDim * 1.35;

      spotlights.forEach((spot, i) => {
        const spotX = canvas.width * spot.originX;
        const spotY = spot.originY;

        // Oscillate sweep angle with harmonics
        const sweepAngle = spot.angleBase + Math.sin(now * spot.sweepSpeed + i * 1.3) * spot.sweepRange;
        const colArr = i % 2 === 0 ? curPalette.primary : (i % 3 === 0 ? curPalette.accent : curPalette.secondary);

        // Beam width spreads dynamically on beat kick
        const beamSpread = 0.16 + (totalEnergy * 0.08);
        const beamAlpha = (0.04 + totalEnergy * 0.16) * effectiveIntensity;

        const targetX = spotX + Math.cos(sweepAngle) * beamLength;
        const targetY = spotY + Math.sin(sweepAngle) * beamLength;

        const grad = ctx.createLinearGradient(spotX, spotY, targetX, targetY);
        grad.addColorStop(0, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, ${beamAlpha * 2.5})`);
        grad.addColorStop(0.25, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, ${beamAlpha})`);
        grad.addColorStop(0.7, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, ${beamAlpha * 0.3})`);
        grad.addColorStop(1, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, 0)`);

        ctx.beginPath();
        ctx.moveTo(spotX, spotY);
        ctx.lineTo(
          spotX + Math.cos(sweepAngle - beamSpread) * beamLength,
          spotY + Math.sin(sweepAngle - beamSpread) * beamLength
        );
        ctx.lineTo(
          spotX + Math.cos(sweepAngle + beamSpread) * beamLength,
          spotY + Math.sin(sweepAngle + beamSpread) * beamLength
        );
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // 3. Render Stage Laser Lines (crisp razor beams that pulse on the beat)
      if (isPlaying && mode === 'show') {
        lasers.forEach((laser, idx) => {
          const lX1 = laser.startX * canvas.width;
          const lY1 = laser.startY * canvas.height;
          // Target wiggles with rhythm
          const lX2 = (laser.targetX + Math.sin(now * 0.003 + laser.phase) * 0.15) * canvas.width;
          const lY2 = (laser.targetY + Math.cos(now * 0.002 + laser.phase) * 0.1) * canvas.height;

          const lCol = idx % 2 === 0 ? curPalette.primary : curPalette.secondary;
          const laserOpacity = Math.max(0.1, totalEnergy * 0.85);

          ctx.beginPath();
          ctx.moveTo(lX1, lY1);
          ctx.lineTo(lX2, lY2);
          ctx.strokeStyle = `rgba(${lCol[0]}, ${lCol[1]}, ${lCol[2]}, ${laserOpacity})`;
          ctx.lineWidth = 1.2 + totalEnergy * 2.5;
          ctx.shadowColor = `rgba(${lCol[0]}, ${lCol[1]}, ${lCol[2]}, 1)`;
          ctx.shadowBlur = 10 + totalEnergy * 15;
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        });
      }

      // 4. Render Disco Mirror Facets (Glittering Sparkle Dots drifting across screen)
      dots.forEach(dot => {
        dot.x += dot.speedX * (1 + totalEnergy * 0.8);
        dot.y += dot.speedY * (1 + totalEnergy * 0.8);

        if (dot.x < 0) dot.x = canvas.width;
        if (dot.x > canvas.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas.height;
        if (dot.y > canvas.height) dot.y = 0;

        const dCol = dot.colorIdx === 0 
          ? curPalette.primary 
          : (dot.colorIdx === 1 ? curPalette.secondary : (dot.colorIdx === 2 ? curPalette.accent : curPalette.strobe));

        // Pulsing sparkle radius and brightness
        const pulse = Math.sin(now * dot.pulseSpeed) * 0.3 + totalEnergy * 0.7;
        const curAlpha = Math.min(1.0, Math.max(0.15, dot.alpha + pulse * 0.5));
        const curRadius = dot.radius * (1 + totalEnergy * 0.6);

        const radGrad = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, curRadius * 3);
        radGrad.addColorStop(0, `rgba(${dCol[0]}, ${dCol[1]}, ${dCol[2]}, ${curAlpha})`);
        radGrad.addColorStop(0.4, `rgba(${dCol[0]}, ${dCol[1]}, ${dCol[2]}, ${curAlpha * 0.4})`);
        radGrad.addColorStop(1, `rgba(${dCol[0]}, ${dCol[1]}, ${dCol[2]}, 0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, curRadius * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, isPlaying, intensity, mode]);

  return (
    <>
      {/* Dynamic Background Concert Lighting Wash (Piscando o fundo do site no ritmo da música e voz) */}
      {enabled && (
        <div
          ref={flashOverlayRef}
          className="fixed inset-0 pointer-events-none z-0 transition-[background] duration-75 ease-out"
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* Volumetric Lights & Stage Lasers Canvas */}
      {enabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-0 opacity-90 transition-opacity duration-500"
        />
      )}

      {/* The Hanging 3D Disco Mirror Ball at Top Center */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
        {/* Metallic Hanging Chain */}
        <div className="w-[2px] h-8 md:h-11 bg-gradient-to-b from-slate-600 via-slate-400 to-slate-300 shadow-sm" />

        {/* Disco Ball Sphere */}
        <div 
          className="relative group pointer-events-auto cursor-pointer" 
          onClick={() => {
            if (!enabled) {
              setEnabled(true);
              setMode('show');
            } else if (mode === 'show') {
              setMode('subtle');
            } else {
              setEnabled(false);
            }
          }}
        >
          <div 
            title={enabled ? (mode === 'show' ? 'Luzes de Show ativadas! Clique para modo suave' : 'Luzes suaves ativadas! Clique para desligar') : 'Ligar Show de Luzes'}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full relative overflow-hidden transition-all duration-300 ${
              enabled ? 'shadow-disco' : 'opacity-60 scale-95'
            }`}
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #cbd5e1 25%, #64748b 60%, #1e293b 100%)',
              boxShadow: enabled 
                ? '0 0 30px rgba(236, 72, 153, 0.5), 0 0 55px rgba(6, 182, 212, 0.45), inset -4px -4px 10px rgba(0,0,0,0.6), inset 4px 4px 10px rgba(255,255,255,0.8)' 
                : 'inset -3px -3px 8px rgba(0,0,0,0.7)',
            }}
          >
            {/* Mirror Facets Texture (grid pattern) */}
            <div 
              className={`absolute inset-0 bg-disco-facets ${enabled ? 'animate-disco-spin' : ''}`}
              style={{
                animationDuration: isPlaying ? '3.5s' : '8s', // Spins faster during live concert song!
              }}
            />

            {/* Specular Highlight Glints */}
            <div className="absolute top-2 left-3 w-4 h-4 rounded-full bg-white/80 blur-[1px] animate-pulse" />
            <div className="absolute bottom-3 right-4 w-2.5 h-2.5 rounded-full bg-cyan-300/80 blur-[0.5px]" />
          </div>

          {/* Quick toggle tooltip on hover */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9.5px] font-bold tracking-wider text-pink-300 uppercase bg-slate-950/95 px-2.5 py-1 rounded-full border border-pink-500/40 pointer-events-none whitespace-nowrap shadow-xl flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-pink-400" />
            {enabled ? (mode === 'show' ? 'Show de Luzes ON' : 'Luzes Suaves') : 'Luzes OFF'}
          </div>
        </div>
      </div>

      {/* Floating Concert Lighting Control in Bottom Left */}
      <button
        onClick={() => {
          if (!enabled) {
            setEnabled(true);
            setMode('show');
          } else if (mode === 'show') {
            setMode('subtle');
          } else {
            setEnabled(false);
          }
        }}
        title="Alternar efeito Show de Luzes / Discoteca no ritmo da música"
        className={`fixed bottom-4 left-4 z-40 px-3 py-2 rounded-full border text-xs flex items-center gap-2 transition-all shadow-2xl backdrop-blur-md active:scale-95 ${
          enabled
            ? (mode === 'show'
                ? 'bg-gradient-to-r from-pink-600/40 via-purple-600/40 to-cyan-600/40 border-pink-500/70 text-pink-200 hover:scale-105 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
                : 'bg-slate-900/80 border-cyan-500/50 text-cyan-300')
            : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300'
        }`}
      >
        {enabled && mode === 'show' ? (
          <Flame className="w-4 h-4 text-pink-400 animate-pulse" />
        ) : (
          <Zap className={`w-4 h-4 ${enabled ? 'text-cyan-400' : 'text-slate-500'}`} />
        )}
        <span className="hidden md:inline font-bold text-[11px] uppercase tracking-wider">
          {enabled ? (mode === 'show' ? 'Show de Luzes: ON' : 'Luzes: Suave') : 'Luzes: OFF'}
        </span>
      </button>
    </>
  );
};
