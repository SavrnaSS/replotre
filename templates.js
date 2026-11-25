/* Replotre Templates — motion-template renderer, on-device subject segmentation, template panel and gallery.
 * Rendering happens on the preview canvas (and therefore in browser export). Claude plans copy and timing
 * on the server (/api/projects/:id/template); without it the shared catalog lays templates out locally. */
(()=>{
'use strict';
const Catalog=window.ReplotreTemplateCatalog;
const E=()=>window.ReplotreEditor;
const Cloud=()=>window.ReplotreCloud;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const ease=t=>{t=clamp(t);return 1-Math.pow(1-t,3)};
const easeBack=t=>{t=clamp(t);const c=1.6;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
const ico=(n,s)=>window.ReplotreIco?window.ReplotreIco(n,s):'';
const FONT_STACK={
 serif:"'Playfair Display','Didot','Bodoni 72','Bodoni MT',Georgia,'Times New Roman',serif",
 sans:"'Helvetica Neue','Inter',Arial,sans-serif",
 condensed:"'Bebas Neue','Oswald',Impact,'Haettenschweiler','Arial Narrow Bold','Arial Narrow',sans-serif",
 script:"'Snell Roundhand','Apple Chancery','Brush Script MT','Segoe Script',cursive",
 mono:"'SF Mono',Menlo,Consolas,'Courier New',monospace"};
const FONT_WEIGHT={serif:700,sans:800,condensed:400,script:400,mono:600};
const font=(kind,size,{weight,italic}={})=>`${italic?'italic ':''}${weight??FONT_WEIGHT[kind]??700} ${Math.max(1,Math.round(size))}px ${FONT_STACK[kind]||FONT_STACK.sans}`;
const POS_Y={top:.15,upper:.29,center:.5,lower:.7,bottom:.83};
const rgba=(hex,a)=>{const n=parseInt(String(hex||'#ffffff').slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${clamp(a)})`};
const supportsLetterSpacing='letterSpacing' in CanvasRenderingContext2D.prototype;
function spaced(c,v){if(supportsLetterSpacing)c.letterSpacing=v}
function rr(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)}
function envelope(lt,dur,inT=.45,outT=.32){return {p:ease(lt/inT),a:clamp(Math.min(lt/inT*1.6,(dur-lt)/outT))}}
function fitSize(c,lines,kind,maxW,maxSize,opts){let s=maxSize;for(let i=0;i<8;i++){c.font=font(kind,s,opts);const widest=Math.max(...lines.map(l=>c.measureText(l).width),1);if(widest<=maxW)break;s*=maxW/widest*.98}return s}
function wrap(c,text,maxW,maxLines=3){const out=[];for(const para of String(text||'').split('\n')){let line='';for(const word of para.split(/\s+/).filter(Boolean)){const test=line?line+' '+word:word;if(c.measureText(test).width>maxW&&line){out.push(line);line=word}else line=test}if(line)out.push(line)}return out.slice(0,maxLines)}
const cleanWord=w=>String(w).toLowerCase().replace(/[^a-z0-9'’-]/g,'');

/* ---------- On-device subject segmentation (MediaPipe selfie segmenter, vendored) ---------- */
const Seg={status:'idle',segmenter:null,mask:null,maskCtx:null,tmp:null,tmpCtx:null,key:'',lastTs:0,lastRun:0,version:0,error:'',listeners:new Set()};
async function loadSegmenter(){
 if(Seg.status!=='idle')return;Seg.status='loading';notifySeg();
 try{
  const vision=await import('/vendor/mediapipe/vision_bundle.mjs');
  const files=await vision.FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
  const opts=delegate=>({baseOptions:{modelAssetPath:'/vendor/mediapipe/selfie_segmenter.tflite',delegate},runningMode:'VIDEO',outputCategoryMask:false,outputConfidenceMasks:true});
  try{Seg.segmenter=await vision.ImageSegmenter.createFromOptions(files,opts('GPU'))}catch{Seg.segmenter=await vision.ImageSegmenter.createFromOptions(files,opts('CPU'))}
  Seg.status='ready';
 }catch(e){console.warn('Subject segmentation unavailable',e);Seg.status='failed';Seg.error=String(e?.message||e)}
 notifySeg();E()?.redraw?.();
}
function notifySeg(){for(const fn of Seg.listeners)fn(Seg.status);document.querySelectorAll('[data-seg-status]').forEach(el=>{el.dataset.segStatus=Seg.status;el.textContent=segShort();el.title=segLabel()})}
const segShort=()=>({idle:'Depth on demand',loading:'Loading depth…',ready:'Depth ready',failed:'Depth unavailable'}[Seg.status]);
const segLabel=()=>({idle:'Depth layer loads when a template needs it',loading:'Loading on-device depth layer…',ready:'Depth layer ready · runs on this device',failed:'Depth layer unavailable in this browser — elements sit in front'}[Seg.status]);
/** Run segmentation for the current frame. Returns a canvas whose alpha is the person mask in source pixel space. */
function segment(src,key,playing){
 if(Seg.status!=='ready'||!src)return Seg.status==='ready'&&Seg.mask&&Seg.key?Seg.mask:null;
 const now=performance.now();
 if(key===Seg.key&&Seg.mask)return Seg.mask;
 if(playing&&now-Seg.lastRun<30&&Seg.mask)return Seg.mask;
 const iw=src.videoWidth||src.naturalWidth||src.width,ih=src.videoHeight||src.naturalHeight||src.height;if(!iw||!ih)return null;
 try{
  Seg.lastTs=Math.max(Seg.lastTs+1,Math.round(now));Seg.lastRun=now;
  const result=Seg.segmenter.segmentForVideo(src,Seg.lastTs);const m=result?.confidenceMasks?.[0];
  if(!m){result?.close?.();return Seg.mask}
  const mw=m.width,mh=m.height,data=m.getAsFloat32Array();
  if(!Seg.tmp||Seg.tmp.width!==mw||Seg.tmp.height!==mh){Seg.tmp=document.createElement('canvas');Seg.tmp.width=mw;Seg.tmp.height=mh;Seg.tmpCtx=Seg.tmp.getContext('2d');Seg.img=Seg.tmpCtx.createImageData(mw,mh)}
  const px=Seg.img.data;for(let i=0,j=0;i<data.length;i++,j+=4){const v=data[i],a=v<=.3?0:v>=.7?255:Math.round((v-.3)/.4*255);px[j]=px[j+1]=px[j+2]=255;px[j+3]=a}
  Seg.tmpCtx.putImageData(Seg.img,0,0);result.close?.();
  const long=Math.min(512,Math.max(iw,ih)),sw=Math.round(iw/Math.max(iw,ih)*long),sh=Math.round(ih/Math.max(iw,ih)*long);
  if(!Seg.mask||Seg.mask.width!==sw||Seg.mask.height!==sh){Seg.mask=document.createElement('canvas');Seg.mask.width=sw;Seg.mask.height=sh;Seg.maskCtx=Seg.mask.getContext('2d')}
  Seg.maskCtx.clearRect(0,0,sw,sh);Seg.maskCtx.filter='blur(1.2px)';Seg.maskCtx.drawImage(Seg.tmp,0,0,sw,sh);Seg.maskCtx.filter='none';
  Seg.key=key;Seg.version++;return Seg.mask;
 }catch(e){console.warn('Segmentation frame failed',e);Seg.error=String(e?.message||e);return Seg.mask}
}
function drawGeom(c,img,g,sw,sh){c.save();if(g.flip){c.translate(g.w,0);c.scale(-1,1)}c.drawImage(img,0,0,sw||g.iw,sh||g.ih,g.flip?g.w-g.x-g.dw:g.x,g.y,g.dw,g.dh);c.restore()}
let cutCanvas=null;
function subjectCutout(info,mask){
 const {w,h}=info;if(!cutCanvas)cutCanvas=document.createElement('canvas');if(cutCanvas.width!==w||cutCanvas.height!==h){cutCanvas.width=w;cutCanvas.height=h}
 const c=cutCanvas.getContext('2d');c.globalCompositeOperation='source-over';c.filter='none';c.clearRect(0,0,w,h);
 drawGeom(c,mask,info.geom,mask.width,mask.height);
 c.globalCompositeOperation='source-in';c.filter=info.filter&&info.filter!=='none'?info.filter:'none';drawGeom(c,info.src,info.geom);c.filter='none';c.globalCompositeOperation='source-over';
 return cutCanvas;
}

/* ---------- Global treatments ---------- */
const noiseTiles=[];
function noiseTile(i){if(noiseTiles[i])return noiseTiles[i];const n=document.createElement('canvas');n.width=n.height=160;const c=n.getContext('2d'),img=c.createImageData(160,160);for(let k=0;k<img.data.length;k+=4){const v=Math.random()<.5?0:255;img.data[k]=img.data[k+1]=img.data[k+2]=v;img.data[k+3]=Math.random()*70}c.putImageData(img,0,0);return noiseTiles[i]=n}
let scanTile=null;
function drawWash(c,s,w,h,alpha){if(alpha<=.001)return;const g=c.createRadialGradient(w*.5,h*.34,h*.05,w*.5,h*.5,h*.8);g.addColorStop(0,rgba(s.washA,alpha));g.addColorStop(1,rgba(s.washB,Math.min(1,alpha*1.05)));c.fillStyle=g;c.fillRect(0,0,w,h)}
function drawVignette(c,s,w,h){if(s.vignette<=.01)return;const g=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.32,w/2,h/2,Math.hypot(w,h)*.56);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${(s.vignette*.72).toFixed(3)})`);c.fillStyle=g;c.fillRect(0,0,w,h)}
function drawLeak(c,s,w,h,t){if(s.leak<=.01)return;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<2;i++){const x=w*(.15+.7*(.5+.5*Math.sin(t*.23+i*2.1))),y=h*(.2+.6*(.5+.5*Math.cos(t*.17+i*1.3))),r=Math.max(w,h)*(.45+.1*i);const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,${150+i*40},${80+i*20},${(s.leak*.22).toFixed(3)})`);g.addColorStop(1,'rgba(255,120,60,0)');c.fillStyle=g;c.fillRect(0,0,w,h)}c.restore()}
function drawFlicker(c,s,w,h,t){if(!s.flicker)return;const f=.1+.06*Math.sin(t*7.3)*Math.sin(t*3.7+1)+.03*Math.sin(t*17.1);const g=c.createRadialGradient(w*.18,h*.92,0,w*.18,h*.92,h*.75);g.addColorStop(0,`rgba(255,170,90,${clamp(f).toFixed(3)})`);g.addColorStop(1,'rgba(255,140,60,0)');c.save();c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(0,0,w,h);c.restore()}
function drawGrain(c,s,w,h,t,playing){if(s.grain<=.01)return;const tile=noiseTile(playing?Math.floor(t*24)%4:0);c.save();c.globalAlpha=s.grain*.55;const p=c.createPattern(tile,'repeat');c.fillStyle=p;c.translate((t*977)%160,(t*613)%160);c.fillRect(-160,-160,w+320,h+320);c.restore()}
function drawScanlines(c,s,w,h){if(!s.scanlines)return;if(!scanTile){scanTile=document.createElement('canvas');scanTile.width=4;scanTile.height=4;const k=scanTile.getContext('2d');k.fillStyle='rgba(0,0,0,.28)';k.fillRect(0,0,4,1)}c.save();c.fillStyle=c.createPattern(scanTile,'repeat');c.fillRect(0,0,w,h);c.restore()}
function drawLetterbox(c,s,w,h,t){if(s.letterbox<=.001)return;const bar=h*s.letterbox*ease(t/.8);c.fillStyle='#000';c.fillRect(0,0,w,bar);c.fillRect(0,h-bar,w,bar)}

/* ---------- Elements ---------- */
function glassPanel(c,info,x,y,w,h,r,{tint=.14,dark=false,frost=true}={}){
 c.save();rr(c,x,y,w,h,r);c.clip();
 if(frost&&info.src&&info.geom&&(info.template.style.backdrop<.5)){c.filter=`blur(${Math.round(Math.max(8,info.w*.028))}px) ${info.filter&&info.filter!=='none'?info.filter:''}`.trim();drawGeom(c,info.src,{...info.geom,x:info.geom.x-6,y:info.geom.y-6,dw:info.geom.dw+12,dh:info.geom.dh+12});c.filter='none'}
 c.fillStyle=dark?`rgba(12,12,16,${.42+tint})`:`rgba(255,255,255,${tint})`;c.fillRect(x,y,w,h);
 const g=c.createLinearGradient(x,y,x+w*.6,y+h);g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(.45,'rgba(255,255,255,.03)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(x,y,w,h);
 c.restore();c.save();rr(c,x+.5,y+.5,w-1,h-1,r);c.strokeStyle='rgba(255,255,255,.34)';c.lineWidth=Math.max(1,info.w/540);c.stroke();c.restore();
}
function textShadow(c,info,strength=1){const s=info.template.style;c.shadowColor=s.glow>.05?rgba(s.accent,.55*s.glow+.25):'rgba(0,0,0,.45)';c.shadowBlur=(s.glow>.05?28*s.glow:14)*info.w/540*strength;c.shadowOffsetY=s.glow>.05?0:2*info.w/540}

const R={
 headline(c,e,lt,info){const {w,h}=info,s=info.template.style,{a}=envelope(lt,e.duration);if(a<=0)return;
  const kind=s.font,minimal=e.variant==='minimal',outline=e.variant==='outline',emph=new Set(e.emphasis);
  const text=(s.font==='condensed'||minimal)?e.text.toUpperCase():e.text;
  c.save();c.globalAlpha*=a;c.textBaseline='alphabetic';spaced(c,minimal?`${Math.round(w*.018)}px`:'0px');
  c.font=font(kind,h*.1);let lines=wrap(c,text,w*.84,3);const maxSize=(lines.length>1?h*.085:h*.115)*(minimal?.55:1);
  const size=fitSize(c,lines,kind,w*.86,maxSize);c.font=font(kind,size);lines=wrap(c,text,w*.88,3);
  const lh=size*(kind==='condensed'?.98:1.08),total=lines.length*lh,cy=h*POS_Y[e.position],safe=h*(.06+info.template.style.letterbox),subH=e.sub?size*1.05:0;
  let top=cy-total/2+size*.8;top=Math.max(top,safe+subH+size*.8);top=Math.min(top,h-safe-total+size*.8);
  if(e.sub){c.save();spaced(c,'0px');const ss=Math.max(10,size*(minimal?.5:.26));c.font=font('sans',ss,{weight:500});c.textAlign='center';c.fillStyle=rgba(s.ink,.92);textShadow(c,info,.6);const sa=ease((lt-.05)/.5);c.globalAlpha*=sa;c.fillText(e.sub,w/2,top-size*.95-(1-sa)*ss*.6);c.restore()}
  let wi=0;
  lines.forEach((line,li)=>{const words=line.split(' ');const widths=words.map(wd=>{const ac=emph.has(cleanWord(wd))&&s.accentFont!==kind;c.font=ac?font(s.accentFont,size*(s.accentFont==='script'?1.05:1),{italic:s.accentFont==='serif'}):font(kind,size);return c.measureText(wd).width});
   const gap=c.measureText(' ').width,lineW=widths.reduce((x,y)=>x+y,0)+gap*(words.length-1);let x=w/2-lineW/2;const y=top+li*lh;
   words.forEach((wd,i)=>{const t=clamp((lt-.12-wi*.085)/.42),wa=ease(t);wi++;if(wa<=0){x+=widths[i]+gap;return}
    const ac=emph.has(cleanWord(wd));c.save();c.globalAlpha*=wa;c.font=ac&&s.accentFont!==kind?font(s.accentFont,size*(s.accentFont==='script'?1.05:1),{italic:s.accentFont==='serif'}):font(kind,size);c.textAlign='left';
    const dy=(1-wa)*size*.38;textShadow(c,info,e.behind&&s.backdrop>.5?.5:1);
    if(outline&&li%2===1){c.lineWidth=Math.max(1.5,size*.035);c.strokeStyle=ac?s.accent:s.ink;c.shadowBlur=0;c.strokeText(wd,x,y+dy)}else{c.fillStyle=ac?s.accent:s.ink;c.fillText(wd,x,y+dy)}
    c.restore();x+=widths[i]+gap});
  });
  c.restore()},
 keyword(c,e,lt,info){const {w,h}=info,s=info.template.style,{a}=envelope(lt,e.duration,.3,.3);if(a<=0)return;const items=e.items.length?e.items:[e.text||'BOLD'];
  const beats=(e.beats||[]).filter(b=>b>=e.start&&b<=info.time);const idx=Math.max(0,beats.length-1)%items.length;const since=beats.length?info.time-beats[beats.length-1]:lt;const word=items[idx].toUpperCase();
  const punch=1+.14*Math.exp(-since*11);c.save();c.globalAlpha*=a;c.textAlign='center';c.textBaseline='middle';
  const size=fitSize(c,[word],s.font==='script'?'condensed':s.font,w*.92,h*.24);const cy=h*POS_Y[e.position];
  c.translate(w/2,cy);c.scale(punch,punch);c.font=font(s.font==='script'?'condensed':s.font,size);textShadow(c,info,1.2);c.fillStyle=s.accent;c.fillText(word,0,0);c.restore();
  if(e.sub){c.save();c.globalAlpha*=a;c.textAlign='center';c.font=font('sans',Math.max(10,size*.16),{weight:600});c.fillStyle=s.ink;textShadow(c,info,.6);c.fillText(e.sub,w/2,cy-size*.55);c.restore()}},
 glassCard(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.6,.35);if(a<=0)return;
  const cw=w*.8,ts=w*.068;c.font=font(s.font==='condensed'?'condensed':'serif',ts);const lines=wrap(c,e.text,cw*.84,3);const ch=ts*1.25*lines.length+(e.sub?ts*1.1:0)+ts*1.4;
  const x=(w-cw)/2,y=h*POS_Y[e.position]-ch/2+(1-p)*h*.05;c.save();c.globalAlpha*=a;glassPanel(c,info,x,y,cw,ch,w*.045);
  c.textAlign='center';c.textBaseline='alphabetic';let ty=y+ts*1.35;if(e.sub){c.save();spaced(c,`${Math.round(w*.006)}px`);c.font=font('sans',ts*.36,{weight:600});c.fillStyle=rgba(s.accent,.95);c.fillText(e.sub.toUpperCase(),w/2,ty-ts*.25);c.restore();ty+=ts*.85}
  c.font=font(s.font==='condensed'?'condensed':'serif',ts);c.fillStyle=s.ink;lines.forEach((l,i)=>c.fillText(l,w/2,ty+i*ts*1.25));c.restore()},
 phoneCard(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.7,.35);if(a<=0)return;
  const pw=Math.min(w*.58,h*.3),ph=Math.min(pw*1.9,h*.5),x=(w-pw)/2,y=h*POS_Y[e.position]-ph/2+(1-easeBack(lt/.8))*h*.06;
  c.save();c.globalAlpha*=a;c.translate(w/2,y+ph/2);c.scale(.94+.06*p,.94+.06*p);c.translate(-w/2,-(y+ph/2));
  glassPanel(c,info,x,y,pw,ph,pw*.13,{tint:.1,dark:e.variant==='minimal'});
  c.fillStyle='rgba(0,0,0,.55)';rr(c,x+pw*.36,y+pw*.05,pw*.28,pw*.065,pw*.04);c.fill();
  const pad=pw*.1;c.fillStyle=rgba(s.ink,.85);c.beginPath();c.arc(x+pad+pw*.03,y+pw*.2,pw*.03,0,7);c.fill();
  c.font=font('sans',pw*.055,{weight:600});c.textAlign='left';c.fillText(e.sub||'Notes',x+pad+pw*.09,y+pw*.215);
  c.fillStyle=rgba(s.ink,.9);rr(c,x+pw-pad-pw*.18,y+pw*.17,pw*.18,pw*.07,pw*.035);c.fill();
  const shown=Math.floor(Math.max(0,lt-.35)*22),full=e.text||'',txt=full.slice(0,shown),ts=pw*.13;
  const kind=s.font==='script'?'serif':s.font;c.font=font(kind,ts);let lines=wrap(c,full,pw*.8,4);const size=fitSize(c,lines,kind,pw*.8,ts);c.font=font(kind,size);lines=wrap(c,full,pw*.82,4);
  let remaining=txt.length;c.textAlign='center';c.fillStyle=s.ink;const ty=y+ph*.42-(lines.length-1)*size*.55;
  lines.forEach((l,i)=>{if(remaining<=0)return;const part=l.slice(0,remaining);remaining-=l.length+1;c.fillText(part,x+pw/2,ty+i*size*1.1);if(remaining<=0&&Math.floor(info.time*2.4)%2===0){const mw=c.measureText(part).width;c.fillRect(x+pw/2+mw/2+2,ty+i*size*1.1-size*.75,Math.max(1.5,size*.06),size*.85)}});
  const by=y+ph*.78,prog=clamp(lt/(e.duration*.9));c.strokeStyle=rgba(s.ink,.3);c.lineWidth=Math.max(1,pw*.012);c.beginPath();c.moveTo(x+pad,by);c.lineTo(x+pw-pad,by);c.stroke();
  c.strokeStyle=s.ink;c.beginPath();c.moveTo(x+pad,by);c.lineTo(x+pad+(pw-pad*2)*prog,by);c.stroke();c.fillStyle=s.ink;c.beginPath();c.arc(x+pad+(pw-pad*2)*prog,by,pw*.025,0,7);c.fill();
  c.restore()},
 captions(c,e,lt,info){const {w,h}=info,s=info.template.style,t=info.time;const groups=captionGroups(e);if(!groups.length)return;
  const g=groups.find(x=>t>=x.start&&t<x.end+.12);if(!g)return;const emph=new Set(e.emphasis);const v=e.variant==='standard'?'minimal':e.variant;
  const base=w*(v==='box'||v==='outline'?.075:.058),upper=v==='box'||v==='outline';c.save();c.textBaseline='middle';
  const fontFor=(wd,active)=>{const ac=emph.has(cleanWord(wd));if(v==='script'&&ac)return font(s.accentFont==='script'?'script':'serif',base*1.35,{italic:s.accentFont!=='script'});return font(v==='minimal'?'sans':'sans',base*(active&&v!=='minimal'?1.06:1),{weight:v==='minimal'?600:900})};
  const words=g.words.map(([wd,ws,wdur])=>({wd:upper?wd.toUpperCase():wd,ws,active:t>=ws&&t<ws+Math.max(wdur,.12),spoken:t>=ws}));
  const widths=words.map(x=>{c.font=fontFor(x.wd,x.active);return c.measureText(x.wd).width});const gap=base*.28;
  const rows=[];let row=[],rw=0;words.forEach((x,i)=>{if(rw+widths[i]>w*.84&&row.length){rows.push({row,rw:rw-gap});row=[];rw=0}row.push(i);rw+=widths[i]+gap});if(row.length)rows.push({row,rw:rw-gap});
  const lh=base*1.45,cy=h*POS_Y[e.position]-(rows.length-1)*lh/2,appear=ease((t-g.start)/.18);c.globalAlpha*=appear;
  if(v==='script'){const widest=Math.max(...rows.map(r=>r.rw));c.save();c.fillStyle='rgba(20,14,16,.42)';rr(c,w/2-widest/2-base*.7,cy-lh*.62,widest+base*1.4,rows.length*lh+lh*.24,base*.5);c.fill();c.strokeStyle='rgba(255,255,255,.18)';c.stroke();c.restore()}
  rows.forEach((r,ri)=>{let x=w/2-r.rw/2;const y=cy+ri*lh;r.row.forEach(i=>{const x0=x,ww=widths[i],it=words[i],ac=emph.has(cleanWord(it.wd));c.font=fontFor(it.wd,it.active);c.textAlign='left';
    const pop=it.active?1+.08*Math.exp(-(t-it.ws)*14):1;c.save();c.translate(x0+ww/2,y);c.scale(pop,pop);c.translate(-(x0+ww/2),-y);
    if(v==='box'&&it.active){c.fillStyle=s.accent;rr(c,x0-base*.18,y-base*.62,ww+base*.36,base*1.24,base*.22);c.fill();c.fillStyle='#111';c.fillText(it.wd,x0,y+base*.04)}
    else{let fill=s.ink,alpha=1;if(v==='karaoke'){fill=it.spoken?s.accent:s.ink;alpha=it.spoken?1:.62}else if(v==='minimal'){alpha=it.active?1:.82}if(ac&&v!=='karaoke')fill=s.accent;
     c.globalAlpha*=alpha;if(v!=='script'){c.lineJoin='round';c.lineWidth=v==='outline'?Math.max(2,base*.08):Math.max(2,base*.16);c.strokeStyle=v==='outline'?fill:'rgba(0,0,0,.72)';if(v==='outline'){c.strokeText(it.wd,x0,y);if(it.active){c.fillStyle=fill;c.fillText(it.wd,x0,y)}}else{c.strokeText(it.wd,x0,y);c.fillStyle=fill;c.fillText(it.wd,x0,y)}}else{c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=base*.3;c.fillStyle=ac?s.accent:fill;c.fillText(it.wd,x0,y)}}
    c.restore();x+=ww+gap})});
  c.restore()},
 steps(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.5,.35);if(a<=0)return;const items=e.items.length?e.items:['One','Two','Three'];
  const pw=w*.86,ph=w*.3,x=(w-pw)/2,y=h*POS_Y[e.position]-ph/2+(1-p)*h*.03;c.save();c.globalAlpha*=a;glassPanel(c,info,x,y,pw,ph,w*.035,{dark:true,tint:.08});
  const pad=pw*.1,ly=y+ph*.48,n=items.length,prog=ease(clamp((lt-.3)/(e.duration*.75)));c.font=font('sans',w*.026,{weight:700});spaced(c,`${Math.round(w*.003)}px`);c.textAlign='left';c.fillStyle=rgba(s.ink,.7);c.fillText((e.text||'THE PLAN').toUpperCase(),x+pad*.6,y+ph*.2);spaced(c,'0px');
  c.lineWidth=Math.max(1.5,w*.004);c.strokeStyle=rgba(s.ink,.22);c.beginPath();c.moveTo(x+pad,ly);c.lineTo(x+pw-pad,ly);c.stroke();c.strokeStyle=s.ink;c.beginPath();c.moveTo(x+pad,ly);c.lineTo(x+pad+(pw-pad*2)*prog,ly);c.stroke();
  items.forEach((label,i)=>{const nx=x+pad+(pw-pad*2)*(n===1?0:i/(n-1)),reached=prog>=(n===1?0:i/(n-1))-.001,current=reached&&(i===n-1||prog<(i+1)/(n-1));
   c.fillStyle=reached?s.ink:'rgba(255,255,255,.18)';c.beginPath();c.arc(nx,ly,w*(current?.016:.011),0,7);c.fill();if(current){c.strokeStyle=rgba(s.accent,.6);c.lineWidth=2;c.beginPath();c.arc(nx,ly,w*.026,0,7);c.stroke()}
   c.textAlign=i===0?'left':i===n-1?'right':'center';c.font=font('sans',w*(current?.03:.026),{weight:current?800:500});c.fillStyle=rgba(s.ink,reached?1:.5);c.fillText(label,nx+(i===0?-w*.01:i===n-1?w*.01:0),ly+ph*.3)});
  c.restore()},
 counter(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.45,.3);if(a<=0)return;const tw=w*.38,th=w*.36,x=w*.94-tw,y=h*POS_Y[e.position]-th/2+(1-p)*w*.04;
  c.save();c.globalAlpha*=a;glassPanel(c,info,x,y,tw,th,w*.03,{dark:true,tint:.06});c.textAlign='center';c.fillStyle=rgba(s.ink,.75);c.font=font('sans',w*.026,{weight:600});if(e.sub)c.fillText(e.sub,x+tw/2,y+th*.2);
  const val=Math.round((e.value||0)*ease(clamp((lt-.2)/1.1)));c.fillStyle=s.ink;c.font=font('condensed',th*.55);c.textBaseline='middle';c.fillText(`${val}${e.text||''}`,x+tw/2,y+th*.6);c.restore()},
 chips(c,e,lt,info){const {w,h}=info,s=info.template.style;const items=e.items.length?e.items:['Idea'];const out=clamp((e.duration-lt)/.3);if(out<=0)return;
  c.save();c.font=font('sans',w*.034,{weight:700});c.textBaseline='middle';const ch=w*.075;let y=h*POS_Y[e.position]-(items.length-1)*ch*.62;
  items.forEach((it,i)=>{const t=ease((lt-i*.22)/.45);if(t<=0){y+=ch*1.25;return}const tw=c.measureText(it).width,pw=tw+ch*1.05,x=w*.06-(1-t)*w*.3;c.save();c.globalAlpha*=t*out;glassPanel(c,info,x,y-ch/2,pw,ch,ch/2,{dark:true,tint:.06,frost:false});
   c.fillStyle=s.accent;c.beginPath();c.arc(x+ch*.42,y,ch*.11,0,7);c.fill();c.fillStyle=s.ink;c.textAlign='left';c.fillText(it,x+ch*.68,y+1);c.restore();y+=ch*1.25});c.restore()},
 streaks(c,e,lt,info){const {w,h}=info,s=info.template.style,{a}=envelope(lt,e.duration,.8,.5);if(a<=0)return;const cx=w/2,cy=h*.5,t=info.time;c.save();c.globalAlpha*=a;c.globalCompositeOperation='lighter';c.lineCap='round';
  for(let k=0;k<4;k++){const rx=w*(.36+k*.05),ry=h*(.09+k*.025),rot=-.5+k*.42+Math.sin(t*.3+k)*.08,head=t*(1.1+k*.18)+k*1.7,len=2.2;
   for(let i=0;i<26;i++){const f=i/26,a0=head-len*f,a1=head-len*(f+1/26);c.strokeStyle=k%2?`rgba(255,255,255,${(.5*(1-f)).toFixed(3)})`:rgba(s.accent,.85*(1-f));c.lineWidth=w*(.012-.009*f);c.beginPath();const p0=[cx+Math.cos(a0)*rx,cy+Math.sin(a0)*ry],p1=[cx+Math.cos(a1)*rx,cy+Math.sin(a1)*ry];const r=(p)=>[cx+(p[0]-cx)*Math.cos(rot)-(p[1]-cy)*Math.sin(rot),cy+(p[0]-cx)*Math.sin(rot)+(p[1]-cy)*Math.cos(rot)];const q0=r(p0),q1=r(p1);c.moveTo(q0[0],q0[1]);c.lineTo(q1[0],q1[1]);c.stroke()}}
  for(let i=0;i<34;i++){const ang=i*2.399+t*(.2+(i%5)*.05),rad=w*(.18+((i*37)%100)/100*.34),tw=.5+.5*Math.sin(t*3+i);c.fillStyle=`rgba(255,255,255,${(tw*.8).toFixed(3)})`;c.beginPath();c.arc(cx+Math.cos(ang)*rad,cy+Math.sin(ang)*rad*.55,w*.004*(1+tw),0,7);c.fill()}
  c.restore()},
 lowerThird(c,e,lt,info){const {w,h}=info,s=info.template.style,{a}=envelope(lt,e.duration,.6,.35);if(a<=0)return;const x=w*.07,y=h*POS_Y[e.position],grow=ease(lt/.35),slide=ease((lt-.15)/.5);
  c.save();c.globalAlpha*=a;c.fillStyle=s.accent;c.fillRect(x,y-w*.05*grow,Math.max(2,w*.007),w*.1*grow);c.save();c.beginPath();c.rect(x+w*.012,y-w*.08,w*.9,w*.16);c.clip();
  const off=(1-slide)*-w*.5;c.textAlign='left';c.textBaseline='alphabetic';textShadow(c,info,.7);c.fillStyle=s.ink;c.font=font(s.font==='script'?'serif':s.font,w*.055);c.fillText(e.text,x+w*.03+off,y+w*.005);
  if(e.sub){spaced(c,`${Math.round(w*.005)}px`);c.font=font('sans',w*.026,{weight:600});c.fillStyle=s.accent;c.fillText(e.sub.toUpperCase(),x+w*.03+off,y+w*.045)}c.restore();c.restore()},
 cta(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.5,.3);if(a<=0)return;c.save();c.globalAlpha*=a;const label=(e.text||'Learn more')+'  ›';c.font=font('sans',w*.042,{weight:800});const tw=c.measureText(label).width,bw=tw+w*.12,bh=w*.11,pulse=1+.03*Math.sin(info.time*4.2);
  const cy=h*POS_Y[e.position];c.translate(w/2,cy+(1-easeBack(lt/.6))*w*.08);c.scale(pulse*(.8+.2*p),pulse*(.8+.2*p));c.shadowColor=rgba(s.accent,.6);c.shadowBlur=w*.05;c.fillStyle=s.accent;rr(c,-bw/2,-bh/2,bw,bh,bh/2);c.fill();c.shadowBlur=0;c.fillStyle='#111';c.textAlign='center';c.textBaseline='middle';c.fillText(label,0,1);c.restore()},
 badge(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.5,.3);if(a<=0)return;const r=w*.042,x=w*.22,y=h*POS_Y[e.position]-h*.07+Math.sin(info.time*1.6)*r*.25;c.save();c.globalAlpha*=a;c.translate(x,y);c.scale(easeBack(p),easeBack(p));
  c.fillStyle=rgba(s.accent,.9);c.shadowColor=rgba(s.accent,.5);c.shadowBlur=r;c.beginPath();c.arc(0,0,r,0,7);c.fill();c.shadowBlur=0;c.fillStyle='#2a1420';c.font=font('sans',r*1.3,{weight:500});c.textAlign='center';c.textBaseline='middle';c.fillText(e.text||'+',0,r*.05);c.restore()},
 flash(c,e,lt,info){const t=info.time;let best=1e9;for(const b of e.beats||[]){const d=t-b;if(d>=0&&d<best)best=d}if(best>.2)return;c.save();c.fillStyle=`rgba(255,255,255,${((1-best/.2)*.6).toFixed(3)})`;c.fillRect(0,0,info.w,info.h);c.restore()},
 quote(c,e,lt,info){const {w,h}=info,s=info.template.style,{a,p}=envelope(lt,e.duration,.7,.4);if(a<=0)return;const cw=w*.82,ts=w*.06;c.font=font('serif',ts,{italic:true,weight:500});const lines=wrap(c,`${e.text}`,cw*.8,5);const ch=lines.length*ts*1.3+ts*3.2+(e.sub?ts:0);
  const x=(w-cw)/2,y=h*POS_Y[e.position]-ch/2+(1-p)*h*.04;c.save();c.globalAlpha*=a;glassPanel(c,info,x,y,cw,ch,w*.04);c.fillStyle=s.accent;c.font=font('serif',ts*2.6);c.textAlign='left';c.fillText('“',x+cw*.07,y+ts*2.3);
  c.fillStyle=s.ink;c.font=font('serif',ts,{italic:true,weight:500});c.textAlign='center';const shown=ease((lt-.2)/.8);lines.forEach((l,i)=>{c.save();c.globalAlpha*=clamp(shown*lines.length-i);c.fillText(l,w/2,y+ts*2.5+i*ts*1.3);c.restore()});
  if(e.sub){c.font=font('sans',ts*.45,{weight:600});c.fillStyle=rgba(s.accent,.95);c.fillText(e.sub,w/2,y+ch-ts*.9)}c.restore()},
 dateStamp(c,e,lt,info){const {w,h}=info,s=info.template.style,{a}=envelope(lt,e.duration,.3,.3);if(a<=0)return;const d=new Date(),mon=d.toLocaleString('en-US',{month:'short'}).toUpperCase();
  const text=e.text||`${mon} ${String(d.getDate()).padStart(2,'0')} ${d.getFullYear()}`;const top=e.position==='top'||e.position==='upper';const lb=h*s.letterbox;c.save();c.globalAlpha*=a;c.font=font('mono',w*.04,{weight:700});c.textBaseline='alphabetic';
  c.fillStyle='#ffb347';c.shadowColor='rgba(255,140,40,.7)';c.shadowBlur=w*.015;c.textAlign=top?'left':'right';const x=top?w*.06:w*.94,y=top?lb+h*.07:h-lb-h*.05;c.fillText(text,x,y);
  if(e.sub){c.font=font('mono',w*.028,{weight:600});c.fillText(e.sub.toUpperCase(),x,y+(top?w*.05:-w*.055))}if(e.variant!=='minimal'&&Math.floor(info.time*1.6)%2===0){c.textAlign=top?'right':'left';c.fillStyle='#ff4040';c.shadowColor='rgba(255,40,40,.7)';c.fillText('● REC',top?w*.94:w*.06,y)}c.restore()}
};
const groupCache=new WeakMap();
function captionGroups(e){let g=groupCache.get(e);if(g)return g;g=[];let cur=null;
 for(const wd of e.words||[]){const [text,t,d]=wd;if(!cur||t-cur.end>.55||cur.words.length>=4||/[.!?]$/.test(cur.words.at(-1)[0])){cur={start:t,end:t+d,words:[]};g.push(cur)}cur.words.push(wd);cur.end=t+d}
 if(!g.length&&e.text){const words=e.text.split(/\s+/).filter(Boolean),step=e.duration/Math.max(1,words.length);for(let i=0;i<words.length;i+=4){const ws=words.slice(i,i+4).map((x,k)=>[x,e.start+(i+k)*step,step*.9]);g.push({start:ws[0][1],end:ws.at(-1)[1]+step,words:ws})}}
 groupCache.set(e,g);return g}

/* ---------- Frame composition ---------- */
const BEHIND_OK=new Set(['headline','keyword','glassCard','phoneCard']);
function active(t,info){return t.elements.filter(e=>info.time>=e.start&&info.time<e.start+e.duration)}
const hiddenCache=new Map();
/** Fraction of the element's text band covered by the person; decided once per element so text never flickers between layers. */
function tooHidden(e,cut,info){const key=`${templateRevision}:${e.id}:${e.start}:${e.position}`;if(hiddenCache.has(key))return hiddenCache.get(key);
 const {w,h}=info,cy=h*(POS_Y[e.position]??.5),half=h*(e.type==='keyword'?.1:e.type==='headline'?.065:.14);
 const y0=Math.max(0,Math.round(cy-half)),bh=Math.max(1,Math.min(h-y0,Math.round(half*2))),x0=Math.round(w*.12),bw=Math.round(w*.76);
 let covered=0,total=0;try{const d=cut.getContext('2d').getImageData(x0,y0,bw,bh).data;for(let i=3;i<d.length;i+=4*7){total++;if(d[i]>110)covered++}}catch{return false}
 const hide=total>0&&covered/total>.5;hiddenCache.set(key,hide);if(hiddenCache.size>200)hiddenCache.delete(hiddenCache.keys().next().value);return hide}
/** Under-layer: backdrop, elements behind the subject, the subject cutout, then front elements. Called before user text layers. */
function drawUnder(c,info){
 const t=info.template;if(!t)return;const s=t.style,{w,h}=info,els=active(t,info);
 const needsDepth=t.needsSubject||els.some(e=>e.behind);
 if(needsDepth&&Seg.status==='idle')loadSegmenter();
 const mask=needsDepth&&info.src&&info.geom?segment(info.src,info.srcKey,info.playing):null;
 const depth=!!mask;
 c.save();c.globalAlpha=clamp(1-(info.fade||0));
 drawWash(c,s,w,h,depth?Math.max(s.backdrop,s.wash):s.wash+s.backdrop*.12);
 drawLeak(c,s,w,h,info.time);drawFlicker(c,s,w,h,info.time);
 const cut=depth?subjectCutout(info,mask):null;
 // Occlusion-aware depth: text behind the person only stays behind while it can still be read.
 const behind=depth?els.filter(e=>e.behind&&BEHIND_OK.has(e.type)&&((e.type!=='headline'&&e.type!=='keyword')||!tooHidden(e,cut,info))):[];
 for(const e of behind)R[e.type]?.(c,e,info.time-e.start,info);
 if(depth&&(behind.length||s.backdrop>.01)){c.save();c.globalAlpha=clamp(1-(info.fade||0));c.drawImage(cut,0,0);c.restore()}
 drawVignette(c,s,w,h);
 for(const e of els)if(!behind.includes(e)&&e.type!=='flash')R[e.type]?.(c,e,info.time-e.start,info);
 c.restore();
}
/** Over-layer: film treatments that sit on top of everything, including the user's own text layers. */
function drawOver(c,info){const t=info.template;if(!t)return;const s=t.style,{w,h}=info;c.save();c.globalAlpha=1;
 for(const e of active(t,info))if(e.type==='flash')R.flash(c,e,info.time-e.start,info);
 drawScanlines(c,s,w,h);drawGrain(c,s,w,h,info.time,info.playing||info.exporting);drawLetterbox(c,s,w,h,info.time);c.restore()}
/** A key that changes whenever the template layer would paint differently (used by the preview's paint cache). */
function frameKey(info){const t=info.template;if(!t)return '';const animated=t.elements.some(e=>info.time>=e.start-.05&&info.time<e.start+e.duration+.05)||t.style.grain>0||t.style.flicker||t.style.leak>0;return `${templateRevision}:${Seg.version}:${animated?Math.round(info.time*60):'s'}`}
let templateRevision=0;

/* ---------- Thumbnails & previews (real renderer over a stand-in subject) ---------- */
function silhouette(w,h,tone='#151214'){const k=document.createElement('canvas');k.width=w;k.height=h;const c=k.getContext('2d');c.fillStyle=tone;
 c.beginPath();c.ellipse(w*.5,h*.47,w*.13,h*.085,0,0,7);c.fill();c.beginPath();c.moveTo(w*.44,h*.53);c.lineTo(w*.56,h*.53);c.lineTo(w*.58,h*.6);c.bezierCurveTo(w*.86,h*.63,w*.95,h*.72,w*.98,h);c.lineTo(w*.02,h);c.bezierCurveTo(w*.05,h*.72,w*.14,h*.63,w*.42,h*.6);c.closePath();c.fill();
 const g=c.createLinearGradient(w*.3,0,w*.75,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,220,200,.14)');c.globalCompositeOperation='source-atop';c.fillStyle=g;c.fillRect(0,0,w,h);return k}
const silCache=new Map();
function previewInstance(def){const t=Catalog.build(def.id,{duration:8,title:def.thumb.kicker||'',words:[],beats:[0,.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5],script:'make every moment count and keep showing up'});
 for(const e of t.elements){if((e.type==='headline'||e.type==='keyword')&&def.thumb.word){if(e.type==='keyword')e.items=[def.thumb.word.toUpperCase(),'BOLD','LOUD'];else e.text=def.thumb.word}if(e.type==='phoneCard'&&def.thumb.word&&def.id==='motion-deck')e.text=def.thumb.word}
 return t}
function paintPreview(canvas,def,time,instance){const w=canvas.width,h=canvas.height,c=canvas.getContext('2d'),t=instance||previewInstance(def);c.save();c.clearRect(0,0,w,h);
 const bg=c.createLinearGradient(0,0,w*.3,h);bg.addColorStop(0,'#5d5a63');bg.addColorStop(.55,'#2b2a31');bg.addColorStop(1,'#141318');c.fillStyle=bg;c.fillRect(0,0,w,h);
 c.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<6;i++)c.fillRect(w*(.08+i*.16),h*.08,w*.06,h*.55);
 let sil=silCache.get(`${w}x${h}`);if(!sil){sil=silhouette(w,h);silCache.set(`${w}x${h}`,sil)}
 const info={w,h,time,template:t,src:null,geom:null,filter:'none',playing:true,exporting:false,fade:0};const s=t.style,els=active(t,info);
 drawWash(c,s,w,h,Math.max(s.backdrop,s.wash));drawLeak(c,s,w,h,time);drawFlicker(c,s,w,h,time);
 const behind=els.filter(e=>e.behind&&BEHIND_OK.has(e.type));for(const e of behind)R[e.type](c,e,time-e.start,info);
 c.drawImage(sil,0,0);drawVignette(c,s,w,h);for(const e of els)if(!behind.includes(e)&&e.type!=='flash')R[e.type](c,e,time-e.start,info);
 drawOver(c,{...info,playing:false});c.restore()}

/* ---------- Panel ---------- */
const ui={filter:'all',query:'',busy:null,brief:'',claudeOn:true,status:null,statusLoaded:false,selected:null,editSession:false,open:{look:true,effects:false,elements:true,refit:false},aiOpen:false,view:(()=>{try{return localStorage.getItem('replotre_tpl_view')||'grid'}catch{return 'grid'}})()};
const FILTERS=[['all','All'],['depth','Behind you'],['captions','Captions'],['ads','Product'],['film','Cinematic']];
const inFilter=(d,f)=>f==='all'||(f==='depth'&&d.needsSubject)||(f==='captions'&&['pop-captions','crimson','neon-pulse','editorial','interview-glow','property-reel'].includes(d.id))||(f==='ads'&&['hero-float','quote-card','pop-captions','property-reel'].includes(d.id))||(f==='film'&&['field-journal','cinematic-wide','documentary','editorial','candlelit','property-reel'].includes(d.id));
async function loadStatus(){if(ui.statusLoaded)return ui.status;ui.statusLoaded=true;try{const r=await fetch('/api/status',{credentials:'same-origin'});ui.status=await r.json()}catch{ui.status={}}rerender();return ui.status}
const claudeReady=()=>!!ui.status?.claude&&!!Cloud()?.isConnected?.();
function claudeHint(){if(!Cloud()?.isConnected?.())return 'Sign in to let AI fit templates to your transcript, beats and frames.';if(!ui.status?.claude)return 'AI styling is not set up on this server yet. Templates still lay out against your transcript and beats.';return `AI reads your transcript, beats, scene cuts and sampled frames, then writes copy and timing that match.`}
let panelRoot=null;
function rerender(){if(panelRoot&&panelRoot.isConnected&&panelRoot.querySelector('.tpl-panel'))renderPanel(panelRoot)}
const PREVIEW_BASE='/assets/templates/';
function previewMarkup(d){const poster=PREVIEW_BASE+(d.preview?.poster||`${d.id}.jpg`),video=PREVIEW_BASE+(d.preview?.video||`${d.id}.mp4`);
 return `<img class="tpl-poster" src="${esc(poster)}" alt="" loading="lazy" decoding="async" width="360" height="640"><video class="tpl-video" data-tpl-video="${esc(d.id)}" data-src="${esc(video)}" poster="${esc(poster)}" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video><span class="tpl-preview-progress" aria-hidden="true"><i></i></span>`}
const PT_GLYPH='<span class="tpl-pt-ring" aria-hidden="true"></span><svg class="tpl-pt-icon" viewBox="0 0 24 24" aria-hidden="true"><path class="tpl-pt-play" d="M7.6 4.6v14.8a1.2 1.2 0 0 0 1.84 1.02l11.6-7.4a1.2 1.2 0 0 0 0-2.04L9.44 3.58A1.2 1.2 0 0 0 7.6 4.6z"/><g class="tpl-pt-pause"><rect x="5.4" y="4.4" width="5" height="15.2" rx="1.6"/><rect x="13.6" y="4.4" width="5" height="15.2" rx="1.6"/></g></svg>';
const ratioWord=r=>r==='16:9'?'Landscape':r==='4:5'?'Portrait':r==='1:1'?'Square':'Vertical';
const applyLabel=(d,current)=>ui.busy===d.id?'<span class="tpl-spin"></span>Fitting…':current?'Re-apply':'Use';
function cardMarkup(d,big=false){const current=E()?.template?.get?.()?.id===d.id;
 return `<article class="tpl-card${big?' tpl-card-big':''}${current?' is-current':''}" data-tpl="${esc(d.id)}" data-ratio="${esc(d.ratio)}">
 <div class="tpl-thumb">${previewMarkup(d)}
  <button class="tpl-open" type="button" data-tpl-action="detail" data-id="${esc(d.id)}" aria-label="Preview ${esc(d.name)}: ${esc(d.desc)}"></button>
  <div class="tpl-badges" aria-hidden="true"><span class="tpl-ratio" title="${ratioWord(d.ratio)} ${esc(d.ratio)}">${esc(d.ratio)}</span>${d.needsSubject?`<span class="tpl-depth" title="Type goes behind the person">${ico('layers')}<b>Depth</b></span>`:''}</div>
  <div class="tpl-overlay"><div class="tpl-overlay-text"><strong>${esc(d.name)}</strong>${current?'<em class="tpl-on">Applied</em>':d.tag?`<em>${esc(d.tag)}</em>`:''}</div>
   <button class="tpl-apply" type="button" data-tpl-action="apply" data-id="${esc(d.id)}" ${ui.busy?'disabled':''} aria-label="${current?'Re-apply':'Use'} ${esc(d.name)}">${applyLabel(d,current)}</button></div>
 </div>
 ${big?`<div class="tpl-info"><p>${esc(d.desc)}</p></div>`:`<div class="tpl-meta"><div class="tpl-meta-head"><strong>${esc(d.name)}</strong>${current?'<em class="tpl-on">Applied</em>':d.tag?`<em>${esc(d.tag)}</em>`:''}</div><p>${esc(d.desc)}</p><div class="tpl-meta-foot"><span class="tpl-meta-tags">${d.ratio!=='9:16'?`<span>${esc(d.ratio)}</span>`:''}${d.needsSubject?`<span>${ico('layers')}Depth</span>`:''}</span><button class="tpl-apply tpl-apply-list" type="button" data-tpl-action="apply" data-id="${esc(d.id)}" ${ui.busy?'disabled':''} aria-label="${current?'Re-apply':'Use'} ${esc(d.name)}">${applyLabel(d,current)}</button></div></div>`}</article>`}
function section(key,title,body,extra=''){const open=ui.open[key];return `<section class="tpl-sec${open?' is-open':''}" data-sec="${key}"><button type="button" class="tpl-sec-head" data-tpl-action="toggle-sec" data-sec="${key}" aria-expanded="${open}"><span>${title}</span>${extra}<i aria-hidden="true">${ico('chevron-down')}</i></button>${open?`<div class="tpl-sec-body">${body}</div>`:''}</section>`}
function activeMarkup(t){const types=Catalog.ELEMENT_TYPES;const s=t.style;const d=Catalog.get(t.id);
 const FONT_SAMPLE={serif:'Aa',sans:'Aa',condensed:'AA',script:'Aa',mono:'Aa'};
 const look=`<div class="tpl-swatches">${[['accent','Accent'],['ink','Text'],['washA','Backdrop']].map(([k,l])=>`<label class="tpl-swatch" title="${l} colour"><span class="tpl-swatch-dot" style="--c:${s[k]}"><input type="color" value="${s[k]}" data-tpl-style="${k}" aria-label="${l} colour"></span><span>${l}</span></label>`).join('')}</div>
  <div class="tpl-fonts" role="radiogroup" aria-label="Font">${Catalog.FONTS.map(f=>`<button type="button" role="radio" aria-checked="${f===s.font}" data-tpl-action="font" data-value="${f}" title="${f[0].toUpperCase()+f.slice(1)}"><span style="font-family:${esc(FONT_STACK[f])};font-weight:${FONT_WEIGHT[f]}${f==='script'?';font-style:italic':''}">${FONT_SAMPLE[f]}</span><small>${f==='condensed'?'Bold':f[0].toUpperCase()+f.slice(1)}</small></button>`).join('')}</div>`;
 const fx=`<div class="tpl-ranges">${[['backdrop','Backdrop',100],['wash','Colour wash',100],['vignette','Vignette',100],['grain','Grain',100],['glow','Glow',100],['leak','Light leak',100],['letterbox','Letterbox',20]].map(([k,l,max])=>`<label class="tpl-range"><span>${l}</span><input type="range" min="0" max="${max}" value="${Math.round(s[k]*100)}" data-tpl-style="${k}" style="--fill:${(Math.round(s[k]*100)/max*100).toFixed(1)}%"><output>${Math.round(s[k]*100)}</output></label>`).join('')}</div>
  <div class="tpl-toggles"><label class="tpl-pill-check"><input type="checkbox" data-tpl-style="flicker" ${s.flicker?'checked':''}><span>Candle flicker</span></label><label class="tpl-pill-check"><input type="checkbox" data-tpl-style="scanlines" ${s.scanlines?'checked':''}><span>Scanlines</span></label></div>`;
 const els=`<ol class="tpl-els">${t.elements.map((e,i)=>elementMarkup(e,i)).join('')}</ol>
  <label class="tpl-add"><span>${ico('plus')} Add element</span><select data-tpl-action="add-element" aria-label="Add element"><option value="">Choose…</option>${types.map(x=>`<option value="${x}">${x.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}</option>`).join('')}</select></label>`;
 const refit=`<div class="tpl-refit"><textarea rows="2" maxlength="400" placeholder="Optional direction, e.g. punchier copy, keyword on every beat" data-tpl-brief="refit">${esc(t.brief||'')}</textarea><button class="tpl-claude" type="button" data-tpl-action="refit" ${claudeReady()&&t.id!=='custom'&&!ui.busy?'':'disabled'}>${ui.busy&&ui.busy===t.id?'<span class="tpl-spin"></span>Refitting…':`${ico('sparkles')} Auto-refine with AI`}</button>${claudeReady()?'':`<p class="tpl-hint">${esc(claudeHint())}</p>`}</div>`;
 return `<section class="tpl-active" aria-label="Active template">
 <div class="tpl-active-head">${d?`<img class="tpl-active-thumb" src="${esc(PREVIEW_BASE+(d.preview?.poster||d.id+'.jpg'))}" alt="" width="36" height="64">`:`<span class="tpl-active-thumb tpl-active-custom">${ico('wand-sparkles')}</span>`}
  <div class="tpl-active-title"><span class="tpl-kicker">Applied${t.engine==='claude'?' · AI':''}</span><strong>${esc(t.name)}</strong><span class="tpl-seg" data-seg-status="${Seg.status}" title="${esc(segLabel())}">${esc(segShort())}</span></div>
  <button class="tpl-icon" type="button" data-tpl-action="remove" title="Remove template" aria-label="Remove template">${ico('trash-2')}</button></div>
 ${txStripMarkup()}${section('look','Look',look)}${section('effects','Effects',fx)}${section('elements','Elements',els,`<small>${t.elements.length}</small>`)}${section('refit','Auto-refine with AI',refit)}
 </section>`}
function elementMarkup(e,i){const open=ui.selected===e.id;const hasText=!['streaks','flash'].includes(e.type);const hasItems=['steps','chips','keyword'].includes(e.type);
 const total=Math.max(.1,E()?.template?.context?.().duration||e.start+e.duration),a=Math.min(100,e.start/total*100),w=Math.max(2,Math.min(100-a,e.duration/total*100));
 const title=e.type==='captions'?(e.words?.length?`${e.words.length} timed words`:'Waiting for transcript'):(e.text||e.items.join(' · ')||ELEMENT_LABEL[e.type]);
 return `<li class="tpl-el${open?' is-open':''}${e.type==='captions'&&!e.words?.length?' is-empty':''}" data-el="${i}"><button class="tpl-el-row" type="button" data-tpl-action="select-element" data-index="${i}" aria-expanded="${open}"><span class="tpl-el-ico" aria-hidden="true">${ico(EL_ICON[e.type]||'layers')}</span><span class="tpl-el-main"><span class="tpl-el-text">${esc(title)}</span><span class="tpl-el-sub">${esc(ELEMENT_LABEL[e.type]||e.type)}${e.behind?' · Behind':''} · ${e.start.toFixed(1)}–${(e.start+e.duration).toFixed(1)}s</span><span class="tpl-el-span" aria-hidden="true"><i style="left:${a.toFixed(1)}%;width:${w.toFixed(1)}%"></i></span></span><span class="tpl-el-chev" aria-hidden="true">${ico('chevron-down')}</span></button>
 ${open?`<div class="tpl-el-edit">
  ${e.type==='captions'&&!e.words?.length?`<p class="tpl-el-note">Captions appear once the clip is transcribed (Insights → Transcribe) or a script is added. Then re-apply the template.</p>`:''}
  ${hasText&&e.type!=='captions'?`<label>Text<input type="text" maxlength="160" value="${esc(e.text)}" data-tpl-el="text" data-index="${i}"></label>`:''}
  ${['headline','keyword','glassCard','phoneCard','lowerThird','quote','counter','dateStamp'].includes(e.type)?`<label>Small line<input type="text" maxlength="90" value="${esc(e.sub)}" data-tpl-el="sub" data-index="${i}"></label>`:''}
  ${hasItems?`<label>Items <small>comma separated</small><input type="text" value="${esc(e.items.join(', '))}" data-tpl-el="items" data-index="${i}"></label>`:''}
  ${['headline','captions'].includes(e.type)?`<label>Accent words<input type="text" value="${esc(e.emphasis.join(', '))}" data-tpl-el="emphasis" data-index="${i}"></label>`:''}
  ${e.type==='counter'?`<label>Count to<input type="number" value="${e.value}" data-tpl-el="value" data-index="${i}"></label>`:''}
  <div class="tpl-el-grid"><label>Start<input type="number" step="0.1" min="0" value="${e.start}" data-tpl-el="start" data-index="${i}"></label><label>Length<input type="number" step="0.1" min="0.3" value="${e.duration}" data-tpl-el="duration" data-index="${i}"></label>
  <label>Position<select data-tpl-el="position" data-index="${i}">${Catalog.POSITIONS.map(p=>`<option ${p===e.position?'selected':''}>${p}</option>`).join('')}</select></label>
  ${['captions','headline','phoneCard','dateStamp'].includes(e.type)?`<label>Style<select data-tpl-el="variant" data-index="${i}">${Catalog.VARIANTS.map(p=>`<option ${p===e.variant?'selected':''}>${p}</option>`).join('')}</select></label>`:''}</div>
  ${BEHIND_OK.has(e.type)?`<label class="tpl-check"><input type="checkbox" ${e.behind?'checked':''} data-tpl-el="behind" data-index="${i}"> Place behind the person</label>`:''}
  <div class="tpl-el-actions"><button type="button" data-tpl-action="seek-element" data-index="${i}">${ico('play')} Preview</button><button type="button" data-tpl-action="delete-element" data-index="${i}">${ico('trash-2')} Remove</button></div>
 </div>`:''}</li>`}
const AI_IDEAS=['Neon night drive','Warm film look','Bold creator captions','Plum studio, serif titles','Keyword behind me on the beat'];
function aiMarkup(){const ready=claudeReady(),signedIn=!!Cloud()?.isConnected?.();
 if(!ready)return `<section class="tpl-ai tpl-ai-locked"><span class="tpl-ai-mark" aria-hidden="true">${ico('sparkles')}</span><div class="tpl-ai-copy"><strong>Design with AI</strong><small>${signedIn?'Not set up on this server':'Sign in to unlock'}</small></div>
  ${signedIn?`<span class="tpl-ai-info" tabindex="0" role="note" aria-label="${esc(claudeHint())}" title="${esc(claudeHint())}">${ico('circle-help')}</span>`:`<button class="tpl-ai-signin" type="button" data-tpl-action="sign-in">Sign in</button>`}</section>`;
 if(!ui.aiOpen&&!ui.brief&&ui.busy!=='custom')return `<button class="tpl-ai tpl-ai-collapsed" type="button" data-tpl-action="ai-open"><span class="tpl-ai-mark" aria-hidden="true">${ico('sparkles')}</span><span class="tpl-ai-placeholder">Describe a look…</span><span class="tpl-ai-kbd" aria-hidden="true">${ico('arrow-up')}</span></button>`;
 return `<section class="tpl-ai tpl-ai-open"><div class="tpl-ai-bar"><span class="tpl-ai-mark" aria-hidden="true">${ico('sparkles')}</span>
  <textarea rows="1" maxlength="400" data-tpl-brief="create" aria-label="Describe a look for AI" placeholder="Describe a look…">${esc(ui.brief)}</textarea>
  <button class="tpl-ai-go" type="button" data-tpl-action="create" ${ui.busy?'disabled':''} aria-label="Design with AI">${ui.busy==='custom'?'<span class="tpl-spin"></span>':ico('arrow-up')}</button></div>
  ${ui.brief?'':`<div class="tpl-ai-ideas" role="group" aria-label="Ideas">${AI_IDEAS.map(x=>`<button type="button" data-tpl-action="ai-idea" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div>`}
  <div class="tpl-ai-meta"><label class="tpl-switch" title="Let AI tailor templates to your footage when applying them"><input type="checkbox" data-tpl-action="toggle-claude" ${ui.claudeOn?'checked':''}><span></span>Fit templates</label><span class="tpl-ai-model">AI ready</span></div></section>`}
function renderPanel(root){panelRoot=root;loadStatus();const t=E()?.template?.get?.();
 stopHover();disposePreviews(root);
 const active=document.activeElement,refocus=active&&root.contains(active)?(active.dataset.tplBrief?`[data-tpl-brief="${active.dataset.tplBrief}"]`:active.matches?.('.tpl-search input')?'.tpl-search input':null):null;
 root.innerHTML=`<div class="tpl-panel">
 <div class="tpl-top"><label class="tpl-search">${ico('search')}<input type="search" value="${esc(ui.query)}" placeholder="Search templates" aria-label="Search templates" autocomplete="off"></label>
  <button class="tpl-gallery-btn" type="button" data-tpl-action="gallery" aria-label="Open template gallery" title="Open gallery">${ico('maximize')}</button></div>
 ${aiMarkup()}
 ${t?activeMarkup(t):''}
 <div class="tpl-browse"><div class="tpl-browse-head"><span>${t?'Switch template':'Templates'}</span><small class="tpl-count" role="status"></small><div class="tpl-view" role="group" aria-label="Layout"><button type="button" data-tpl-action="view" data-value="grid" aria-pressed="${ui.view==='grid'}" title="Grid">${ico('grid')}</button><button type="button" data-tpl-action="view" data-value="list" aria-pressed="${ui.view==='list'}" title="List">${ico('list')}</button></div></div>${filterMarkup(ui.filter)}</div>
 <div class="tpl-grid${ui.view==='list'?' is-list':''}">${Catalog.TEMPLATES.map(d=>cardMarkup(d)).join('')}</div>
 <p class="tpl-empty" hidden>No templates match. <button type="button" data-tpl-action="clear-search">Clear search</button></p></div>`;
 applyPanelFilter(root,false);paintThumbs(root);
 if(refocus){const el=root.querySelector(refocus);if(el){el.focus({preventScroll:true});if(el.setSelectionRange){const n=el.value.length;el.setSelectionRange(n,n)}}}
 autosize(root.querySelector('[data-tpl-brief="create"]'))}
function matchesQuery(d,q){if(!q)return true;q=q.toLowerCase();return (d.name+' '+d.desc+' '+(d.needsSubject?'depth behind':'')).toLowerCase().includes(q)}
function applyPanelFilter(root=panelRoot,reconcile=true){if(!root)return;let n=0;root.querySelectorAll('.tpl-grid .tpl-card').forEach(card=>{const d=Catalog.get(card.dataset.tpl);card.hidden=!(d&&inFilter(d,ui.filter)&&matchesQuery(d,ui.query));if(!card.hidden)n++});
 const c=root.querySelector('.tpl-count');if(c)c.textContent=`${n} of ${Catalog.TEMPLATES.length}`;const empty=root.querySelector('.tpl-empty');if(empty)empty.hidden=n>0;
 root.querySelectorAll('[data-tpl-action="filter"]').forEach(b=>{const on=b.dataset.value===ui.filter;b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on))});if(reconcile)reconcilePreviews()}
