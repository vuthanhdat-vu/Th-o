# Hoàng Hôn Của Đôi Mình (Twilight Love 3D Showcase)

Không gian 3D tương tác lãng mạn dành cho các cặp đôi, kết hợp giữa nghệ thuật thị giác WebGL hoàng hôn hồng tím, khối ngọc trái tim 3D phản chiếu, các khung ảnh kỷ niệm xoay quanh quỹ đạo, chữ sao băng nghệ thuật và thiệp hoa thư tình vintage.

---

## 🌟 Tính Năng Nổi Bật

1. **4 Bối Cảnh Không Gian 3D (Realms)**:
   - ❤️ **Cõi Trái Tim (Heart)**
   - 🌤️ **Cõi Bầu Trời (Sky)**
   - 🌊 **Cõi Dưới Nước (Underwater)**
   - 🐱 **Cõi Đảo Mèo (Cat Island)**

2. **Khung Ảnh Kỷ Niệm 3D & Phóng To Chi Tiết**:
   - Khung tranh viền kim loại hồng đồng xoay quanh không gian 3D.
   - Nhấp vào bất kỳ khung ảnh nào để phóng to cận cảnh (Spotlight modal), hỗ trợ thu phóng (zoom in/out) và duyệt chuyển qua lại giữa các kỷ niệm.

3. **Chữ Sao Băng 3D Đối Xứng**:
   - Mặt trước: Tên viết tắt lồng trái tim (mặc định: `MĐ ♥ BA`).
   - Mặt sau đối diện: Câu trích dẫn tình yêu dạng sao băng lấp lánh: *"My night has become a sunny dawn because of you."*

4. **Thiệp Thư Tình Vintage (Floral Stationery Love Letter)**:
   - Thiết kế thiệp hoa giấy kem sang trọng, viền hoa hồng cánh sen nước.
   - Tiêu đề nghệ thuật dùng phông chữ viết tay **Richford Bold**.
   - Thân thư dùng phông chữ cổ điển **Revival 555 Italic**, căn lề chuẩn xác trong khuôn khổ giấy kem.
   - Tùy chỉnh trực tiếp cỡ chữ thân thư (Slider từ 12px đến 22px và 4 nút chọn nhanh: Nhỏ, Chuẩn, Lớn, Rất lớn).

5. **Bộ Tùy Chỉnh Toàn Diện (Customize Drawer)**:
   - Thay đổi tên hai bạn, ngày bắt đầu yêu, tiêu đề không gian.
   - Chỉnh sửa tiêu đề nghệ thuật thiệp, lời mở đầu, nội dung tâm thư và cỡ chữ.
   - Thêm / sửa / xóa khung ảnh cho từng cõi riêng biệt (hỗ trợ upload ảnh trực tiếp từ máy).
   - Tải lên tệp nhạc nền tùy chỉnh (MP3, WAV, M4A, OGG).
   - Tự động lưu trữ offline bền vững bằng **IndexedDB**.

6. **Âm Thanh Web Audio & Nhạc Nền**:
   - Tích hợp sẵn bộ tổng hợp âm thanh Web Audio (tiếng chuông gió ngân nga, tiếng nhịp đập trái tim cơ học).
   - Tùy chỉnh âm lượng, chế độ lặp bài và bật/tắt chuông nhịp tim.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend Core**: React 19, TypeScript
- **Đồ họa 3D**: Three.js (WebGL, OrbitControls, Shaders, PBR Materials)
- **Styling**: Tailwind CSS v4, Lucide Icons, Motion
- **Build & Dev Tool**: Vite 8
- **Lưu trữ dữ liệu**: IndexedDB (`idb` native wrapper)
- **Âm thanh**: Web Audio API

---

## 🚀 Cài Đặt & Khởi Chạy

### Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18 trở lên (Khuyến nghị Node.js 20 hoặc 24).
- **Trình quản lý gói**: `npm` (hoặc `pnpm` / `bun`).

### Các Bước Thực Hiện
1. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```

2. Khởi chạy máy chủ phát triển (Development Server):
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại: `http://localhost:3000`

3. Kiểm tra kiểu dữ liệu TypeScript (Type check):
   ```bash
   npm run lint
   ```

---

## 📁 Cấu Trúc Mã Nguồn

```
untitled/
├── public/                          # Tài nguyên tĩnh phục vụ trực tiếp
│   ├── assets/
│   │   ├── love_letter_paper_clean.webp  # Nền thiệp hoa giấy kem
│   │   └── memories/                     # Ảnh kỷ niệm các cõi (sky, sea, cat)
│   ├── fonts/                            # Phông chữ cục bộ
│   │   ├── revival-555-italic.otf        # Phông nghiêng hoài niệm
│   │   └── Richford-Regular.ttf          # Phông viết tay nghệ thuật
│   └── models/                           # Mô hình 3D (.glb) & texture cho 4 cõi
│
├── src/                             # Toàn bộ mã nguồn ứng dụng
│   ├── assets/images/               # Ảnh kỷ niệm mặc định của cõi Trái tim
│   ├── components/                  # Các component giao diện React
│   │   ├── BottomControlDock.tsx    # Thanh công cụ điều hướng dưới đáy
│   │   ├── CustomizeDrawer.tsx      # Bảng Tùy chỉnh (Tên, Thư, Cỡ chữ, Ảnh, Nhạc)
│   │   ├── LoveLetterModal.tsx      # Modal thiệp thư tình hoa vintage
│   │   ├── MemorySpotlightCard.tsx  # Modal phóng to chi tiết ảnh kỷ niệm & zoom
│   │   ├── MilestonesDrawer.tsx     # Bảng các cột mốc tình yêu
│   │   └── TopIdentityBar.tsx       # Thanh nhận diện góc trên
│   ├── scene/                       # Hệ thống đồ họa Three.js
│   │   ├── TwilightHeartStage.tsx   # Canvas Three.js & vòng lặp render
│   │   ├── heartSculpture.ts        # Mô hình trái tim Ruby 3D đa diện & nhịp tim
│   │   ├── photoOrbit.ts            # Quỹ đạo xoay & raycasting khung ảnh 3D
│   │   ├── realms.ts                # Khởi tạo và quản lý 4 cõi không gian
│   │   ├── sunsetEnvironment.ts     # Bầu trời hoàng hôn hồng tím & mặt biển
│   │   ├── particleSystem.ts        # Bụi sáng lấp lánh & đom đóm
│   │   ├── meteorText.ts            # Chữ sao băng 3D 2 mặt
│   │   ├── skyFlightTrajectory.ts   # Đường cong spline bay lượn cõi Bầu trời
│   │   └── terrainMaps.ts           # Địa hình đảo nhiệt đới & đáy biển
│   ├── services/                    # Dịch vụ ngầm
│   │   ├── audioEngine.ts           # Trình phát nhạc nền & tạo hiệu ứng âm thanh
│   │   └── storage.ts               # Lưu trữ IndexedDB (hỗ trợ lưu ảnh/audio blob)
│   ├── data/defaults.ts             # Dữ liệu mặc định & hàm tính toán ngày yêu
│   ├── types/showcase.ts            # Khai báo kiểu TypeScript
│   ├── App.tsx                      # Component gốc kết nối state & sự kiện
│   ├── index.css                    # Khai báo font-face, scrollbars & keyframes
│   └── main.tsx                     # Điểm mount React 19
│
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```


