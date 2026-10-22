import React from 'react';
import { Plus, Mic } from 'lucide-react';
import type { ConnectedMicInfo } from '../audio/types';
import { MicCard } from './MicCard';

interface MicRackProps {
  mics: ConnectedMicInfo[];
  onVolumeChange: (id: string, volume: number) => void;
  onMonitorToggle: (id: string, monitor: boolean) => void;
  onMuteToggle: (id: string, muted: boolean) => void;
  onSelectForEffects: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenAddModal: () => void;
  activeEffectMicId: string | null;
}

export const MicRack: React.FC<MicRackProps> = ({
  mics,
  onVolumeChange,
  onMonitorToggle,
  onMuteToggle,
  onSelectForEffects,
  onRemove,
  onOpenAddModal,
  activeEffectMicId,
}) => {
  return (
    <section className="w-full px-4 md:px-6 py-2">
      {mics.length === 0 ? (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12151f]/80 border border-slate-800/80 text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Nenhum microfone conectado</p>
              <p className="text-xs text-slate-500">Conecte um ou mais microfones para cantar com retorno e efeitos</p>
            </div>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Conectar Microfone</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {mics.map(mic => (
            <MicCard
              key={mic.id}
              mic={mic}
              onVolumeChange={onVolumeChange}
              onMonitorToggle={onMonitorToggle}
              onMuteToggle={onMuteToggle}
              onSelectForEffects={onSelectForEffects}
              onRemove={onRemove}
              isEffectActive={activeEffectMicId === mic.id}
            />
          ))}

          {/* Quick Add (+) Button at the end of the rack */}
          <button
            onClick={onOpenAddModal}
            title="Adicionar mais um microfone"
            className="shrink-0 flex items-center gap-2 p-3.5 rounded-2xl border border-dashed border-slate-700/80 hover:border-emerald-500/80 bg-slate-900/40 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition"
          >
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium pr-1">Adicionar Microfone</span>
          </button>
        </div>
      )}
    </section>
  );
};
