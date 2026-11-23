import { useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, X } from 'lucide-react';
import type { MemoryItem } from '../types/showcase';
import { formatVietnameseDate } from '../data/defaults';

interface MemorySpotlightCardProps {
  memories: MemoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function MemorySpotlightCard({
  memories,
  selectedId,
  onSelect,
  onClose,
}: MemorySpotlightCardProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!selectedId) return null;
  const index = memories.findIndex((m) => m.id === selectedId);
  if (index === -1) return null;

  const memory = memories[index];
  const prevIndex = (index - 1 + memories.length) % memories.length;
  const nextIndex = (index + 1) % memories.length;
  const isBroken = failedUrl === memory.imageUrl;

  return (
    <aside
      aria-label="Chi tiết kỷ niệm"
      className="fixed right-4 bottom-24 z-25 w-[min(370px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#F8D6E0]/20 bg-[#191026]/95 shadow-[0_20px_50px_rgba(8,3,16,0.72)] sm:right-7 sm:bottom-24"
    >
      {/* Photo Preview with Zero-Broken-Image fallback */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#261638]">
        {!isBroken && memory.imageUrl ? (
          <img
            src={memory.imageUrl}
            alt={memory.title}
            referrerPolicy="no-referrer"
            onError={() => setFailedUrl(memory.imageUrl)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#3b1d49] via-[#5c2a4d] to-[#9b4a67] px-6 text-center">
            <Heart className="h-7 w-7 text-[#F9A8D4]" aria-hidden="true" />
            <p className="font-editorial mt-2 text-lg text-[#FAF3F5]">{memory.title}</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#191026] via-[#191026]/55 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thẻ kỷ niệm"
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#F8D6E0]/20 bg-[#170F24]/90 text-[#FAF3F5] transition-colors hover:border-[#F472B6] hover:text-[#F472B6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Editorial Caption & Romantic Note */}
      <div className="px-5 pt-2 pb-5">
        <div className="flex items-center gap-2 text-xs text-[#D6BFC8]">
          <span className="font-num">
            {String(index + 1).padStart(2, '0')} / {String(memories.length).padStart(2, '0')}
          </span>
          {memory.date && (
            <>
              <span aria-hidden="true" className="text-[#F472B6]/60">
                ·
              </span>
              <span className="font-num">{formatVietnameseDate(memory.date)}</span>
            </>
          )}
        </div>

        <h2 className="font-editorial mt-1.5 text-2xl font-semibold leading-snug text-[#FAF3F5]">
          {memory.title}
        </h2>

        <p className="mt-2.5 text-sm leading-relaxed text-[#E7D8DF]">{memory.message}</p>

        {memories.length > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[#F8D6E0]/12 pt-3">
            <button
              type="button"
              onClick={() => onSelect(memories[prevIndex].id)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#D6BFC8] transition-colors hover:bg-[#26183A] hover:text-[#FAF3F5] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Kỷ niệm trước</span>
            </button>
            <button
              type="button"
              onClick={() => onSelect(memories[nextIndex].id)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#D6BFC8] transition-colors hover:bg-[#26183A] hover:text-[#FAF3F5] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
            >
              <span>Kỷ niệm sau</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
