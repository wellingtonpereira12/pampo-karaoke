import React, { useState, useEffect } from 'react';
import { Volume2, X, Check, Speaker, AlertCircle } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface SpeakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
}

export const SpeakerModal: React.FC<SpeakerModalProps> = ({
  isOpen,
  onClose,
  masterVolume,
  onMasterVolumeChange,
}) => {
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['default']);
  const [loading, setLoading] = useState(false);
  const [sinkSupported, setSinkSupported] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadSpeakers();
    }
  }, [isOpen]);

  const loadSpeakers = async () => {
    setLoading(true);
    try {
      const engine = AudioEngine.getInstance();
      const devices = await engine.getAvailableOutputDevices();
      setOutputDevices(devices);
      const currentSelected = engine.getSelectedOutputDeviceId();
      if (currentSelected && !selectedDevices.includes(currentSelected)) {
        setSelectedDevices([currentSelected]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleDevice = async (deviceId: string) => {
    const engine = AudioEngine.getInstance();
    let updated: string[];

    if (selectedDevices.includes(deviceId)) {
      if (selectedDevices.length === 1) return; // Keep at least one selected
      updated = selectedDevices.filter(id => id !== deviceId);
    } else {
      updated = [...selectedDevices, deviceId];
    }

    setSelectedDevices(updated);
    
    // Set sink id for the primary selected speaker
    const supported = await engine.setOutputDevice(deviceId);
    setSinkSupported(supported);
  };

  const selectAll = () => {
    const allIds = outputDevices.map(d => d.deviceId);
    setSelectedDevices(allIds);
    if (allIds.length > 0) {
      AudioEngine.getInstance().setOutputDevice(allIds[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-[#131722] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
            <Speaker className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Caixas de Som & Saída</h3>
            <p className="text-xs text-slate-400">Configure os alto-falantes para o karaokê</p>
          </div>
        </div>

        {/* Master Volume Slider */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              Volume Master
            </span>
            <span className="text-cyan-400 font-mono font-semibold">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            value={masterVolume}
            onChange={e => onMasterVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Speaker Devices Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Dispositivos de Reprodução
            </label>
            {outputDevices.length > 1 && (
              <button
                onClick={selectAll}
                className="text-[11px] text-cyan-400 hover:underline font-medium"
              >
                Selecionar todas
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              Detectando caixas de som...
            </div>
          ) : outputDevices.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
              Saída padrão do sistema ativa (alto-falantes padrão do computador).
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {outputDevices.map((device, index) => {
                const isSelected = selectedDevices.includes(device.deviceId);
                const label = device.label || `Caixa de Som ${index + 1}`;

                return (
                  <button
                    key={device.deviceId || index}
                    onClick={() => toggleDevice(device.deviceId)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-100 shadow-sm'
                        : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Speaker className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium truncate">{label}</span>
                    </div>

                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ml-2 ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800/80'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!sinkSupported && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>O som está saindo pelos alto-falantes padrão do seu sistema.</span>
            </div>
          )}

          <div className="pt-3">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm shadow-glow-cyan transition"
            >
              Concluído
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
