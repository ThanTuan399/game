import { Player } from './player.js';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { World, SEASONS } from './world.js';
import { Renderer } from './renderer.js';
import { drawLighting } from './lighting.js';
import { updateNPCs, interactNPC, updateAnimals } from './npc.js';
import { saveGame } from './save.js';
import { mulberry32, hashSeed, fmtTime } from './utils.js';
import {
  TOOL_DEFS,
  getItemMeta,
  getQuest,
  getSellPrice,
  getShopStock,
  isCropInSeason,
  nextQuestId
} from './content.js';
import { EventBus } from './events.js';
import {
  addReputation,
  canAfford,
  checkAchievements,
  currentTownLevel,
  ensureDailyGoals,
  ensureProgression,
  formatCost,
  getHomeUpgradeCost,
  getToolUpgradeCost,
  nextTownLevel,
  payCost,
  progressDailyGoals
} from './systems/progression.js';

const STARTING_INVENTORY = {
  seed_rice: 6,
  seed_corn: 4,
  seed_carrot: 0,
  seed_pumpkin: 0,
  fertilizer: 0,
  fish: 0,
  carp: 0,
  shrimp: 0,
  crab: 0,
  rareFish: 0,
  wood: 4,
  woodHard: 0,
  stone: 2,
  gem: 0,
  shell: 0,
  rareSeed: 0,
  crop_rice: 0,
  crop_corn: 0,
  crop_carrot: 0,
  crop_pumpkin: 0
};

