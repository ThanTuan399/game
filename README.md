# 🌾 MY LITTLE HOMETOWN — FULL PHASE 1–8

Bản full playable edition bằng **HTML5 + CSS3 + JavaScript ES6 Modules + Canvas + JSON + LocalStorage**. Không cần backend.

## Chạy bằng VS Code + Live Server

1. Giải nén thư mục.
2. Mở thư mục `My_Little_Hometown_Full` bằng VS Code.
3. Chuột phải `index.html` → **Open with Live Server**.
4. Không chạy bằng `file:///...` vì game đọc dữ liệu JSON qua HTTP.

## Điều khiển

- WASD / phím mũi tên: di chuyển
- SHIFT: chạy
- SPACE: dùng dụng cụ
- 1 Cuốc
- 2 Hạt lúa
- 3 Hạt ngô
- 4 Hạt cà rốt
- 5 Rìu
- 6 Cuốc đá
- 7 Câu cá
- E: tương tác NPC / cửa hàng / nhiệm vụ
- I: túi đồ
- M: bản đồ
- Q: xem / giao nhiệm vụ tại Tòa thị trấn
- F: lưu game
- ESC: về menu

## Các phase đã tích hợp

### Phase 1 — Core World
Menu, Continue, Settings, tạo world, biome, town name, seed, Random Town, procedural map, camera, collision, nhà, cây, ruộng, sông, NPC, ngày/đêm, save.

### Phase 2 — Farming & Life
Cuốc, gieo, tưới, tăng trưởng theo ngày, thu hoạch, inventory, công cụ, animals cơ bản, fishing.

### Phase 3 — NPC & Social
NPC có nghề, tính cách, lời thoại, lịch đơn giản, friendship và heart feedback.

### Phase 4 — Economy
Mua hạt giống, bán nông sản/tài nguyên, tiền, giá bán theo item và cửa hàng.

### Phase 5 — Weather & Environment
Nắng, mây, mưa, mưa lớn, sương, bão; tác động tăng trưởng cây và khung cảnh.

### Phase 6 — Exploration
Hang, miếu, hải đăng, bến thuyền và phần thưởng khám phá.

### Phase 7 — Events & Town Identity
Tên/biome/tài nguyên/kiến trúc theo town; ngày hội, hội câu cá, chợ đêm, hội mùa màng; town generator theo seed.

### Phase 8 — Visual Polish
Pixel-art Canvas nhiều lớp, animation cây/nước/NPC, bóng đổ, ánh sáng ngày đêm, mưa, sương, UI pixel/cozy, culling theo camera.

## Cấu trúc

```text
My_Little_Hometown_Full/
├── index.html
├── style.css
├── README.md
├── js/
│   ├── main.js
│   ├── game.js
│   ├── player.js
│   ├── camera.js
│   ├── input.js
│   ├── world.js
│   ├── townGenerator.js
│   ├── mapGenerator.js
│   ├── renderer.js
│   ├── npc.js
│   ├── lighting.js
│   ├── save.js
│   └── utils.js
├── data/
│   ├── towns.json
│   ├── biomes.json
│   ├── crops.json
│   ├── items.json
│   └── npcs.json
└── assets/
```

## Ghi chú đồ họa

Bản này không dùng hình vuông màu đơn giản làm sprite chính. Pixel-art được dựng trực tiếp bằng các khối pixel có outline, highlight, shadow, texture và lớp cảnh quan để giữ hình ảnh sắc nét khi phóng to.

Đây là một **full playable prototype** tích hợp tất cả phase thành một game web không backend. Bộ sprite/animation frame hoàn chỉnh cấp thương mại có thể được thay thế sau trong thư mục `assets/` mà không phải viết lại hệ thống gameplay.

## Visual Upgrade v2
- Responsive full-screen Canvas rendering
- 32px tile scale for stronger pixel-art readability
- Layered terrain, shoreline highlights, foliage clusters, shadows and building details
- Full-screen toggle in the HUD
- High-density weather particles and night vignette
