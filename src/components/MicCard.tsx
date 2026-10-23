import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Headphones, Volume2, Sparkles, Trash2 } from 'lucide-react';
import type { ConnectedMicInfo } from '../audio/types';
import { AudioEngine } from '../audio/AudioEngine';

interface MicCardProps {
  mic: ConnectedMicInfo;
  onVolumeChange: (id: string, volume: number) => void;
  onMonitorToggle: (id: string, monitor: boolean) => void;
  onMuteToggle: (id: string, muted: boolean) => void;
  onSelectForEffects: (id: string) => void;
  onRemove: (id: string) => void;
  isEffectActive: boolean;
}

export const MicCard: React.FC<MicCardProps> = ({
  mic,
  onVolumeChange,
  onMonitorToggle,
  onMuteToggle,
  onSelectForEffects,
  onRemove,
  isEffectActive,
}) => {
  const [level, setLevel] = useState(0);

  // Poll live VU meter for this mic
  useEffect(() => {
    let animId: number;
    const engine = AudioEngine.getInstance();

    const updateMeter = () => {
      const curLevel = engine.getMicLevel(mic.id);
      setLevel(curLevel);
      animId = requestAnimationFrame(updateMeter);
    };

    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [mic.id]);

  return (
    <div className={`relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-300 ${
      isEffectActive
        ? 'bg-[#181d2a] border-emerald-500/70 shadow-glow-green'
        : 'bg-[#12151e]/90 border-slate-800/80 hover:border-slate-700/80 shadow-lg'
    }`}>
      {/* Mic Icon with Glowing Green Active Status Ring & VU Meter Reaction */}
      <div className="relative">
        {/* Pulsing Connected Ring */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          mic.muted
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60 mic-active-ring'
        }`}>
          {mic.muted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5 transition-transform duration-75" style={{ transform: `scale(${1 + (level / 250)})` }} />
          )}
        </div>

        {/* Circular VU Meter Overlay */}
        {!mic.muted && level > 5 && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-emerald-400 pointer-events-none transition-opacity"
            style={{ 
              opacity: Math.min(1, level / 50),
              transform: `scale(${1 + (level / 300)})` 
            }}
          />
        )}
      </div>

      {/* Mic Identity & VU Bar */}
      <div className="flex flex-col min-w-[110px] max-w-[150px]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-100">{mic.shortName}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-green inline-block animate-pulse" />
          {(!mic.effects || mic.effects.preset === 'clean') && (
            <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-medium" title="Sinal direto do hardware sem nenhum atraso de buffer">
              Zero Delay
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 truncate" title={mic.label}>
          {mic.label}
        </span>

        {/* Mini VU bar */}
        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden mt-1.5">
          <div 
            className="h-full transition-all duration-75 rounded-full"
            style={{
              width: `${mic.muted ? 0 : level}%`,
              backgroundColor: level > 80 ? '#f43f5e' : level > 50 ? '#f59e0b' : '#10b981',
            }}
          />
        </div>
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-2 px-1">
        <Volume2 className="w-4 h-4 text-slate-400" />
        <input
          type="range"
          min="0"
          max="200"
          value={mic.volume}
          onChange={e => onVolumeChange(mic.id, parseInt(e.target.value, 10))}
          title={`Volume: ${mic.volume}%`}
          className="w-20 md:w-28 h-1.5 accent-emerald-500 cursor-pointer"
        />
        <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
          {mic.volume}%
        </span>
      </div>

      {/* Retorno de Voz (Voice Monitor on/off) */}
      <button
        onClick={() => onMonitorToggle(mic.id, !mic.monitorVoice)}
        title={
          mic.monitorVoice
            ? 'Retorno de voz ATIVO (ouvindo sua voz nas caixas/fone). Dica: desative se sentir o atraso natural do Windows para cantar sem eco mental!'
            : 'Retorno de voz DESLIGADO (voz natural 0ms sem eco). Amigos na sala e gravação continuam te ouvindo 100%!'
        }
        className={`p-2 rounded-xl border text-xs flex items-center gap-1 font-medium transition ${
          mic.monitorVoice
            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30'
            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
        }`}
      >
        <Headphones className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[11px]">
          {mic.monitorVoice ? 'Retorno ON' : 'Retorno OFF'}
        </span>
      </button>

      {/* Mute Button */}
      <button
        onClick={() => onMuteToggle(mic.id, !mic.muted)}
        title={mic.muted ? 'Desmutar microfone' : 'Mutar microfone'}
        className={`p-2 rounded-xl border transition ${
          mic.muted
            ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
        }`}
      >
        {mic.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      {/* Open Effects Panel Button */}
      <button
        onClick={() => onSelectForEffects(mic.id)}
        title="Configurar efeitos deste microfone"
        className={`p-2 rounded-xl border transition ${
          isEffectActive
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-glow-green'
            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-emerald-400'
        }`}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Remove Microphone Button */}
      <button
        onClick={() => onRemove(mic.id)}
        title="Desconectar microfone"
        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