function autosize(ta){if(!ta)return;ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px'}
function filterMarkup(value,gallery=false){return `<div class="tpl-filters" role="group" aria-label="Filter templates">${FILTERS.map(([v,l])=>`<button type="button" aria-pressed="${value===v}" class="${value===v?'is-on':''}" data-tpl-action="${gallery?'gallery-filter':'filter'}" data-value="${v}">${l}</button>`).join('')}</div>`}

/* ---------- Detail sheet: big preview, what's inside, apply ---------- */
const ELEMENT_LABEL={headline:'Kinetic headline',keyword:'Beat keyword',glassCard:'Frosted card',phoneCard:'Phone card',captions:'Captions',steps:'Progress steps',counter:'Counter',chips:'Tag chips',streaks:'Light streaks',lowerThird:'Lower third',cta:'Call to action',badge:'Badge',flash:'Beat flash',quote:'Pull quote',dateStamp:'Date stamp'};
const EL_ICON={headline:'type',keyword:'zap',glassCard:'layout',phoneCard:'monitor-play',captions:'captions',steps:'sliders-horizontal',counter:'grid',chips:'link',streaks:'sparkles',lowerThird:'overlay',cta:'mouse-pointer-2',badge:'plus',flash:'zap',quote:'pencil',dateStamp:'film'};
function detailMarkup(d){const current=E()?.template?.get?.()?.id===d.id;const inside=[...new Set((Catalog.build(d.id,{duration:12,title:'Preview'})?.elements||[]).map(e=>e.type))];
 const list=visibleIds(),i=list.indexOf(d.id);const ready=claudeReady()&&ui.claudeOn;
 return `<div class="tpl-detail-backdrop" data-tpl-action="close-detail"></div>
 <section class="tpl-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="tplDetailTitle" tabindex="-1">
  <div class="tpl-detail-media"><article class="tpl-card tpl-card-detail" data-tpl="${esc(d.id)}"><div class="tpl-thumb">${previewMarkup(d)}<button class="tpl-preview-toggle" type="button" data-tpl-action="preview" aria-label="Play ${esc(d.name)} preview" aria-pressed="false">${PT_GLYPH}</button></div></article></div>
  <div class="tpl-detail-info">
   <div class="tpl-detail-top"><span class="tpl-kicker">${ratioWord(d.ratio)} ${esc(d.ratio)}${d.needsSubject?' · Depth':''}</span><div class="tpl-detail-nav">
    <button class="tpl-round" type="button" data-tpl-action="detail-step" data-step="-1" aria-label="Previous template" ${i<=0?'disabled':''}>${ico('chevron-down')}</button>
    <button class="tpl-round" type="button" data-tpl-action="detail-step" data-step="1" aria-label="Next template" ${i>=list.length-1?'disabled':''}>${ico('chevron-down')}</button>
    <button class="tpl-round" type="button" data-tpl-action="close-detail" aria-label="Close preview">${ico('x')}</button></div></div>
   <h2 id="tplDetailTitle">${esc(d.name)}${d.tag?` <em>${esc(d.tag)}</em>`:''}</h2>
   <p class="tpl-detail-desc">${esc(d.desc)}</p>
   ${d.needsSubject?`<p class="tpl-detail-note">${ico('layers')}<span>Text sits behind the person. Separation runs on this device, so no frames are uploaded.</span></p>`:''}
   <h3>What's inside</h3><ul class="tpl-inside">${inside.map(x=>`<li>${esc(ELEMENT_LABEL[x]||x)}</li>`).join('')}</ul>
   <div class="tpl-detail-actions"><button class="tpl-primary" type="button" data-tpl-action="apply" data-id="${esc(d.id)}" ${ui.busy?'disabled':''}>${ui.busy===d.id?'<span class="tpl-spin"></span>Fitting…':`${ready?ico('sparkles')+' ':''}${current?'Re-apply':'Use template'}${ready?' with AI':''}`}</button>
   <p class="tpl-hint">${esc(ready?'AI writes copy from your transcript and times it to your beats.':claudeHint())}</p></div>
  </div></section>`}
function visibleIds(){const scope=document.querySelector('.tpl-gallery')||panelRoot;const cards=scope?[...scope.querySelectorAll('.tpl-card[data-tpl]:not([hidden])')].filter(c=>!c.closest('.tpl-detail')):[];const ids=cards.map(c=>c.dataset.tpl);return ids.length?ids:Catalog.TEMPLATES.map(t=>t.id)}
function openDetail(id){const d=Catalog.get(id);if(!d)return;let el=document.querySelector('.tpl-detail');const fresh=!el;
 if(fresh){el=document.createElement('div');el.className='tpl-detail';el._opener=document.activeElement;document.body.appendChild(el);el.addEventListener('click',onClick);
  el._inert=[...document.body.children].filter(n=>n!==el&&!n.inert);for(const n of el._inert)n.inert=true;el._overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const onKey=e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeDetail()}else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;e.preventDefault();stepDetail(e.key==='ArrowRight'?1:-1)}
   else if(e.key==='Tab'){const b=[...el.querySelectorAll('button:not(:disabled)')].filter(x=>x.getClientRects().length),f=b[0],l=b.at(-1);if(e.shiftKey&&document.activeElement===f){e.preventDefault();l?.focus()}else if(!e.shiftKey&&document.activeElement===l){e.preventDefault();f?.focus()}}};
  document.addEventListener('keydown',onKey,true);el._onKey=onKey}
 disposePreviews(el);el.dataset.id=id;el.innerHTML=detailMarkup(d);paintThumbs(el);
 const entry=previewEntries.get(el.querySelector('video[data-tpl-video]'));if(entry){entry.manual=true;entry.ratio=1;reconcilePreviews()}
 (el.querySelector('.tpl-primary')||el.querySelector('.tpl-detail-sheet')).focus({preventScroll:true})}
