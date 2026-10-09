import { MapGenerator } from './mapGenerator.js';
import { mulberry32, hashSeed, weightedPick } from './utils.js';
import { getCropDef } from './content.js';
import {
  canWalk as canWalkAt,
  hasBlockingObjectAt as hasBlockingAt
} from './world/collision.js';

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

    this.syncStateReferences();
  }

  syncStateReferences() {
    this.state.farm = this.farm;
    this.state.resources = this.resources;
    this.state.animals = this.animals;
    this.state.npcs = this.npcs;
    this.state.discovered = [...this.discovered];
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

    return list.map((value, index) => ({
      id: `npc-${index}`,
      name: value[0],
      job: value[1],
      personality: value[2],
      x: cx + (index % 4) * 3 - 5,
      y: cy + Math.floor(index / 4) * 3 - 2,
      home: index % 2 ? 'village' : 'town',
      friendship: 0,
      step: 0,
      dir: 'down',
      color: index % 2 ? '#c56e57' : '#6e78bf'
    }));
  }

  buildSpecials() {
    this.specials = {};
    for (const object of this.map.objects) {
      if (['cave', 'shrine', 'lighthouse', 'pier'].includes(object.type)) {
        this.specials[object.type] = object;
      }
    }
  }

  hasBlockingObjectAt(x, y) {
    return hasBlockingAt(this, x, y);
  }

  canWalk(x, y, options) {
    return canWalkAt(this, x, y, options);
  }

  getObjectNear(x, y, radius = 1.6) {
    return this.map.objects.find(object => Math.hypot(object.x + 0.5 - x, object.y + 0.5 - y) < radius);
  }

  getNPCNear(x, y, radius = 1.8) {
    return this.npcs.find(npc => Math.hypot(npc.x - x, npc.y - y) < radius);
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

  fish(x, y, fishingLevel = 1) {
    if (!this.isWater(x, y)) return null;

    const coastal = this.town.beach || this.town.crops.includes('seafood');
    const common = coastal ? ['shrimp', 'fish', 'crab'] : ['fish', 'fish', 'carp'];
    const rareWeight = Math.max(1, fishingLevel * 1.4);

    return weightedPick(this.rng, [
      ...common.map(value => ({ value, weight: 7 })),
      { value: 'rareFish', weight: rareWeight }
    ]);
  }

  mine(x, y, toolLevel = 1) {
    if (this.map.tiles[y]?.[x] !== 'rock') return null;

    const key = `${x},${y}`;
    if (this.resources[key]) return null;

    this.resources[key] = 'mined';
    this.map.tiles[y][x] = 'grass';
    this.map.objects = this.map.objects.filter(object => !(object.x === x && object.y === y && object.type === 'rockObj'));

    const gemChance = 0.12 + (toolLevel - 1) * 0.08;
    return {
      itemId: this.rng() < gemChance ? 'gem' : 'stone',
      amount: toolLevel >= 3 ? 2 : 1
    };
  }

  cutTree(x, y, toolLevel = 1) {
    const index = this.map.objects.findIndex(object => object.x === x && object.y === y && object.type === 'tree');
    if (index < 0) return null;

    const key = `${x},${y}`;
    if (this.resources[key]) return null;

    this.resources[key] = 'cut';
    this.map.objects.splice(index, 1);

    const hardChance = 0.12 + (toolLevel - 1) * 0.09;
    return {
      itemId: this.rng() < hardChance ? 'woodHard' : 'wood',
      amount: toolLevel >= 3 ? 2 : 1
    };
  }

  exploreNear(x, y) {
    for (const object of this.map.objects) {
      if (!['cave', 'shrine', 'lighthouse', 'pier'].includes(object.type)) continue;
      if (Math.hypot(object.x - x, object.y - y) >= 2) continue;

      const id = object.type;
      if (this.discovered.has(id)) return null;

      this.discovered.add(id);
      this.state.discovered = [...this.discovered];

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
