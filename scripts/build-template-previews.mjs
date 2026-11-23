#!/usr/bin/env node
/* Renders a looping preview video for every catalog template using the real template renderer
   (templates.js, including on-device subject segmentation) over the licensed demo footage in assets/demo.
   Output: assets/templates/<id>.mp4 + <id>.jpg (poster).

   Requirements: Google Chrome and FFmpeg. Usage: node scripts/build-template-previews.mjs [templateId ...]
   Frames are decoded with FFmpeg, composited in headless Chrome frame by frame (deterministic), then encoded. */
import http from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(root,'assets','templates');
const CHROME=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W=360,H=640,FPS=24,SECONDS=6;

/* Footage (Mixkit free licence, see assets/demo/CREDITS.md) and demo copy for each template. */
const SHOTS={
 'crimson':{zoom:.74,clip:'vlog.mp4',title:'matter how much',hero:'content',caption:'it does not matter how much content you post'},
 'candlelit':{zoom:.74,clip:'looks.mp4',title:'every move is',hero:'minimal',caption:'keep every move simple and minimal'},
 'motion-deck':{clip:'vlog.mp4',title:'I bet I could do a',hero:'SHORTER',items:['Essay','Draft','Edit','Post'],chips:['Essay','13 rules'],caption:'a lot of people never start'},
 'beat-keyword':{clip:'export.mp4',title:'dressed in',items:['LOVE','BOLD','RED','LOUD'],caption:'dressed in love every single day'},
 'hero-float':{clip:'friends.mp4',title:'Introducing',hero:'Made to glow',cta:'Shop now'},
 'field-journal':{clip:'looks.mp4',hero:'The moments between',caption:'the small moments are the whole story'},
 'editorial':{clip:'friends.mp4',hero:'Nothing extra',lower:'Chapter one',caption:'nothing extra just the two of us'},
 'cinematic-wide':{clip:'friends.mp4',hero:'A different perspective',lower:'Chapter I',caption:'see it from a different angle'},
 'neon-pulse':{clip:'export.mp4',items:['NIGHT','DRIVE','GLOW','LOUD'],caption:'turn it up all night long'},
 'pop-captions':{clip:'vlog.mp4',cta:'Follow for more',caption:'watch this before you post your next video'},
 'documentary':{clip:'vlog.mp4',hero:'Field notes',quote:'Every place keeps a story.',caption:'this is where it all started for me'},
 'quote-card':{clip:'looks.mp4',quote:'Make it simple, but significant.',caption:''}
};

const page=`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000">
<canvas id="c" width="${W}" height="${H}"></canvas>
<script src="/templates-catalog.js"></script><script src="/templates.js"></script>
<script>
const C=ReplotreTemplateCatalog,T=ReplotreTemplates,cv=document.getElementById('c'),ctx=cv.getContext('2d');
const words=(text,start,end)=>{const w=String(text||'').split(/\\s+/).filter(Boolean),step=(end-start)/Math.max(1,w.length);return w.map((x,i)=>({w:x,t:+(start+i*step).toFixed(3),d:+(step*.92).toFixed(3)}))};
function filterFor(g){const p=[\`brightness(\${g.brightness/100}) contrast(\${g.contrast/100}) saturate(\${g.saturation/100})\`];const w=g.warmth;if(w>0)p.push(\`sepia(\${(w/100*.32).toFixed(3)}) saturate(\${(1+w/100*.18).toFixed(3)})\`);else if(w<0)p.push(\`hue-rotate(\${(w/100*-14).toFixed(1)}deg)\`);return p.join(' ')}
window.prepare=(id,shot,duration)=>{
 const beats=[];for(let t=.35;t<duration;t+=.62)beats.push(+t.toFixed(2));
 const inst=C.build(id,{duration,title:shot.title||shot.hero||'',words:words(shot.caption,.4,duration-.2),beats});
 for(const e of inst.elements){
  if(e.type==='headline'){if(shot.hero)e.text=shot.hero;if(shot.title&&shot.hero)e.sub=shot.title;e.start=Math.min(e.start,.25);e.duration=Math.max(e.duration,duration*.6);if(e.position==='upper'&&inst.needsSubject)e.position='top'}
  if(e.type==='keyword'&&shot.items){e.items=shot.items;if(shot.title)e.sub=shot.title}
  if(e.type==='phoneCard'&&id==='motion-deck'){e.text=shot.hero;e.sub=shot.title}
  if(e.type==='phoneCard'&&id==='crimson'){e.start=duration*.5;e.duration=duration*.5}
  if(e.type==='steps'&&shot.items)e.items=shot.items;
  if(e.type==='chips'&&shot.chips)e.items=shot.chips;
  if(e.type==='cta'&&shot.cta)e.text=shot.cta;
  if(e.type==='lowerThird'&&shot.lower)e.text=shot.lower;
  if(e.type==='quote'&&shot.quote){e.text=shot.quote;e.start=Math.min(e.start,duration*.35);e.duration=duration-e.start}
  if(e.type==='glassCard'){e.start=duration*.45;e.duration=duration*.55}
 }
 window.inst=C.sanitize(inst);window.zoom=shot.zoom||1;window.filter=filterFor(window.inst.grade);return window.inst.elements.map(e=>e.type);
};
window.depth=async()=>{await T.loadDepth();return T.segmentation()};
window.frame=(url,time,index)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{
 const z=window.zoom||1,g={iw:img.naturalWidth,ih:img.naturalHeight,w:${W},h:${H},flip:false};const s=Math.max(${W}/g.iw,${H}/g.ih);g.dw=g.iw*s*z;g.dh=g.ih*s*z;g.x=(${W}-g.dw)/2;g.y=z<1?${H}-g.dh:(${H}-g.dh)/2;
 ctx.clearRect(0,0,${W},${H});ctx.save();if(z<1){ctx.filter='blur(14px) '+window.filter;ctx.drawImage(img,-20,-20,${W}+40,${H}+40)}ctx.filter=window.filter;ctx.drawImage(img,g.x,g.y,g.dw,g.dh);ctx.restore();
 const info={w:${W},h:${H},time,template:window.inst,clip:{kind:'image'},src:img,srcKey:'f'+index,geom:g,filter:window.filter,playing:false,exporting:true,fade:0};
 T.drawUnder(ctx,info);T.drawOver(ctx,info);resolve(cv.toDataURL('image/jpeg',.9).slice(23))};img.onerror=reject;img.src=url});
</script>`;