function stepDetail(step){const el=document.querySelector('.tpl-detail');if(!el)return;const ids=visibleIds(),i=ids.indexOf(el.dataset.id),next=ids[i+step];if(next)openDetail(next)}
function closeDetail(){const el=document.querySelector('.tpl-detail');if(!el)return;disposePreviews(el);document.removeEventListener('keydown',el._onKey,true);for(const n of el._inert||[])n.inert=false;document.body.style.overflow=el._overflow||'';el.remove();if(el._opener?.isConnected)el._opener.focus({preventScroll:true});reconcilePreviews()}

/* Keep decoding bounded and never fetch video for a card that has not been seen. */
const previewRoots=new Map(),previewEntries=new WeakMap();
const previewMotion=matchMedia('(prefers-reduced-motion:reduce)'),previewNarrow=matchMedia('(max-width:700px)');
function disposePreviews(root){const session=previewRoots.get(root);if(!session)return;session.observer?.disconnect();for(const entry of session.entries){entry.wanted=false;entry.request=(entry.request||0)+1;entry.video.pause();previewEntries.delete(entry.video)}previewRoots.delete(root);if(hoverAnim&&!hoverAnim.card.isConnected)hoverAnim=null}
function syncPreviewButton(entry){const {video,card}=entry,playing=!video.paused&&!video.ended,button=card.querySelector('.tpl-preview-toggle'),name=Catalog.get(video.dataset.tplVideo)?.name||'Template';
 card.classList.toggle('is-playing',playing);if(!button)return;button.setAttribute('aria-label',entry.failed?'Preview unavailable':`${playing?'Pause':'Play'} ${name} preview`);button.setAttribute('aria-pressed',String(playing))}
