/* Replotre landing v2 — progressive enhancement; the page reads fine without it. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,finePointer=matchMedia('(hover: hover) and (pointer: fine)').matches;
// Ambient hero motion stops for reduced motion, data saver / low-memory devices ("lite"), or when the visitor pauses it ("calm").
const coarse=matchMedia('(pointer: coarse)').matches,maxDpr=()=>Math.min(coarse?1.5:2,devicePixelRatio||1);
const motionOff=()=>reduce||document.documentElement.classList.contains('lite')||document.documentElement.classList.contains('calm');
// Cached element rect for pointer handlers: re-measured at most once after a scroll/resize, so pointermove never forces a layout.
const rectOf=(()=>{const cache=new Map();const clear=()=>cache.clear();addEventListener('scroll',clear,{passive:true,capture:true});addEventListener('resize',clear,{passive:true});
 const ro=new ResizeObserver(clear);return el=>{let r=cache.get(el);if(!r){r=el.getBoundingClientRect();cache.set(el,r);ro.observe(el)}return r}})();
const tc=t=>{const frames=Math.floor(Math.max(0,t)*30+1e-7),f=frames%30,s=Math.floor(frames/30)%60,m=Math.floor(frames/1800)%60,p=n=>String(n).padStart(2,'0');return `00:${p(m)}:${p(s)}:${p(f)}`};
$('#year').textContent=new Date().getFullYear();

/* ---------- Theme: light by default, toggle persists ---------- */
const root=document.documentElement,themeBtn=$('#themeBtn'),metaTheme=$('meta[name="theme-color"]');
const applyTheme=t=>{root.dataset.theme=t;themeBtn.setAttribute('aria-label',t==='dark'?'Switch to light theme':'Switch to dark theme');metaTheme?.setAttribute('content',t==='dark'?'#0c0d0e':'#f7f4ee')};
applyTheme(root.dataset.theme==='dark'?'dark':'light');
themeBtn.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';applyTheme(next);try{localStorage.setItem('replotre_theme',next)}catch(e){}});

/* ---------- Nav: glass + reading progress, sliding active pill, chapter sheet, chapter rail ---------- */
const nav=$('#nav'),prog=$('#navProg'),rail=$('#chRail');
const CHAPTERS=['how','features','looks','craft','why','faq'].map(id=>document.getElementById(id)).filter(Boolean);
const navLinks=$$('.nav-links a'),linksBox=$('.nav-links'),ind=$('.nav-ind'),railLinks=rail?$$('a',rail):[],railHead=rail&&$('.ch-head',rail);
let activeCh='';
const moveInd=()=>{if(!ind)return;const a=navLinks.find(x=>x.classList.contains('active'));ind.classList.toggle('on',!!a);if(a){ind.style.setProperty('--x',a.offsetLeft+'px');ind.style.setProperty('--w',a.offsetWidth+'px')}};
if(ind){linksBox.classList.add('has-ind');let lw=innerWidth;addEventListener('resize',()=>{if(innerWidth!==lw){lw=innerWidth;moveInd()}},{passive:true})}
const setActive=id=>{if(id===activeCh)return;activeCh=id;
 navLinks.forEach(a=>{const on=a.getAttribute('href')===`#${id}`;a.classList.toggle('active',on);on?a.setAttribute('aria-activeCh','location'):a.removeAttribute('aria-activeCh')});
 railLinks.forEach(a=>{const on=a.getAttribute('href')===`#${id}`;a.classList.toggle('active',on);on?a.setAttribute('aria-activeCh','location'):a.removeAttribute('aria-activeCh')});moveInd()};
// Chapter progress under the nav: one segment per section, sized to that section's real share of the page at this screen size.
// Segments fill as you read; one continuous gradient runs across all of them; a playhead marks where you are. Rebuilt on layout changes.
let segs=[],progW=0,lastP=-1,chGeo=[];
const measureCh=()=>{const y=scrollY;chGeo=CHAPTERS.map(s=>{const r=s.getBoundingClientRect();return {id:s.id,top:r.top+y,h:r.height}})};
const buildProg=()=>{measureCh();if(!prog)return;const doc=document.documentElement.scrollHeight,ids=['how','features','looks','craft','why','faq','final'];
 const tops=[0,...ids.map(id=>document.getElementById(id)?.offsetTop).filter(v=>v!=null),doc];
 $$('.np-seg',prog).forEach(s=>s.remove());progW=prog.clientWidth;const gap=progW<700?2:3,head=$('.np-head',prog);segs=[];
 let x=0;for(let k=0;k<tops.length-1;k++){const s0=tops[k]/doc,s1=tops[k+1]/doc,w=Math.max(4,(s1-s0)*progW-gap);const el=document.createElement('span');el.className='np-seg';el.style.width=w+'px';
  const fill=document.createElement('i');fill.style.backgroundSize=progW+'px 100%';fill.style.backgroundPosition=-x+'px 0';el.append(fill);prog.insertBefore(el,head);segs.push({el,fill,s0,s1});x+=w+gap}
 lastP=-1};
const paintProg=p=>{if(!segs.length||Math.abs(p-lastP)<.0005)return;lastP=p;
 for(const s of segs){const f=Math.max(0,Math.min(1,(p-s.s0)/(s.s1-s.s0)));s.fill.style.transform=`scaleX(${f.toFixed(4)})`;s.el.classList.toggle('on',f>0&&f<1)}
 prog.style.setProperty('--px',(p*progW).toFixed(1)+'px');prog.classList.toggle('np-end',p>.995)};
{let pb=0;const re=()=>{cancelAnimationFrame(pb);pb=requestAnimationFrame(()=>{buildProg();onScroll()})};new ResizeObserver(re).observe(document.body);addEventListener('load',re)}
let ticking=false;
const onScroll=()=>{ticking=false;const y=scrollY,vh=innerHeight,max=document.documentElement.scrollHeight-vh;nav.classList.toggle('scrolled',y>8);
 if(prog)paintProg(max>0?Math.min(1,y/max):0);
 // active chapter: the last one whose top has passed 40% of the viewport
 // (pure arithmetic on cached geometry: no layout reads while scrolling)
 const mid=y+vh*.4;let id='';for(const g of chGeo){if(g.top<mid)id=g.id}
 const last=chGeo[chGeo.length-1];if(last&&last.top+last.h<mid)id='';
 setActive(id);
 if(rail&&chGeo.length){rail.classList.toggle('on',!!id);
  // playhead: position between chapter ticks, proportional to progress through the chapter in view
  const i=chGeo.findIndex(g=>g.id===id);if(i>=0){const g=chGeo[i],f=Math.min(1,Math.max(0,(mid-g.top)/g.h));railHead.style.setProperty('--p',((i+f)/chGeo.length).toFixed(4))}}};
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});addEventListener('resize',onScroll,{passive:true});buildProg();onScroll();
if(document.fonts?.ready)document.fonts.ready.then(moveInd);
// phone menu: full-height chapter sheet, page scroll locked while open
const menuBtn=$('#menuBtn'),menu=$('#mobileMenu');
const setMenu=open=>{menu.hidden=!open;menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');nav.classList.toggle('menu-on',open);root.classList.toggle('menu-open',open);
 if(open){nav.style.setProperty('--navh',$('.nav-in',nav).offsetHeight+'px');$('a',menu)?.focus({preventScroll:true})}};
menuBtn.addEventListener('click',()=>setMenu(menu.hidden));
menu.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){setMenu(false);menuBtn.focus()}
 // keep Tab inside the open sheet (menu button + sheet links)
 if(e.key==='Tab'&&!menu.hidden){const f=[menuBtn,...$$('a',menu)],i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus()}}});
matchMedia('(min-width:901px)').addEventListener('change',e=>{if(e.matches&&!menu.hidden)setMenu(false)});

/* ---------- How it works: dots follow the swipeable cards on phones ---------- */
{const list=$('.steps3'),dots=$$('#howDots i');
 if(list&&dots.length){const cards=$$('.step3',list);let raf=0;
  const upd=()=>{raf=0;const x=list.scrollLeft,w=list.scrollWidth-list.clientWidth;let i=w>0?Math.round(x/w*(cards.length-1)):0;dots.forEach((d,k)=>d.classList.toggle('on',k===i))};
  list.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(upd)},{passive:true})}}

/* ---------- Final CTA: the prompt opens the studio with your words in the Director ---------- */
{const f=$('#finalPrompt'),inp=$('#finalPromptInput');
 if(f&&inp){const EX=['Describe your first edit…','Make it vertical with a big title','Slow it down and fade in from black','Give it a warm, cinematic look'];let k=0;
  if(!reduce)setInterval(()=>{if(inp.value||document.activeElement===inp)return;k=(k+1)%EX.length;inp.placeholder=EX[k]},3200);
  f.addEventListener('submit',e=>{if(!inp.value.trim()){e.preventDefault();location.href='/studio'}});
  $$('.final-ideas [data-q]').forEach(b=>b.addEventListener('click',()=>{inp.value=b.dataset.q;inp.focus();const n=inp.value.length;inp.setSelectionRange(n,n);
   $$('.final-ideas [data-q]').forEach(x=>x.classList.toggle('is-on',x===b))}));
  inp.addEventListener('input',()=>$$('.final-ideas [data-q]').forEach(x=>x.classList.toggle('is-on',x.dataset.q===inp.value)))}}

/* ---------- Headline: word-by-word reveal ---------- */
const h1=$('.split-words');
if(h1){let i=0;for(const line of h1.querySelectorAll('.line')){const words=line.textContent.trim().split(/\s+/);line.textContent='';words.forEach((w,k)=>{const s=document.createElement('span');s.className='w';s.textContent=w;s.style.transitionDelay=`${80+i++*55}ms`;line.append(s);if(k<words.length-1)line.append(' ')})}
 requestAnimationFrame(()=>requestAnimationFrame(()=>h1.classList.add('in')))}

/* ---------- Reveal on scroll ---------- */
const io=new IntersectionObserver(entries=>{for(const en of entries){if(!en.isIntersecting)continue;const el=en.target,sib=[...el.parentElement.children].filter(c=>c.classList.contains('reveal'));el.style.transitionDelay=`${Math.min(6,sib.indexOf(el))*70}ms`;el.classList.add('in');io.unobserve(el)}},{rootMargin:'0px 0px -8% 0px',threshold:.08});
$$('.reveal').forEach(el=>reduce?el.classList.add('in'):io.observe(el));

/* ---------- Card spotlight ---------- */
// pointer spotlights: at most one style write per frame per element, using a cached rect (no forced layout per mousemove)
const spotlight=(el,vx,vy)=>{let raf=0,x=0,y=0;el.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=rectOf(el);x=Math.round(e.clientX-r.left);y=Math.round(e.clientY-r.top);
 if(!raf)raf=requestAnimationFrame(()=>{raf=0;el.style.setProperty(vx,x+'px');el.style.setProperty(vy,y+'px')})},{passive:true})};
if(finePointer)for(const card of $$('.card'))spotlight(card,'--mx','--my');

/* ---------- Interactive studio: scripted edits, synchronized vector playback ---------- */
const studio=$('#demo'),promptEl=$('#demoPrompt'),statusEl=$('#demoStatus'),tcEl=$('#demoTc'),editsEl=$('#demoEdits'),countEl=$('#demoCount');
let setFx=()=>{},paintPack=()=>{},clearPack=()=>{},paintFx=()=>{};
const SC={
 a:{name:'Summer reel',prompt:'Add a title saying “Launch day”, crossfade the shots and make the colors pop',edits:[['T','Add “Launch day”','Editorial title · slide up'],['×','Crossfade the shots','0.6 seconds · a softer cut'],['◑','Make the colors pop','Vivid · saturation 130%']],ratio:'9:16',format:'1080 × 1920',title:'Launch day',duration:8.4,cut:4.2},
 b:{name:'YouTube vlog',prompt:'Slow the first shot to half speed, fade in from black and make it landscape',edits:[['½','Slow down Vlog.mp4','0.5× speed · twice the moment'],['◐','Fade in from black','1.0 second · a gentle opening'],['↔','Landscape with a blurred fill','16:9 · 1920 × 1080']],ratio:'16:9',format:'1920 × 1080',title:'',duration:13.5,cut:9},
 d:{name:'Talking reel',prompt:'Add captions word by word, highlight the key words and punch in on her face',edits:[['CC','Auto captions','Word by word · from the speech'],['★','Highlight key words','Brand color on emphasis'],['◇','Punch in on the face','Zoom 100% → 114% · on each phrase']],ratio:'9:16',format:'1080 × 1920',title:'Auto captions',duration:9,cut:9},
 e:{name:'Hype edit',prompt:'Speed ramp into the second shot, flash on the cut and punch the zoom on the beat',edits:[['⇢','Speed ramp','1× → 2.5× → 0.4×'],['◎','Flash cut','White flash · 4 frames'],['⤢','Zoom on the beat','112% punch · every 0.6 s']],ratio:'9:16',format:'1080 × 1920',title:'',duration:8,cut:4},
 f:{name:'Two takes',prompt:'Put both clips in a split screen, top and bottom, and label each take',edits:[['▤','Split screen','Top and bottom · 9:16'],['▶','Play both at once','Synced from 00:00'],['T','Label each take','“Take 1” · “Take 2”']],ratio:'9:16',format:'1080 × 1920',title:'Take 1 · Take 2',duration:6,cut:3},
 c:{name:'Feed post',prompt:'Give it a warm film look, make it square for Instagram and slowly push in',edits:[['◒','Apply a warm film look','Warm · contrast 115%'],['□','Square for the feed','1:1 · 1080 × 1080'],['◇','Animate the camera','Keyframes · zoom 100% → 125%']],ratio:'1:1',format:'1080 × 1080',title:'Coming soon',duration:9,cut:4.5}
};
const RAMP=[[2,1],[1.2,2.5],[.8,.4]];
// captions for the vlog clip: timed words, shown three at a time, key words in the brand colour
const CAPS='Okay so today I am showing you my favorite morning routine and honestly it is so easy'.split(' '),CAP_KEY=new Set(['favorite','morning','routine','easy']),CAP_T0=.35,CAP_W=.36;
const capIndex=t=>{const w=Math.max(0,Math.min(CAPS.length-1,Math.floor((t-CAP_T0)/CAP_W)));return {w,chunk:Math.floor(w/3)}};
const capsEl=$('#demoCaps');let capChunk=-1,capWord=-1;
const paintCaps=on=>{if(!capsEl)return;capsEl.classList.toggle('on',on);if(!on)return;const {w,chunk}=capIndex(playTime);
 if(chunk!==capChunk){capChunk=chunk;capsEl.replaceChildren(...CAPS.slice(chunk*3,chunk*3+3).map(t=>{const s=document.createElement('span');s.textContent=t;if(CAP_KEY.has(t.toLowerCase()))s.className='key';return s}));capWord=-1}
 if(w!==capWord){capWord=w;[...capsEl.children].forEach((s,i)=>s.classList.toggle('now',chunk*3+i===w))}};
const vids=$$('.scene-vid',studio),bgs=$$('.scene-bg',studio).map(c=>c.getContext('2d'));
// keep a <video> at the demo's time: play while the preview runs, otherwise pause on the exact frame
const syncVid=(v,t,rate,on)=>{if(!v||v.readyState<1||!v.duration)return;t=Math.max(0,Math.min(v.duration-.05,t));if(v.playbackRate!==rate)v.playbackRate=rate;
 const run=on&&canRun()&&!reduce&&!document.documentElement.classList.contains('lite');
 if(run){if(v.paused)v.play().catch(()=>{});if(!v.seeking&&Math.abs(v.currentTime-t)>.35)v.currentTime=t}
 // while the demo runs, a clip that isn't playing just holds its frame (no per-frame seeking); it's re-synced once when it plays again.
 // When the demo is stopped (scrubbing, stills), paused clips follow the playhead exactly.
 else{if(!v.paused)v.pause();if(!canRun()||reduce||document.documentElement.classList.contains('lite')){if(!v.seeking&&Math.abs(v.currentTime-t)>.05)v.currentTime=t}}};
