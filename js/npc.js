import { clamp } from './utils.js';

function npcIndex(npc) {
  const value = Number(String(npc.id || '').split('-').pop());
  return Number.isFinite(value) ? value : 0;
}

function homeTarget(world, npc) {
  const index = npcIndex(npc);
  const cx = Math.floor(world.width / 2);
  const cy = Math.floor(world.height / 2);

  return {
    x: cx - 16 + (index % 6) * 5,
    y: cy + 8 + Math.floor(index / 6) * 5
  };
}

function scheduleTarget(world, npc) {
  const hour = (world.state.timeMinutes / 60) % 24;
  const cx = Math.floor(world.width / 2);
  const cy = Math.floor(world.height / 2);

  if (hour >= 20 || hour < 6) return homeTarget(world, npc);
  if (npc.job === 'người bán hạt giống' || npc.job === 'bán hàng') return { x: cx + 8, y: cy - 4 };
  if (npc.job === 'người câu cá') return { x: cx + 7, y: world.height - 13 };
  if (npc.job === 'trưởng thị trấn') return { x: cx, y: cy - 5 };
  if (npc.job === 'chủ quán') return { x: cx - 10, y: cy - 3 };
  if (npc.job === 'thợ mộc') return { x: cx + 11, y: cy + 8 };

  const index = npcIndex(npc);
  return {
    x: cx - 10 + (index % 5) * 5 + Math.sin(world.state.timeMinutes * 0.008 + index) * 1.5,
    y: cy - 1 + Math.floor(index / 5) * 7 + Math.cos(world.state.timeMinutes * 0.007 + index) * 1.2
  };
}

export function updateNPCs(world, dt) {
  for (const npc of world.npcs) {
    const target = scheduleTarget(world, npc);
    let dx = target.x - npc.x;
    let dy = target.y - npc.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0.2) continue;

    dx /= distance;
    dy /= distance;

    const speed = 0.45;
    const nextX = npc.x + dx * dt * speed;
    const nextY = npc.y + dy * dt * speed;

    if (world.canWalk(nextX, npc.y, { ignoreEntityId: npc.id })) npc.x = nextX;
    if (world.canWalk(npc.x, nextY, { ignoreEntityId: npc.id })) npc.y = nextY;

    npc.dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');

    npc.step = (npc.step + dt * 5) % 4;
  }
}

export function npcDialogue(npc, world) {
  const season = world.state.season;
  const friendship = npc.friendship || 0;

  const lines = {
    friendly: [
      `Chào ${world.state.playerName}! Hôm nay ở ${world.town.name} đẹp thật đó.`,
      `Mùa ${season} năm nay cây trồng phát triển nhanh lắm!`
    ],
    wise: [
      'Sống chậm một chút, nghe tiếng gió qua đồng là đủ vui rồi.',
      'Đừng quên tưới ruộng trước khi mặt trời xuống nhé.'
    ],
    cheerful: [
      'Quán hôm nay có bánh bí đỏ mới ra lò!',
      'Khi trời mưa, cá dưới sông thường cắn câu rất hăng.'
    ],
    calm: [
      'Xưởng của tôi ở gần kho nông trại. Mang gỗ, đá và tiền tới nếu muốn nâng cấp công cụ.',
      'Công cụ tốt hơn giúp bạn đỡ tốn thể lực và tìm tài nguyên tốt hơn.'
    ],
    warm: [
      'Chợ mở cửa từ 08:00 đến 19:00.',
      'Hàng hóa mới sẽ xuất hiện khi danh tiếng của thị trấn tăng lên.'
    ],
    quiet: [
      '... Nghe kìa. Con cá vừa quẫy đuôi dưới nước.',
      'Cần câu tốt sẽ có cơ hội gặp cá hiếm cao hơn.'
    ],
    playful: [
      'Tớ thấy đom đóm ở phía rừng tối qua!',
      'Cậu đã tìm hết những chỗ bí mật quanh thị trấn chưa?'
    ],
    energetic: [
      'Tôi chạy cả thị trấn mà vẫn còn sức đây!',
      'Nhớ xem Sổ tay mỗi ngày nhé, có mục tiêu nhỏ để kiếm thêm tiền.'
    ],
    sweet: [
      'Hoa mùa này đẹp nhất lúc hoàng hôn.',
      'Quê hương đẹp lên từng ngày khi mọi người cùng chăm sóc nó.'
    ],
    leader: [
      `Chào mừng tới ${world.town.name}. Hãy giúp nơi này trở nên nhộn nhịp hơn!`,
      'Hoàn thành nhiệm vụ, giúp dân làng và nâng cấp nhà để tăng danh tiếng thị trấn.'
    ]
  };

  const result = [...(lines[npc.personality] || lines.friendly)];

  if (friendship >= 20) {
    result.push(`${npc.name}: Dạo này tôi thấy cậu quen thuộc như một người trong làng rồi.`);
  }

  if (friendship >= 50) {
    result.push(`${npc.name}: Cảm ơn vì đã luôn ghé qua. ${world.town.name} thay đổi nhiều thật.`);
  }

  return result;
}

export function interactNPC(npc, world) {
  if (npc.lastFriendshipDay !== world.state.day) {
    npc.friendship = clamp((npc.friendship || 0) + 2, 0, 100);
    npc.lastFriendshipDay = world.state.day;
  }

  return npcDialogue(npc, world);
}

export function updateAnimals(world, dt) {
  for (const animal of world.animals || []) {
    animal.step = (animal.step || 0) + dt;

    if (animal.step <= 3) continue;

    animal.step = 0;

    const seed = animal.id.length
      + world.state.day
      + Math.floor(animal.x * 2)
      + Math.floor(animal.y * 3);

    const angle = seed % 6.28;
    const dx = Math.cos(angle) * 0.35;
    const dy = Math.sin(angle) * 0.35;

    if (world.canWalk(animal.x + dx, animal.y + dy, { ignoreEntityId: animal.id })) {
      animal.x += dx;
      animal.y += dy;
    }
  }
}
