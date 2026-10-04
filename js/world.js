import {MapGenerator} from './mapGenerator.js';
import {mulberry32,hashSeed,pick,weightedPick} from './utils.js';

export const SEASONS=['Xuân','Hạ','Thu','Đông'];
export const WEATHER=['sunny','cloudy','rain','heavyRain','fog','wind','storm'];

export class World{
  constructor(town,state){this.town=town;this.state=state;this.tileSize=32;this.generator=new MapGenerator(town);this.map=this.generator.generate();this.width=this.map.width;this.height=this.map.height;this.rng=mulberry32(hashSeed(`${town.seed}-${state.day}`));this.discovered=new Set(state.discovered||[]);this.farm=state.farm||{};this.resources=state.resources||{};this.animals=state.animals||[];this.npcs=state.npcs||this.createNPCs();this.specials={};this.buildSpecials()}
  createAnimals(){const out=[];const bx=this.width/2+10,by=this.height/2+8;for(let i=0;i<4;i++)out.push({id:`cow-${i}`,type:'cow',x:bx+(i%2)*2,y:by+Math.floor(i/2)*2,step:0});for(let i=0;i<6;i++)out.push({id:`chicken-${i}`,type:'chicken',x:bx-4+(i%3),y:by+4+Math.floor(i/3),step:0});return out}
  createNPCs(){const list=[['Linh','người bán hạt giống','friendly'],['Ông Tư','nông dân','wise'],['Mai','chủ quán','cheerful'],['Nam','thợ mộc','calm'],['Bà Năm','bán hàng','warm'],['Khoa','người câu cá','quiet'],['An','trẻ em','playful'],['Hùng','người giao hàng','energetic'],['Vy','người bán hoa','sweet'],['Bình','trưởng thị trấn','leader']];const cx=this.width/2,cy=this.height/2;return list.map((v,i)=>({id:`npc-${i}`,name:v[0],job:v[1],personality:v[2],x:cx+(i%4)*3-5,y:cy+Math.floor(i/4)*3-2,home:i%2?'village':'town',friendship:0,step:0,dir:'down',color:i%2?'#c56e57':'#6e78bf'}))}
  buildSpecials(){for(const o of this.map.objects)if(['cave','shrine','lighthouse','pier'].includes(o.type))this.specials[o.type]=o}
  canWalk(x,y){if(x<1||y<1||x>this.width-1||y>this.height-1)return false;const t=this.map.tiles[Math.floor(y)][Math.floor(x)];if(['water','rock'].includes(t))return false;for(const o of this.map.objects){if(Math.abs(o.x+0.5-x)<.55&&Math.abs(o.y+0.5-y)<.55&&['tree','rockObj','house','woodHouse','townhall','market','cafe','playerHouse','barn','cave','shrine','lighthouse'].includes(o.type))return false}return true}
  getObjectNear(x,y,r=1.6){return this.map.objects.find(o=>Math.hypot(o.x+.5-x,o.y+.5-y)<r)}
  getNPCNear(x,y,r=1.8){return this.npcs.find(n=>Math.hypot(n.x-x,n.y-y)<r)}
  isWater(x,y){return this.map.tiles[y]?.[x]==='water'}
  advanceCropDay(weather){for(const key of Object.keys(this.farm)){const f=this.farm[key];if(!f)return; if(weather==='storm')f.watered=true;f.age++;if(f.watered||weather==='rain'||weather==='heavyRain')f.growth=Math.min(f.maxGrowth,(f.growth||0)+1);f.watered=false;}}
  seedFarm(x,y,item){const k=`${x},${y}`;if(this.map.tiles[y]?.[x]!=='soil'||this.farm[k])return false;this.farm[k]={crop:item,growth:0,maxGrowth:5,watered:false,ready:false};return true}
  waterFarm(x,y){const f=this.farm[`${x},${y}`];if(!f)return false;f.watered=true;return true}
  harvestFarm(x,y){const k=`${x},${y}`,f=this.farm[k];if(!f||f.growth<f.maxGrowth)return null;delete this.farm[k];return f.crop}
  fish(x,y){if(!this.isWater(x,y))return null;const common=this.town.crops.includes('seafood')?['shrimp','fish','crab']:['fish','fish','carp'];return weightedPick(this.rng,[...common.map(v=>({value:v,weight:7})),{value:'rareFish',weight:1}])}
  mine(x,y){if(this.map.tiles[y]?.[x]!=='rock')return null;const key=`${x},${y}`;if(this.resources[key])return null;this.resources[key]='ore';return Math.random()<.2?'gem':'stone'}
  cutTree(x,y){const o=this.map.objects.find(v=>v.x===x&&v.y===y&&v.type==='tree');if(!o||this.resources[`${x},${y}`])return null;this.resources[`${x},${y}`]='cut';return Math.random()<.2?'woodHard':'wood'}
  exploreNear(x,y){for(const o of this.map.objects){if(['cave','shrine','lighthouse','pier'].includes(o.type)&&Math.hypot(o.x-x,o.y-y)<2){const id=o.type;if(!this.discovered.has(id)){this.discovered.add(id);return{id,reward:id==='cave'?'gem':id==='shrine'?'rareSeed':id==='lighthouse'?'rareFish':'shell'}}}}return null}
}