vids.forEach(v=>v.addEventListener('loadeddata',()=>paint()));
const ORDER=['a','d','b','e','c','f'],seekEl=$('#demoSeek'),playBtn=$('#demoPlayback'),compareBtn=$('#demoCompare');
const shortTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;
let current='a',gen=0,pending=null,visible=false,scriptStarted=false,playing=!reduce,playTime=2.4,duration=9,cutTime=4.5,applied=false,comparing=false,snap=true,raf=0,lastFrame=0,lastPaint=0,selectedClip=-1;
const canRun=()=>visible&&playing&&!document.hidden;
const wave=$('.tl .wave');
if(wave){let d='';for(let x=1;x<840;x+=4){const envelope=.45+.55*Math.sin(x*.007)**2,a=2+Math.abs(Math.sin(x*.17)*6+Math.sin(x*.053)*5)*envelope;d+=`M${x} ${(16-a).toFixed(2)}v${(a*2).toFixed(2)}`}wave.setAttribute('d',d)}

// paint() runs ~30×/s: cache its nodes and skip writes whose value hasn't changed
const P={head:$('.tl-head',studio),headTc:$('#demoHeadTc'),src:$('#demoSource')},lastTxt=new Map();
const setAttr=(el,k,v)=>{if(el&&el.getAttribute(k)!==v)el.setAttribute(k,v)};
const setTxt=(el,v)=>{if(el&&lastTxt.get(el)!==v){lastTxt.set(el,v);el.textContent=v}};
function paint(){
 const s=SC[current],edited=applied&&!comparing,clip=playTime<cutTime?0:1;
 // on the playhead itself, not the studio root: a custom property on the root restyles the whole demo every frame
 (P.head||studio).style.setProperty('--progress',Math.max(0,Math.min(1,playTime/duration)).toFixed(4));
 setTxt(tcEl,tc(playTime));seekEl.value=playTime;setAttr(seekEl,'aria-valuetext',`${playTime.toFixed(1)} seconds of ${duration}`);
 setTxt(P.headTc,shortTime(playTime));setTxt(P.src,clip?'FRIENDS / 002':'VLOG / 001');
 $('.s2',studio).style.opacity=edited&&current==='a'?Math.max(0,Math.min(1,(playTime-(cutTime-.3))/.6)):(clip?1:0);
 $('.veil',studio).style.opacity=edited&&current==='b'?Math.max(0,1-playTime):0;
 // real footage follows the demo clock: speed changes are real playbackRate, the crossfade overlaps both clips
 const k=current,slow=edited&&k==='b'?.5:1,bStart=edited&&k==='a'?cutTime-.3:cutTime;
 // only one clip decodes at a time: the outgoing clip holds its frame while the next one fades in (two live videos crossfading dropped the page to 30 fps)
 let tA=playTime*slow,rA=slow,onA=playTime<bStart,tB=playTime-bStart,onB=playTime>=bStart-.15;
 if(edited&&k==='e'){// speed ramp 1x → 2.5x → 0.4x into the cut: clip time is the integral of the speed curve
  let acc=0,rem=Math.min(playTime,cutTime),rate=.4;for(const [len,r] of RAMP){if(rem<=len){acc+=rem*r;rate=r;break}acc+=len*r;rem-=len}tA=acc;rA=playTime<cutTime?rate:1}
 if(edited&&k==='f'){tA=tB=playTime;onA=onB=true}
 syncVid(vids[0],tA,rA,onA);syncVid(vids[1],tB,1,onB);
 if(edited&&k==='f')$('.s2',studio).style.opacity=1;
 $('.flash',studio).style.opacity=edited&&k==='e'?Math.max(0,1-Math.abs(playTime-cutTime)/.17):0;
 // punch-in zooms (captions: on each phrase; hype: decaying punch on every beat after the cut)
 let z1=1,z2=1;
 if(edited&&k==='d'){const ci=capIndex(playTime);z1=ci.chunk%2?1.14:1}
 if(edited&&k==='e'&&playTime>=cutTime){const ph=((playTime-cutTime)%.6)/.6;z2=1+.12*Math.exp(-ph*5)}
 $('.s1',studio).style.transform=z1!==1?`scale(${z1})`:'';$('.s2',studio).style.transform=z2!==1?`scale(${z2.toFixed(3)})`:'';
 paintCaps(edited&&k==='d');paintPack(edited&&k==='p');paintFx();
 if(edited&&current==='b')vids.forEach((v,k)=>{if(v&&v.readyState>=2&&bgs[k])try{bgs[k].drawImage(v,0,0,48,27)}catch(e){}});
 if(clip!==selectedClip){selectedClip=clip;$$('[data-demo-clip]',studio).forEach(b=>{const on=+b.dataset.demoClip===clip;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',String(on))})}
}
function frameTick(now){
 raf=0;if(!canRun()){lastFrame=0;return}
 if(lastFrame)playTime=(playTime+Math.min(.1,(now-lastFrame)/1000))%duration;
 lastFrame=now;if(now-lastPaint>=33){paint();lastPaint=now}raf=requestAnimationFrame(frameTick);
}
function updateMotion(){
 studio.dataset.playing=String(playing);studio.dataset.visible=String(visible&&!document.hidden);
 playBtn.setAttribute('aria-pressed',String(playing));playBtn.setAttribute('aria-label',playing?'Pause preview':'Play preview');$('#demoPlayIcon').setAttribute('href',playing?'#demo-i-pause':'#demo-i-play');
 if(canRun()){pending?.resume();if(!raf){lastFrame=0;raf=requestAnimationFrame(frameTick)}}
 else{pending?.suspend();cancelAnimationFrame(raf);raf=0;lastFrame=0;paint()}
}
function setPlaying(on){playing=on;updateMotion()}
function seek(time,pause=true){playTime=Math.max(0,Math.min(duration,time));lastFrame=0;paint();if(pause)setPlaying(false)}

// Delays retain their remaining time when the preview is paused or off screen.
function wait(ms,g){return new Promise(resolve=>{
 const done=ok=>{if(pending===task)pending=null;resolve(ok&&g===gen)};
 const task={remaining:ms,started:null,timer:0,
  resume(){if(this.started!==null||!canRun()||g!==gen)return;this.started=performance.now();this.timer=setTimeout(()=>done(true),this.remaining)},
  suspend(){if(this.started===null)return;this.remaining=Math.max(0,this.remaining-(performance.now()-this.started));clearTimeout(this.timer);this.started=null},
  cancel(){this.suspend();done(false)}
 };pending=task;task.resume();
})}
function stopDemo(){gen++;pending?.cancel();pending=null}
function updateView(){
 const edited=applied&&!comparing,s=SC[current];studio.dataset.view=edited?'edited':'original';studio.dataset.edited=String(applied);
 $('#demoRatio').textContent=edited?s.ratio:'9:16';$('#demoViewState').textContent=edited?'Edited':'Original';
 $('#demoFormat').firstChild.nodeValue=(edited?s.format:'1080 × 1920')+' ';
 $('#demoFootState').textContent=comparing?'Comparing original':applied?'Your direction, applied':'Original footage';
 compareBtn.setAttribute('aria-pressed',String(comparing));compareBtn.firstChild.nodeValue=comparing?'Back to edit ':'View original ';
 duration=applied?s.duration:9;cutTime=applied?s.cut:4.5;
 studio.style.setProperty('--cut',`${cutTime/duration*100}%`);seekEl.max=duration;$('#demoDuration').textContent=shortTime(duration);
 $$('.tl-ruler>span',studio).forEach((el,i)=>{el.textContent=i?shortTime(duration*i/5):'00:00'});
 playTime=Math.min(playTime,duration);paint();
}
function applyProgress(n){$$('li',editsEl).forEach((li,i)=>{li.classList.toggle('is-done',i<n);$('i',li).textContent=i<n?'✓':SC[current].edits[i][0]})}
function setStep(n,label){
 studio.dataset.step=String(n);applied=n>=4;if(n===0)comparing=false;
 if(label)statusEl.textContent=label;const ne=SC[current].edits.length;countEl.textContent=n>=4?`${ne} ${current==='p'?'layers':'edits'} applied`:n===3?'Making your changes':'Your edit plan';
 const active=n<2?0:n<4?1:2;$$('.dir-workflow>span',studio).forEach((el,i)=>{el.classList.toggle('is-active',i===active);el.classList.toggle('is-done',i<active)});
 if(n===0)applyProgress(0);if(n===4){applyProgress(ne);playTime=.8;$('#demoAnnounce').textContent=`${SC[current].name}: ${SC[current].edits.map(e=>e[1]).join(', ')}. ${ne} edits applied.`}
 updateView();
}
function setScenario(k){
 current=k;const s=SC[k];studio.dataset.sc=k;$('#demoTitle').textContent=s.name;$('#demoTitleText').textContent=s.title||' ';$('#demoBlkTitle').textContent=s.title||'Title';
 $('.frame-title>small',studio).textContent=k==='c'?'A FILM IN THE MAKING':'A NEW PERSPECTIVE';$('.result-number',studio).textContent=String(s.edits.length).padStart(2,'0');if(k!=='p')clearPack();
 editsEl.replaceChildren();for(const [glyph,label,detail] of s.edits){const li=document.createElement('li'),icon=document.createElement('i'),strong=document.createElement('strong'),small=document.createElement('small');icon.textContent=glyph;icon.setAttribute('aria-hidden','true');strong.textContent=label;small.textContent=detail;li.append(icon,strong,small);editsEl.append(li)}
 $$('#tryChips .chip,#demoExamples button').forEach(c=>{const on=c.dataset.sc===k;c.classList.toggle('is-on',on);c.setAttribute('aria-pressed',String(on))});
 const sp=$('.speed',studio);if(sp)sp.textContent=k==='e'?'Ramp':'0.5×';const xf=$('.xf>span',studio);if(xf)xf.textContent=k==='e'?'◎':'×';capChunk=-1;
 selectedClip=-1;
}
let custom=null;const takeCustom=k=>{if(custom&&custom.k===k){const t=custom.text;custom=null;return t}return null};
async function runDemo(start=current){
 stopDemo();const g=gen;let k=start;
 while(g===gen){
  setScenario(k);setStep(0,'Ready');promptEl.textContent='';if(!await wait(650,g))return;
  setStep(1,'Listening');const s=SC[k],said=takeCustom(k)||s.prompt;for(let i=2;i<said.length+2;i+=2){promptEl.textContent=said.slice(0,i);if(!await wait(32,g))return}
  if(!await wait(350,g))return;setStep(2,'Planning');if(!await wait(850,g))return;
  setStep(3,'Applying');for(let i=1;i<=3;i++){if(!await wait(400,g))return;applyProgress(i)}
  setStep(4,'3 edits applied');if(!await wait(2100,g))return;setStep(5,'Previewing');if(!await wait(6900,g))return;
  k=ORDER[(ORDER.indexOf(k)+1)%ORDER.length];
 }
}
function showFinished(k){stopDemo();setScenario(k);promptEl.textContent=SC[k].prompt;setStep(4,`${SC[k].edits.length} edits applied`);setStep(5,'Preview ready');seek(2.4)}
$('#demoExamples')?.addEventListener('click',e=>{const c=e.target.closest('button[data-sc]');if(!c)return;if(reduce)showFinished(c.dataset.sc);else{setPlaying(true);runDemo(c.dataset.sc)}});
/* One-tap motion effects v2: a per-frame engine driven by the timeline clock.
   Motion goes on the inner <video> (packs move the outer scene), pixel effects
   run through one SVG filter chain (#fxChain) composed with any pack filter,
   and canvas/overlay layers live in .fx-layer. Tap again to remove. */
{const strip=$('#demoFx'),badge=$('#demoFxBadge'),keysEl=$('#demoFxKeys'),nameEl=$('#demoFxName');
 const FX={
  punch:['Punch zoom','Beat punch + radial zoom blur',[3,10,17,23,30,37,43,50,57,63,70,77,83,90,97]],
  push:['Smooth push','Eased dolly · drift · vignette',[2,50,98]],
  whipx:['Whip pan','Directional motion blur + streaks',[28,34,62,68,95]],
  hand:['Handheld','Layered-noise shake · micro jolts',[8,24,40,56,72,88]],
  chroma:['Chroma glitch','RGB split · slice bursts · scanlines',[11,13,36,38,61,63,86,88]],
  liquid:['Liquid','Turbulence displacement wobble',[0,25,50,75,100]],
  echo:['Echo trails','Feedback ghosts · colour shift',[5,50,95]],
  film:['Film look','Grain · halation · leak · gate weave',[0,33,66,100]]};
 const fN=$('#fxNoise'),fD=$('#fxDisp'),fBl=$('#fxBlur'),fR=$('#fxR'),fB=$('#fxB'),layer=$('.fx-layer',studio),cv=$('.fx-cv',studio),streak=$('.fx-streak',studio);
 let badgeT=0,buf=null,lastT=-1;
 const beat=t=>((t+10-.3)%.6)/.6, rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
 const clearCanvas=()=>{if(cv&&lastT>=0){cv.getContext('2d').clearRect(0,0,cv.width,cv.height);lastT=-1}};
 const drawVideo=(ctx,v,w,h,sc=1,a=1)=>{ctx.globalAlpha=a;try{ctx.drawImage(v,-(w*(sc-1))/2,-(h*(sc-1))/2,w*sc,h*sc)}catch(e){}ctx.globalAlpha=1};
 paintFx=()=>{
  const k=studio.dataset.fx,t=playTime,v=vids[t<cutTime?0:1],other=vids[t<cutTime?1:0];
  let tr='',flt='',split=0,disp=0,freq='0.01 0.03',blurX=0,useChain=false;
  if(layer&&layer.dataset.k!==(k||''))layer.dataset.k=k||'';
  if(k&&!reduce){const ph=beat(t),kick=Math.exp(-ph*7);
   if(k==='punch'){tr=`scale(${(1+.14*kick).toFixed(3)})`;flt=`brightness(${(1+.12*kick).toFixed(3)})`}
   else if(k==='push'){const c=(t%6)/6,e=c<.5?2*c*c:1-Math.pow(-2*c+2,2)/2,z=1.04+.16*(c<.5?e*2:2-e*2)/2;tr=`translate(${(-2*Math.sin(t*.4)).toFixed(2)}%,${(-1.5*Math.cos(t*.33)).toFixed(2)}%) rotate(${(.6*Math.sin(t*.25)).toFixed(2)}deg) scale(${z.toFixed(3)})`}
   else if(k==='whipx'){const c=(t%2.2)/2.2,w=c>.6&&c<.8?Math.sin((c-.6)/.2*Math.PI):0,dir=Math.floor(t/2.2)%2?1:-1;tr=`translateX(${(dir*36*w).toFixed(1)}%) scale(${(1+.1*w).toFixed(3)})`;blurX=14*w;useChain=w>.01;if(streak){streak.style.opacity=w.toFixed(2);streak.style.transform=`translateX(${(dir*(c-.7)*600).toFixed(0)}%)`}}
   else if(k==='hand'){const n=(a,b,c2)=>Math.sin(t*a)+.5*Math.sin(t*b+1.3)+.25*Math.sin(t*c2+2.1),j=Math.max(0,1-((t%1.5)/.12));tr=`translate(${(1.1*n(1.7,3.9,9.3)+1.2*j*Math.sin(t*90)).toFixed(2)}%,${(.9*n(1.3,4.7,8.1)+.8*j*Math.cos(t*80)).toFixed(2)}%) rotate(${(.5*n(1.1,2.9,7.7)).toFixed(2)}deg) scale(1.07)`;blurX=2.5*j;useChain=j>.05}
   else if(k==='chroma'){const win=Math.floor(t/1.1),at=rnd(win)*.85,loc=(t%1.1)-at,on=loc>=0&&loc<.18;split=on?6+8*rnd(win+.5):1.2;disp=on?28:0;freq=on?`0 ${(.18+.2*rnd(win+.7)).toFixed(3)}`:'0.01 0.03';tr=on?`translateX(${((rnd(Math.floor(t*30))-.5)*5).toFixed(2)}%)`:'';useChain=true;if(layer)layer.classList.toggle('burst',on)}
   else if(k==='liquid'){disp=12+9*Math.sin(t*1.6);freq=`${(.008+.004*Math.sin(t*.7)).toFixed(4)} ${(.02+.01*Math.cos(t*.9)).toFixed(4)}`;split=1.4;useChain=true;tr='scale(1.06)'}
   else if(k==='film'){const g=Math.floor(t*12);tr=`translate(${((rnd(g)-.5)*.5).toFixed(2)}%,${((rnd(g+.3)-.5)*.7).toFixed(2)}%) scale(1.03)`;flt='contrast(1.08) saturate(.88) sepia(.14) brightness(1.03)';if(layer)layer.style.setProperty('--gx',`${Math.floor(rnd(g)*100)}% ${Math.floor(rnd(g+.9)*100)}%`)}
  }else if(k&&reduce){tr=k==='punch'||k==='push'?'scale(1.1)':k==='hand'?'scale(1.04)':'';if(k==='chroma'){split=2;useChain=true}if(k==='liquid'){disp=8;useChain=true}if(k==='film')flt='contrast(1.08) saturate(.88) sepia(.14)'}
  if(k!=='whipx'&&streak)streak.style.opacity='0';
  if(k!=='chroma'&&layer)layer.classList.remove('burst');
  if(useChain){fBl?.setAttribute('stdDeviation',`${blurX.toFixed(2)} 0`);fD?.setAttribute('scale',disp.toFixed(1));fN?.setAttribute('baseFrequency',freq);fR?.setAttribute('dx',split.toFixed(2));fB?.setAttribute('dx',(-split).toFixed(2))}
  const fxFilter=[useChain?'url(#fxChain)':'',flt].filter(Boolean).join(' ');
  for(const vv of vids){if(!vv)continue;vv.style.transform=k?tr:'';vv.style.filter=[vv.dataset.hf||'',k?fxFilter:''].filter(Boolean).join(' ')}
  // canvas effects: radial zoom blur (punch) and feedback echoes (echo)
  if(cv&&(k==='punch'||k==='echo')&&v&&v.readyState>=2&&t!==lastT&&!reduce){lastT=t;const ctx=cv.getContext('2d'),w=cv.width,h=cv.height;
   if(k==='punch'){ctx.clearRect(0,0,w,h);const kick=Math.exp(-beat(t)*7);if(kick>.12)for(let i=1;i<=4;i++)drawVideo(ctx,v,w,h,1+.035*i*kick+.14*kick,.22*kick)}
   else{if(!buf){buf=document.createElement('canvas');buf.width=w;buf.height=h}const bx=buf.getContext('2d');bx.clearRect(0,0,w,h);bx.drawImage(cv,0,0);ctx.clearRect(0,0,w,h);ctx.globalAlpha=.86;const g=.04;ctx.drawImage(buf,-w*g/2,-h*g/2,w*(1+g),h*(1+g));drawVideo(ctx,v,w,h,1,.4)}}
  else if(k!=='punch'&&k!=='echo')clearCanvas();
 };
 const set=setFx=(k,quiet)=>{const on=k&&FX[k];if(on)studio.dataset.fx=k;else delete studio.dataset.fx;clearCanvas();
  $$('.fx-tile',strip).forEach(b=>{const a=b.dataset.fx===k;b.classList.toggle('is-on',a);b.setAttribute('aria-pressed',String(a))});
  paintFx();
  if(!on){if(!quiet){statusEl.textContent=applied?`${SC[current].edits.length} edits applied`:'Ready';$('#demoAnnounce').textContent='Motion effect removed'}return}
  const [name,detail,keys]=FX[k];nameEl.textContent=name;keysEl.replaceChildren(...keys.map(p=>{const i=document.createElement('i');i.style.left=p+'%';return i}));
  const blk=$('#demoFxBlk');if(quiet)return;blk.classList.remove('pop');void blk.offsetWidth;blk.classList.add('pop');
  badge.textContent='';const b=document.createElement('b');b.textContent=name;const sm=document.createElement('small');sm.textContent=detail;badge.append(b,sm);
  badge.classList.remove('show');void badge.offsetWidth;badge.classList.add('show');clearTimeout(badgeT);badgeT=setTimeout(()=>badge.classList.remove('show'),1500);
  statusEl.textContent=`${name} applied`;$('#demoAnnounce').textContent=`${name} motion effect applied to the preview`;
  if(!playing)setPlaying(true)};
 strip?.addEventListener('click',e=>{const t=e.target.closest('.fx-tile');if(!t)return;set(studio.dataset.fx===t.dataset.fx?null:t.dataset.fx);
  t.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduce?'auto':'smooth'})})}
/* Style packs: one tap turns the sample into a styled edit. The Director plans it, then lays down
   six timed motion-graphics layers (on the frame and as GFX clips on the timeline) plus a camera move. */
let runPack=()=>{},packFor=()=>null;
{const mg=$('#demoMg'),gfx=$('#demoGfx'),strip=$('#demoFx');
 const POD_CAPS='I almost quit after my first video but this one change tripled my views overnight',POD_KEYS=['quit','one','change','tripled','overnight'];
 const LS=(s,o=0)=>[...s].map((c,i)=>c===' '?'<i class="sp"></i>':`<span style="--i:${i+o}">${c}</span>`).join('');
 const W=(s,o=0)=>s.split(' ').map((w,i)=>`<span style="--i:${i+o}">${w}</span>`).join(' ');
 const PACKS={
  estate:{name:'Kinetic Stack',fx:null,re:/real ?estate|property|realtor|listing|house|home tour|apartment|villa|dubai|kinetic|stack/i,
   prompt:'Edit it like a top realtor reel: stacked kinetic text, words behind my head, an incoming-call pop-up, a whip into black and white with floating B-roll, a strike-through and a giant 48',
   zoom:t=>t<1.9?1:t<4.3?1.12:t<4.5?1:t<6.9?1:1.1,
   layers:[
    {g:'Aa',n:'Kinetic hook stack',d:'3-tier type · blur pop · whip out',t:[.15,1.9],c:'mg-stack s-hook',h:'<span class="sm" style="--i:0">you</span><span class="xl y" style="--i:1"><b>know</b></span><span class="sm" style="--i:2">that agent</span>'},
    {g:'◐',n:'Text behind subject',d:'Depth matte · “more” behind the head',t:[1.9,4.3],c:'mg-depth d1',h:'<span class="dp-back"><b>more</b></span><div class="dp-front mg-stack"><span class="sm" style="--i:0">that</span><span class="xl r" style="--i:1"><b>sells</b></span><span class="md" style="--i:2">way</span></div>'},
    {g:'✆',n:'Incoming call pop-up',d:'Glass card · spring · ringing',t:[2.7,4.3],c:'mg-call',h:'<span class="cc-ava"><svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></span><span class="cc-txt"><b>Seller</b><small>Incoming call…</small></span><span class="cc-btns"><i class="no"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></i><i class="yes"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2"/></svg></i></span>'},
    {g:'⇋',n:'Whip-blur transition',d:'Directional blur · streaks',t:[4.2,4.85],c:'mg-whip2',h:'<i></i><i></i><i></i><i></i>'},
    {g:'▣',n:'B&W + 3D B-roll cards',d:'Grade to mono · cards float behind',t:[4.8,6.9],c:'mg-cards bw d2',h:'<span class="cd c1"><i class="ph-pool"></i><em>Miami</em></span><span class="cd c2"><i class="ph-sky"></i></span><span class="cd c3"><i class="ph-villa"></i><em>Listed</em></span>'},
    {g:'⌁',n:'Strike-through stack',d:'Hand-drawn red strike',t:[4.9,6.9],c:'mg-stack s-strike',h:'<span class="md" style="--i:0">they’re not</span><span class="xl y" style="--i:1"><b>actually</b></span><span class="md" style="--i:2">better</span><svg class="mg-strike" viewBox="0 0 100 40" preserveAspectRatio="none"><path pathLength="100" d="M4 30C30 22 62 14 96 6"/></svg>'},
    {g:'48',n:'Giant number',d:'Counts to 48 · 3D tilt behind text',t:[6.9,8.95],c:'mg-num',h:'<b class="nm" data-count="48" data-fmt="{v}">0</b><span class="sm" style="--i:0">we post</span><span class="xl r" style="--i:1"><b>videos</b></span><span class="md" style="--i:2">a month</span>'}]},
  lux:{name:'Hyper Motion',fx:null,hyper:true,re:/hyper|music video|glitch|rgb|velocity|warp|trippy|beat|energetic/i,
   prompt:'Give it a hyper-motion music video edit: beat-synced punches and flashes, RGB split, a decoding title, a face-tracking HUD, a slice wipe, a liquid warp hit and echo trails',
   cam:t=>{const ph=((t+10-.3)%.6)/.6,k=Math.exp(-ph*6),x=Math.sin(t*53)*.9*Math.exp(-ph*4),y=Math.cos(t*41)*.7*Math.exp(-ph*4);return `translate(${x.toFixed(2)}%,${y.toFixed(2)}%) scale(${(1.04+.08*k).toFixed(3)})`},
   layers:[
    {g:'♫',n:'Beat sync',d:'Punch + shake + flash · every beat',t:[0,9.1],c:'mg-beat'},
    {g:'≋',n:'RGB split',d:'Chromatic aberration · pulses on beats',t:[0,9.1],c:'mg-rgb'},
    {g:'⌗',n:'Decode title',d:'Glyph scramble → resolve',t:[.3,2.9],c:'mg-decode',h:'<b class="dc" data-text="NEW ERA"></b><small class="dc" data-text="OF REAL ESTATE // 2026"></small>'},
    {g:'⌖',n:'Face-tracking HUD',d:'Lock-on brackets · scan · REC',t:[2,4.4],c:'mg-track',h:'<span class="tk-rec"><i></i>REC</span><span class="tk-tc"></span><span class="tk-box"><em>SUBJECT_01 · LOCK <b>0</b>%</em><i class="tk-scan"></i><i class="tk-x"></i></span>'},
    {g:'▥',n:'Slice wipe',d:'6-bar staggered reveal',t:[4.5,5.15],c:'mg-slice'},
    {g:'∿',n:'Liquid warp',d:'Turbulence displacement hit',t:[6.1,6.95],c:'mg-warp'},
    {g:'◎',n:'Echo trails',d:'Feedback zoom ghosts · colour shift',t:[5,8.95],c:'mg-echo',h:'<canvas width="180" height="320"></canvas>'}]},
  pod:{name:'Bold Captions',fx:null,re:/podcast|talking.head|interview|retention|speaker|episode|karaoke/i,
   prompt:'Cut it like a high-retention podcast clip: hook with a marker sweep, karaoke captions, punch-zoom on key words, an emoji burst, a live badge, a 3D stat card and a follow click',
   caps:POD_CAPS,keys:POD_KEYS,
   cam:t=>{const i=Math.floor((t-.3)/.5),w=(POD_CAPS.split(' ')[i]||'').toLowerCase(),loc=(t-.3)-i*.5,k=POD_KEYS.includes(w)?.13*Math.exp(-loc*6):0;return `scale(${(1.03+.035*t/9+k).toFixed(3)})`},
   paint(t,els,mg,L){const i=Math.floor((t-.3)/.5),w=(POD_CAPS.split(' ')[i]||'').toLowerCase(),loc=(t-.3)-i*.5;
    mg.style.setProperty('--imp',(POD_KEYS.includes(w)&&!reduce?Math.exp(-loc*7):0).toFixed(3));
    $$('.cp-live .wv i',mg).forEach((b,k)=>b.style.height=(reduce?50:18+82*Math.abs(Math.sin(t*(5+k*1.7)+k*1.3)*Math.cos(t*2.3+k))).toFixed(0)+'%');
    els[6]?.classList.toggle('clicked',t>=L[6].t[0]+.85)},
   layers:[
    {g:'!',n:'Hook + marker sweep',d:'Highlighter swipe · jolt on “quit”',t:[.1,2.7],c:'cp-hook',h:'I almost <mark>quit</mark><br>after my first video'},
    {g:'CC',n:'Karaoke captions',d:'Sliding highlight pill · 3D key-word flip',t:[.3,8.9],c:'cp-caps',h:'<i class="hl"></i><span class="cw"></span>'},
    {g:'⤢',n:'Keyword punch-zoom',d:'Camera punch + impact flash on key words',t:[0,9.1],c:'cp-impact'},
    {g:'✸',n:'Emoji burst',d:'Spring pop · particle ring',t:[3,4.6],c:'cp-burst',h:'<span class="eb" style="--i:0">🔥'+[0,1,2,3,4,5,6,7].map(k=>`<i style="--a:${k*45}deg"></i>`).join('')+'</span><span class="eb" style="--i:1">💡'+[0,1,2,3,4,5,6,7].map(k=>`<i style="--a:${k*45+22}deg"></i>`).join('')+'</span>'},
    {g:'●',n:'Live episode badge',d:'Mic waveform · progress',t:[0,9.1],c:'cp-live',h:'<span class="lb"><i class="dot"></i>EP 42<span class="wv"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span><span class="pb"><i></i></span>'},
    {g:'▤',n:'3D flip stat card',d:'Flips in · bars grow · +312%',t:[5.1,7.1],c:'cp-flip',h:'<span class="mini"><i style="--h:22%"></i><i style="--h:30%"></i><i style="--h:26%"></i><i style="--h:58%"></i><i style="--h:100%"></i></span><b data-count="312" data-fmt="+{v}%">+0%</b><small>views in 30 days</small>'},
    {g:'➚',n:'Follow click CTA',d:'Cursor glides in · click · Following ✓',t:[7.2,8.95],c:'cp-follow',h:'<span class="fc"><i class="av"></i><b>@morningcut</b><span class="fb"><span class="f1">Follow</span><span class="f2">Following ✓</span></span></span><i class="cur"></i><i class="rip"></i>'}]},
  biz:{name:'Kinetic Type',fx:null,re:/business|educat|explain|tips|lesson|marketing|how to|teach|startup|fail|kinetic type/i,
   prompt:'Make it a motion-design explainer: letters rise in, a slot-machine word, a hand-drawn circle, a self-drawing chart, a shape wipe and a 3D deck of tips',
   cam:t=>{const hits=[4.9,6.2,7.5];let k=0;for(const h of hits)if(t>=h)k=.06*Math.exp(-(t-h)*5);return `scale(${(1.02+.04*t/9+k).toFixed(3)})`},
   paint(t,els,mg,L){
    // slot-machine word: spins through options, lands on FAIL
    const ri=reduce?3:Math.max(0,Math.min(3,Math.floor((t-L[1].t[0]-.35)/.32)));els[1]?.style.setProperty('--ri',ri);els[1]?.classList.toggle('landed',ri===3);
    // self-drawing chart with a dot riding the tip
    const ch=els[3],path=ch&&$('path.ln',ch),dot=ch&&$('circle.dt',ch);
    if(path&&dot){const p=reduce?1:Math.max(0,Math.min(1,(t-L[3].t[0]-.3)/1.2)),e=1-Math.pow(1-p,2),len=path.getTotalLength(),pt=path.getPointAtLength(len*e);path.style.strokeDashoffset=String(100-100*e);dot.setAttribute('cx',pt.x.toFixed(2));dot.setAttribute('cy',pt.y.toFixed(2))}
    // shape wipe: circle floods the frame at the cut, then retracts downward
    const sh=els[4];if(sh){const p=Math.max(0,Math.min(1,(t-L[4].t[0])/(L[4].t[1]-L[4].t[0]))),ez=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
     const r=p<.5?ez(p*2)*120:(1-ez((p-.5)*2))*120,y=p<.5?50:50+60*ez((p-.5)*2);sh.style.clipPath=reduce?'circle(0% at 50% 50%)':`circle(${r.toFixed(1)}% at 50% ${y.toFixed(1)}%)`;sh.classList.toggle('full',p>.32&&p<.68)}
    // 3D tip deck: the front card flips away to reveal the next
    const cur=t<6.2?0:t<7.5?1:2;$$('.kt-deck .tcard',mg).forEach((c,k)=>{const d=k-cur;c.classList.toggle('gone',d<0);c.style.setProperty('--d',Math.max(0,d))});
    $$('.kt-deck .dots i',mg).forEach((d,k)=>d.classList.toggle('on',k===cur))},
   layers:[
    {g:'A',n:'Letter-rise headline',d:'Per-letter mask reveal · stagger',t:[.2,3.7],c:'kt-head',h:`<span class="ln1">${LS('HOW NOT TO')}</span>`},
    {g:'⟳',n:'Slot-machine word',d:'Fail → quit → go broke → FAIL',t:[.5,3.7],c:'kt-rot',h:'<span class="win"><span class="reel"><b>FAIL</b><b>QUIT</b><b>GO BROKE</b><b class="end">FAIL</b></span></span><span class="tail">your business</span>'},
    {g:'◯',n:'Hand-drawn circle',d:'Self-drawing marker loop',t:[2.1,3.7],c:'kt-circle',h:'<svg viewBox="0 0 100 40" preserveAspectRatio="none"><path pathLength="100" d="M70 6C50 1 14 3 6 16c-6 11 22 20 50 20 26 0 42-8 38-19C90 7 70 3 52 5"/></svg>'},
    {g:'⟋',n:'Self-drawing chart',d:'Line draws · dot rides the tip · 90%',t:[1.4,4.4],c:'kt-chart',h:'<span class="hd"><b data-count="90" data-fmt="{v}%">0%</b><small>fail within 5 years</small></span><svg viewBox="0 0 100 50" preserveAspectRatio="none"><path class="grid" d="M0 12.5H100M0 25H100M0 37.5H100"/><path class="ln" pathLength="100" d="M2 8L18 12L32 10L46 22L60 26L74 38L88 41L98 46"/><circle class="dt" cx="2" cy="8" r="2.4"/></svg>'},
    {g:'●',n:'Shape-wipe transition',d:'Circle floods · “3 rules” · retracts',t:[4.15,5.05],c:'kt-shape',h:'<b>3 RULES</b>'},
    {g:'▦',n:'3D tip deck',d:'Cards flip away · depth stack',t:[4.9,8.95],c:'kt-deck',h:'<span class="tcard" style="--c:#4d8dff"><i>01</i><b>Know your numbers</b><small>Margin beats revenue</small></span><span class="tcard" style="--c:#ff3b30"><i>02</i><b>Sell before you build</b><small>Pre-sell, then make it</small></span><span class="tcard" style="--c:#ffb800"><i>03</i><b>Charge what it’s worth</b><small>Cheap is a strategy, not a virtue</small></span><span class="dots"><i></i><i></i><i></i></span>'},
    {g:'⌑',n:'Save CTA',d:'Bookmark fills · bounce',t:[8,8.95],c:'kt-save',h:'<i class="bm"></i>Save this for later'}]}
 };
 const COLORS=['#d38b4f','#5d8fb8','#9b7bc4','#4fa37f','#c96a7d','#b8a04f'];
 let pack=null,els=[],counters=[],capsEl=null,capPill=null,capW=-1,ownFx=false;
 packFor=t=>{let best=null,score=0;for(const [k,P] of Object.entries(PACKS)){const m=(t.match(new RegExp(P.re.source,'gi'))||[]).length;if(m>score){score=m;best=k}}return best};
 const markTiles=(k,state='done')=>$$('.pk-tile',strip).forEach(b=>{const a=b.dataset.pack===k;b.classList.toggle('is-on',a);b.classList.toggle('is-building',a&&state==='busy');b.setAttribute('aria-pressed',String(a));if(!a||state==='done')b.style.setProperty('--pp',a?1:0)});
 const tileProg=(k,v)=>{const b=$(`.pk-tile[data-pack="${k}"]`,strip);b?.style.setProperty('--pp',v.toFixed(3))};
 function build(k){
  const P=PACKS[k];mg.dataset.pack=k;
  mg.innerHTML=P.layers.map((L,i)=>`<div class="mg-l ${L.c}" data-l="${i}">${L.h||''}</div>`).join('');
  els=$$('[data-l]',mg);P.layers.forEach((L,i)=>{if(L.p!=null)$('.slot',els[L.p])?.append(els[i])});
  counters=$$('[data-count]',mg).map(el=>({el,L:P.layers[+el.closest('[data-l]').dataset.l],to:+el.dataset.count,dec:+(el.dataset.dec||0),fmt:el.dataset.fmt,ring:el.closest('.mg-ring')}));
  capsEl=$('.cp-caps .cw',mg)||$('.mg-caps',mg);capPill=$('.cp-caps .hl',mg);capW=-1;
  // GFX clips on the timeline, packed greedily into three sub-lanes
  const ends=[0,0,0];gfx.replaceChildren(...P.layers.map((L,i)=>{let lane=ends.findIndex(e=>L.t[0]>=e-.01);if(lane<0)lane=ends.indexOf(Math.min(...ends));ends[lane]=L.t[1];
   const b=document.createElement('span');b.className='gfx-b';b.textContent=L.n;b.style.cssText=`--c:${COLORS[i%6]};left:${L.t[0]/9*100}%;width:${Math.min(9,L.t[1])-L.t[0]>0?(Math.min(9,L.t[1])-L.t[0])/9*100:1}%;top:${lane*33.3}%`;return b}));
 }
 const showGfx=n=>[...gfx.children].forEach((b,i)=>b.classList.toggle('in',i<n));
 // Hyper Motion: real pixel effects on the footage, all driven by the timeline clock
 const fR=$('#mgR'),fB=$('#mgB'),fW=$('#mgWarp'),fN=$('#mgNoise'),GLY='█▓▒░<>/\\#$%&@01ΣΔ';let hyperOn=false,echoBuf=null,lastEcho=-1;
 const inWin=(L,t)=>t>=L.t[0]&&t<L.t[1];
 function clearHyper(){if(!hyperOn)return;hyperOn=false;vids.forEach(v=>{if(v){v.dataset.hf='';v.style.filter=''}});const s2=$('.s2',studio);s2.style.webkitMaskImage=s2.style.maskImage='';s2.style.webkitMaskSize=s2.style.maskSize='';s2.style.webkitMaskPosition=s2.style.maskPosition='';s2.style.webkitMaskRepeat=s2.style.maskRepeat='';mg.style.removeProperty('--beat')}
 function paintHyper(P,t){hyperOn=true;const L=P.layers,ph=((t+10-.3)%.6)/.6,kick=reduce?0:Math.exp(-ph*7);
  // beat flash
  mg.style.setProperty('--beat',(inWin(L[0],t)?kick:0).toFixed(3));
  // RGB split + liquid warp share one SVG filter chain on the footage
  const warpK=inWin(L[5],t)?Math.sin(Math.min(1,(t-L[5].t[0])/(L[5].t[1]-L[5].t[0]))*Math.PI):0;
  const split=inWin(L[1],t)?(reduce?2:1.2+5*kick+6*warpK):0;
  fR?.setAttribute('dx',split.toFixed(2));fB?.setAttribute('dx',(-split).toFixed(2));fB?.setAttribute('dy',(split*.35).toFixed(2));
  fW?.setAttribute('scale',(reduce?0:warpK*30).toFixed(1));fN?.setAttribute('baseFrequency',`${(.008+.01*warpK).toFixed(4)} ${(.03+.02*Math.sin(t*3)).toFixed(4)}`);
  vids.forEach(v=>{if(v)v.dataset.hf=split||warpK?'url(#mgHyper)':''});
  // decode title: each glyph scrambles until its own resolve time
  if(inWin(L[2],t))$$('.dc',mg).forEach((el,row)=>{const txt=el.dataset.text,seed=Math.floor(t*24);let out='';for(let i=0;i<txt.length;i++){const due=L[2].t[0]+.25+row*.35+i*.055;out+=txt[i]===' '||t>=due||reduce?txt[i]:GLY[(seed*7+i*13)%GLY.length]}el.textContent=out});
  // tracking HUD follows the face, then locks
  if(inWin(L[3],t)){const el=els[3],u=t-L[3].t[0],lock=Math.min(1,u/.9);el.style.setProperty('--x',(50+3.2*Math.sin(t*1.3)).toFixed(2)+'%');el.style.setProperty('--y',(29+2*Math.sin(t*1.7)).toFixed(2)+'%');el.style.setProperty('--lk',lock.toFixed(3));
   const b=$('.tk-box b',el);if(b)b.textContent=String(Math.round(62+36*lock));const tk=$('.tk-tc',el);if(tk)tk.textContent=tc(t)}
  // slice wipe: six bars reveal shot two, alternating from top and bottom
  const s2=$('.s2',studio);
  if(inWin(L[4],t)&&!reduce){const sizes=[],pos=[];for(let k=0;k<6;k++){const p=Math.max(0,Math.min(1,(t-L[4].t[0]-k*.055)/.3)),e=1-Math.pow(1-p,3);sizes.push(`16.8% ${(e*100).toFixed(1)}%`);pos.push(`${k*20}% ${k%2?100:0}%`)}
   const img=Array(6).fill('linear-gradient(#000,#000)').join(',');s2.style.webkitMaskImage=s2.style.maskImage=img;s2.style.webkitMaskSize=s2.style.maskSize=sizes.join(',');s2.style.webkitMaskPosition=s2.style.maskPosition=pos.join(',');s2.style.webkitMaskRepeat=s2.style.maskRepeat='no-repeat';
   $('.s1',studio).style.opacity=1}
  else{s2.style.webkitMaskImage=s2.style.maskImage=''}
  // echo trails: feedback zoom of past frames, drawn small on a canvas
  const cv=$('.mg-echo canvas',mg);
  if(cv&&inWin(L[6],t)){const v=vids[t<cutTime?0:1];if(v&&v.readyState>=2&&t!==lastEcho){lastEcho=t;const ctx=cv.getContext('2d'),w=cv.width,h=cv.height;
    if(!echoBuf){echoBuf=document.createElement('canvas');echoBuf.width=w;echoBuf.height=h}const bx=echoBuf.getContext('2d');bx.clearRect(0,0,w,h);bx.drawImage(cv,0,0);
    ctx.clearRect(0,0,w,h);ctx.globalAlpha=.84;const g=reduce?0:.035+.03*kick;ctx.drawImage(echoBuf,-w*g/2,-h*g/2,w*(1+g),h*(1+g));
    ctx.globalAlpha=.42;try{ctx.drawImage(v,0,0,w,h)}catch(e){}ctx.globalAlpha=1}}
  else if(cv&&lastEcho>=0){cv.getContext('2d').clearRect(0,0,cv.width,cv.height);lastEcho=-1}
 }
 paintPack=on=>{if(!mg)return;mg.classList.toggle('on',!!(on&&pack));if(!on||!pack){clearHyper();return}
  const P=PACKS[pack],t=playTime;
  els.forEach(el=>{const L=P.layers[+el.dataset.l];el.classList.toggle('on',t>=L.t[0]&&t<L.t[1]);el.classList.toggle('done',t>=L.t[1])});
  for(const c of counters){const x=Math.max(0,Math.min(1,(t-c.L.t[0]-.25)/1.1)),e=1-Math.pow(1-x,3);c.el.textContent=c.fmt.replace('{v}',(c.to*e).toFixed(c.dec));if(c.ring)c.ring.style.setProperty('--k',e.toFixed(3))}
  mg.style.setProperty('--p',Math.min(1,t/duration).toFixed(4));
  if(P.zoom){const z=P.zoom(t);for(const sc of $$('.scene',studio))sc.style.transform=z!==1?`scale(${z.toFixed(3)})`:''}
  if(P.cam&&!reduce){const c=P.cam(t);for(const sc of $$('.scene',studio))sc.style.transform=c}
  if(P.hyper)paintHyper(P,t);
  if(capsEl&&P.caps){const words=P.caps.split(' '),w=Math.max(0,Math.min(words.length-1,Math.floor((t-.3)/.5))),chunk=Math.floor(w/3);
   if(Math.floor(capW/3)!==chunk||capW<0)capsEl.replaceChildren(...words.slice(chunk*3,chunk*3+3).map((x,j)=>{const s=document.createElement('span');s.textContent=x;s.style.setProperty('--i',j);if(P.keys.includes(x.toLowerCase()))s.className='key';return s}));
   if(w!==capW){capW=w;[...capsEl.children].forEach((s,i)=>s.classList.toggle('now',chunk*3+i===w))}
   const act=capsEl.children[w-chunk*3];if(capPill&&act){capPill.style.cssText=`--hx:${act.offsetLeft}px;--hy:${act.offsetTop}px;--hw:${act.offsetWidth}px;--hh:${act.offsetHeight}px`;capPill.classList.toggle('key',act.classList.contains('key'))}}
  P.paint?.(t,els,mg,P.layers);
 };
 clearPack=()=>{if(!pack)return;const was=PACKS[pack].fx;pack=null;clearHyper();delete studio.dataset.pack;mg.innerHTML='';mg.classList.remove('on');gfx.replaceChildren();markTiles(null);if(ownFx&&studio.dataset.fx===was)setFx(null,true);ownFx=false};
 runPack=async(k,said)=>{
  const P=PACKS[k];if(!P)return;stopDemo();const g=gen;clearPack();pack=k;studio.dataset.pack=k;markTiles(k,reduce?'done':'busy');tileProg(k,0);
  SC.p={name:P.name,prompt:P.prompt,edits:P.layers.map(L=>[L.g,L.n,L.d]),ratio:'9:16',format:'1080 × 1920',title:'',duration:9,cut:4.5};
  build(k);setScenario('p');const n=P.layers.length,text=said||P.prompt;
  const finish=()=>{markTiles(k,'done');setStep(4,`${n} layers applied`);showGfx(n);setFx(P.fx,true);ownFx=true;statusEl.textContent=`${P.name} · ${n} layers`};
  if(reduce){promptEl.textContent=text;finish();setStep(5,'Preview ready');seek(2.4);statusEl.textContent=`${P.name} · ${n} layers`;return}
  // fast path: the whole edit lands in ~0.6s, then plays from the top
  setPlaying(true);setStep(0,'Ready');promptEl.textContent=text;setStep(2,'Planning layers');if(!await wait(160,g))return;
  setStep(3,'Building motion graphics');for(let i=1;i<=n;i++){if(!await wait(60,g))return;applyProgress(i);showGfx(i);tileProg(k,i/n)}
  finish();seek(0,false);$('#demoAnnounce').textContent=`${P.name}: ${P.layers.map(L=>L.n).join(', ')}. Applied with one tap.`;
  if(!await wait(2400,g))return;setStep(5,'Previewing');statusEl.textContent=`${P.name} · ${n} layers`};
 // tabs (Styles / Motion) and pack taps
 strip?.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');
  if(tab){$$('[data-tab]',strip).forEach(b=>b.setAttribute('aria-selected',String(b===tab)));$$('[data-panel]',strip).forEach(p=>p.hidden=p.dataset.panel!==tab.dataset.tab);return}
  const pk=e.target.closest('.pk-tile');if(!pk)return;
  if(pack===pk.dataset.pack&&applied){runDemo('a');return}
  runPack(pk.dataset.pack);pk.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduce?'auto':'smooth'})});
}
$('#tryChips').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;if(reduce)showFinished(c.dataset.sc);else{setPlaying(true);runDemo(c.dataset.sc)}});
/* Hero prompt bar: your words drive the demo (mapped to its closest scripted edit) */
{const form=$('#heroPrompt'),input=$('#heroPromptInput');
 const KEYS={a:/vertical|portrait|9[:x]16|tiktok|reel|short|story|title|crossfade|transition|dissolve|launch|pop/i,
             d:/caption|subtitle|words?|transcri|karaoke|highlight|speech|talking|say/i,
             e:/ramp|beat|flash|punch|fast|speed up|hype|energy|music|sync/i,
             f:/split|side by side|both|duet|stack|top and bottom|two takes|compare|grid/i,
             b:/slow|half|0?\.5|fade|black|vlog|morning|landscape|16[:x]9|youtube|gentle|calm/i,
             c:/cinema|film|movie|look|warm|grade|square|instagram|feed|1:1|letterbox|widescreen|push|zoom|trailer|moody|dramatic/i};
 const classify=t=>{let best='a',score=0;for(const k of ORDER){const m=(t.match(new RegExp(KEYS[k].source,'gi'))||[]).length;if(m>score){score=m;best=k}}return best};
 const EXAMPLES=['Describe an edit…','Add captions word by word and highlight the key words','Make it vertical for TikTok with a big title','Speed ramp into the second shot with a flash cut','Slow down the first clip and fade in','Give it a warm, movie-like look','Add a smooth transition between the clips'];
 let ex=1,typing=0;
 const cycle=async()=>{if(reduce)return;const me=++typing;while(me===typing){for(const text of [EXAMPLES[ex]]){for(let i=1;i<=text.length;i++){if(me!==typing||input.value||document.activeElement===input)return;input.placeholder=text.slice(0,i);await new Promise(r=>setTimeout(r,38))}
   await new Promise(r=>setTimeout(r,2200));if(me!==typing)return}
  ex=(ex+1)%EXAMPLES.length}};
 input.addEventListener('focus',()=>{typing++;input.placeholder='Try: make it vertical with a big title'});
 input.addEventListener('blur',()=>{if(!input.value){input.placeholder=EXAMPLES[0];ex=1;setTimeout(cycle,1200)}});
 setTimeout(cycle,3600);
 form.addEventListener('submit',e=>{e.preventDefault();typing++;
  const text=input.value.trim()||(input.placeholder.endsWith('…')?SC.a.prompt:input.placeholder);const pk=packFor(text);
  if(pk){runPack(pk,text.slice(0,140));studio.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});const ann=$('#demoAnnounce');if(ann)ann.textContent=`Building a ${pk} style edit on the sample video`;return}
  const k=classify(text);
  custom={k,text:text.slice(0,140)};
  if(reduce){showFinished(k);promptEl.textContent=custom.text;custom=null}else{setPlaying(true);runDemo(k)}
  studio.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  const ann=$('#demoAnnounce');if(ann)ann.textContent=`Showing “${text.slice(0,80)}” on the sample video`;
 });
}
/* Hero light leak: soft colour fields drifting like a film light leak, drawn small and scaled up.
   Theme-aware (cross-fades on toggle), leans toward the pointer, pauses off screen, one still frame for reduced motion. */
{const cv=$('#leakCanvas'),stageEl=$('#stage');
 if(cv&&stageEl&&cv.getContext){const ctx=cv.getContext('2d',{alpha:false});
  // [x,y] centre (0..1), radius (× long side), drift amplitude, speed, phase, pointer depth
  const BLOBS=[[.16,.28,.62,.10,.07,0,.9],[.84,.22,.58,.09,.05,1.7,.6],[.62,.86,.55,.12,.06,3.1,.4],[.40,.58,.45,.14,.09,4.4,1.1],[.92,.78,.42,.08,.08,2.3,.7],[.05,.92,.40,.07,.06,5.2,.5]];
  const PAL={light:{base:[246,239,228],mode:'source-over',c:[[242,176,118,.82],[150,196,214,.72],[244,162,150,.6],[247,215,150,.7],[198,182,230,.5],[255,206,160,.55]]},
             dark:{base:[13,14,18],mode:'lighter',c:[[196,104,42,.55],[28,92,108,.62],[78,44,84,.6],[226,171,119,.28],[34,52,96,.55],[150,70,30,.4]]}};
  const key=()=>root.dataset.theme==='dark'?'dark':'light';
  let cur=JSON.parse(JSON.stringify(PAL[key()])),from=null,to=null,mix=1,W=0,H=0,px=.5,py=.5,ex=.5,ey=.5,visible=true,raf=0,last=0;
  const lerp=(a,b,t)=>a+(b-a)*t;
  const size=()=>{const r=stageEl.getBoundingClientRect(),k=Math.min(1.5,devicePixelRatio||1)/8;W=Math.max(40,Math.round(r.width*k));H=Math.max(30,Math.round(r.height*k));cv.width=W;cv.height=H};
  const draw=t=>{
   if(to){mix=Math.min(1,mix+.045);const e=mix*mix*(3-2*mix);cur.base=from.base.map((v,i)=>lerp(v,to.base[i],e));cur.c=from.c.map((c,j)=>c.map((v,i)=>lerp(v,to.c[j][i],e)));cur.mode=e<.5?from.mode:to.mode;if(mix>=1){cur=JSON.parse(JSON.stringify(to));to=null}}
   ex+=(px-ex)*.04;ey+=(py-ey)*.04;
   const [br,bg,bb]=cur.base;ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgb(${br|0},${bg|0},${bb|0})`;ctx.fillRect(0,0,W,H);
   ctx.globalCompositeOperation=cur.mode;const L=Math.max(W,H),portrait=H>W,s=t/1000;
   BLOBS.forEach(([x,y,r,amp,spd,ph,depth],i)=>{
    // on portrait screens spread the fields vertically instead of horizontally
    const bx=portrait?lerp(x,.5,.35):x,by=portrait?lerp(y,i%2?.2:.8,.25):y;
    const cx=(bx+Math.sin(s*spd+ph)*amp+(ex-.5)*.08*depth)*W,cy=(by+Math.cos(s*spd*.8+ph)*amp*.8+(ey-.5)*.08*depth)*H;
    const rad=r*L*(1+Math.sin(s*spd*1.3+ph)*.08),[cr,cg,cb,ca]=cur.c[i];
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,`rgba(${cr|0},${cg|0},${cb|0},${ca})`);g.addColorStop(.55,`rgba(${cr|0},${cg|0},${cb|0},${ca*.35})`);g.addColorStop(1,`rgba(${cr|0},${cg|0},${cb|0},0)`);
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H)});
  };
  const loop=t=>{raf=0;if(!visible||document.hidden||motionOff()||root.classList.contains('fx-lite'))return;if(t-last>50&&!root.classList.contains('is-scrolling')){last=t;draw(t)}raf=requestAnimationFrame(loop)};
  const start=()=>{if(!raf&&!motionOff())raf=requestAnimationFrame(loop)};
  addEventListener('replotre:motion',start);
  size();draw(performance.now());cv.classList.add('hl-live');
  new ResizeObserver(()=>{size();draw(performance.now())}).observe(stageEl);
  new IntersectionObserver(([en])=>{visible=en.isIntersecting;if(visible)start()}).observe(stageEl);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)start()});
  new MutationObserver(()=>{from=JSON.parse(JSON.stringify(cur));to=PAL[key()];mix=0;if(motionOff()){cur=JSON.parse(JSON.stringify(to));to=null;draw(0)}else start()}).observe(root,{attributes:true,attributeFilter:['data-theme']});
  if(finePointer&&!reduce)stageEl.addEventListener('pointermove',e=>{const r=rectOf(stageEl);px=(e.clientX-r.left)/r.width;py=(e.clientY-r.top)/r.height},{passive:true});
  start();
 }}
/* Footage wall: columns of frames + editor pieces sized to the stage; rebuilt only when the layout changes */
{const wall=$('#footWall'),stageEl=$('#stage'),wrap=wall&&wall.parentElement;
 if(wall&&stageEl){
  let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,pick=a=>a[Math.floor(rnd()*a.length)];
  // real footage: stills from the licensed sample clips on every frame tile; a few on-screen tiles play the small loops
  const STILLS=Array.from({length:12},(_,i)=>`./assets/demo/wall-${i+1}.jpg`),NAMES=['Vlog.mp4','Friends.mp4','Diner dance.mp4','Ring light.mp4','Studio take.mp4','Rainbow.mp4'];
  const LOOPS_WIDE=['import-1','import-2','import-3','import-4'].map(n=>`./assets/demo/${n}.mp4`),LOOPS_TALL=['export','friends','vlog'].map(n=>`./assets/demo/${n}.mp4`);
  const still=src=>`<img class="wf-img" src="${src||pick(STILLS)}" alt="" loading="lazy" decoding="async" draggable="false">`;
  const TITLES=[['A NEW PERSPECTIVE','Launch day'],['CHAPTER ONE','The coast'],['A FILM BY YOU','Golden hour'],['COMING SOON','Long weekend']];
  const PROMPTS=[['Make it vertical','Canvas set to 9:16'],['Add a warm look','Look: Punch'],['Slow the first shot','Speed 0.5×'],['Crossfade the clips','0.6s crossfade']];
  const tc=()=>{const s=Math.floor(rnd()*58),f=Math.floor(rnd()*24);return `00:00:${String(s).padStart(2,'0')}:${String(f).padStart(2,'0')}`};
  const el=(cls,html)=>{const d=document.createElement('div');d.className='wf '+cls;d.innerHTML=html;return d};
  const tile=()=>{const r=rnd();
   if(r<.52){const ratio=pick(['','r-169','r-916','r-45','r-11','']);const extra=rnd()<.25?'<span class="wf-ok">✓ Edited</span>':rnd()<.5?`<span class="wf-name">${pick(NAMES)}</span>`:'';return el(ratio+' wf-shot',`${still()}${extra}<span class="wf-tc">${tc()}</span>`)}
   if(r<.64){const [k,t]=pick(TITLES);return el(pick(['r-916','r-169','']),`<div class="wf-title"><span><small>${k}</small>${t}</span></div>`)}
   if(r<.74)return el('r-169','<div class="wf-lane"><b><i class="kf1"></i><i class="kf2"></i></b><b><i class="kf3"></i></b><b></b></div>');
   if(r<.83){let bars='';for(let i=0;i<26;i++)bars+=`<i style="height:${Math.round(18+Math.abs(Math.sin(i*.7+rnd()))*62)}%"></i>`;return el('r-169',`<div class="wf-wave">${bars}</div>`)}
   if(r<.92){const src=pick(STILLS);return el('r-169',`<div class="wf-looks"><span>${still(src)}<em>Vivid</em></span><span>${still(src)}<em>Matte</em></span><span>${still(src)}<em>Mono</em></span></div>`)}
   const [u,a]=pick(PROMPTS);return el('',`<div class="wf-prompt"><span>${u}</span><em>${a}</em></div>`)};
  let layoutKey='',live=[],stageOn=true;
  // live tiles: desktop 5, tablet 3, phone 2; only tiles on screen and outside the cleared centre; rotated as the columns drift
  const weak=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
  const liveMax=()=>{const w=stageEl.clientWidth;return w<700?2:w<1100?3:weak?3:4};
  // Live video tiles are off: decoding video inside the tilted, masked wall forced a full repaint of the hero on every video frame
  // (about 30 fps idle and while scrolling, instead of 60). The columns still drift and tilt with the pointer; tiles show stills.
  const canLive=()=>false;
  const toStill=t=>{const v=t.querySelector('.wf-vid');t.classList.remove('is-live');if(v){v.pause();v.removeAttribute('src');v.load();v.remove()}};
  const toLive=t=>{const tall=t.classList.contains('r-916')||t.classList.contains('r-45'),list=tall?LOOPS_TALL:LOOPS_WIDE,v=document.createElement('video');
   v.className='wf-vid';v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.disablePictureInPicture=true;v.preload='auto';
   v.src=list[Math.floor(Math.random()*list.length)];v.addEventListener('playing',()=>v.classList.add('on'),{once:true});t.querySelector('.wf-img')?.after(v);t.classList.add('is-live');v.play().catch(()=>{});live.push(t)};
  const rotate=()=>{const R=stageEl.getBoundingClientRect(),cx=R.left+R.width/2,cy=R.top+R.height*.42;
   const onScreen=t=>{const b=t.getBoundingClientRect();if(b.bottom<R.top+12||b.top>R.bottom-12||b.right<R.left+12||b.left>R.right-12)return false;const dx=(b.left+b.width/2-cx)/(R.width*.5),dy=(b.top+b.height/2-cy)/(R.height*.5);return dx*dx+dy*dy>.32};
   const ok=canLive();live=live.filter(t=>{if(ok&&t.isConnected&&onScreen(t))return true;toStill(t);return false});if(!ok)return;
   const cand=$$('.wf-shot',wall).filter(t=>!t.classList.contains('is-live')&&onScreen(t));
   while(live.length<liveMax()&&cand.length)toLive(cand.splice(Math.floor(Math.random()*cand.length),1)[0])};
  const build=()=>{const r=stageEl.getBoundingClientRect(),w=r.width,h=r.height;
   const fw=Math.round(Math.min(230,Math.max(100,w<700?w*.3:w<1100?w*.2:w*.125))),gap=Math.round(Math.max(10,fw*.1));
   const cols=Math.ceil((w*1.3)/(fw+gap))+2,perCol=Math.max(5,Math.ceil((h*1.4)/(fw*.8+gap)));
   const key=`${cols}x${perCol}x${fw}`;if(key===layoutKey)return;layoutKey=key;seed=11;
   wall.style.setProperty('--fw-w',fw+'px');wall.style.setProperty('--fw-gap',gap+'px');live.forEach(toStill);live=[];wall.replaceChildren();
   for(let c=0;c<cols;c++){const col=document.createElement('div');col.className='fw-col'+(c%2?' down':'');
    col.style.setProperty('--dur',`${54+(c%3)*16+rnd()*10}s`);col.style.setProperty('--delay',`-${(rnd()*40).toFixed(1)}s`);
    const set=[];for(let i=0;i<perCol;i++)set.push(tile());set.forEach(t=>col.append(t));set.forEach(t=>col.append(t.cloneNode(true)));// doubled for a seamless loop
    wall.append(col)}};
  build();let rt=0;new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(build,150)}).observe(stageEl);
  new IntersectionObserver(([en])=>{wall.classList.toggle('paused',!en.isIntersecting);stageOn=en.isIntersecting;rotate()}).observe(stageEl);
  setTimeout(rotate,500);setTimeout(rotate,1600);setInterval(rotate,4000);addEventListener('replotre:motion',rotate);document.addEventListener('visibilitychange',rotate);
  if(finePointer&&!reduce){let tx=0,ty=0,cx=0,cy=0,raf=0,lt=0;
   const step=t=>{const k=1-Math.pow(.94,Math.min(4,(t-(lt||t-16.7))/16.7));lt=t;cx+=(tx-cx)*k;cy+=(ty-cy)*k;// frame-rate independent easing (same feel at 60 and 120 Hz)
    wall.style.transform=`translate(-50%,-50%) perspective(2600px) rotateX(${(13+cy*4).toFixed(2)}deg) rotateY(${(cx*5).toFixed(2)}deg) rotateZ(-8deg) scale(1.1)`;
    if(Math.abs(tx-cx)+Math.abs(ty-cy)>.002)raf=requestAnimationFrame(step);else{raf=0;lt=0}};
   stageEl.addEventListener('pointermove',e=>{if(motionOff())return;const r=rectOf(stageEl);tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5;if(!raf)raf=requestAnimationFrame(step)},{passive:true});
   stageEl.addEventListener('pointerleave',()=>{tx=0;ty=0;if(!raf)raf=requestAnimationFrame(step)})}
 }}
/* Hero headline: always one line. On narrow screens it scales down to fit the stage, so the "your clip" label never collides. */
{const h=$('#heroTitle'),box=$('.hero-in');
 if(h&&box){let f=0,lastW=0;const fit=()=>{const w=box.clientWidth;h.style.fontSize='';const cs=getComputedStyle(box),avail=w-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),need=h.scrollWidth;
   if(need>avail+1)h.style.fontSize=Math.max(22,parseFloat(getComputedStyle(h).fontSize)*avail/need*.97).toFixed(2)+'px';lastW=w};
  new ResizeObserver(()=>{if(box.clientWidth===lastW)return;cancelAnimationFrame(f);f=requestAnimationFrame(fit)}).observe(box);
  fit();document.fonts?.ready.then(fit)}}
/* Background motion toggle (the REC badge): pauses the light leak, grid signals, footage wall and timecode; remembered */
{const b=$('#motionBtn');
 if(b){const st=$('.hud-state',b);const sync=()=>{const off=motionOff(),user=root.classList.contains('calm');b.setAttribute('aria-pressed',String(user));b.setAttribute('aria-label',user?'Resume background motion':'Pause background motion');b.title=user?'Resume background motion':'Pause background motion';st.textContent=off?'Paused':'REC';b.classList.toggle('is-off',off)};
  if(reduce||root.classList.contains('lite'))b.disabled=true;
  b.addEventListener('click',()=>{const calm=!root.classList.contains('calm');root.classList.toggle('calm',calm);try{localStorage.setItem('replotre_motion',calm?'off':'on')}catch(e){}sync();dispatchEvent(new Event('replotre:motion'))});
  sync()}}
/* Viewfinder HUD: running timecode + the viewer's real screen size and aspect */
{const tcEl=$('#hudTc'),aspEl=$('#hudAspect'),sizeEl=$('#hudSize'),stageEl=$('#stage');
 const RATIOS=[['21:9',21/9],['2:1',2],['16:9',16/9],['16:10',1.6],['3:2',1.5],['4:3',4/3],['1:1',1],['4:5',.8],['3:4',.75],['9:16',9/16],['9:19.5',9/19.5],['9:21',9/21]];
 const upd=()=>{const w=innerWidth,h=innerHeight,r=w/h;let best=RATIOS[0];for(const q of RATIOS)if(Math.abs(Math.log(q[1]/r))<Math.abs(Math.log(best[1]/r)))best=q;aspEl.textContent=best[0];sizeEl.textContent=`${w}×${h}`};
 upd();addEventListener('resize',upd,{passive:true});
 // writes only when the 24 fps frame number changes, and the loop fully stops off screen / hidden / paused
 if(!reduce&&tcEl){let on=true,raf=0,lastF=-1;const t0=performance.now(),p2=n=>String(n).padStart(2,'0');
  const loop=t=>{raf=0;if(!on||document.hidden||motionOff())return;const f=Math.floor((t-t0)*.024);
   if(f!==lastF){lastF=f;const s=Math.floor(f/24);tcEl.textContent=`${p2(Math.floor(s/3600))}:${p2(Math.floor(s/60)%60)}:${p2(s%60)}:${p2(f%24)}`}raf=requestAnimationFrame(loop)};
  const start=()=>{if(!raf&&on&&!document.hidden&&!motionOff())raf=requestAnimationFrame(loop)};
  new IntersectionObserver(([en])=>{on=en.isIntersecting;start()}).observe(stageEl);
  document.addEventListener('visibilitychange',start);addEventListener('replotre:motion',start);start()}}
$('#demoReplay').addEventListener('click',()=>{if(reduce)showFinished(current);else{setPlaying(true);runDemo(current)}});
playBtn.addEventListener('click',()=>setPlaying(!playing));
$('#demoPrev').addEventListener('click',()=>seek(0));$('#demoNext').addEventListener('click',()=>seek(Math.min(duration,cutTime+.35)));
$$('[data-demo-clip]',studio).forEach(b=>b.addEventListener('click',()=>seek(+b.dataset.demoClip?cutTime+.35:.8)));
seekEl.addEventListener('input',()=>{const value=+seekEl.value;seek(snap?Math.round(value*2)/2:value)});
$('#demoSnap').addEventListener('click',e=>{snap=!snap;e.currentTarget.setAttribute('aria-pressed',String(snap))});
$('#demoGuides').addEventListener('click',e=>{const on=studio.dataset.guides!=='true';studio.dataset.guides=String(on);e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.setAttribute('aria-label',on?'Hide safe areas':'Show safe areas')});
compareBtn.addEventListener('click',()=>{if(!applied)return;stopDemo();comparing=!comparing;statusEl.textContent=comparing?'Original preview':'3 edits applied';updateView();$('#demoAnnounce').textContent=comparing?'Showing original footage.':'Showing your edited preview.'});
studio.tabIndex=0;studio.addEventListener('keydown',e=>{if(e.target.closest('button,a,input'))return;if(e.key===' '){e.preventDefault();e.stopPropagation();setPlaying(!playing)}else if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:e.key==='End'?duration:playTime+(e.key==='ArrowLeft'?-1:1)/30)}});
document.addEventListener('visibilitychange',updateMotion);
setScenario('a');setStep(0,'Ready');if(reduce)showFinished('a');updateMotion();
const demoVisibility=new IntersectionObserver(entries=>{visible=entries[entries.length-1].isIntersecting;if(visible&&!scriptStarted&&!reduce){scriptStarted=true;runDemo(current)}updateMotion()},{threshold:.12});demoVisibility.observe(studio);

/* Subtle tilt on the outer bezel; controls remain on a stable plane. */
const tilt=$('#tilt');
if(tilt&&finePointer&&!reduce){let tiltRaf=0;tilt.addEventListener('pointermove',e=>{if(!studio.classList.contains('in')||e.target.closest('button,a,input'))return;cancelAnimationFrame(tiltRaf);tiltRaf=requestAnimationFrame(()=>{const r=rectOf(tilt),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;studio.style.transform=`rotateX(${(-y*.65).toFixed(2)}deg) rotateY(${(x*.9).toFixed(2)}deg)`})});tilt.addEventListener('pointerleave',()=>{cancelAnimationFrame(tiltRaf);studio.style.transform=''})}


/* Hero grid field: a dashed blueprint grid with a node at every crossing. Cell size follows the screen
   (about 9 columns on a phone, 16 on a tablet, 26+ on desktop). Nodes swell and snap guides appear near the pointer,
   signals run along the lines, taps send a ripple. Static grid is cached; only the live layer redraws.
   Pauses off screen and in hidden tabs; one still frame for reduced motion. */
const gridField=(cv,stageEl,o={})=>{
 if(cv&&stageEl&&cv.getContext){
  // the static grid is drawn offscreen once per resize/theme and set as the canvas's own CSS background (painted once, same layer and mask),
  // so each animation frame only clears and redraws the small live layer instead of blitting a full-res copy of the grid
  const ctx=cv.getContext('2d'),base=document.createElement('canvas'),bctx=base.getContext('2d');
  let bgUrl='',bgT=0,bgGen=0;cv.style.backgroundSize='100% 100%';cv.style.backgroundRepeat='no-repeat';
  const publishBase=()=>{clearTimeout(bgT);const g=++bgGen;bgT=setTimeout(()=>base.toBlob(b=>{if(!b||g!==bgGen)return;const u=URL.createObjectURL(b);
   const img=new Image();img.onload=()=>{if(g!==bgGen){URL.revokeObjectURL(u);return}cv.style.backgroundImage=`url("${u}")`;if(bgUrl)URL.revokeObjectURL(bgUrl);bgUrl=u};img.src=u}),bgUrl?120:0)};
  let W=0,H=0,dpr=1,cell=40,ox=0,oy=0,cols=0,rows=0,r0=1.6,dark=false,dirty=true,ink='40,32,20',pal=[],acc=[201,132,72],visible=true,raf=0,last=0,nextAmbient=0;
  const ptr={x:0,y:0,tx:0,ty:0,a:0,ta:0},ripples=[],sigs=[];
  const nx=i=>Math.round(ox+i*cell)+.5,ny=j=>Math.round(oy+j*cell)+.5;
  const theme=()=>{dark=root.dataset.theme==='dark';ink=dark?'255,255,255':'40,32,20';
   pal=dark?[[233,176,122],[143,178,211],[132,190,150]]:[[196,124,62],[86,132,176],[84,146,108]];acc=pal[0]};
  const build=()=>{const r=stageEl.getBoundingClientRect();W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));dpr=maxDpr();
   for(const c of [cv,base]){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}dirty=true;
   const target=W<520?9:W<1000?16:W<1700?26:32;cell=Math.max(30,Math.min(64,W/target));r0=W<520?1.25:1.6;
   ox=(W/2)%cell;oy=(H*(o.anchorY??.4))%cell;cols=Math.ceil((W-ox)/cell);rows=Math.ceil((H-oy)/cell);
   theme();bctx.setTransform(dpr,0,0,dpr,0,0);bctx.clearRect(0,0,W,H);
   bctx.lineWidth=1;bctx.setLineDash([3,4]);bctx.strokeStyle=`rgba(${ink},${dark?.085:.12})`;bctx.beginPath();
   for(let i=0;i<cols;i++){const x=nx(i);bctx.moveTo(x,0);bctx.lineTo(x,H)}
   for(let j=0;j<rows;j++){const y=ny(j);bctx.moveTo(0,y);bctx.lineTo(W,y)}
   bctx.stroke();bctx.setLineDash([]);bctx.fillStyle=`rgba(${ink},${dark?.26:.34})`;bctx.beginPath();
   for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){bctx.moveTo(nx(i)+r0,ny(j));bctx.arc(nx(i),ny(j),r0,0,Math.PI*2)}
   bctx.fill();sigs.length=0;publishBase();frame(performance.now(),true)};
  const node=(x,y,rad,c,a)=>{ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${a})`;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill()};
  const spawn=()=>{const h=Math.random()<.6,n=h?rows:cols,idx=1+Math.floor(Math.random()*Math.max(1,n-2)),dir=Math.random()<.5?1:-1,span=h?W:H;
   sigs.push({h,idx,dir,p:dir>0?-cell*3:span+cell*3,v:cell*(2.2+Math.random()*2.4),len:cell*(2+Math.random()*2),c:pal[Math.floor(Math.random()*pal.length)]})};
  const frame=(t,still)=>{const dt=Math.min(.05,(t-(last||t))/1000);last=t;
   if(dirty){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);dirty=false}ctx.setTransform(dpr,0,0,dpr,0,0);
   if(still||motionOff())return;
   if(sigs.length||ripples.length||ptr.a>.01)dirty=true;
   const k=1-Math.exp(-dt*14);ptr.x+=(ptr.tx-ptr.x)*k;ptr.y+=(ptr.ty-ptr.y)*k;ptr.a+=(ptr.ta-ptr.a)*(1-Math.exp(-dt*6));
   // signals: a bright head with a tail running along a grid line, lighting the nodes it passes
   const maxSig=W<520?2:W<1000?3:5;if(sigs.length<maxSig&&Math.random()<dt*1.4)spawn();
   for(let s=sigs.length-1;s>=0;s--){const g=sigs[s];g.p+=g.v*g.dir*dt;const span=g.h?W:H;
    if(g.p<-cell*6||g.p>span+cell*6){sigs.splice(s,1);continue}
    const line=g.h?ny(g.idx):nx(g.idx),tail=g.p-g.dir*g.len,[c0,c1,c2]=g.c;
    const gr=g.h?ctx.createLinearGradient(tail,0,g.p,0):ctx.createLinearGradient(0,tail,0,g.p);gr.addColorStop(0,`rgba(${c0},${c1},${c2},0)`);gr.addColorStop(1,`rgba(${c0},${c1},${c2},${dark?.85:.75})`);
    ctx.strokeStyle=gr;ctx.lineWidth=1.5;ctx.beginPath();if(g.h){ctx.moveTo(tail,line);ctx.lineTo(g.p,line)}else{ctx.moveTo(line,tail);ctx.lineTo(line,g.p)}ctx.stroke();
    node(g.h?g.p:line,g.h?line:g.p,2.2,g.c,.95);node(g.h?g.p:line,g.h?line:g.p,6,g.c,.14);
    const n=g.h?cols:rows;for(let q=0;q<n;q++){const pos=g.h?nx(q):ny(q),d=(g.p-pos)*g.dir;if(d>=0&&d<g.len){const f=1-d/g.len;node(g.h?pos:line,g.h?line:pos,r0+1.6*f,g.c,.25+.6*f)}}}
   // ripples from taps / clicks (and an occasional ambient one when nobody is pointing)
   if(ptr.ta===0&&t>nextAmbient){nextAmbient=t+5200+Math.random()*3000;ripples.push({x:nx(Math.floor(Math.random()*cols)),y:ny(Math.floor(Math.random()*rows*.8)),t0:t,amb:1})}
   for(let q=ripples.length-1;q>=0;q--){const rp=ripples[q],age=(t-rp.t0)/1000,R=age*cell*(rp.amb?5:9),life=1-age/(rp.amb?2.4:1.6);if(life<=0){ripples.splice(q,1);continue}
    const band=cell*.9,i0=Math.max(0,Math.floor((rp.x-R-band-ox)/cell)),i1=Math.min(cols-1,Math.ceil((rp.x+R+band-ox)/cell)),j0=Math.max(0,Math.floor((rp.y-R-band-oy)/cell)),j1=Math.min(rows-1,Math.ceil((rp.y+R+band-oy)/cell));
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const x=nx(i),y=ny(j),off=Math.abs(Math.hypot(x-rp.x,y-rp.y)-R);if(off<band){const f=(1-off/band)*life*(rp.amb?.6:1);node(x,y,r0+2*f,acc,.2+.7*f)}}}
   // pointer: nodes swell toward it, and snap guides light up through the nearest node
   if(ptr.a>.01){const R=cell*3.6,a=ptr.a,i0=Math.max(0,Math.floor((ptr.x-R-ox)/cell)),i1=Math.min(cols-1,Math.ceil((ptr.x+R-ox)/cell)),j0=Math.max(0,Math.floor((ptr.y-R-oy)/cell)),j1=Math.min(rows-1,Math.ceil((ptr.y+R-oy)/cell));
    const si=Math.max(0,Math.min(cols-1,Math.round((ptr.x-ox)/cell))),sj=Math.max(0,Math.min(rows-1,Math.round((ptr.y-oy)/cell))),sx=nx(si),sy=ny(sj),[c0,c1,c2]=acc;
    for(const h of [1,0]){const gr=h?ctx.createLinearGradient(sx-R*1.4,0,sx+R*1.4,0):ctx.createLinearGradient(0,sy-R*1.4,0,sy+R*1.4);
     gr.addColorStop(0,`rgba(${c0},${c1},${c2},0)`);gr.addColorStop(.5,`rgba(${c0},${c1},${c2},${.8*a})`);gr.addColorStop(1,`rgba(${c0},${c1},${c2},0)`);
     ctx.strokeStyle=gr;ctx.lineWidth=1;ctx.beginPath();if(h){ctx.moveTo(sx-R*1.4,sy);ctx.lineTo(sx+R*1.4,sy)}else{ctx.moveTo(sx,sy-R*1.4);ctx.lineTo(sx,sy+R*1.4)}ctx.stroke()}
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const x=nx(i),y=ny(j),d=Math.hypot(x-ptr.x,y-ptr.y);if(d<R){const f=Math.pow(1-d/R,1.6)*a;node(x,y,r0+2.6*f,acc,.25+.75*f)}}
    ctx.strokeStyle=`rgba(${c0},${c1},${c2},${.8*a})`;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(sx,sy,5.5,0,Math.PI*2);ctx.stroke()}};
  // capped near 60 fps: on 120 Hz screens the full-stage canvas would otherwise redraw twice as often for no visible gain
  const loop=t=>{raf=0;if(!visible||document.hidden)return;if(motionOff()){frame(t,true);return}if(!last||t-last>=15)frame(t);raf=requestAnimationFrame(loop)};
  const start=()=>{if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(loop)}};
  addEventListener('replotre:motion',start);
  let rb=0,lastSz='';new ResizeObserver(es=>{const b=es[es.length-1].contentRect,k=`${Math.round(b.width)}x${Math.round(b.height)}`;if(k===lastSz)return;lastSz=k;cancelAnimationFrame(rb);rb=requestAnimationFrame(build)}).observe(stageEl);
  new MutationObserver(build).observe(root,{attributes:true,attributeFilter:['data-theme']});
  new IntersectionObserver(([en])=>{visible=en.isIntersecting;visible?start():(cancelAnimationFrame(raf),raf=0)}).observe(stageEl);
  document.addEventListener('visibilitychange',start);
  const pos=e=>{const r=rectOf(stageEl);return [e.clientX-r.left,e.clientY-r.top]};
  stageEl.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const [x,y]=pos(e);if(ptr.a<.02){ptr.x=x;ptr.y=y}ptr.tx=x;ptr.ty=y;ptr.ta=1},{passive:true});
  stageEl.addEventListener('pointerleave',()=>{ptr.ta=0},{passive:true});
  stageEl.addEventListener('pointerdown',e=>{if(motionOff())return;const [x,y]=pos(e);ripples.push({x,y,t0:performance.now()});if(ripples.length>4)ripples.shift()},{passive:true});
  build();cv.classList.add('gf-live');start()}};
