/** Accounts: onboarding profile, plans, entitlements and Whop billing. */
import {createHmac,timingSafeEqual} from 'node:crypto';
import {json,bodyJSON,err,now,uuid} from './core.mjs';
// Setup is finished only when the answers the steps ask for are present (role and default frame).
export const setupMissing=d=>[!d?.role&&'role',!d?.aspect&&'aspect'].filter(Boolean);

/* ---------- Plans ----------
   Every limit listed here is enforced by the server (AI requests, storage, upload size, export resolution, render length).
   Prices are display values; the Whop plans (env WHOP_PLAN_*) are what customers are actually charged. */
export const PLANS=[
 // Internal "no subscription" state: not offered for sale and gives no studio access (see subscribed()).
 {id:'free',name:'No plan',tagline:'Subscribe to open the studio',price:{month:0,year:0},internal:true,
  limits:{aiDaily:0,storageGB:0,maxFileMB:0,maxExport:0,renderMinutes:0,projects:0},
  features:[]},
 {id:'creator',name:'Creator',tagline:'For weekly creators',price:{month:12,year:115},popular:true,
  limits:{aiDaily:100,storageGB:50,maxFileMB:2048,maxExport:1080,renderMinutes:5,projects:100},
  features:['1080p MP4 export','100 AI requests a day','50 GB cloud storage','2 GB uploads','AI-fitted templates and Design with AI','Speech-synced captions']},
 {id:'pro',name:'Pro',tagline:'For editors on deadline',price:{month:29,year:278},
  limits:{aiDaily:400,storageGB:250,maxFileMB:4096,maxExport:1080,renderMinutes:5,projects:1000},
  features:['Everything in Creator','400 AI requests a day','250 GB cloud storage','4 GB uploads','Unlimited projects (up to 1,000)']}
];
const PLAN_IDS=PLANS.filter(p=>!p.internal).map(p=>p.id);
export const subscribed=(db,userId)=>effectivePlan(db,userId).id!=='free';
export const planById=id=>PLANS.find(p=>p.id===id)||PLANS[0];
const ACTIVE=new Set(['active','trialing','past_due']);

/* ---------- Onboarding profile ---------- */
export const PROFILE_OPTIONS={
 role:['creator','social','agency','freelance','business','hobbyist','student','other'],
 goals:['shorts','youtube','ads','podcast','tutorial','realestate','events','brand'],
 platforms:['tiktok','reels','shorts','youtube','linkedin','x'],
 experience:['new','some','pro'],
 team:['solo','small','mid','large'],
 aspect:['9:16','16:9','1:1','4:5'],
 captionStyle:['box','karaoke','script','minimal'],
 cadence:['daily','weekly','monthly','occasional']
};

export function initAccountSchema(db){db.exec(`
CREATE TABLE IF NOT EXISTS user_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data_json TEXT NOT NULL,step INTEGER NOT NULL DEFAULT 0,onboarded_at INTEGER,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS subscriptions(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,plan TEXT NOT NULL,status TEXT NOT NULL,interval TEXT,provider TEXT NOT NULL,customer_id TEXT,subscription_id TEXT,current_period_end INTEGER,cancel_at_period_end INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_subscriptions_sub ON subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE TABLE IF NOT EXISTS billing_events(id TEXT PRIMARY KEY,type TEXT NOT NULL,created_at INTEGER NOT NULL);
`)}

function cleanProfile(input,prev={}){
 const b=input&&typeof input==='object'&&!Array.isArray(input)?input:{},out={...prev};
 const one=(k)=>{if(b[k]!==undefined){if(b[k]===null||b[k]==='')delete out[k];else if(PROFILE_OPTIONS[k].includes(b[k]))out[k]=b[k];else err(400,`Invalid ${k}`)}};
 const many=(k,max)=>{if(b[k]!==undefined){if(!Array.isArray(b[k])||b[k].length>max||b[k].some(v=>!PROFILE_OPTIONS[k].includes(v)))err(400,`Invalid ${k}`);out[k]=[...new Set(b[k])]}};
 for(const k of ['role','experience','team','aspect','captionStyle','cadence'])one(k);
 many('goals',8);many('platforms',6);
 if(b.name!==undefined){const n=String(b.name||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,60);if(n)out.name=n;else delete out.name}
 if(b.roleOther!==undefined){const n=String(b.roleOther||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,60);if(n)out.roleOther=n;else delete out.roleOther}
 if(b.favoriteTemplates!==undefined){if(!Array.isArray(b.favoriteTemplates)||b.favoriteTemplates.length>6)err(400,'Invalid templates');out.favoriteTemplates=b.favoriteTemplates.map(v=>String(v).slice(0,40)).filter(v=>/^[a-z0-9-]+$/.test(v))}
 return out;
}