function setPreviewPlayback(entry,play){if(entry.wanted===play)return;entry.wanted=play;const v=entry.video,request=entry.request=(entry.request||0)+1;
 if(!play){v.pause();return}if(!v.getAttribute('src'))v.src=v.dataset.src;
 v.play().catch(()=>{if(!entry.wanted||entry.request!==request)return;entry.wanted=false;entry.blocked=true;syncPreviewButton(entry)})}
function reconcilePreviews(){const gallery=document.querySelector('.tpl-detail')||document.querySelector('.tpl-gallery'),candidates=[];
 for(const [root,session] of previewRoots){if(!root.isConnected||session.entries.every(entry=>!root.contains(entry.video))){disposePreviews(root);continue}
  for(const entry of session.entries){const eligible=!document.hidden&&entry.ratio>.15&&!entry.card.hidden&&!entry.failed&&!entry.hold&&(!gallery||root===gallery);
   if(eligible&&(entry.manual||(!previewMotion.matches&&!navigator.connection?.saveData&&!entry.blocked)))candidates.push(entry);
   else setPreviewPlayback(entry,false)}}
 candidates.sort((a,b)=>Number(b.manual)-Number(a.manual)||Number(b.hovered)-Number(a.hovered)||b.ratio-a.ratio);
 const limit=previewNarrow.matches?1:3;for(let i=0;i<candidates.length;i++)setPreviewPlayback(candidates[i],i<limit)}
