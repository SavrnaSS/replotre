#!/usr/bin/env node
/* Generates theme-light.css from the editor's dark stylesheets.
   Every rule that sets a colour is re-emitted under :root[data-theme="light"] with mapped colours,
   so the cascade order of the originals is preserved and new dark styles get a light twin on rebuild.
   Usage: node scripts/build-light-theme.mjs          (write)
          node scripts/build-light-theme.mjs --check  (exit 1 if theme-light.css is stale) */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCES=['styles.css','refinement.css','cloud.css','intelligence.css'];
export const OUTPUT='theme-light.css';
const SCOPE=':root[data-theme="light"]';

/* Things drawn on top of the video keep their original (video-safe) styling. */
const KEEP=/\.(preview-frame|preview-video|fade-veil|canvas-guide|guide-[a-z-]+|text-guides|tg-[vh]|text-select|ts-[a-z]+|viewer-burnin|vb-[a-z]+|preview-overlay|po-[a-z]+|asset-thumb|thumb-time|demo-thumb|clip-strip|pp-thumb[a-z-]*|pp-trimviz-strip|source-thumb|has-poster)\b|#previewCanvas|#previewFrame/;

const COLOR_PROPS=/^(color|background|background-color|background-image|border|border-[a-z-]*color|border-(top|right|bottom|left|block|inline)(-start|-end)?|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|accent-color|text-decoration|text-decoration-color|column-rule|scrollbar-color|filter|-webkit-text-fill-color|-webkit-text-stroke|-webkit-text-stroke-color|--[\w-]+|color-scheme)$/;
const SHADOW_PROPS=/^(box-shadow|text-shadow|filter)$/;
const BG_PROPS=/^(background|background-color|background-image)$/;

/* ---------- colour maths (sRGB <-> OKLab) ---------- */
const toLin=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4,toSrgb=c=>c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055;
function rgbToOklab([r,g,b]){[r,g,b]=[r,g,b].map(v=>toLin(v/255));
 const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
 return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]}
function oklabToRgb([L,a,b]){const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(v=>Math.round(Math.min(1,Math.max(0,toSrgb(Math.max(0,v))))*255))}
const lch=rgb=>{const [L,a,b]=rgbToOklab(rgb);return {L,C:Math.hypot(a,b),h:Math.atan2(b,a)}};
const fromLch=(L,C,h)=>{/* reduce chroma until in gamut */for(let c=C;c>=0;c-=.005){const lab=[L,c*Math.cos(h),c*Math.sin(h)];const r=oklabToRgbRaw(lab);if(r.every(v=>v>=-.001&&v<=1.001))return oklabToRgb(lab)}return oklabToRgb([L,0,0])};
function oklabToRgbRaw([L,a,b]){const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;
 return [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s].map(toSrgb)}

/* Neutral tone curve: dark surfaces -> warm paper, light text -> ink. */
const CURVE=[[0,.995],[.12,.985],[.2,.968],[.27,.95],[.33,.915],[.45,.78],[.6,.53],[.72,.42],[.85,.3],[.93,.24],[1,.2]];
const curve=L=>{for(let i=1;i<CURVE.length;i++){const [x0,y0]=CURVE[i-1],[x1,y1]=CURVE[i];if(L<=x1)return y0+(y1-y0)*(L-x0)/(x1-x0)}return CURVE.at(-1)[1]};
const WARM_H=1.25,WARM_C=.008; // tint neutrals slightly toward the brand's warm paper

function parseColor(tok){
 let m=tok.match(/^#([0-9a-f]{3,8})$/i);
 if(m){let h=m[1];if(h.length<=4)h=[...h].map(c=>c+c).join('');if(h.length!==6&&h.length!==8)return null;return {rgb:[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),a:h.length===8?parseInt(h.slice(6),16)/255:1}}
 m=tok.match(/^rgba?\(([^)]*)\)$/i);
 if(m){const p=m[1].split(/[\s,/]+/).filter(Boolean);if(p.length<3)return null;const n=p.slice(0,3).map(v=>v.endsWith('%')?parseFloat(v)*2.55:parseFloat(v));if(n.some(Number.isNaN))return null;let a=p[3]==null?1:p[3].endsWith('%')?parseFloat(p[3])/100:parseFloat(p[3]);return {rgb:n,a}}
 if(/^white$/i.test(tok))return {rgb:[255,255,255],a:1};
 if(/^black$/i.test(tok))return {rgb:[0,0,0],a:1};
 return null}
