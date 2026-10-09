const PALETTE={
  ink:'#2c322d',
  outline:'#3b3a35',
  grassA:'#79b86a', grassB:'#6cab63', grassC:'#8cc879',
  dirt:'#8b6247', dirtLight:'#ab7b58', dirtDark:'#684935',
  path:'#c79b63', pathLight:'#e0b77b', pathDark:'#a8784d',
  water:'#4a9fba', waterLight:'#79d2d0', waterDark:'#307d9d',
  sand:'#e6cf8d', sandLight:'#f4dfa8',
  rock:'#71807d', rockLight:'#a8b2a8', rockDark:'#4f5d5b',
  leaf:'#2c784f', leaf2:'#3e9660', leaf3:'#66b966', trunk:'#765139', trunkDark:'#553a2c',
  flowerPink:'#ef9cad', flowerYellow:'#f4d56e', flowerBlue:'#93c9e7',
  wood:'#9a6a47', woodLight:'#bf8e59', woodDark:'#6c4735'
};

export class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled=false;
    this.viewWidth=960;this.viewHeight=540;
    this.resize();
    window.addEventListener('resize',()=>this.resize());
  }
  resize(){
    this.viewWidth=window.innerWidth||960;
    this.viewHeight=window.innerHeight||540;
    this.canvas.width=this.viewWidth;
    this.canvas.height=this.viewHeight;
    this.ctx.imageSmoothingEnabled=false;
  }
  clear(c='#7fc8d5'){const {ctx}=this;ctx.fillStyle=c;ctx.fillRect(0,0,this.viewWidth,this.viewHeight)}
  worldToScreen(x,y,camera,t){return{x:x*t-camera.x,y:y*t-camera.y}}
  getViewTiles(){return{cols:Math.ceil(this.viewWidth/32)+3,rows:Math.ceil(this.viewHeight/32)+3}}
  draw(game){
    const ctx=this.ctx,world=game.world,cam=game.camera,t=world.tileSize;
    this.clear();
    this.drawAtmosphere(ctx,game);
    const sx=Math.max(0,Math.floor(cam.x/t)-2), ex=Math.min(world.width,Math.ceil((cam.x+this.viewWidth)/t)+2);
    const sy=Math.max(0,Math.floor(cam.y/t)-2), ey=Math.min(world.height,Math.ceil((cam.y+this.viewHeight)/t)+2);

    for(let y=sy;y<ey;y++) for(let x=sx;x<ex;x++) this.tile(ctx,x,y,world.map.tiles[y][x],t,cam,game);
    this.drawGroundDetails(ctx,game,sx,sy,ex,ey);

    for(const key in world.farm){
      const [fx,fy]=key.split(',').map(Number);
      if(fx>=sx-1&&fx<=ex+1&&fy>=sy-1&&fy<=ey+1)this.crop(ctx,fx,fy,world.farm[key],cam,game);
    }
    for(const a of world.animals||[]){if(a.x<sx-2||a.x>ex+2||a.y<sy-2||a.y>ey+2)continue;this.animal(ctx,a,cam,t)}
    for(const o of world.map.objects){if(o.x<sx-3||o.x>ex+3||o.y<sy-4||o.y>ey+3)continue;this.object(ctx,o,world,cam,game)}
    for(const n of world.npcs){if(n.x<sx-2||n.x>ex+2||n.y<sy-3||n.y>ey+3)continue;this.npc(ctx,n,cam,t)}
    this.player(ctx,game.player,cam,t,game);

    for(const e of game.effects) this.effect(ctx,e);
    game.drawLightingAndWeather();
    this.drawVignette(ctx,game);
  }

  drawAtmosphere(ctx,game){
    const w=this.viewWidth,h=this.viewHeight;
    const m=game.state.timeMinutes%1440, hour=m/60;
    let top='#80cbd9',bottom='#dce9bd';
    if(hour<5){top='#263b55';bottom='#415a64'}
    else if(hour<7){top='#6d91a0';bottom='#e0ae82'}
    else if(hour<10){top='#82c9cf';bottom='#d7e7b9'}
    else if(hour<17){top='#8ed3dd';bottom='#d8e9b9'}
    else if(hour<19){top='#e28d72';bottom='#d6a66c'}
    else {top='#2f455e';bottom='#324f55'}
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    // soft distant hills, visible at map edges when the camera reaches them
    ctx.fillStyle='rgba(74,118,85,.24)';
    for(let i=0;i<6;i++){
      const x=((i*300 + game.town.seed%300)-game.camera.x*.12)%(w+420)-210;
      const y=h*.18+(i%3)*18;
      ctx.beginPath();ctx.moveTo(x,y+120);ctx.quadraticCurveTo(x+90,y,x+180,y+110);ctx.quadraticCurveTo(x+260,y+28,x+360,y+120);ctx.lineTo(x+360,h*.42);ctx.lineTo(x,h*.42);ctx.closePath();ctx.fill();
    }
    const sunX=((hour-6)/14)*w;
    if(hour>=6&&hour<=20){
      ctx.fillStyle=hour<17?'rgba(255,248,205,.9)':'rgba(255,185,119,.72)';
      ctx.fillRect(Math.floor(sunX),52,16,16);ctx.fillRect(Math.floor(sunX)+4,48,8,24);
    }
  }

  tile(ctx,x,y,type,t,cam,game){
    const p=this.worldToScreen(x,y,cam,t),xx=Math.floor(p.x),yy=Math.floor(p.y);
    const town=game.town;
    let base=town.colors?.grass||PALETTE.grassA;
    if(type==='grass'){
      ctx.fillStyle=(x+y)%3===0?PALETTE.grassC:(x*7+y*13)%5===0?PALETTE.grassB:base;ctx.fillRect(xx,yy,t,t);
      this.pixelGrass(ctx,xx,yy,t,x,y,game);
    } else if(type==='water'){
      ctx.fillStyle=PALETTE.water;ctx.fillRect(xx,yy,t,t);
      // ripples + wave highlights
      const drift=((game.state.timeMinutes*2)+(x*9))%t;
      ctx.fillStyle=PALETTE.waterDark;ctx.fillRect(xx,yy,2,t);
      ctx.fillStyle='rgba(190,239,229,.45)';ctx.fillRect(xx+6+drift*.2,yy+7,11,2);ctx.fillRect(xx+17-drift*.15,yy+18,8,2);
    } else if(type==='soil'){
      ctx.fillStyle=PALETTE.dirt;ctx.fillRect(xx,yy,t,t);
      ctx.fillStyle=PALETTE.dirtDark;for(let i=4;i<t;i+=8){ctx.fillRect(xx+2,yy+i,t-4,2)}
      ctx.fillStyle=PALETTE.dirtLight;for(let i=6;i<t;i+=9){ctx.fillRect(xx+6,yy+i,3,1);ctx.fillRect(xx+21,yy+i+2,4,1)}
    } else if(type==='path'){
      ctx.fillStyle=PALETTE.path;ctx.fillRect(xx,yy,t,t);
      ctx.fillStyle=PALETTE.pathDark;for(let i=0;i<4;i++){const px=xx+((x*17+y*11+i*13)%t),py=yy+((x*7+y*19+i*9)%t);ctx.fillRect(px,py,3+(i%2),2)}
      ctx.fillStyle=PALETTE.pathLight;ctx.fillRect(xx+5,yy+6,5,2);ctx.fillRect(xx+20,yy+20,4,2);
    } else if(type==='sand'){
      ctx.fillStyle=PALETTE.sand;ctx.fillRect(xx,yy,t,t);ctx.fillStyle=PALETTE.sandLight;for(let i=0;i<5;i++)ctx.fillRect(xx+((x*11+i*7)%t),yy+((y*13+i*5)%t),2,2)
    } else if(type==='rock'){
      ctx.fillStyle=PALETTE.rock;ctx.fillRect(xx,yy,t,t);ctx.fillStyle=PALETTE.rockDark;ctx.fillRect(xx,yy+t-4,t,4);ctx.fillStyle=PALETTE.rockLight;ctx.fillRect(xx+4,yy+4,13,6);ctx.fillRect(xx+18,yy+10,8,3);ctx.fillStyle=PALETTE.rockDark;ctx.fillRect(xx+9,yy+16,12,4)
    } else if(type==='forest'){
      ctx.fillStyle='#4d8f5d';ctx.fillRect(xx,yy,t,t);ctx.fillStyle='#3c754f';ctx.fillRect(xx,yy+t-5,t,5);this.pixelGrass(ctx,xx,yy,t,x,y,game)
    }
    // water shoreline highlights
    if(type!=='water'){
      const a=game.world.map.tiles[y-1]?.[x],b=game.world.map.tiles[y+1]?.[x],l=game.world.map.tiles[y]?.[x-1],r=game.world.map.tiles[y]?.[x+1];
      if(a==='water'){ctx.fillStyle='rgba(249,231,174,.45)';ctx.fillRect(xx,yy, t,2)}
      if(b==='water'){ctx.fillStyle='rgba(40,118,129,.28)';ctx.fillRect(xx,yy+t-2,t,2)}
      if(l==='water'){ctx.fillStyle='rgba(249,231,174,.4)';ctx.fillRect(xx,yy,2,t)}
      if(r==='water'){ctx.fillStyle='rgba(40,118,129,.28)';ctx.fillRect(xx+t-2,yy,2,t)}
    }
  }

  pixelGrass(ctx,x,y,t,tx,ty,game){
    const n=Math.abs(Math.sin((tx*17+ty*31+game.town.seed)*.01));
    if(n>.35){ctx.fillStyle='rgba(36,108,52,.34)';ctx.fillRect(x+4,y+t-9,2,6);ctx.fillRect(x+8,y+t-7,2,4)}
    if(n>.66){ctx.fillRect(x+24,y+8,2,7);ctx.fillRect(x+27,y+10,2,5)}
    if((tx*13+ty*7)%23===0){ctx.fillStyle=PALETTE.flowerPink;ctx.fillRect(x+14,y+13,3,3);ctx.fillStyle='#fff0b8';ctx.fillRect(x+15,y+14,1,1)}
  }

  drawGroundDetails(ctx,game,sx,sy,ex,ey){
    const world=game.world,t=world.tileSize,cam=game.camera;
    // subtle fences along farm perimeter
    const farmY=Math.floor(world.height/2)+10;
    for(let x=Math.floor(world.width/2)-22;x<Math.floor(world.width/2)+7;x+=2){
      const p=this.worldToScreen(x,farmY-1,cam,t);this.fence(ctx,p.x,p.y,t);
      const p2=this.worldToScreen(x,farmY+26,cam,t);this.fence(ctx,p2.x,p2.y,t);
    }
    // stone stepping markers beside main road
    for(let y=sy;y<ey;y+=5){
      const x=Math.floor(world.width/2)-2;const p=this.worldToScreen(x,y,cam,t);ctx.fillStyle='rgba(89,73,56,.22)';ctx.fillRect(p.x+8,p.y+22,14,3)
    }
  }
  fence(ctx,x,y,t){ctx.fillStyle='rgba(60,43,33,.25)';ctx.fillRect(x+2,y+t-4,t-4,3);ctx.fillStyle=PALETTE.woodDark;ctx.fillRect(x+4,y+7,3,18);ctx.fillRect(x+t-7,y+7,3,18);ctx.fillStyle=PALETTE.woodLight;ctx.fillRect(x+2,y+10,t-4,3);ctx.fillRect(x+2,y+18,t-4,3)}

  object(ctx,o,world,cam,game){
    const t=world.tileSize,p=this.worldToScreen(o.x,o.y,cam,t),x=Math.floor(p.x),y=Math.floor(p.y);ctx.save();
    const shadow=()=>{ctx.fillStyle='rgba(46,36,28,.23)';ctx.beginPath();ctx.ellipse(x+t*.5,y+t*.93,t*.56,t*.16,0,0,Math.PI*2);ctx.fill()};
    if(o.type==='tree'){shadow();this.tree(ctx,x-7,y-24,o,game)}
    else if(o.type==='bush'){shadow();this.bush(ctx,x,y-3,o,game)}
    else if(o.type==='flower')this.flower(ctx,x,y,o)
    else if(['house','woodHouse','playerHouse'].includes(o.type)){shadow();this.house(ctx,x-8,y-24,o,game,1.9)}
    else if(o.type==='townhall'){shadow();this.house(ctx,x-15,y-33,{...o,roof:'#b9584d',wall:'#f2d5a0',door:'#684335',sign:'THỊ TRẤN'},game,2.2)}
    else if(o.type==='market'||o.type==='cafe'||o.type==='barn'){shadow();this.house(ctx,x-9,y-23,{...o,roof:o.type==='cafe'?'#6878ad':'#c86c4f',wall:o.type==='barn'?'#c89554':'#efd29f',door:'#5d3e31',sign:o.type==='market'?'CHỢ':o.type==='cafe'?'QUÁN':'KHO'},game,1.8)}
    else if(o.type==='rockObj'){this.rockObj(ctx,x,y)}
    else if(o.type==='cave'){this.cave(ctx,x,y)}
    else if(o.type==='shrine'){this.shrine(ctx,x,y)}
    else if(o.type==='lighthouse'){this.lighthouse(ctx,x,y)}
    else if(o.type==='pier'){this.pier(ctx,x,y)}
    else if(o.type==='bridge'){this.bridge(ctx,x,y,t)}
    else if(o.type==='lamp'){this.lamp(ctx,x,y,t)}
    else if(o.type==='bench'){this.bench(ctx,x,y,t)}
    else if(o.type==='sign'){this.sign(ctx,x,y,o.label||'')}
    ctx.restore();
  }

  tree(ctx,x,y,o,game){
    ctx.fillStyle=PALETTE.trunkDark;ctx.fillRect(x+19,y+28,9,25);ctx.fillStyle=PALETTE.trunk;ctx.fillRect(x+22,y+23,10,31);
    ctx.fillStyle=PALETTE.outline;
    const blobs=[[13,17,22,16],[24,8,23,17],[34,16,22,18],[20,25,28,18],[6,25,22,14]];
    for(const [bx,by,bw,bh] of blobs)ctx.fillRect(x+bx-2,y+by-2,bw+4,bh+4);
    ctx.fillStyle=PALETTE.leaf;for(const [bx,by,bw,bh] of blobs)ctx.fillRect(x+bx,y+by,bw,bh);
    ctx.fillStyle=PALETTE.leaf2;ctx.fillRect(x+18,y+6,16,9);ctx.fillRect(x+7,y+22,14,9);ctx.fillRect(x+31,y+20,15,10);
    ctx.fillStyle=PALETTE.leaf3;ctx.fillRect(x+22,y+8,9,5);ctx.fillRect(x+12,y+18,7,5);ctx.fillRect(x+36,y+15,7,5);
    if((o.variant||0)%2===0){ctx.fillStyle='#e9a54b';ctx.fillRect(x+17,y+26,4,4);ctx.fillRect(x+38,y+24,4,4)}
  }
  bush(ctx,x,y){ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+2,y+13,30,15);ctx.fillStyle=PALETTE.leaf;ctx.fillRect(x+5,y+8,25,20);ctx.fillStyle=PALETTE.leaf2;ctx.fillRect(x+10,y+4,14,10);ctx.fillStyle='#9ecb63';ctx.fillRect(x+12,y+8,4,4);ctx.fillRect(x+24,y+15,3,3)}
  flower(ctx,x,y,o){ctx.fillStyle='#5b965a';ctx.fillRect(x+15,y+10,2,17);ctx.fillStyle=(o.variant||0)%3===0?PALETTE.flowerPink:(o.variant||0)%3===1?PALETTE.flowerYellow:PALETTE.flowerBlue;ctx.fillRect(x+10,y+6,12,8);ctx.fillRect(x+13,y+3,6,14);ctx.fillStyle='#fff2bc';ctx.fillRect(x+14,y+8,4,4)}

  house(ctx,x,y,o,game,scale=1){
    const w=Math.floor(34*scale),h=Math.floor(31*scale);
    ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+4,y+12,w-8,h-12);
    ctx.fillStyle=o.wall||'#edd09c';ctx.fillRect(x+7,y+14,w-14,h-14);
    // side panels
    ctx.fillStyle='rgba(103,73,48,.16)';ctx.fillRect(x+7,y+25,w-14,3);ctx.fillRect(x+7,y+38,w-14,3);
    // roof with stepped pixel silhouette
    ctx.fillStyle=o.roof||'#b95d45';
    ctx.fillRect(x+3,y+8,w-6,8);ctx.fillRect(x+7,y+4,w-14,6);ctx.fillRect(x+12,y,w-24,6);
    ctx.fillStyle='rgba(255,220,150,.24)';ctx.fillRect(x+9,y+6,w-18,2);
    // door and windows
    ctx.fillStyle='#644334';ctx.fillRect(x+w/2-5,y+h-15,10,15);
    ctx.fillStyle='#c2dfd2';ctx.fillRect(x+11,y+19,8,8);ctx.fillRect(x+w-19,y+19,8,8);
    ctx.fillStyle='#ffe49e';ctx.fillRect(x+13,y+21,4,4);ctx.fillRect(x+w-17,y+21,4,4);
    // porch
    ctx.fillStyle='#8a5e42';ctx.fillRect(x+w/2-9,y+h-5,18,5);ctx.fillStyle='#c29a65';ctx.fillRect(x+w/2-7,y+h-7,14,3);
    if(o.sign){ctx.fillStyle='#fff0c8';ctx.fillRect(x+9,y-5,w-18,5);ctx.fillStyle='#6d4a34';ctx.font='bold 7px monospace';ctx.fillText(o.sign,x+12,y-1)}
  }
  rockObj(ctx,x,y){ctx.fillStyle='rgba(58,53,47,.2)';ctx.fillRect(x+5,y+23,24,5);ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+8,y+11,22,14);ctx.fillStyle=PALETTE.rock;ctx.fillRect(x+7,y+8,20,15);ctx.fillStyle=PALETTE.rockLight;ctx.fillRect(x+11,y+9,11,6);ctx.fillRect(x+22,y+13,4,4);}
  cave(ctx,x,y){ctx.fillStyle='#6f7f72';ctx.fillRect(x+4,y+7,24,22);ctx.fillStyle='#455451';ctx.fillRect(x+7,y+10,18,19);ctx.fillStyle='#273032';ctx.fillRect(x+11,y+16,10,13);ctx.fillStyle='#a8b38b';ctx.fillRect(x+5,y+5,6,6);ctx.fillRect(x+23,y+9,4,5)}
  shrine(ctx,x,y){ctx.fillStyle='#8d6c4a';ctx.fillRect(x+8,y+11,18,18);ctx.fillStyle='#d45d50';ctx.fillRect(x+5,y+7,24,7);ctx.fillStyle='#f0d0a0';ctx.fillRect(x+12,y+16,10,10);ctx.fillStyle='#5b4231';ctx.fillRect(x+16,y+17,3,7)}
  lighthouse(ctx,x,y){ctx.fillStyle='#e6e0ca';ctx.fillRect(x+12,y+3,10,26);ctx.fillStyle='#c9564e';ctx.fillRect(x+10,y+7,14,7);ctx.fillStyle='#ffe18e';ctx.fillRect(x+13,y+9,8,3);ctx.fillStyle='#7b6b55';ctx.fillRect(x+8,y+28,18,4)}
  pier(ctx,x,y){ctx.fillStyle=PALETTE.woodDark;for(let i=0;i<5;i++){ctx.fillRect(x+7+i*5,y+4+i*4,4,28-i*2)}ctx.fillStyle=PALETTE.woodLight;ctx.fillRect(x+4,y+5,22,4)}
  bridge(ctx,x,y,t){ctx.fillStyle='#78543b';ctx.fillRect(x,y+3,t,t-6);ctx.fillStyle='#bc8755';for(let i=2;i<t-2;i+=6)ctx.fillRect(x+i,y+4,3,t-8)}
  lamp(ctx,x,y,t){ctx.fillStyle='#5c4a39';ctx.fillRect(x+15,y+8,3,21);ctx.fillStyle='#f7da8b';ctx.fillRect(x+11,y+3,11,9);ctx.fillStyle='rgba(255,221,130,.2)';ctx.fillRect(x+7,y-1,19,21)}
  bench(ctx,x,y,t){ctx.fillStyle='#6b4a35';ctx.fillRect(x+5,y+12,22,4);ctx.fillRect(x+8,y+17,4,9);ctx.fillRect(x+20,y+17,4,9);ctx.fillStyle='#a9794d';ctx.fillRect(x+6,y+8,20,4)}
  sign(ctx,x,y,label){ctx.fillStyle='#684733';ctx.fillRect(x+15,y+10,3,19);ctx.fillStyle='#dcc187';ctx.fillRect(x+7,y+4,20,11);ctx.fillStyle='#5d4637';ctx.font='bold 6px monospace';ctx.fillText(label.slice(0,8),x+9,y+12)}

  npc(ctx,n,cam,t){
    const p=this.worldToScreen(n.x,n.y,cam,t),x=Math.floor(p.x),y=Math.floor(p.y),bob=n.step%2?1:0;
    ctx.fillStyle='rgba(35,28,24,.24)';ctx.fillRect(x+6,y+24,20,5);
    ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+7,y+8-bob,18,19);
    ctx.fillStyle='#efc39d';ctx.fillRect(x+10,y+2-bob,12,11);
    ctx.fillStyle=n.color||'#c46a5b';ctx.fillRect(x+7,y+14-bob,18,13);
    ctx.fillStyle='#f5dfc0';ctx.fillRect(x+10,y+26-bob,6,7);ctx.fillRect(x+19,y+26-bob,6,7);
    ctx.fillStyle='#49372f';ctx.fillRect(x+9,y+1-bob,14,4);ctx.fillRect(x+8,y+4-bob,4,5);
    ctx.fillStyle='#41332f';ctx.fillRect(x+13,y+7-bob,2,2);ctx.fillRect(x+19,y+7-bob,2,2);
  }

  player(ctx,p,cam,t,game){
    const q=this.worldToScreen(p.x,p.y,cam,t),x=Math.floor(q.x),y=Math.floor(q.y),bob=p.step===1||p.step===3?1:0;
    ctx.fillStyle='rgba(34,27,23,.28)';ctx.fillRect(x+4,y+28,24,6);
    // backpack / body outline
    ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+7,y+8-bob,19,21);
    ctx.fillStyle='#efc59f';ctx.fillRect(x+10,y+2-bob,13,13);
    ctx.fillStyle=game.town.architecture==='coastal'?'#5977c7':'#d87468';ctx.fillRect(x+7,y+15-bob,19,15);
    ctx.fillStyle='#f4dfc2';ctx.fillRect(x+9,y+28-bob,7,6);ctx.fillRect(x+19,y+28-bob,7,6);
    ctx.fillStyle='#4a382e';ctx.fillRect(x+9,y+1-bob,15,5);ctx.fillRect(x+8,y+4-bob,5,8);
    if(p.dir!=='up'){ctx.fillStyle='#3c302c';ctx.fillRect(x+13,y+8-bob,2,2);ctx.fillRect(x+19,y+8-bob,2,2)}
    // animated arm / tool
    if(p.tool!=='hand'){
      ctx.fillStyle='#8b693f';
      if(p.dir==='right')ctx.fillRect(x+25,y+16-bob,10,3);else if(p.dir==='left')ctx.fillRect(x-8,y+16-bob,10,3);else if(p.dir==='up')ctx.fillRect(x+16,y-8-bob,3,10);else ctx.fillRect(x+16,y+28-bob,3,9);
    }
  }

  crop(ctx,x,y,f,cam,game){
    if(!f||f.growth<=0)return;const p=this.worldToScreen(x,y,cam,game.world.tileSize),xx=Math.floor(p.x),yy=Math.floor(p.y),g=Math.min(1,f.growth/f.maxGrowth);
    ctx.fillStyle='rgba(53,40,30,.14)';ctx.fillRect(xx+4,yy+25,24,4);
    const leaf=f.crop==='pumpkin'?'#7caa46':f.crop==='carrot'?'#68a951':'#4a9b55';
    const h=7+Math.floor(g*15);ctx.fillStyle=leaf;ctx.fillRect(xx+14,yy+31-h,4,h);ctx.fillRect(xx+9,yy+30-h,8,4);ctx.fillRect(xx+19,yy+28-h,8,4);
    if(g>.85){ctx.fillStyle=f.crop==='pumpkin'?'#e29a56':f.crop==='carrot'?'#e9a14f':'#e6d66c';ctx.fillRect(xx+11,yy+17,14,11);ctx.fillStyle='rgba(255,241,170,.55)';ctx.fillRect(xx+14,yy+18,5,4)}
    if(f.watered){ctx.fillStyle='rgba(118,202,228,.75)';ctx.fillRect(xx+4,yy+25,5,3);ctx.fillRect(xx+23,yy+24,5,3)}
  }

  animal(ctx,a,cam,t){
    const p=this.worldToScreen(a.x,a.y,cam,t),x=Math.floor(p.x),y=Math.floor(p.y),bob=a.step%2;
    ctx.fillStyle='rgba(35,28,23,.2)';ctx.fillRect(x+4,y+24,24,5);
    if(a.type==='cow'){ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+5,y+10-bob,24,15);ctx.fillStyle='#f0e8d7';ctx.fillRect(x+7,y+9-bob,22,13);ctx.fillStyle='#6c5649';ctx.fillRect(x+9,y+11,5,5);ctx.fillRect(x+22,y+15,5,4);ctx.fillStyle='#d9c1a5';ctx.fillRect(x+25,y+16,5,5);ctx.fillStyle='#5b463a';ctx.fillRect(x+9,y+23,4,8);ctx.fillRect(x+23,y+23,4,8)}
    else{ctx.fillStyle=PALETTE.outline;ctx.fillRect(x+8,y+11,18,13);ctx.fillStyle='#fff1d4';ctx.fillRect(x+10,y+9,15,13);ctx.fillStyle='#cf5b52';ctx.fillRect(x+11,y+7,11,4);ctx.fillStyle='#67433c';ctx.fillRect(x+11,y+22,3,8);ctx.fillRect(x+22,y+22,3,8)}
  }

  effect(ctx,e){
    if(e.type==='spark'){ctx.fillStyle=e.color||'#ffe083';ctx.fillRect(Math.floor(e.x),Math.floor(e.y),4,4);ctx.fillRect(Math.floor(e.x+6),Math.floor(e.y+3),2,2)}
    if(e.type==='heart'){ctx.fillStyle='#f58b9d';ctx.fillRect(e.x,e.y,4,4);ctx.fillRect(e.x+6,e.y,4,4);ctx.fillRect(e.x+2,e.y+4,6,4)}
  }

  drawVignette(ctx,game){
    const w=this.viewWidth,h=this.viewHeight;
    const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(28,31,27,.13)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
}
