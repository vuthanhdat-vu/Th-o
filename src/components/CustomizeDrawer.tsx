import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ImagePlus,
  Music,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  LoveShowcaseData,
  MemoryItem,
  MilestoneItem,
  MusicSource,
  ShowcaseRealm,
} from '../types/showcase';
import { compressImageFile } from '../services/storage';
import { formatFileSize, REALM_MEMORIES } from '../data/defaults';

export type EditorTab = 'profile' | 'photos' | 'milestones' | 'music';

interface CustomizeDrawerProps {
  open: boolean;
  initialTab?: EditorTab;
  data: LoveShowcaseData;
  activeRealm?: ShowcaseRealm;
  onSelectRealm?: (realm: ShowcaseRealm) => void;
  hasCustomAudio: boolean;
  musicPlaying: boolean;
  onClose: () => void;
  onUpdateData: (updater: (prev: LoveShowcaseData) => LoveShowcaseData) => void;
  onUploadCustomAudio: (file: File) => Promise<void>;
  onRemoveCustomAudio: () => Promise<void>;
  onToggleMusic: () => void;
  onResetAll: () => Promise<void>;
}

const TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'profile', label: 'Tên & Thư' },
  { id: 'photos', label: 'Ảnh 3D' },
  { id: 'milestones', label: 'Cột mốc' },
  { id: 'music', label: 'Nhạc nền' },
];

export const REALM_EDITOR_OPTIONS: Array<{
  id: ShowcaseRealm;
  label: string;
  badge: string;
  icon: string;
  description: string;
}> = [
  {
    id: 'heart',
    label: 'Trái tim',
    badge: 'Trái tim hoàng hôn',
    icon: '❤️',
    description: 'Vòng quỹ đạo quanh trái tim ruby',
  },
  {
    id: 'sky',
    label: 'Bầu trời',
    badge: 'Bầu trời hoàng hôn',
    icon: '🌤️',
    description: 'Đoàn phượng hoàng kéo ảnh lượn sóng zic-zac',
  },
  {
    id: 'underwater',
    label: 'Dưới nước',
    badge: 'Thế giới đại dương',
    icon: '🌊',
    description: 'Vòng cung san hô phát sáng dưới đáy biển',
  },
  {
    id: 'cat-island',
    label: 'Đảo Mèo',
    badge: 'Hòn Đảo Mèo',
    icon: '🐱',
    description: 'Triển lãm ảnh trên đồi cỏ xanh ngập nắng',
  },
];

const MAX_MEMORIES = 8;

