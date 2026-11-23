/* Replotre template catalog — shared by the studio (classic script) and the server (ESM side-effect import).
 * A template is a creative direction: a colour grade, a backdrop treatment and a set of timed motion elements.
 * build(ctx) lays the elements out against the real timeline (duration, transcript words, beats, scenes).
 * sanitize(instance) is the single validator for anything that reaches the renderer or the database. */
(function(root){
'use strict';
const ELEMENT_TYPES=['headline','keyword','glassCard','phoneCard','captions','steps','counter','chips','streaks','lowerThird','cta','badge','flash','quote','dateStamp'];
const FONTS=['serif','sans','condensed','script','mono'];
const POSITIONS=['top','upper','center','lower','bottom'];
const VARIANTS=['standard','box','karaoke','script','minimal','outline'];
const STOP=new Set('a an and are as at be been but by for from had has have he her his i if in into is it its just me my no not of on or our she so that the their them then there they this to too up us was we were what when which who will with you your yeah okay um uh like really very can do dont im its thats get got going does did doing done have having been will would could should about just thing things kind gonna wanna want know think also then than because much many more some every something anything really actually basically literally maybe sure right okay yeah well even still always never here there these those where while which whats youre theyre were said says say make made take took give gave come came went goes look looking feel felt guys'.split(' '));
const hex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v);
const num=(v,min,max,d)=>{const n=typeof v==='number'&&Number.isFinite(v)?v:d;return Math.min(max,Math.max(min,n))};
const str=(v,max)=>String(v??'').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').slice(0,max);
const pick=(v,list,d)=>list.includes(v)?v:d;
const round=n=>Math.round(n*1000)/1000;

const TEMPLATES=[
 {id:'crimson',name:'Crimson Studio',tag:'New',ratio:'9:16',desc:'Puts you in a wine-red studio with a glass phone card behind your head and script-accent captions.',
  preview:{video:'wine.mp4',poster:'wine.jpg',source:'https://skilledcut.com/media/templates/wine/card.mp4'},
  thumb:{bg:'radial-gradient(120% 90% at 50% 30%,#a3243a 0%,#5c0f1e 55%,#2a060d 100%)',word:'content',kicker:'matter how much',font:'sans'},
  needsSubject:true,
  style:{accent:'#f2d3c4',ink:'#ffffff',washA:'#8f1d30',washB:'#3a0812',backdrop:.92,wash:.28,vignette:.55,grain:.12,glow:.2,letterbox:0,leak:0,flicker:false,scanlines:false,font:'sans',accentFont:'script'},
  grade:{brightness:102,contrast:108,saturation:92,warmth:8}},
 {id:'candlelit',name:'Candlelit',tag:'New',ratio:'9:16',desc:'A candle-lit plum studio with a frosted card behind you, a lowercase serif title and a soft flicker.',
  preview:{video:'plum.mp4',poster:'plum.jpg',source:'https://skilledcut.com/media/templates/plum/card.mp4'},
  thumb:{bg:'radial-gradient(120% 90% at 50% 25%,#7a2c5c 0%,#3d1230 60%,#1b0715 100%)',word:'minimal.',font:'serif'},
  needsSubject:true,
  style:{accent:'#f4c7a1',ink:'#fff7f0',washA:'#6d2352',washB:'#250a1d',backdrop:.88,wash:.25,vignette:.6,grain:.1,glow:.35,letterbox:0,leak:.15,flicker:true,scanlines:false,font:'serif',accentFont:'serif'},
  grade:{brightness:100,contrast:104,saturation:90,warmth:22}},
 {id:'motion-deck',name:'Motion Deck',tag:'',ratio:'9:16',desc:'A full motion-graphics edit from one plain clip: phone UI title, progress steps, chips and a counter.',
  preview:{video:'layers.mp4',poster:'layers.jpg',source:'https://skilledcut.com/media/templates/layers/card.mp4'},
  thumb:{bg:'linear-gradient(160deg,#3a3d44 0%,#16171b 70%)',word:'SHORTER',kicker:'I bet I could do a',font:'condensed'},
  needsSubject:false,
  style:{accent:'#ffffff',ink:'#f4f4f4',washA:'#2b2d33',washB:'#0d0e11',backdrop:0,wash:.5,vignette:.5,grain:.16,glow:0,letterbox:0,leak:0,flicker:false,scanlines:false,font:'condensed',accentFont:'serif'},
  grade:{brightness:96,contrast:112,saturation:40,warmth:0}},
 {id:'beat-keyword',name:'Beat Keyword',tag:'New',ratio:'9:16',desc:'A bold blue keyword behind your head that swaps on every beat, with photo-flash hits.',
  preview:{video:'cobalt.mp4',poster:'cobalt.jpg',source:'https://skilledcut.com/media/templates/cobalt/card.mp4'},
  thumb:{bg:'linear-gradient(170deg,#1e3a8a 0%,#0b1533 70%)',word:'RED',kicker:'dressed in',font:'condensed'},
  needsSubject:true,
  style:{accent:'#3b82f6',ink:'#ffffff',washA:'#1d4ed8',washB:'#0a1230',backdrop:0,wash:.08,vignette:.35,grain:.06,glow:.15,letterbox:0,leak:0,flicker:false,scanlines:false,font:'condensed',accentFont:'sans'},
  grade:{brightness:102,contrast:116,saturation:112,warmth:-6}},
 {id:'hero-float',name:'Hero Float',tag:'New',ratio:'9:16',desc:'Turns a product shot into a hero ad: orbiting light ribbons, a slow float, brand title and a call to action.',
  preview:{video:'float-ad.mp4',poster:'float-ad.jpg',source:'https://skilledcut.com/media/templates/float-ad/card.mp4'},
  thumb:{bg:'radial-gradient(100% 80% at 50% 50%,#c0263f 0%,#6d0e20 60%,#2b050c 100%)',word:'HERO',font:'sans'},
  needsSubject:false,
  style:{accent:'#ff9db0',ink:'#ffffff',washA:'#b3203a',washB:'#2a040b',backdrop:0,wash:.3,vignette:.6,grain:.05,glow:.6,letterbox:0,leak:.1,flicker:false,scanlines:false,font:'sans',accentFont:'script'},
  grade:{brightness:104,contrast:112,saturation:118,warmth:4}},
 {id:'interview-glow',name:'Interview Glow',tag:'New',ratio:'9:16',desc:'Interview-style captions with lime-green emphasis, italic serif words and a soft glow over your footage.',
  preview:{video:'interview-glow.mp4',poster:'interview-glow.jpg',source:'https://www.pinterest.com/pin/1118863101209858069/'},
  thumb:{bg:'radial-gradient(110% 80% at 50% 95%,#99d925 0%,#17200d 42%,#0b0d0a 75%)',word:'powerful',kicker:'make your words',font:'serif'},
  needsSubject:false,
  style:{accent:'#b7ff3c',ink:'#ffffff',washA:'#10150b',washB:'#050605',backdrop:0,wash:.06,vignette:.28,grain:.02,glow:.5,letterbox:0,leak:0,flicker:false,scanlines:false,font:'sans',accentFont:'serif'},
  grade:{brightness:100,contrast:110,saturation:96,warmth:0}},
 {id:'property-reel',name:'Property Reel',tag:'New',ratio:'9:16',desc:'A property-tour look with oversized cream keywords behind you, clean captions and a closing call to action.',
  preview:{video:'property-reel.mp4',poster:'property-reel.jpg',source:'https://www.pinterest.com/pin/1100004277771101481/'},
  thumb:{bg:'linear-gradient(160deg,#426c67 0%,#1b342a 55%,#101d17 100%)',word:'HOME',kicker:'your next chapter',font:'condensed'},
  needsSubject:true,
  style:{accent:'#ffe2b7',ink:'#ffffff',washA:'#183a32',washB:'#081710',backdrop:0,wash:.05,vignette:.24,grain:.02,glow:.05,letterbox:0,leak:0,flicker:false,scanlines:false,font:'condensed',accentFont:'sans'},
  grade:{brightness:102,contrast:110,saturation:105,warmth:8}},
 {id:'field-journal',name:'Field Journal',tag:'',ratio:'9:16',desc:'Atmospheric short film: warm film grade, grain, light leaks, letterbox and a date stamp.',
  thumb:{bg:'linear-gradient(110deg,#4c3b32,#b58a66)',word:'THE MOMENTS',font:'sans'},
  needsSubject:false,
  style:{accent:'#ffb36b',ink:'#fff4e6',washA:'#b58a66',washB:'#2a1d15',backdrop:0,wash:.12,vignette:.5,grain:.28,glow:.1,letterbox:.085,leak:.45,flicker:false,scanlines:false,font:'serif',accentFont:'serif'},
  grade:{brightness:103,contrast:94,saturation:86,warmth:34}},
 {id:'editorial',name:'Editorial Cut',tag:'',ratio:'9:16',desc:'Typography-led storytelling: monochrome grade, stacked condensed words and a magazine lower third.',
  thumb:{bg:'linear-gradient(110deg,#454b47,#242828)',word:'NOTHING',font:'condensed'},
  needsSubject:false,
  style:{accent:'#e8ff5a',ink:'#ffffff',washA:'#1a1a1a',washB:'#000000',backdrop:0,wash:.18,vignette:.4,grain:.18,glow:0,letterbox:0,leak:0,flicker:false,scanlines:false,font:'condensed',accentFont:'serif'},
  grade:{brightness:100,contrast:124,saturation:12,warmth:0}},
 {id:'cinematic-wide',name:'Cinematic Wide',tag:'',ratio:'16:9',desc:'Landscape films and intros: 2.39 letterbox, teal-and-orange grade, spaced title and lower third.',
  thumb:{bg:'linear-gradient(110deg,#233a43,#5d7269)',word:'A DIFFERENT',font:'sans'},
  needsSubject:false,
  style:{accent:'#ffb27a',ink:'#ffffff',washA:'#1f4d57',washB:'#0a1316',backdrop:0,wash:.14,vignette:.45,grain:.12,glow:.1,letterbox:.12,leak:.12,flicker:false,scanlines:false,font:'sans',accentFont:'serif'},
  grade:{brightness:98,contrast:114,saturation:108,warmth:10}},
 {id:'neon-pulse',name:'Neon Pulse',tag:'',ratio:'9:16',desc:'Night-drive energy: magenta and cyan glow type behind you, scanlines and beat flashes.',
  thumb:{bg:'linear-gradient(160deg,#5b0f6b 0%,#0b1030 70%)',word:'NIGHT',font:'condensed'},
  needsSubject:true,
  style:{accent:'#ff3df2',ink:'#7df9ff',washA:'#4c0d66',washB:'#050818',backdrop:0,wash:.22,vignette:.55,grain:.1,glow:.85,letterbox:0,leak:0,flicker:false,scanlines:true,font:'condensed',accentFont:'sans'},
  grade:{brightness:96,contrast:118,saturation:130,warmth:-22}},
 {id:'pop-captions',name:'Pop Captions',tag:'',ratio:'9:16',desc:'Creator-style captions: word-by-word highlight boxes, keyword pops and a follow button.',
  thumb:{bg:'linear-gradient(160deg,#facc15 0%,#f97316 100%)',word:'WATCH',font:'sans'},
  needsSubject:false,
  style:{accent:'#facc15',ink:'#ffffff',washA:'#000000',washB:'#000000',backdrop:0,wash:0,vignette:.25,grain:0,glow:0,letterbox:0,leak:0,flicker:false,scanlines:false,font:'sans',accentFont:'sans'},
  grade:{brightness:103,contrast:110,saturation:115,warmth:0}},
 {id:'documentary',name:'Documentary',tag:'',ratio:'16:9',desc:'Measured and factual: location stamp, interview lower third, pull-quote card and clean captions.',
  thumb:{bg:'linear-gradient(110deg,#2f3a33,#7b8a72)',word:'FIELD NOTES',font:'serif'},
  needsSubject:false,
  style:{accent:'#d9c27a',ink:'#ffffff',washA:'#2f3a33',washB:'#0c0f0d',backdrop:0,wash:.1,vignette:.35,grain:.14,glow:0,letterbox:0,leak:0,flicker:false,scanlines:false,font:'serif',accentFont:'serif'},
  grade:{brightness:100,contrast:104,saturation:88,warmth:6}},
 {id:'quote-card',name:'Quote Card',tag:'',ratio:'4:5',desc:'A frosted pull-quote over your footage with a soft backdrop and an author line.',
  thumb:{bg:'linear-gradient(110deg,#652d5a,#e48679)',word:'“SAY IT”',font:'serif'},
  needsSubject:false,
  style:{accent:'#ffd1b8',ink:'#ffffff',washA:'#652d5a',washB:'#1c0b19',backdrop:0,wash:.3,vignette:.45,grain:.08,glow:.15,letterbox:0,leak:.1,flicker:false,scanlines:false,font:'serif',accentFont:'serif'},
  grade:{brightness:100,contrast:100,saturation:96,warmth:10}}
];

/* ---------- Layout helpers (shared by the local planner and the server's Claude planner) ---------- */
function keywordsFrom(ctx,n=6){
 const counts=new Map(),src=(ctx.words?.length?ctx.words.map(w=>w.w):String(ctx.script||titleWords(ctx)||'').split(/\s+/));
 for(const raw of src){const w=String(raw).toLowerCase().replace(/[^a-z0-9'’-]/g,'');if(w.length<4||STOP.has(w))continue;counts.set(w,(counts.get(w)||0)+1+w.length/12)}
 return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([w])=>w);
}
function titleWords(ctx){const t=String(ctx.title||'').replace(/\s+/g,' ').trim();return t&&!/^untitled/i.test(t)?t:''}
function evenBeats(start,end,step){const out=[];for(let t=start;t<end-.05;t+=step)out.push(round(t));return out}
function beatsIn(ctx,start,end,fallbackStep=.6){const b=(ctx.beats||[]).filter(t=>t>=start&&t<end);return (b.length>=2?b:evenBeats(start,end,fallbackStep)).slice(0,200)}
function captionWords(ctx,start=0,end=ctx.duration){
 if(ctx.words?.length)return ctx.words.filter(w=>w.t>=start&&w.t<end).slice(0,600).map(w=>[str(w.w,40),round(w.t),round(Math.max(.06,w.d))]);
 const text=String(ctx.script||'').trim();if(!text)return [];
 const words=text.split(/\s+/).slice(0,400),step=(end-start)/Math.max(1,words.length);
 return words.map((w,i)=>[str(w,40),round(start+i*step),round(step*.95)]);
}
const el=(type,start,duration,extra={})=>({type,start:round(Math.max(0,start)),duration:round(Math.max(.3,duration)),...extra});

/* ---------- Timeline sequencing ----------
   Talking footage: a headline pops on a key word at the moment it is spoken, with the words just before it as the kicker.
   No transcript: the template's own placeholder copy is spread across the clip so the whole timeline carries motion. */
const COPY={
 crimson:[['matter how much','content'],['nobody talks about','consistency'],['show up','daily'],['this is how you','grow']],
 candlelit:[['every move is','minimal.'],['keep it','simple.'],['less, but','better.'],['slow is','smooth.']],
 'interview-glow':[['this is','powerful'],['we are living in very','unique'],['it changes','everything'],['the real','reason']],
 editorial:[['','NOTHING'],['','EXTRA'],['','ONLY'],['','WHAT MATTERS']],
 'cinematic-wide':[['','A DIFFERENT'],['','PERSPECTIVE']],
 'field-journal':[['','The moments'],['','between']],
 'hero-float':[['Introducing','Made to glow'],['Built for','every day'],['Designed to','stand out']],
 'pop-captions':[['','WATCH THIS'],['','WAIT FOR IT']]
};
function speechPops(ctx,{gap=2,max=8,start=0,end=ctx.duration}={}){
 const words=(ctx.words||[]).filter(w=>w.t>=start&&w.t<end-.4);if(words.length<3)return [];
 const freq=new Map();for(const w of words){const c=cleanW(w.w);freq.set(c,(freq.get(c)||0)+1)}
 const score=w=>{const c=cleanW(w.w);if(c.length<4||STOP.has(c))return 0;return Math.min(c.length,9)+(freq.get(c)>1?3:0)+(/[!?]$/.test(w.w)?3:0)+(w.d>.45?2:0)};
 const picks=[];let last=-1e9;
 const ranked=words.map((w,i)=>({w,i,s:score(w)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
 for(const x of ranked){if(picks.length>=max)break;if(picks.some(p=>Math.abs(p.w.t-x.w.t)<gap))continue;picks.push(x)}
 picks.sort((a,b)=>a.w.t-b.w.t);
 return picks.map(({w,i})=>{const before=[];for(let j=i-1;j>=0&&before.length<4;j--){if(w.t-words[j].t>1.6)break;before.unshift(words[j].w)}return {t:w.t,word:w.w.replace(/[^\w'’-]+$/,''),kicker:before.join(' ').replace(/[,.;:!?]+$/,'')}});
}
function evenPops(id,ctx,{seg=3,start=0}={}){const pool=COPY[id]||[['','']];const D=ctx.duration-start;const n=Math.max(1,Math.min(8,Math.round(D/seg)));const len=D/n;
 return Array.from({length:n},(_,i)=>{const [kicker,word]=pool[i%pool.length];return {t:start+i*len+.25,word,kicker,len}})}
const cleanW=w=>String(w).toLowerCase().replace(/[^a-z0-9'’-]/g,'');
/** Headline pops across the timeline. */
function pops(id,ctx,opts={}){const {position='upper',behind=false,variant='standard',lower=false,start=0,dur=2.2}=opts;
 const speech=speechPops(ctx,{start});const list=speech.length?speech:evenPops(id,ctx,{start});
 return list.map((p,i)=>{const next=list[i+1]?.t??ctx.duration;const d=Math.max(1.1,Math.min(p.len?p.len-.3:dur,next-p.t-.15));
  const text=lower?p.word.toLowerCase():p.word;return el('headline',Math.max(0,p.t-.12),d,{text,sub:p.kicker,emphasis:[cleanW(p.word)],behind,position,variant})})}


const BUILDERS={
 crimson(ctx){const D=ctx.duration,k=keywordsFrom(ctx,3),t=titleWords(ctx),mid=Math.min(D*.45,6);
  return [...pops('crimson',ctx,{position:'top',behind:true}),
   el('phoneCard',mid,Math.min(D*.35,6),{text:t||'Post every day.',sub:'Notes',behind:true,position:'center'}),
   el('captions',0,D,{variant:'script',emphasis:k,position:'lower',words:captionWords(ctx)})]},
 candlelit(ctx){const D=ctx.duration,k=keywordsFrom(ctx,3),t=titleWords(ctx);const p=pops('candlelit',ctx,{position:'top',behind:true,lower:true});
  return [...p,el('badge',p[0]?.start??.3,Math.min(D,(p[0]?.duration??3)),{text:'+',position:'upper'}),
   el('glassCard',Math.min(D*.5,5),Math.min(D*.4,6),{text:t||'Less, but better.',sub:'a note to self',behind:true,position:'center'}),
   el('captions',0,D,{variant:'script',emphasis:k,position:'lower',words:captionWords(ctx)})]},
 'motion-deck'(ctx){const D=ctx.duration,k=keywordsFrom(ctx,4),t=titleWords(ctx);const seg=D/4;
  return [el('phoneCard',.2,Math.min(D-.2,seg*1.6),{text:t?t.toUpperCase():'SHORTER',sub:'I bet I could do a',position:'upper',variant:'minimal'}),
   el('steps',seg*1.6+.25,Math.min(D-seg*1.6-.25,seg*1.9),{items:(k.length>=3?k.slice(0,4):['Start','Build','Ship','Grow']).map(cap),position:'center'}),
   el('chips',seg*1.4,Math.min(D-seg*1.4,seg*1.8),{items:k.slice(0,3).map(cap),position:'lower'}),
   el('counter',seg*2.6,Math.min(D-seg*2.6,seg*1.4),{value:13,sub:'Instead of',text:'',position:'lower'}),
   el('captions',0,D,{variant:'minimal',emphasis:k.slice(0,2),position:'bottom',words:captionWords(ctx)})]},
 'beat-keyword'(ctx){const D=ctx.duration,k=keywordsFrom(ctx,6),t=titleWords(ctx),sp=speechPops(ctx,{gap:1.2,max:24});
  const items=sp.length?sp.map(p=>p.word.toUpperCase()):(k.length?k:['bold','loud','yours']).map(w=>w.toUpperCase());
  return [el('keyword',.2,D-.2,{items,sub:t||'dressed in',behind:true,position:'upper',beats:sp.length?sp.map(p=>Math.max(.2,+(p.t-.08).toFixed(3))):beatsIn(ctx,.2,D)}),
   el('flash',0,D,{beats:(sp.length?sp.map(p=>p.t):beatsIn(ctx,0,D)).filter((_,i)=>i%3===0)}),
   el('captions',0,D,{variant:'minimal',emphasis:k.slice(0,3),position:'bottom',words:captionWords(ctx)})]},
 'hero-float'(ctx){const D=ctx.duration,t=titleWords(ctx);const ctaAt=Math.max(.5,D*.6);
  const p=pops('hero-float',{...ctx,words:[],duration:ctaAt},{position:'top'});if(t&&p[0])p[0].text=t;
  return [el('streaks',0,D,{}),...p,el('cta',ctaAt,D-ctaAt,{text:'Shop now',position:'bottom'})]},
 'interview-glow'(ctx){const D=ctx.duration,k=keywordsFrom(ctx,5);
  return [...pops('interview-glow',ctx,{position:'center',lower:true}),
   el('captions',0,D,{variant:'script',emphasis:k,position:'lower',words:captionWords(ctx)})]},
 'property-reel'(ctx){const D=ctx.duration,k=keywordsFrom(ctx,5),ctaStart=Math.max(.4,D-2.8);
  return [el('keyword',.2,D-.2,{items:(k.length?k:['home','details','possibilities']).map(w=>w.toUpperCase()),sub:titleWords(ctx),behind:true,position:'upper',beats:beatsIn(ctx,.2,D,.85)}),
   el('captions',0,D,{variant:'minimal',emphasis:k.slice(0,3),position:'bottom',words:captionWords(ctx)}),
   el('cta',ctaStart,D-ctaStart,{text:'Get in touch',position:'lower'})]},
 'field-journal'(ctx){const D=ctx.duration,t=titleWords(ctx)||'The moments between',capAt=Math.min(4.8,D*.45);
  return [el('headline',.6,Math.min(D-.6,4.2),{text:t,position:'center'}),el('dateStamp',0,D,{text:'',position:'bottom'}),
   el('captions',capAt,D-capAt,{variant:'minimal',position:'lower',words:captionWords(ctx,capAt)})]},
 editorial(ctx){const D=ctx.duration,k=keywordsFrom(ctx,3),t=titleWords(ctx);
  const p=pops('editorial',ctx,{position:'center',variant:'outline'}).map(e=>({...e,text:e.text.toUpperCase(),sub:''}));if(t&&p[0])p[0].text=t.toUpperCase();
  return [...p,el('lowerThird',Math.min(3.8,D*.4),Math.min(D*.45,5),{text:cap(k[0]||'Chapter one'),sub:'Issue 01',position:'lower'}),
   el('captions',0,D,{variant:'box',emphasis:k,position:'bottom',words:captionWords(ctx)})]},
 'cinematic-wide'(ctx){const D=ctx.duration,t=titleWords(ctx)||'A different perspective';
  return [el('headline',.8,Math.min(D-.8,4.5),{text:t.toUpperCase(),position:'center',variant:'minimal'}),
   el('lowerThird',Math.min(5.5,D*.45),Math.min(D*.4,5),{text:'Chapter I',sub:'Opening',position:'lower'}),
   el('captions',0,D,{variant:'minimal',position:'bottom',words:captionWords(ctx)})]},
 'neon-pulse'(ctx){const D=ctx.duration,k=keywordsFrom(ctx,6),sp=speechPops(ctx,{gap:1.1,max:24});
  return [el('keyword',.2,D-.2,{items:sp.length?sp.map(p=>p.word.toUpperCase()):(k.length?k:['night','drive','glow']).map(w=>w.toUpperCase()),behind:true,position:'upper',beats:sp.length?sp.map(p=>Math.max(.2,+(p.t-.08).toFixed(3))):beatsIn(ctx,.2,D,.5)}),
   el('flash',0,D,{beats:(sp.length?sp.map(p=>p.t):beatsIn(ctx,0,D,.5)).filter((_,i)=>i%2===0)}),
   el('captions',0,D,{variant:'karaoke',emphasis:k.slice(0,3),position:'bottom',words:captionWords(ctx)})]},
 'pop-captions'(ctx){const D=ctx.duration,k=keywordsFrom(ctx,5);
  return [el('captions',0,D,{variant:'box',emphasis:k,position:'lower',words:captionWords(ctx)}),
   el('cta',Math.max(.5,D-3.2),Math.min(3.2,D-.5),{text:'Follow for more',position:'top'})]},
 documentary(ctx){const D=ctx.duration,t=titleWords(ctx)||'Field notes';
  return [el('dateStamp',.2,Math.min(D-.2,4),{text:'',sub:'Location',position:'top',variant:'minimal'}),
   el('lowerThird',Math.min(1.2,D*.2),Math.min(D*.4,5),{text:t,sub:'Interview',position:'lower'}),
   el('quote',Math.min(D*.55,7),Math.min(D*.35,6),{text:titleWords(ctx)||'Every place keeps a story.',sub:'— From the field',position:'center'}),
   el('captions',0,D,{variant:'minimal',position:'bottom',words:captionWords(ctx)})]},
 'quote-card'(ctx){const D=ctx.duration,t=titleWords(ctx)||'Make it simple, but significant.';
  return [el('quote',.4,D-.4,{text:t,sub:'— Your name',position:'center'}),el('badge',.8,D-.8,{text:'”',position:'top'})]}
};
function cap(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1)}

/* ---------- Validation ---------- */
function sanitizeStyle(s,base){s=s&&typeof s==='object'?s:{};base=base||TEMPLATES[0].style;
 return {accent:hex(s.accent)?s.accent:base.accent,ink:hex(s.ink)?s.ink:base.ink,washA:hex(s.washA)?s.washA:base.washA,washB:hex(s.washB)?s.washB:base.washB,
  backdrop:num(s.backdrop,0,1,base.backdrop),wash:num(s.wash,0,1,base.wash),vignette:num(s.vignette,0,1,base.vignette),grain:num(s.grain,0,1,base.grain),glow:num(s.glow,0,1,base.glow),
  letterbox:num(s.letterbox,0,.2,base.letterbox),leak:num(s.leak,0,1,base.leak),flicker:typeof s.flicker==='boolean'?s.flicker:!!base.flicker,scanlines:typeof s.scanlines==='boolean'?s.scanlines:!!base.scanlines,
  font:pick(s.font,FONTS,base.font),accentFont:pick(s.accentFont,FONTS,base.accentFont)}}
function sanitizeGrade(g,base){g=g&&typeof g==='object'?g:{};base=base||{brightness:100,contrast:100,saturation:100,warmth:0};
 return {brightness:Math.round(num(g.brightness,60,140,base.brightness)),contrast:Math.round(num(g.contrast,60,140,base.contrast)),saturation:Math.round(num(g.saturation,0,180,base.saturation)),warmth:Math.round(num(g.warmth,-60,60,base.warmth))}}
function sanitizeElement(e,i,limit){if(!e||typeof e!=='object'||!ELEMENT_TYPES.includes(e.type))return null;
 const start=num(e.start,0,limit,0),duration=num(e.duration,.3,Math.max(.3,limit-start||.3),3);
 const out={id:str(e.id,60)||`tpl_${i}_${e.type}`,type:e.type,start:round(start),duration:round(duration),text:str(e.text,160),sub:str(e.sub,90),
  items:Array.isArray(e.items)?e.items.slice(0,8).map(x=>str(x,40)).filter(Boolean):[],emphasis:Array.isArray(e.emphasis)?e.emphasis.slice(0,16).map(x=>str(x,40).toLowerCase()).filter(Boolean):[],
  value:num(e.value,-1e6,1e6,0),behind:e.behind===true,position:pick(e.position,POSITIONS,'center'),variant:pick(e.variant,VARIANTS,'standard')};
 if(Array.isArray(e.beats))out.beats=e.beats.filter(t=>typeof t==='number'&&Number.isFinite(t)&&t>=0&&t<=3600).slice(0,200).map(round);
 if(Array.isArray(e.words))out.words=e.words.filter(w=>Array.isArray(w)&&w.length===3&&typeof w[1]==='number'&&typeof w[2]==='number'&&Number.isFinite(w[1])&&Number.isFinite(w[2])).slice(0,600).map(w=>[str(w[0],40),round(Math.max(0,w[1])),round(num(w[2],.02,10,.3))]);
 return out}
function sanitize(t){
 if(t===null||t===undefined)return null;if(typeof t!=='object'||Array.isArray(t))return null;
 const base=TEMPLATES.find(x=>x.id===t.id);
 const elements=(Array.isArray(t.elements)?t.elements:[]).slice(0,24).map((e,i)=>sanitizeElement(e,i,3600)).filter(Boolean);
 return {id:base?base.id:'custom',name:str(t.name,60)||base?.name||'Custom look',style:sanitizeStyle(t.style,base?.style),grade:sanitizeGrade(t.grade,base?.grade),elements,
  engine:pick(t.engine,['claude','local'],'local'),brief:str(t.brief,400),needsSubject:typeof t.needsSubject==='boolean'?t.needsSubject:!!base?.needsSubject||elements.some(e=>e.behind)||sanitizeStyle(t.style,base?.style).backdrop>0}}

/** Lay a template out against the timeline context: {duration, title, words:[{w,t,d}], beats:[t], scenes:[t], script}. */
function build(id,ctx){const tpl=TEMPLATES.find(x=>x.id===id);if(!tpl)return null;
 const c={duration:Math.max(1,num(ctx?.duration,1,3600,10)),title:ctx?.title||'',words:Array.isArray(ctx?.words)?ctx.words:[],beats:Array.isArray(ctx?.beats)?ctx.beats:[],scenes:Array.isArray(ctx?.scenes)?ctx.scenes:[],script:ctx?.script||''};
 const elements=BUILDERS[id](c).filter(e=>e.start<c.duration).map(e=>({...e,duration:Math.min(e.duration,c.duration-e.start)}));
 return sanitize({id,name:tpl.name,style:tpl.style,grade:tpl.grade,elements,engine:'local',needsSubject:tpl.needsSubject})}

const api={TEMPLATES,ELEMENT_TYPES,FONTS,POSITIONS,VARIANTS,build,sanitize,sanitizeElement,keywordsFrom,captionWords,beatsIn,get:id=>TEMPLATES.find(t=>t.id===id)||null};
root.ReplotreTemplateCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:window);
