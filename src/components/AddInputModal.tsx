import React, { useState, useEffect } from 'react';
import { Mic, Guitar, X, Check, Loader2 } from 'lucide-react';
import { AudioEngine } from '../audio/AudioEngine';

interface AddInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMicAdded: (deviceId: string, label: string) => void;
}

export const AddInputModal: React.FC<AddInputModalProps> = ({ isOpen, onClose, onMicAdded }) => {
  const [selectedType, setSelectedType] = useState<'mic' | 'guitar' | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedType('mic');
      loadDevices();
    } else {
      setSelectedType(null);
      setSelectedDeviceId('');
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const engine = AudioEngine.getInstance();
      const devices = await engine.getAvailableInputDevices();
      setAvailableDevices(devices);
      if (devices.length > 0) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedDeviceId && availableDevices.length > 0) {
      const dev = availableDevices[0];
      onMicAdded(dev.deviceId, dev.label || 'Microfone');
      onClose();
      return;
    }
    const dev = availableDevices.find(d => d.deviceId === selectedDeviceId);
    onMicAdded(selectedDeviceId, dev?.label || 'Microfone');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-[#131722] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Input Type Selector (Minimalist round icons) */}
        <div className="flex items-center justify-center gap-6 mb-6 pt-2">
          <button
            onClick={() => setSelectedType('mic')}
            className={`group flex flex-col items-center gap-2 transition ${
              selectedType === 'mic' ? 'scale-105' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition ${
              selectedType === 'mic'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-glow-green'
                : 'bg-slate-800 border-slate-700 text-slate-400 group-hover:border-slate-600'
            }`}>
              <Mic className="w-8 h-8" />
            </div>
            <span className="text-xs font-medium tracking-wide">Microfone</span>
          </button>

          <button
            onClick={() => setSelectedType('guitar')}
            className={`group flex flex-col items-center gap-2 transition ${
              selectedType === 'guitar' ? 'scale-105' : 'opacity-50 hover:opacity-80'
            }`}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition ${
              selectedType === 'guitar'
                ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-glow-purple'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <Guitar className="w-8 h-8" />
            </div>
            <span className="text-xs font-medium tracking-wide flex items-center gap-1">
              Guitarra <span className="text-[10px] px-1 py-0.5 bg-slate-800 rounded text-purple-400">breve</span>
            </span>
          </button>
        </div>

        {/* Device Picker List */}
        {selectedType === 'mic' && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Selecione o microfone
            </label>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-sm">Buscando microfones conectados...</span>
              </div>
            ) : availableDevices.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400 bg-slate-900/60 rounded-xl p-4 border border-slate-800">
                Nenhum microfone detectado. Conecte seu microfone ou autorize o navegador a acessar o áudio.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {availableDevices.map((device, index) => {
                  const isSelected = selectedDeviceId === device.deviceId;
                  const label = device.label || `Microfone ${index + 1}`;
                  return (
                    <button
                      key={device.deviceId || index}
                      onClick={() => setSelectedDeviceId(device.deviceId)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-sm'
                          : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Mic className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium truncate">{label}</span>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={availableDevices.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm shadow-glow-green transition"
              >
                Conectar
              </button>
            </div>
          </div>
        )}

        {selectedType === 'guitar' && (
          <div className="text-center py-6 text-sm text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <p className="font-medium text-slate-200 mb-1">Entrada de Instrumento</p>
            <p className="text-xs text-slate-400">
              O módulo para guitarras e instrumentos com emulador de amplificador estará disponível na próxima atualização!
            </p>
            <button
              onClick={() => setSelectedType('mic')}
              className="mt-4 text-xs text-emerald-400 hover:underline"
            >
              Voltar para microfones
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