const work=mkdtempSync(path.join(tmpdir(),'tpl-previews-'));
const mime={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.tflite':'application/octet-stream','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(new URL(req.url,'http://x').pathname);
 if(u==='/render')return res.writeHead(200,{'content-type':'text/html'}),res.end(page);
 const file=u.startsWith('/frames/')?path.join(work,u.slice(8)):path.join(root,u);
 if(!file.startsWith(root)&&!file.startsWith(work))return res.writeHead(403),res.end();
 try{const b=readFileSync(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;

const port=9400+Math.floor(Math.random()*400);
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(work,'profile')}`,'--no-first-run','--enable-unsafe-swiftshader','--use-angle=swiftshader','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,seq=0;const pending=new Map();
for(let i=0;i<60&&!ws;i++){try{const t=(await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page');if(t){ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r)}}catch{}if(!ws)await sleep(250)}
if(!ws)throw Error('Could not start Chrome');
ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id)}};
const send=(method,params={})=>new Promise(r=>{const id=++seq;pending.set(id,r);ws.send(JSON.stringify({id,method,params}))});
const ev=async expr=>{const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});if(r.result?.exceptionDetails)throw Error(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text);return r.result.result.value};

try{
 await send('Runtime.enable');await send('Page.navigate',{url:`${base}/render`});await sleep(1500);
 console.log('depth layer:',await ev('depth()'));
 mkdirSync(OUT,{recursive:true});
 const only=process.argv.slice(2);
 for(const [id,shot] of Object.entries(SHOTS)){
  if(only.length&&!only.includes(id))continue;
  const dir=path.join(work,id);mkdirSync(dir,{recursive:true});mkdirSync(path.join(dir,'out'));
  const src=path.join(root,'assets','demo',shot.clip);const clipLen=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',src]).toString());const dur=Math.min(SECONDS,clipLen);
  execFileSync('ffmpeg',['-v','error','-y','-i',src,'-t',String(dur),'-vf',`fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`,'-q:v','2',path.join(dir,'%04d.jpg')]);
  const frames=readdirSync(dir).filter(f=>f.endsWith('.jpg')).sort();
  console.log(id,'elements:',(await ev(`prepare(${JSON.stringify(id)},${JSON.stringify(shot)},${dur})`)).join(','),`(${frames.length} frames)`);
  for(let i=0;i<frames.length;i++){const data=await ev(`frame('/frames/${id}/${frames[i]}',${(i/FPS).toFixed(4)},${i})`);writeFileSync(path.join(dir,'out',frames[i]),Buffer.from(data,'base64'))}
  execFileSync('ffmpeg',['-v','error','-y','-framerate',String(FPS),'-i',path.join(dir,'out','%04d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-preset','slow','-crf','26','-movflags','+faststart','-an',path.join(OUT,`${id}.mp4`)]);
  const posterFrame=frames[Math.min(frames.length-1,Math.round(frames.length*.42))];
  writeFileSync(path.join(OUT,`${id}.jpg`),readFileSync(path.join(dir,'out',posterFrame)));
  console.log('  wrote',`assets/templates/${id}.mp4`);
  rmSync(dir,{recursive:true,force:true});
 }
}finally{chrome.kill();server.close();await sleep(300);rmSync(work,{recursive:true,force:true})}
