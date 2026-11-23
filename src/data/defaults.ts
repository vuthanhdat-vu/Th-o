import type { LoveShowcaseData, MemoryItem, ShowcaseRealm } from '../types/showcase';

export const REALM_MEMORIES: Record<ShowcaseRealm, MemoryItem[]> = {
  heart: [
    {
      id: 'mem-heart-1',
      title: 'Buổi Chiều Ven Biển Đầu Tiên',
      date: '2024-10-12',
      message:
        'Bầu trời hôm ấy nhuộm sắc hồng tím thật khẽ. Chỉ cần nắm tay em đi dọc cây cầu gỗ nhỏ, mọi ồn ào ngoài kia bỗng hóa thành bình yên.',
      imageUrl: '/src/assets/images/memory_first_sunset_1795260876519.jpg',
    },
    {
      id: 'mem-heart-2',
      title: 'Ánh Đèn Nhỏ Trên Sân Thượng',
      date: '2024-12-24',
      message:
        'Giữa hàng ngàn ánh đèn thành phố lúc chạng vạng, điều sáng nhất trong mắt anh vẫn là nụ cười của em khi tựa vai nhau đón gió.',
      imageUrl: '/src/assets/images/memory_lantern_evening_1795260854146.jpg',
    },
    {
      id: 'mem-heart-3',
      title: 'Góc Quán Quen Ngày Mưa Nhẹ',
      date: '2025-02-14',
      message:
        'Ngoài khung kính là cơn mưa bụi chiều tím, còn bên trong là hai tách cà phê ấm và hơi ấm từ bàn tay em đan chặt vào tay anh.',
      imageUrl: '/src/assets/images/memory_coffee_rain_1795260851662.jpg',
    },
    {
      id: 'mem-heart-4',
      title: 'Cái Ôm Giữa Đồi Hoa Oải Hương',
      date: '2025-05-03',
      message:
        'Nắng cuối ngày rọi vàng lên mái tóc em bay trong gió. Anh ước thời gian có thể chậm lại thật lâu ngay trong vòng tay ấy.',
      imageUrl: '/src/assets/images/memory_meadow_embrace_1795260846757.jpg',
    },
    {
      id: 'mem-heart-5',
      title: 'Đếm Những Ngôi Sao Đầu Hôm',
      date: '2025-09-19',
      message:
        'Khi ánh hồng hoàng hôn vừa kịp nhường chỗ cho bầu trời sao, ta cùng ước thật nhiều chuyến đi nữa vẫn luôn có nhau đồng hành.',
      imageUrl: '/src/assets/images/memory_stargazing_hill_1795260878550.jpg',
    },
  ],
  sky: [
    {
      id: 'mem-sky-1',
      title: 'Chạm Tay Vào Mây Hoàng Hôn',
      date: '2024-11-05',
      message:
        'Ở độ cao lộng gió giữa tầng mây bồng bềnh, anh cảm nhận được sự tự do và tình yêu ngọt ngào nâng cánh đôi mình bay cao.',
      imageUrl: '/assets/memories/memory_sky_1.jpg',
    },
    {
      id: 'mem-sky-2',
      title: 'Cánh Diều Đón Gió Chiều Tím',
      date: '2025-01-18',
      message:
        'Thả những ước mơ lên bầu trời chiều lộng gió, nụ cười của em trong trẻo và rạng rỡ tựa ánh tà dương.',
      imageUrl: '/assets/memories/memory_sky_2.jpg',
    },
    {
      id: 'mem-sky-3',
      title: 'Ngắm Thành Phố Từ Đỉnh Đồi',
      date: '2025-03-22',
      message:
        'Khi phố thị dần lên đèn dưới chân đồi, ánh nhìn của em chính là ngọn hải đăng bình yên nhất dẫn lối anh về.',
      imageUrl: '/assets/memories/memory_sky_3.jpg',
    },
    {
      id: 'mem-sky-4',
      title: 'Tựa Vai Dưới Bầu Trời Tím',
      date: '2025-06-15',
      message:
        'Bầu trời chuyển dần sang sắc tím oải hương dịu dàng. Chỉ cần tựa vai em, cả vũ trụ dường như ngừng trôi.',
      imageUrl: '/assets/memories/memory_sky_4.jpg',
    },
    {
      id: 'mem-sky-5',
      title: 'Nguyện Ước Dưới Mưa Sao Băng',
      date: '2025-08-12',
      message:
        'Những vệt sao băng ánh xanh tím vụt qua nền trời, và điều ước duy nhất của anh luôn là được nắm tay em suốt cuộc đời.',
      imageUrl: '/assets/memories/memory_sky_5.jpg',
    },
  ],
  underwater: [
    {
      id: 'mem-water-1',
      title: 'Lặn Ngắm Rạn San Hô Đôi',
      date: '2024-11-20',
      message:
        'Cùng em lặn sâu xuống làn nước ngọc bích, chiêm ngưỡng thế giới rạn san hô lộng lẫy và những đàn cá nhiệt đới tung tăng.',
      imageUrl: '/assets/memories/memory_sea_1.jpg',
    },
    {
      id: 'mem-water-2',
      title: 'Dạo Bước Chân Trần Ven Sóng',
      date: '2025-02-28',
      message:
        'Sóng biển vỗ về bờ cát êm ái, bọt nước mát lạnh ôm lấy từng bước chân đôi mình trong ánh tà dương lấp lánh.',
      imageUrl: '/assets/memories/memory_sea_2.jpg',
    },
    {
      id: 'mem-water-3',
      title: 'Ánh Dương Qua Làn Nước Biếc',
      date: '2025-04-16',
      message:
        'Từng luồng sáng mặt trời chiếu xuyên qua mặt nước xanh biếc như những dải lụa phát sáng kỳ ảo của biển sâu.',
      imageUrl: '/assets/memories/memory_sea_3.jpg',
    },
    {
      id: 'mem-water-4',
      title: 'Chiếc Vỏ Ốc Kỷ Niệm Của Biển',
      date: '2025-07-08',
      message:
        'Em nhặt tặng anh chiếc vỏ ốc trắng ngà, bảo rằng áp tai vào sẽ nghe thấy lời thầm thì của đại dương và tình yêu.',
      imageUrl: '/assets/memories/memory_sea_4.jpg',
    },
    {
      id: 'mem-water-5',
      title: 'Đại Dương Yên Bình Bên Em',
      date: '2025-10-02',
      message:
        'Ngồi bên mạn thuyền nhìn chân trời biển rộng mênh mông, anh nhận ra biển có sâu đến đâu cũng không bằng tình cảm này.',
      imageUrl: '/assets/memories/memory_sea_5.jpg',
    },
  ],
  'cat-island': [
    {
      id: 'mem-cat-1',
      title: 'Chú Mèo Cam Dưới Gốc Cọ',
      date: '2024-12-05',
      message:
        'Vừa đặt chân lên đảo, chú mèo lông cam mũm mĩm đã chạy ra đón đường, quấn quýt bên chân em đòi vuốt ve.',
      imageUrl: '/assets/memories/memory_cat_1.jpg',
    },
    {
      id: 'mem-cat-2',
      title: 'Giấc Ngủ Trưa Trên Bãi Cỏ',
      date: '2025-03-08',
      message:
        'Gió biển thổi nhẹ qua đồi cỏ xanh, những chú mèo cuộn tròn ngủ say dưới nắng ấm thanh bình.',
      imageUrl: '/assets/memories/memory_cat_2.jpg',
    },
    {
      id: 'mem-cat-3',
      title: 'Cùng Em Vuốt Ve Những Chú Mèo',
      date: '2025-05-20',
      message:
        'Ánh mắt em lấp lánh niềm vui khi đàn mèo vây quanh, khoảnh khắc ấy đáng yêu và ngọt ngào hơn bất cứ điều gì.',
      imageUrl: '/assets/memories/memory_cat_3.jpg',
    },
    {
      id: 'mem-cat-4',
      title: 'Ánh Đèn Chiều Trên Cầu Gỗ',
      date: '2025-08-30',
      message:
        'Khi hoàng hôn buông xuống, những ngọn đèn lồng ấm áp trên cầu cảng thắp sáng con đường đôi mình dạo chơi cùng mèo.',
      imageUrl: '/assets/memories/memory_cat_4.jpg',
    },
    {
      id: 'mem-cat-5',
      title: 'Hoàng Hôn Nhuộm Vàng Đảo Mèo',
      date: '2025-10-18',
      message:
        'Ngồi bên em ngắm mặt trời lặn từ mỏm đá đảo mèo, tiếng sóng và tiếng mèo kêu êm đềm như một bản tình ca.',
      imageUrl: '/assets/memories/memory_cat_5.jpg',
    },
  ],
};

