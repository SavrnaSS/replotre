import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {verifySvix} from '../src/inbound-mail.mjs';

const root=path.resolve(import.meta.dirname,'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p))})});

test('verifySvix matches the published Svix test vector and rejects tampering',()=>{
 const h={'svix-id':'msg_loFOjxBNrRLzqYUf','svix-timestamp':'1731705121','svix-signature':'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0='};
 const body='{"event_type":"ping","data":{"success":true}}';
 assert.equal(verifySvix(body,h,'whsec_plJ3nmyCDGBKInavdOK15jsl',1e10),true);
 assert.equal(verifySvix(body+' ',h,'whsec_plJ3nmyCDGBKInavdOK15jsl',1e10),false);
 assert.equal(verifySvix(body,h,'whsec_plJ3nmyCDGBKInavdOK15jsl'),false,'old timestamp is outside the tolerance');
});

test('inbound webhook forwards a received email to the owner with reply-to and attachments',{timeout:60000},async t=>{
 const sent=[];
 const api=http.createServer((req,res)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{const send=(o,s=200)=>{res.writeHead(s,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
  if(req.method==='GET'&&req.url==='/emails/receiving/em_1')return send({id:'em_1',from:'maya@example.org',headers:{from:'Maya <maya@example.org>'},to:['hello@replotre.com'],reply_to:[],subject:'Question about plans',html:'<p>Hi there</p>',text:'Hi there',attachments:[{id:'a1',filename:'brief.pdf',content_disposition:'attachment',content_type:'application/pdf'}]});
  if(req.method==='GET'&&req.url.startsWith('/emails/receiving/em_1/attachments'))return send({object:'list',data:[{id:'a1',filename:'brief.pdf',size:5,content_type:'application/pdf',content_disposition:'attachment',download_url:`http://127.0.0.1:${api.address().port}/dl/a1`}]});
  if(req.url==='/dl/a1'){res.writeHead(200);return res.end('%PDF-')}
  if(req.method==='POST'&&req.url==='/emails'){sent.push({auth:req.headers.authorization,body:JSON.parse(raw)});return send({id:'out_1'})}
  send({message:'not found'},404)})});
 const ap=await freePort();await new Promise(r=>api.listen(ap,'127.0.0.1',r));t.after(()=>api.close());
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-in-')),port=await freePort(),base=`http://127.0.0.1:${port}`,secret='whsec_'+Buffer.from('test-secret-123456').toString('base64');
 const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dir,PORT:String(port),APP_ORIGIN:base,NODE_ENV:'test',WHOP_API_KEY:'',RESEND_API_KEY:'re_test',MAIL_FROM:'Replotre <hello@replotre.com>',MAIL_FORWARD_TO:'owner@example.org',RESEND_WEBHOOK_SECRET:secret,RESEND_API_BASE:`http://127.0.0.1:${ap}`},stdio:'ignore'});
 t.after(async()=>{server.kill('SIGTERM');await wait(300);await rm(dir,{recursive:true,force:true})});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/healthz')).ok)break}catch{}await wait(100)}
 const body=JSON.stringify({type:'email.received',data:{email_id:'em_1',from:'maya@example.org',to:['hello@replotre.com'],subject:'Question about plans'}});
 const sign=(id,b=body)=>{const ts=String(Math.floor(Date.now()/1000));return {'svix-id':id,'svix-timestamp':ts,'svix-signature':'v1,'+createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${ts}.${b}`).digest('base64'),'Content-Type':'application/json'}};
 assert.equal((await fetch(base+'/api/email/inbound',{method:'POST',headers:{'Content-Type':'application/json'},body})).status,401,'unsigned is rejected');
 const ok=await fetch(base+'/api/email/inbound',{method:'POST',headers:sign('msg_1'),body});assert.equal(ok.status,200);
 assert.equal(sent.length,1);const m=sent[0].body;
 assert.deepEqual(m.to,['owner@example.org']);assert.deepEqual(m.reply_to,['maya@example.org']);assert.equal(m.subject,'Question about plans');
 assert.equal(m.from,'Replotre inbox <hello@replotre.com>');assert.match(m.html,/Hi there/);assert.match(m.text,/from Maya <maya@example\.org>/);
 assert.equal(m.attachments.length,1);assert.equal(m.attachments[0].filename,'brief.pdf');assert.equal(Buffer.from(m.attachments[0].content,'base64').toString(),'%PDF-');
 assert.equal((await fetch(base+'/api/email/inbound',{method:'POST',headers:sign('msg_1'),body})).status,200);assert.equal(sent.length,1,'retry of the same event is not forwarded twice');
});
