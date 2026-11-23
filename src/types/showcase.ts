export interface MemoryItem {
  id: string;
  title: string;
  date: string;
  message: string;
  imageUrl: string;
}

export interface MilestoneItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

export type MusicSource = 'custom' | 'sunset-box' | 'starlight-chime';

export interface MusicConfig {
  source: MusicSource;
  customTrackName: string | null;
  customTrackSize: number | null;
  volume: number; // 0 to 1
  loop: boolean;
  heartChimeEnabled: boolean;
}

export interface LoveShowcaseData {
  partnerA: string;
  partnerB: string;
  headline: string;
  startDate: string; // ISO YYYY-MM-DD
  letterHeader?: string;
  letterTitle: string;
  letterBody: string;
  letterSignature: string;
  letterFontSize?: number;
  memories: MemoryItem[];
  realmMemories?: Record<ShowcaseRealm, MemoryItem[]>;
  milestones: MilestoneItem[];
  music: MusicConfig;
}

export type ShowcaseRealm = 'heart' | 'sky' | 'underwater' | 'cat-island';

export type ActivePanel = 'none' | 'letter' | 'milestones' | 'editor';

export interface TwilightStageHandle {
  triggerHeartbeat: () => void;
  focusMemory: (memoryId: string | null) => void;
  setRealm: (realm: ShowcaseRealm) => void;
}
