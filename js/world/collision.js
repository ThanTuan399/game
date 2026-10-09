const BLOCKED_TILES = new Set(['water', 'rock']);

export const BLOCKED_OBJECT_TYPES = new Set([
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

function blocksPoint(object, x, y) {
  return Math.abs(object.x + 0.5 - x) < 0.55
    && Math.abs(object.y + 0.5 - y) < 0.55;
}

function actorBlocksPoint(actor, x, y, ignoreEntityId) {
  if (!actor || actor.id === ignoreEntityId) return false;
  return Math.hypot(actor.x - x, actor.y - y) < 0.48;
}

export function hasBlockingObjectAt(world, x, y) {
  return world.map.objects.some(object => (
    object.x === x
    && object.y === y
    && BLOCKED_OBJECT_TYPES.has(object.type)
  ));
}

export function canWalk(world, x, y, {
  ignoreEntityId = null,
  blockActors = true
} = {}) {
  if (x < 1 || y < 1 || x >= world.width - 1 || y >= world.height - 1) return false;

  const tile = world.map.tiles[Math.floor(y)]?.[Math.floor(x)];
  if (!tile || BLOCKED_TILES.has(tile)) return false;

  for (const object of world.map.objects) {
    if (!BLOCKED_OBJECT_TYPES.has(object.type)) continue;
    if (blocksPoint(object, x, y)) return false;
  }

  if (!blockActors) return true;

  for (const npc of world.npcs || []) {
    if (actorBlocksPoint(npc, x, y, ignoreEntityId)) return false;
  }

  for (const animal of world.animals || []) {
    if (actorBlocksPoint(animal, x, y, ignoreEntityId)) return false;
  }

  return true;
}
