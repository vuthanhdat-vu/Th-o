# 3D Graphics & LookDev Standards (In-Place Upgrade)

## 1. Core Constraints (Bắt buộc)
- **NO REBUILD:** Tuyệt đối không xóa hoặc viết lại cấu trúc kiến trúc/camera/layout cơ bản đang có. Chỉ refactor và nâng cấp trực tiếp vật liệu (materials), ánh sáng (lighting), shader, hậu kỳ (post-processing) và thay thế các khối hình học thô (primitive meshes) bằng model `.glb`.
- **PRESERVE COLOR PALETTE:** Giữ nguyên bảng màu chủ đạo hiện tại (tông hồng pastel, tím lavender, xanh dương/xanh ngọc nhẹ nhàng). Khi tinh chỉnh ánh sáng, sương mù (fog), bầu trời hoặc Tone Mapping, tuyệt đối không làm biến dạng màu sang tông cam gắt, đen kịt hoặc quá bão hòa.

## 2. Rendering & Post-Processing Pipeline
- Renderer bắt buộc dùng `THREE.ACESFilmicToneMapping` (điều chỉnh `toneMappingExposure` trong khoảng `0.95 - 1.15` để giữ độ trong trẻo của màu pastel) và `THREE.SRGBColorSpace`.
- Giới hạn pixel ratio: `Math.min(window.devicePixelRatio, 2)`.
- Ánh sáng môi trường (IBL): Bắt buộc dùng HDRI (`PMREMGenerator` / `<Environment>`) cường độ nhẹ (`0.4 - 0.8`) để tạo phản xạ thực tế trên pha lê, mặt nước và viền khung ảnh thay vì chỉ dùng `AmbientLight`.
- Hậu kỳ (`EffectComposer`): Dùng `Bloom` (ngưỡng sáng `luminanceThreshold > 1.05`, cường độ dịu `0.35 - 0.6` để không làm cháy sáng vùng màu hồng/tím) và khử răng cưa (`SMAA` hoặc `multisampling={4}`).

## 3. Materials, Shaders & Realism
- **Pha lê / Kính:** Bắt buộc dùng `MeshPhysicalMaterial` (hoặc `MeshTransmissionMaterial`) với `transmission: 1`, `ior: 1.5 - 2.4`, `thickness`, `roughness < 0.1`, `clearcoat: 1.0`. Không dùng `transparent: true` + `opacity` đơn thuần.
- **Vật liệu bề mặt (Cát, Đá, Gỗ):** Bắt buộc có tối thiểu Normal Map và Roughness Map để bắt sáng chân thực.
- **Mặt nước & Dưới nước:** Phải có biến thiên độ cao/gợn sóng bằng Vertex Shader hoặc Normal Map động, hiệu ứng Fresnel cho Snell's Window và Voronoi Noise cho Caustics. Các khối God Rays phải làm mờ viền bằng Fresnel để không lộ cạnh đa giác.

## 4. Performance & GPU Memory Management
- Mọi đối tượng lặp lại số lượng lớn (đàn chim, đàn cá, bọt khí, tảo biển, hạt sáng) bắt buộc dùng `THREE.InstancedMesh`.
- Không khởi tạo `new THREE.Vector3()`, `new THREE.Matrix4()`, hoặc `new THREE.Object3D()` bên trong vòng lặp animation (`requestAnimationFrame` / `useFrame`).
- Giải phóng bộ nhớ (`dispose()`) cho các geometry, material, texture không sử dụng khi chuyển đổi giữa các scene (Phím 1, 2, 3, 4).
- Mục tiêu hiệu năng: Giữ ổn định 60 FPS và tổng Draw Calls < 100 trên mỗi scene.