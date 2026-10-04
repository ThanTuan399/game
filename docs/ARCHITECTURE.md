# Kiến trúc My Little Hometown

## 1. Luồng chính

```text
index.html
   ↓
main.js  ─────────────── UI / menu / overlay
   ↓
Game (game.js)
   ├── Input
   ├── Player
   ├── World
   │    └── MapGenerator
   ├── NPC / Animals
   ├── Renderer
   ├── Save
   ├── Content registry
   └── EventBus
```

`Game` là orchestrator. Module khác không nên tự sửa DOM trực tiếp. UI đi qua object `ui` từ `main.js`.

## 2. Content registry

`js/content.js` là source of truth runtime cho:

- crop
- item
- tool
- shop stock
- quest

Khi thêm cây trồng mới, ưu tiên thêm metadata tại đây rồi để `World`/`Game` đọc metadata thay vì thêm `if/else` giá bán ở nhiều nơi.

Ví dụ:

```js
CROP_DEFS.tomato = {
  name: 'Cà chua',
  icon: '🍅',
  growDays: 5,
  sell: 16,
  seedItem: 'seed_tomato'
};
```

Sau đó thêm seed tương ứng vào `ITEM_DEFS`, `TOOL_DEFS` và `SHOP_STOCK` nếu muốn người chơi mua/gieo được.

## 3. EventBus

`js/events.js` giúp feature mới nghe sự kiện mà không sửa sâu vào core loop.

Các event hiện đã emit:

- `game:started`
- `game:saved`
- `day:started`
- `item:collected`
- `money:changed`
- `crop:harvested`
- `fish:caught`
- `npc:interacted`
- `quest:completed`
- `exploration:discovered`

Ví dụ achievement system tương lai:

```js
game.events.on('fish:caught', ({ itemId }) => {
  // tăng tiến độ achievement câu cá
});
```

## 4. Save

Save hiện là schema v4:

```text
version
savedAt
town
state
  ├── player
  ├── inventory
  ├── farm
  ├── resources
  ├── animals
  ├── npcs
  ├── discovered
  └── map
```

`save.js` có migration từ key v3. Khi đổi schema sau này, không ghi đè logic cũ một cách phá save; hãy thêm migration theo version.

## 5. Quy tắc mở rộng gameplay

- `main.js`: chỉ UI/bootstrap.
- `game.js`: điều phối gameplay, input action, progression/economy.
- `world.js`: state và thao tác lên thế giới/tile/object.
- `renderer.js`: chỉ render, tránh nhét rule gameplay vào đây.
- `content.js`: dữ liệu cân bằng và metadata.
- `npc.js`: AI/lịch/hội thoại NPC.
- `save.js`: persistence/migration.

Nếu một feature lớn lên đáng kể, tách thành `js/systems/<feature>.js` thay vì làm `game.js` phình quá lớn.

## 6. Các system nên tách tiếp

Khi phát triển tiếp, cấu trúc mục tiêu có thể là:

```text
js/systems/
├── farming.js
├── economy.js
├── quests.js
├── relationships.js
├── crafting.js
├── housing.js
├── festivals.js
└── achievements.js
```

Không cần tách sớm nếu logic còn ngắn; chỉ tách khi module có state/rule độc lập rõ ràng.

## 7. Backend trong tương lai

Game hiện offline-first. Nếu thêm backend, giữ LocalStorage làm cache/offline save và thêm adapter:

```text
SaveService
├── LocalSaveAdapter
└── CloudSaveAdapter
```

Như vậy gameplay không cần phụ thuộc trực tiếp vào API.