function paintThumbs(root){disposePreviews(root);const entries=[];
 for(const video of root.querySelectorAll('video[data-tpl-video]')){const card=video.closest('.tpl-card'),entry={video,card,ratio:0,wanted:false,hold:false,manual:false,blocked:false,failed:false,hovered:false};entries.push(entry);previewEntries.set(video,entry);
  video.addEventListener('loadeddata',()=>card.classList.add('is-ready'));
  video.addEventListener('playing',()=>{card.classList.add('is-ready');syncPreviewButton(entry)});
  video.addEventListener('pause',()=>syncPreviewButton(entry));
  video.addEventListener('timeupdate',()=>{card.querySelector('.tpl-preview-toggle')?.style.setProperty('--p',video.duration?(video.currentTime/video.duration).toFixed(4):0);const progress=card.querySelector('.tpl-preview-progress i');if(progress)progress.style.transform=`scaleX(${video.duration?clamp(video.currentTime/video.duration):0})`});
  video.addEventListener('error',()=>{entry.failed=true;entry.wanted=false;video.pause();card.classList.remove('is-ready');const button=card.querySelector('.tpl-preview-toggle');if(button){button.disabled=true;button.setAttribute('aria-label','Preview unavailable')}reconcilePreviews()},{once:true})}
 const observer='IntersectionObserver' in window?new IntersectionObserver(changes=>{for(const change of changes){const entry=previewEntries.get(change.target);if(entry)entry.ratio=change.isIntersecting?change.intersectionRatio:0}reconcilePreviews()},{threshold:[0,.15,.35,.6,1]}):null;
 previewRoots.set(root,{entries,observer});for(const entry of entries){if(observer)observer.observe(entry.video);else entry.ratio=1}reconcilePreviews()}
