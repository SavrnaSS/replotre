import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {createHmac,randomUUID} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {verifyWhopSignature,PLANS} from '../src/account.mjs';

const root=path.resolve(import.meta.dirname,'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p))})});
// Standard Webhooks, as used by Whop: base64 HMAC-SHA256 of `${id}.${timestamp}.${body}`.
const whopHeaders=(raw,secret,{id='msg_'+randomUUID(),t=Math.floor(Date.now()/1000),keyBytes=Buffer.from(secret,'utf8')}={})=>({'webhook-id':id,'webhook-timestamp':String(t),'webhook-signature':`v1,${createHmac('sha256',keyBytes).update(`${id}.${t}.${raw}`).digest('base64')}`});

test('Whop webhook signatures: valid accepted; tampered, stale, foreign and malformed rejected',()=>{
 const raw='{"type":"membership.updated"}',secret='ws_'+Buffer.from('a-sufficiently-long-test-secret').toString('base64');
 assert.equal(verifyWhopSignature(raw,whopHeaders(raw,secret),secret),true,'raw ws_ secret bytes');
 assert.equal(verifyWhopSignature(raw,whopHeaders(raw,secret,{keyBytes:Buffer.from(secret.slice(3),'base64')}),secret),true,'base64 key after the prefix');
 assert.equal(verifyWhopSignature(raw+' ',whopHeaders(raw,secret),secret),false);
 assert.equal(verifyWhopSignature(raw,whopHeaders(raw,'ws_other-secret-value'),secret),false);
 assert.equal(verifyWhopSignature(raw,whopHeaders(raw,secret,{t:Math.floor(Date.now()/1000)-3600}),secret),false);
 assert.equal(verifyWhopSignature(raw,{'webhook-id':'msg_1','webhook-timestamp':String(Math.floor(Date.now()/1000)),'webhook-signature':'v2,abc'},secret),false);
 assert.equal(verifyWhopSignature(raw,{},secret),false);
 assert.ok(PLANS.filter(p=>!p.internal).every(p=>p.limits.aiDaily>0&&p.features.length),'every sold plan has limits and features');assert.equal(PLANS.find(p=>p.id==='free').limits.projects,0,'no-plan state gives no studio access');
});

test('onboarding profile, plan limits, test-mode subscriptions and Whop webhooks',{timeout:60000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-acct-')),port=await freePort(),base=`http://127.0.0.1:${port}`,secret='ws_'+randomUUID().replace(/-/g,'');
 const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dir,PORT:String(port),APP_ORIGIN:base,NODE_ENV:'test',ALLOW_SIGNUP:'true',SIGNUP_INVITE_CODE:'',WHOP_API_KEY:'',WHOP_WEBHOOK_SECRET:secret,WHOP_PLAN_PRO_MONTHLY:'plan_pro_m',BILLING_TEST_MODE:'',STUDIO_FREE_ACCESS_EMAILS:' vip@example.org ,other@example.org',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},stdio:'ignore'});
 t.after(async()=>{server.kill('SIGTERM');await wait(300);await rm(dir,{recursive:true,force:true})});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/healthz')).ok)break}catch{}await wait(100)}
 let cookie='';
 const call=async(route,{method='GET',body}={})=>{const r=await fetch(base+route,{method,headers:{'X-Replotre-Client':'studio','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch{}return {status:r.status,json:j,headers:r.headers}};
 const reg=await call('/api/auth/register',{method:'POST',body:{email:`ob-${randomUUID().slice(0,8)}@example.org`,password:'A-long-enough-password-1'}});assert.equal(reg.status,200);cookie=reg.headers.get('set-cookie').split(';')[0];
 const userId=reg.json.user.id;

 // Fresh account: no subscription, not onboarded
 let acct=await call('/api/account');assert.equal(acct.status,200);assert.equal(acct.json.plan.id,'free');assert.equal(acct.json.subscribed,false);assert.equal(acct.json.profile.onboardedAt,null);assert.equal(acct.json.billing.mode,'test');
 const plans=await call('/api/billing/plans');assert.deepEqual(plans.json.plans.map(p=>p.id),['creator','pro'],'no free plan for sale');

 // Setup can't be finished while required answers are missing
 let early=await call('/api/account/profile',{method:'PUT',body:{profile:{},step:6,complete:true}});assert.equal(early.status,400);assert.match(early.json.error,/role, aspect/);
 acct=await call('/api/account');assert.deepEqual(acct.json.profile.setupMissing,['role','aspect']);assert.equal(acct.json.profile.onboardedAt,null);

 // Profile validation and resume
 assert.equal((await call('/api/account/profile',{method:'PUT',body:{profile:{role:'wizard'}}})).status,400);
 assert.equal((await call('/api/account/profile',{method:'PUT',body:{profile:{goals:['shorts','nope']}}})).status,400);
 acct=await call('/api/account/profile',{method:'PUT',body:{profile:{name:'  Sam <b> ',role:'freelance',goals:['shorts','ads','shorts']},step:2}});
 assert.equal(acct.status,200);assert.equal(acct.json.profile.name,'Sam b');assert.deepEqual(acct.json.profile.goals,['shorts','ads']);assert.equal(acct.json.profile.step,2);
 acct=await call('/api/account/profile',{method:'PUT',body:{profile:{aspect:'9:16'},step:1}});assert.equal(acct.json.profile.step,2,'step never moves backwards');assert.equal(acct.json.profile.role,'freelance','earlier answers kept');
 acct=await call('/api/account/profile',{method:'PUT',body:{profile:{},step:6,complete:true}});assert.ok(acct.json.profile.onboardedAt);

 // Without a subscription every studio API answers 402 'subscription' (account and billing stay open)
 const pdata={projectName:'Limits',aspect:'9:16',clips:[],texts:[],music:null,brandColor:'#e2ab77',brandFont:'Georgia',script:''};
 for(const [m,r] of [['POST','/api/projects'],['GET','/api/projects'],['GET','/api/usage'],['GET','/api/workspace']]){const g=await call(r,{method:m,body:m==='POST'?{data:pdata}:undefined});assert.equal(g.status,402,r);assert.equal(g.json.feature,'subscription',r)}
 assert.equal((await call('/api/account')).status,200);assert.equal((await call('/api/billing/plans')).status,200);

 // Test-mode checkout subscribes instantly and opens the studio APIs; cancel/resume
 const up=await call('/api/billing/checkout',{method:'POST',body:{plan:'creator',interval:'year'}});assert.equal(up.status,200);assert.equal(up.json.test,true);assert.equal(up.json.account.plan.id,'creator');assert.equal(up.json.account.entitlements.maxExport,1080);assert.equal(up.json.account.subscription.interval,'year');assert.equal(up.json.account.subscribed,true);
 const proj=await call('/api/projects',{method:'POST',body:{data:pdata}});assert.equal(proj.status,201,'studio open after subscribing');
 const usage=await call('/api/usage');assert.equal(usage.json.aiDailyLimit,100);assert.equal(usage.json.maxExport,1080);
 assert.equal((await call(`/api/projects/${proj.json.project.id}/renders`,{method:'POST',body:{resolution:1080}})).status!==402,true,'1080p allowed on Creator');
 let c=await call('/api/billing/cancel',{method:'POST',body:{}});assert.equal(c.json.account.subscription.cancelAtPeriodEnd,true);assert.equal(c.json.account.plan.id,'creator','stays active until period end');
 c=await call('/api/billing/cancel',{method:'POST',body:{resume:true}});assert.equal(c.json.account.subscription.cancelAtPeriodEnd,false);
 assert.equal((await call('/api/billing/checkout',{method:'POST',body:{plan:'free'}})).status,400,'the free plan no longer exists');
 assert.equal((await call('/api/billing/checkout',{method:'POST',body:{plan:'gold'}})).status,400);

 // Whop webhook: signature required, membership synced by plan id, deduplicated by webhook-id
 const membership={id:'mem_123',user_id:'user_whop9',status:'active',variant_id:'plan_pro_m',cancel_at_period_end:false,current_period_end:new Date(Date.now()+30*86400000).toISOString(),metadata:{user_id:userId}};
 const raw=JSON.stringify({id:'msg_a',type:'membership.updated',api_version:'v1',data:membership});
 const hook=(headers,body=raw)=>fetch(base+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
 assert.equal((await hook({'webhook-id':'msg_x','webhook-timestamp':String(Math.floor(Date.now()/1000)),'webhook-signature':'v1,bad'})).status,400);
 const signed=whopHeaders(raw,secret,{id:'msg_dedupe'});
 assert.equal((await hook(signed)).status,200);
 acct=await call('/api/account');assert.equal(acct.json.plan.id,'pro');assert.equal(acct.json.subscription.provider,'whop');assert.equal(acct.json.subscription.interval,'month');assert.equal(acct.json.entitlements.aiDaily,400);assert.ok(acct.json.subscription.currentPeriodEnd>Date.now());
 assert.equal((await (await hook(signed)).json()).duplicate,true,'redelivery is ignored');
 const sw=await call('/api/billing/checkout',{method:'POST',body:{plan:'creator',interval:'month'}});assert.equal(sw.status,409,'Whop subscribers cancel before switching');
 // Later event without our metadata still matches the stored membership; scheduled cancel then expiry.
 const flip=JSON.stringify({type:'membership.updated',data:{...membership,metadata:{},cancel_at_period_end:true}});
 assert.equal((await hook(whopHeaders(flip,secret),flip)).status,200);acct=await call('/api/account');assert.equal(acct.json.subscription.cancelAtPeriodEnd,true);assert.equal(acct.json.plan.id,'pro');
 const gone=JSON.stringify({type:'membership.deactivated',data:{...membership,metadata:{},status:'expired'}});
 assert.equal((await hook(whopHeaders(gone,secret),gone)).status,200);acct=await call('/api/account');assert.equal(acct.json.plan.id,'free','expired memberships lose the plan');assert.equal(acct.json.subscribed,false);assert.equal((await call('/api/projects')).status,402,'studio closes when the membership expires');
 const stranger=JSON.stringify({type:'membership.updated',data:{...membership,id:'mem_other',user_id:'user_other',metadata:{user_id:'not-a-user'}}});
 assert.equal((await hook(whopHeaders(stranger,secret),stranger)).status,200,'unknown users are acknowledged without changes');

 // Complimentary access by email: no payment, full studio access
 const vip=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Replotre-Client':'studio'},body:JSON.stringify({email:'VIP@Example.org',password:'A-long-enough-password-1'})});assert.equal(vip.status,200);
 const vipCookie=vip.headers.get('set-cookie').split(';')[0];const vipAcct=await (await fetch(base+'/api/account',{headers:{Cookie:vipCookie,'X-Replotre-Client':'studio'}})).json();
 assert.equal(vipAcct.subscribed,true);assert.equal(vipAcct.plan.id,'pro');assert.equal((await fetch(base+'/api/projects',{headers:{Cookie:vipCookie,'X-Replotre-Client':'studio'}})).status,200);

 // Unauthenticated access is rejected
 cookie='';assert.equal((await call('/api/account')).status,401);
});
