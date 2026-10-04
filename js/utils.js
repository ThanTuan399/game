export function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
export function hashSeed(value){let s=String(value||'0');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
export function pick(rng,arr){return arr[Math.floor(rng()*arr.length)]}
export function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
export function lerp(a,b,t){return a+(b-a)*t}
export function fmtTime(minutes){let m=Math.floor(minutes)%1440;let h=Math.floor(m/60);let mm=m%60;return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`}
export function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
export function manhattan(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)}
export function weightedPick(rng,items){let total=items.reduce((s,x)=>s+x.weight,0),r=rng()*total;for(const x of items){r-=x.weight;if(r<=0)return x.value}return items.at(-1).value}
