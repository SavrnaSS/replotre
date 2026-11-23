import {randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
import '../templates-catalog.js';
const scrypt=promisify(scryptCb);
export const uuid=()=>randomUUID();
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export const randomToken=()=>randomBytes(32).toString('base64url');
export const emailValid=e=>typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const safeName=(s,limit=120)=>String(s||'').normalize('NFC').replace(/[\x00-\x1f\x7f<>"\\/]/g,'').trim().slice(0,limit)||'Untitled';
export async function hashPassword(password,salt=randomBytes(24).toString('base64url')){const hash=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});return {salt,hash:hash.toString('base64url')}}
export async function verifyPassword(password,salt,hash){const actual=await scrypt(password,salt,64,{N:16384,r:8,p:1,maxmem:32*1024*1024});const stored=Buffer.from(hash,'base64url');return stored.length===actual.length&&timingSafeEqual(actual,stored)}
export class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
export const err=(status,msg)=>{throw new ApiError(status,msg)};
export const now=()=>Date.now();
export const json=(res,status,data,headers={})=>{const buf=Buffer.from(JSON.stringify(data));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':buf.length,'Cache-Control':'no-store',...headers});res.end(buf)};
export async function bodyJSON(req,max=300_000){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>max)err(413,'Request body too large');chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}catch{err(400,'Invalid JSON')}}
export const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function validateProject(data){
 if(!data||typeof data!=='object'||Array.isArray(data))err(400,'Invalid project data');
 const encoded=JSON.stringify(data);if(encoded.length>260_000)err(413,'Project is too large');
 if(typeof data.projectName!=='string'||data.projectName.length>120)err(400,'Invalid project name');
 if(!['9:16','16:9','1:1','4:5'].includes(data.aspect))err(400,'Invalid project aspect');
 if(!Array.isArray(data.clips)||data.clips.length>120||!Array.isArray(data.texts)||data.texts.length>300)err(400,'Invalid timeline');
 const ids=new Set();
 for(const c of data.clips){if(!c||typeof c.id!=='string'||!c.id||c.id.length>100||ids.has(c.id)||!['demo','video','image'].includes(c.kind)||(!finite(c.in,0,3600))||!finite(c.out,0,3600)||c.out<=c.in||!finite(c.speed,.25,3))err(400,'Invalid clip');ids.add(c.id);if(c.kind!=='demo'&&(!c.mediaId||typeof c.mediaId!=='string'||c.mediaId.length>100))err(400,'Clip missing media');if(c.volume!==undefined&&!finite(c.volume,0,1)||c.brightness!==undefined&&!finite(c.brightness,50,150)||c.saturation!==undefined&&!finite(c.saturation,0,200)||c.warmth!==undefined&&!finite(c.warmth,-100,100)||c.vignette!==undefined&&!finite(c.vignette,0,100)||c.blur!==undefined&&!finite(c.blur,0,100))err(400,'Invalid clip adjustment');if(c.contrast!==undefined&&!finite(c.contrast,50,150)||c.zoom!==undefined&&!finite(c.zoom,1,3)||c.panX!==undefined&&!finite(c.panX,-1,1)||c.panY!==undefined&&!finite(c.panY,-1,1)||c.fadeIn!==undefined&&!finite(c.fadeIn,0,10)||c.fadeOut!==undefined&&!finite(c.fadeOut,0,10)||c.fit!==undefined&&!['fill','fit'].includes(c.fit)||c.flipH!==undefined&&typeof c.flipH!=='boolean'||c.look!==undefined&&(typeof c.look!=='string'||c.look.length>24)||c.xfade!==undefined&&!finite(c.xfade,0,3)||c.keys!==undefined&&(!Array.isArray(c.keys)||c.keys.length>30||c.keys.some(k=>!k||!finite(k.t,0,3600)||!finite(k.zoom,1,3)||!finite(k.panX,-1,1)||!finite(k.panY,-1,1))))err(400,'Invalid clip framing or fade');}
 for(const t of data.texts){if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||ids.has(t.id)||typeof t.text!=='string'||t.text.length>500||!finite(t.start,0,3600)||!finite(t.duration,.1,3600)||!['top','center','bottom'].includes(t.position)||typeof t.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(t.color))err(400,'Invalid text layer');ids.add(t.id);if(t.fontSize!==undefined&&!finite(t.fontSize,12,140)||t.fontWeight!==undefined&&!finite(t.fontWeight,100,900))err(400,'Invalid text style');if(t.x!==undefined&&!finite(t.x,0,1)||t.y!==undefined&&!finite(t.y,0,1))err(400,'Invalid text position');if(t.bg!==undefined&&!['none','box'].includes(t.bg)||t.anim!==undefined&&!['fade','slide','none'].includes(t.anim)||t.cutIn!==undefined&&typeof t.cutIn!=='boolean'||t.cutOut!==undefined&&typeof t.cutOut!=='boolean'||t.bgColor!==undefined&&(typeof t.bgColor!=='string'||!/^#[0-9a-fA-F]{6}$/.test(t.bgColor)))err(400,'Invalid text style')}
 if(data.music&&(!data.music.mediaId||typeof data.music.mediaId!=='string'||!finite(data.music.volume,0,1)))err(400,'Invalid music track');
 if(data.music?.start!==undefined&&!finite(data.music.start,0,3600))err(400,'Invalid music start');
 if(data.music&&(data.music.fadeIn!==undefined&&!finite(data.music.fadeIn,0,30)||data.music.fadeOut!==undefined&&!finite(data.music.fadeOut,0,30)))err(400,'Invalid music fade');
 if(data.markers!==undefined&&(!Array.isArray(data.markers)||data.markers.length>200||data.markers.some(m=>!m||typeof m.id!=='string'||m.id.length>100||!finite(m.t,0,3600))))err(400,'Invalid markers');
 if(data.script!==undefined&&(typeof data.script!=='string'||data.script.length>100000))err(400,'Invalid script');
 if(data.template!==undefined&&data.template!==null){const t=globalThis.ReplotreTemplateCatalog.sanitize(data.template);if(!t)err(400,'Invalid template');data.template=t}
 return data;
}
export function publicUser(u){return {id:u.id,email:u.email,createdAt:u.created_at}}
