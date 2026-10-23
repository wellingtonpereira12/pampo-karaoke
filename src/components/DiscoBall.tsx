import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';
import type { VideoPalette } from '../utils/colorExtractor';

interface DiscoBallProps {
  isPlaying?: boolean; // Whether song is currently playing in player
  intensity?: number;  // Base intensity 0 to 100
  videoPalette?: VideoPalette | null; // Real-time dominant colors from the current video
}

interface ConcertColorPalette {
  name: string;
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

const PALETTES: ConcertColorPalette[] = [
  {
    name: '80s Synthwave & Neon Pop',
    primary: [236, 72, 153],   // neon pink
    secondary: [6, 182, 212],   // electric cyan
    accent: [168, 85, 247],    // purple
  },
  {
    name: 'Stadium Rock & Glam',
    primary: [245, 158, 11],   // gold
    secondary: [239, 68, 68],   // fiery red
    accent: [217, 70, 239],    // magenta
  },
  {
    name: 'Cyber Rave & Club Night',
    primary: [16, 185, 129],   // neon mint
    secondary: [99, 102, 241],  // indigo electric
    accent: [244, 63, 94],     // rose
  },
];

export const DiscoBall: React.FC<DiscoBallProps> = ({ 
  isPlaying = false,
  intensity = 70,
  videoPalette = null,
}) => {
  const [enabled] = useState(true);
  const [mode] = useState<'show' | 'subtle'>('show');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashOverlayRef = useRef<HTMLDivElement | null>(null);

  // Smooth vocal color interpolation state
  const vocalColorRef = useRef<[number, number, number]>([236, 72, 153]);

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
    const dotsCount = 45;
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
        radius: Math.random() * 3.5 + 1.2,
        speedX: (Math.random() - 0.5) * 1.2,
        speedY: (Math.random() - 0.5) * 0.9,
        colorIdx: Math.floor(Math.random() * 3),
        alpha: Math.random() * 0.5 + 0.2,
        pulseSpeed: Math.random() * 0.04 + 0.015,
      });
    }

    // Moving Head Spotlight Cones
    const spotlights = [
      { originX: 0.12, originY: 0, angleBase: Math.PI * 0.28, sweepRange: 0.32, sweepSpeed: 0.0016 },
      { originX: 0.28, originY: 0, angleBase: Math.PI * 0.38, sweepRange: 0.36, sweepSpeed: 0.0020 },
      { originX: 0.50, originY: 0, angleBase: Math.PI * 0.50, sweepRange: 0.45, sweepSpeed: 0.0024 },
      { originX: 0.72, originY: 0, angleBase: Math.PI * 0.62, sweepRange: 0.36, sweepSpeed: 0.0019 },
      { originX: 0.88, originY: 0, angleBase: Math.PI * 0.72, sweepRange: 0.32, sweepSpeed: 0.0017 },
    ];

    // Smooth Lasers
    const lasers = [
      { startX: 0, startY: 0.2, targetX: 1, targetY: 0.8, colorIdx: 0, phase: 0 },
      { startX: 1, startY: 0.2, targetX: 0, targetY: 0.85, colorIdx: 1, phase: 1.2 },
      { startX: 0.5, startY: 0, targetX: 0.2, targetY: 1, colorIdx: 2, phase: 2.4 },
      { startX: 0.5, startY: 0, targetX: 0.8, targetY: 1, colorIdx: 0, phase: 3.6 },
    ];

    let startTime = performance.now();
    const bpm = 120; // Relaxed organic concert tempo
    const beatDurationMs = (60 / bpm) * 1000; // 500ms

    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = now - startTime;

      // Rhythm beat calculations
      const beatFraction = (elapsed % beatDurationMs) / beatDurationMs;
      const barIndex = Math.floor(elapsed / (beatDurationMs * 4));

      // Color Palette: harmonize with video palette if active, otherwise cycle standard palettes
      let curPalette: ConcertColorPalette;
      if (videoPalette) {
        curPalette = {
          name: 'Video Harmonized',
          primary: videoPalette.primary,
          secondary: videoPalette.secondary,
          accent: videoPalette.accent,
        };
      } else {
        const paletteIndex = Math.floor(barIndex / 16) % PALETTES.length;
        curPalette = PALETTES[paletteIndex];
      }

      // Voice level & frequency register ("altitude que a pessoa canta")
      let voiceVibe = { overallLevel: 0, pitchRegister: 'mid' as 'low' | 'mid' | 'high', brightness: 0.5 };
      try {
        voiceVibe = AudioEngine.getInstance().getVoiceVibe();
      } catch (e) {}
      const voiceFactor = Math.min(1.0, voiceVibe.overallLevel / 50);

      // Determine target vocal color depending on vocal pitch ("altitude")
      let targetVocalCol: [number, number, number];
      if (voiceVibe.pitchRegister === 'low') {
        // Grave / Notas baixas: Tons quentes e encorpados (dourado/âmbar aconchegante)
        targetVocalCol = [245, 158, 11];
      } else if (voiceVibe.pitchRegister === 'high') {
        // Agudo / Notas altas: Luz ciano neon / esmeralda cintilante
        targetVocalCol = [6, 182, 212];
      } else {
        // Médio / Voz normal: Púrpura / Magenta harmonizado com o vídeo
        targetVocalCol = curPalette.primary;
      }

      // Smooth color interpolation (LERP)
      const currentVocal = vocalColorRef.current;
      currentVocal[0] += (targetVocalCol[0] - currentVocal[0]) * 0.08;
      currentVocal[1] += (targetVocalCol[1] - currentVocal[1]) * 0.08;
      currentVocal[2] += (targetVocalCol[2] - currentVocal[2]) * 0.08;

      // Soft breathing beat pulse (instead of harsh strobes)
      let beatPulse = 0;
      if (isPlaying) {
        // Gentle organic pulse on the rhythm kick
        beatPulse = Math.pow(Math.max(0, 1 - beatFraction * 1.2), 2.0) * 0.65;
      } else {
        // Ambient calm breathing when paused
        beatPulse = 0.15 + Math.sin(elapsed * 0.0015) * 0.06;
      }

      // Combined smooth energy
      const effectiveIntensity = (intensity / 100);
      const totalEnergy = Math.min(1.0, (beatPulse * 0.55 + voiceFactor * 0.6) * (mode === 'show' ? 1.0 : 0.4));

      // 1. Soft Dynamic Background Ambient Glow (Sem flash branco, 100% colorido e aveludado)
      if (flashOverlayRef.current) {
        const pCol = curPalette.primary;
        const sCol = curPalette.secondary;
        const vCol = currentVocal;

        // Smooth glow opacity (maximum 0.28 to keep contrast and never blind the user)
        const ambientGlow = Math.max(0.06, totalEnergy * 0.28 * effectiveIntensity);
        const topGlow = Math.max(0.08, (totalEnergy * 0.35 + voiceFactor * 0.3) * effectiveIntensity);

        flashOverlayRef.current.style.background = `
          radial-gradient(circle at 18% 20%, rgba(${vCol[0]}, ${vCol[1]}, ${vCol[2]}, ${topGlow}) 0%, transparent 60%),
          radial-gradient(circle at 82% 20%, rgba(${sCol[0]}, ${sCol[1]}, ${sCol[2]}, ${topGlow}) 0%, transparent 60%),
          radial-gradient(ellipse at 50% 0%, rgba(${pCol[0]}, ${pCol[1]}, ${pCol[2]}, ${topGlow * 0.9}) 0%, transparent 70%),
          radial-gradient(circle at 50% 80%, rgba(${vCol[0]}, ${vCol[1]}, ${vCol[2]}, ${ambientGlow}) 0%, transparent 65%)
        `;
      }

      // 2. Volumetric Moving Head Spotlights across the Canvas
      const maxDim = Math.max(canvas.width, canvas.height);
      const beamLength = maxDim * 1.35;

      spotlights.forEach((spot, i) => {
        const spotX = canvas.width * spot.originX;
        const spotY = spot.originY;

        const sweepAngle = spot.angleBase + Math.sin(now * spot.sweepSpeed + i * 1.3) * spot.sweepRange;
        const colArr = i % 2 === 0 ? curPalette.primary : (i % 3 === 0 ? currentVocal : curPalette.secondary);

        const beamSpread = 0.15 + (totalEnergy * 0.06);
        const beamAlpha = (0.03 + totalEnergy * 0.12) * effectiveIntensity;

        const targetX = spotX + Math.cos(sweepAngle) * beamLength;
        const targetY = spotY + Math.sin(sweepAngle) * beamLength;

        const grad = ctx.createLinearGradient(spotX, spotY, targetX, targetY);
        grad.addColorStop(0, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, ${beamAlpha * 2.2})`);
        grad.addColorStop(0.3, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, ${beamAlpha})`);
        grad.addColorStop(0.7, `rgba(${colArr[0]}, ${colArr[1]}, ${colArr[2]}, ${beamAlpha * 0.25})`);
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

      // 3. Stage Lasers (smooth and colorful)
      if (isPlaying && mode === 'show') {
        lasers.forEach((laser, idx) => {
          const lX1 = laser.startX * canvas.width;
          const lY1 = laser.startY * canvas.height;
          const lX2 = (laser.targetX + Math.sin(now * 0.0025 + laser.phase) * 0.12) * canvas.width;
          const lY2 = (laser.targetY + Math.cos(now * 0.0018 + laser.phase) * 0.08) * canvas.height;

          const lCol = idx % 2 === 0 ? currentVocal : curPalette.secondary;
          const laserOpacity = Math.max(0.08, totalEnergy * 0.55);

          ctx.beginPath();
          ctx.moveTo(lX1, lY1);
          ctx.lineTo(lX2, lY2);
          ctx.strokeStyle = `rgba(${lCol[0]}, ${lCol[1]}, ${lCol[2]}, ${laserOpacity})`;
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(${lCol[0]}, ${lCol[1]}, ${lCol[2]}, 0.8)`;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      // 4. Disco Ball Specular Sparkle Dots
      dots.forEach((dot, idx) => {
        dot.x += dot.speedX;
        dot.y += dot.speedY;

        if (dot.x < 0) dot.x = canvas.width;
        if (dot.x > canvas.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas.height;
        if (dot.y > canvas.height) dot.y = 0;

        const pulse = 0.5 + Math.sin(now * dot.pulseSpeed + idx) * 0.5;
        const dAlpha = (dot.alpha * 0.6 + pulse * 0.4) * (0.35 + totalEnergy * 0.65);
        const dCol = dot.colorIdx === 0 ? curPalette.primary : (dot.colorIdx === 1 ? curPalette.secondary : currentVocal);

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius * (0.8 + pulse * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dCol[0]}, ${dCol[1]}, ${dCol[2]}, ${dAlpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, isPlaying, intensity, mode, videoPalette]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {/* Dynamic Smooth Ambient Aura Glow (Sem flash branco!) */}
      <div 
        ref={flashOverlayRef}
        className="absolute inset-0 transition-all duration-700 ease-out"
      />

      {/* Volumetric Spotlights & Sparkle Rays Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
      />

      {/* Floating Retro 80s Disco Mirror Ball at the Top Center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
        {/* Wire */}
        <div className="w-[1.5px] h-10 bg-gradient-to-b from-slate-400 via-slate-500 to-slate-300 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />

        {/* Disco Ball Sphere */}
        <div 
          className={`relative w-20 h-20 rounded-full shadow-[0_0_35px_rgba(236,72,153,0.4),0_0_70px_rgba(6,182,212,0.3)] transition-transform duration-300 ${
            isPlaying ? 'animate-disco-spin' : ''
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #cbd5e1 25%, #64748b 60%, #1e293b 100%)',
          }}
        >
          {/* Mirrored Facet Grid */}
          <div className="absolute inset-0 rounded-full disco-facets opacity-80 mix-blend-overlay" />

          {/* Glint Sparkle Star */}
          <div className="absolute top-3 left-4 w-4 h-4 rounded-full bg-white blur-[1.5px] animate-pulse" />
          <div className="absolute top-2 left-3 text-white/95 animate-spin-slow">
            <Sparkles className="w-5 h-5 fill-white stroke-none drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
