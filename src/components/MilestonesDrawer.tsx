import { X } from 'lucide-react';
import type { MilestoneItem } from '../types/showcase';
import { calculateDaysTogether, formatVietnameseDate } from '../data/defaults';

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
  partnerA,
  partnerB,
  startDate,
  milestones,
  onClose,
  onOpenEditor,
}: MilestonesDrawerProps) {
  if (!open) return null;

  const { totalDays, years, months, days } = calculateDaysTogether(startDate);
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
              className="font-editorial text-2xl font-semibold text-[#FAF3F5]"
            >
              Hành Trình Bên Nhau
            </h2>
            <p className="mt-0.5 text-xs text-[#D6BFC8]">
              {partnerA} &amp; {partnerB} · Từ {formatVietnameseDate(startDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng cột mốc"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F8D6E0]/16 bg-[#241738] text-[#D6BFC8] transition-colors hover:border-[#F472B6] hover:text-[#FAF3F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Days Together Counter Summary */}
        <div className="border-b border-[#F8D6E0]/14 bg-[#201431] px-6 py-5">
          <p className="text-xs text-[#D6BFC8]">Tổng thời gian bên nhau</p>
          <p className="font-num mt-1 text-4xl font-medium tracking-tight text-[#FAF3F5]">
            {totalDays.toLocaleString('vi-VN')}{' '}
            <span className="font-editorial text-2xl font-normal text-[#F6A68E]">ngày</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[#F8D6E0]/12 pt-3">
            <div>
              <p className="font-num text-lg font-medium text-[#FAF3F5]">{years}</p>
              <p className="text-xs text-[#D6BFC8]">Năm</p>
            </div>
            <div>
              <p className="font-num text-lg font-medium text-[#FAF3F5]">{months}</p>
              <p className="text-xs text-[#D6BFC8]">Tháng</p>
            </div>
            <div>
              <p className="font-num text-lg font-medium text-[#FAF3F5]">{days}</p>
              <p className="text-xs text-[#D6BFC8]">Ngày</p>
            </div>
          </div>
        </div>

        {/* Chronological Milestones Timeline */}
        <div className="twilight-scroll flex-1 overflow-y-auto px-6 py-6">
          {sorted.length === 0 ? (
            <p className="text-sm text-[#D6BFC8]">
              Chưa có cột mốc kỷ niệm nào. Nhấn nút Chỉnh sửa bên dưới để thêm dấu mốc đầu tiên của
              hai bạn.
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
            Chỉnh sửa ngày yêu &amp; cột mốc
          </button>
        </div>
      </aside>
    </div>
  );
}
