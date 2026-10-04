const KEY='my_little_hometown_save_v3';
export function saveGame(game){const payload={version:3,state:game.state, town:game.town, map:game.world.map, farm:game.world.farm,resources:game.world.resources,animals:game.world.animals,npcs:game.world.npcs,discovered:[...game.world.discovered],player:{x:game.player.x,y:game.player.y,dir:game.player.dir,stamina:game.player.stamina,energy:game.player.energy}};localStorage.setItem(KEY,JSON.stringify(payload));return true}
export function loadGame(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch{return null}}
export function hasSave(){return !!localStorage.getItem(KEY)}
export function clearSave(){localStorage.removeItem(KEY)}
