/* Seven independent, deterministic backdrop pipelines. All coordinates use 960×540.
   Foreground art is a separate transparent SVG and never enters the generators. */
const W = 960, H = 540;
const concepts = [
  {id:'silhouette',title:'Emberwood',subtitle:'Layered silhouettes / atmospheric depth',tag:'BONFIRE MOOD',line:'Quiet pines frame the campfire. The middle stays clear for the cast.',source:'Custom Canvas 2D',link:'https://github.com/rough-stuff/rough'},
  {id:'papercut',title:'Paper Hills',subtitle:'Cut paper shapes / soft shadows',tag:'STORYBOOK',line:'Large, simple shapes echo the paper and crayon work already in v3.',source:'Layered vector shapes',link:'https://github.com/paperjs/paper.js'},
  {id:'contours',title:'The Winding Vale',subtitle:'Contour field / seeded elevation',tag:'TERRAIN',line:'Topographic bands give the LLM a natural way to vary land and river.',source:'Noise + contour lines',link:'https://github.com/d3/d3-contour'},
  {id:'watercolor',title:'Mosslight Marsh',subtitle:'Pigment dabs / feathered washes',tag:'PAINTERLY',line:'Loose washes make a softer home for doodled characters and animals.',source:'Particle brush',link:'https://github.com/processing/p5.js'},
  {id:'nocturne',title:'Firefly Night',subtitle:'Luminous particles / dark silhouettes',tag:'NIGHT SCENE',line:'A darker scene lets the fire, windows, and tiny lights carry the story.',source:'Seeded particle field',link:'https://github.com/pixijs/pixijs'},
  {id:'mosaic',title:'Faceted Morning',subtitle:'Low-poly facets / mineral palette',tag:'GRAPHIC',line:'A graphic world with easy color and shape controls for each biome.',source:'Triangular mesh',link:'https://github.com/qrohlf/trianglify'},
  {id:'ink',title:'The Inked Grove',subtitle:'Crosshatch / irregular pen marks',tag:'HAND DRAWN',line:'Handmade outlines and hatching match the kid-drawn hero most closely.',source:'Seeded sketch strokes',link:'https://github.com/rough-stuff/rough'}
];
const sceneBrief = {seed:31415,mood:'dusk',biome:'forest',landmarks:['clearing']};
const gallery = document.querySelector('#gallery');
const lightbox = document.querySelector('#lightbox');
let activeDetail = null;

function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rr(r,a,b){return a+r()*(b-a)}
function pick(r,a){return a[Math.floor(r()*a.length)]}
function rgba(hex,a){let n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function fill(ctx,color){ctx.fillStyle=color;ctx.fillRect(0,0,W,H)}
function gradient(ctx,top,bottom){let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);fill(ctx,g)}
function circ(ctx,x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function ellipse(ctx,x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function poly(ctx,pts,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fill()}
function line(ctx,pts,c,w=1){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke()}
function hill(ctx,r,y,amp,c,frequency=4,offset=0){let pts=[[-5,H+5],[-5,y]];for(let x=0;x<=W+20;x+=16){let v=Math.sin(x/W*Math.PI*frequency+offset)*amp*.38+Math.sin(x/W*Math.PI*(frequency*.47)+offset*1.7)*amp*.5+(r()-.5)*amp*.08;pts.push([x,y+v])}pts.push([W+5,H+5]);poly(ctx,pts,c)}
function smoothHill(ctx,y,amp,c,phase=0){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,y);for(let x=0;x<=W;x+=8)ctx.lineTo(x,y+Math.sin(x*.008+phase)*amp+Math.sin(x*.017+phase*1.3)*amp*.34);ctx.lineTo(W,H);ctx.fill()}
function tree(ctx,x,y,s,c,kind='pine'){ctx.save();ctx.translate(x,y);ctx.scale(s,s);if(kind==='pine'){poly(ctx,[[-24,0],[0,-116],[25,0]],c);poly(ctx,[[-31,-1],[0,-86],[32,-1]],c);ctx.fillStyle=c;ctx.fillRect(-5,-2,10,24)}else{ctx.fillStyle=c;ctx.fillRect(-5,-54,10,67);for(const [a,b,rad]of [[0,-71,32],[-19,-54,25],[19,-55,27]])circ(ctx,a,b,rad,c)}ctx.restore()}
function glow(ctx,x,y,r,c){let g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,rgba('#ffffff',0));circ(ctx,x,y,r,g)}
function starfield(ctx,r,n,c){for(let i=0;i<n;i++){let x=rr(r,15,945),y=rr(r,20,310),rad=rr(r,.6,2.2);circ(ctx,x,y,rad,c)}}
function bottomTexture(ctx,r,c,n=160){for(let i=0;i<n;i++){let x=rr(r,0,W),y=rr(r,430,H),len=rr(r,1,5);line(ctx,[[x,y],[x+rr(r,-2,2),y-len]],c,rr(r,.6,1.5))}}
function sky(ctx,kind){let palettes={dusk:['#aebfc4','#f1cfad'],day:['#b8d6cf','#f7e7c4'],night:['#263e58','#617089']};gradient(ctx,...palettes[kind])}
function sun(ctx,kind,x,y,radius){let color=kind==='night'?'#f5e8c0':'#f7d99c';glow(ctx,x,y,radius*3,rgba(color,kind==='night'?.22:.4));circ(ctx,x,y,radius,color)}
function path(ctx,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(352,H);ctx.bezierCurveTo(405,451,580,464,622,425);ctx.bezierCurveTo(560,460,659,498,685,H);ctx.fill()}