gridField($('#gridCanvas'),$('#stage'));
gridField($('#featGrid'),$('#features'),{anchorY:.12});
gridField($('#lkGrid'),$('#looks'),{anchorY:.14});// the Features section gets the same live grid as the hero

/* Grid spotlight: section and card grids brighten around the pointer */
if(finePointer&&!reduce)for(const el of $$('.gx'))spotlight(el,'--gx','--gy');

/* How it works cards: each step has its own particle field, drawn in the card's hue.
   01 Import: tiny film frames drift in and are absorbed by the stage. 02 Describe: dotted voice waves that swell near the pointer.
   03 Export: a render burst with pulse rings streaming out of the phone. Particle count follows card area; runs only while visible. */
{const fields=$$('.step3').map((card,k)=>{const cv=$('.st-fx',card);return cv&&cv.getContext?{card,cv,ctx:cv.getContext('2d'),kind:k%3,W:0,H:0,dpr:1,ps:[],rings:[],hue:[226,171,119],c:[0,0],t:0,vis:false,dark:false,ptr:{x:0,y:0,on:0}}:null}).filter(Boolean);
 if(fields.length){
  const rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
  const seed=(f,p,fresh)=>{const {W,H}=f;
   if(f.kind===0){const s=Math.random();if(fresh){p.x=rnd(0,W);p.y=rnd(0,H)}else if(s<.4){p.x=rnd(0,W);p.y=H+12}else if(s<.7){p.x=-12;p.y=rnd(0,H*.8)}else{p.x=W+12;p.y=rnd(0,H*.8)}
    p.w=rnd(7,14);p.life=fresh?rnd(.4,2):0;p.rot=rnd(-.6,.6);p.vr=rnd(-.5,.5);p.sp=rnd(16,38);p.curl=Math.random()<.5?-1:1}
   else if(f.kind===2){const [cx,cy]=f.c,ang=rnd(0,TAU),sp=rnd(26,100);p.x=cx+Math.cos(ang)*rnd(8,26);p.y=cy+Math.sin(ang)*rnd(8,26);p.vx=Math.cos(ang)*sp;p.vy=Math.sin(ang)*sp;p.max=rnd(1.4,2.8);p.life=fresh?rnd(0,p.max):0;p.r=rnd(1,2.4);p.streak=Math.random()<.35}};
  const size=f=>{const r=f.card.getBoundingClientRect(),a=$('.step3-art',f.card)?.getBoundingClientRect()||r;
   f.W=Math.max(1,r.width);f.H=Math.max(1,r.height);f.dpr=maxDpr();f.cv.width=Math.round(f.W*f.dpr);f.cv.height=Math.round(f.H*f.dpr);
   const h=getComputedStyle(f.card).getPropertyValue('--hue').split(',').map(Number);if(h.length===3&&h.every(n=>n>=0))f.hue=h;
   f.c=[a.left-r.left+a.width/2,a.top-r.top+a.height*.45];f.dark=root.dataset.theme==='dark';
   const area=f.W*f.H,n=f.kind===0?Math.round(Math.min(96,Math.max(24,area/3400))):f.kind===2?Math.round(Math.min(140,Math.max(40,area/2400))):0;
   f.ps=[];for(let i=0;i<n;i++){const p={};seed(f,p,true);f.ps.push(p)}
   f.gap=f.W<360?12:14;f.waves=f.H<520?3:4;f.rings=[]};
  const draw=(f,dt)=>{const {ctx,W,H}=f,[r,g,b]=f.hue,m=f.dark?1.15:1.55,P=f.ptr,rgba=a=>`rgba(${r},${g},${b},${Math.max(0,Math.min(.95,a))})`;
   ctx.setTransform(f.dpr,0,0,f.dpr,0,0);ctx.clearRect(0,0,W,H);f.t+=dt;const t=f.t;
   const push=p=>{if(!P.on||!dt)return;const dx=p.x-P.x,dy=p.y-P.y,d2=dx*dx+dy*dy;if(d2<6400&&d2>1){const d=Math.sqrt(d2),k=(1-d/80)*110*dt;p.x+=dx/d*k;p.y+=dy/d*k}};
   if(f.kind===0){const [cx,cy]=f.c;ctx.lineWidth=1;
    for(const p of f.ps){let d=Math.hypot(cx-p.x,cy-p.y)||1;
     if(dt){const dx=(cx-p.x)/d,dy=(cy-p.y)/d,sp=p.sp*(1+Math.max(0,1-d/260));p.x+=(dx-dy*.4*p.curl)*sp*dt;p.y+=(dy+dx*.4*p.curl)*sp*dt;p.rot+=p.vr*dt;p.life+=dt;push(p);d=Math.hypot(cx-p.x,cy-p.y);if(d<22){seed(f,p,false);continue}}
     const near=Math.min(1,d/130),a=Math.min(1,p.life*1.4)*(.2+.5*near)*m,s=p.w*(.4+.6*near);
     ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.strokeStyle=rgba(a);ctx.fillStyle=rgba(a*.3);ctx.beginPath();
     ctx.roundRect?ctx.roundRect(-s/2,-s*.31,s,s*.62,1.5):ctx.rect(-s/2,-s*.31,s,s*.62);ctx.fill();ctx.stroke();
     ctx.fillStyle=rgba(a*.9);ctx.fillRect(-s/2+1.5,-s*.31+1.2,Math.max(1,s*.12),Math.max(1,s*.12));ctx.restore()}}// tiny "sprocket" mark
   else if(f.kind===1){const gap=f.gap,n=Math.ceil(W/gap)+1,nw=f.waves;
    for(let w=0;w<nw;w++){const base=H*(.14+w*(.6/Math.max(1,nw-1))),amp=H*.03*(1+w*.2),ph=t*(1.2+w*.3)+w*1.9,freq=TAU/(W*(.5+w*.13)),dir=w%2?-1:1;
     for(let i=0;i<n;i++){const x=i*gap,env=.3+.7*Math.pow(Math.sin(x/W*Math.PI*1.6-t*1.3*dir+w),2);
      const boost=P.on?Math.max(0,1-Math.abs(x-P.x)/130)*Math.max(0,1-Math.abs(base-P.y)/170):0;
      const y=base+Math.sin(x*freq+ph)*amp*(env+boost*1.8);ctx.fillStyle=rgba((.16+.46*env+.4*boost)*m);ctx.beginPath();ctx.arc(x,y,1.1+env*1.1+boost*1.4,0,TAU);ctx.fill()}}}
   else{const [cx,cy]=f.c;if(dt&&(!f.rings.length||t-f.rings[f.rings.length-1]>2.6))f.rings.push(t);f.rings=f.rings.filter(t0=>t-t0<2.4);
    for(const t0 of f.rings){const k=(t-t0)/2.4;ctx.strokeStyle=rgba((1-k)*.45*m);ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(cx,cy,24+k*Math.max(W,H)*.55,0,TAU);ctx.stroke()}
    for(const p of f.ps){if(dt){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;push(p);if(p.life>p.max||p.x<-20||p.x>W+20||p.y<-20||p.y>H+20){seed(f,p,false);continue}}
     const a=Math.sin(Math.PI*Math.min(1,p.life/p.max))*.8*m;
     if(p.streak){ctx.strokeStyle=rgba(a);ctx.lineWidth=Math.max(.8,p.r*.8);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.09,p.y-p.vy*.09);ctx.stroke()}
     else{ctx.fillStyle=rgba(a);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill()}}}};
  let raf=0,last=0;
  const loop=now=>{raf=0;if(motionOff()||document.hidden)return;if(last&&now-last<15){if(fields.some(f=>f.vis))raf=requestAnimationFrame(loop);return}// ~60fps cap on 120Hz screens
   const dt=Math.min(.05,(now-(last||now))/1000);last=now;let any=false;for(const f of fields)if(f.vis){draw(f,dt);any=true}if(any)raf=requestAnimationFrame(loop)};
  const start=()=>{if(!raf&&!motionOff()&&!document.hidden&&fields.some(f=>f.vis)){last=0;raf=requestAnimationFrame(loop)}};
  const byCard=el=>fields.find(f=>f.card===el);
  const io=new IntersectionObserver(es=>{for(const en of es)byCard(en.target).vis=en.isIntersecting;start()},{rootMargin:'80px'});
  const ro=new ResizeObserver(es=>{for(const en of es){const f=byCard(en.target),b=en.contentRect,k=`${Math.round(b.width)}x${Math.round(b.height)}`;if(f.sz===k)continue;f.sz=k;size(f);draw(f,0)}});
  for(const f of fields){size(f);draw(f,0);f.cv.classList.add('on');io.observe(f.card);ro.observe(f.card);
   if(finePointer){f.card.addEventListener('pointermove',e=>{const r=rectOf(f.card);f.ptr.x=e.clientX-r.left;f.ptr.y=e.clientY-r.top;f.ptr.on=1},{passive:true});f.card.addEventListener('pointerleave',()=>{f.ptr.on=0})}}
  new MutationObserver(()=>fields.forEach(f=>{size(f);draw(f,0)})).observe(root,{attributes:true,attributeFilter:['data-theme']});
  addEventListener('replotre:motion',start);document.addEventListener('visibilitychange',start)}}