function togglePreview(card){const entry=previewEntries.get(card.querySelector('video[data-tpl-video]'));if(!entry||entry.failed)return;
 const play=entry.video.paused;entry.hold=!play;entry.manual=play;entry.blocked=false;
 if(play){for(const session of previewRoots.values())for(const other of session.entries)if(other!==entry)other.manual=false}reconcilePreviews()}
document.addEventListener('visibilitychange',reconcilePreviews);
previewMotion.addEventListener('change',reconcilePreviews);previewNarrow.addEventListener('change',reconcilePreviews);navigator.connection?.addEventListener('change',reconcilePreviews);
// Panels can be closed or switched by the editor without another template render.
const previewCleanup=new MutationObserver(()=>{if(previewRoots.size)reconcilePreviews()});
previewCleanup.observe(document.body,{childList:true});
const previewPanel=document.getElementById('assetContent');if(previewPanel)previewCleanup.observe(previewPanel,{childList:true});
let hoverAnim=null;
function startHover(card){if(hoverAnim?.card===card)return;stopHover();const video=card.querySelector('video[data-tpl-video]'),entry=previewEntries.get(video);if(!entry)return;entry.hovered=true;hoverAnim={card,video};reconcilePreviews()}
function stopHover(){if(!hoverAnim)return;const entry=previewEntries.get(hoverAnim.video);if(entry)entry.hovered=false;hoverAnim=null;reconcilePreviews()}

