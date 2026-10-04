import {clamp,lerp} from './utils.js';
export class Camera{
  constructor(){this.x=0;this.y=0;this.zoom=1;this.w=60;this.h=34}
  update(player,world,dt,viewW=960,viewH=540){
    const t=world.tileSize;
    const targetX=player.x*t-viewW/2;
    const targetY=player.y*t-viewH/2;
    const maxX=Math.max(0,world.width*t-viewW),maxY=Math.max(0,world.height*t-viewH);
    this.x=lerp(this.x,targetX,1-Math.pow(.0001,dt));
    this.y=lerp(this.y,targetY,1-Math.pow(.0001,dt));
    this.x=clamp(this.x,0,maxX);this.y=clamp(this.y,0,maxY);
  }
}