function silhouette(ctx,r,b){sky(ctx,b.mood);sun(ctx,b.mood,502,177,b.mood==='night'?39:59);
  for(let i=0;i<5;i++){let y=295+i*29;hill(ctx,r,y,22+i*5,['#b6c6bc','#a5b5a9','#8da697','#668575','#3e6958'][i],3+i*.32,i*.8)}
  for(let layer=0;layer<3;layer++){let count=18+layer*9;for(let i=0;i<count;i++){let x=i*W/count+rr(r,-20,20),base=353+layer*38+rr(r,-12,14);if(x>310&&x<690&&layer>0)continue;tree(ctx,x,base,rr(r,.38,.8)+layer*.15,['#6f9281','#4a7666','#285c4d'][layer])}}
  hill(ctx,r,459,10,'#275745',3,1);path(ctx,r,'#918d70');bottomTexture(ctx,r,'#4d785f',250);
  for(let i=0;i<16;i++)circ(ctx,rr(r,50,905),rr(r,298,430),rr(r,1,2.5),rgba('#fff1b9',rr(r,.1,.5)));
}
function papercut(ctx,r,b){fill(ctx,b.mood==='night'?'#556987':'#e0e6d6');sun(ctx,b.mood,715,117,56);
  let cols=b.mood==='night'?['#8d9cab','#758da0','#536f80','#395f63','#315449']:['#e7c9a9','#cad5b7','#a4c9ab','#76a98b','#497e67'];
  ctx.shadowColor='#4b534734';ctx.shadowBlur=12;ctx.shadowOffsetY=8;
  for(let i=0;i<5;i++)smoothHill(ctx,272+i*44,25+i*4,cols[i],i*1.3);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  for(let i=0;i<18;i++){let x=rr(r,5,960),y=rr(r,323,469);if(x>345&&x<685&&y>380)continue;tree(ctx,x,y,rr(r,.38,.83),i%3?'#315f50':'#56806d',i%4?'pine':'round')}
  path(ctx,r,'#e4cfaa');for(let i=0;i<56;i++){let x=rr(r,0,960),y=rr(r,458,534);ellipse(ctx,x,y,rr(r,2,5),rr(r,1,2),pick(r,['#d9c276','#f5dba2','#f4eee1']))}
}
function contours(ctx,r,b){fill(ctx,b.mood==='night'?'#647882':'#dce8db');sun(ctx,b.mood,178,100,43);
  const colors=b.mood==='night'?['#91a9a6','#829c9d','#719492','#58827d','#47716b','#3b675c']:['#d8d7b6','#cbd7bd','#bad4bb','#a7cbae','#91bfa4','#72a88c'];
  for(let j=0;j<6;j++){let y=237+j*49;hill(ctx,r,y,20,colors[j],4,.6+j*.3);for(let k=0;k<4;k++){ctx.strokeStyle=rgba('#597f69',.18);ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=960;x+=7){let yy=y+7+k*9+Math.sin(x*.013+j*.8)*13+Math.sin(x*.027+j)*4;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}}
  ctx.fillStyle=b.mood==='night'?'#93b9bc':'#9ad2d1';ctx.beginPath();ctx.moveTo(870,318);ctx.bezierCurveTo(790,379,688,344,625,425);ctx.bezierCurveTo(550,500,778,491,786,540);ctx.lineTo(677,540);ctx.bezierCurveTo(625,494,506,495,570,425);ctx.bezierCurveTo(670,339,754,387,828,319);ctx.fill();
  for(let i=0;i<26;i++){let x=rr(r,0,960),y=rr(r,304,469);if(x>420&&x<800&&y>372)continue;tree(ctx,x,y,rr(r,.22,.58),pick(r,['#4b816d','#5c9679','#457e70']))}bottomTexture(ctx,r,'#6b9b7e',110);
}
function watercolor(ctx,r,b){fill(ctx,b.mood==='night'?'#d2d9d9':'#faf0de');let colors=b.mood==='night'?['#7e9daa','#799ca0','#7a9d8c','#547b74']:['#b4cdd2','#e4c7aa','#b1c8a7','#8db89c'];
  ctx.globalAlpha=.12;for(let i=0;i<1800;i++){let x=rr(r,-20,980),y=rr(r,0,540),rad=rr(r,8,35);circ(ctx,x,y,rad,pick(r,colors))}ctx.globalAlpha=1;
  glow(ctx,749,150,130,rgba('#f6dfad',.32));circ(ctx,749,150,50,b.mood==='night'?'#e4e6dc':'#f6dfbd');
  for(let layer=0;layer<4;layer++){let y=293+layer*59,base=colors[layer];ctx.globalAlpha=.33;for(let k=0;k<4;k++)smoothHill(ctx,y+rr(r,-6,6),rr(r,15,28),base,layer+k*.07);ctx.globalAlpha=1}
  for(let i=0;i<45;i++){let x=rr(r,0,960),y=rr(r,337,492),s=rr(r,.25,.66);if(x>370&&x<672&&y>405)continue;ctx.globalAlpha=.27;for(let p=0;p<4;p++)tree(ctx,x+rr(r,-6,6),y+rr(r,-5,5),s,pick(r,['#4d796b','#73957b','#638875']),'round');ctx.globalAlpha=.7;tree(ctx,x,y,s*.65,'#587a67','round');ctx.globalAlpha=1}
  ellipse(ctx,498,507,320,37,rgba('#e2cdb0',.7));for(let i=0;i<180;i++){let x=rr(r,0,960),y=rr(r,360,540);circ(ctx,x,y,rr(r,.5,2),rgba('#567b71',rr(r,.05,.3)))}
}
function nocturne(ctx,r,b){gradient(ctx,b.mood==='day'?'#5c8294':'#182b46',b.mood==='day'?'#a2b2a6':'#456272');sun(ctx,b.mood,735,126,41);starfield(ctx,r,b.mood==='day'?22:85,'#f4e7bd');
  for(let i=0;i<4;i++)smoothHill(ctx,283+i*43,32,['#657e85','#536f75','#3a6068','#315961'][i],i*.9);
  glow(ctx,520,435,160,rgba('#f6ad60',.22));for(let layer=0;layer<3;layer++)for(let i=0;i<22;i++){let x=rr(r,0,960),y=332+layer*52+rr(r,-10,18);if(x>330&&x<690&&layer>0)continue;tree(ctx,x,y,rr(r,.42,.93),['#345c64','#244d55','#173e46'][layer])}
  hill(ctx,r,466,9,'#183f44',3,1);path(ctx,r,'#635f60');for(let i=0;i<58;i++){let x=rr(r,20,940),y=rr(r,275,469);if(x>735&&y>330)continue;let size=rr(r,1,3);glow(ctx,x,y,size*6,rgba('#eddfa0',.1));circ(ctx,x,y,size,rgba('#f4e6a6',rr(r,.35,.85)))}
  bottomTexture(ctx,r,'#496561',130);
}
function mosaic(ctx,r,b){fill(ctx,b.mood==='night'?'#9aaeba':'#dce4cf');let colors=b.mood==='night'?['#9eafb4','#8ca3aa','#798f9b','#708e8c','#5f797b']:['#e4dac0','#d2d5b9','#b5ccb2','#93bda4','#71a48b'];
  sun(ctx,b.mood,716,117,47);let points=[];for(let y=226;y<=570;y+=42){let row=[];for(let x=-50;x<=1010;x+=70)row.push([x+rr(r,-27,27),y+rr(r,-16,16)+Math.sin(x*.008)*18]);points.push(row)}
  for(let j=0;j<points.length-1;j++)for(let i=0;i<points[j].length-1;i++){let a=points[j][i],d=points[j+1][i+1],bb=points[j][i+1],c=points[j+1][i];poly(ctx,[a,bb,d],pick(r,colors.slice(Math.min(4,Math.floor(j/2)))));poly(ctx,[a,c,d],pick(r,colors.slice(Math.min(4,Math.floor(j/2)))))}
  for(let i=0;i<23;i++){let x=rr(r,0,960),y=rr(r,336,481);if(x>310&&x<680&&y>389)continue;let s=rr(r,.3,.75);poly(ctx,[[x,y-100*s],[x-25*s,y],[x+27*s,y]],pick(r,['#3b7468','#4e8b72','#6b9880']))}
  path(ctx,r,'#ddd3b4');for(let i=0;i<75;i++){let x=rr(r,0,960),y=rr(r,434,535);poly(ctx,[[x,y],[x+rr(r,3,11),y+1],[x+2,y+rr(r,2,6)]],rgba('#faf2d1',rr(r,.25,.65)))}
}
function ink(ctx,r,b){fill(ctx,b.mood==='night'?'#d5ddd7':'#f5efdF');let wash=b.mood==='night'?'#b9c8bf':'#e9dabb';smoothHill(ctx,260,31,wash,1);smoothHill(ctx,329,29,b.mood==='night'?'#9ab5a8':'#c4d3b2',.4);smoothHill(ctx,398,20,b.mood==='night'?'#719d87':'#93ba91',1.7);
  sun(ctx,b.mood,737,112,41);ctx.strokeStyle='#657c68';ctx.lineWidth=1.3;for(let i=0;i<13;i++){let y=322+i*8;ctx.beginPath();for(let x=0;x<=960;x+=13){let yy=y+Math.sin(x*.012+i*.17)*12;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}
  for(let i=0;i<30;i++){let x=rr(r,0,960),y=rr(r,325,488),s=rr(r,.35,.85);if(x>325&&x<680&&y>385)continue;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.strokeStyle='#365c48';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(0,-89);ctx.moveTo(0,-38);ctx.lineTo(-21,-57);ctx.moveTo(0,-50);ctx.lineTo(20,-69);ctx.stroke();ctx.fillStyle=i%3?'#86ae84':'#6c9d78';for(let j=0;j<4;j++){let xx=[0,-21,20,0][j],yy=[-91,-65,-72,-53][j],radius=[25,17,17,24][j];ctx.beginPath();ctx.ellipse(xx+rr(r,-2,2),yy+rr(r,-2,2),radius,radius*.77,0,0,Math.PI*2);ctx.fill();ctx.stroke();for(let k=-radius+4;k<radius;k+=7){line(ctx,[[xx+k,yy+8],[xx+k+11,yy-10]],rgba('#476c54',.36),1)}}ctx.restore()}
  path(ctx,r,'#e1d4b2');for(let i=0;i<190;i++){let x=rr(r,0,960),y=rr(r,422,540);line(ctx,[[x,y],[x+rr(r,-4,5),y-rr(r,2,8)]],rgba('#365c48',rr(r,.19,.48)),rr(r,.5,1.2))}
}
const renderers={silhouette,papercut,contours,watercolor,nocturne,mosaic,ink};
function sceneFeatures(ctx,r,b){
  if(b.biome==='marsh'){
    for(let i=0;i<5;i++){let x=rr(r,15,910),y=rr(r,473,525);ellipse(ctx,x,y,rr(r,18,65),rr(r,3,9),rgba('#8bc0b9',.55))}
    for(let i=0;i<34;i++){let x=rr(r,0,960),y=rr(r,448,530);if(x>170&&x<690)continue;line(ctx,[[x,y],[x+rr(r,-5,5),y-rr(r,13,28)]],rgba('#416d5b',.65),1.8);ellipse(ctx,x,y-rr(r,18,31),2.3,6,'#927a57')}
  }else if(b.biome==='highlands'){
    for(let i=0;i<17;i++){let x=rr(r,0,960),y=rr(r,449,528);if(x>180&&x<690)continue;let size=rr(r,8,26);poly(ctx,[[x-size,y],[x-size*.35,y-size],[x+size*.5,y-size*.72],[x+size,y]],pick(r,['#82968c','#9aa99d','#718d81']))}
  }else if(b.biome==='meadow'){
    for(let i=0;i<76;i++){let x=rr(r,0,960),y=rr(r,450,535);let c=pick(r,['#e9d3a2','#f1bba6','#efe5c7']);circ(ctx,x,y,rr(r,1.3,3),c);line(ctx,[[x,y+1],[x,y+rr(r,4,10)]],rgba('#59846a',.7),1)}
  }
  if(b.landmarks.includes('river')){
    ctx.fillStyle=rgba('#9bcac9',.9);ctx.beginPath();ctx.moveTo(958,375);ctx.bezierCurveTo(839,413,886,456,754,490);ctx.bezierCurveTo(710,503,704,523,684,540);ctx.lineTo(823,540);ctx.bezierCurveTo(830,512,871,505,912,482);ctx.bezierCurveTo(958,450,1000,429,990,389);ctx.fill();
    line(ctx,[[859,452],[833,462],[801,473]],rgba('#eff7de',.62),2);
  }else if(b.landmarks.includes('stones')){
    for(let i=0;i<4;i++){let x=60+i*31,y=452+rr(r,-5,7),h=rr(r,32,62);poly(ctx,[[x-10,y],[x-12,y-h+6],[x-4,y-h],[x+10,y-h+4],[x+12,y]],'#87968a');line(ctx,[[x-11,y],[x-12,y-h+6],[x-4,y-h]],'#536b63',2)}
  }
}
function render(canvas,id){let dpr=Math.min(devicePixelRatio||1,2),width=Math.round(W*dpr),height=Math.round(H*dpr);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}let ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);renderers[id](ctx,rng(sceneBrief.seed^hash(id)),sceneBrief);sceneFeatures(ctx,rng(sceneBrief.seed^hash(id+'features')),sceneBrief)}
function card(c,i){let el=document.createElement('article');el.className='scene-card';el.innerHTML=`<div class="scene-header"><span class="scene-number">${String(i+1).padStart(2,'0')}</span><div class="scene-heading"><h2>${c.title}</h2><p>${c.subtitle}</p></div><span class="scene-badge">${c.tag}</span></div><div class="scene-view with-cast"><canvas role="img" aria-label="${c.title} procedurally generated landscape"></canvas><canvas class="prop-layer" aria-hidden="true"></canvas><img src="pip-fire.svg" alt=""></div><div class="scene-footer"><p>${c.line}</p><button type="button" aria-label="Open ${c.title} larger">View scene ↗</button></div><div class="scene-tech"><span>PIPELINE · ${c.source}</span><a href="${c.link}" target="_blank" rel="noopener noreferrer" aria-label="${c.title} pipeline inspiration on GitHub">Inspiration ↗</a></div>`;if(c.id==='silhouette'){let link=document.createElement('a');link.href='emberwood-transitions/';link.className='season-callout';link.textContent='Explore the four-season walk →';el.append(link)}el.querySelector('button').addEventListener('click',()=>openDetail(c));return el}
function renderV3Props(canvas){let dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;let ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);if(!window.PROPS||!window.SK)return;const place=(kind,x,feet,scale,seed)=>{let def=window.PROPS[kind];ctx.save();ctx.translate(x-def.w*scale/2,feet-def.h*scale);ctx.scale(scale,scale);def.draw(ctx,def.w,def.h,SK.rng(seed),kind);ctx.restore()};place('pig',193,467,.4,41);place('pig',274,460,.51,77);place('pig',350,468,.39,103);place('brickhouse',790,466,.58,211)}
function renderAll(){document.querySelectorAll('.scene-card').forEach((el,i)=>{render(el.querySelector('canvas'),concepts[i].id);renderV3Props(el.querySelector('.prop-layer'))});if(activeDetail){render(document.querySelector('.detail-scene canvas'),activeDetail.id);renderV3Props(document.querySelector('.detail-scene .prop-layer'))}}
for(let i=0;i<concepts.length;i++)gallery.append(card(concepts[i],i));renderAll();
document.querySelector('#seed').addEventListener('change',e=>{sceneBrief.seed=(Number(e.target.value)||0)>>>0;renderAll()});
document.querySelector('#reroll').addEventListener('click',()=>{sceneBrief.seed=Math.floor(Math.random()*1000000);document.querySelector('#seed').value=sceneBrief.seed;renderAll()});
document.querySelector('#mood').addEventListener('change',e=>{sceneBrief.mood=e.target.value;renderAll()});
function applyBrief(value){
  let words=value.toLowerCase();
  sceneBrief.mood=/night|moon|midnight|dark/.test(words)?'night':/day|morning|sunny|noon/.test(words)?'day':'dusk';
  sceneBrief.biome=/marsh|swamp|wetland|bog/.test(words)?'marsh':/mountain|highland|cliff|rocky/.test(words)?'highlands':/meadow|field|grassland/.test(words)?'meadow':'forest';
  sceneBrief.landmarks=[/river|stream|lake|water/.test(words)?'river':/stone|ruin|monolith/.test(words)?'stones':'clearing'];
  document.querySelector('#mood').value=sceneBrief.mood;
  document.querySelector('#brief-result').textContent=`${sceneBrief.biome[0].toUpperCase()+sceneBrief.biome.slice(1)} · ${sceneBrief.landmarks[0]} · ${sceneBrief.mood}`;
  renderAll();
}
document.querySelector('#brief-form').addEventListener('submit',e=>{e.preventDefault();applyBrief(document.querySelector('#brief').value)});
document.querySelector('#cast').addEventListener('change',e=>{document.querySelectorAll('.scene-view,.detail-scene').forEach(el=>el.classList.toggle('with-cast',e.target.checked))});
function openDetail(c){activeDetail=c;document.querySelector('#lightbox-content').innerHTML=`<h2 class="detail-title">${c.title}</h2><div class="detail-scene ${document.querySelector('#cast').checked?'with-cast':''}"><canvas role="img" aria-label="${c.title} enlarged landscape"></canvas><canvas class="prop-layer" aria-hidden="true"></canvas><img src="pip-fire.svg" alt=""></div><div class="detail-foot"><p>${c.line} Change the seed or mood in the gallery and this scene updates too.</p><a href="${c.link}" target="_blank" rel="noopener noreferrer">Pipeline inspiration ↗</a></div>`;render(document.querySelector('.detail-scene canvas'),c.id);renderV3Props(document.querySelector('.detail-scene .prop-layer'));lightbox.showModal()}
document.querySelector('#close').addEventListener('click',()=>lightbox.close());lightbox.addEventListener('close',()=>{activeDetail=null});lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close()});
const params=new URLSearchParams(location.search);if(params.has('seed')){sceneBrief.seed=(Number(params.get('seed'))||0)>>>0;document.querySelector('#seed').value=sceneBrief.seed;renderAll()}if(params.has('brief')){document.querySelector('#brief').value=params.get('brief').slice(0,120);applyBrief(document.querySelector('#brief').value)}
