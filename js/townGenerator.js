import {mulberry32,pick,hashSeed} from './utils.js';

const names=['Bình An','Mộc Lan','Sông Mây','Nhật Hạ','Thanh Xuân','Hoa Sơn','Phú Lộc','Thung Lũng Xanh','Đồng Quê','Lam Giang','Nguyệt Sơn','An Nhiên'];
const adjectives=['Yên Bình','Mộng Mơ','Xanh Ngát','Nắng Mai','Gió Đồng','Mây Trắng','Hương Lúa','Suối Nhỏ'];
const nouns=['Hương','Giang','Sơn','Lộc','Mai','An','Phong','Thảo','Lam','Vân'];

export function createTown(config){
  const seed=hashSeed(config.seed||Date.now());const rng=mulberry32(seed);
  const biome=config.biome||'plains';
  const profiles={
    plains:{name:'Đồng bằng',climate:'tropical',colors:{grass:'#78b96a',dark:'#3d7750'},river:rng()>.35,mountain:rng()>.8,forest:true,beach:false,crops:['rice','corn','carrot','vegetable'],specialPlaces:['market','old_tree','lotus_pond'],architecture:'tile'},
    mountain:{name:'Vùng núi',climate:'cool',colors:{grass:'#6fa47b',dark:'#355f4f'},river:true,mountain:true,forest:true,beach:false,crops:['tea','apple','plum','potato'],specialPlaces:['waterfall','wood_bridge','hidden_cave'],architecture:'wood'},
    rice:{name:'Đồng ruộng',climate:'monsoon',colors:{grass:'#79bf61',dark:'#487c46'},river:true,mountain:false,forest:true,beach:false,crops:['rice','corn','watermelon','vegetable'],specialPlaces:['rice_paddy','lotus_pond','night_market'],architecture:'tile'},
    riverside:{name:'Ven sông',climate:'tropical',colors:{grass:'#70b773',dark:'#3d7351'},river:true,mountain:false,forest:true,beach:false,crops:['mango','coconut','rice','fish'],specialPlaces:['floating_market','boat_pier','hidden_lake'],architecture:'river'},
    beach:{name:'Ven biển',climate:'tropical',colors:{grass:'#79af6b',dark:'#35674d'},river:false,mountain:false,forest:false,beach:true,crops:['coconut','dragonfruit','vegetable','seafood'],specialPlaces:['lighthouse','fishing_village','night_market'],architecture:'coastal'},
    tropical:{name:'Miền nhiệt đới',climate:'tropical',colors:{grass:'#65b768',dark:'#2f704d'},river:true,mountain:false,forest:true,beach:false,crops:['mango','coconut','dragonfruit','chili'],specialPlaces:['banana_grove','secret_forest','old_tree'],architecture:'tile'},
    forest:{name:'Vùng rừng',climate:'cool',colors:{grass:'#5f9f6b',dark:'#2c6248'},river:true,mountain:true,forest:true,beach:false,crops:['apple','plum','tea','potato'],specialPlaces:['ancient_tree','hidden_cave','old_shrine'],architecture:'wood'},
    valley:{name:'Thung lũng',climate:'temperate',colors:{grass:'#7bb578',dark:'#416e4d'},river:true,mountain:true,forest:true,beach:false,crops:['apple','corn','pumpkin','carrot'],specialPlaces:['mountain_lake','old_shrine','flower_field'],architecture:'wood'}
  };
  const p=profiles[biome]||profiles.plains;
  const style=config.style||'village';
  let townName=(config.townName||'').trim();
  if(!townName) townName=rng()<.45?pick(rng,names):`${pick(rng,adjectives)} ${pick(rng,nouns)}`;
  const density=0.8+rng()*0.45;
  return {id:townName.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name:townName,seed,biome,terrain:p.name,climate:p.climate,colors:p.colors,river:p.river,mountain:p.mountain,forest:p.forest,beach:p.beach,crops:p.crops,specialPlaces:p.specialPlaces,architecture:p.architecture,style,density,population:Math.floor(90+rng()*140),rngSeed:seed};
}

export function randomConfig(){const rng=mulberry32(Date.now()>>>0);const biome=pick(rng,['plains','mountain','rice','riverside','beach','tropical','forest','valley']);return{biome,townName:pick(rng,names),seed:String(100000+Math.floor(rng()*899999)),style:pick(rng,['village','storybook','lush','coastal','mountain'])}}
