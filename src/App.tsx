import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MicRack } from './components/MicRack';
import { SearchBar } from './components/SearchBar';
import { KaraokePlayer } from './components/KaraokePlayer';
import { PopularList } from './components/PopularList';
import { EffectsPanel } from './components/EffectsPanel';
import { AddInputModal } from './components/AddInputModal';
import { SpeakerModal } from './components/SpeakerModal';
import { DiscoBall } from './components/DiscoBall';
import { RoomsModal } from './components/RoomsModal';
import { RoomSidebar } from './components/RoomSidebar';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { useAuth } from './context/AuthContext';
import { socketService } from './services/socketService';
import { AudioEngine } from './audio/AudioEngine';
import type { ConnectedMicInfo, EffectPresetId, EffectSettings, VideoItem } from './audio/types';
import type { Room } from './types/room';

export function App() {
  const { user, isAuthModalOpen, closeAuthModal, openAuthModal } = useAuth();
  const [mics, setMics] = useState<ConnectedMicInfo[]>([]);
  const [selectedMicForEffects, setSelectedMicForEffects] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<VideoItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddInputModalOpen, setIsAddInputModalOpen] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  
  // Online Room State (Discord Style)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [syncEvent, setSyncEvent] = useState<{ action: string; currentTime?: number; isPlaying?: boolean; timestamp: number } | null>(null);
  
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStudioMode, setIsStudioMode] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Connect socket and handle synchronized events
  useEffect(() => {
    const socket = socketService.connect();

    const handleRoomUpdated = (updatedRoom: Room) => {
      setCurrentRoom(prev => {
        if (!prev || prev.id !== updatedRoom.id) return prev;
        return updatedRoom;
      });
    };

    const handleSyncVideo = ({ 
      action, 
      song, 
      currentTime, 
      isPlaying,
    }: { 
      action: string; 
      song: VideoItem | null; 
      currentTime?: number; 
      isPlaying?: boolean; 
      user?: unknown; 
    }) => {
      if (action === 'change_song') {
        setCurrentSong(song);
      } else {
        setSyncEvent({
          action,
          currentTime,
          isPlaying,
          timestamp: Date.now(),
        });
      }
    };

    socket.on('room_updated', handleRoomUpdated);
    socket.on('sync_video_action', handleSyncVideo);

    return () => {
      socket.off('room_updated', handleRoomUpdated);
      socket.off('sync_video_action', handleSyncVideo);
    };
  }, []);

  // Voice activity detection (Discord green talking indicator)
  useEffect(() => {
    if (!currentRoom || mics.length === 0) return;

    let animId: number;
    let wasSpeaking = false;
    const engine = AudioEngine.getInstance();

    const checkVoice = () => {
      let maxLevel = 0;
      mics.forEach(m => {
        const lvl = engine.getMicLevel(m.id);
        if (lvl > maxLevel) maxLevel = lvl;
      });

      const isSpeaking = maxLevel > 14;
      if (isSpeaking !== wasSpeaking) {
        wasSpeaking = isSpeaking;
        socketService.reportVoiceActivity(isSpeaking);
      }

      animId = requestAnimationFrame(checkVoice);
    };

    animId = requestAnimationFrame(checkVoice);
    return () => cancelAnimationFrame(animId);
  }, [currentRoom, mics]);

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

      // If we are in an online room, stream our processed voice (with effects!) to peers
      if (currentRoom) {
        const processedStream = engine.getProcessedOutputStream();
        socketService.setLocalStream(processedStream);
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

  // Song Selection (supports Watch Together in rooms!)
  const handleSelectSong = (song: VideoItem) => {
    setCurrentSong(song);

    // If inside a room, broadcast song to everyone in the room!
    if (currentRoom) {
      socketService.syncVideoAction(currentRoom.id, 'change_song', song, 0, true, user || undefined);
      socketService.sendChatMessage(`🎶 Compartilhou a música: "${song.title}"`, 'song_change');
    }
  };

  const handleSearchAlternative = (title: string) => {
    setCurrentSong(null);
    setSearchQuery(title);
    if (currentRoom) {
      socketService.syncVideoAction(currentRoom.id, 'change_song', null, 0, false, user || undefined);
    }
  };

  const handleBroadcastSync = (action: 'play' | 'pause' | 'seek', currentTime?: number, isPlaying?: boolean) => {
    if (!currentRoom) return;
    socketService.syncVideoAction(currentRoom.id, action, currentSong, currentTime, isPlaying, user || undefined);
    
    const actionLabel = action === 'play'
      ? '▶ Deu play no vídeo'
      : action === 'pause'
        ? '⏸ Pausou o vídeo'
        : `⏩ Pulou o vídeo para ${Math.floor(currentTime || 0)}s`;
    socketService.sendChatMessage(actionLabel, 'system');
  };

  // Room Joined
  const handleRoomJoined = (room: Room) => {
    setCurrentRoom(room);
    if (room.currentSong) {
      setCurrentSong(room.currentSong);
      if (room.currentTime) {
        setSyncEvent({
          action: 'seek',
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          timestamp: Date.now(),
        });
      }
    }
    // Stream mic audio to room
    const engine = AudioEngine.getInstance();
    const stream = engine.getProcessedOutputStream();
    socketService.setLocalStream(stream);
  };

  const handleLeaveRoom = () => {
    socketService.leaveCurrentRoom();
    setCurrentRoom(null);
  };

  return (
    <div className="relative min-h-screen retro-80s-bg text-slate-100 flex flex-col justify-between selection:bg-pink-500 selection:text-slate-950 overflow-x-hidden">
      {/* 80s Disco Ball with Sweeping Light Beams */}
      <DiscoBall />

      {/* Retro 80s Perspective Floor Grid */}
      <div className="retro-perspective-grid" />

      {/* Header */}
      <Header
        onOpenAddInput={() => setIsAddInputModalOpen(true)}
        onOpenSpeakerModal={() => setIsSpeakerModalOpen(true)}
        onOpenRoomsModal={() => {
          if (!user) {
            openAuthModal();
          } else {
            setIsRoomsModalOpen(true);
          }
        }}
        connectedMicCount={mics.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        isInRoom={!!currentRoom}
        roomName={currentRoom?.name}
      />

      {/* Discord-style Room Sidebar on the Left (When in Room) */}
      {currentRoom && (
        <RoomSidebar
          room={currentRoom}
          onLeaveRoom={handleLeaveRoom}
          onShareSongClick={() => setCurrentSong(null)}
        />
      )}

      {/* Main Content Area (shifted right if in room) */}
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-start w-full mx-auto px-2 sm:px-4 py-3 transition-all duration-300 ${
        isStudioMode && currentSong ? 'max-w-[98vw] md:px-6' : 'max-w-7xl'
      } ${
        currentRoom ? 'md:pl-80' : ''
      }`}>
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
              <div className={`w-full ${isStudioMode ? 'max-w-5xl' : 'max-w-3xl'} transition-all duration-300`}>
                <SearchBar onSelectSong={handleSelectSong} isCompact />
              </div>

              {/* Large YouTube Karaoke Stage Display with Room Sync */}
              <KaraokePlayer
                currentSong={currentSong}
                onChangeSong={() => {
                  setCurrentSong(null);
                  if (currentRoom) {
                    socketService.syncVideoAction(currentRoom.id, 'change_song', null, 0, false, user || undefined);
                    socketService.sendChatMessage('⏹ Removeu a música atual', 'system');
                  }
                }}
                onSearchAlternative={handleSearchAlternative}
                isStudioMode={isStudioMode}
                onToggleStudioMode={() => setIsStudioMode(prev => !prev)}
                currentRoom={currentRoom}
                syncEvent={syncEvent}
                onBroadcastSync={handleBroadcastSync}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-6 md:py-8">
              {/* Central Google-style Search Bar with 80s Retro Glow */}
              <div className="text-center mb-6">
                <div className="inline-block relative">
                  <h2 className="text-3xl md:text-5xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                    Pampo Karaokê
                  </h2>
                  <span className="block text-[11px] font-bold tracking-[0.3em] uppercase text-cyan-400/90 mt-1">
                    ★ DISCO & VINTAGE STAGE ★
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-2">
                  {currentRoom
                    ? `Você está na sala "${currentRoom.name}". Escolha uma música para todos assistirem juntos!`
                    : 'Pesquise seu hit favorito ou cole o link do YouTube para soltar a voz'}
                </p>
              </div>

              <SearchBar 
                onSelectSong={handleSelectSong} 
                initialQuery={searchQuery}
              />

              {/* Quick Picks / Popular Karaoke Songs */}
              <PopularList onSelectSong={handleSelectSong} />
            </div>
          )}
        </div>
      </main>

      {/* Effects Panel at the bottom */}
      <div className={`relative z-10 transition-all ${currentRoom ? 'md:pl-80' : ''}`}>
        <EffectsPanel
          mics={mics}
          selectedMicId={selectedMicForEffects}
          onSelectMic={id => setSelectedMicForEffects(id)}
          onApplyPreset={handleApplyPreset}
          onUpdateSettings={handleUpdateEffectSettings}
        />
      </div>

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

      <RoomsModal
        isOpen={isRoomsModalOpen}
        onClose={() => setIsRoomsModalOpen(false)}
        onRoomJoined={handleRoomJoined}
      />

      <GoogleLoginModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />
    </div>
  );
}

export default App;
