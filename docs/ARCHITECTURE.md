# Kiến trúc My Little Hometown — Full Playable v1

## Luồng chính

```text
index.html
  → main.js (UI/overlay)
  → Game
      ├─ Input / Player
      ├─ World / MapGenerator
      ├─ NPC / Animals
      ├─ Renderer
      ├─ Content registry
      ├─ Progression
      ├─ EventBus
      └─ Save
```

`game.js` điều phối gameplay. `renderer.js` chỉ render. `main.js` quản lý DOM.

## Chuỗi logic

```text
Input → Game.handleActions → World mutation
      → Inventory/Stats → EventBus
      → Daily goals/Achievement/Reputation
      → Unlock/Upgrade → Save → Renderer
```

Ngày mới:

```text
Ngủ hoặc quá 24:00
 → day++
 → season/weather
 → crop growth
 → hồi energy/stamina
 → về nhà
 → tạo daily goals
 → market modifier
 → autosave
```

## Progression

- Cấp 1: 0 reputation
- Cấp 2: 40
- Cấp 3: 100
- Cấp 4: 220
- Cấp 5: 400

Mục tiêu chính: cấp 5 + 8 quest + nhà cấp 2.

## Save v5

State lưu player, inventory, farm, resources, animals, NPC, discovered, quest, daily goals, reputation, town level, tool levels, home level, stats, achievements, story và map.

Migration hỗ trợ save v3/v4.

## Backend tương lai

Core game offline-first. Nếu thêm backend, dùng adapter thay vì gọi API trực tiếp từ gameplay:

```text
SaveService
├─ LocalSaveAdapter
└─ CloudSaveAdapter
```

## Mở rộng system

Feature lớn nên tách dưới `js/systems/`, ví dụ crafting, relationships, festivals, housing, achievements.

## CI

`npm test` kiểm tra syntax JS, import nội bộ, HTML id và encoding. GitHub Actions chạy smoke test trên pull request và main.