const hex2=v=>Math.round(v).toString(16).padStart(2,'0');
const fmt=(rgb,a)=>a>=.999?`#${rgb.map(hex2).join('')}`:`#${rgb.map(hex2).join('')}${hex2(a*255)}`;

export function mapColor(c,{shadow=false}={}){
 const {L,C,h}=lch(c.rgb);
 if(shadow&&L<.4){/* drop shadows: same darkness, much softer */return fmt([40,32,22],Math.max(.04,Math.min(.16,c.a*.32)))}
 if(C<.04){/* neutral */const nL=curve(L);return fmt(fromLch(nL,nL>.6?WARM_C:WARM_C*.6,WARM_H),c.a)}
 /* chromatic: dark tinted surfaces become pale tints; bright accents darken enough to read on paper */
 let nL,nC=C;
 if(L<.42){nL=curve(L);nC=Math.min(C*.55,.05)}
 else if(L>.62){nL=Math.max(.52,Math.min(.62,1.12-L));nC=Math.min(C*1.05,.2)}
 else nL=L;
 return fmt(fromLch(nL,nC,h),c.a)}

const COLOR_TOKEN=/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function mapValue(value,opts){
 // never touch url(...) payloads (inline SVG data URIs carry their own colours)
 return value.split(/(url\((?:[^()]|\([^)]*\))*\))/i).map((part,i)=>i%2?part:part.replace(COLOR_TOKEN,tok=>{const c=parseColor(tok);return c?mapColor(c,opts):tok})).join('')}
const colorsIn=v=>[...v.replace(/url\([^)]*\)/gi,'').matchAll(COLOR_TOKEN)].map(m=>parseColor(m[0])).filter(Boolean);
const isAccentSurface=c=>{if(c.a<.6)return false;const {L,C}=lch(c.rgb);return C>=.09&&L>=.35&&L<=.82};

