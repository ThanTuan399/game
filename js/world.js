import { MapGenerator } from './mapGenerator.js';
import { mulberry32, hashSeed, weightedPick } from './utils.js';
import { getCropDef } from './content.js';

export const SEASONS = ['Xuân', 'Hạ', 'Thu', 'Đông'];
export const WEATHER = ['sunny', 'cloudy', 'rain', 'heavyRain', 'fog', 'wind', 'storm'];

export class World {
  constructor(town, state) {
    this.town = town;
    this.state = state;
    this.tileSize = 32;
    this.generator = new MapGenerator(town);
    this.map = this.generator.generate();
    this.width = this.map.width;
    this.height = this.map.height;
    this.rng = mulberry32(hashSeed(`${town.seed}-${state.day}`));
    this.discovered = new Set(state.discovered || []);
    this.farm = state.farm || {};
    this.resources = state.resources || {};
    this.animals = state.animals == null ? this.createAnimals() : state.animals;
    this.npcs = state.npcs || this.createNPCs();
    this.specials = {};
    this.buildSpecials();

    this.state.farm = this.farm;
    this.state.resources = this.resources;
    this.state.animals = this.animals;
    this.state.npcs = this.npcs;
  }

  createAnimals() {
    const out = [];
    const bx = Math.floor(this.width / 2) + 10;
    const by = Math.floor(this.height / 2) + 8;
    for (let i = 0; i < 4; i++) {
      out.push({ id: `cow-${i}`, type: 'cow', x: bx + (i % 2) * 2, y: by + Math.floor(i / 2) * 2, step: 0 });
    }
    for (let i = 0; i < 6; i++) {
      out.push({ id: `chicken-${i}`, type: 'chicken', x: bx - 4 + (i % 3), y: by + 4 + Math.floor(i / 3), step: 0 });
    }
    return out;
  }

  createNPCs() {
    const list = [
      ['Linh', 'người bán hạt giống', 'friendly'],
      ['Ông Tư', 'nông dân', 'wise'],
      ['Mai', 'chủ quán', 'cheerful'],
      ['Nam', 'thợ mộc', 'calm'],
      ['Bà Năm', 'bán hàng', 'warm'],
      ['Khoa', 'người câu cá', 'quiet'],
      ['An', 'trẻ em', 'playful'],
      ['Hùng', 'người giao hàng', 'energetic'],
      ['Vy', 'người bán hoa', 'sweet'],
      ['Bình', 'trưởng thị trấn', 'leader']
    ];
    const cx = this.width / 2;
    const cy = this.height / 2;
    return list.map((v, i) => ({
      id: `npc-${i}`,
      name: v[0],
      job: v[1],
      personality: v[2],
      x: cx + (i % 4) * 3 - 5,
      y: cy + Math.floor(i / 4) * 3 - 2,
      home: i % 2 ? 'village' : 'town',
      friendship: 0,
      step: 0,
      dir: 'down',
      color: i % 2 ? '#c56e57' : '#6e78bf'
    }));
  }

  buildSpecials() {
    this.specials = {};
    for (const o of this.map.objects) {
      if (['cave', 'shrine', 'lighthouse', 'pier'].includes(o.type)) this.specials[o.type] = o;
    }
  }

  hasBlockingObjectAt(x, y) {
    const blockedTypes = ['tree', 'rockObj', 'house', 'woodHouse', 'townhall', 'market', 'cafe', 'playerHouse', 'barn', 'cave', 'shrine', 'lighthouse'];
    return this.map.objects.some(o => o.x === x && o.y === y && blockedTypes.includes(o.type));
  }

  canWalk(x, y) {
    if (x < 1 || y < 1 || x > this.width - 1 || y > this.height - 1) return false;
    const t = this.map.tiles[Math.floor(y)]?.[Math.floor(x)];
    if (!t || ['water', 'rock'].includes(t)) return false;

    for (const o of this.map.objects) {
      const blocked = ['tree', 'rockObj', 'house', 'woodHouse', 'townhall', 'market', 'cafe', 'playerHouse', 'barn', 'cave', 'shrine', 'lighthouse'].includes(o.type);
      if (blocked && Math.abs(o.x + 0.5 - x) < 0.55 && Math.abs(o.y + 0.5 - y) < 0.55) return false;
    }
    return true;
  }