/* How it works cards: real clips loop only while their card is on screen (posters otherwise; still for reduced motion / lite) */
{const vs=$$('.st-vid');if(vs.length){const still=()=>reduce||root.classList.contains('lite');
 const vio=new IntersectionObserver(es=>{for(const en of es){const v=en.target;if(en.isIntersecting&&!still()&&!document.hidden){if(v.preload!=='auto')v.preload='auto';v.play().catch(()=>{})}else v.pause()}},{rootMargin:'120px 0px'});
 vs.forEach(v=>vio.observe(v));document.addEventListener('visibilitychange',()=>{if(document.hidden)vs.forEach(v=>v.pause())})}}
/* ---------- Features: tabbed feature player (auto-advances while visible) ---------- */
{const feat=$('#feat');if(feat){const tabs=$$('.feat-item',feat),panels=$$('.feat-panel',feat),num=$('#fsNum'),DUR=7000;let i=0,timer=0,inView=false,hold=false;
 feat.style.setProperty('--feat-dur',DUR+'ms');
 const restart=()=>{clearTimeout(timer);feat.classList.remove('cycling');void feat.offsetWidth;if(reduce||!inView||hold)return;feat.classList.add('cycling');timer=setTimeout(()=>show(i+1),DUR)};
 const show=(n,focus)=>{i=(n+tabs.length)%tabs.length;tabs.forEach((t,k)=>{const on=k===i;t.classList.toggle('is-on',on);t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1});
  panels.forEach((p,k)=>{const on=k===i;p.classList.toggle('is-on',on);p.inert=!on;p.setAttribute('aria-hidden',String(!on))});
  if(num)num.textContent=String(i+1).padStart(2,'0');if(focus)tabs[i].focus();restart()};
 tabs.forEach((t,k)=>t.addEventListener('click',()=>show(k)));
 $('.feat-list',feat).addEventListener('keydown',e=>{const d={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];if(d){e.preventDefault();show(i+d,true)}else if(e.key==='Home'){e.preventDefault();show(0,true)}else if(e.key==='End'){e.preventDefault();show(tabs.length-1,true)}});
 const pause=()=>{hold=true;feat.classList.add('paused');clearTimeout(timer)},resume=()=>{if(feat.matches(':hover')||feat.contains(document.activeElement))return;hold=false;feat.classList.remove('paused');restart()};
 if(finePointer){feat.addEventListener('pointerenter',pause);feat.addEventListener('pointerleave',resume)}
 feat.addEventListener('focusin',pause);feat.addEventListener('focusout',()=>setTimeout(resume,0));
 new IntersectionObserver(([en])=>{inView=en.isIntersecting;restart()},{threshold:.35}).observe(feat);
 show(0)}}
