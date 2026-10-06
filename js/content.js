export const CROP_DEFS = {
  rice: { name: 'Lúa', icon: '🌾', growDays: 4, sell: 10, seedItem: 'seed_rice', seasons: ['Xuân', 'Hạ'] },
  corn: { name: 'Ngô', icon: '🌽', growDays: 5, sell: 14, seedItem: 'seed_corn', seasons: ['Xuân', 'Hạ', 'Thu'] },
  carrot: { name: 'Cà rốt', icon: '🥕', growDays: 4, sell: 16, seedItem: 'seed_carrot', seasons: ['Xuân', 'Thu', 'Đông'] },
  pumpkin: { name: 'Bí đỏ', icon: '🎃', growDays: 7, sell: 32, seedItem: 'seed_pumpkin', seasons: ['Thu'] }
};

export const ITEM_DEFS = {
  seed_rice: { name: 'Hạt lúa', icon: '🌾', buy: 8, category: 'seed', unlockLevel: 1 },
  seed_corn: { name: 'Hạt ngô', icon: '🌽', buy: 12, category: 'seed', unlockLevel: 1 },
  seed_carrot: { name: 'Hạt cà rốt', icon: '🥕', buy: 15, category: 'seed', unlockLevel: 2 },
  seed_pumpkin: { name: 'Hạt bí đỏ', icon: '🎃', buy: 24, category: 'seed', unlockLevel: 3 },
  fertilizer: { name: 'Phân bón', icon: '✨', buy: 20, category: 'farm', unlockLevel: 2 },

  wood: { name: 'Gỗ', icon: '🪵', sell: 5, category: 'resource' },
  woodHard: { name: 'Gỗ cứng', icon: '🪵', sell: 12, category: 'resource' },
  stone: { name: 'Đá', icon: '🪨', sell: 4, category: 'resource' },
  gem: { name: 'Đá quý', icon: '💎', sell: 140, category: 'resource' },

  fish: { name: 'Cá', icon: '🐟', sell: 16, category: 'fish' },
  carp: { name: 'Cá chép', icon: '🐟', sell: 22, category: 'fish' },
  rareFish: { name: 'Cá hiếm', icon: '🐠', sell: 100, category: 'fish' },
  shrimp: { name: 'Tôm', icon: '🦐', sell: 18, category: 'fish' },
  crab: { name: 'Cua', icon: '🦀', sell: 24, category: 'fish' },
  shell: { name: 'Vỏ sò', icon: '🐚', sell: 10, category: 'resource' },
  rareSeed: { name: 'Hạt giống cổ', icon: '🌟', sell: 80, category: 'special' },

  crop_rice: { name: 'Lúa', icon: '🌾', sell: 10, category: 'crop' },
  crop_corn: { name: 'Ngô', icon: '🌽', sell: 14, category: 'crop' },
  crop_carrot: { name: 'Cà rốt', icon: '🥕', sell: 16, category: 'crop' },
  crop_pumpkin: { name: 'Bí đỏ', icon: '🎃', sell: 32, category: 'crop' }
};

export const TOOL_DEFS = [
  { id: 'hand', icon: '🤲', name: 'Tay', hotkey: null },
  { id: 'hoe', icon: '⛏', name: 'Cuốc', hotkey: '1' },
  { id: 'seed_rice', icon: '🌾', name: 'Gieo lúa', hotkey: '2' },
  { id: 'seed_corn', icon: '🌽', name: 'Gieo ngô', hotkey: '3' },
  { id: 'seed_carrot', icon: '🥕', name: 'Gieo cà rốt', hotkey: '4' },
  { id: 'seed_pumpkin', icon: '🎃', name: 'Gieo bí đỏ', hotkey: '5' },
  { id: 'water', icon: '💧', name: 'Tưới', hotkey: '6' },
  { id: 'harvest', icon: '🧺', name: 'Thu hoạch', hotkey: '7' },
  { id: 'axe', icon: '🪓', name: 'Rìu', hotkey: '8' },
  { id: 'pickaxe', icon: '⛏️', name: 'Cuốc đá', hotkey: '9' },
  { id: 'fishing', icon: '🎣', name: 'Câu cá', hotkey: '0' },
  { id: 'fertilizer', icon: '✨', name: 'Bón phân', hotkey: null }
];

export const QUEST_DEFS = [
  { id: 'harvest_rice', name: 'Mẻ lúa đầu tiên', item: 'crop_rice', amount: 3, reward: 90, reputation: 12, text: 'Thu hoạch 3 bó lúa cho trưởng thị trấn.' },
  { id: 'collect_wood', name: 'Sửa hàng rào', item: 'wood', amount: 10, reward: 100, reputation: 12, text: 'Mang 10 gỗ tới tòa thị trấn.' },
  { id: 'catch_fish', name: 'Bữa tối ven sông', item: 'fish', amount: 2, reward: 110, reputation: 14, text: 'Mang 2 con cá tươi tới quán.' },
  { id: 'collect_stone', name: 'Con đường mới', item: 'stone', amount: 8, reward: 130, reputation: 16, text: 'Thu thập 8 đá để sửa con đường chính.' },
  { id: 'harvest_corn', name: 'Phiên chợ ngô', item: 'crop_corn', amount: 5, reward: 160, reputation: 18, text: 'Chuẩn bị 5 bắp ngô cho phiên chợ.' },
  { id: 'harvest_carrot', name: 'Bếp ăn cộng đồng', item: 'crop_carrot', amount: 4, reward: 180, reputation: 20, text: 'Giao 4 cà rốt cho bếp ăn thị trấn.' },
  { id: 'hardwood', name: 'Xưởng mộc', item: 'woodHard', amount: 4, reward: 220, reputation: 24, text: 'Tìm 4 gỗ cứng cho xưởng mộc.' },
  { id: 'rare_fish', name: 'Huyền thoại bến nước', item: 'rareFish', amount: 1, reward: 300, reputation: 30, text: 'Câu được 1 cá hiếm và mang về tòa thị trấn.' }
];

export function getCropDef(id) {
  return CROP_DEFS[id] || null;
}

export function getItemMeta(id) {
  if (ITEM_DEFS[id]) return { id, ...ITEM_DEFS[id] };
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

export function isCropInSeason(cropId, season) {
  const crop = getCropDef(cropId);
  return !!crop && crop.seasons.includes(season);
}

export function getShopStock(season, townLevel = 1) {
  return Object.keys(ITEM_DEFS).filter(id => {
    const item = ITEM_DEFS[id];
    if (!item.buy || (item.unlockLevel || 1) > townLevel) return false;
    if (!id.startsWith('seed_')) return true;
    return isCropInSeason(id.replace('seed_', ''), season);
  });
}
