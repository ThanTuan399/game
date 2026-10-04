import { clamp } from './utils.js';

function npcIndex(npc) {
  const value = Number(String(npc.id || '').split('-').pop());
  return Number.isFinite(value) ? value : 0;
}

function homeTarget(world, npc) {
  const i = npcIndex(npc);
  const cx = Math.floor(world.width / 2);
  const cy = Math.floor(world.height / 2);
  return {
    x: cx - 16 + (i % 6) * 5,
    y: cy + 8 + Math.floor(i / 6) * 5
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

  const i = npcIndex(npc);
  return {
    x: cx - 10 + (i % 5) * 5 + Math.sin(world.state.timeMinutes * 0.008 + i) * 1.5,
    y: cy - 1 + Math.floor(i / 5) * 7 + Math.cos(world.state.timeMinutes * 0.007 + i) * 1.2
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

    if (world.canWalk(nextX, npc.y)) npc.x = nextX;
    if (world.canWalk(npc.x, nextY)) npc.y = nextY;
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
      'Tôi đang làm một chiếc cầu gỗ cho thị trấn.',
      'Muốn nâng cấp nhà thì mang gỗ và đá tới cho tôi.'
    ],
    warm: ['Chợ hôm nay có hàng mới.', 'Mua hạt giống sớm thì dễ xoay vòng vụ mùa hơn đấy.'],
    quiet: ['... Nghe kìa. Con cá vừa quẫy đuôi dưới nước.', 'Đi câu lúc trời dịu rất thích.'],
    playful: ['Tớ thấy đom đóm ở phía rừng tối qua!', 'Sau này cậu xây một căn nhà thật to nhé!'],
    energetic: ['Có thư mới cho cậu!', 'Tôi chạy cả thị trấn mà vẫn còn sức đây!'],
    sweet: ['Hoa mùa này đẹp nhất lúc hoàng hôn.', 'Tặng cậu một nhành nhé 🌼'],
    leader: [
      `Chào mừng tới ${world.town.name}. Hãy biến nơi này thành quê hương của bạn!`,
      `Seed ${world.town.seed} đã tạo nên một thế giới rất riêng.`
    ]
  };

  const result = [...(lines[npc.personality] || lines.friendly)];
  if (friendship >= 25) result.push(`${npc.name}: Gặp cậu mỗi ngày khiến thị trấn này vui hơn đấy.`);
  if (friendship >= 60) result.push(`${npc.name}: Nếu cần giúp đỡ, cứ tìm tôi. Chúng ta là bạn mà.`);
  return result;
}

export function interactNPC(npc, world) {
  npc.friendship = clamp((npc.friendship || 0) + 2, 0, 100);
  return npcDialogue(npc, world);
}

export function updateAnimals(world, dt) {
  for (const animal of world.animals || []) {
    animal.step = (animal.step || 0) + dt;
    if (animal.step <= 3) continue;
    animal.step = 0;

    const seed = animal.id.length + world.state.day + Math.floor(animal.x * 2) + Math.floor(animal.y * 3);
    const angle = seed % 6.28;
    const dx = Math.cos(angle) * 0.35;
    const dy = Math.sin(angle) * 0.35;
    if (world.canWalk(animal.x + dx, animal.y + dy)) {
      animal.x += dx;
      animal.y += dy;
    }
  }
}