const TOOL_ENERGY = {
  hoe: 3,
  seed: 1,
  water: 2,
  fertilizer: 1,
  harvest: 1,
  axe: 5,
  pickaxe: 5,
  fishing: 4
};

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.camera = new Camera();
    this.events = new EventBus();

    this.running = false;
    this.last = 0;
    this.effects = [];
    this.activeTool = 'hand';
    this.autosaveElapsed = 0;
    this.audioContext = null;
    this.shakeTime = 0;

    this.sound = localStorage.getItem('mlh_sound') !== '0';
    this.shake = localStorage.getItem('mlh_shake') !== '0';

    this.ui.toolButtons.forEach(button => {
      button.addEventListener('click', () => this.setTool(button.dataset.tool));
    });
  }

  start(town, state = {}) {
    this.town = town;

    this.state = {
      playerName: 'Minh',
      day: 1,
      season: 'Xuân',
      timeMinutes: 360,
      money: 350,
      weather: 'sunny',
      inventory: { ...STARTING_INVENTORY },
      farm: {},
      resources: {},
      animals: null,
      npcs: null,
      discovered: [],
      quests: { active: 'harvest_rice', completed: [] },
      ...state,
      inventory: { ...STARTING_INVENTORY, ...(state.inventory || {}) },
      quests: {
        active: state.quests?.active || 'harvest_rice',
        completed: state.quests?.completed || []
      }
    };

    this.state.worldSeed = town.seed;
    ensureProgression(this.state);

    this.world = new World(town, this.state);

    if (state.map) {
      this.world.map = state.map;
      this.world.width = state.map.width;
      this.world.height = state.map.height;
      this.world.farm = state.farm || {};
      this.world.resources = state.resources || {};
      this.world.npcs = state.npcs || this.world.npcs;
      this.world.animals = state.animals ?? this.world.animals;
      this.world.discovered = new Set(state.discovered || []);
      this.world.buildSpecials();
      this.world.syncStateReferences();
    }

    this.player = new Player(this.state.playerName, this.world.map.spawn);
    if (state.player) Object.assign(this.player, state.player);

    this.player.maxEnergy = 100 + Math.max(0, this.state.homeLevel - 1) * 20;
    if (!state.player) this.player.energy = this.player.maxEnergy;
    else this.player.energy = Math.min(this.player.energy ?? this.player.maxEnergy, this.player.maxEnergy);

    this.setTool(this.player.tool || state.player?.tool || 'hand');
    this.centerCamera();

    ensureDailyGoals(this.state, this.town.seed);
    this.bindInternalEvents();

    this.running = true;
    this.ui.showGame();
    this.refreshHUD();
    this.last = performance.now();

    this.events.emit('game:started', { town: this.town, state: this.state });

    if (!this.state.tutorialSeen) {
      this.state.tutorialSeen = true;
      setTimeout(() => {
        if (!this.running) return;
        this.ui.showDialogue('🌱 Bắt đầu cuộc sống mới', [
          'Hãy dùng cuốc, hạt giống và bình tưới để tạo vụ mùa đầu tiên. Công cụ tác động vào ô ngay phía trước nhân vật.',
          'Bán nông sản ở chợ, làm nhiệm vụ tại Tòa thị trấn và hoàn thành mục tiêu ngày trong Sổ tay (phím J) để tăng danh tiếng.',
          'Khi hết thể lực hoặc muốn sang ngày mới, hãy trở về nhà và ngủ. Xưởng gần kho nông trại cho phép nâng cấp công cụ.',
          'Mục tiêu chính: đưa thị trấn lên cấp 5, hoàn thành 8 nhiệm vụ và nâng nhà ít nhất lên cấp 2.'
        ]);
      }, 120);
    }

    requestAnimationFrame(time => this.loop(time));
  }

  bindInternalEvents() {
    this.events.on('crop:harvested', () => this.recordAction('harvest', 1));
    this.events.on('fish:caught', () => this.recordAction('fish', 1));
    this.events.on('tree:cut', () => this.recordAction('wood', 1));
    this.events.on('rock:mined', () => this.recordAction('mine', 1));
  }

  centerCamera() {
    this.camera.x = this.player.x * this.world.tileSize - this.renderer.viewWidth / 2;
    this.camera.y = this.player.y * this.world.tileSize - this.renderer.viewHeight / 2;
    this.clampCamera();
  }

  clampCamera() {
    this.camera.x = Math.max(0, Math.min(
      this.camera.x,
      this.world.width * this.world.tileSize - this.renderer.viewWidth
    ));
    this.camera.y = Math.max(0, Math.min(
      this.camera.y,
      this.world.height * this.world.tileSize - this.renderer.viewHeight
    ));
  }

  loop(timestamp) {
    if (!this.running) return;

    const dt = Math.min(0.05, (timestamp - this.last) / 1000);
    this.last = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(time => this.loop(time));
  }

  update(dt) {
    if (this.ui.isBlocking?.()) {
      if (this.input.consume('Escape')) this.ui.closeTopOverlay?.();
      this.input.clear();
      return;
    }

    this.player.update(dt, this.input, this.world);
    this.advanceTime(dt);
    updateNPCs(this.world, dt);
    updateAnimals(this.world, dt);
    this.camera.update(
      this.player,
      this.world,
      dt,
      this.renderer.viewWidth,
      this.renderer.viewHeight
    );

    this.handleActions();

    this.effects = this.effects
      .filter(effect => (effect.life -= dt) > 0)
      .map(effect => ({
        ...effect,
        x: effect.x + (effect.vx || 0) * dt,
        y: effect.y + (effect.vy || 0) * dt
      }));

    this.refreshHUD();
    this.input.clear();

    this.autosaveElapsed += dt;
    if (this.autosaveElapsed >= 60) {
      this.autosaveElapsed = 0;
      this.save(true);
    }
  }

  advanceTime(dt) {
    this.state.timeMinutes += dt * 1.5;

    if (this.state.timeMinutes >= 1440) {
      this.sleep(true);
    }
  }

  sleep(forced = false) {
    if (!this.running) return;

    this.ui.closeAllOverlays?.();

    this.state.day += 1;
    this.state.stats.daysPlayed += 1;
    this.state.timeMinutes = 360;

    const seasonIndex = Math.floor((this.state.day - 1) / 28) % SEASONS.length;
    this.state.season = SEASONS[seasonIndex];
    this.state.weather = this.nextWeather();

    this.world.advanceCropDay(this.state.weather);
    this.player.restoreForNewDay(this.state.homeLevel);

    const spawn = this.world.map.spawn;
    this.player.x = spawn.x + 0.5;
    this.player.y = spawn.y + 0.5;
    this.centerCamera();

    ensureDailyGoals(this.state, this.town.seed);

    this.toast(forced
      ? '🌙 Bạn đã thức quá khuya và được đưa về nhà. Một ngày mới bắt đầu.'
      : '🌅 Bạn đã nghỉ ngơi. Một ngày mới bắt đầu.'
    );

    const festival = this.marketBonusForToday();
    if (festival.multiplier > 1) {
      this.toast(`🎉 ${festival.label}: giá bán hôm nay ×${festival.multiplier}`);
    }

    this.events.emit('day:started', {
      day: this.state.day,
      season: this.state.season,
      weather: this.state.weather
    });

    this.checkRewardsAndStory();
    this.save(true);
  }

  nextWeather() {
    const random = mulberry32(hashSeed(`${this.town.seed}-${this.state.day}-weather`))();

    if (random < 0.50) return 'sunny';
    if (random < 0.68) return 'cloudy';
    if (random < 0.86) return 'rain';
    if (random < 0.93) return 'heavyRain';
    if (random < 0.97) return 'fog';
    return 'storm';
  }

  handleActions() {
    if (this.input.consume('Escape')) {
      this.save(true);
      this.running = false;
      this.ui.showMenu();
      return;
    }

    if (this.input.consume('i') || this.input.consume('I')) {
      this.ui.toggleInventory(this);
      return;
    }

    if (this.input.consume('m') || this.input.consume('M')) {
      this.ui.showMap(this.world);
      return;
    }

    if (this.input.consume('j') || this.input.consume('J')) {
      this.ui.showJournal(this);
      return;
    }

    if (this.input.consume('q') || this.input.consume('Q')) {
      this.checkQuest();
      return;
    }

    if (this.input.consume('f') || this.input.consume('F')) {
      this.save(false);
      return;
    }

    if (this.input.consume('e') || this.input.consume('E')) {
      this.interact();
      return;
    }

    for (const tool of TOOL_DEFS) {
      if (tool.hotkey && this.input.consume(tool.hotkey)) {
        this.setTool(tool.id);
        break;
      }
    }

    if (this.input.consume(' ') || this.input.consume('Enter')) {
      this.useTool();
    }
  }

  interact() {
    const npc = this.world.getNPCNear(this.player.x, this.player.y);

    if (npc) {
      const firstTalkToday = npc.lastTalkDay !== this.state.day;
      this.ui.showDialogue(npc.name, interactNPC(npc, this.world));
      this.addHeart(npc);

      if (firstTalkToday) {
        npc.lastTalkDay = this.state.day;
        this.recordAction('talk', 1);
      }

      this.events.emit('npc:interacted', { npc });
      return;
    }

    const object = this.world.getObjectNear(this.player.x, this.player.y);

    if (object?.type === 'market') {
      const hour = this.state.timeMinutes / 60;
      if (hour < 8 || hour >= 19) {
        this.toast('🧺 Chợ mở cửa từ 08:00 đến 19:00.');
      } else {
        this.ui.showShop(this);
      }
      return;
    }

    if (object?.type === 'townhall') {
      this.checkQuest();
      return;
    }

    if (object?.type === 'playerHouse') {
      this.ui.showHome(this);
      return;
    }

    if (object?.type === 'barn') {
      const hour = this.state.timeMinutes / 60;
      if (hour < 7 || hour >= 20) {
        this.toast('🔨 Xưởng mở cửa từ 07:00 đến 20:00.');
      } else {
        this.ui.showWorkshop(this);
      }
      return;
    }

    const secret = this.world.exploreNear(this.player.tile.x, this.player.tile.y);
    if (secret) {
      this.collect(secret.reward);
      this.toast(`✨ Khám phá ${secret.id}: nhận ${getItemMeta(secret.reward).name}`);
      this.events.emit('exploration:discovered', secret);
      this.checkRewardsAndStory();
      return;
    }

    this.toast('Không có gì để tương tác ở đây.');
  }

  useTool() {
    const { x, y } = this.player.actionTile;

    if (this.activeTool === 'hand') {
      this.interact();
      return;
    }

    if (this.activeTool === 'hoe') {
      if (!this.consumeEnergy('hoe')) return;

      if (this.world.map.tiles[y]?.[x] === 'grass' && !this.world.hasBlockingObjectAt(x, y)) {
        this.world.map.tiles[y][x] = 'soil';
        this.toast('⛏ Đã cuốc đất.');
        this.feedback('soft');
      } else {
        this.refundEnergy('hoe');
        this.toast('Chỉ có thể cuốc trên ô cỏ trống.');
      }
      return;
    }

    if (this.activeTool.startsWith('seed_')) {
      const count = this.state.inventory[this.activeTool] || 0;
      const cropId = this.activeTool.replace('seed_', '');

      if (count <= 0) {
        this.toast('🌱 Bạn đã hết hạt giống này.');
        return;
      }

      if (!isCropInSeason(cropId, this.state.season)) {
        this.toast(`🍂 ${getItemMeta(this.activeTool).name} không phù hợp với mùa ${this.state.season}.`);
        return;
      }

      if (!this.consumeEnergy('seed')) return;

      if (this.world.seedFarm(x, y, cropId)) {
        this.state.inventory[this.activeTool] -= 1;
        this.toast(`🌱 Đã gieo ${getItemMeta(this.activeTool).name}.`);
      } else {
        this.refundEnergy('seed');
        this.toast('Hãy gieo lên ô đất đã cuốc và còn trống.');
      }
      return;
    }

    if (this.activeTool === 'water') {
      if (!this.consumeEnergy('water')) return;

      if (this.world.waterFarm(x, y)) {
        this.toast('💧 Đã tưới nước.');
      } else {
        this.refundEnergy('water');
        this.toast('Không có cây trồng ở ô phía trước.');
      }
      return;
    }

    if (this.activeTool === 'fertilizer') {
      if ((this.state.inventory.fertilizer || 0) <= 0) {
        this.toast('✨ Bạn đã hết phân bón.');
        return;
      }

      if (!this.consumeEnergy('fertilizer')) return;

      if (this.world.fertilizeFarm(x, y)) {
        this.state.inventory.fertilizer -= 1;
        this.toast('✨ Đã bón phân. Cây sẽ tăng trưởng nhanh hơn vào ngày tiếp theo.');
      } else {
        this.refundEnergy('fertilizer');
        this.toast('Không thể bón phân ở ô này.');
      }
      return;
    }

    if (this.activeTool === 'harvest') {
      const farm = this.world.farm[`${x},${y}`];

      if (!farm || farm.growth < farm.maxGrowth) {
        this.toast('🧺 Chưa có cây chín ở ô phía trước.');
        return;
      }

      if (!this.consumeEnergy('harvest')) return;

      const cropId = this.world.harvestFarm(x, y);
      const itemId = `crop_${cropId}`;
      this.collect(itemId);
      this.state.stats.harvested += 1;
      this.toast(`🧺 Thu hoạch ${getItemMeta(itemId).name}.`);
      this.feedback('reward');
      this.events.emit('crop:harvested', { cropId, itemId });
      this.checkRewardsAndStory();
      return;
    }

    if (this.activeTool === 'axe') {
      if (!this.consumeEnergy('axe')) return;

      const result = this.world.cutTree(x, y, this.state.toolLevels.axe);

      if (!result) {
        this.refundEnergy('axe');
        this.toast('Không có cây để chặt ở ô phía trước.');
        return;
      }

      this.collect(result.itemId, result.amount);
      this.state.stats.treesCut += 1;
      this.toast(`🪓 +${result.amount} ${getItemMeta(result.itemId).name}.`);
      this.feedback('impact');
      this.triggerShake(0.10);
      this.events.emit('tree:cut', result);
      this.checkRewardsAndStory();
      return;
    }

    if (this.activeTool === 'pickaxe') {
      if (!this.consumeEnergy('pickaxe')) return;

      const result = this.world.mine(x, y, this.state.toolLevels.pickaxe);

      if (!result) {
        this.refundEnergy('pickaxe');
        this.toast('Không có đá để khai thác ở ô phía trước.');
        return;
      }

      this.collect(result.itemId, result.amount);
      this.state.stats.rocksMined += 1;
      this.toast(`⛏ +${result.amount} ${getItemMeta(result.itemId).name}.`);
      this.feedback('impact');
      this.triggerShake(0.12);
      this.events.emit('rock:mined', result);
      this.checkRewardsAndStory();
      return;
    }

    if (this.activeTool === 'fishing') {
      if (!this.consumeEnergy('fishing')) return;

      const caught = this.world.fish(x, y, this.state.toolLevels.fishing);

      if (!caught) {
        this.refundEnergy('fishing');
        this.toast('Hãy đứng sát bờ và hướng mặt về phía nước.');
        return;
      }

      this.collect(caught);
      this.state.stats.fishCaught += 1;
      this.toast(`🎣 Câu được ${getItemMeta(caught).name}.`);
      this.feedback('reward');
      this.events.emit('fish:caught', { itemId: caught });
      this.checkRewardsAndStory();
    }
  }

  consumeEnergy(toolType) {
    const base = TOOL_ENERGY[toolType] || 1;
    const levelKey = toolType === 'seed' || toolType === 'fertilizer' || toolType === 'harvest'
      ? null
      : toolType;
    const level = levelKey ? (this.state.toolLevels[levelKey] || 1) : 1;
    const cost = Math.max(1, base - (level - 1));

    if (this.player.energy < cost) {
      this.toast('😴 Bạn đã hết thể lực làm việc. Hãy về nhà nghỉ ngơi.');
      return false;
    }

    this.player.energy -= cost;
    this._lastEnergyCost = cost;
    return true;
  }

  refundEnergy() {
    const amount = this._lastEnergyCost || 0;
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + amount);
    this._lastEnergyCost = 0;
  }

  collect(itemId, amount = 1) {
    this.state.inventory[itemId] = (this.state.inventory[itemId] || 0) + amount;
    this.events.emit('item:collected', {
      itemId,
      amount,
      total: this.state.inventory[itemId]
    });
  }

  buy(itemId) {
    const stock = getShopStock(this.state.season, this.state.townLevel);
    if (!stock.includes(itemId)) {
      this.toast('Mặt hàng này chưa được mở khóa hoặc không bán trong mùa hiện tại.');
      return false;
    }

    const price = getItemMeta(itemId).buy || 0;

    if (this.state.money < price) {
      this.toast('💸 Không đủ tiền.');
      return false;
    }

    this.state.money -= price;
    this.collect(itemId);
    this.toast(`🧺 Mua ${getItemMeta(itemId).name} -${price}💰`);
    this.events.emit('money:changed', {
      money: this.state.money,
      reason: 'buy',
      itemId,
      amount: -price
    });

    return true;
  }

  marketBonusForToday() {
    if (this.state.day % 7 !== 0) {
      return { category: null, multiplier: 1, label: 'Ngày thường' };
    }

    const week = Math.floor(this.state.day / 7) % 3;

    if (week === 1) return { category: 'fish', multiplier: 1.5, label: 'Hội câu cá' };
    if (week === 2) return { category: 'crop', multiplier: 1.35, label: 'Hội mùa màng' };
    return { category: 'resource', multiplier: 1.3, label: 'Phiên chợ thủ công' };
  }

  sellAllInventory() {
    const festival = this.marketBonusForToday();
    let total = 0;
    let soldCount = 0;

    for (const [itemId, count] of Object.entries(this.state.inventory)) {
      if (!count || count <= 0) continue;

      const meta = getItemMeta(itemId);
      const basePrice = getSellPrice(itemId);
      if (basePrice <= 0) continue;

      const multiplier = festival.category === meta.category ? festival.multiplier : 1;
      total += Math.round(basePrice * multiplier) * count;
      soldCount += count;
      this.state.inventory[itemId] = 0;
    }

    if (!soldCount) {
      this.toast('Không có vật phẩm nào có thể bán.');
      return 0;
    }

    this.state.money += total;
    this.state.stats.moneyEarned += total;
    this.toast(`💰 Đã bán ${soldCount} vật phẩm: +${total}`);
    this.events.emit('money:changed', {
      money: this.state.money,
      reason: 'sell',
      amount: total
    });
    this.checkRewardsAndStory();

    return total;
  }

  recordAction(action, amount = 1) {
    const completedGoals = progressDailyGoals(this.state, action, amount);

    for (const goal of completedGoals) {
      this.state.money += goal.reward;
      this.state.stats.moneyEarned += goal.reward;
      this.addReputation(goal.reputation);
      this.toast(`✅ Mục tiêu ngày: ${goal.label} +${goal.reward}💰 +${goal.reputation} danh tiếng`);
    }

    this.checkRewardsAndStory();
  }

  addReputation(amount) {
    const result = addReputation(this.state, amount);

    if (result.leveledUp) {
      this.toast(`🌟 Thị trấn đạt cấp ${result.level}: ${result.title}`);
      this.feedback('reward');
    }
  }

  checkRewardsAndStory() {
    const achievements = checkAchievements(this.state);

    for (const achievement of achievements) {
      this.state.money += achievement.reward;
      this.state.stats.moneyEarned += achievement.reward;
      this.addReputation(achievement.reputation);
      this.toast(`🏆 Thành tựu: ${achievement.label} +${achievement.reward}💰`);
    }

    const storyReady = this.state.townLevel >= 5
      && this.state.stats.questsCompleted >= 8
      && this.state.homeLevel >= 2;

    if (storyReady && !this.state.story.completed) {
      this.state.story.completed = true;
      this.state.money += 1000;
      this.state.stats.moneyEarned += 1000;
      this.ui.closeAllOverlays?.();
      this.ui.showDialogue('🌟 Lễ hội Quê Hương', [
        `${this.town.name} đã thay đổi nhờ những việc bạn làm mỗi ngày.`,
        'Người dân tổ chức một lễ hội để cảm ơn bạn. Mục tiêu chính của bản chơi đã hoàn thành.',
        'Bạn nhận 1000💰. Từ đây game chuyển sang chế độ tự do: tiếp tục làm nông, nâng cấp và xây dựng các kỷ lục mới.'
      ]);
      this.feedback('reward');
    }
  }

  upgradeTool(toolKey) {
    const currentLevel = this.state.toolLevels[toolKey] || 1;
    const cost = getToolUpgradeCost(currentLevel);

    if (!cost) {
      this.toast('Công cụ này đã đạt cấp tối đa.');
      return false;
    }

    if (!canAfford(this.state, cost)) {
      this.toast(`🔨 Chưa đủ nguyên liệu: ${formatCost(cost)}`);
      return false;
    }

    payCost(this.state, cost);
    this.state.toolLevels[toolKey] = currentLevel + 1;
    this.addReputation(8);
    this.toast(`🔨 Nâng cấp thành công: ${toolKey} cấp ${currentLevel + 1}`);
    this.feedback('reward');
    this.ui.showWorkshop(this);
    return true;
  }

  upgradeHome() {
    const cost = getHomeUpgradeCost(this.state.homeLevel);

    if (!cost) {
      this.toast('Nhà đã đạt cấp tối đa.');
      return false;
    }

    if (!canAfford(this.state, cost)) {
      this.toast(`🏠 Chưa đủ nguyên liệu: ${formatCost(cost)}`);
      return false;
    }

    payCost(this.state, cost);
    this.state.homeLevel += 1;
    this.player.maxEnergy = 100 + (this.state.homeLevel - 1) * 20;
    this.player.energy = this.player.maxEnergy;
    this.addReputation(this.state.homeLevel === 2 ? 25 : 40);
    this.toast(`🏠 Nhà đã nâng lên cấp ${this.state.homeLevel}. Thể lực tối đa tăng lên ${this.player.maxEnergy}.`);
    this.feedback('reward');
    this.ui.showHome(this);
    this.checkRewardsAndStory();
    return true;
  }

  setTool(toolId) {
    if (!TOOL_DEFS.some(tool => tool.id === toolId)) toolId = 'hand';

    this.activeTool = toolId;
    if (this.player) this.player.tool = toolId;

    for (const button of this.ui.toolButtons) {
      button.classList.toggle('selected', button.dataset.tool === toolId);
    }
  }

  addHeart(npc) {
    this.effects.push({
      type: 'heart',
      x: npc.x * this.world.tileSize - this.camera.x,
      y: npc.y * this.world.tileSize - this.camera.y - 16,
      vx: 0,
      vy: -7,
      life: 1
    });
  }

  checkQuest() {
    const quest = getQuest(this.state.quests.active);
    const have = this.state.inventory[quest.item] || 0;

    if (have < quest.amount) {
      this.ui.showDialogue(
        '📜 Nhiệm vụ',
        `${quest.name}: ${quest.text} (${have}/${quest.amount})`
      );
      return false;
    }

    this.state.inventory[quest.item] -= quest.amount;
    this.state.money += quest.reward;
    this.state.stats.moneyEarned += quest.reward;
    this.state.stats.questsCompleted += 1;

    if (!this.state.quests.completed.includes(quest.id)) {
      this.state.quests.completed.push(quest.id);
    }

    this.state.quests.active = nextQuestId(quest.id);
    this.addReputation(quest.reputation);

    this.toast(`✅ Hoàn thành: ${quest.name} +${quest.reward}💰 +${quest.reputation} danh tiếng`);
    this.feedback('reward');
    this.events.emit('quest:completed', { quest, money: this.state.money });

    this.checkRewardsAndStory();
    return true;
  }

  getProgressSummary() {
    const current = currentTownLevel(this.state);
    const next = nextTownLevel(this.state);
    const quest = getQuest(this.state.quests.active);
    const goals = this.state.dailyGoals?.goals || [];
    const festival = this.marketBonusForToday();

    return {
      current,
      next,
      quest,
      goals,
      festival,
      storyComplete: this.state.story.completed
    };
  }

  toast(message) {
    this.ui.toast(message);
  }

  refreshHUD() {
    if (!this.town) return;

    this.ui.town.textContent = this.town.name;
    this.ui.date.textContent = `Ngày ${this.state.day} · ${this.state.season}`;
    this.ui.time.textContent = fmtTime(this.state.timeMinutes);

    const icons = {
      sunny: '☀ Nắng',
      cloudy: '☁ Nhiều mây',
      rain: '🌧 Mưa',
      heavyRain: '🌧 Mưa lớn',
      fog: '🌫 Sương',
      wind: '💨 Gió',
      storm: '⛈ Bão'
    };

    this.ui.weather.textContent = icons[this.state.weather] || this.state.weather;
    this.ui.money.textContent = Math.floor(this.state.money);
    this.ui.energy.textContent = `⚡ ${Math.ceil(this.player.energy)}/${this.player.maxEnergy}`;
    this.ui.stamina.textContent = `🏃 ${Math.ceil(this.player.stamina)}`;
    this.ui.reputation.textContent = `⭐ ${this.state.reputation}`;
    this.ui.level.textContent = `🏘 Cấp ${this.state.townLevel}`;
  }

  feedback(type = 'soft') {
    if (!this.sound) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext ||= new AudioContextClass();

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const frequencies = { soft: 330, impact: 140, reward: 660 };

      oscillator.frequency.value = frequencies[type] || frequencies.soft;
      oscillator.type = type === 'impact' ? 'square' : 'sine';

      gain.gain.setValueAtTime(0.035, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + 0.08
      );

      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.08);
    } catch {}
  }

  triggerShake(duration = 0.1) {
    if (this.shake) this.shakeTime = Math.max(this.shakeTime, duration);
  }

  render() {
    if (this.shakeTime <= 0) {
      this.renderer.draw(this);
      return;
    }

    this.shakeTime = Math.max(0, this.shakeTime - 1 / 60);

    const offsetX = (Math.random() - 0.5) * 5;
    const offsetY = (Math.random() - 0.5) * 5;

    this.camera.x += offsetX;
    this.camera.y += offsetY;
    this.renderer.draw(this);
    this.camera.x -= offsetX;
    this.camera.y -= offsetY;
  }

  drawLightingAndWeather() {
    drawLighting(
      this.renderer.ctx,
      this.state.timeMinutes,
      this.state.weather
    );
    this.drawWeatherParticles();
  }

  drawWeatherParticles() {
    const ctx = this.renderer.ctx;

    if (['rain', 'heavyRain', 'storm'].includes(this.state.weather)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(195,226,236,.6)';
      ctx.lineWidth = 1;

      const count = this.state.weather === 'storm' ? 180 : 110;

      for (let i = 0; i < count; i++) {
        const x = (i * 73 + this.state.timeMinutes * 8) % this.renderer.viewWidth;
        const y = (i * 29 + this.state.timeMinutes * 14) % this.renderer.viewHeight;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 6);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (this.state.weather === 'fog') {
      ctx.fillStyle = 'rgba(231,237,225,.16)';
      ctx.fillRect(0, 0, this.renderer.viewWidth, this.renderer.viewHeight);
    }
  }

  save(silent = false) {
    this.state.playerName = this.player.name;
    this.world.syncStateReferences();
    saveGame(this);

    this.ui.onSave?.();
    this.events.emit('game:saved', {
      day: this.state.day,
      town: this.town.name
    });

    if (!silent) this.toast('💾 Đã lưu thế giới.');
  }
}