/* ---------- How it works: card illustrations loop only while on screen ---------- */
{const cards=$$('.step3');if(cards.length&&!reduce){const pio=new IntersectionObserver(es=>{for(const en of es)en.target.classList.toggle('play',en.isIntersecting)},{threshold:.25});cards.forEach(c=>pio.observe(c))}}
/* ---------- Story: the sticky visual follows the step in view ---------- */
const story=$('#storyVisual'),steps=$$('.story-step');
if(story&&steps.length){const sio=new IntersectionObserver(es=>{for(const en of es)if(en.isIntersecting){const i=en.target.dataset.i;story.dataset.active=i;steps.forEach(s=>s.classList.toggle('is-active',s===en.target))}},{rootMargin:'-45% 0px -45% 0px'});steps.forEach(s=>sio.observe(s));steps[0].classList.add('is-active')}

/* ---------- Looks: coverflow of built-in looks (swipe, keys, chips, auto-advance, hold to compare) ---------- */
{const lk=$('#lk');if(lk){const stage=$('#lkStage'),cards=$$('.lk-card',lk),chips=$$('.lk-chip',lk),meters=$$('#lkMeters dd',lk),live=$('#lkLive'),hold=$('#lkHold'),n=cards.length,DUR=4500;
 let i=1,timer=0,inView=false,paused=false,quietUntil=0;
 const vals=c=>['--b','--c','--s'].map(p=>parseFloat(c.style.getPropertyValue(p)));
 // one shared real clip: it moves into the front card and keeps playing, so every look grades the same footage
 const lkVid=document.createElement('video');lkVid.className='lk-vid';lkVid.muted=true;lkVid.loop=true;lkVid.playsInline=true;lkVid.preload='none';lkVid.disablePictureInPicture=true;
 lkVid.setAttribute('playsinline','');lkVid.setAttribute('aria-hidden','true');lkVid.poster='./assets/demo/looks.jpg';lkVid.src='./assets/demo/looks.mp4';
 const lkPlay=()=>{const shot=$('.lk-shot',cards[i]);if(!shot)return;if(lkVid.parentElement!==shot){const t=lkVid.currentTime;(shot.querySelector('.lk-img')||shot.firstChild).after(lkVid);if(t)try{lkVid.currentTime=t}catch(e){}}
  if(inView&&!reduce&&!root.classList.contains('lite')&&!document.hidden){lkVid.preload='auto';lkVid.play().catch(()=>{})}else lkVid.pause()};
 document.addEventListener('visibilitychange',()=>lkPlay());
 lkVid.addEventListener('timeupdate',()=>{const el=$('.lk-tc',cards[i]);if(el)el.textContent=tc(lkVid.currentTime)});// the front card's timecode follows the real clip
 const place=()=>{const w=cards[0].offsetWidth,narrow=innerWidth<640,gap=w*(narrow?.66:.78);
  cards.forEach((c,k)=>{let o=k-i;if(o>n/2)o-=n;if(o<-n/2)o+=n;const a=Math.abs(o),hide=a>(narrow?1:2);
   c.style.transform=`translate(-50%,-50%) translateX(${o*gap}px) translateZ(${-a*60}px) rotateY(${-o*10}deg) scale(${1-a*.12})`;
   c.style.filter=a?`blur(${Math.min(6,a*2.4)}px) saturate(.9)`:'';c.style.opacity=hide?0:String(1-a*.16);c.style.zIndex=String(10-a);c.style.pointerEvents=hide?'none':'';
   const on=a===0;c.classList.toggle('is-on',on);c.setAttribute('aria-hidden',String(!on))})};
 const show=(k,announce=true)=>{i=(k+n)%n;place();const sec=lk.closest('section');if(sec)sec.dataset.look=cards[i].dataset.look;// background glows take on the look's colours
  chips.forEach((c,x)=>{const on=x===i;c.classList.toggle('is-on',on);c.setAttribute('aria-checked',String(on))});
  vals(cards[i]).forEach((v,x)=>{const dd=meters[x];if(!dd)return;dd.querySelector('b').textContent=`${v}%`;dd.querySelector('i').style.width=`${Math.min(100,v/150*100)}%`});
  if(announce&&live)live.textContent=`${cards[i].dataset.look[0].toUpperCase()+cards[i].dataset.look.slice(1)} look`;restart();lkPlay()};
 const restart=()=>{clearTimeout(timer);if(reduce||!inView||paused)return;timer=setTimeout(()=>{if(performance.now()<quietUntil)return restart();show(i+1,false)},DUR)};
 const nudge=()=>{quietUntil=performance.now()+9000};// a person interacted: hold auto-advance for a while
 $('.lk-nav.prev',lk).addEventListener('click',()=>{nudge();show(i-1)});$('.lk-nav.next',lk).addEventListener('click',()=>{nudge();show(i+1)});
 chips.forEach((c,x)=>c.addEventListener('click',()=>{nudge();show(x)}));
 $('#lkChips').addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(!d)return;e.preventDefault();nudge();show(i+d);chips[i].focus()});
 stage.addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowLeft:-1}[e.key];if(d){e.preventDefault();nudge();show(i+d)}});
 cards.forEach((c,k)=>c.addEventListener('click',()=>{if(k!==i&&!dragged){nudge();show(k)}}));
 // swipe / drag
 let x0=null,dragged=false;
 stage.addEventListener('pointerdown',e=>{if(e.target.closest('.lk-nav'))return;x0=e.clientX;dragged=false});
 stage.addEventListener('pointermove',e=>{if(x0!==null&&Math.abs(e.clientX-x0)>8)dragged=true});
 const end=e=>{if(x0===null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>40){nudge();show(i+(dx<0?1:-1))}setTimeout(()=>{dragged=false},0)};
 stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',()=>{x0=null});
 // hold to compare with the original (touch, mouse, keyboard)
 const holdOn=()=>{lk.classList.add('holding');hold.setAttribute('aria-pressed','true')},holdOff=()=>{lk.classList.remove('holding');hold.setAttribute('aria-pressed','false')};
 hold.addEventListener('pointerdown',e=>{e.preventDefault();hold.setPointerCapture(e.pointerId);nudge();holdOn()});
 ['pointerup','pointercancel','lostpointercapture'].forEach(t=>hold.addEventListener(t,holdOff));
 hold.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();holdOn()}});
 hold.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')holdOff()});hold.addEventListener('blur',holdOff);
 // pause while someone is looking closely
 if(finePointer){lk.addEventListener('pointerenter',()=>{paused=true;clearTimeout(timer)});lk.addEventListener('pointerleave',()=>{paused=false;restart()})}
 lk.addEventListener('focusin',()=>{paused=true;clearTimeout(timer)});lk.addEventListener('focusout',()=>setTimeout(()=>{if(!lk.contains(document.activeElement)){paused=false;restart()}},0));
 new IntersectionObserver(([en])=>{inView=en.isIntersecting;restart();lkPlay()},{threshold:.3}).observe(lk);
 let rt=0,lw=innerWidth;addEventListener('resize',()=>{if(innerWidth===lw)return;lw=innerWidth;cancelAnimationFrame(rt);rt=requestAnimationFrame(place)},{passive:true});// phones fire resize as the address bar slides; layout only depends on width
 show(1,false)}}
