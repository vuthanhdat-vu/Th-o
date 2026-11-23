import { useEffect, useState } from 'react';
import { Cake, Sparkles } from 'lucide-react';

interface TopIdentityBarProps {
  partnerA: string;
  partnerB: string;
  headline: string;
  startDate: string;
  activeRealmLabel: string;
  showHint: boolean;
}

export function TopIdentityBar({
  partnerB,
  headline,
  activeRealmLabel,
  showHint,
}: TopIdentityBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed top-0 inset-x-0 z-20 flex flex-col items-center pt-5 sm:pt-6 px-4 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      {/* Birthday Banner */}
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-[#F8D6E0]/25 bg-[#181024]/90 px-5 py-3 shadow-[0_12px_40px_rgba(8,3,16,0.6)]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F472B6] to-[#EC4899] shadow-lg shadow-pink-500/30">
          <Cake className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h1 className="font-script text-2xl sm:text-3xl bg-gradient-to-r from-[#F9A8D4] via-[#F472B6] to-[#EC4899] bg-clip-text text-transparent font-bold leading-tight">
            {headline || `Happy Birthday ${partnerB}`}
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <Sparkles className="h-3 w-3 text-[#F6A68E]" aria-hidden="true" />
            <span className="text-xs text-[#D6BFC8] font-medium">
              {activeRealmLabel}
            </span>
            <Sparkles className="h-3 w-3 text-[#F6A68E]" aria-hidden="true" />
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#F472B6] shadow-lg shadow-pink-500/30">
          <span className="text-lg" role="img" aria-label="birthday cake">🎂</span>
        </div>
      </div>

      {/* Hint text for first-time visitors */}
      {showHint && (
        <p className="mt-3 animate-pulse text-xs text-[#D6BFC8]/70 tracking-wide select-none">
          ✨ Nhấp vào trái tim hoặc khung ảnh để khám phá lời chúc ✨
        </p>
      )}
    </div>
  );
}
