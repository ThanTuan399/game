import { hashSeed, mulberry32 } from '../utils.js';

export const TOWN_LEVELS = [
  { level: 1, min: 0, title: 'Người mới đến' },
  { level: 2, min: 40, title: 'Người quen của thị trấn' },
  { level: 3, min: 100, title: 'Người xây dựng quê hương' },
  { level: 4, min: 220, title: 'Trụ cột cộng đồng' },
  { level: 5, min: 400, title: 'Niềm tự hào của quê hương' }
];

const DAILY_TEMPLATES = [
  { id: 'harvest', label: 'Thu hoạch nông sản', action: 'harvest', target: 3, reward: 45, reputation: 5 },
  { id: 'fish', label: 'Câu cá', action: 'fish', target: 2, reward: 50, reputation: 5 },
  { id: 'wood', label: 'Chặt cây lấy gỗ', action: 'wood', target: 2, reward: 40, reputation: 4 },
  { id: 'mine', label: 'Khai thác đá', action: 'mine', target: 2, reward: 40, reputation: 4 },
  { id: 'talk', label: 'Trò chuyện với dân làng', action: 'talk', target: 3, reward: 35, reputation: 4 }
];

const ACHIEVEMENTS = [
  { id: 'farmer_10', label: 'Nông dân tập sự', test: s => s.stats.harvested >= 10, reward: 100, reputation: 10 },
  { id: 'angler_10', label: 'Tay câu làng', test: s => s.stats.fishCaught >= 10, reward: 120, reputation: 10 },
  { id: 'worker_20', label: 'Đôi tay lao động', test: s => s.stats.treesCut + s.stats.rocksMined >= 20, reward: 140, reputation: 12 },
  { id: 'quest_5', label: 'Người đáng tin', test: s => s.stats.questsCompleted >= 5, reward: 180, reputation: 15 },
  { id: 'explorer_4', label: 'Người khám phá', test: s => (s.discovered || []).length >= 4, reward: 220, reputation: 18 },
  { id: 'wealth_5000', label: 'Nhà làm ăn giỏi', test: s => s.money >= 5000, reward: 300, reputation: 20 }
];

export function ensureProgression(state) {
  state.reputation ??= 0;
  state.townLevel ??= 1;
  state.homeLevel ??= 1;
  state.toolLevels = {
    hoe: 1,
    water: 1,
    axe: 1,
    pickaxe: 1,
    fishing: 1,
    ...(state.toolLevels || {})
  };
  state.stats = {
    harvested: 0,
    fishCaught: 0,
    treesCut: 0,
    rocksMined: 0,
    questsCompleted: 0,
    daysPlayed: 0,
    moneyEarned: 0,
    ...(state.stats || {})
  };
  state.achievements ||= [];
  state.story = { completed: false, finaleShown: false, ...(state.story || {}) };
  ensureDailyGoals(state, state.worldSeed || '0');
  refreshTownLevel(state);
  return state;
}

export function refreshTownLevel(state) {
  let info = TOWN_LEVELS[0];
  for (const candidate of TOWN_LEVELS) {
    if ((state.reputation || 0) >= candidate.min) info = candidate;
  }
  const old = state.townLevel || 1;
  state.townLevel = info.level;
  return { ...info, leveledUp: state.townLevel > old };
}

export function addReputation(state, amount) {
  state.reputation = Math.max(0, (state.reputation || 0) + amount);
  return refreshTownLevel(state);
}

export function currentTownLevel(state) {
  return TOWN_LEVELS.find(x => x.level === state.townLevel) || TOWN_LEVELS[0];
}

export function nextTownLevel(state) {
  return TOWN_LEVELS.find(x => x.level === (state.townLevel || 1) + 1) || null;
}

export function ensureDailyGoals(state, seed) {
  if (state.dailyGoals?.day === state.day) return state.dailyGoals;
  const rng = mulberry32(hashSeed(String(seed) + '-' + state.day + '-daily'));
  const pool = [...DAILY_TEMPLATES];
  const goals = [];
  while (goals.length < 2 && pool.length) {
    const index = Math.floor(rng() * pool.length);
    const template = pool.splice(index, 1)[0];
    goals.push({ ...template, progress: 0, claimed: false });
  }
  state.dailyGoals = { day: state.day, goals };
  return state.dailyGoals;
}

export function progressDailyGoals(state, action, amount = 1) {
  const completed = [];
  for (const goal of state.dailyGoals?.goals || []) {
    if (goal.claimed || goal.action !== action) continue;
    goal.progress = Math.min(goal.target, (goal.progress || 0) + amount);
    if (goal.progress >= goal.target) {
      goal.claimed = true;
      completed.push(goal);
    }
  }
  return completed;
}

export function checkAchievements(state) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (state.achievements.includes(achievement.id)) continue;
    if (!achievement.test(state)) continue;
    state.achievements.push(achievement.id);
    unlocked.push(achievement);
  }
  return unlocked;
}

export function getToolUpgradeCost(currentLevel) {
  if (currentLevel >= 3) return null;
  return currentLevel === 1
    ? { money: 250, wood: 12, stone: 8 }
    : { money: 650, wood: 25, stone: 20, gem: 1 };
}

export function getHomeUpgradeCost(currentLevel) {
  if (currentLevel >= 3) return null;
  return currentLevel === 1
    ? { money: 900, wood: 40, stone: 25 }
    : { money: 2200, wood: 80, stone: 60, gem: 3 };
}

export function canAfford(state, cost) {
  if (!cost || state.money < (cost.money || 0)) return false;
  return Object.entries(cost).every(([key, value]) => key === 'money' || (state.inventory[key] || 0) >= value);
}

export function payCost(state, cost) {
  if (!canAfford(state, cost)) return false;
  state.money -= cost.money || 0;
  for (const [key, value] of Object.entries(cost)) {
    if (key !== 'money') state.inventory[key] -= value;
  }
  return true;
}

export function formatCost(cost) {
  if (!cost) return 'Tối đa';
  const labels = { money: '💰', wood: '🪵', stone: '🪨', gem: '💎' };
  return Object.entries(cost).map(([key, value]) => `${labels[key] || key} ${value}`).join(' · ');
}
