const BLOCKING_TILES = new Set(['water', 'rock']);
const BLOCKING_OBJECT_TYPES = new Set([
  'tree',
  'rockObj',
  'house',
  'woodHouse',
  'townhall',
  'market',
  'cafe',
  'playerHouse',
  'barn',
  'cave',
  'shrine',
  'lighthouse'
]);

export class CollisionSystem {
  constructor(world) {
    this.world = world;
  }

  isInsideWorld(x, y) {
    return x >= 1
      && y >= 1
      && x < this.world.width - 1
      && y < this.world.height - 1;
  }

  tileAt(x, y) {
    return this.world.map.tiles[Math.floor(y)]?.[Math.floor(x)] ?? null;
  }

  hasBlockingObjectAt(tileX, tileY) {
    return this.world.map.objects.some(object => (
      object.x === tileX
      && object.y === tileY
      && BLOCKING_OBJECT_TYPES.has(object.type)
    ));
  }

  collidesWithStaticObject(x, y) {
    for (const object of this.world.map.objects) {
      if (!BLOCKING_OBJECT_TYPES.has(object.type)) continue;

      const collider = object.collider || {};
      const centerX = object.x + (collider.offsetX ?? 0.5);
      const centerY = object.y + (collider.offsetY ?? 0.5);
      const halfWidth = collider.halfWidth ?? 0.55;
      const halfHeight = collider.halfHeight ?? 0.55;

      if (Math.abs(centerX - x) < halfWidth && Math.abs(centerY - y) < halfHeight) {
        return true;
      }
    }

    return false;
  }

  collidesWithNPC(x, y, ignoreNPCId = null) {
    for (const npc of this.world.npcs || []) {
      if (npc.id === ignoreNPCId) continue;
      if (Math.hypot(npc.x - x, npc.y - y) < 0.58) return true;
    }

    return false;
  }

  canWalk(x, y, options = {}) {
    if (!this.isInsideWorld(x, y)) return false;

    const tile = this.tileAt(x, y);
    if (!tile || BLOCKING_TILES.has(tile)) return false;
    if (this.collidesWithStaticObject(x, y)) return false;

    if (options.checkNPCs && this.collidesWithNPC(x, y, options.ignoreNPCId)) {
      return false;
    }

    return true;
  }
}

export function isBlockingTile(tile) {
  return BLOCKING_TILES.has(tile);
}

export function isBlockingObjectType(type) {
  return BLOCKING_OBJECT_TYPES.has(type);
}
