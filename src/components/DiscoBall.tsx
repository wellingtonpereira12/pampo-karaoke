import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface DiscoBallProps {
  intensity?: number; // 0 to 100
}

export const DiscoBall: React.FC<DiscoBallProps> = ({ intensity = 50 }) => {
  const [enabled, setEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas animated light spots and sweeping laser/disco beams
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Light dots drifting across the floor and walls
    const dotsCount = 45;
    const dots: Array<{
      x: number;
      y: number;
      radius: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;
      pulseSpeed: number;
    }> = [];

    const colors = [
      'rgba(244, 63, 94, ',   // neon rose
      'rgba(6, 182, 212, ',   // cyan 80s
      'rgba(217, 70, 239, ',  // magenta disco
      'rgba(245, 158, 11, ',  // retro gold
      'rgba(16, 185, 129, ',  // neon mint
      'rgba(168, 85, 247, ',  // electric purple
    ];

    for (let i = 0; i < dotsCount; i++) {
      dots.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 4 + 1.5,
        speedX: (Math.random() - 0.5) * 1.2,
        speedY: (Math.random() - 0.5) * 0.9,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.05 + 0.02,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const originY = 50; // top hanging ball position

      // Draw sweeping 80s disco beam cones
      const beamCount = 7;
      angle += 0.008;

      ctx.save();
      for (let i = 0; i < beamCount; i++) {
        const beamAngle = angle + (i * (Math.PI * 2) / beamCount);
        const length = Math.max(canvas.width, canvas.height) * 1.2;
        const targetX = centerX + Math.cos(beamAngle) * length;
        const targetY = originY + Math.sin(beamAngle) * length;

        const grad = ctx.createLinearGradient(centerX, originY, targetX, targetY);
        const col = colors[i % colors.length];
        const beamOpacity = 0.09 * (intensity / 50);

        grad.addColorStop(0, `${col}${beamOpacity * 2.2})`);
        grad.addColorStop(0.3, `${col}${beamOpacity})`);
        grad.addColorStop(1, `${col}0)`);

        ctx.beginPath();
        ctx.moveTo(centerX, originY);
        // spread angle
        const spread = 0.22;
        ctx.lineTo(
          centerX + Math.cos(beamAngle - spread) * length,
          originY + Math.sin(beamAngle - spread) * length
        );
        ctx.lineTo(
          centerX + Math.cos(beamAngle + spread) * length,
          originY + Math.sin(beamAngle + spread) * length
        );
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      // Render floating disco specular dots
      dots.forEach(dot => {
        dot.x += dot.speedX;
        dot.y += dot.speedY;

        if (dot.x < 0) dot.x = canvas.width;
        if (dot.x > canvas.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas.height;
        if (dot.y > canvas.height) dot.y = 0;

        dot.alpha += Math.sin(angle * 10 * dot.pulseSpeed) * 0.03;
        const curAlpha = Math.max(0.1, Math.min(0.85, dot.alpha));

        const radGrad = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.radius * 3);
        radGrad.addColorStop(0, `${dot.color}${curAlpha})`);
        radGrad.addColorStop(0.5, `${dot.color}${curAlpha * 0.4})`);
        radGrad.addColorStop(1, `${dot.color}0)`);

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, intensity]);

  return (
    <>
      {/* Background Canvas with Sweeping 70s/80s Disco Beams */}
      {enabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-0 opacity-80 transition-opacity duration-700"
        />
      )}

      {/* The Hanging 3D Disco Mirror Ball at Top Center */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
        {/* Metallic Hanging Chain */}
        <div className="w-[2px] h-8 md:h-11 bg-gradient-to-b from-slate-600 via-slate-400 to-slate-300 shadow-sm" />

        {/* Disco Ball Sphere */}
        <div className="relative group pointer-events-auto cursor-pointer" onClick={() => setEnabled(!enabled)}>
          <div 
            title={enabled ? 'Desativar luzes de discoteca' : 'Ativar luzes de discoteca anos 80'}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full relative overflow-hidden transition-all duration-300 ${
              enabled ? 'shadow-disco' : 'opacity-60 scale-95'
            }`}
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #cbd5e1 25%, #64748b 60%, #1e293b 100%)',
              boxShadow: enabled 
                ? '0 0 25px rgba(236, 72, 153, 0.4), 0 0 45px rgba(6, 182, 212, 0.35), inset -4px -4px 10px rgba(0,0,0,0.6), inset 4px 4px 10px rgba(255,255,255,0.8)' 
                : 'inset -3px -3px 8px rgba(0,0,0,0.7)',
            }}
          >
            {/* Mirror Facets Texture (grid pattern) */}
            <div 
              className={`absolute inset-0 bg-disco-facets ${enabled ? 'animate-disco-spin' : ''}`}
            />

            {/* Specular Highlight Glint */}
            <div className="absolute top-2 left-3 w-4 h-4 rounded-full bg-white/80 blur-[1px] animate-pulse" />
            <div className="absolute bottom-3 right-4 w-2 h-2 rounded-full bg-cyan-300/80 blur-[0.5px]" />
          </div>

          {/* Quick toggle indicator */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold tracking-wider text-pink-400 uppercase bg-slate-950/90 px-2 py-0.5 rounded-full border border-pink-500/40 pointer-events-none whitespace-nowrap shadow-lg">
            {enabled ? 'Disco ON' : 'Disco OFF'}
          </div>
        </div>
      </div>

      {/* Floating Toggle Button for Disco Vibe in bottom left */}
      <button
        onClick={() => setEnabled(!enabled)}
        title={enabled ? 'Pausar efeito Anos 80' : 'Ligar efeito Anos 80'}
        className={`fixed bottom-4 left-4 z-40 p-2.5 rounded-full border text-xs flex items-center gap-1.5 transition-all shadow-xl backdrop-blur-md ${
          enabled
            ? 'bg-gradient-to-r from-pink-600/30 to-purple-600/30 border-pink-500/60 text-pink-300 hover:scale-105 shadow-glow-purple'
            : 'bg-slate-900/80 border-slate-800 text-slate-500 hover:text-slate-300'
        }`}
      >
        <Sparkles className={`w-4 h-4 ${enabled ? 'text-pink-400 animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
        <span className="hidden md:inline font-semibold text-[11px] uppercase tracking-wider">
          Anos 80
        </span>
      </button>
    </>
  );
};
