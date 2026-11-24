import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

const root=path.resolve(import.meta.dirname,'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p))})});

async function boot(t,env){
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-reset-')),port=await freePort(),base=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dir,PORT:String(port),APP_ORIGIN:base,NODE_ENV:'test',ALLOW_SIGNUP:'true',SIGNUP_INVITE_CODE:'',WHOP_API_KEY:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',RESEND_API_KEY:'',MAIL_FROM:'',...env},stdio:'ignore'});
 t.after(async()=>{server.kill('SIGTERM');await wait(300);await rm(dir,{recursive:true,force:true})});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/healthz')).ok)break}catch{}await wait(100)}
 const call=(p,body,cookie)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json','X-Replotre-Client':'studio',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 return {base,call}}
const session=r=>(r.headers.getSetCookie?.()||[]).find(c=>c.startsWith('rp_session=')&&!c.startsWith('rp_session=;'))?.split(';')[0];

test('password reset: unavailable without an email provider',{timeout:30000},async t=>{
 const {base,call}=await boot(t,{});
 assert.equal((await (await fetch(base+'/api/status')).json()).passwordReset,false);
 const r=await call('/api/auth/forgot',{email:'a@example.org'});assert.equal(r.status,200);assert.equal((await r.json()).available,false);
});

test('password reset: email link, single use, no enumeration, signs out other sessions',{timeout:60000},async t=>{
 const mails=[];const fake=http.createServer((req,res)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{mails.push({auth:req.headers.authorization,body:JSON.parse(raw)});res.writeHead(200,{'Content-Type':'application/json'});res.end('{"id":"x"}')})});
 const fp=await freePort();await new Promise(r=>fake.listen(fp,'127.0.0.1',r));t.after(()=>fake.close());
 const {base,call}=await boot(t,{RESEND_API_KEY:'re_test',MAIL_FROM:'Replotre <no-reply@replotre.com>',RESEND_API_URL:`http://127.0.0.1:${fp}/emails`});
 assert.equal((await (await fetch(base+'/api/status')).json()).passwordReset,true);
 const reg=await call('/api/auth/register',{email:'maya@example.org',password:'Old-password-123'});assert.equal(reg.status,200);const oldSession=session(reg);
 // unknown email: same response, no email sent
 const unknown=await call('/api/auth/forgot',{email:'nobody@example.org'});assert.equal(unknown.status,200);assert.deepEqual(await unknown.json(),{ok:true,available:true,ttlMinutes:30});assert.equal(mails.length,0);
 assert.equal((await call('/api/auth/forgot',{email:'not-an-email'})).status,400);
 // known email: email sent with a link
 const known=await call('/api/auth/forgot',{email:'Maya@Example.org'});assert.deepEqual(await known.json(),{ok:true,available:true,ttlMinutes:30});
 assert.equal(mails.length,1);assert.equal(mails[0].auth,'Bearer re_test');assert.deepEqual(mails[0].body.to,['maya@example.org']);assert.match(mails[0].body.subject,/Reset your Replotre password/);
 const first=new URL(/https?:\/\/\S+?reset=[A-Za-z0-9_%-]+/.exec(mails[0].body.text)[0]).searchParams.get('reset');
 // a second request replaces the first link
 await call('/api/auth/forgot',{email:'maya@example.org'});const token=new URL(/https?:\/\/\S+?reset=[A-Za-z0-9_%-]+/.exec(mails[1].body.text)[0]).searchParams.get('reset');
 assert.equal((await (await call('/api/auth/reset/check',{token:first})).json()).valid,false,'older link no longer works');
 const chk=await (await call('/api/auth/reset/check',{token})).json();assert.equal(chk.valid,true);assert.equal(chk.fullEmail,'maya@example.org');assert.match(chk.email,/^ma•+@example\.org$/);
 assert.equal((await call('/api/auth/reset',{token,password:'short'})).status,400);
 const ok=await call('/api/auth/reset',{token,password:'New-password-456'});assert.equal(ok.status,200);const fresh=session(ok);assert.ok(fresh,'signed in after reset');
 assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:oldSession}})).status===200&&(await (await fetch(base+'/api/auth/me',{headers:{Cookie:oldSession}})).json()).user?'still':'out','out','old sessions signed out');
 assert.equal((await (await fetch(base+'/api/auth/me',{headers:{Cookie:fresh}})).json()).user.email,'maya@example.org');
 assert.equal((await call('/api/auth/reset',{token,password:'Another-pass-789'})).status,410,'link is single use');
 assert.equal((await call('/api/auth/login',{email:'maya@example.org',password:'Old-password-123'})).status,401);
 assert.equal((await call('/api/auth/login',{email:'maya@example.org',password:'New-password-456'})).status,200);
 // per-address cap: quietly stops sending after 3 an hour, same answer
 await call('/api/auth/forgot',{email:'maya@example.org'});const capped=await call('/api/auth/forgot',{email:'maya@example.org'});assert.equal(capped.status,200);assert.equal(mails.length,3);
});