/* ---------- FAQ: animated accordion (one open at a time), search, deep links ---------- */
{const list=$('#fqList');if(list){const items=$$('.fq-item',list),search=$('#fqSearch'),empty=$('#fqEmpty'),live=$('#fqLive');
 const anims=new WeakMap();
 const animate=(d,open)=>{const a=$('.fq-a',d);anims.get(d)?.cancel();
  if(reduce){d.open=open;return}
  if(open){d.open=true;const h=a.offsetHeight;const an=a.animate([{height:'0px',opacity:0},{height:h+'px',opacity:1}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'});anims.set(d,an)}
  else{const h=a.offsetHeight;const an=a.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0}],{duration:240,easing:'ease-in'});anims.set(d,an);an.onfinish=()=>{d.open=false}}};
 items.forEach(d=>{d.removeAttribute('name');// JS manages exclusivity so closing can animate
  $('summary',d).addEventListener('click',e=>{e.preventDefault();const willOpen=!d.open;if(willOpen)items.forEach(o=>{if(o!==d&&o.open)animate(o,false)});animate(d,willOpen);
   if(willOpen&&history.replaceState)history.replaceState(null,'',`#${d.id}`)})});
 // open the question named in the URL (e.g. /#faq-privacy)
 const fromHash=()=>{const d=location.hash&&document.getElementById(location.hash.slice(1));if(d&&d.classList.contains('fq-item')){items.forEach(o=>{o.open=o===d});d.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'})}};
 fromHash();addEventListener('hashchange',fromHash);
 // search: filter by question and answer text, highlight the match in the question
 const qs=items.map(d=>{const q=$('.fq-q',d);return {d,q,raw:q.textContent,text:(q.textContent+' '+$('.fq-a',d).textContent).toLowerCase()}});
 const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let t=0;search?.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{const term=search.value.trim().toLowerCase();let n=0;
  qs.forEach(({d,q,raw,text})=>{const hit=!term||term.split(/\s+/).every(w=>text.includes(w));d.hidden=!hit;if(hit)n++;
   if(term&&hit){const i=raw.toLowerCase().indexOf(term);q.innerHTML=i<0?esc(raw):esc(raw.slice(0,i))+'<mark>'+esc(raw.slice(i,i+term.length))+'</mark>'+esc(raw.slice(i+term.length))}else q.textContent=raw});
  empty.hidden=n>0;if(live)live.textContent=term?`${n} ${n===1?'question matches':'questions match'}`:''},120)});
 search?.addEventListener('keydown',e=>{if(e.key==='Escape'&&search.value){search.value='';search.dispatchEvent(new Event('input'))}});
}}
/* ---------- Counters ---------- */
const cio=new IntersectionObserver(es=>{for(const en of es){if(!en.isIntersecting)continue;cio.unobserve(en.target);const el=en.target,to=+el.dataset.to,neg=to<0,abs=Math.abs(to);if(reduce||abs===0){el.textContent=neg?`−${abs}`:abs;continue}let t0=null;const step=t=>{t0??=t;const p=Math.min(1,(t-t0)/1100),e=1-Math.pow(1-p,3),v=Math.round(abs*e);el.textContent=(neg?'−':'')+v;if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)}},{threshold:.6});
$$('.count').forEach(el=>cio.observe(el));

