import type { LoveShowcaseData, MemoryItem, ShowcaseRealm } from '../types/showcase';

import { publicAssetUrl } from '../services/publicAssetUrl';

const img = (name: string) => publicAssetUrl(`assets/images/${name}`);

export const REALM_MEMORIES: Record<ShowcaseRealm, MemoryItem[]> = {
  heart: [
    {
      id: 'mem-heart-1',
      title: 'Nụ Cười Rạng Rỡ Nhất',
      date: '2026-11-23',
      message:
        'Chị luôn mang đến niềm vui cho mọi người bằng nụ cười ấm áp và chân thành nhất. Sinh nhật vui vẻ chị Thạch Thảo! 🎂',
      imageUrl: img('1795440826714_255325728555809316_5800590543145803216_1c2bbf2039a005f9e523c2666c0ea381.jpg'),
    },
    {
      id: 'mem-heart-2',
      title: 'Khoảnh Khắc Đáng Nhớ',
      date: '2026-11-23',
      message:
        'Mỗi khoảnh khắc bên chị đều đáng được lưu giữ, vì chị là người luôn biết cách biến mọi thứ trở nên đặc biệt.',
      imageUrl: img('1795440826743_255325728555809316_5800590543145803216_c6719ed289b4551b83e1fba8573a0f26.jpg'),
    },
    {
      id: 'mem-heart-3',
      title: 'Chị Là Ánh Sáng Của Gia Đình',
      date: '2026-11-23',
      message:
        'Với gia đình, chị luôn là ngọn đèn soi sáng, là chỗ dựa vững chắc và là nguồn cảm hứng bất tận.',
      imageUrl: img('1795440826762_255325728555809316_5800590543145803216_8d905977f55c2db89d3e9f0b3941965d.jpg'),
    },
    {
      id: 'mem-heart-4',
      title: 'Xinh Đẹp & Tự Tin',
      date: '2026-11-23',
      message:
        'Chị Thạch Thảo ơi, chị đẹp lắm! Chúc chị luôn tự tin tỏa sáng như vì sao đẹp nhất trên bầu trời. ✨',
      imageUrl: img('1795440826780_255325728555809316_5800590543145803216_1d0331e38583c730743e147d4a772063.jpg'),
    },
    {
      id: 'mem-heart-5',
      title: 'Happy Birthday Chị Yêu! 🎉',
      date: '2026-11-23',
      message:
        'Chúc chị một ngày sinh nhật thật ý nghĩa, tràn đầy tiếng cười và hạnh phúc. Em yêu chị nhiều lắm! 💕',
      imageUrl: img('1795440826794_255325728555809316_5800590543145803216_bb1f8a56723356ec598f07b543cb960d.jpg'),
    },
  ],
  sky: [
    {
      id: 'mem-sky-1',
      title: 'Bay Cao Với Ước Mơ',
      date: '2026-11-23',
      message:
        'Chúc chị luôn bay cao với những ước mơ của mình, không gì có thể ngăn cản một người tuyệt vời như chị!',
      imageUrl: img('1795440826809_255325728555809316_5800590543145803216_778805b5fd30e7b68fcec915b393bbf6.jpg'),
    },
    {
      id: 'mem-sky-2',
      title: 'Tỏa Sáng Rực Rỡ',
      date: '2026-11-23',
      message:
        'Giống như ánh hoàng hôn rực rỡ, chị luôn tỏa sáng bằng sự ấm áp và lòng nhân ái của mình.',
      imageUrl: img('1795440826822_255325728555809316_5800590543145803216_d042f22d860ccb5a6345d107c2e90236.jpg'),
    },
    {
      id: 'mem-sky-3',
      title: 'Kỷ Niệm Tuyệt Đẹp',
      date: '2026-11-23',
      message:
        'Những khoảnh khắc bên chị đẹp như bầu trời chiều tím, lung linh và đầy màu sắc.',
      imageUrl: img('1795440826835_255325728555809316_5800590543145803216_f7b636d10c996e02246825c0e61f3677.jpg'),
    },
    {
      id: 'mem-sky-4',
      title: 'Chị Thạch Thảo Xinh Xắn',
      date: '2026-11-23',
      message:
        'Mỗi bức ảnh đều lưu giữ vẻ đẹp đặc biệt của chị — nụ cười tỏa nắng, ánh mắt lung linh.',
      imageUrl: img('1795440826846_255325728555809316_5800590543145803216_5666fcf7b9e790c629a8d54b24eec850.jpg'),
    },
    {
      id: 'mem-sky-5',
      title: 'Lời Chúc Từ Bầu Trời',
      date: '2026-11-23',
      message:
        'Nếu có thể gửi lời chúc qua bầu trời, em sẽ viết: "Happy Birthday chị Thạch Thảo!" bằng những vì sao. 🌟',
      imageUrl: img('1795440826857_255325728555809316_5800590543145803216_480eef4b0dadca245fae5be951fadcdb.jpg'),
    },
  ],
  underwater: [
    {
      id: 'mem-water-1',
      title: 'Vẻ Đẹp Tựa Đại Dương',
      date: '2026-11-23',
      message:
        'Tâm hồn chị sâu rộng và đẹp đẽ như đại dương, luôn bao dung và yêu thương mọi người xung quanh.',
      imageUrl: img('1795440826867_255325728555809316_5800590543145803216_05555569d1324e238ef15fc9115ac101.jpg'),
    },
    {
      id: 'mem-water-2',
      title: 'Lấp Lánh Dưới Ánh Sáng',
      date: '2026-11-23',
      message:
        'Chị luôn tỏa ra ánh sáng riêng, lấp lánh và rạng ngời dù ở bất cứ đâu, giống như ánh nắng xuyên qua mặt nước.',
      imageUrl: img('1795440826877_255325728555809316_5800590543145803216_798442bc39d64221d8d47eb7c8759607.jpg'),
    },
    {
      id: 'mem-water-3',
      title: 'Chúc Chị Mãi Hạnh Phúc',
      date: '2026-11-23',
      message:
        'Em chúc chị luôn được bao quanh bởi yêu thương, hạnh phúc và những điều tốt đẹp nhất! 💎',
      imageUrl: img('1795440826887_255325728555809316_5800590543145803216_19c30b3917b42fcd18a5039592657006.jpg'),
    },
    {
      id: 'mem-water-4',
      title: 'Mãi Xinh Đẹp',
      date: '2026-11-23',
      message:
        'Chúc chị Thạch Thảo mãi mãi xinh đẹp, trẻ trung và rạng rỡ. Chị xứng đáng được yêu thương nhiều nhất!',
      imageUrl: img('1795440826897_255325728555809316_5800590543145803216_b8e8a285a668d016005b9c68aa1b6b9a.jpg'),
    },
    {
      id: 'mem-water-5',
      title: 'Biển Yêu Thương Dành Cho Chị',
      date: '2026-11-23',
      message:
        'Tình yêu gia đình dành cho chị sâu rộng như đại dương, không bao giờ cạn và luôn ấm áp.',
      imageUrl: img('1795440826907_255325728555809316_5800590543145803216_9979f2f722219deb26707b1fddcc8719.jpg'),
    },
  ],
  'cat-island': [
    {
      id: 'mem-cat-1',
      title: 'Đáng Yêu Như Mèo Con 🐱',
      date: '2026-11-23',
      message:
        'Chị dễ thương lắm, đáng yêu không kém gì những chú mèo xinh xắn trên đảo mèo đâu nha!',
      imageUrl: img('1795440826917_255325728555809316_5800590543145803216_4a8fec60c64583d3e11ebedfbb8c8b48.jpg'),
    },
    {
      id: 'mem-cat-2',
      title: 'Nụ Cười Ngọt Ngào',
      date: '2026-11-23',
      message:
        'Nụ cười của chị ấm áp hơn cả ánh nắng chiều trên hòn đảo bình yên nhất.',
      imageUrl: img('1795440826927_255325728555809316_5800590543145803216_07387a360ae87b40ccfc41ca31ef17ca.jpg'),
    },
    {
      id: 'mem-cat-3',
      title: 'Phong Cách Riêng Của Chị',
      date: '2026-11-23',
      message:
        'Chị luôn có phong cách riêng thật ấn tượng và cuốn hút, khiến ai cũng phải ngưỡng mộ.',
      imageUrl: img('1795440826937_255325728555809316_5800590543145803216_dccb5e758a602a4e7c43d6d4286ba936.jpg'),
    },
    {
      id: 'mem-cat-4',
      title: 'Tuổi Mới Thêm Rạng Ngời',
      date: '2026-11-23',
      message:
        'Mỗi tuổi mới là một trang sách mới đầy phiêu lưu. Chúc chị viết nên những câu chuyện tuyệt vời nhất! 📖',
      imageUrl: img('1795440826948_255325728555809316_5800590543145803216_00c98a063f29c7ba9f91cdc69daf5311.jpg'),
    },
    {
      id: 'mem-cat-5',
      title: 'Chị Là Báu Vật Của Em',
      date: '2026-11-23',
      message:
        'Cảm ơn chị vì luôn ở bên cạnh em. Chị không chỉ là chị gái, mà còn là người bạn thân nhất của em. Yêu chị! 💖',
      imageUrl: img('1795440826957_255325728555809316_5800590543145803216_04f6452a3bdff609b5b9c9ef570a1a35.jpg'),
    },
  ],
};

