import type { LoveShowcaseData, MemoryItem } from '../types/showcase';
import { DEFAULT_SHOWCASE_DATA } from '../data/defaults';

const DB_NAME = 'TwilightBirthdayShowcaseDB_v2';
const DB_VERSION = 1;
const STORE_PROFILE = 'profile';
const STORE_AUDIO = 'audio';
const PROFILE_KEY = 'current';
const AUDIO_KEY = 'custom-bgm';
const FALLBACK_LS_KEY = 'twilight_birthday_showcase_v2';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROFILE)) {
        db.createObjectStore(STORE_PROFILE);
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open DB'));
  });
}

function mergeWithDefaults(raw: Partial<LoveShowcaseData> | null | undefined): LoveShowcaseData {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_SHOWCASE_DATA);
  }

  const defaultRealmMemories = structuredClone(DEFAULT_SHOWCASE_DATA.realmMemories ?? {
    heart: DEFAULT_SHOWCASE_DATA.memories,
    sky: [],
    underwater: [],
    'cat-island': [],
  });
  const rawRealmMemories = raw.realmMemories as Record<string, MemoryItem[]> | undefined;

  const heartMemories =
    Array.isArray(rawRealmMemories?.heart) && rawRealmMemories.heart.length > 0
      ? rawRealmMemories.heart
      : Array.isArray(raw.memories) && raw.memories.length > 0
        ? raw.memories
        : defaultRealmMemories.heart;

  const mergedRealmMemories = {
    heart: heartMemories,
    sky:
      Array.isArray(rawRealmMemories?.sky) && rawRealmMemories.sky.length > 0
        ? rawRealmMemories.sky
        : defaultRealmMemories.sky,
    underwater:
      Array.isArray(rawRealmMemories?.underwater) && rawRealmMemories.underwater.length > 0
        ? rawRealmMemories.underwater
        : defaultRealmMemories.underwater,
    'cat-island':
      Array.isArray(rawRealmMemories?.['cat-island']) && rawRealmMemories['cat-island'].length > 0
        ? rawRealmMemories['cat-island']
        : defaultRealmMemories['cat-island'],
  };

  return {
    ...DEFAULT_SHOWCASE_DATA,
    ...raw,
    memories: heartMemories,
    realmMemories: mergedRealmMemories,
    milestones: Array.isArray(raw.milestones)
      ? raw.milestones
      : structuredClone(DEFAULT_SHOWCASE_DATA.milestones),
    music: {
      ...DEFAULT_SHOWCASE_DATA.music,
      ...(raw.music ?? {}),
    },
  };
}

export async function loadShowcaseData(): Promise<LoveShowcaseData> {
  try {
    const db = await openDatabase();
    return await new Promise<LoveShowcaseData>((resolve) => {
      const tx = db.transaction(STORE_PROFILE, 'readonly');
      const store = tx.objectStore(STORE_PROFILE);
      const req = store.get(PROFILE_KEY);
      req.onsuccess = () => {
        db.close();
        resolve(mergeWithDefaults(req.result as Partial<LoveShowcaseData> | undefined));
      };
      req.onerror = () => {
        db.close();
        resolve(structuredClone(DEFAULT_SHOWCASE_DATA));
      };
    });
  } catch {
    try {
      const saved = localStorage.getItem(FALLBACK_LS_KEY);
      if (saved) {
        return mergeWithDefaults(JSON.parse(saved) as Partial<LoveShowcaseData>);
      }
    } catch {
      // ignore fallback errors
    }
    return structuredClone(DEFAULT_SHOWCASE_DATA);
  }
}

export async function saveShowcaseData(data: LoveShowcaseData): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PROFILE, 'readwrite');
      tx.objectStore(STORE_PROFILE).put(data, PROFILE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    try {
      localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(data));
    } catch {
      // quota exceeded fallback ignored safely
    }
  }
}

export async function saveCustomAudioBlob(blob: Blob): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    tx.objectStore(STORE_AUDIO).put(blob, AUDIO_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadCustomAudioBlob(): Promise<Blob | null> {
  try {
    const db = await openDatabase();
    return await new Promise<Blob | null>((resolve) => {
      const tx = db.transaction(STORE_AUDIO, 'readonly');
      const req = tx.objectStore(STORE_AUDIO).get(AUDIO_KEY);
      req.onsuccess = () => {
        db.close();
        resolve(req.result instanceof Blob ? req.result : null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearCustomAudioBlob(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_AUDIO, 'readwrite');
      tx.objectStore(STORE_AUDIO).delete(AUDIO_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // ignore
  }
}

export async function clearAllShowcaseStorage(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_PROFILE, STORE_AUDIO], 'readwrite');
      tx.objectStore(STORE_PROFILE).delete(PROFILE_KEY);
      tx.objectStore(STORE_AUDIO).delete(AUDIO_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(FALLBACK_LS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Resizes and compresses an uploaded image file to a crisp data URL
 * suitable for both WebGL CanvasTexture and IndexedDB persistence.
 */
export function compressImageFile(file: File, maxDimension = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh này.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Định dạng ảnh không được hỗ trợ.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể xử lý ảnh trên trình duyệt này.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
