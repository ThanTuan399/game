# 🌾 My Little Hometown

**My Little Hometown** là game web 2D top-down mô phỏng cuộc sống/nông trại chạy trực tiếp trên trình duyệt bằng **HTML5 + CSS3 + JavaScript ES Modules + Canvas 2D + LocalStorage**.

Bản **Full Playable v1** không chỉ là giao diện. Nó có vòng chơi hoàn chỉnh, progression dài hạn, mục tiêu chính có thể hoàn thành và chế độ chơi tự do sau đoạn kết.

## Chuỗi chơi hoàn chỉnh

```text
Tạo quê hương
  → làm nông / câu cá / khai thác / trò chuyện
  → kiếm vật phẩm + mục tiêu ngày
  → bán hàng / làm nhiệm vụ
  → tiền + danh tiếng
  → nâng công cụ + nhà
  → mở khóa hàng hóa
  → ngủ sang ngày mới
  → mùa / thời tiết / giá chợ thay đổi
  → đưa thị trấn lên cấp 5
  → hoàn thành mục tiêu chính
  → free-play
```

## Gameplay hiện có

- Map procedural theo seed và biome.
- Nông trại: cuốc → gieo → tưới/bón phân → ngủ → tăng trưởng → thu hoạch.
- Mùa giới hạn cây có thể gieo.
- Energy làm việc và stamina chạy tách riêng.
- Ngủ tại nhà để sang ngày mới; quá nửa đêm sẽ tự được đưa về nhà.
- Chợ có giờ mở cửa, stock mở theo cấp thị trấn và bonus giá theo ngày hội.
- Câu cá, chặt cây, khai thác đá.
- Xưởng nâng cấp cuốc, bình tưới, rìu, cuốc đá, cần câu tới cấp 3.
- Nhà nâng cấp tới cấp 3 và tăng energy tối đa.
- NPC có nghề, lịch di chuyển, hội thoại và friendship theo ngày.
- Chuỗi 8 nhiệm vụ chính, 2 mục tiêu ngẫu nhiên mỗi ngày.
- Danh tiếng và 5 cấp phát triển thị trấn.
- Thành tựu có thưởng.
- Khám phá hang, miếu, hải đăng, bến thuyền.
- Save/Continue, autosave, migration save cũ.
- Sổ tay phím J hiển thị quest, daily goals, stats, achievement và tiến trình cốt truyện.

## Mục tiêu chính

Hoàn thành một lượt chơi khi:

1. Thị trấn đạt **cấp 5**.
2. Hoàn thành ít nhất **8 nhiệm vụ**.
3. Nhà đạt ít nhất **cấp 2**.

Sau đó game mở đoạn kết và chuyển sang free-play, không xóa save.

## Điều khiển

| Phím | Chức năng |
|---|---|
| WASD / mũi tên | Di chuyển |
| SHIFT | Chạy |
| 1–0 | Chọn công cụ |
| SPACE / ENTER | Dùng công cụ vào ô phía trước |
| E | Tương tác |
| I | Túi đồ |
| M | Bản đồ |
| J | Sổ tay |
| Q | Nhiệm vụ |
| F | Lưu |
| ESC | Đóng cửa sổ / về menu |

## Chạy game

Không mở bằng `file:///...`. Dùng Live Server hoặc:

```bash
python -m http.server 5500
```

Sau đó mở `http://localhost:5500`.

Kiểm tra project:

```bash
npm test
```

Smoke test không cần package ngoài.

## Backend

Backend **không bắt buộc** cho bản single-player. Luật game, world state, progression và save chạy client-side; đó là game logic chứ không chỉ là UI.

Backend chỉ cần khi muốn thêm account, cloud save, leaderboard, marketplace, co-op/multiplayer hoặc anti-cheat.

## Hướng sau v1

1. Sprite sheet + animation asset pipeline.
2. Crafting và placement vật thể.
3. Relationship event/gift/story riêng cho NPC.
4. Fishing/mining minigame.
5. Interior nhà/cửa hàng.
6. Data-driven content hoàn chỉnh.
7. Nhiều save slot.
8. Backend account/cloud save.
9. Co-op nếu muốn chuyển sang online.