/* ---------- Subscription state ---------- */
export function subscriptionRow(db,userId){return db.prepare('SELECT * FROM subscriptions WHERE user_id=?').get(userId)||null}
export function effectivePlan(db,userId){const s=subscriptionRow(db,userId);if(!s||!ACTIVE.has(s.status))return planById('free');if(s.current_period_end&&s.current_period_end<now()-3*86400000)return planById('free');return planById(s.plan)}
export function entitlements(db,userId){const plan=effectivePlan(db,userId);return {plan:plan.id,...plan.limits,maxFileBytes:plan.limits.maxFileMB*1024*1024,maxStorageBytes:plan.limits.storageGB*1024**3}}
function upsertSubscription(db,userId,fields){const prev=subscriptionRow(db,userId)||{};const row={plan:'free',status:'inactive',interval:null,provider:'none',customer_id:null,subscription_id:null,current_period_end:null,cancel_at_period_end:0,...prev,...fields,updated_at:now()};
 db.prepare(`INSERT INTO subscriptions(user_id,plan,status,interval,provider,customer_id,subscription_id,current_period_end,cancel_at_period_end,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,status=excluded.status,interval=excluded.interval,provider=excluded.provider,customer_id=excluded.customer_id,subscription_id=excluded.subscription_id,current_period_end=excluded.current_period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=excluded.updated_at`)
  .run(userId,row.plan,row.status,row.interval,row.provider,row.customer_id,row.subscription_id,row.current_period_end,row.cancel_at_period_end?1:0,row.updated_at);return row}

/* ---------- Billing mode (Whop) ----------
   whop: WHOP_API_KEY set. test: non-production without a key (plans switch instantly, nothing charged). off: otherwise. */
const production=()=>process.env.NODE_ENV==='production';
export function billingMode(){if(process.env.WHOP_API_KEY)return 'whop';if(!production()&&process.env.BILLING_TEST_MODE!=='false')return 'test';return 'off'}
const whopBase=()=>(process.env.WHOP_API_BASE||'https://api.whop.com/api/v1').replace(/\/+$/,'');
const variantEnv=(plan,interval)=>process.env[`WHOP_PLAN_${plan.toUpperCase()}_${interval==='year'?'YEARLY':'MONTHLY'}`]||'';
function planFromVariant(variantId){for(const p of PLANS)for(const i of ['month','year'])if(variantId&&variantEnv(p.id,i)===variantId)return {plan:p.id,interval:i};return null}

