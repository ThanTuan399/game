export const CROP_DEFS = {
  rice: { name: 'Lúa', icon: '🌾', growDays: 5, sell: 8, seedItem: 'seed_rice' },
  corn: { name: 'Ngô', icon: '🌽', growDays: 5, sell: 10, seedItem: 'seed_corn' },
  carrot: { name: 'Cà rốt', icon: '🥕', growDays: 4, sell: 12, seedItem: 'seed_carrot' },
  pumpkin: { name: 'Bí đỏ', icon: '🎃', growDays: 7, sell: 25, seedItem: 'seed_pumpkin' },
  mango: { name: 'Xoài', icon: '🥭', growDays: 6, sell: 20 },
  coconut: { name: 'Dừa', icon: '🥥', growDays: 7, sell: 18 },
  dragonfruit: { name: 'Thanh long', icon: '🐉', growDays: 8, sell: 28 },
  tea: { name: 'Trà', icon: '🍃', growDays: 6, sell: 22 },
  apple: { name: 'Táo', icon: '🍎', growDays: 6, sell: 18 },
  plum: { name: 'Mận', icon: '🟣', growDays: 6, sell: 19 },
  potato: { name: 'Khoai', icon: '🥔', growDays: 5, sell: 13 },
  vegetable: { name: 'Rau', icon: '🥬', growDays: 4, sell: 11 }
};

export const ITEM_DEFS = {
  seed_rice: { name: 'Hạt lúa', icon: '🌾', buy: 12, category: 'seed' },
  seed_corn: { name: 'Hạt ngô', icon: '🌽', buy: 14, category: 'seed' },
  seed_carrot: { name: 'Hạt cà rốt', icon: '🥕', buy: 16, category: 'seed' },
  seed_pumpkin: { name: 'Hạt bí đỏ', icon: '🎃', buy: 28, category: 'seed' },
  fertilizer: { name: 'Phân bón', icon: '✨', buy: 18, category: 'farm' },
  wood: { name: 'Gỗ', icon: '🪵', sell: 4, category: 'resource' },
  woodHard: { name: 'Gỗ cứng', icon: '🪵', sell: 9, category: 'resource' },
  stone: { name: 'Đá', icon: '🪨', sell: 3, category: 'resource' },
  gem: { name: 'Đá quý', icon: '💎', sell: 120, category: 'resource' },
  fish: { name: 'Cá', icon: '🐟', sell: 14, category: 'fish' },
  carp: { name: 'Cá chép', icon: '🐟', sell: 18, category: 'fish' },
  rareFish: { name: 'Cá hiếm', icon: '🐠', sell: 90, category: 'fish' },
  shrimp: { name: 'Tôm', icon: '🦐', sell: 13, category: 'fish' },
  crab: { name: 'Cua', icon: '🦀', sell: 18, category: 'fish' },
  shell: { name: 'Vỏ sò', icon: '🐚', sell: 8, category: 'resource' },
  rareSeed: { name: 'Hạt giống hiếm', icon: '🌟', sell: 55, category: 'special' }
};

export const TOOL_DEFS = [
  { id: 'hand', icon: '🤲', name: 'Tay', hotkey: null },
  { id: 'hoe', icon: '⛏', name: 'Cuốc', hotkey: '1' },
  { id: 'seed_rice', icon: '🌾', name: 'Gieo lúa', hotkey: '2' },
  { id: 'seed_corn', icon: '🌽', name: 'Gieo ngô', hotkey: '3' },
  { id: 'seed_carrot', icon: '🥕', name: 'Gieo cà rốt', hotkey: '4' },
  { id: 'seed_pumpkin', icon: '🎃', name: 'Gieo bí đỏ', hotkey: '5' },
  { id: 'water', icon: '💧', name: 'Tưới', hotkey: '6' },
  { id: 'fertilizer', icon: '✨', name: 'Bón phân', hotkey: null },
  { id: 'harvest', icon: '🧺', name: 'Thu hoạch', hotkey: '7' },
  { id: 'axe', icon: '🪓', name: 'Rìu', hotkey: '8' },
  { id: 'pickaxe', icon: '⛏️', name: 'Cuốc đá', hotkey: '9' },
  { id: 'fishing', icon: '🎣', name: 'Câu cá', hotkey: '0' }
];

export const SHOP_STOCK = ['seed_rice', 'seed_corn', 'seed_carrot', 'seed_pumpkin', 'fertilizer'];

export const QUEST_DEFS = [
  {
    id: 'harvest_rice',
    name: 'Mẻ lúa đầu tiên',
    item: 'crop_rice',
    amount: 3,
    reward: 80,
    text: 'Thu hoạch 3 bó lúa cho trưởng thị trấn.'
  },
  {
    id: 'collect_wood',
    name: 'Sửa hàng rào',
    item: 'wood',
    amount: 10,
    reward: 65,
    text: 'Giao 10 gỗ cho thợ mộc.'
  },
  {
    id: 'catch_fish',
    name: 'Bữa tối ven sông',
    item: 'fish',
    amount: 2,
    reward: 70,
    text: 'Mang 2 con cá tươi đến quán.'
  }
];

export function getCropDef(id) {
  return CROP_DEFS[id] || null;
}

export function getItemMeta(id) {
  if (ITEM_DEFS[id]) return { id, ...ITEM_DEFS[id] };
  if (id.startsWith('crop_')) {
    const cropId = id.slice(5);
    const crop = CROP_DEFS[cropId];
    if (crop) return { id, name: crop.name, icon: crop.icon, sell: crop.sell, category: 'crop' };
  }
  return { id, name: id, icon: '📦', sell: 0, buy: 0, category: 'misc' };
}

export function getSellPrice(id) {
  return Number(getItemMeta(id).sell || 0);
}

export function getBuyPrice(id) {
  return Number(getItemMeta(id).buy || 0);
}

export function getQuest(id) {
  return QUEST_DEFS.find(q => q.id === id) || QUEST_DEFS[0];
}

export function nextQuestId(currentId) {
  const index = QUEST_DEFS.findIndex(q => q.id === currentId);
  return QUEST_DEFS[(index + 1 + QUEST_DEFS.length) % QUEST_DEFS.length].id;
}