/* ---------- Shortcuts light up when you press the real keys ---------- */
const keyItems=$$('#keys li');
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable]'))return;const k=e.key.toLowerCase();const li=keyItems.find(x=>x.dataset.k.split(' ').includes(k===' '?' ':k)||(x.dataset.k===' '&&k===' '));if(!li)return;if(k===' '&&document.activeElement===document.body)e.preventDefault();li.classList.add('hit');clearTimeout(li._t);li._t=setTimeout(()=>li.classList.remove('hit'),650)});

/* ---------- Phone dock: after the hero, hidden near the final CTA ---------- */
const dock=$('#dock'),hero=$('.hero'),final=$('#final');
if(dock){let pastHero=false,nearEnd=false;const upd=()=>{const show=pastHero&&!nearEnd;dock.classList.toggle('show',show);dock.setAttribute('aria-hidden',String(!show));dock.querySelector('a').tabIndex=show?0:-1};
 new IntersectionObserver(([en])=>{pastHero=!en.isIntersecting&&en.boundingClientRect.top<0;upd()}).observe(hero);
 new IntersectionObserver(([en])=>{nearEnd=en.isIntersecting;upd()},{rootMargin:'0px 0px 120px 0px'}).observe(final)}

/* ---------- Feature tiles ---------- */
const demo=$('#textDemo'),title=$('#tdTitle'),frame=$('.td-frame');
if(title&&frame){let drag=null;const SNAP=.04;
 const place=(x,y)=>{const sv=Math.abs(x-.5)<SNAP,sh=Math.abs(y-.5)<SNAP;if(sv)x=.5;if(sh)y=.5;demo.classList.toggle('snap-v',sv&&!!drag);demo.classList.toggle('snap-h',sh&&!!drag);title.style.left=`${x*100}%`;title.style.top=`${y*100}%`;title.dataset.x=x;title.dataset.y=y};
 const bounds=()=>{const f=frame.getBoundingClientRect(),t=title.getBoundingClientRect();return {f,hx:t.width/2/f.width,hy:t.height/2/f.height}};
 title.addEventListener('pointerdown',e=>{e.preventDefault();title.setPointerCapture(e.pointerId);const {f}=bounds();drag={ox:e.clientX-(+title.dataset.x||.5)*f.width,oy:e.clientY-(+title.dataset.y||.3)*f.height}});
 title.addEventListener('pointermove',e=>{if(!drag)return;const {f,hx,hy}=bounds();place(Math.min(1-hx,Math.max(hx,(e.clientX-drag.ox)/f.width)),Math.min(1-hy,Math.max(hy,(e.clientY-drag.oy)/f.height)))});
 const end=()=>{if(!drag)return;drag=null;demo.classList.remove('snap-v','snap-h');title.textContent='Nice cut'};title.addEventListener('pointerup',end);title.addEventListener('pointercancel',end);
 title.addEventListener('keydown',e=>{const k={ArrowLeft:[-.03,0],ArrowRight:[.03,0],ArrowUp:[0,-.03],ArrowDown:[0,.03]}[e.key];if(!k)return;e.preventDefault();e.stopPropagation();const {hx,hy}=bounds();place(Math.min(1-hx,Math.max(hx,(+title.dataset.x||.5)+k[0])),Math.min(1-hy,Math.max(hy,(+title.dataset.y||.3)+k[1])))});
 place(.5,.3)}
