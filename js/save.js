const KEY = 'my_little_hometown_save_v4';
const LEGACY_KEYS = ['my_little_hometown_save_v3'];
export const SAVE_VERSION = 4;

function safeParse(raw) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function normalizeSave(data) {
  if (!data || !data.town) return null;

  if (data.version === SAVE_VERSION && data.state) return data;

  const oldState = data.state || {};
  return {
    version: SAVE_VERSION,
    migratedFrom: data.version || 3,
    town: data.town,
    state: {
      ...oldState,
      map: oldState.map || data.map,
      farm: oldState.farm || data.farm || {},
      resources: oldState.resources || data.resources || {},
      animals: oldState.animals ?? data.animals ?? null,
      npcs: oldState.npcs || data.npcs || null,
      discovered: oldState.discovered || data.discovered || [],
      player: oldState.player || data.player || null
    }
  };
}

export function saveGame(game) {
  const payload = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    town: game.town,
    state: {
      ...game.state,
      map: game.world.map,
      farm: game.world.farm,
      resources: game.world.resources,
      animals: game.world.animals,
      npcs: game.world.npcs,
      discovered: [...game.world.discovered],
      player: {
        x: game.player.x,
        y: game.player.y,
        dir: game.player.dir,
        stamina: game.player.stamina,
        energy: game.player.energy,
        tool: game.player.tool
      }
    }
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return true;
}

export function loadGame() {
  const current = normalizeSave(safeParse(localStorage.getItem(KEY)));
  if (current) return current;

  for (const legacyKey of LEGACY_KEYS) {
    const legacy = normalizeSave(safeParse(localStorage.getItem(legacyKey)));
    if (legacy) {
      localStorage.setItem(KEY, JSON.stringify(legacy));
      return legacy;
    }
  }
  return null;
}

export function hasSave() {
  if (localStorage.getItem(KEY)) return true;
  return LEGACY_KEYS.some(key => !!localStorage.getItem(key));
}

export function clearSave() {
  localStorage.removeItem(KEY);
  for (const legacyKey of LEGACY_KEYS) localStorage.removeItem(legacyKey);
}
