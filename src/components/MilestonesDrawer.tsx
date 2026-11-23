import { X, Cake, Gift } from 'lucide-react';
import type { MilestoneItem } from '../types/showcase';
import { formatVietnameseDate } from '../data/defaults';

interface MilestonesDrawerProps {
  open: boolean;
  partnerA: string;
  partnerB: string;
  startDate: string;
  milestones: MilestoneItem[];
  onClose: () => void;
  onOpenEditor: () => void;
}

export function MilestonesDrawer({
  open,
  partnerB,
  startDate,
  milestones,
  onClose,
  onOpenEditor,
}: MilestonesDrawerProps) {
  if (!open) return null;

  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[#0D0716]/65"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestones-heading"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[#F8D6E0]/16 bg-[#181024] shadow-[-20px_0_50px_rgba(6,2,14,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#F8D6E0]/14 px-6 py-5">
          <div>
            <h2
              id="milestones-heading"
              className="font-editorial text-2xl font-semibold text-[#FAF3F5] flex items-center gap-2"
            >
              <Cake className="h-6 w-6 text-[#F472B6]" />
              Dấu Mốc Sinh Nhật
            </h2>
            <p className="mt-0.5 text-xs text-[#D6BFC8]">
              🎂 {partnerB} · Sinh nhật {formatVietnameseDate(startDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng dấu mốc"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F8D6E0]/16 bg-[#241738] text-[#D6BFC8] transition-colors hover:border-[#F472B6] hover:text-[#FAF3F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Birthday Celebration Banner */}
        <div className="border-b border-[#F8D6E0]/14 bg-gradient-to-r from-[#201431] via-[#2D1A42] to-[#201431] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F472B6] to-[#EC4899] shadow-lg shadow-pink-500/25">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs text-[#D6BFC8]">Chúc mừng sinh nhật</p>
              <p className="font-script text-3xl font-medium tracking-tight text-[#FAF3F5]">
                {partnerB}
              </p>
              <p className="text-xs text-[#F6A68E]">
                🎉 Chúc chị tuổi mới thật nhiều niềm vui!
              </p>
            </div>
          </div>
        </div>

        {/* Chronological Milestones Timeline */}
        <div className="twilight-scroll flex-1 overflow-y-auto px-6 py-6">
          {sorted.length === 0 ? (
            <p className="text-sm text-[#D6BFC8]">
              Chưa có dấu mốc nào. Nhấn nút Chỉnh sửa bên dưới để thêm dấu mốc đầu tiên.
            </p>
          ) : (
            <ol className="space-y-6">
              {sorted.map((item, idx) => (
                <li
                  key={item.id}
                  className="border-b border-[#F8D6E0]/10 pb-5 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center gap-2 text-xs text-[#F6A68E]">
                    <span className="font-num">{String(idx + 1).padStart(2, '0')}</span>
                    <span aria-hidden="true" className="text-[#F8D6E0]/35">
                      ·
                    </span>
                    <span className="font-num">{formatVietnameseDate(item.date)}</span>
                  </div>
                  <h3 className="font-editorial mt-1 text-xl font-semibold text-[#FAF3F5]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#D6BFC8]">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="border-t border-[#F8D6E0]/14 px-6 py-4">
          <button
            type="button"
            onClick={onOpenEditor}
            className="w-full rounded-xl bg-[#F472B6] px-4 py-2.5 text-xs font-semibold text-[#170F24] transition-colors hover:bg-[#F9A8D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF3F5]"
          >
            ✏️ Chỉnh sửa dấu mốc sinh nhật
          </button>
        </div>
      </aside>
    </div>
  );
}
