import React, { useState } from 'react';
import { 
  Sparkles, 
  Mic, 
  Sliders, 
  Radio, 
  Bot, 
  Waves, 
  Flame, 
  Check, 
  VolumeX, 
  Disc,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { ConnectedMicInfo, EffectPresetId, EffectSettings } from '../audio/types';
import { AudioEngine } from '../audio/AudioEngine';

interface EffectsPanelProps {
  mics: ConnectedMicInfo[];
  selectedMicId: string | null;
  onSelectMic: (id: string) => void;
  onApplyPreset: (micId: string, preset: EffectPresetId) => void;
  onUpdateSettings: (micId: string, settings: Partial<EffectSettings>) => void;
}

interface PresetDefinition {
  id: EffectPresetId;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
}

const PRESET_LIST: PresetDefinition[] = [
  {
    id: 'show',
    name: 'Karaokê Show',
    tagline: 'Reverb de show ao vivo, presença vocal e calor',
    icon: Sparkles,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/60 text-emerald-400',
    badge: 'Recomendado',
  },
  {
    id: 'studio',
    name: 'Estúdio Cristal',
    tagline: 'Voz nítida, compressão suave e brilho de alta definição',
    icon: Disc,
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/60 text-blue-400',
  },
  {
    id: 'arena',
    name: 'Eco de Arena',
    tagline: 'Delay espacial com repetições e reverb amplo de estádio',
    icon: Waves,
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/60 text-purple-400',
  },
  {
    id: 'warm',
    name: 'Mega Voz',
    tagline: 'Graves encorpados e calor aveludado para valorizar o timbre',
    icon: Flame,
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/60 text-amber-400',
  },
  {
    id: 'radio',
    name: 'Rádio / Megafone',
    tagline: 'Filtro vintage de ligação telefônica e rádio retrô',
    icon: Radio,
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/60 text-yellow-400',
  },
  {
    id: 'robot',
    name: 'Robô Cibernético',
    tagline: 'Modulação de frequência eletrônica futurista',
    icon: Bot,
    color: 'from-pink-500/20 to-rose-500/20 border-pink-500/60 text-pink-400',
  },
  {
    id: 'clean',
    name: 'Voz Limpa (Dry)',
    tagline: 'Sinal 100% natural sem processamento ou reverb',
    icon: VolumeX,
    color: 'from-slate-700/20 to-slate-800/20 border-slate-700 text-slate-300',
  },
];

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  mics,
  selectedMicId,
  onSelectMic,
  onApplyPreset,
  onUpdateSettings,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // If no specific mic is selected but we have mics, target the first one or all
  const targetMic = mics.find(m => m.id === selectedMicId) || mics[0] || null;

  const currentEffects = targetMic?.effects;

  const filteredPresets = PRESET_LIST.filter(p =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.tagline.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handlePresetClick = (presetId: EffectPresetId) => {
    if (!targetMic) return;
    onApplyPreset(targetMic.id, presetId);
  };

  const handleApplyToAllMics = (presetId: EffectPresetId) => {
    const engine = AudioEngine.getInstance();
    mics.forEach(m => {
      engine.applyPreset(m.id, presetId);
      onApplyPreset(m.id, presetId);
    });
  };

  return (
    <footer className="w-full bg-[#0d1017] border-t border-slate-800/80 px-4 md:px-8 py-5 mt-6 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        {/* Top Header of Effects Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Efeitos de Voz
                {targetMic && (
                  <span className="text-xs font-normal text-slate-400">
                    Configurando: <strong className="text-emerald-400">{targetMic.shortName}</strong>
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Microphones Selector (Bolinhas dos microfones conectados) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1">Microfone:</span>
            {mics.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Conecte um microfone para aplicar efeitos</span>
            ) : (
              mics.map(mic => {
                const isSelected = targetMic?.id === mic.id;
                return (
                  <button
                    key={mic.id}
                    onClick={() => onSelectMic(mic.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-glow-green scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <Mic className="w-3.5 h-3.5" />
                    <span>{mic.shortName}</span>
                  </button>
                );
              })
            )}

            {mics.length > 1 && (
              <button
                onClick={() => targetMic && handleApplyToAllMics(targetMic.effects.preset)}
                title="Aplicar mesmo efeito em todos os microfones"
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition"
              >
                Copiar para todos
              </button>
            )}
          </div>
        </div>

        {/* Filter Search for Presets */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar estilo de efeito..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/70"
            />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajuste Fino</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Preset Cards / Quadradinhos de Efeito Pré-setados */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {filteredPresets.map(preset => {
            const Icon = preset.icon;
            const isActive = currentEffects?.preset === preset.id;

            return (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                disabled={!targetMic}
                className={`relative group flex flex-col items-start p-3 rounded-2xl border text-left transition-all duration-200 disabled:opacity-40 ${
                  isActive
                    ? `bg-gradient-to-br ${preset.color} shadow-lg scale-[1.02]`
                    : 'bg-[#12151e]/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                {preset.badge && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                    {preset.badge}
                  </span>
                )}

                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition ${
                  isActive ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="w-full">
                  <h4 className="text-xs font-bold text-slate-100 flex items-center justify-between">
                    <span className="truncate">{preset.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                    {preset.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Advanced Fine Tuning Sliders (Expandable) */}
        {showAdvanced && targetMic && currentEffects && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 animate-fadeIn">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Ajustes Detalhados de Áudio ({targetMic.shortName})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Reverb Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Reverb (Espaço da Sala)</span>
                  <span className="font-mono text-emerald-400">{Math.round(currentEffects.reverbWet * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentEffects.reverbWet}
                  onChange={e => onUpdateSettings(targetMic.id, { reverbWet: parseFloat(e.target.value) })}
                  className="w-full h-1.5 accent-emerald-500"
                />
              </div>

              {/* Delay Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Eco / Delay</span>
                  <span className="font-mono text-cyan-400">{Math.round(currentEffects.delayWet * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.01"
                  value={currentEffects.delayWet}
                  onChange={e => onUpdateSettings(targetMic.id, { delayWet: parseFloat(e.target.value) })}
                  className="w-full h-1.5 accent-cyan-500"
                />
              </div>

              {/* Bass Boost */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Graves (Corpo da Voz)</span>
                  <span className="font-mono text-amber-400">{currentEffects.bassGain.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={currentEffects.bassGain}
                  onChange={e => onUpdateSettings(targetMic.id, { bassGain: parseFloat(e.target.value) })}
                  className="w-full h-1.5 accent-amber-500"
                />
              </div>

              {/* Treble Boost */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Agudos (Brilho e Ar)</span>
                  <span className="font-mono text-purple-400">{currentEffects.trebleGain.toFixed(1)} dB</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={currentEffects.trebleGain}
                  onChange={e => onUpdateSettings(targetMic.id, { trebleGain: parseFloat(e.target.value) })}
                  className="w-full h-1.5 accent-purple-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