/* ---------- Gallery modal ---------- */
function openGallery(){closeGallery();const opener=document.activeElement,el=document.createElement('div');el.className='tpl-gallery';el.innerHTML=`<div class="tpl-gallery-backdrop" data-tpl-action="close-gallery"></div><section class="tpl-gallery-sheet" role="dialog" aria-modal="true" aria-labelledby="tplGalleryTitle" tabindex="-1">
 <header><div><span class="tpl-kicker">Templates</span><h2 id="tplGalleryTitle">Find your next look.</h2><p>Preview the motion. Pick a template and make it yours.</p></div>
 <div class="tpl-gallery-nav"><button class="tpl-round" type="button" data-tpl-action="close-gallery" aria-label="Close gallery">${ico('x')}</button></div></header>
 <div class="tpl-gallery-toolbar">${filterMarkup('all',true)}<span class="tpl-gallery-count" role="status">${Catalog.TEMPLATES.length} templates</span></div>
 <div class="tpl-gallery-row">${Catalog.TEMPLATES.map(d=>cardMarkup(d,true)).join('')}</div></section>`;
 document.body.appendChild(el);el.addEventListener('click',onClick);el.addEventListener('pointerover',onOver);el.addEventListener('pointerout',onOut);
 el.addEventListener('focusin',onOver);el.addEventListener('focusout',onOut);
 el._opener=opener;el._overflow=document.body.style.overflow;document.body.style.overflow='hidden';
 el._inert=[...document.body.children].filter(node=>node!==el&&!node.inert);for(const node of el._inert)node.inert=true;
 const onKey=e=>{if(document.querySelector('.tpl-detail'))return;e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closeGallery()}
  else if(e.key==='Tab'){const buttons=[...el.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};
 document.addEventListener('keydown',onKey,true);el._onKey=onKey;paintThumbs(el);el.querySelector('.tpl-round')?.focus()}
function closeGallery(){const el=document.querySelector('.tpl-gallery');if(!el)return;stopHover();disposePreviews(el);document.removeEventListener('keydown',el._onKey,true);document.body.style.overflow=el._overflow||'';for(const node of el._inert||[])node.inert=false;el.remove();if(el._opener?.isConnected)el._opener.focus({preventScroll:true});reconcilePreviews()}
function filterGallery(value){const gallery=document.querySelector('.tpl-gallery');if(!gallery)return;
 gallery.querySelectorAll('[data-tpl-action="gallery-filter"]').forEach(button=>{const on=button.dataset.value===value;button.classList.toggle('is-on',on);button.setAttribute('aria-pressed',String(on))});
 let count=0;gallery.querySelectorAll('.tpl-card').forEach(card=>{card.hidden=!inFilter(Catalog.get(card.dataset.tpl),value);if(!card.hidden)count++});gallery.querySelector('.tpl-gallery-count').textContent=`${count} template${count===1?'':'s'}`;reconcilePreviews()}


/* ---------- Automatic transcription for captions and speech-synced headlines ---------- */
const tx={running:false,total:0,done:0,progress:0,error:'',for:null};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const needsSpeech=t=>!!t&&t.elements.some(e=>e.type==='captions'&&!e.words?.length);
function speechAssets(){const media=new Map((E().media()||[]).map(m=>[m.id,m]));return [...new Set(E().snapshot().clips.filter(c=>c.kind==='video'&&c.mediaId).map(c=>c.mediaId))].filter(id=>{const a=media.get(id)?.analysis;return !a?.transcribed&&a?.hasAudio!==false})}
const canTranscribe=()=>!!Cloud()?.isConnected?.()&&!!ui.status?.transcription;
async function ensureTranscripts(auto=true){const t=E().template.get();if(tx.running||!t||!canTranscribe())return;const need=speechAssets();
 if(!need.length){if(needsSpeech(t))await refreshFromTranscript();return}
 const C=Cloud(),pid=C.project().id;Object.assign(tx,{running:true,total:need.length,done:0,progress:0,error:'',for:t.id});rerender();
 for(const id of need){try{await C.api(`/api/projects/${pid}/assets/${id}/analysis`,{method:'POST',body:{kind:'transcribe'}})}catch(e){if(e.status!==409)tx.error=e.message}}
 const t0=Date.now();
 while(Date.now()-t0<300000&&!tx.error){await wait(2500);let r;try{r=await C.api(`/api/projects/${pid}/intelligence`)}catch{continue}
  const by=new Map(r.analyses.map(a=>[a.assetId,a])),tasks=r.tasks.filter(k=>need.includes(k.assetId)&&k.kind==='transcribe');
  tx.done=need.filter(id=>by.get(id)?.transcribed).length;const active=tasks.filter(k=>k.status==='running'||k.status==='queued');
  tx.progress=Math.round((tx.done+active.reduce((n,k)=>n+(k.progress||0)/100,0))/need.length*100);updateTxStrip();
  if(tx.done===need.length)break;
  const failed=tasks.filter(k=>k.status==='failed');if(failed.length&&!active.length&&tx.done+failed.length>=need.length){tx.error=failed[0].error||'Transcription failed';break}}
 tx.running=false;
 if(tx.done>0&&E().template.get()?.id===tx.for)await refreshFromTranscript();
 else if(tx.error&&!auto)E().notify(tx.error);
 rerender()}
/** Re-lay the template with the transcript: captions get word timings; local layouts also get speech-synced headlines. Style edits are kept. */
async function refreshFromTranscript(){const cur=E().template.get();if(!cur||cur.id==='custom'||!Catalog.get(cur.id))return;const C=Cloud();
 try{await C.saveNow?.();const r=await C.api(`/api/projects/${C.project().id}/template`,{method:'POST',body:{mode:'apply',templateId:cur.id,engine:'local',brief:''}});
  const fresh=r.template;if(!fresh?.elements?.length)return;let next;
  if(cur.engine==='claude'){const caps=fresh.elements.filter(e=>e.type==='captions');next={...cur,elements:cur.elements.map(e=>e.type==='captions'?{...e,words:(caps.find(c=>Math.abs(c.start-e.start)<1)||caps[0])?.words||e.words}:e)}}
  else next={...fresh,style:cur.style,grade:cur.grade,engine:cur.engine};
  E().template.set(Catalog.sanitize(next),'Captions synced to speech');templateRevision++;E().notify(`Captions and headlines synced to ${r.grounding?.words||'your'} spoken words`)}
 catch(e){E().notify(e.message||'Could not sync captions')}}
function txStripMarkup(){const t=E()?.template?.get?.();if(!t)return '';
 if(tx.running)return `<div class="tpl-tx is-running" role="status"><span class="tpl-spin"></span><div><strong>Transcribing speech</strong><small>Captions and headlines sync when it finishes</small><span class="tpl-tx-bar"><i style="width:${Math.max(4,tx.progress)}%"></i></span></div></div>`;
 if(!needsSpeech(t))return '';
 if(canTranscribe()&&speechAssets().length)return `<div class="tpl-tx${tx.error?' is-error':''}"><span class="tpl-tx-ico">${ico(tx.error?'alert-triangle':'captions')}</span><div><strong>${tx.error?'Transcription failed':'Captions need speech'}</strong><small title="${esc(tx.error||'')}">${tx.error?'The speech service didn\'t respond. Retry in a moment.':'Transcribe once and every word gets timed'}</small></div><button type="button" class="tpl-tx-go" data-tpl-action="transcribe">${tx.error?'Retry':'Transcribe'}</button></div>`;
 return `<div class="tpl-tx"><span class="tpl-tx-ico">${ico('captions')}</span><div><strong>Captions need speech</strong><small>${!Cloud()?.isConnected?.()?'Sign in to transcribe your clip automatically':ui.status?.transcription?'This clip has no speech to caption':'Speech transcription is not set up on this server'}</small></div></div>`}
function updateTxStrip(){const el=panelRoot?.querySelector('.tpl-tx');if(!el)return rerender();const bar=el.querySelector('.tpl-tx-bar i');if(bar)bar.style.width=Math.max(4,tx.progress)+'%'}

/* ---------- Actions ---------- */
function timelineCtx(){const st=E().template.context();return st}
async function applyTemplate(id){const d=Catalog.get(id);if(!d||ui.busy)return;const ctx=timelineCtx();if(!ctx.duration)return E().notify('Add footage to the timeline before applying a template');
 const cloud=Cloud()?.isConnected?.();
 if(cloud){ui.busy=id;rerender();refreshGallery();try{await Cloud().saveNow?.();const pid=Cloud().project().id;const r=await Cloud().api(`/api/projects/${pid}/template`,{method:'POST',body:{mode:'apply',templateId:id,engine:ui.claudeOn&&claudeReady()?'claude':'local',brief:''}});
   commit(r.template,`Applied ${d.name}${r.engine==='claude'?' with AI':''}`,r);}
  catch(e){E().notify(e.message||'Template failed');if(e.status!==401&&e.status!==429){commit(Catalog.build(id,ctx),`Applied ${d.name} (local layout)`)}}
  finally{ui.busy=null;rerender();refreshGallery()}return}
 commit(Catalog.build(id,ctx),`Applied ${d.name}`)}
async function claudeRun(mode,brief){if(!claudeReady())return E().notify(claudeHint());const cur=E().template.get();ui.busy=mode==='create'?'custom':cur?.id;rerender();
 try{await Cloud().saveNow?.();const pid=Cloud().project().id;const r=await Cloud().api(`/api/projects/${pid}/template`,{method:'POST',body:{mode,templateId:mode==='apply'?cur?.id:null,brief,engine:'claude'}});commit(r.template,mode==='create'?`AI designed “${r.template.name}”`:`AI refined ${r.template.name}`,r)}
 catch(e){E().notify(e.message||'AI could not finish this request')}finally{ui.busy=null;rerender()}}
function commit(instance,label,res){if(!instance)return;const clean=Catalog.sanitize(instance);if(!clean)return;E().template.set(clean,label);ui.selected=null;templateRevision++;
 if(clean.needsSubject&&Seg.status==='idle')loadSegmenter();
 if(res?.message){const g=res.grounding||{};const bits=[g.words?`${g.words} transcript words`:'',g.beats?`${g.beats} beats`:'',g.frames?`${g.frames} frames`:''].filter(Boolean).join(', ');E().notify(`${res.message}${bits?` (grounded in ${bits})`:''}`)}
 closeDetail();closeGallery();rerender();if(needsSpeech(clean)&&canTranscribe())setTimeout(()=>ensureTranscripts(true),300)}
function refreshGallery(){for(const scope of document.querySelectorAll('.tpl-gallery,.tpl-detail'))scope.querySelectorAll('[data-tpl-action="apply"]').forEach(btn=>{const d=Catalog.get(btn.dataset.id);if(!d)return;btn.disabled=!!ui.busy;if(btn.classList.contains('tpl-primary')){if(ui.busy===d.id)btn.innerHTML='<span class="tpl-spin"></span>Fitting…'}else btn.innerHTML=applyLabel(d,E()?.template?.get?.()?.id===d.id)})}
function editTemplate(fn,{label='Edit template',final=false}={}){const t=E().template.get();if(!t)return;if(!ui.editSession){E().template.begin(label);ui.editSession=true}const next=structuredClone(t);fn(next);E().template.touch(Catalog.sanitize(next)||t);templateRevision++;if(final){ui.editSession=false;E().template.commit()}}
function onClick(ev){const a=ev.target.closest('[data-tpl-action]');if(!a)return;const act=a.dataset.tplAction,idx=Number(a.dataset.index);
 if(a.tagName==='SELECT'||a.type==='checkbox')return;
 switch(act){
  case 'apply':ev.stopPropagation();applyTemplate(a.dataset.id);break;
  case 'preview':ev.stopPropagation();togglePreview(a.closest('.tpl-card'));break;
  case 'filter':ui.filter=a.dataset.value;applyPanelFilter();break;
  case 'clear-search':ui.query='';ui.filter='all';{const inp=panelRoot?.querySelector('.tpl-search input');if(inp)inp.value=''}applyPanelFilter();break;
  case 'detail':ev.stopPropagation();openDetail(a.dataset.id);break;
  case 'transcribe':tx.error='';ensureTranscripts(false);break;
  case 'font':editTemplate(t=>{t.style.font=a.dataset.value},{label:'Template font',final:true});rerender();break;
  case 'ai-open':ui.aiOpen=true;rerender();requestAnimationFrame(()=>panelRoot?.querySelector('[data-tpl-brief="create"]')?.focus());break;
  case 'ai-idea':ui.brief=a.dataset.value;ui.aiOpen=true;rerender();requestAnimationFrame(()=>{const t=panelRoot?.querySelector('[data-tpl-brief="create"]');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}});break;
  case 'sign-in':Cloud()?.openAccount?.();break;
  case 'view':{ui.view=a.dataset.value==='list'?'list':'grid';try{localStorage.setItem('replotre_tpl_view',ui.view)}catch{}const g=panelRoot?.querySelector('.tpl-grid');g?.classList.toggle('is-list',ui.view==='list');panelRoot?.querySelectorAll('[data-tpl-action="view"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===ui.view)));reconcilePreviews();break}
  case 'close-detail':closeDetail();break;
  case 'detail-step':stepDetail(Number(a.dataset.step));break;
  case 'toggle-sec':{const k=a.dataset.sec;ui.open[k]=!ui.open[k];rerender();break}
  case 'gallery-filter':filterGallery(a.dataset.value);break;
  case 'gallery':openGallery();break;case 'close-gallery':closeGallery();break;
  case 'create':{const brief=(document.querySelector('[data-tpl-brief="create"]')?.value||'').trim();ui.brief=brief;if(!brief)return E().notify('Describe the look you want first');claudeRun('create',brief);break}
  case 'refit':{const brief=(document.querySelector('[data-tpl-brief="refit"]')?.value||'').trim();claudeRun('apply',brief);break}
  case 'remove':E().template.set(null,'Removed template');ui.selected=null;rerender();break;
  case 'select-element':{const e=E().template.get()?.elements[idx];ui.selected=ui.selected===e?.id?null:e?.id;rerender();if(e&&ui.selected)E().template.seek(e.start+Math.min(.6,e.duration/2));break}
  case 'seek-element':{const e=E().template.get()?.elements[idx];if(e)E().template.seek(e.start+.05,true);break}
  case 'delete-element':editTemplate(t=>t.elements.splice(idx,1),{label:'Remove template element',final:true});ui.selected=null;rerender();break;
 }}
function onChange(ev){const el=ev.target;const final=ev.type==='change';
 if(el.matches('.tpl-search input')){ui.query=el.value.trim();applyPanelFilter();return}
 if(el.matches('[data-tpl-brief="create"]')){ui.brief=el.value;autosize(el);el.closest('.tpl-ai')?.classList.toggle('has-text',!!el.value.trim());return}
if(el.type==='color')el.parentElement?.style.setProperty('--c',el.value);
 if(el.type==='range')el.style.setProperty('--fill',`${((el.value-el.min)/(el.max-el.min)*100).toFixed(1)}%`);
 if(el.matches('[data-tpl-action="toggle-claude"]')){ui.claudeOn=el.checked;return}
 if(el.matches('[data-tpl-action="add-element"]')){const type=el.value;if(!type)return;const ctx=timelineCtx(),now=E().template.playhead();editTemplate(t=>{const d=Math.min(4,Math.max(.5,ctx.duration-now));const base={type,start:Math.max(0,Math.min(now,ctx.duration-.5)),duration:type==='captions'||type==='streaks'?ctx.duration-now:d,text:{headline:'Your headline',keyword:'',glassCard:'A thought worth keeping',phoneCard:'Type something',lowerThird:'Your name',cta:'Learn more',badge:'+',quote:'Say the important thing.',counter:'',dateStamp:''}[type]||'',sub:'',items:type==='steps'?['Start','Build','Ship']:type==='chips'?['Idea','Draft']:type==='keyword'?['BOLD','LOUD']:[],emphasis:[],value:type==='counter'?10:0,behind:false,position:'center',variant:type==='captions'?'box':'minimal'};if(type==='keyword'||type==='flash')base.beats=Catalog.beatsIn({beats:[]},base.start,base.start+base.duration,.6);if(type==='captions')base.text=ctx.script?.slice(0,160)||'Your words appear here as captions';base.id=`tpl_${Date.now().toString(36)}`;t.elements.push(base);ui.selected=base.id},{label:`Add ${type}`,final:true});rerender();return}
 const sk=el.dataset.tplStyle;if(sk){editTemplate(t=>{let v;if(el.type==='checkbox')v=el.checked;else if(el.type==='range')v=Number(el.value)/100;else v=el.value;t.style[sk]=v;if(sk==='washA'){const n=parseInt(v.slice(1),16),f=x=>Math.round(x*.3).toString(16).padStart(2,'0');t.style.washB=`#${f(n>>16&255)}${f(n>>8&255)}${f(n&255)}`}},{label:'Template style',final});const out=el.parentElement?.querySelector('output');if(out)out.textContent=el.value;return}
 const ek=el.dataset.tplEl;if(ek){const i=Number(el.dataset.index);editTemplate(t=>{const e=t.elements[i];if(!e)return;if(ek==='items'||ek==='emphasis')e[ek]=el.value.split(',').map(x=>x.trim()).filter(Boolean);else if(ek==='behind')e.behind=el.checked;else if(['start','duration','value'].includes(ek)){const n=Number(el.value);if(Number.isFinite(n))e[ek]=n}else e[ek]=el.value;if(ek==='text'&&e.type==='keyword'&&!e.items.length)e.items=[el.value]},{label:'Edit template element',final});
  if(final&&['start','duration','position','variant','behind'].includes(ek))rerender();return}}
function onOver(ev){if(ev.pointerType==='touch')return;const card=ev.target.closest?.('.tpl-card');if(card&&card!==hoverAnim?.card)startHover(card)}
function onOut(ev){const card=ev.target.closest?.('.tpl-card');if(card&&!card.contains(ev.relatedTarget))stopHover()}
function bind(root){if(root._tplBound)return;root._tplBound=true;root.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.matches?.('[data-tpl-brief="create"]')&&!e.target.value.trim()){e.preventDefault();ui.aiOpen=false;ui.brief='';rerender();panelRoot?.querySelector('[data-tpl-action="ai-open"]')?.focus();return}if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.target.matches?.('[data-tpl-brief="create"],[data-tpl-brief="refit"]')){e.preventDefault();e.target.closest('.tpl-ai,.tpl-refit')?.querySelector('[data-tpl-action="create"],[data-tpl-action="refit"]')?.click()}});root.addEventListener('click',onClick);root.addEventListener('input',onChange);root.addEventListener('change',onChange);root.addEventListener('pointerover',onOver);root.addEventListener('pointerout',onOut);root.addEventListener('focusin',onOver);root.addEventListener('focusout',onOut)}

let lastConnected=null;window.addEventListener('replotre:cloud',()=>{const c=!!Cloud()?.isConnected?.();if(c!==lastConnected){lastConnected=c;rerender()}});
window.ReplotreTemplates={drawUnder,drawOver,frameKey,render:root=>{bind(root);renderPanel(root)},openGallery,openDetail:id=>openDetail(id),segmentation:()=>Seg.status,loadDepth:loadSegmenter,
 workspace:()=>({filter:ui.filter,query:ui.query,view:ui.view}),
 restoreWorkspace:settings=>{const s=window.ReplotreWorkspaceState?.sanitize({templates:settings}).templates;if(s){ui.filter=s.filter;ui.query=s.query;ui.view=s.view}},
 invalidate:()=>{templateRevision++},rerender,_paintPreview:paintPreview,_previewInstance:previewInstance};
})();
