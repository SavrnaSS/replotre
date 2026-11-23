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
const b64u=o=>Buffer.from(JSON.stringify(o)).toString('base64url');

test('Continue with Google: PKCE + state, verified claims, sign up, link and sign in',{timeout:60000},async t=>{
 const CLIENT='test-client.apps.googleusercontent.com';
 // Fake Google token endpoint: checks the PKCE verifier arrives and returns an ID token for the queued identity.
 let next=null,lastBody=null;
 const fake=http.createServer((req,res)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{lastBody=new URLSearchParams(raw);
  if(lastBody.get('code')!=='good-code'||!lastBody.get('code_verifier')){res.writeHead(400,{'Content-Type':'application/json'});return res.end('{"error":"invalid_grant"}')}
  const claims={iss:'https://accounts.google.com',aud:CLIENT,exp:Math.floor(Date.now()/1000)+600,email_verified:true,...next};
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({access_token:'x',id_token:`${b64u({alg:'RS256'})}.${b64u(claims)}.sig`}))})});
 const fakePort=await freePort();await new Promise(r=>fake.listen(fakePort,'127.0.0.1',r));
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-g-')),port=await freePort(),base=`http://127.0.0.1:${port}`;
 const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dir,PORT:String(port),APP_ORIGIN:base,NODE_ENV:'test',ALLOW_SIGNUP:'true',SIGNUP_INVITE_CODE:'',GOOGLE_CLIENT_ID:CLIENT,GOOGLE_CLIENT_SECRET:'shh',GOOGLE_TOKEN_URL:`http://127.0.0.1:${fakePort}/token`,WHOP_API_KEY:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},stdio:'ignore'});
 t.after(async()=>{server.kill('SIGTERM');fake.close();await wait(300);await rm(dir,{recursive:true,force:true})});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/healthz')).ok)break}catch{}await wait(100)}

 assert.equal((await (await fetch(base+'/api/status')).json()).google,true,'status advertises Google');

 const start=async()=>{const r=await fetch(base+'/api/auth/google/start?mode=register',{redirect:'manual'});assert.equal(r.status,302);
  const loc=new URL(r.headers.get('location'));assert.equal(loc.origin,'https://accounts.google.com');
  assert.equal(loc.searchParams.get('client_id'),CLIENT);assert.equal(loc.searchParams.get('code_challenge_method'),'S256');assert.ok(loc.searchParams.get('code_challenge'));
  assert.equal(loc.searchParams.get('redirect_uri'),`${base}/api/auth/google/callback`);
  return {state:loc.searchParams.get('state'),flow:r.headers.get('set-cookie').split(';')[0]}};
 const callback=async({state,flow},code='good-code')=>{const r=await fetch(`${base}/api/auth/google/callback?code=${code}&state=${encodeURIComponent(state)}`,{redirect:'manual',headers:{Cookie:flow}});
  const cookies=r.headers.getSetCookie?.()||[];return {status:r.status,location:r.headers.get('location'),session:cookies.find(c=>c.startsWith('rp_session=')&&!c.startsWith('rp_session=;'))?.split(';')[0]}};
 const me=async session=>(await (await fetch(base+'/api/auth/me',{headers:{Cookie:session}})).json()).user;

 // 1. Tampered state and missing flow cookie are rejected
 let f=await start();
 assert.match((await callback({...f,state:f.state.slice(0,-2)+'xx'})).location,/auth_error=google_expired/);
 assert.match((await callback({state:f.state,flow:''})).location,/auth_error=google_expired/);
 // 2. Bad code (token exchange fails) is rejected
 next={sub:'g-1',email:'maya@example.org',given_name:'Maya'};
 assert.match((await callback(f,'bad-code')).location,/auth_error=google_failed/);
 // 3. Wrong audience and unverified email are rejected
 f=await start();next={sub:'g-1',email:'maya@example.org',aud:'someone-else'};assert.match((await callback(f)).location,/auth_error=google_unverified/);
 f=await start();next={sub:'g-1',email:'maya@example.org',email_verified:false};assert.match((await callback(f)).location,/auth_error=google_unverified/);

 // 4. New user: account created, session started, first name pre-filled, PKCE verifier sent
 f=await start();next={sub:'g-1',email:'Maya@Example.org',given_name:'Maya'};
 let r=await callback(f);assert.equal(r.status,302);assert.match(r.location,/\/studio\?auth=google&new=1$/);assert.ok(r.session,'session cookie set');
 assert.ok(lastBody.get('code_verifier').length>=43);
 assert.equal((await me(r.session)).email,'maya@example.org');
 const acct=await (await fetch(base+'/api/account',{headers:{Cookie:r.session,'X-Replotre-Client':'studio'}})).json();assert.equal(acct.profile.name,'Maya');assert.equal(acct.profile.onboardedAt,null);
 // Google-only accounts cannot be signed into with a password
 assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Replotre-Client':'studio'},body:JSON.stringify({email:'maya@example.org',password:'!google'})})).status,401);

 // 5. Returning Google user signs in to the same account
 f=await start();next={sub:'g-1',email:'maya@example.org'};r=await callback(f);assert.match(r.location,/\/studio\?auth=google$/);assert.equal((await me(r.session)).email,'maya@example.org');

 // 6. Existing email/password account gets Google linked (same verified email)
 const reg=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Replotre-Client':'studio'},body:JSON.stringify({email:'sam@example.org',password:'A-long-enough-password-1'})});assert.equal(reg.status,200);
 const samId=(await reg.json()).user.id;
 f=await start();next={sub:'g-2',email:'sam@example.org'};r=await callback(f);assert.match(r.location,/auth=google$/);const sam=await me(r.session);assert.equal(sam.id,samId,'linked, not duplicated');
 // and the password still works
 assert.equal((await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Replotre-Client':'studio'},body:JSON.stringify({email:'sam@example.org',password:'A-long-enough-password-1'})})).status,200);

 // 7. User cancels on Google's screen
 f=await start();const c=await fetch(`${base}/api/auth/google/callback?error=access_denied&state=${f.state}`,{redirect:'manual',headers:{Cookie:f.flow}});assert.match(c.headers.get('location'),/auth_error=google_cancelled/);
});