async function whop(method,path,body,{idempotencyKey}={}){
 const r=await fetch(`${whopBase()}${path}`,{method,headers:{Authorization:`Bearer ${process.env.WHOP_API_KEY}`,'Content-Type':'application/json','Api-Version-Date':'2026-11-20',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const d=await r.json().catch(()=>({}));if(!r.ok){console.warn('Whop error',r.status,d?.error?.message||'');err(502,'Payments are unavailable right now. Try again shortly.')}return d}

/** Whop signs `{webhook-id}.{webhook-timestamp}.{raw body}` with HMAC-SHA256 (Standard Webhooks), header `webhook-signature: v1,<base64>`.
    The `ws_` secret is accepted as raw UTF-8 bytes and as base64 after the prefix, the two key derivations Standard Webhooks tooling uses. */
export function verifyWhopSignature(raw,headers,secret,tolerance=300){
 const id=headers['webhook-id'],ts=Number(headers['webhook-timestamp']),sigHeader=String(headers['webhook-signature']||'');
 if(!id||!ts||!secret||Math.abs(Date.now()/1000-ts)>tolerance)return false;
 const given=sigHeader.split(' ').map(x=>x.trim()).filter(x=>x.startsWith('v1,')).map(x=>x.slice(3));if(!given.length)return false;
 const keys=[Buffer.from(secret,'utf8')];const rest=secret.replace(/^(ws_|whsec_)/,'');try{const b=Buffer.from(rest,'base64');if(b.length>=16)keys.push(b)}catch{}
 const payload=`${id}.${ts}.${raw}`;
 return keys.some(k=>{const expected=createHmac('sha256',k).update(payload).digest('base64');return given.some(g=>g.length===expected.length&&timingSafeEqual(Buffer.from(g),Buffer.from(expected)))});
}
const toMs=v=>v==null?null:typeof v==='number'?(v<1e12?v*1000:v):Number.isFinite(Date.parse(v))?Date.parse(v):null;
/** Apply a Whop membership to the matching user. Users are matched by our metadata.user_id, then by a stored membership or Whop user id. */
function syncWhopMembership(db,m,userHint){
 if(!m?.id)return null;
 const userId=userHint||m.metadata?.user_id||db.prepare('SELECT user_id FROM subscriptions WHERE subscription_id=? OR (customer_id IS NOT NULL AND customer_id=?)').get(m.id,m.user_id||'')?.user_id;
 if(!userId||!db.prepare('SELECT 1 FROM users WHERE id=?').get(userId))return null;
 const mapped=planFromVariant(m.variant_id||m.plan_id||m.plan?.id);
 const status={trialing:'trialing',active:'active',past_due:'past_due',completed:'canceled',canceled:'canceled',expired:'canceled',unresolved:'past_due'}[m.status]||'inactive';
 const prev=subscriptionRow(db,userId);
 // A different, older membership must not overwrite the one the user is on now.
 if(prev?.provider==='whop'&&prev.subscription_id&&prev.subscription_id!==m.id&&ACTIVE.has(prev.status)&&!ACTIVE.has(status))return userId;
 upsertSubscription(db,userId,{plan:mapped?.plan||prev?.plan||'free',interval:mapped?.interval||null,status,provider:'whop',customer_id:m.user_id||prev?.customer_id||null,subscription_id:m.id,current_period_end:toMs(m.current_period_end??m.renewal_period_end),cancel_at_period_end:!!m.cancel_at_period_end});
 return userId}

/* ---------- Public account view ---------- */
export function accountView(db,user){
 const prof=db.prepare('SELECT * FROM user_profiles WHERE user_id=?').get(user.id),sub=subscriptionRow(db,user.id),plan=effectivePlan(db,user.id),ent=entitlements(db,user.id);
 const day=now()-86400000,month=now()-30*86400000;
 return {user:{id:user.id,email:user.email,createdAt:user.created_at},
  profile:prof?(()=>{const d=JSON.parse(prof.data_json),missing=setupMissing(d);return {...d,step:prof.step,onboardedAt:missing.length?null:prof.onboarded_at,setupMissing:missing}})():{step:0,onboardedAt:null,setupMissing:setupMissing({})},
  plan:{id:plan.id,name:plan.name},subscribed:plan.id!=='free',
  subscription:sub?{plan:sub.plan,status:sub.status,interval:sub.interval,provider:sub.provider,currentPeriodEnd:sub.current_period_end,cancelAtPeriodEnd:!!sub.cancel_at_period_end}:null,
  entitlements:ent,
  usage:{aiToday:db.prepare('SELECT COUNT(*) n FROM ai_usage WHERE user_id=? AND created_at>?').get(user.id,day).n,
   storageBytes:db.prepare('SELECT COALESCE(SUM(size),0) n FROM assets WHERE user_id=?').get(user.id).n,
   rendersMonth:db.prepare("SELECT COUNT(*) n FROM renders WHERE user_id=? AND created_at>? AND status='completed'").get(user.id,month).n,
   projects:db.prepare('SELECT COUNT(*) n FROM projects WHERE user_id=?').get(user.id).n},
  billing:{mode:billingMode()}};
}

async function rawBody(req,max=1_000_000){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>max)err(413,'Payload too large');chunks.push(c)}return Buffer.concat(chunks).toString('utf8')}

/** Handles /api/account and /api/billing routes. Returns true when the request was handled. */
/** Handles /api/account and /api/billing routes. Returns true when the request was handled. */
export async function accountRoutes({req,res,pathname,method,db,authorized,origin,rate}){
 if(pathname==='/api/billing/plans'&&method==='GET'){
  const mode=billingMode();return json(res,200,{mode,provider:mode==='whop'?'whop':null,plans:PLANS.filter(p=>!p.internal).map(p=>({...p,purchasable:{month:mode==='test'||!!variantEnv(p.id,'month'),year:mode==='test'||!!variantEnv(p.id,'year')}})),options:PROFILE_OPTIONS}),true;
 }
 if(pathname==='/api/billing/webhook'&&method==='POST'){
  const secret=process.env.WHOP_WEBHOOK_SECRET;if(!secret)err(404,'Endpoint not found');
  const raw=await rawBody(req);if(!verifyWhopSignature(raw,req.headers,secret)){console.warn('[billing] Whop webhook signature rejected',{id:String(req.headers['webhook-id']||'').slice(0,40),hasSignature:!!req.headers['webhook-signature'],timestampSkewSec:Math.round(Date.now()/1000-Number(req.headers['webhook-timestamp']||0))});err(400,'Invalid signature')}
  const msgId=String(req.headers['webhook-id']).slice(0,120);
  if(db.prepare('SELECT 1 FROM billing_events WHERE id=?').get(msgId))return json(res,200,{received:true,duplicate:true}),true;
  const event=JSON.parse(raw),type=String(event.type||''),data=event.data||{};
  if(type.startsWith('membership.')){
   // Delivery order is not guaranteed: read the membership's current state when the API is available.
   let m=data;if(process.env.WHOP_API_KEY&&data.id){try{m={...data,...await whop('GET',`/memberships/${data.id}`)}}catch{m=data}}
   syncWhopMembership(db,m);
  }else if(type==='payment.succeeded'||type==='payment.failed'){
   const memId=data.membership_id||data.membership?.id;
   if(memId&&process.env.WHOP_API_KEY){try{syncWhopMembership(db,await whop('GET',`/memberships/${memId}`),data.metadata?.user_id)}catch{}}
   else if(type==='payment.failed'&&memId){const row=db.prepare('SELECT user_id FROM subscriptions WHERE subscription_id=?').get(memId);if(row)upsertSubscription(db,row.user_id,{status:'past_due'})}
  }
  db.prepare('INSERT INTO billing_events(id,type,created_at) VALUES(?,?,?)').run(msgId,type.slice(0,80),now());
  return json(res,200,{received:true}),true;
 }
 if(!pathname.startsWith('/api/account')&&!pathname.startsWith('/api/billing/'))return false;
 const user=authorized(req);
 if(pathname==='/api/account'&&method==='GET')return json(res,200,accountView(db,user)),true;
 if(pathname==='/api/account/profile'&&method==='PUT'){
  rate(`profile:${user.id}`,120,60000);const b=await bodyJSON(req,6000);const row=db.prepare('SELECT * FROM user_profiles WHERE user_id=?').get(user.id);
  const data=cleanProfile(b.profile,row?JSON.parse(row.data_json):{}),step=Math.max(row?.step||0,Math.min(20,Math.max(0,Number.isInteger(b.step)?b.step:0)));
  if(b.complete===true&&setupMissing(data).length)err(400,'Finish setup first: '+setupMissing(data).join(', '));
  const done=b.complete===true?(row?.onboarded_at||now()):(row?.onboarded_at||null);
  db.prepare(`INSERT INTO user_profiles(user_id,data_json,step,onboarded_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data_json=excluded.data_json,step=excluded.step,onboarded_at=excluded.onboarded_at,updated_at=excluded.updated_at`).run(user.id,JSON.stringify(data),step,done,now());
  return json(res,200,accountView(db,user)),true;
 }
 if(pathname==='/api/billing/checkout'&&method==='POST'){
  rate(`checkout:${user.id}`,20,3600000);const b=await bodyJSON(req,2000),planId=String(b.plan||''),interval=b.interval==='year'?'year':'month';
  if(!PLAN_IDS.includes(planId))err(400,'Unknown plan');const mode=billingMode(),existing=subscriptionRow(db,user.id);
  const paidWhop=existing?.provider==='whop'&&ACTIVE.has(existing.status)&&existing.plan!=='free';
  if(paidWhop)err(409,'To switch plans, cancel your current plan in Billing, then choose the new one when it ends.');
  if(mode==='test'){upsertSubscription(db,user.id,{plan:planId,interval,status:'active',provider:'test',current_period_end:now()+(interval==='year'?365:30)*86400000,cancel_at_period_end:0});return json(res,200,{account:accountView(db,user),test:true}),true}
  if(mode!=='whop')err(503,'Payments are not configured on this server');
  const variant=variantEnv(planId,interval);if(!variant)err(503,`The ${planById(planId).name} ${interval}ly plan is not configured`);
  // Whop only accepts https return URLs; on http (local development) the buyer finishes on Whop and the app detects the membership.
  const redirects=origin.startsWith('https://');
  const conf=await whop('POST','/checkout_configurations',{...(process.env.WHOP_ACCOUNT_ID?{account_id:process.env.WHOP_ACCOUNT_ID}:{}),variant_id:variant,metadata:{user_id:user.id,plan:planId,interval},...(redirects?{redirect_url:`${origin}/studio?billing=success`}:{})},{idempotencyKey:`checkout-${user.id}-${variant}-${Math.floor(now()/600000)}`});
  if(!conf.purchase_url)err(502,'Payments returned no checkout link. Try again.');
  return json(res,200,{url:conf.purchase_url,redirects}),true;
 }
 if(pathname==='/api/billing/portal'&&method==='POST'){
  const s=subscriptionRow(db,user.id);if(billingMode()!=='whop'||s?.provider!=='whop'||!s.subscription_id)err(409,'No Whop membership yet');
  const m=await whop('GET',`/memberships/${s.subscription_id}`);if(!m.manage_url)err(502,'Whop did not return a billing link');
  syncWhopMembership(db,m,user.id);return json(res,200,{url:m.manage_url}),true;
 }
 if(pathname==='/api/billing/cancel'&&method==='POST'){
  const b=await bodyJSON(req,500),resume=b.resume===true,s=subscriptionRow(db,user.id);if(!s||!ACTIVE.has(s.status)||s.plan==='free')err(409,'No active paid plan');
  if(s.provider==='whop'){const m=resume?await whop('PATCH',`/memberships/${s.subscription_id}`,{cancel_at_period_end:false}):await whop('POST',`/memberships/${s.subscription_id}/cancel`,{cancel_at_period_end:true});syncWhopMembership(db,{...m,id:m.id||s.subscription_id},user.id)}
  else upsertSubscription(db,user.id,{cancel_at_period_end:!resume});
  return json(res,200,{account:accountView(db,user)}),true;
 }
 if(pathname==='/api/billing/refresh'&&method==='POST'){
  // Pull the current membership state (used after returning from checkout and from the Billing tab).
  const s=subscriptionRow(db,user.id);
  if(billingMode()==='whop'){try{
   if(s?.provider==='whop'&&s.subscription_id)syncWhopMembership(db,await whop('GET',`/memberships/${s.subscription_id}`),user.id);
   else{ // No membership on file yet (webhook not arrived or not configured): find the newest one carrying our user id.
    const q=new URLSearchParams({first:'50',...(process.env.WHOP_ACCOUNT_ID?{company_id:process.env.WHOP_ACCOUNT_ID}:{})});const list=await whop('GET',`/memberships?${q}`);
    const mine=(list.data||[]).filter(m=>m?.metadata?.user_id===user.id).sort((a,b)=>toMs(b.created_at)-toMs(a.created_at));
    const best=mine.find(m=>['active','trialing','past_due'].includes(m.status))||mine[0];if(best)syncWhopMembership(db,best,user.id)}
  }catch{}}
  return json(res,200,{account:accountView(db,user)}),true;
 }
 err(404,'Endpoint not found');
}
export const _test={cleanProfile,upsertSubscription,planFromVariant,syncWhopMembership};
