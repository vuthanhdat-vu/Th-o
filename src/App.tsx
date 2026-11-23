import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActivePanel,
  LoveShowcaseData,
  ShowcaseRealm,
  TwilightStageHandle,
} from './types/showcase';
import { DEFAULT_SHOWCASE_DATA, REALM_MEMORIES } from './data/defaults';
import {
  clearAllShowcaseStorage,
  clearCustomAudioBlob,
  loadCustomAudioBlob,
  loadShowcaseData,
  saveCustomAudioBlob,
  saveShowcaseData,
} from './services/storage';
import { LoveAudioEngine } from './services/audioEngine';
import { REALM_ANCHORS } from './scene/realms';
import { TwilightHeartStage } from './scene/TwilightHeartStage';
import { TopIdentityBar } from './components/TopIdentityBar';
import { BottomControlDock } from './components/BottomControlDock';
import { MemorySpotlightCard } from './components/MemorySpotlightCard';
import { LoveLetterModal } from './components/LoveLetterModal';
import { MilestonesDrawer } from './components/MilestonesDrawer';
import { CustomizeDrawer, type EditorTab } from './components/CustomizeDrawer';

export default function App() {
  const [data, setData] = useState<LoveShowcaseData>(() =>
    structuredClone(DEFAULT_SHOWCASE_DATA),
  );
  const [hydrated, setHydrated] = useState(false);
  const [hasCustomAudio, setHasCustomAudio] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const [activeRealm, setActiveRealm] = useState<ShowcaseRealm>('heart');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [editorInitialTab, setEditorInitialTab] = useState<EditorTab>('profile');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const stageRef = useRef<TwilightStageHandle | null>(null);
  const audioRef = useRef<LoveAudioEngine | null>(null);

  // Initialize audio engine & hydrate persisted profile + custom audio blob from IndexedDB
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
        setHasCustomAudio(true);
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
    setActivePanel('none');
    setSelectedMemoryId(null);
    setActiveRealm(realm);
    stageRef.current?.setRealm(realm);
    audioRef.current?.playFrameChime();
  }, []);

  // Keyboard shortcuts: 1-4 switch realms, H toggles Zen Mode, Escape closes modals/selection
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
        if (activePanel !== 'none') {
          setActivePanel('none');
        } else if (selectedMemoryId) {
          setSelectedMemoryId(null);
          stageRef.current?.focusMemory(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel, selectedMemoryId, handleSelectRealm]);

  const handleUpdateData = useCallback(
    (updater: (prev: LoveShowcaseData) => LoveShowcaseData) => {
      setData((prev) => updater(prev));
    },
    [],
  );

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
    setActivePanel('none');
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

  const handleTogglePanel = useCallback((panel: ActivePanel) => {
    setHasInteracted(true);
    setSelectedMemoryId(null);
    if (panel === 'editor') {
      setEditorInitialTab('profile');
    }
    setActivePanel((curr) => (curr === panel ? 'none' : panel));
  }, []);

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

  const handleUploadCustomAudio = useCallback(async (file: File) => {
    await saveCustomAudioBlob(file);
    const engine = audioRef.current;
    if (engine) {
      engine.setCustomAudioBlob(file);
    }
    setHasCustomAudio(true);
    setData((prev) => ({
      ...prev,
      music: {
        ...prev.music,
        source: 'custom',
        customTrackName: file.name,
        customTrackSize: file.size,
      },
    }));
  }, []);

  const handleRemoveCustomAudio = useCallback(async () => {
    await clearCustomAudioBlob();
    audioRef.current?.setCustomAudioBlob(null);
    setHasCustomAudio(false);
    setData((prev) => ({
      ...prev,
      music: {
        ...prev.music,
        source: prev.music.source === 'custom' ? 'sunset-box' : prev.music.source,
        customTrackName: null,
        customTrackSize: null,
      },
    }));
  }, []);

  const handleResetAll = useCallback(async () => {
    audioRef.current?.stop();
    audioRef.current?.setCustomAudioBlob(null);
    setMusicPlaying(false);
    setHasCustomAudio(false);
    await clearAllShowcaseStorage();
    const fresh = structuredClone(DEFAULT_SHOWCASE_DATA);
    audioRef.current?.updateConfig(fresh.music);
    setData(fresh);
    setSelectedMemoryId(null);
    setActiveRealm('heart');
    stageRef.current?.setRealm('heart');
  }, []);

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

      {/* Quiet Top-Left Couple Identity & Tabular Days Counter */}
      <TopIdentityBar
        partnerA={data.partnerA}
        partnerB={data.partnerB}
        headline={data.headline}
        startDate={data.startDate}
        activeRealmLabel={REALM_ANCHORS[activeRealm].label}
        showHint={!hasInteracted && activePanel === 'none' && !selectedMemoryId}
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
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        onTriggerHeartbeat={handleTriggerHeartbeat}
        musicPlaying={musicPlaying}
        musicLabel={musicLabel}
        onToggleMusic={handleToggleMusic}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
      />

      {/* Editorial Love Letter Modal */}
      <LoveLetterModal
        open={activePanel === 'letter'}
        partnerA={data.partnerA}
        partnerB={data.partnerB}
        startDate={data.startDate}
        letterHeader={data.letterHeader || 'My love'}
        letterTitle={data.letterTitle}
        letterBody={data.letterBody}
        letterSignature={data.letterSignature}
        letterFontSize={data.letterFontSize || 15}
        onClose={() => setActivePanel('none')}
      />

      {/* Milestones & Days-Together Breakdown Drawer */}
      <MilestonesDrawer
        open={activePanel === 'milestones'}
        partnerA={data.partnerA}
        partnerB={data.partnerB}
        startDate={data.startDate}
        milestones={data.milestones}
        onClose={() => setActivePanel('none')}
        onOpenEditor={() => {
          setEditorInitialTab('milestones');
          setActivePanel('editor');
        }}
      />

      {/* In-App Studio Customization Drawer (Names, Letter, Photos across all realms, Milestones, Custom Music) */}
      <CustomizeDrawer
        key={`${activePanel}-${editorInitialTab}-${activeRealm}`}
        open={activePanel === 'editor'}
        initialTab={editorInitialTab}
        data={data}
        activeRealm={activeRealm}
        onSelectRealm={handleSelectRealm}
        hasCustomAudio={hasCustomAudio}
        musicPlaying={musicPlaying}
        onClose={() => setActivePanel('none')}
        onUpdateData={handleUpdateData}
        onUploadCustomAudio={handleUploadCustomAudio}
        onRemoveCustomAudio={handleRemoveCustomAudio}
        onToggleMusic={handleToggleMusic}
        onResetAll={handleResetAll}
      />
    </main>
  );
}
