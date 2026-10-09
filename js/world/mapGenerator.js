import {mulberry32,hashSeed,pick} from '../utils.js';

export class MapGenerator{
  constructor(town){this.town=town;this.rng=mulberry32(town.rngSeed);this.width=140;this.height=90;}
  noise(x,y){const s=Math.sin((x*12.9898+y*78.233)+this.town.rngSeed*0.001)*43758.5453;return s-Math.floor(s)}
  generate(){
    const {width:w,height:h}=this;const tiles=Array.from({length:h},()=>Array(w).fill('grass'));
    const center={x:Math.floor(w/2),y:Math.floor(h/2)};
    // broad biome base
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const n=this.noise(x,y); if(this.town.beach && y>h*.73 && n>.45) tiles[y][x]='sand';
      if(this.town.mountain && y<h*.28 && n>.23) tiles[y][x]='rock';
      if(this.town.forest && n>.82) tiles[y][x]='forest';
    }
    // river / lake
    if(this.town.river){
      let cx=center.x+(this.rng()-.5)*22;for(let y=0;y<h;y++){cx+=Math.sin(y*.17+this.town.rngSeed)*.34;for(let dx=-2;dx<=2;dx++){const x=Math.floor(cx+dx);if(x>=0&&x<w)tiles[y][x]='water'}}
    } else if(this.town.beach){for(let y=Math.floor(h*.84);y<h;y++)for(let x=0;x<w;x++)tiles[y][x]='water'}
    // roads
    for(let x=2;x<w-2;x++){tiles[Math.floor(center.y)][x]='path';if(x%2===0&&this.noise(x,center.y)>.55)tiles[Math.floor(center.y)+1][x]='path'}
    for(let y=2;y<h-2;y++)tiles[y][center.x]='path';
    // farm meadow near home
    for(let y=center.y+10;y<center.y+26;y++)for(let x=center.x-21;x<center.x+5;x++) if(tiles[y][x]==='grass')tiles[y][x]='soil';
    // flower dots and soil patches
    const objects=[];
    const block=(x,y,type,extra={})=>objects.push({x,y,type,...extra});
    // town buildings
    block(center.x,center.y-7,'townhall',{name:'Town Hall'});
    block(center.x+8,center.y-4,'market',{name:'Chợ Mây'});
    block(center.x-10,center.y-4,'cafe',{name:'Quán Cây Xanh'});
    block(center.x-8,center.y+7,'playerHouse',{name:'Nhà Của Bạn'});
    block(center.x+11,center.y+8,'barn',{name:'Kho Nông Trại'});
    for(let i=0;i<7;i++){const bx=center.x-28+Math.floor(this.rng()*56),by=center.y-18+Math.floor(this.rng()*37);if(Math.abs(bx-center.x)<13)continue;if(tiles[by]?.[bx]==='water')continue;block(bx,by,pick(this.rng,['house','house','house','woodHouse']),{name:'Nhà Dân'});}
    // special places at borders
    if(this.town.specialPlaces.includes('hidden_cave')||this.town.mountain)block(w-11,12,'cave',{name:'Hang Bí Mật'});
    if(this.town.specialPlaces.includes('old_shrine'))block(12,10,'shrine',{name:'Miếu Cây Cổ'});
    if(this.town.specialPlaces.includes('lighthouse'))block(w-13,h-15,'lighthouse',{name:'Hải Đăng'});
    if(this.town.specialPlaces.includes('boat_pier')||this.town.beach)block(center.x+5,h-12,'pier',{name:'Bến Thuyền'});
    // trees, rocks, decoration
    const occupied=new Set(objects.map(o=>`${o.x},${o.y}`));
    for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
      if(occupied.has(`${x},${y}`))continue;const t=tiles[y][x];
      if(t==='grass'||t==='forest'){
        const n=this.noise(x*2,y*2);
        if(n>.88)block(x,y,'tree',{variant:Math.floor(n*5)});
        else if(n>.845)block(x,y,'bush',{variant:Math.floor(n*4)});
        else if(n>.975)block(x,y,'flower',{variant:Math.floor(n*6)});
      } else if(t==='rock'&&this.noise(x+3,y+9)>.74)block(x,y,'rockObj');
    }
    return {width:w,height:h,tiles,objects,spawn:{x:center.x-2,y:center.y+12}};
  }
}