export const DEFAULT_SHOWCASE_DATA: LoveShowcaseData = {
  partnerA: 'Em',
  partnerB: 'Nguyễn Thạch Thảo',
  headline: '🎂 Happy Birthday Chị Thạch Thảo 🎂',
  startDate: '2026-11-23',
  letterHeader: 'Happy Birthday',
  letterTitle: 'Gửi chị Thạch Thảo yêu quý nhất,',
  letterBody: `Hôm nay là ngày đặc biệt nhất — ngày sinh nhật của chị yêu! Em muốn dành trang này để nói với chị rằng: Cảm ơn chị vì luôn là người tuyệt vời nhất!

Chị là người luôn mạnh mẽ, dịu dàng và đầy yêu thương. Chị luôn biết cách khiến mọi người xung quanh cảm thấy được quan tâm và trân trọng. Với em, chị không chỉ là chị gái — chị là người bạn thân, là chỗ dựa, là nguồn cảm hứng vô tận.

Mỗi khung ảnh đang xoay quanh đây là một lời chúc em gửi đến chị — chúc chị luôn xinh đẹp, luôn hạnh phúc, luôn tỏa sáng rực rỡ như ánh hoàng hôn tím hồng. Chúc chị tuổi mới thêm nhiều niềm vui, thêm nhiều thành công, và mãi mãi rạng ngời!

Em yêu chị nhiều lắm! Happy Birthday chị Thạch Thảo! 🎉🎂💕`,
  letterSignature: 'Yêu chị mãi mãi, em của chị. 💖',
  letterFontSize: 15,
  memories: REALM_MEMORIES.heart,
  realmMemories: structuredClone(REALM_MEMORIES),
  milestones: [
    {
      id: 'ms-1',
      date: '2026-11-23',
      title: '🎂 Ngày Sinh Nhật Chị Thạch Thảo',
      description: 'Ngày đặc biệt nhất trong năm — ngày chị yêu tràn ngập tiếng cười và lời chúc tốt đẹp!',
    },
    {
      id: 'ms-2',
      date: '2026-11-23',
      title: '🎁 Thổi Nến & Ước Nguyện',
      description: 'Chị hãy nhắm mắt, ước một điều thật đẹp rồi thổi tắt nến nhé! Chúc mọi điều ước của chị đều thành hiện thực.',
    },
    {
      id: 'ms-3',
      date: '2026-11-23',
      title: '📸 Kỷ Niệm Đẹp Nhất',
      description: 'Lưu giữ những khoảnh khắc tuyệt vời nhất trong ngày sinh nhật chị — những nụ cười, những cái ôm, và tình yêu thương.',
    },
    {
      id: 'ms-4',
      date: '2026-11-23',
      title: '💫 Tuổi Mới, Hành Trình Mới',
      description: 'Chúc chị bước sang tuổi mới với thật nhiều may mắn, sức khỏe và hạnh phúc. Chị xứng đáng với những điều tốt đẹp nhất!',
    },
  ],
  music: {
    source: 'sunset-box',
    customTrackName: null,
    customTrackSize: null,
    volume: 0.65,
    loop: true,
    heartChimeEnabled: true,
  },
};

export function calculateDaysTogether(startDateIso: string): {
  totalDays: number;
  years: number;
  months: number;
  days: number;
} {
  const parsed = new Date(`${startDateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffMs = today.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  let days = today.getDate() - start.getDate();

  if (days < 0) {
    const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }
  if (years < 0) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }

  return { totalDays, years, months, days };
}

export function formatVietnameseDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
