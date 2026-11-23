import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(import.meta.dirname,'..');
function freePort(){return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})})}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchAPI(base,route,{method='GET',body,cookie,headers={}}={}){const h={'X-Replotre-Client':'studio',...headers};if(cookie)h.Cookie=cookie;if(body&&!(body instanceof Uint8Array)&&typeof body!=='string'){h['Content-Type']='application/json';body=JSON.stringify(body)}const res=await fetch(base+route,{method,body,headers:h});let json;try{json=await res.json()}catch{json={}}return {status:res.status,headers:res.headers,json}}
const projectData={projectName:'My first real edit',aspect:'16:9',clips:[],texts:[],music:null,brandColor:'#e2ab77',brandFont:'Georgia',script:''};
test('end-to-end: sessions, private projects, media range and actual MP4', {timeout:180000}, async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-ci-')),port=process.env.REPLOTRE_TEST_URL?null:await freePort(),base=process.env.REPLOTRE_TEST_URL||`http://127.0.0.1:${port}`,suffix=randomUUID();
 const server=port?spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dir,PORT:String(port),APP_ORIGIN:base,NODE_ENV:'test',OPENAI_API_KEY:'',ALLOW_SIGNUP:'true',SIGNUP_INVITE_CODE:''},stdio:['ignore','pipe','pipe']}):null;let logs='',testProjectId=null,cleanupCookie=null;const fixtureUsers=[];server?.stderr.on('data',b=>logs+=b.toString());server?.stdout.on('data',b=>logs+=b.toString());
 t.after(async()=>{if(server){server.kill('SIGTERM');await wait(500)}else{if(testProjectId&&cleanupCookie)await fetchAPI(base,`/api/projects/${testProjectId}`,{method:'DELETE',cookie:cleanupCookie});if(process.env.REPLOTRE_TEST_DB){const db=new DatabaseSync(process.env.REPLOTRE_TEST_DB);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');for(const user of fixtureUsers)db.prepare('DELETE FROM users WHERE id=? AND email=?').run(user.id,user.email);db.close()}}await rm(dir,{force:true,recursive:true})});
 for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/healthz');if(r.ok)break}catch{}await wait(100)}
 const unauth=await fetchAPI(base,'/api/projects');assert.equal(unauth.status,401);
 const noCSRF=await fetch(base+'/api/auth/register',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}});assert.equal(noCSRF.status,403);
 const xss=await fetch(base+'/../../../etc/passwd');assert.equal(xss.status,404);
 const aliceEmail=`alice-${suffix}@example.org`,bobEmail=`bob-${suffix}@example.org`;
 const register=await fetchAPI(base,'/api/auth/register',{method:'POST',body:{email:aliceEmail,password:'A-seriously-long-password-123'}});assert.equal(register.status,200,JSON.stringify(register.json));fixtureUsers.push(register.json.user);assert.ok(register.headers.get('set-cookie')?.includes('HttpOnly'));
 const aliceCookie=register.headers.get('set-cookie').split(';')[0];cleanupCookie=aliceCookie;
 const duplicate=await fetchAPI(base,'/api/auth/register',{method:'POST',body:{email:aliceEmail,password:'another-long-password'}});assert.equal(duplicate.status,409);
 const wrong=await fetchAPI(base,'/api/auth/login',{method:'POST',body:{email:aliceEmail,password:'wrong-credentials'}});assert.equal(wrong.status,401);
 const created=await fetchAPI(base,'/api/projects',{method:'POST',cookie:aliceCookie,body:{data:projectData}});assert.equal(created.status,201,JSON.stringify(created.json));const pid=created.json.project.id;testProjectId=pid;
 const second=await fetchAPI(base,'/api/auth/register',{method:'POST',body:{email:bobEmail,password:'Another-high-entropy-passphrase'}});assert.equal(second.status,200);fixtureUsers.push(second.json.user);const bobCookie=second.headers.get('set-cookie').split(';')[0];
 const denied=await fetchAPI(base,`/api/projects/${pid}`,{cookie:bobCookie});assert.equal(denied.status,404);
 const badProject=await fetchAPI(base,`/api/projects/${pid}`,{method:'PUT',cookie:aliceCookie,body:{version:1,data:{...projectData,clips:[{id:'bad',kind:'video',mediaId:'cross-tenant',in:0,out:1,speed:1}]}}});assert.equal(badProject.status,400);
 const video=path.join(dir,'test-video.mp4');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1.8','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-y',video],{timeout:30000});
 const bytes=await readFile(video);
 const upload=await fetchAPI(base,`/api/projects/${pid}/assets?name=${encodeURIComponent('A real clip.mp4')}`,{method:'POST',cookie:aliceCookie,body:bytes,headers:{'Content-Type':'video/mp4'}});assert.equal(upload.status,201,JSON.stringify(upload.json));const asset=upload.json.asset;assert.equal(asset.kind,'video');assert.ok(asset.duration>1.5);
 const range=await fetch(base+asset.url,{headers:{Cookie:aliceCookie,Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
 const rangeDenied=await fetch(base+asset.url,{headers:{Cookie:bobCookie}});assert.equal(rangeDenied.status,404);
 const saveBody={...projectData,clips:[{id:'clip-1',name:'Test clip',kind:'video',mediaId:asset.id,in:0,out:1.3,speed:1,volume:.7,brightness:100,saturation:100}],texts:[{id:'title-1',text:'Launch today',kind:'title',start:0,duration:1,position:'center',color:'#ffffff',fontSize:40,fontWeight:600}]};
 const saved=await fetchAPI(base,`/api/projects/${pid}`,{method:'PUT',cookie:aliceCookie,body:{version:1,data:saveBody}});assert.equal(saved.status,200,JSON.stringify(saved.json));assert.equal(saved.json.project.version,2);
 const stale=await fetchAPI(base,`/api/projects/${pid}`,{method:'PUT',cookie:aliceCookie,body:{version:1,data:saveBody}});assert.equal(stale.status,409);
 const startRender=await fetchAPI(base,`/api/projects/${pid}/renders`,{method:'POST',cookie:aliceCookie,body:{resolution:720}});assert.equal(startRender.status,202,JSON.stringify(startRender.json));const rid=startRender.json.render.id;
 let render;for(let i=0;i<100;i++){await wait(1000);const status=await fetchAPI(base,`/api/renders/${rid}`,{cookie:aliceCookie});render=status.json.render;if(['completed','failed'].includes(render.status))break}
 assert.equal(render.status,'completed',`Render failed: ${JSON.stringify(render)}; ${logs}`);
 const download=await fetch(base+render.downloadUrl,{headers:{Cookie:aliceCookie}});assert.equal(download.status,200);assert.equal(download.headers.get('content-type'),'video/mp4');const mp4=path.join(dir,'render-output.mp4');const {writeFile}=await import('node:fs/promises');await writeFile(mp4,Buffer.from(await download.arrayBuffer()));
 const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',mp4]).toString());assert.ok(info.streams.some(s=>s.codec_name==='h264'));assert.ok(info.streams.some(s=>s.codec_name==='aac'));assert.ok(Number(info.format.duration)>1);
 const dDenied=await fetch(base+render.downloadUrl,{headers:{Cookie:bobCookie}});assert.equal(dDenied.status,404);
 // A second render verifies image clips, multiple timeline segments, and soundtrack mixing.
 const png=path.join(dir,'still.png'),wav=path.join(dir,'music.wav');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=0x225577:s=256x256:d=1','-frames:v','1','-update','1','-y',png],{timeout:15000});
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=660:sample_rate=48000','-t','2.8','-c:a','pcm_s16le','-y',wav],{timeout:15000});
 const imageUpload=await fetchAPI(base,`/api/projects/${pid}/assets?name=still.png`,{method:'POST',cookie:aliceCookie,body:await readFile(png),headers:{'Content-Type':'image/png'}});assert.equal(imageUpload.status,201,JSON.stringify(imageUpload.json));
 const audioUpload=await fetchAPI(base,`/api/projects/${pid}/assets?name=music.wav`,{method:'POST',cookie:aliceCookie,body:await readFile(wav),headers:{'Content-Type':'audio/wav'}});assert.equal(audioUpload.status,201,JSON.stringify(audioUpload.json));
 const timeline={...saveBody,aspect:'1:1',clips:[saveBody.clips[0],{id:'image-1',name:'Still frame',kind:'image',mediaId:imageUpload.json.asset.id,in:0,out:1.1,speed:1,volume:1,brightness:100,saturation:100}],music:{mediaId:audioUpload.json.asset.id,volume:.12,start:0}};
 const timelineSave=await fetchAPI(base,`/api/projects/${pid}`,{method:'PUT',cookie:aliceCookie,body:{version:2,data:timeline}});assert.equal(timelineSave.status,200,JSON.stringify(timelineSave.json));
 const mixRender=await fetchAPI(base,`/api/projects/${pid}/renders`,{method:'POST',cookie:aliceCookie,body:{resolution:720}});assert.equal(mixRender.status,202,JSON.stringify(mixRender.json));
 let mixed;for(let i=0;i<90;i++){await wait(1000);mixed=(await fetchAPI(base,`/api/renders/${mixRender.json.render.id}`,{cookie:aliceCookie})).json.render;if(['completed','failed'].includes(mixed.status))break}
 assert.equal(mixed.status,'completed',`Mixed media failed: ${JSON.stringify(mixed)} ${logs}`);
 // Remove fixture-owned media before revoking this session when using an existing server.
 if(!server){const cleanup=await fetchAPI(base,`/api/projects/${pid}`,{method:'DELETE',cookie:aliceCookie});assert.equal(cleanup.status,200);testProjectId=null}
 const logout=await fetchAPI(base,'/api/auth/logout',{method:'POST',cookie:aliceCookie});assert.equal(logout.status,200);
 const ended=await fetchAPI(base,'/api/projects',{cookie:aliceCookie});assert.equal(ended.status,401);
 });