export function CustomizeDrawer({
  open,
  initialTab = 'profile',
  data,
  activeRealm = 'heart',
  onSelectRealm,
  hasCustomAudio,
  musicPlaying,
  onClose,
  onUpdateData,
  onUploadCustomAudio,
  onRemoveCustomAudio,
  onToggleMusic,
  onResetAll,
}: CustomizeDrawerProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>(initialTab);
  const [editorRealm, setEditorRealm] = useState<ShowcaseRealm>(activeRealm || 'heart');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const newPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeRealm) {
      setEditorRealm(activeRealm);
    }
  }, [activeRealm]);

  const currentRealmMemories = useMemo(() => {
    const list =
      data.realmMemories?.[editorRealm] ??
      (editorRealm === 'heart' ? data.memories : REALM_MEMORIES[editorRealm]);
    return list && list.length > 0 ? list : REALM_MEMORIES[editorRealm] || [];
  }, [data.realmMemories, data.memories, editorRealm]);

  const currentRealmOpt =
    REALM_EDITOR_OPTIONS.find((r) => r.id === editorRealm) || REALM_EDITOR_OPTIONS[0];

  const updateCurrentRealmMemories = (
    updater: (prevList: MemoryItem[]) => MemoryItem[],
  ) => {
    onUpdateData((prev) => {
      const prevRealmMemories: Record<ShowcaseRealm, MemoryItem[]> = {
        heart: prev.realmMemories?.heart ?? prev.memories ?? structuredClone(REALM_MEMORIES.heart),
        sky: prev.realmMemories?.sky ?? structuredClone(REALM_MEMORIES.sky),
        underwater: prev.realmMemories?.underwater ?? structuredClone(REALM_MEMORIES.underwater),
        'cat-island': prev.realmMemories?.['cat-island'] ?? structuredClone(REALM_MEMORIES['cat-island']),
      };

      const currentList = prevRealmMemories[editorRealm] ?? [];
      const updatedList = updater(currentList);

      const nextRealmMemories = {
        ...prevRealmMemories,
        [editorRealm]: updatedList,
      };

      return {
        ...prev,
        memories: editorRealm === 'heart' ? updatedList : prev.memories,
        realmMemories: nextRealmMemories,
      };
    });
  };

  if (!open) return null;

  const notify = (msg: string) => {
    setErrorMessage(null);
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const notifyError = (msg: string) => {
    setStatusMessage(null);
    setErrorMessage(msg);
  };

  // --- Photos Handlers (Across All 4 Realms) ---
  const handleAddPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_MEMORIES - currentRealmMemories.length;
    if (remaining <= 0) {
      notifyError(`Bối cảnh ${currentRealmOpt.label} hỗ trợ tối đa ${MAX_MEMORIES} khung để giữ bố cục cân đối.`);
      return;
    }

    setUploadingPhoto(true);
    try {
      const selected = files.slice(0, remaining);
      const created: MemoryItem[] = [];
      const todayIso = new Date().toISOString().slice(0, 10);

      for (const file of selected) {
        const dataUrl = await compressImageFile(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        created.push({
          id: `mem-${editorRealm}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: cleanName || 'Kỷ Niệm Của Hai Mình',
          date: todayIso,
          message: `Một khoảnh khắc đáng nhớ của đôi mình tại bối cảnh ${currentRealmOpt.label}.`,
          imageUrl: dataUrl,
        });
      }

      updateCurrentRealmMemories((prevList) => [...prevList, ...created]);
      notify(`Đã thêm ${created.length} ảnh mới cho bối cảnh ${currentRealmOpt.label}.`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Không thể tải ảnh lên.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleReplaceMemoryPhoto = async (
    memoryId: string,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImageFile(file);
      updateCurrentRealmMemories((prevList) =>
        prevList.map((m) => (m.id === memoryId ? { ...m, imageUrl: dataUrl } : m)),
      );
      notify(`Đã cập nhật ảnh mới cho ${currentRealmOpt.label}.`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Không thể thay đổi ảnh.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUpdateMemoryField = (
    memoryId: string,
    field: 'title' | 'date' | 'message',
    value: string,
  ) => {
    updateCurrentRealmMemories((prevList) =>
      prevList.map((m) => (m.id === memoryId ? { ...m, [field]: value } : m)),
    );
  };

  const handleDeleteMemory = (memoryId: string) => {
    if (currentRealmMemories.length <= 1) {
      notifyError(`Cần giữ lại ít nhất 1 khung ảnh kỷ niệm tại bối cảnh ${currentRealmOpt.label}.`);
      return;
    }
    updateCurrentRealmMemories((prevList) => prevList.filter((m) => m.id !== memoryId));
    notify(`Đã xóa khung ảnh khỏi ${currentRealmOpt.label}.`);
  };

  // --- Milestones Handlers ---
  const handleAddMilestone = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const next: MilestoneItem = {
      id: `ms-${Date.now()}`,
      date: todayIso,
      title: 'Cột Mốc Mới Của Đôi Mình',
      description: 'Ghi lại kỷ niệm đáng nhớ của hai bạn vào ngày đặc biệt này.',
    };
    onUpdateData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, next],
    }));
    notify('Đã thêm cột mốc mới.');
  };

  const handleUpdateMilestone = (
    id: string,
    field: 'date' | 'title' | 'description',
    value: string,
  ) => {
    onUpdateData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleDeleteMilestone = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((item) => item.id !== id),
    }));
  };

  // --- Music Handlers ---
  const handleAudioFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      notifyError('Vui lòng chọn tệp âm thanh hợp lệ (MP3, M4A, WAV, OGG).');
      return;
    }

    setUploadingAudio(true);
    try {
      await onUploadCustomAudio(file);
      notify(`Đã thiết lập nhạc nền: ${file.name}`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Không thể lưu tệp nhạc này.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSelectMusicSource = (source: MusicSource) => {
    if (source === 'custom' && !hasCustomAudio) {
      audioInputRef.current?.click();
      return;
    }
    onUpdateData((prev) => ({
      ...prev,
      music: { ...prev.music, source },
    }));
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[#0D0716]/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-drawer-title"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-lg flex-col border-l border-[#F8D6E0]/16 bg-[#181024] shadow-[-20px_0_55px_rgba(6,2,14,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F8D6E0]/14 px-6 py-4">
          <div>
            <h2
              id="customize-drawer-title"
              className="font-editorial text-2xl font-semibold text-[#FAF3F5]"
            >
              Tùy Chỉnh Không Gian 3D
            </h2>
            <p className="mt-0.5 text-xs text-[#D6BFC8]">
              Mọi thay đổi được tự động lưu ngay trên trình duyệt này
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tùy chỉnh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F8D6E0]/16 bg-[#241738] text-[#D6BFC8] transition-colors hover:border-[#F472B6] hover:text-[#FAF3F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Segmented Tab Bar */}
        <div className="border-b border-[#F8D6E0]/14 px-6 py-3">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#231636] p-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] ${
                    active
                      ? 'bg-[#F472B6] text-[#170F24]'
                      : 'text-[#D6BFC8] hover:text-[#FAF3F5]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Banner */}
        {(statusMessage || errorMessage) && (
          <div
            className={`mx-6 mt-4 rounded-xl border px-3.5 py-2.5 text-xs ${
              errorMessage
                ? 'border-[#FB7185]/45 bg-[#4C1124]/60 text-[#FFE4E6]'
                : 'border-[#F6A68E]/40 bg-[#3B1E35]/70 text-[#FAF3F5]'
            }`}
          >
            {errorMessage ?? statusMessage}
          </div>
        )}

        {/* Scrollable Tab Content */}
        <div className="twilight-scroll flex-1 overflow-y-auto px-6 py-5">
          {/* TAB 1: PROFILE & LETTER */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-[#D6BFC8]">Tên bạn</span>
                  <input
                    type="text"
                    value={data.partnerA}
                    onChange={(e) =>
                      onUpdateData((prev) => ({ ...prev, partnerA: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3 py-2 text-sm text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                    placeholder="Tên của bạn"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[#D6BFC8]">Tên người thương</span>
                  <input
                    type="text"
                    value={data.partnerB}
                    onChange={(e) =>
                      onUpdateData((prev) => ({ ...prev, partnerB: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3 py-2 text-sm text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                    placeholder="Tên người ấy"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-[#D6BFC8]">Tiêu đề không gian</span>
                  <input
                    type="text"
                    value={data.headline}
                    onChange={(e) =>
                      onUpdateData((prev) => ({ ...prev, headline: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3 py-2 text-sm text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[#D6BFC8]">Ngày bắt đầu yêu</span>
                  <input
                    type="date"
                    value={data.startDate}
                    onChange={(e) =>
                      onUpdateData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="font-num mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3 py-2 text-sm text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                  />
                </label>
              </div>

              <div className="h-px bg-[#F8D6E0]/12" />

              <label className="block">
                <span className="text-xs font-medium text-[#D6BFC8]">
                  Tiêu đề lớn thiệp (Chữ nghệ thuật Richford)
                </span>
                <input
                  type="text"
                  value={data.letterHeader ?? 'My love'}
                  onChange={(e) =>
                    onUpdateData((prev) => ({ ...prev, letterHeader: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3 py-2 text-sm text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                  placeholder="My love"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#D6BFC8]">Lời mở đầu thiệp</span>
                <input
                  type="text"
                  value={data.letterTitle}
                  onChange={(e) =>
                    onUpdateData((prev) => ({ ...prev, letterTitle: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3 py-2 text-sm text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#D6BFC8]">
                  Nội dung thông điệp yêu thương
                </span>
                <textarea
                  rows={8}
                  value={data.letterBody}
                  onChange={(e) =>
                    onUpdateData((prev) => ({ ...prev, letterBody: e.target.value }))
                  }
                  className="twilight-scroll mt-1.5 w-full rounded-xl border border-[#F8D6E0]/16 bg-[#221634] px-3.5 py-2.5 text-sm leading-relaxed text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                />
              </label>

              {/* KÍCH THƯỚC CHỮ NỘI DUNG THIỆP */}
              <div className="rounded-xl border border-[#F8D6E0]/14 bg-[#1C122B] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#FAF3F5]">Cỡ chữ nội dung thiệp</span>
                    <span className="text-[10px] text-[#D6BFC8]/70">(Bên trong trang giấy kem)</span>
                  </div>
                  <span className="font-num rounded-md bg-[#F472B6]/20 px-2 py-0.5 text-xs font-bold text-[#F472B6]">
                    {data.letterFontSize || 15}px
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium text-[#D6BFC8]">A-</span>
                  <input
                    type="range"
                    min={12}
                    max={22}
                    step={1}
                    value={data.letterFontSize || 15}
                    onChange={(e) =>
                      onUpdateData((prev) => ({
                        ...prev,
                        letterFontSize: Number(e.target.value),
                      }))
                    }
                    className="twilight-slider h-1.5 flex-1 cursor-pointer rounded-lg accent-[#F472B6]"
                  />
                  <span className="text-[13px] font-medium text-[#D6BFC8]">A+</span>
                </div>

                {/* Quick preset buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  {[
                    { label: 'Nhỏ', size: 13 },
                    { label: 'Chuẩn', size: 15 },
                    { label: 'Lớn', size: 17 },
                    { label: 'Rất lớn', size: 19 },
                  ].map((preset) => {
                    const currentSize = data.letterFontSize || 15;
                    const isActive = currentSize === preset.size;
                    return (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() =>
                          onUpdateData((prev) => ({
                            ...prev,
                            letterFontSize: preset.size,
                          }))
                        }
                        className={`flex-1 rounded-lg py-1 text-center text-[11px] font-medium transition-all ${
                          isActive
                            ? 'bg-[#F472B6] text-white shadow-sm shadow-[#F472B6]/30'
                            : 'bg-[#29173E] text-[#D6BFC8] hover:bg-[#341F4F] hover:text-[#FAF3F5]'
                        }`}
                      >
                        {preset.label} ({preset.size})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D PHOTO FRAMES */}
          {activeTab === 'photos' && (
            <div className="space-y-5">
              {/* Bối cảnh 3D Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-[#D6BFC8]">
                    Chọn bối cảnh 3D để xem & tải ảnh:
                  </span>
                  <span className="text-[11px] font-medium text-[#F6A68E]">
                    {currentRealmOpt.badge}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {REALM_EDITOR_OPTIONS.map((opt) => {
                    const isSelected = editorRealm === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setEditorRealm(opt.id);
                          onSelectRealm?.(opt.id);
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-[#F472B6] bg-[#3B1F44] text-[#FAF3F5] shadow-sm ring-1 ring-[#F472B6]/40'
                            : 'border-[#F8D6E0]/14 bg-[#1F142E] text-[#D6BFC8] hover:border-[#F8D6E0]/30 hover:bg-[#261839]'
                        }`}
                      >
                        <span className="text-sm">{opt.icon}</span>
                        <span className="font-semibold">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#F8D6E0]/12 pt-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#D6BFC8]">
                    Đang hiển thị{' '}
                    <span className="font-num font-medium text-[#FAF3F5]">
                      {currentRealmMemories.length}/{MAX_MEMORIES}
                    </span>{' '}
                    khung ảnh tại <span className="text-[#F6A68E] font-medium">{currentRealmOpt.label}</span>
                  </p>
                  <p className="truncate text-[11px] text-[#A8949E]">{currentRealmOpt.description}</p>
                </div>

                <input
                  ref={newPhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddPhotos}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingPhoto || currentRealmMemories.length >= MAX_MEMORIES}
                  onClick={() => newPhotoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F472B6] px-3.5 py-2 text-xs font-semibold text-[#170F24] transition-colors hover:bg-[#F9A8D4] disabled:opacity-45 whitespace-nowrap shrink-0"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{uploadingPhoto ? 'Đang tải...' : 'Thêm ảnh của 2 mình'}</span>
                </button>
              </div>

              <div className="space-y-4">
                {currentRealmMemories.map((memory, idx) => (
                  <div
                    key={memory.id}
                    className="rounded-xl border border-[#F8D6E0]/14 bg-[#201431] p-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-[#2D1A42]">
                        <img
                          src={memory.imageUrl}
                          alt={memory.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-num text-xs text-[#F6A68E]">
                            Khung {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#F8D6E0]/16 bg-[#291A3F] px-2.5 py-1 text-xs font-medium text-[#FAF3F5] transition-colors hover:border-[#F472B6] whitespace-nowrap">
                              <Upload className="h-3 w-3" aria-hidden="true" />
                              <span>Đổi ảnh</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleReplaceMemoryPhoto(memory.id, e)}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteMemory(memory.id)}
                              aria-label={`Xóa khung ảnh ${memory.title}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#F8D6E0]/14 text-[#D6BFC8] transition-colors hover:border-[#FB7185] hover:text-[#FB7185]"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                          <input
                            type="text"
                            value={memory.title}
                            onChange={(e) =>
                              handleUpdateMemoryField(memory.id, 'title', e.target.value)
                            }
                            placeholder="Tiêu đề kỷ niệm"
                            className="col-span-3 rounded-lg border border-[#F8D6E0]/14 bg-[#181024] px-2.5 py-1.5 text-xs text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                          />
                          <input
                            type="date"
                            value={memory.date}
                            onChange={(e) =>
                              handleUpdateMemoryField(memory.id, 'date', e.target.value)
                            }
                            className="font-num col-span-2 rounded-lg border border-[#F8D6E0]/14 bg-[#181024] px-2 py-1.5 text-xs text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={memory.message}
                      onChange={(e) =>
                        handleUpdateMemoryField(memory.id, 'message', e.target.value)
                      }
                      placeholder="Lời nhắn ngọt ngào cho bức ảnh này..."
                      className="mt-3 w-full rounded-lg border border-[#F8D6E0]/14 bg-[#181024] px-3 py-2 text-xs leading-relaxed text-[#E7D8DF] focus:border-[#F472B6] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MILESTONES */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#D6BFC8]">
                  Các dấu mốc quan trọng của hai bạn
                </p>
                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F472B6] px-3.5 py-2 text-xs font-semibold text-[#170F24] transition-colors hover:bg-[#F9A8D4] whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Thêm cột mốc</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {data.milestones.map((ms) => (
                  <div
                    key={ms.id}
                    className="space-y-2.5 rounded-xl border border-[#F8D6E0]/14 bg-[#201431] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={ms.date}
                        onChange={(e) =>
                          handleUpdateMilestone(ms.id, 'date', e.target.value)
                        }
                        className="font-num w-36 rounded-lg border border-[#F8D6E0]/14 bg-[#181024] px-2.5 py-1.5 text-xs text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ms.title}
                        onChange={(e) =>
                          handleUpdateMilestone(ms.id, 'title', e.target.value)
                        }
                        placeholder="Tên cột mốc"
                        className="min-w-0 flex-1 rounded-lg border border-[#F8D6E0]/14 bg-[#181024] px-2.5 py-1.5 text-xs text-[#FAF3F5] focus:border-[#F472B6] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(ms.id)}
                        aria-label={`Xóa cột mốc ${ms.title}`}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#F8D6E0]/14 text-[#D6BFC8] transition-colors hover:border-[#FB7185] hover:text-[#FB7185]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={ms.description}
                      onChange={(e) =>
                        handleUpdateMilestone(ms.id, 'description', e.target.value)
                      }
                      placeholder="Mô tả kỷ niệm..."
                      className="w-full rounded-lg border border-[#F8D6E0]/14 bg-[#181024] px-3 py-2 text-xs leading-relaxed text-[#E7D8DF] focus:border-[#F472B6] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: USER-CHOSEN BACKGROUND MUSIC SETUP */}
          {activeTab === 'music' && (
            <div className="space-y-5">
              {/* Custom Audio Upload Card */}
              <div className="rounded-xl border border-[#F472B6]/35 bg-[#211433] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#FAF3F5]">
                      Nhạc Nền Của Riêng Hai Bạn
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#D6BFC8]">
                      Chọn bài hát kỷ niệm từ thiết bị (MP3, M4A, WAV, OGG). Tệp nhạc được lưu trực
                      tiếp trên trình duyệt để phát mỗi khi mở trang.
                    </p>
                  </div>
                  <Music className="h-5 w-5 shrink-0 text-[#F472B6]" aria-hidden="true" />
                </div>

                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />

                {hasCustomAudio && data.music.customTrackName ? (
                  <div className="mt-4 rounded-xl border border-[#F8D6E0]/14 bg-[#170F24] p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[#FAF3F5]">
                          {data.music.customTrackName}
                        </p>
                        <p className="font-num mt-0.5 text-[11px] text-[#D6BFC8]">
                          {formatFileSize(data.music.customTrackSize)} · Đã lưu sẵn sàng
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleMusic}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F472B6] px-3 py-1.5 text-xs font-semibold text-[#170F24] hover:bg-[#F9A8D4] whitespace-nowrap shrink-0"
                      >
                        {musicPlaying && data.music.source === 'custom' ? (
                          <>
                            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Tạm dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Phát thử</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-[#F8D6E0]/10 pt-3">
                      <button
                        type="button"
                        disabled={uploadingAudio}
                        onClick={() => audioInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F8D6E0]/18 bg-[#231636] px-3 py-1.5 text-xs font-medium text-[#FAF3F5] hover:border-[#F472B6] whitespace-nowrap"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Đổi bài hát khác</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onRemoveCustomAudio();
                          notify('Đã gỡ tệp nhạc tùy chọn.');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F8D6E0]/14 px-3 py-1.5 text-xs font-medium text-[#D6BFC8] hover:border-[#FB7185] hover:text-[#FB7185] whitespace-nowrap"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Gỡ nhạc</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingAudio}
                    onClick={() => audioInputRef.current?.click()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#F472B6]/50 bg-[#191026] px-4 py-3.5 text-xs font-semibold text-[#FAF3F5] transition-colors hover:border-[#F472B6] hover:bg-[#26173B]"
                  >
                    <Upload className="h-4 w-4 text-[#F472B6]" aria-hidden="true" />
                    <span>
                      {uploadingAudio ? 'Đang lưu tệp nhạc...' : 'Chọn tệp nhạc từ máy của bạn'}
                    </span>
                  </button>
                )}
              </div>

              {/* Music Source Selector */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#D6BFC8]">Nguồn nhạc đang dùng</span>
                <div className="space-y-2">
                  {[
                    {
                      id: 'custom' as MusicSource,
                      title: 'Bài hát do tôi tự chọn',
                      desc: hasCustomAudio
                        ? data.music.customTrackName ?? 'Tệp âm thanh đã tải lên'
                        : 'Nhấn để tải lên bài hát yêu thích của hai bạn',
                    },
                    {
                      id: 'sunset-box' as MusicSource,
                      title: 'Nhạc hộp hoàng hôn (mặc định êm dịu)',
                      desc: 'Giai điệu celesta ấm áp không cần tệp ngoài',
                    },
                    {
                      id: 'starlight-chime' as MusicSource,
                      title: 'Đêm sao lắng đọng (mặc định êm dịu)',
                      desc: 'Hợp âm dương cầm nhẹ nhàng, thư thái',
                    },
                  ].map((item) => {
                    const selected = data.music.source === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectMusicSource(item.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${
                          selected
                            ? 'border-[#F472B6] bg-[#2B1940]'
                            : 'border-[#F8D6E0]/14 bg-[#1E132E] hover:border-[#F8D6E0]/30'
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <p className="text-xs font-semibold text-[#FAF3F5]">{item.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-[#D6BFC8]">{item.desc}</p>
                        </div>
                        <span
                          className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                            selected ? 'text-[#F472B6]' : 'text-[#D6BFC8]/60'
                          }`}
                        >
                          {selected ? 'Đang chọn' : 'Chọn'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Volume, Loop, and Heart Chime Controls */}
              <div className="space-y-4 rounded-xl border border-[#F8D6E0]/14 bg-[#201431] p-4">
                <label className="block">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#D6BFC8]">Âm lượng nhạc nền</span>
                    <span className="font-num text-[#FAF3F5]">
                      {Math.round(data.music.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={data.music.volume}
                    onChange={(e) =>
                      onUpdateData((prev) => ({
                        ...prev,
                        music: { ...prev.music, volume: Number(e.target.value) },
                      }))
                    }
                    className="twilight-slider mt-2.5 w-full"
                  />
                </label>

                <div className="flex items-center justify-between border-t border-[#F8D6E0]/10 pt-3">
                  <div>
                    <p className="text-xs font-medium text-[#FAF3F5]">Tự động lặp lại bài hát</p>
                    <p className="text-[11px] text-[#D6BFC8]">Phát liên tục khi hết bài</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={data.music.loop}
                    onClick={() =>
                      onUpdateData((prev) => ({
                        ...prev,
                        music: { ...prev.music, loop: !prev.music.loop },
                      }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      data.music.loop
                        ? 'border-[#F472B6] bg-[#F472B6]/20 text-[#FAF3F5]'
                        : 'border-[#F8D6E0]/16 bg-[#181024] text-[#D6BFC8]'
                    }`}
                  >
                    {data.music.loop ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-[#F8D6E0]/10 pt-3">
                  <div>
                    <p className="text-xs font-medium text-[#FAF3F5]">
                      Tiếng chuông nhẹ khi chạm trái tim
                    </p>
                    <p className="text-[11px] text-[#D6BFC8]">
                      Âm thanh pha lê ngân khẽ khi tạo pháo hoa sáng
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={data.music.heartChimeEnabled}
                    onClick={() =>
                      onUpdateData((prev) => ({
                        ...prev,
                        music: {
                          ...prev.music,
                          heartChimeEnabled: !prev.music.heartChimeEnabled,
                        },
                      }))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      data.music.heartChimeEnabled
                        ? 'border-[#F472B6] bg-[#F472B6]/20 text-[#FAF3F5]'
                        : 'border-[#F8D6E0]/16 bg-[#181024] text-[#D6BFC8]'
                    }`}
                  >
                    {data.music.heartChimeEnabled ? 'Đang bật' : 'Đang tắt'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Inline Two-Step Reset Confirmation */}
        <div className="flex items-center justify-between border-t border-[#F8D6E0]/14 px-6 py-4">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#D6BFC8] transition-colors hover:text-[#FB7185] whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Khôi phục mặc định</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#FFE4E6]">Đặt lại tất cả?</span>
              <button
                type="button"
                onClick={async () => {
                  await onResetAll();
                  setConfirmReset(false);
                  notify('Đã khôi phục toàn bộ dữ liệu mẫu ban đầu.');
                }}
                className="rounded-lg bg-[#FB7185] px-2.5 py-1 text-xs font-semibold text-[#170F24] whitespace-nowrap"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-[#F8D6E0]/16 px-2.5 py-1 text-xs text-[#D6BFC8] whitespace-nowrap"
              >
                Hủy
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#F472B6] px-4 py-2 text-xs font-semibold text-[#170F24] transition-colors hover:bg-[#F9A8D4] whitespace-nowrap"
          >
            Hoàn tất
          </button>
        </div>
      </aside>
    </div>
  );
}
