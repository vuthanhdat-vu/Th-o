import { publicAssetUrl } from '../services/publicAssetUrl';
import { calculateDaysTogether, formatVietnameseDate } from '../data/defaults';

interface LoveLetterModalProps {
  open: boolean;
  partnerA: string;
  partnerB: string;
  startDate: string;
  letterHeader?: string;
  letterTitle: string;
  letterBody: string;
  letterSignature?: string;
  letterFontSize?: number;
  onClose: () => void;
}

export function LoveLetterModal({
  open,
  partnerB,
  startDate,
  letterHeader = 'Happy Birthday',
  letterTitle,
  letterBody,
  letterSignature,
  letterFontSize = 15,
  onClose,
}: LoveLetterModalProps) {
  if (!open) return null;

  const { totalDays } = calculateDaysTogether(startDate);
  const paragraphs = letterBody
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm p-4 sm:p-6 transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="love-letter-heading"
      onClick={onClose}
    >
      {/* Birthday Letter Card */}
      <div
        className="relative max-h-[90vh] w-full max-w-[520px] sm:max-w-[560px] rounded-2xl shadow-[0_28px_75px_rgba(15,4,25,0.75),0_10px_25px_rgba(15,4,25,0.45)] border border-[#FFD0E2]/50 overflow-hidden flex flex-col"
        style={{
          aspectRatio: '1131 / 1600',
          backgroundImage: `url(${publicAssetUrl('assets/love_letter_paper_clean.webp')})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#FCF6F1',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="paper-scroll h-full w-full overflow-y-auto flex flex-col px-[14.5%] sm:px-[15%] pt-[8%] pb-[9%]">
          {/* Header Typography */}
          <header className="text-center select-none pt-1 sm:pt-2">
            <h2
              id="love-letter-heading"
              className="font-richford text-4xl sm:text-5xl lg:text-[54px] font-normal text-[#221424] my-1 leading-tight select-none"
            >
              {letterHeader || 'Happy Birthday'}
            </h2>

            {/* Birthday metadata */}
            <div className="font-revival mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs sm:text-[13px] text-[#634E5F]">
              <span>🎂 {partnerB}</span>
              <span>·</span>
              <span>🎉 Sinh nhật vui vẻ!</span>
              {startDate && totalDays > 0 && (
                <>
                  <span>·</span>
                  <span>📅 {formatVietnameseDate(startDate)}</span>
                </>
              )}
            </div>

            {letterTitle && letterTitle.toLowerCase() !== 'love' && (
              <p className="font-revival mt-2 text-base sm:text-lg text-[#3A2737]">
                {letterTitle.replace(/^[""'"]+|[""'"]+$/g, '')}
              </p>
            )}
          </header>

          {/* Letter Body Paragraphs */}
          <div
            className="font-revival my-4 sm:my-5 space-y-3.5 sm:space-y-4 text-[#2F2131] text-left pb-4"
            style={{
              fontSize: `${letterFontSize}px`,
              lineHeight: 1.85,
            }}
          >
            {paragraphs.length > 0 ? (
              paragraphs.map((text, idx) => <p key={idx}>{text}</p>)
            ) : (
              <p className="font-revival text-[#735C6D] text-center">
                Bạn có thể viết lời chúc sinh nhật trong mục Tùy chỉnh.
              </p>
            )}
          </div>

          {/* Signature */}
          {letterSignature && (
            <div className="font-revival mt-auto text-right text-[#634E5F] italic text-sm pb-2">
              {letterSignature}
            </div>
          )}
        </div>
      </div>

      {/* Subtle Hint to return to 3D Space */}
      <p className="mt-3 text-center text-xs tracking-wider text-pink-100/70 select-none drop-shadow">
        Nhấp bên ngoài để quay lại không gian 3D (hoặc nhấn phím Esc)
      </p>
    </div>
  );
}
