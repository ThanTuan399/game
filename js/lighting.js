export function drawLighting(ctx,time,weather){
  const w=ctx.canvas.clientWidth||window.innerWidth||960;
  const h=ctx.canvas.clientHeight||window.innerHeight||540;
  const day=(time%1440)/1440;let darkness=0;
  if(day<.25)darkness=.44;
  else if(day<.33)darkness=.12;
  else if(day>.75)darkness=.14+((day-.75)/.25)*.42;
  if(weather==='fog')darkness+=.06;
  if(weather==='storm')darkness+=.12;
  darkness=Math.max(0,Math.min(.58,darkness));
  if(darkness>0){ctx.save();ctx.fillStyle=`rgba(24,32,44,${darkness})`;ctx.fillRect(0,0,w,h);ctx.restore()}
  if(day>.70&&day<.84){ctx.save();const g=ctx.createLinearGradient(0,h*.35,0,h);g.addColorStop(0,'rgba(244,154,105,.02)');g.addColorStop(1,'rgba(244,154,105,.13)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore()}
}