const md=$('#mdTc'),kz=$('.kf-z'),shot=$('.kf-shot');
// readouts tick at ~15fps, only while their tiles are on screen, and only write when the text changes
if(!reduce&&(md||(kz&&shot))){const t0=performance.now();let raf=0,last=0,on=false,mdT='',kzT='';
 const loop=now=>{raf=0;if(!on||document.hidden)return;raf=requestAnimationFrame(loop);if(now-last<66)return;last=now;
  if(md){const v=tc(2.4+(((now-t0)/1000)%3.2)*1.25);if(v!==mdT){mdT=v;md.textContent=v}}
  if(kz&&shot){const m=getComputedStyle(shot).transform;const sc=m&&m!=='none'?Math.hypot(...m.slice(7,-1).split(',').slice(0,2).map(Number)):1;const v=`${Math.round(sc*100)}%`;if(v!==kzT){kzT=v;kz.textContent=v}}};
 const start=()=>{if(!raf&&on&&!document.hidden)raf=requestAnimationFrame(loop)};const seen=new Set();
 const tio=new IntersectionObserver(es=>{for(const en of es)en.isIntersecting?seen.add(en.target):seen.delete(en.target);on=seen.size>0;start()});
 [md,shot].forEach(el=>el&&tio.observe(el));document.addEventListener('visibilitychange',start)}

/* ---------- Off-screen sections: freeze their CSS animations ----------
   Many decorative loops animate width/left/box-shadow/clip-path/filter, which cost style + paint work every frame even when
   nobody can see them. Sections more than ~300px outside the viewport get .offscreen (see CSS), which pauses them. */
{const secs=$$('main > section:not(.hero), .footer');
 const oio=new IntersectionObserver(es=>{for(const en of es)en.target.classList.toggle('offscreen',!en.isIntersecting)},{rootMargin:'300px 0px'});
 secs.forEach(s=>oio.observe(s))}
/* ---------- Smoothness: pause decorative motion while scrolling, and an adaptive quality governor ---------- */
{let scT=0,on=false;
 addEventListener('scroll',()=>{if(!on){on=true;root.classList.add('is-scrolling')}clearTimeout(scT);scT=setTimeout(()=>{on=false;root.classList.remove('is-scrolling')},160)},{passive:true});
 // Watch real frame times while the hero is on screen; if this device can't hold ~45 fps, switch the hero to its lighter mode.
 const hero=document.querySelector('.hero-stage')||document.querySelector('.hero');
 if(hero&&!reduce){let watching=false,samples=[],lastT=0,strikes=0;
  const tick=t=>{if(!watching)return;if(lastT&&!document.hidden&&!root.classList.contains('is-scrolling'))samples.push(t-lastT);lastT=t;
   if(samples.length>=90){const s=samples.slice().sort((a,b)=>a-b),p75=s[Math.floor(s.length*.75)];samples=[];
    if(p75>22){if(++strikes>=2){root.classList.add('fx-lite');watching=false;return}}else strikes=0}
   requestAnimationFrame(tick)};
  new IntersectionObserver(([en])=>{const v=en.isIntersecting&&!root.classList.contains('fx-lite');if(v&&!watching){watching=true;lastT=0;samples=[];requestAnimationFrame(tick)}else if(!v)watching=false},{threshold:.25}).observe(hero)}}
})();