/* ---------- tiny CSS parser: rules, @media/@supports/@container/@layer blocks ---------- */
function stripComments(css){return css.replace(/\/\*[\s\S]*?\*\//g,'')}
function findClose(s,i){let d=0,q=null;for(;i<s.length;i++){const ch=s[i];if(q){if(ch==='\\'){i++;continue}if(ch===q)q=null;continue}if(ch==='"'||ch==="'"){q=ch;continue}if(ch==='{')d++;else if(ch==='}'){d--;if(d===0)return i}}return s.length}
function parseBlock(css){const out=[];let i=0;
 while(i<css.length){const open=css.indexOf('{',i);if(open<0)break;
  const semi=css.indexOf(';',i);
  if(semi>=0&&semi<open&&css.slice(i,semi).trim().startsWith('@')){i=semi+1;continue} // @import / @charset
  const prelude=css.slice(i,open).trim(),close=findClose(css,open),body=css.slice(open+1,close);i=close+1;
  if(prelude.startsWith('@')){if(/^@(media|supports|container|layer)\b/i.test(prelude))out.push({at:prelude,children:parseBlock(body)});continue}
  out.push({sel:prelude,decls:splitDecls(body)})}
 return out}
function splitDecls(body){const out=[];let depth=0,q=null,start=0;
 const push=end=>{const d=body.slice(start,end).trim();start=end+1;if(!d)return;const k=d.indexOf(':');if(k<0)return;const prop=d.slice(0,k).trim();let val=d.slice(k+1).trim(),imp='';const m=val.match(/\s*!important$/i);if(m){imp=' !important';val=val.slice(0,m.index)}out.push({prop,val,imp})};
 for(let i=0;i<body.length;i++){const ch=body[i];if(q){if(ch===q)q=null;continue}if(ch==='"'||ch==="'")q=ch;else if(ch==='(')depth++;else if(ch===')')depth--;else if(ch===';'&&depth===0)push(i)}push(body.length);return out}
function splitSelectors(sel){const out=[];let d=0,s=0;for(let i=0;i<sel.length;i++){const ch=sel[i];if(ch==='('||ch==='[')d++;else if(ch===')'||ch===']')d--;else if(ch===','&&d===0){out.push(sel.slice(s,i).trim());s=i+1}}out.push(sel.slice(s).trim());return out.filter(Boolean)}
function scopeSelector(sel){return splitSelectors(sel).map(s=>{
 if(/^:root\b/.test(s))return s.replace(/^:root/,SCOPE);
 if(/^html\b/.test(s))return s.replace(/^html/,`html[data-theme="light"]`);
 return `${SCOPE} ${s}`}).join(',')}

/* ---------- build ---------- */
export function build(){
 const sheets=SOURCES.map(f=>({f,tree:parseBlock(stripComments(readFileSync(path.join(root,f),'utf8')))}));
 // resolve custom properties defined on :root so var(--x) backgrounds can be classified
 const vars={};const collect=nodes=>{for(const n of nodes){if(n.children){collect(n.children);continue}if(/^:root\b|^html\b/.test(n.sel))for(const d of n.decls)if(d.prop.startsWith('--'))vars[d.prop]=d.val}};
 sheets.forEach(s=>collect(s.tree));
 const resolve=v=>v.replace(/var\((--[\w-]+)[^)]*\)/g,(m,n)=>vars[n]??m);
 const emit=nodes=>{let css='';
  for(const n of nodes){
   if(n.children){const inner=emit(n.children);if(inner)css+=`${n.at}{\n${inner}}\n`;continue}
   const keep=KEEP.test(n.sel); // video overlays & thumbnails: re-asserted unchanged so the cascade order holds
   // Every colour-ish declaration is re-emitted (var()/none/transparent too, unchanged) because the scoped
   // copies carry extra specificity: skipping one would let an earlier scoped rule beat a later original.
   const colourDecls=n.decls.filter(d=>COLOR_PROPS.test(d.prop)&&!(d.prop.startsWith('--')&&!colorsIn(d.val).length));
   if(!colourDecls.length)continue;
   const accent=n.decls.some(d=>BG_PROPS.test(d.prop)&&colorsIn(resolve(d.val)).some(isAccentSurface));
   const lines=colourDecls.map(d=>{
    if(keep)return `${d.prop}:${d.val}${d.imp}`;
    if(d.prop==='color-scheme')return `${d.prop}:light${d.imp}`;
    const shadow=SHADOW_PROPS.test(d.prop)||d.prop.startsWith('--')&&(/shadow/i.test(d.prop)||/-?\d+px\s+-?\d+px/.test(d.val));
    // on a saturated surface (primary buttons, avatars, coloured chips) keep fill + label as designed
    if(accent&&!shadow&&!d.prop.startsWith('--'))return `${d.prop}:${d.val}${d.imp}`;
    return `${d.prop}:${mapValue(d.val,{shadow})}${d.imp}`});
   css+=`${scopeSelector(n.sel)}{${lines.join(';')}}\n`}
  return css};
 let out=`/* GENERATED by scripts/build-light-theme.mjs from ${SOURCES.join(', ')}. Do not edit by hand;\n   put hand-tuned overrides in theme.css and re-run the script after changing dark styles. */\n`;
 for(const s of sheets){const body=emit(s.tree);if(body)out+=`/* ---- ${s.f} ---- */\n${body}`}
 return out}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const css=build(),target=path.join(root,OUTPUT);
 if(process.argv.includes('--check')){const cur=existsSync(target)?readFileSync(target,'utf8'):'';if(cur!==css){console.error(`${OUTPUT} is out of date: run node scripts/build-light-theme.mjs`);process.exit(1)}console.log(`${OUTPUT} is up to date`)}
 else{writeFileSync(target,css);console.log(`wrote ${OUTPUT} (${(css.length/1024).toFixed(1)} KB)`)}
}
