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
  getBuyPrice,
  getItemMeta,
  getQuest,
  getSellPrice,
  nextQuestId
} from './content.js';
import { EventBus } from './events.js';

const STARTING_INVENTORY = {
  seed_rice: 5,
  seed_corn: 5,
  seed_carrot: 3,
  seed_pumpkin: 2,
  fertilizer: 2,
  fish: 0,
  wood: 10,
  stone: 5,
  gem: 0,
  rareFish: 0,
  rareSeed: 0,
  crop_rice: 0,
  crop_corn: 0,
  crop_carrot: 0,
  crop_pumpkin: 0
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
      money: 500,
      inventory: { ...STARTING_INVENTORY },
      farm: {},
      resources: {},
      animals: null,
      npcs: null,
      discovered: [],
      weather: 'sunny',
      quests: { active: 'harvest_rice', completed: [], weeklyReward: 50 },
      ...state,
      inventory: { ...STARTING_INVENTORY, ...(state.inventory || {}) },
      quests: {
        active: state.quests?.active || 'harvest_rice',
        completed: state.quests?.completed || [],
        weeklyReward: state.quests?.weeklyReward ?? 50
      }
    };

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
      this.state.farm = this.world.farm;
      this.state.resources = this.world.resources;
      this.state.npcs = this.world.npcs;
      this.state.animals = this.world.animals;
    }

    this.player = new Player(this.state.playerName, this.world.map.spawn);
    if (state.player) Object.assign(this.player, state.player);

    this.setTool(this.player.tool || state.player?.tool || 'hand');
    this.camera.x = this.player.x * this.world.tileSize - this.renderer.viewWidth / 2;
    this.camera.y = this.player.y * this.world.tileSize - this.renderer.viewHeight / 2;
    this.clampCamera();

    this.running = true;
    this.ui.showGame();
    this.refreshHUD();
    this.last = performance.now();
    this.events.emit('game:started', { town: this.town, state: this.state });
    requestAnimationFrame(time => this.loop(time));
  }

  clampCamera() {
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.world.width * this.world.tileSize - this.renderer.viewWidth));
    this.camera.y = Math.max(0, Math.min(this.camera.y, this.world.height * this.world.tileSize - this.renderer.viewHeight));
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
    this.camera.update(this.player, this.world, dt, this.renderer.viewWidth, this.renderer.viewHeight);
    this.handleActions();
    this.effects = this.effects
      .filter(effect => (effect.life -= dt) > 0)
      .map(effect => ({ ...effect, x: effect.x + (effect.vx || 0) * dt, y: effect.y + (effect.vy || 0) * dt }));
    this.refreshHUD();
    this.input.clear();

    this.autosaveElapsed += dt;
    if (this.autosaveElapsed >= 60) {
      this.autosaveElapsed = 0;
      this.save(true);
    }
  }

  advanceTime(dt) {
    this.state.timeMinutes += dt * 1.2;
    if (this.state.timeMinutes >= 1440) {
      this.state.timeMinutes -= 1440;
      this.newDay();
    }
  }

  newDay() {
    this.state.day += 1;
    this.state.timeMinutes = 360;
    const seasonIndex = Math.floor((this.state.day - 1) / 28) % SEASONS.length;
    this.state.season = SEASONS[seasonIndex];
    this.state.weather = this.nextWeather();
    this.world.advanceCropDay(this.state.weather);
    this.player.stamina = this.player.maxStamina;

    if (this.state.day % 7 === 0) {
      this.state.money += this.state.quests.weeklyReward;
      this.events.emit('money:changed', { money: this.state.money, reason: 'weekly_reward' });
    }

    this.toast(this.festivalForDay());
    this.events.emit('day:started', { day: this.state.day, season: this.state.season, weather: this.state.weather });
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
      this.ui.toggleInventory(this.state.inventory);
      return;
    }
    if (this.input.consume('m') || this.input.consume('M')) {
      this.ui.showMap(this.world);
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

    if (this.input.consume(' ') || this.input.consume('Enter')) this.useTool();
  }

  interact() {
    const npc = this.world.getNPCNear(this.player.x, this.player.y);
    if (npc) {
      this.ui.showDialogue(npc.name, interactNPC(npc, this.world));
      this.addHeart(npc);
      this.events.emit('npc:interacted', { npc });
      return;
    }

    const object = this.world.getObjectNear(this.player.x, this.player.y);
    if (object?.type === 'market') {
      this.ui.showShop(this);
      return;
    }
    if (object?.type === 'townhall') {
      this.checkQuest();
      return;
    }
    if (object?.type === 'playerHouse') {
      this.toast('�🏠 Nhà của bạn. Tiến trình nâng cấp nhà sẽ được mở rộng ở phase sau.');
      return;
    }

    const secret = this.world.exploreNear(this.player.tile.x, this.player.tile.y);
    if (secret) {
      this.collect(secret.reward);
      this.toast(`✨ Khám phá ${secret.id}: nhận ${getItemMeta(secret.reward).name}`);
      this.events.emit('exploration:discovered', secret);
      return;
    }

    this.toast('Không có gì để hương tác ở đâi.');
  }

  useTool() {
    const { x, y } = this.player.actionTile;

    if (this.activeTool === 'hand') {
      this.interact();
      return;
    }

    if (this.activeTool === 'hoe') {
      if (this.world.map.tiles[y]?.[x] === 'grass' && !this.world.hasBlockingObjectAt(x, y)) {
        this.world.map.tiles[y][x] = 'soil';
        this.toast('⛏ “ Đã cuốc đất');
        this.feedback('soft');
      } else {
        this.toast('Chỉ có thể cỡc trên ô cỏ trống.');
      }
      return;
    }

    if (this.activeTool.startsWith('seed_')) {
      const count = this.state.inventory[this.activeTool] || 0;
      const cropId = this.activeTool.replace('seed_', '');
      if (count <= 0) {
        this.toast('🌱 Bạn đã hết hạt giống này.');
      } else if (this.world.seedFarm(x, y, cropId)) {
        this.state.inventory[this.activeTool] -= 1;
        this.toast(`🌱 Đã gieo ${getItemMeta(this.activeTool).name}`);
      } else {
        this.toast('Hãy gieo lên ô đất đã cuốc và còn trống.');
      }
      return;
    }

    if (this.activeTool === 'water') {
      this.toast(this.world.waterFarm(x, y) ? '💧 Đã tưới nước' : 'Không có cây trồng ở ô phía trước.');
      return;
    }

    if (this.activeTool === 'fertilizer') {
      if ((this.state.inventory.fertilizer || 0) <= 0) {
        this.toast('�✨ Bạn đã hết phân bón.');
      } else if (this.world.fertilizeFarm(x, y)) {
        this.state.inventory.fertilizer -= 1;
        this.toast('✨ Đã bón phân — cây sẽ lớn nhanh hơn vào ngày tiếp theo.');
      } else {
        this.toast('Không thể bón phân ở ô nhày.');
      }
      return;
    }

    if (this.activeTool === 'harvest') {
      const cropId = this.world.harvestFarm(x, y);
      if (!cropId) {
        this.toast('🧪 Cây chưa sẵn sàng để thu hoạch.');
      } else {
        const itemId = `crop_${cropId}`;
        this.collect(itemId);
        this.toast(`🧪 Thu hoạch ${getItemMeta(itemId).name}`);
        this.feedback('reward');
        this.events.emit('crop:harvested', { cropId, itemId });
      }
      return;
    }

    if (this.activeTool === 'axe') {
      const drop = this.world.cutTree(x, y);
      if (drop) {
        this.collect(drop);
        this.toast(`🪵 Chặt cây: +1 ${getItemMeta(drop).name}`);
        this.feedback('impact');
        this.triggerShake(0.10);
      } else {
        this.toast('Không có cây để chặt ở ô phía trước.');
      }
      return;
    }

    if (this.activeTool === 'pickaxe') {
      const drop = this.world.mine(x, y);
      if (drop) {
        this.collect(drop);
        this.toast(`⛏ Khai thác: +1 ${getItemMeta(drop).name}`);
        this.feedback('impact');
        this.triggerShake(0.12);
      } else {
        this.toast('Không có đá để khai thác ở ô phía trước.');
      }
      return;
    }

    if (this.activeTool === 'fishing') {
      const caught = this.world.fish(x, y);
      if (caught) {
        this.collect(caught);
        this.toast(`🎣 Câu được ${getItemMeta(caught).name}`);
        this.feedback('reward');
        this.events.emit('fish:caught', { itemId: caught });
      } else {
        this.toast('Hãy đứng sát bờ và hướng mặt về phía nước.');
      }
    }
  }

  collect(itemId, amount = 1) {
    this.state.inventory[itemId] = (this.state.inventory[itemId] || 0) + amount;
    this.events.emit('item:collected', { itemId, amount, total: this.state.inventory[itemId] });
  }

  buy(itemId) {
    const price = getBuyPrice(itemId);
    if (!price) return false;
    if (this.state.money < price) {
      this.toast('💸 Không đủ tiền');
      return false;
    }
    this.state.money -= price;
    this.collect(itemId);
    this.toast(`🧺 Mua ${getItemMeta(itemId).name} -${price}��`);
    this.events.emit('money:changed', { money: this.state.money, reason: 'buy', itemId, amount: -price });
    return true;
  }

  sellAllInventory() {
    let total = 0;
    let soldCount = 0;
    for (const [itemId, count] of Object.entries(this.state.inventory)) {
      if (!count || count <= 0) continue;
      const price = getSellPrice(itemId);
      if (price <= 0) continue;
      total += price * count;
      soldCount += count;
      this.state.inventory[itemId] = 0;
    }

    if (!soldCount) {
      this.toast('Không có vật phẩm nào có thể bán.');
      return 0;
    }

    this.state.money += total;
    this.toast(`💰 Đã bán ${soldCount} vật phẩm: +${total}`);
    this.events.emit('money:changed', { money: this.state.money, reason: 'sell', amount: total });
    return total;
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
  }

  feedback(type = 'soft') {
    if (!this.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext ||= new AudioCtx();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const frequencies = { soft: 330, impact: 140, reward: 660 };
      oscillator.frequency.value = frequencies[type] || frequencies.soft;
      oscillator.type = type === 'impact' ? 'square' : 'sine';
      gain.gain.setValueAtTime(0.035, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
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
    const ox = (Math.random() - 0.5) * 5;
    const oy = (Math.random() - 0.5) * 5;
    this.camera.x += ox;
    this.camera.y += oy;
    this.renderer.draw(this);
    this.camera.x -= ox;
    this.camera.y -= oy;
  }

  drawLightingAndWeather() {
    drawLighting(this.renderer.ctx, this.state.timeMinutes, this.state.weather);
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

  festivalForDay() {
    const events = [
      '🌅 Một ngày mới bắt đầu.',
      '🌸 Lễ hội mùa xuân đang diễn ra ở quảng trường!',
      '🎣 Hội câu cá hôm nay!',
      '🏮 Chợ đêm mở cửa tối nay!',
      '🌾 Hội mùa màng — thị trấn nhộn nhịp hơn thường ngày.'
    ];
    return this.state.day % 7 === 0
      ? events[Math.floor(this.state.day / 7) % events.length]
      : events[0];
  }

  checkQuest() {
    const quest = getQuest(this.state.quests.active);
    const have = this.state.inventory[quest.item] || 0;

    if (have < quest.amount) {
      this.ui.showDialogue('📜 Nhiệm vụ', `${quest.name}: ${quest.text} (${have}/${quest.amount})`);
      return false;
    }

    this.state.inventory[quest.item] -= quest.amount;
    this.state.money += quest.reward;
    if (!this.state.quests.completed.includes(quest.id)) this.state.quests.completed.push(quest.id);
    this.state.quests.active = nextQuestId(quest.id);
    this.toast(`✅ Hoàn thành: ${quest.name} +${quest.reward}💰`);
    this.feedback('reward');
    this.events.emit('quest:completed', { quest, money: this.state.money });
    return true;
  }

  save(silent = false) {
    this.state.playerName = this.player.name;
    saveGame(this);
    this.ui.onSave?.();
    this.events.emit('game:saved', { day: this.state.day, town: this.town.name });
    if (!silent) this.toast('💾 Đã lưu thế giới');
  }
}
