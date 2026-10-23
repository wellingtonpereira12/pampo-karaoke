import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MicRack } from './components/MicRack';
import { SearchBar } from './components/SearchBar';
import { KaraokePlayer } from './components/KaraokePlayer';
import { PopularList } from './components/PopularList';
import { EffectsPanel } from './components/EffectsPanel';
import { AddInputModal } from './components/AddInputModal';
import { SpeakerModal } from './components/SpeakerModal';
import { AudioEngine } from './audio/AudioEngine';
import type { ConnectedMicInfo, EffectPresetId, EffectSettings, VideoItem } from './audio/types';

export function App() {
  const [mics, setMics] = useState<ConnectedMicInfo[]>([]);
  const [selectedMicForEffects, setSelectedMicForEffects] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<VideoItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddInputModalOpen, setIsAddInputModalOpen] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Microphone management
  const handleAddMic = async (deviceId: string, label: string) => {
    const engine = AudioEngine.getInstance();
    try {
      const newMic = await engine.addMicrophone(deviceId, label);
      setMics(prev => [...prev, newMic]);
      if (!selectedMicForEffects) {
        setSelectedMicForEffects(newMic.id);
      }
    } catch (err) {
      console.error('Failed to add microphone:', err);
      alert('Não foi possível conectar o microfone. Verifique se o microfone está conectado e se deu permissão ao navegador.');
    }
  };

  const handleRemoveMic = (id: string) => {
    const engine = AudioEngine.getInstance();
    engine.removeMicrophone(id);
    setMics(prev => {
      const updated = prev.filter(m => m.id !== id);
      if (selectedMicForEffects === id) {
        setSelectedMicForEffects(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleVolumeChange = (id: string, volume: number) => {
    const engine = AudioEngine.getInstance();
    engine.setMicVolume(id, volume);
    setMics(prev => prev.map(m => (m.id === id ? { ...m, volume } : m)));
  };

  const handleMonitorToggle = (id: string, monitor: boolean) => {
    const engine = AudioEngine.getInstance();
    engine.setMicMonitor(id, monitor);
    setMics(prev => prev.map(m => (m.id === id ? { ...m, monitorVoice: monitor } : m)));
  };

  const handleMuteToggle = (id: string, muted: boolean) => {
    const engine = AudioEngine.getInstance();
    engine.setMicMute(id, muted);
    setMics(prev => prev.map(m => (m.id === id ? { ...m, muted } : m)));
  };

  // Master volume
  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    AudioEngine.getInstance().setMasterVolume(vol);
  };

  // Effects
  const handleApplyPreset = (micId: string, preset: EffectPresetId) => {
    const engine = AudioEngine.getInstance();
    engine.applyPreset(micId, preset);
    setMics(engine.getAllMics());
  };

  const handleUpdateEffectSettings = (micId: string, settings: Partial<EffectSettings>) => {
    const engine = AudioEngine.getInstance();
    engine.updateEffectSettings(micId, settings);
    setMics(engine.getAllMics());
  };

  const handleSearchAlternative = (title: string) => {
    setCurrentSong(null);
    setSearchQuery(title);
  };

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        onOpenAddInput={() => setIsAddInputModalOpen(true)}
        onOpenSpeakerModal={() => setIsSpeakerModalOpen(true)}
        connectedMicCount={mics.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start w-full max-w-7xl mx-auto px-2 sm:px-4 py-3">
        {/* Microphone Rack */}
        <MicRack
          mics={mics}
          onVolumeChange={handleVolumeChange}
          onMonitorToggle={handleMonitorToggle}
          onMuteToggle={handleMuteToggle}
          onSelectForEffects={id => setSelectedMicForEffects(id)}
          onRemove={handleRemoveMic}
          onOpenAddModal={() => setIsAddInputModalOpen(true)}
          activeEffectMicId={selectedMicForEffects}
        />

        {/* Dynamic Center Section: Search or Video Player */}
        <div className="w-full flex-1 flex flex-col items-center justify-center my-2">
          {currentSong ? (
            <div className="w-full flex flex-col items-center gap-4">
              {/* Compact Search Bar above video to easily change songs */}
              <div className="w-full max-w-3xl">
                <SearchBar onSelectSong={setCurrentSong} isCompact />
              </div>

              {/* Large YouTube Karaoke Stage Display */}
              <KaraokePlayer
                currentSong={currentSong}
                onChangeSong={() => setCurrentSong(null)}
                onSearchAlternative={handleSearchAlternative}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-6 md:py-10">
              {/* Central Google-style Search Bar */}
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
                  Pampo Karaokê
                </h2>
                <p className="text-xs md:text-sm text-slate-400">
                  Pesquise sua música favorita ou cole o link do YouTube para começar
                </p>
              </div>

              <SearchBar 
                onSelectSong={setCurrentSong} 
                initialQuery={searchQuery}
              />

              {/* Quick Picks / Popular Karaoke Songs */}
              <PopularList onSelectSong={setCurrentSong} />
            </div>
          )}
        </div>
      </main>

      {/* Effects Panel at the bottom */}
      <EffectsPanel
        mics={mics}
        selectedMicId={selectedMicForEffects}
        onSelectMic={id => setSelectedMicForEffects(id)}
        onApplyPreset={handleApplyPreset}
        onUpdateSettings={handleUpdateEffectSettings}
      />

      {/* Modals */}
      <AddInputModal
        isOpen={isAddInputModalOpen}
        onClose={() => setIsAddInputModalOpen(false)}
        onMicAdded={handleAddMic}
      />

      <SpeakerModal
        isOpen={isSpeakerModalOpen}
        onClose={() => setIsSpeakerModalOpen(false)}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
      />
    </div>
  );
}

export default App;
