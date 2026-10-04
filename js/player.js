import {clamp,rectsOverlap} from './utils.js';
export class Player{
  constructor(name,spawn){this.name=name||'Minh';this.x=spawn.x+0.5;this.y=spawn.y+0.5;this.speed=3.3;this.runSpeed=5.4;this.dir='down';this.stamina=100;this.maxStamina=100;this.anim=0;this.step=0;this.tool='hand';this.energy=100}
  update(dt,input,world){let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0);if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;this.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');const run=input.run&&this.stamina>0;const s=(run?this.runSpeed:this.speed)*dt; if(world.canWalk(this.x+dx*s,this.y))this.x+=dx*s;if(world.canWalk(this.x,this.y+dy*s))this.y+=dy*s;this.anim+=dt*(run?11:7);this.step=Math.floor(this.anim)%4;if(run)this.stamina=Math.max(0,this.stamina-dt*25);else this.stamina=Math.min(100,this.stamina+dt*18)} else {this.stamina=Math.min(100,this.stamina+dt*12);this.step=0}}
  get tile(){return{x:Math.floor(this.x),y:Math.floor(this.y)}}
}
