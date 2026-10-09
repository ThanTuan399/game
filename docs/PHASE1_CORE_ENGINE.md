# Phase 1 — Core Engine

Nhánh triển khai: `phase1-core-engine`.

## 1. Phân tích kiến trúc hiện tại

Project hiện tại đã là một game có vòng chơi thực: di chuyển, farming, tài nguyên, NPC, shop, quest, progression, ngày/mùa/thời tiết và save. Vì vậy Phase 1 không viết lại từ số 0 và không xóa gameplay đang hoạt động.

Điểm cần refactor:

- `js/game.js` đang vừa điều phối game loop vừa xử lý gameplay.
- Input, camera, player, world và renderer đang nằm ở thư mục gốc thay vì theo domain.
- Collision đang nằm trực tiếp trong `World`, khiến render/world/gameplay khó mở rộng độc lập.
- Camera follow gần như bám tâm người chơi; cần dead-zone + smoothing.
- Player chưa chặn va chạm với NPC.
- Chưa có lớp GameLoop độc lập để có thể pause/stop/test rõ ràng.

## 2. Phần tái sử dụng

Giữ lại:

- Procedural map và seed.
- Farming đang hoạt động.
- Resource gathering.
- NPC + lịch di chuyển.
- Renderer pixel-art hiện có.
- Shop, quest, progression, save.
- UI hiện tại.

## 3. Phần viết lại / tách module

```text
js/
├─ core/
│  ├─ gameLoop.js
│  ├─ input.js
│  └─ camera.js
├─ entities/
│  └─ player.js
├─ world/
│  ├─ world.js
│  ├─ mapGenerator.js
│  └─ collision.js
├─ rendering/
│  └─ renderer.js
├─ systems/
│  └─ progression.js
├─ game.js
└─ main.js
```

Các file cũ ở root được giữ dưới dạng compatibility export để không phá import cũ.

## 4. Gameplay flow mục tiêu

```text
Input
  ↓
Player movement / action intent
  ↓
Collision
  ↓
World state
  ↓
Gameplay systems
  ↓
NPC / resources / farming / progression
  ↓
Camera
  ↓
Renderer
  ↓
HUD / overlays
```

## 5. Game loop Phase 1

```text
requestAnimationFrame
  ↓
deltaTime clamp
  ↓
update(dt)
  ├─ input
  ├─ player
  ├─ time
  ├─ NPC
  ├─ world/gameplay
  └─ camera
  ↓
render()
  ↓
next frame
```

Gameplay không phụ thuộc FPS.

## 6. Danh sách phase toàn dự án

1. Core Engine.
2. Farming hoàn chỉnh.
3. Inventory + Economy.
4. Resource gathering.
5. Combat.
6. Town + NPC + Shop + Bank/ATM.
7. Dungeon + Boss.
8. Advanced Farming + Crafting + Building.
9. Seasons + Weather + Day/Night + Multiple Zones.
10. Animation + particles + lighting + sound + balancing + save polish.

## 7. Tiêu chí hoàn thành Phase 1

- Game vẫn khởi động từ `index.html -> main.js -> Game`.
- Game loop dùng module riêng và deltaTime.
- WASD/arrow + Shift tiếp tục hoạt động.
- Player không đi xuyên water/rock/building/tree và có collision với NPC.
- Camera có smoothing, dead-zone và clamp trong world.
- Map generator cũ được giữ để không phá world/save.
- Renderer được chuyển sang namespace `rendering/`.
- Farming/shop/quest/save hiện có không bị xóa.