export const DEFAULT_SHOWCASE_DATA: LoveShowcaseData = {
  partnerA: 'Minh Đức',
  partnerB: 'Thảo Vy',
  headline: 'Hoàng Hôn Của Đôi Mình',
  startDate: '2024-09-19',
  letterHeader: 'My love',
  letterTitle: 'Gửi người thương trong ánh chiều hồng tím,',
  letterBody: `Nếu có thể giữ lại một khoảnh khắc đẹp nhất của cả bầu trời, anh sẽ chọn giây phút hoàng hôn buông xuống khi đôi mình nắm tay nhau đi qua những con phố nhỏ.

Cảm ơn em vì đã bước vào thế giới của anh bằng nụ cười dịu dàng nhất, biến những ngày bình thường trở thành những kỷ niệm lấp lánh mà anh luôn muốn nâng niu. Mỗi khung ảnh đang xoay quanh trái tim này là một mảnh ghép nhỏ của chúng mình — những buổi chiều gió nhẹ, những tách cà phê ngày mưa, và cả những lúc chỉ cần lặng yên ngắm bầu trời chuyển sắc bên nhau.

Mong rằng dù thêm bao nhiêu mùa hoàng hôn nữa đi qua, nhịp đập này vẫn luôn hướng về em, dịu dàng và trọn vẹn như ngày đầu tiên.`,
  letterSignature: 'Mãi thương em, của riêng em.',
  letterFontSize: 15,
  memories: REALM_MEMORIES.heart,
  realmMemories: structuredClone(REALM_MEMORIES),
  milestones: [
    {
      id: 'ms-1',
      date: '2024-09-19',
      title: 'Ngày Bắt Đầu Câu Chuyện',
      description: 'Lời tỏ tình dưới ánh hoàng hôn và cái gật đầu khiến cả bầu trời như bừng sáng.',
    },
    {
      id: 'ms-2',
      date: '2024-12-24',
      title: 'Mùa Giáng Sinh Đầu Tiên Bên Nhau',
      description: 'Cùng nghe nhạc dưới dây đèn vàng trên sân thượng và trao nhau những điều ước năm mới.',
    },
    {
      id: 'ms-3',
      date: '2025-05-03',
      title: 'Chuyến Đi Xa Đầu Tiên',
      description: 'Chạy trốn thành phố ồn ào để đón hoàng hôn tím trên triền đồi đầy hoa và gió mát.',
    },
    {
      id: 'ms-4',
      date: '2025-09-19',
      title: 'Tròn Một Năm Đồng Hành',
      description: '365 ngày dịu dàng trôi qua, tình yêu không cũ đi mà càng thêm sâu lắng và ấm áp.',
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