  getObjectNear(x, y, r = 1.6) {
    return this.map.objects.find(o => Math.hypot(o.x + 0.5 - x, o.y + 0.5 - y) < r);
  }

  getNPCNear(x, y, r = 1.8) {
    return this.npcs.find(n => Math.hypot(n.x - x, n.y - y) < r);
  }

  isWater(x, y) {
    return this.map.tiles[y]?.[x] === 'water';
  }

  advanceCropDay(weather) {
    const rainy = ['rain', 'heavyRain', 'storm'].includes(weather);
    for (const key of Object.keys(this.farm)) {
      const crop = this.farm[key];
      if (!crop) continue;
      crop.age = (crop.age || 0) + 1;
      if (crop.watered || rainy) {
        const boost = crop.fertilized ? 2 : 1;
        crop.growth = Math.min(crop.maxGrowth, (crop.growth || 0) + boost);
      }
      crop.ready = crop.growth >= crop.maxGrowth;
      crop.watered = false;
      crop.fertilized = false;
    }
  }

  seedFarm(x, y, cropId) {
    const key = `${x},${y}`;
    const cropDef = getCropDef(cropId);
    if (!cropDef || this.map.tiles[y]?.[x] !== 'soil' || this.farm[key]) return false;
    this.farm[key] = {
      crop: cropId,
      age: 0,
      growth: 0,
      maxGrowth: cropDef.growDays,
      watered: false,
      fertilized: false,
      ready: false
    };
    return true;
  }

  waterFarm(x, y) {
    const crop = this.farm[`${x},${y}`];
    if (!crop) return false;
    crop.watered = true;
    return true;
  }

  fertilizeFarm(x, y) {
    const crop = this.farm[`${x},${y}`];
    if (!crop || crop.ready) return false;
    crop.fertilized = true;
    return true;
  }

  harvestFarm(x, y) {
    const key = `${x},${y}`;
    const crop = this.farm[key];
    if (!crop || crop.growth < crop.maxGrowth) return null;
    delete this.farm[key];
    return crop.crop;
  }

  fish(x, y) {
    if (!this.isWater(x, y)) return null;
    const coastal = this.town.beach || this.town.crops.includes('seafood');
    const common = coastal ? ['shrimp', 'fish', 'crab'] : ['fish', 'fish', 'carp'];
    return weightedPick(this.rng, [
      ...common.map(value => ({ value, weight: 7 })),
      { value: 'rareFish', weight: 1 }
    ]);
  }

  mine(x, y) {
    if (this.map.tiles[y]?.[x] !== 'rock') return null;
    const key = `${x},${y}`;
    if (this.resources[key]) return null;

    this.resources[key] = 'mined';
    this.map.tiles[y][x] = 'grass';
    this.map.objects = this.map.objects.filter(o => !(o.x === x && o.y === y && o.type === 'rockObj'));
    return this.rng() < 0.2 ? 'gem' : 'stone';
  }

  cutTree(x, y) {
    const index = this.map.objects.findIndex(o => o.x === x && o.y === y && o.type === 'tree');
    if (index < 0) return null;
    const key = `${x},${y}`;
    if (this.resources[key]) return null;

    this.resources[key] = 'cut';
    this.map.objects.splice(index, 1);
    return this.rng() < 0.2 ? 'woodHard' : 'wood';
  }

  exploreNear(x, y) {
    for (const o of this.map.objects) {
      if (!['cave', 'shrine', 'lighthouse', 'pier'].includes(o.type)) continue;
      if (Math.hypot(o.x - x, o.y - y) >= 2) continue;
      const id = o.type;
      if (this.discovered.has(id)) return null;
      this.discovered.add(id);
      return {
        id,
        reward: id === 'cave'
          ? 'gem'
          : id === 'shrine'
            ? 'rareSeed'
            : id === 'lighthouse'
              ? 'rareFish'
              : 'shell'
      };
    }
    return null;
  }
}
