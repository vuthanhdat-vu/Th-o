import {
  CalendarHeart,
  Cat,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Heart,
  Mail,
  Pause,
  Play,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ActivePanel, ShowcaseRealm } from '../types/showcase';

interface BottomControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeRealm: ShowcaseRealm;
  onSelectRealm: (realm: ShowcaseRealm) => void;
  activePanel: ActivePanel;
  onTogglePanel: (panel: ActivePanel) => void;
  onTriggerHeartbeat: () => void;
  musicPlaying: boolean;
  musicLabel: string;
  onToggleMusic: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
}

const REALM_OPTIONS: Array<{
  id: ShowcaseRealm;
  label: string;
  shortcut: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}> = [
  { id: 'heart', label: 'Trái tim', shortcut: '1', Icon: Heart },
  { id: 'sky', label: 'Bầu trời', shortcut: '2', Icon: CloudSun },
  { id: 'underwater', label: 'Dưới nước', shortcut: '3', Icon: Waves },
  { id: 'cat-island', label: 'Đảo Mèo', shortcut: '4', Icon: Cat },
];

export function BottomControlDock({
  collapsed,
  onToggleCollapse,
  activeRealm,
  onSelectRealm,
  activePanel,
  onTogglePanel,
  onTriggerHeartbeat,
  musicPlaying,
  musicLabel,
  onToggleMusic,
  autoRotate,
  onToggleAutoRotate,
}: BottomControlDockProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex flex-col items-center px-3 sm:bottom-5">
      {/* Collapsible Zen Mode Toggle attached to top edge of dock */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-[#F8D6E0]/20 bg-[#181024]/90 px-3 py-1 text-xs font-medium text-[#D6BFC8] transition-colors duration-150 hover:border-[#F472B6]/45 hover:text-[#FAF3F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] whitespace-nowrap shrink-0"
        aria-expanded={!collapsed}
        title="Phím tắt H"
      >
        {collapsed ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hiện điều khiển</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ẩn điều khiển</span>
          </>
        )}
      </button>

      {/* Unified Horizontal Control Dock (solid/rgba dark plum surface — no backdrop-filter over WebGL) */}
      <div
        className={`pointer-events-auto max-w-[min(1040px,96vw)] overflow-x-auto rounded-2xl border border-[#F8D6E0]/16 bg-[#170F24]/92 px-3 py-2.5 shadow-[0_14px_40px_rgba(8,3,16,0.6)] transition-all duration-200 ease-out ${
          collapsed
            ? 'pointer-events-none translate-y-12 opacity-0 h-0 py-0 border-0 overflow-hidden'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 4-Realm Photo Showcase Navigator */}
          <div
            className="flex items-center gap-1 rounded-xl bg-[#241736] p-1 shrink-0"
            role="group"
            aria-label="Không gian trình diễn ảnh"
          >
            {REALM_OPTIONS.map(({ id, label, shortcut, Icon }) => {
              const active = activeRealm === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectRealm(id)}
                  title={`${label} (Phím ${shortcut})`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] ${
                    active
                      ? 'bg-[#F472B6] text-[#170F24]'
                      : 'text-[#D6BFC8] hover:text-[#FAF3F5]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden={true} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-5 w-px bg-[#F8D6E0]/15 shrink-0" aria-hidden="true" />

          {/* Heartbeat & Particle Fireworks Trigger */}
          <button
            type="button"
            onClick={onTriggerHeartbeat}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#F472B6]/40 bg-[#F472B6]/15 px-3 py-1.5 text-xs font-medium text-[#FAF3F5] transition-colors duration-150 hover:bg-[#F472B6]/28 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            <Heart className="h-3.5 w-3.5 text-[#F472B6]" aria-hidden="true" />
            <span>Nhịp tim</span>
          </button>

          {/* Love Letter Modal Toggle */}
          <button
            type="button"
            onClick={() => onTogglePanel('letter')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] ${
              activePanel === 'letter'
                ? 'border-[#F472B6] bg-[#F472B6] text-[#170F24]'
                : 'border-[#F8D6E0]/14 bg-[#221633] text-[#FAF3F5] hover:border-[#F472B6]/45'
            }`}
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Thiệp lời nhắn</span>
          </button>

          {/* Milestones Drawer Toggle */}
          <button
            type="button"
            onClick={() => onTogglePanel('milestones')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] ${
              activePanel === 'milestones'
                ? 'border-[#F472B6] bg-[#F472B6] text-[#170F24]'
                : 'border-[#F8D6E0]/14 bg-[#221633] text-[#FAF3F5] hover:border-[#F472B6]/45'
            }`}
          >
            <CalendarHeart className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Cột mốc</span>
          </button>

          <div className="h-5 w-px bg-[#F8D6E0]/15 shrink-0" aria-hidden="true" />

          {/* Music Play / Pause Toggle */}
          <button
            type="button"
            onClick={onToggleMusic}
            title={musicLabel}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] ${
              musicPlaying
                ? 'border-[#F6A68E]/60 bg-[#F6A68E]/20 text-[#FAF3F5]'
                : 'border-[#F8D6E0]/14 bg-[#221633] text-[#D6BFC8] hover:border-[#F472B6]/45 hover:text-[#FAF3F5]'
            }`}
          >
            {musicPlaying ? (
              <Volume2 className="h-3.5 w-3.5 text-[#F6A68E]" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="max-w-[116px] truncate">
              {musicPlaying ? musicLabel : 'Bật nhạc'}
            </span>
          </button>

          {/* Auto-Orbit Toggle */}
          <button
            type="button"
            onClick={onToggleAutoRotate}
            title={autoRotate ? 'Tạm dừng xoay tự động' : 'Tiếp tục xoay tự động'}
            aria-label={autoRotate ? 'Tạm dừng xoay tự động' : 'Tiếp tục xoay tự động'}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#F8D6E0]/14 bg-[#221633] text-[#D6BFC8] transition-colors duration-150 hover:border-[#F472B6]/45 hover:text-[#FAF3F5] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            {autoRotate ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {/* Customize Studio Drawer Button */}
          <button
            type="button"
            onClick={() => onTogglePanel('editor')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] ${
              activePanel === 'editor'
                ? 'border-[#F472B6] bg-[#F472B6] text-[#170F24]'
                : 'border-[#F8D6E0]/14 bg-[#221633] text-[#FAF3F5] hover:border-[#F472B6]/45'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tùy chỉnh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
