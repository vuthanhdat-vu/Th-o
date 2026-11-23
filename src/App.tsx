import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  LoveShowcaseData,
  ShowcaseRealm,
  TwilightStageHandle,
} from './types/showcase';
import { DEFAULT_SHOWCASE_DATA, REALM_MEMORIES } from './data/defaults';
import {
  loadCustomAudioBlob,
  loadShowcaseData,
  saveShowcaseData,
} from './services/storage';
import { LoveAudioEngine } from './services/audioEngine';
import { REALM_ANCHORS } from './scene/realms';
import { TwilightHeartStage } from './scene/TwilightHeartStage';
import { TopIdentityBar } from './components/TopIdentityBar';
import { BottomControlDock } from './components/BottomControlDock';
import { MemorySpotlightCard } from './components/MemorySpotlightCard';

export default function App() {
  const [data, setData] = useState<LoveShowcaseData>(() =>
    structuredClone(DEFAULT_SHOWCASE_DATA),
  );
  const [hydrated, setHydrated] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const [activeRealm, setActiveRealm] = useState<ShowcaseRealm>('heart');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const stageRef = useRef<TwilightStageHandle | null>(null);
  const audioRef = useRef<LoveAudioEngine | null>(null);

  // Initialize audio engine & hydrate data
  useEffect(() => {
    const engine = new LoveAudioEngine();
    engine.setOnEnded(() => setMusicPlaying(false));
    audioRef.current = engine;

    let cancelled = false;
    (async () => {
      const [loadedData, customBlob] = await Promise.all([
        loadShowcaseData(),
        loadCustomAudioBlob(),
      ]);
      if (cancelled) return;

      if (customBlob) {
        engine.setCustomAudioBlob(customBlob);
      } else if (loadedData.music.source === 'custom') {
        loadedData.music.source = 'sunset-box';
        loadedData.music.customTrackName = null;
        loadedData.music.customTrackSize = null;
      }

      engine.updateConfig(loadedData.music);
      setData(loadedData);
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
      engine.dispose();
      audioRef.current = null;
    };
  }, []);

  // Persist profile updates automatically after hydration
  useEffect(() => {
    if (!hydrated) return;
    audioRef.current?.updateConfig(data.music);
    const timer = window.setTimeout(() => {
      void saveShowcaseData(data);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [data, hydrated]);

  const handleSelectRealm = useCallback((realm: ShowcaseRealm) => {
    setHasInteracted(true);
    setSelectedMemoryId(null);
    setActiveRealm(realm);
    stageRef.current?.setRealm(realm);
    audioRef.current?.playFrameChime();
  }, []);

  // Keyboard shortcuts: 1-4 switch realms, H toggles Zen Mode, Escape closes selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) return;

      if (e.key === '1') {
        handleSelectRealm('heart');
      } else if (e.key === '2') {
        handleSelectRealm('sky');
      } else if (e.key === '3') {
        handleSelectRealm('underwater');
      } else if (e.key === '4') {
        handleSelectRealm('cat-island');
      } else if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (selectedMemoryId) {
          setSelectedMemoryId(null);
          stageRef.current?.focusMemory(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMemoryId, handleSelectRealm]);

  const handleHeartClick = useCallback(() => {
    setHasInteracted(true);
    audioRef.current?.playHeartChime();
  }, []);

  const handleTriggerHeartbeat = useCallback(() => {
    setHasInteracted(true);
    if (activeRealm !== 'heart') {
      setSelectedMemoryId(null);
      setActiveRealm('heart');
      stageRef.current?.setRealm('heart');
    }
    stageRef.current?.triggerHeartbeat();
    audioRef.current?.playHeartChime();
  }, [activeRealm]);

  const handleMemorySelect = useCallback((memoryId: string) => {
    setHasInteracted(true);
    setSelectedMemoryId(memoryId);
    audioRef.current?.playFrameChime();
  }, []);

  const handleCloseMemory = useCallback(() => {
    setSelectedMemoryId(null);
    stageRef.current?.focusMemory(null);
  }, []);

  const handleCanvasBlankClick = useCallback(() => {
    if (selectedMemoryId) {
      setSelectedMemoryId(null);
      stageRef.current?.focusMemory(null);
    }
  }, [selectedMemoryId]);

  const handleToggleMusic = useCallback(async () => {
    setHasInteracted(true);
    const engine = audioRef.current;
    if (!engine) return;

    if (musicPlaying) {
      engine.stop();
      setMusicPlaying(false);
    } else {
      const started = await engine.start();
      setMusicPlaying(started);
    }
  }, [musicPlaying]);

  const currentMemories = useMemo(() => {
    return data.realmMemories?.[activeRealm] || REALM_MEMORIES[activeRealm] || data.memories;
  }, [activeRealm, data.realmMemories, data.memories]);

  const musicLabel = useMemo(() => {
    if (data.music.source === 'custom' && data.music.customTrackName) {
      return data.music.customTrackName.replace(/\.[^/.]+$/, '');
    }
    if (data.music.source === 'starlight-chime') {
      return 'Đêm sao lắng đọng';
    }
    return 'Nhạc hộp hoàng hôn';
  }, [data.music.source, data.music.customTrackName]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#160F22]">
      {/* Isolated Full-Bleed 3D WebGL Stage */}
      <TwilightHeartStage
        ref={stageRef}
        memories={currentMemories}
        activeRealm={activeRealm}
        selectedMemoryId={selectedMemoryId}
        autoRotate={autoRotate}
        onHeartClick={handleHeartClick}
        onMemorySelect={handleMemorySelect}
        onRealmSelect={handleSelectRealm}
        onCanvasBlankClick={handleCanvasBlankClick}
      />

      {/* Birthday Banner */}
      <TopIdentityBar
        partnerA={data.partnerA}
        partnerB={data.partnerB}
        headline={data.headline}
        startDate={data.startDate}
        activeRealmLabel={REALM_ANCHORS[activeRealm].label}
        showHint={!hasInteracted && !selectedMemoryId}
      />

      {/* Selected 3D Photo Memory Spotlight */}
      <MemorySpotlightCard
        memories={currentMemories}
        selectedId={selectedMemoryId}
        onSelect={handleMemorySelect}
        onClose={handleCloseMemory}
      />

      {/* Unified Collapsible Bottom Control Dock */}
      <BottomControlDock
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((prev) => !prev)}
        activeRealm={activeRealm}
        onSelectRealm={handleSelectRealm}
        onTriggerHeartbeat={handleTriggerHeartbeat}
        musicPlaying={musicPlaying}
        musicLabel={musicLabel}
        onToggleMusic={handleToggleMusic}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
      />
    </main>
  );
}
