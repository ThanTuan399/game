const KEY = 'my_little_hometown_save_v5';
const LEGACY_KEYS = ['my_little_hometown_save_v4', 'my_little_hometown_save_v3'];
export const SAVE_VERSION = 5;

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeSave(data) {
  if (!data || !data.town) return null;

  const state = data.state || {};
  const normalized = {
    version: SAVE_VERSION,
    migratedFrom: data.version && data.version !== SAVE_VERSION ? data.version : undefined,
    savedAt: data.savedAt || null,
    town: data.town,
    state: {
      ...state,
      map: state.map || data.map,
      farm: state.farm || data.farm || {},
      resources: state.resources || data.resources || {},
      animals: state.animals ?? data.animals ?? null,
      npcs: state.npcs || data.npcs || null,
      discovered: state.discovered || data.discovered || [],
      player: state.player || data.player || null
    }
  };

  return normalized;
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
        maxStamina: game.player.maxStamina,
        energy: game.player.energy,
        maxEnergy: game.player.maxEnergy,
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
    if (!legacy) continue;

    localStorage.setItem(KEY, JSON.stringify(legacy));
    return legacy;
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
