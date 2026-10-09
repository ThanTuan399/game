# RPG Expansion Roadmap

## Mục tiêu

Phát triển My Little Hometown từ farming/life-sim hiện tại thành **2D Pixel Art Farming RPG + Grinding RPG + Dungeon + Trading Simulation** mà vẫn giữ mọi gameplay đang chạy.

Nguyên tắc:

- Không thay hệ thống đang hoạt động bằng mock UI.
- Mỗi feature mới phải nối trọn chuỗi dữ liệu -> gameplay -> UI -> save.
- Không gắn gameplay vào FPS.
- Rendering không quyết định collision/game rules.
- LocalStorage tiếp tục là adapter save đầu tiên; kiến trúc phải mở cho cloud/backend sau này.

## Gameplay loop mục tiêu

```text
Farming
  -> Harvest
  -> Sell / Craft
  -> Gold + Materials
  -> Tool / Equipment upgrades
  -> Resource gathering
  -> Combat
  -> EXP + Loot
  -> Character / skill progression
  -> Unlock new zones
  -> Dungeon
  -> Boss
  -> Rare materials
  -> Farm / character expansion
  -> higher-tier loop
```

Vòng chơi hiện tại (farm -> sell/quest -> reputation -> town/home/tool upgrades) được giữ làm lớp progression kinh tế ban đầu, không bị xóa.

## Kiến trúc chuyển tiếp

```text
index.html
  -> js/main.js                 DOM/UI shell
  -> js/game.js                 gameplay coordinator
      |
      +-- core/
      |    +-- gameLoop.js      requestAnimationFrame + deltaTime
      |
      +-- world/
      |    +-- collision.js     tile/object/actor collision rules
      |
      +-- player.js
      +-- input.js
      +-- camera.js
      +-- world.js
      +-- mapGenerator.js
      +-- renderer.js
      +-- npc.js
      +-- save.js
      +-- systems/
           +-- progression.js
```

Không di chuyển hàng loạt file chỉ để giống sơ đồ đích. Các file được tách dần khi feature liên quan được phát triển, tránh làm hỏng save/import đang có.

## PHASE 1 — Core Engine

### Đã có trước refactor

- requestAnimationFrame.
- deltaTime có clamp.
- Player movement.
- Camera smoothing + world bounds.
- Procedural tile map.
- Static tile/object collision.
- Renderer tách khỏi gameplay update.
- Input module.
- LocalStorage save.
- Smoke test syntax/import/HTML ids.

### Củng cố trong nhánh này

- Tách `GameLoop` thành `js/core/gameLoop.js`.
- Delta-time loop có start/stop độc lập.
- Camera shake cũng dùng deltaTime thay vì cố định 1/60.
- Tách collision thành `js/world/collision.js`.
- Collision hỗ trợ tile, object và actor.
- Player không đi xuyên NPC/động vật.
- NPC/động vật bỏ qua chính mình khi kiểm tra va chạm.

### Tiêu chí hoàn thành PHASE 1

- New Game và Continue đều khởi động loop đúng.
- WASD/mũi tên di chuyển độc lập FPS.
- SHIFT chạy và stamina vẫn hoạt động.
- Camera follow mượt, không ra ngoài world.
- Không đi qua water/rock/tree/building/NPC/animal.
- Inventory/shop/farming/save cũ không bị phá.
- Smoke test pass.

## PHASE 2 — Farming

Tách farming rules khỏi `game.js/world.js` sang `systems/farmingSystem.js`, giữ tương thích save hiện tại.

- Hoe.
- Soil.
- Seed.
- Water/rain watering.
- Growth stages.
- Harvest.
- Crop level/season/rarity data.
- Chuỗi bắt buộc: mua hạt -> inventory -> gieo -> lớn -> thu hoạch -> inventory -> bán.

## PHASE 3 — Inventory + Economy

- Inventory grid + stack model.
- Buy/Sell quantity.
- Wallet + bank balance.
- Seed/General/Blacksmith/Potion shop data.
- Economy sinks: seed, tools, equipment, buildings.
- Save migration cho inventory model mới.

## PHASE 4 — Resources

- Tree/rock/ore resource entities.
- Respawn timers.
- Woodcutting/Mining skill XP.
- Copper/Iron/Silver/Gold/Mithril/Crystal tiers.

## PHASE 5 — Combat

- HP/MP/Attack/Defense/Crit.
- Basic attack, skill slots, dash, potion.
- Enemy state machine: idle/wander/detect/chase/attack/return/death.
- EXP/level/loot.
- Sword/Bow/Staff/Spear abstraction.

## PHASE 6 — Town

- Shop-role NPCs.
- Blacksmith.
- Bank + ATM.
- NPC schedule mở/đóng cửa hàng.
- Dialogue/interaction contract.

## PHASE 7 — Dungeon

- Dungeon zone loading.
- Rooms + encounters + chest.
- Mini boss + boss.
- Boss patterns, skills, phases.
- Rare materials + unlock gates.

## PHASE 8 — Advanced Farming

- Crafting.
- Furnace/workbench/cooking.
- Building placement.
- Barn/coop/storage/well/workshop/greenhouse.
- Animal foundation.

## PHASE 9 — World

- Multiple zones.
- Seasons/weather/day-night expanded.
- Zone unlock progression.
- World events.

## PHASE 10 — Polish

- Sprite-sheet pipeline.
- Character/tool/combat animation.
- Particles/lighting.
- Audio.
- Save migrations.
- Balance + performance.

## Quy tắc phát triển cho mỗi phase

1. Phân tích dependency trước khi sửa.
2. Liệt kê file tạo/sửa.
3. Không pseudo-code trong implementation.
4. Không để button/UI không có logic thật.
5. Mỗi system mới phải cập nhật save khi có state bền vững.
6. Chạy smoke test sau thay đổi.
7. Không merge nếu phá gameplay đã có.
