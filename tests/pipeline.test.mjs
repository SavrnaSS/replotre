import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
const require_spawn=args=>spawnSync('ffmpeg',args,{encoding:'utf8'}).stderr||'';
import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import os from 'node:os';
import path from 'node:path';
import {openDatabase} from '../src/database.mjs';
import {EventHub} from '../src/realtime.mjs';
import {AnalysisQueue,readAnalysis} from '../src/analysis.mjs';
import {RenderQueue} from '../src/render.mjs';
import {uuid} from '../src/core.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ffmpeg=args=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{timeout:30000});
async function complete(db,table,id){for(let i=0;i<240;i++){const row=db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);if(row&&!['queued','running'].includes(row.status))return row;await wait(50)}throw Error(`${table} processing timed out`)}
class Stream extends EventEmitter{constructor(){super();this.messages='';this.destroyed=false;this.writableEnded=false}writeHead(status,headers){this.status=status;this.headers=headers}flushHeaders(){}write(s){this.messages+=s;return true}end(){this.writableEnded=true;this.emit('close')}destroy(){this.destroyed=true;this.end()}}

test('persistent media pipeline: real scenes, silence, mock-provider timestamps, mixed MP4, and replay',{timeout:120000},async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-pipeline-')),db=openDatabase(path.join(dir,'pipeline.sqlite')),hub=new EventHub(db),analysis=new AnalysisQueue(db,dir,hub),render=new RenderQueue(db,dir,hub);
 t.after(async()=>{hub.shutdown();await Promise.allSettled([analysis.shutdown(),render.shutdown()]);db.close();await rm(dir,{recursive:true,force:true})});
 const user={id:uuid()},other={id:uuid()},projectId=uuid(),assetId=uuid(),stamp=Date.now();
 for(const [i,u] of [user,other].entries())db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(u.id,`pipeline-${i}@example.org`,'fixture','fixture',stamp);
 const data={projectName:'Pipeline fixture',aspect:'1:1',clips:[],texts:[],music:null,script:''};
 db.prepare('INSERT INTO projects(id,user_id,name,data_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(projectId,user.id,data.projectName,JSON.stringify(data),1,stamp,stamp);
 const assetDir=path.join(dir,'assets');await mkdir(assetDir);const file=path.join(assetDir,'fixture.mp4');
 ffmpeg(['-f','lavfi','-i','color=c=black:s=160x90:r=15:d=2','-f','lavfi','-i','color=c=white:s=160x90:r=15:d=2','-f','lavfi','-i','aevalsrc=if(lt(mod(t\\,2)\\,1)\\,0.3*sin(2*PI*440*t)\\,0):s=8000:d=4','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-map','2:a','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-t','4','-threads','1',file]);
 const asset={id:assetId,project_id:projectId,user_id:user.id,name:'Measured fixture.mp4',kind:'video',mime:'video/mp4',size:(await readFile(file)).length,stored_name:'assets/fixture.mp4',duration:4,width:160,height:90,created_at:stamp};
 // Explicit columns protect this test against future additive schema migrations.
 const addAsset=a=>db.prepare('INSERT INTO assets(id,project_id,user_id,name,kind,mime,size,stored_name,duration,width,height,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(a.id,a.project_id,a.user_id,a.name,a.kind,a.mime,a.size,a.stored_name,a.duration,a.width,a.height,a.created_at);
 addAsset(asset);let project=db.prepare('SELECT * FROM projects WHERE id=?').get(projectId);
 const stream=new Stream(),otherStream=new Stream();hub.connect({url:'/api/events',headers:{}},stream,user,()=>true);hub.connect({url:'/api/events',headers:{}},otherStream,other,()=>true);
 const task=analysis.request(project,user,asset,'analyze'),finished=await complete(db,'tasks',task.id);assert.equal(finished.status,'completed',finished.error);
 const result=readAnalysis(db,assetId);assert.equal(result.scenes.length,2);assert.deepEqual(result.scenes.map(s=>s.start),[0,2]);assert.equal(result.silences.length,2);assert.equal(result.waveform.length,160);assert.ok(result.waveform.some(v=>v===0));assert.ok(result.waveform.some(v=>v>.9));assert.equal(result.frames.length,3);
 assert.ok(stream.messages.includes('event: analysis.updated'));assert.ok(!otherStream.messages.includes('event: analysis.updated'));
 const cursor=db.prepare('SELECT MAX(id) id FROM events WHERE user_id=?').get(user.id).id;
 hub.publish(user.id,'project.updated',{project:{id:projectId,version:2}},projectId);const replay=new Stream();hub.connect({url:'/api/events',headers:{'last-event-id':String(cursor)}},replay,user,()=>true);assert.ok(replay.messages.includes('event: project.updated'));replay.end();
 // Test adapter behavior with a mock provider; no external AI request or real credential.
 const originalFetch=globalThis.fetch,originalKey=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fixture-provider-key';
 t.after(()=>{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey});
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer fixture-provider-key');
  if(url.endsWith('/audio/transcriptions')){assert.equal(options.body.get('model'),'whisper-1');assert.ok(options.body.get('file').size>100);assert.deepEqual(options.body.getAll('timestamp_granularities[]'),['word','segment']);return Response.json({text:'This is a fixture.',language:'english',words:[{word:'This',start:0,end:.3},{word:'is',start:.3,end:.5},{word:'a',start:.5,end:.6},{word:'fixture.',start:.6,end:.9}],segments:[{text:'This is a fixture.',start:0,end:.9}]})}
  const body=JSON.parse(options.body);assert.equal(body.store,false);assert.ok(body.input[0].content.some(c=>c.type==='input_image'));return Response.json({output_text:JSON.stringify({summary:'Synthetic black and white frames.',tags:['test footage'],frames:[{time:0,description:'Black frame.'}]})});
 };
 let charged=0;analysis.onAIRequest=()=>charged++;
 const speech=analysis.request(project,user,asset,'transcribe'),duplicate=analysis.request(project,user,asset,'transcribe');assert.equal(duplicate.id,speech.id);assert.equal(charged,1,'Duplicate active requests consume the provider quota only once');assert.equal((await complete(db,'tasks',speech.id)).status,'completed');assert.equal(readAnalysis(db,assetId).transcript.words.length,4);
 const vision=analysis.request(project,user,asset,'understand');assert.equal((await complete(db,'tasks',vision.id)).status,'completed');assert.equal(readAnalysis(db,assetId).vision.coverage,'sampled frames');
 globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=originalKey;
 const cancelled=analysis.request(project,user,asset,'analyze');assert.equal(analysis.cancel(cancelled.id).status,'cancelled');
 const imageId=uuid(),musicId=uuid();ffmpeg(['-f','lavfi','-i','color=c=0x225577:s=128x128:d=1','-frames:v','1','-update','1',path.join(assetDir,'still.png')]);ffmpeg(['-f','lavfi','-i','sine=frequency=660:sample_rate=48000','-t','2.8','-c:a','pcm_s16le',path.join(assetDir,'music.wav')]);
 addAsset({...asset,id:imageId,kind:'image',mime:'image/png',name:'Still.png',stored_name:'assets/still.png',duration:5,width:128,height:128});addAsset({...asset,id:musicId,kind:'audio',mime:'audio/wav',name:'Music.wav',stored_name:'assets/music.wav',duration:2.8,width:0,height:0});
 data.clips=[{id:'video',kind:'video',name:'Video',mediaId:assetId,in:0,out:1.3,speed:1,volume:.7,brightness:100,saturation:100,fit:'fill',zoom:1.5,panX:.4,panY:-.3,flipH:true,contrast:118,fadeIn:.3,fadeOut:.2},{id:'image',kind:'image',name:'Still',mediaId:imageId,in:0,out:1.1,speed:1,volume:1,brightness:100,saturation:100,fit:'fit',zoom:1.2,panX:-.5,fadeOut:.3,xfade:.4}];data.texts=[{id:'title',kind:'title',text:'Actual mixed media',start:.1,duration:.5,position:'center',color:'#ffffff',fontSize:38,fontWeight:700,cutOut:true},{id:'title-b',kind:'title',text:'Actual mixed media',start:.6,duration:.5,position:'center',color:'#ffffff',fontSize:38,fontWeight:700,cutIn:true},{id:'dragged',kind:'title',text:'Dragged title',start:.2,duration:.8,position:'center',x:.3,y:.25,color:'#ffcc88',fontSize:30,fontWeight:600,bg:'box',anim:'slide'}];data.music={mediaId:musicId,start:0,volume:.15,fadeIn:.4,fadeOut:.4};
 db.prepare('UPDATE projects SET data_json=? WHERE id=?').run(JSON.stringify(data),projectId);project=db.prepare('SELECT * FROM projects WHERE id=?').get(projectId);
 const job=render.request(project,user,720),encoded=await complete(db,'renders',job.id);assert.equal(encoded.status,'completed',encoded.error);
 const info=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(dir,encoded.stored_name)]).toString());assert.ok(info.streams.some(s=>s.codec_name==='h264'&&s.width===720&&s.height===720));assert.ok(info.streams.some(s=>s.codec_name==='aac'));assert.ok(Number(info.format.duration)>2.3&&Number(info.format.duration)<2.6,`crossfade keeps programme length: ${info.format.duration}`);assert.ok(stream.messages.includes('event: render.updated'));assert.ok(!otherStream.messages.includes('event: render.updated'));
 // In/out range export: 0.5s–1.9s crosses the video→image cut and starts the soundtrack 0.5s in.
 const ranged=render.request(project,user,720,null,{start:.5,end:1.9}),rangedDone=await complete(db,'renders',ranged.id);assert.equal(rangedDone.status,'completed',rangedDone.error);
 const snap=JSON.parse(rangedDone.snapshot_json);assert.deepEqual(snap.range,{start:.5,end:1.9});assert.equal(snap.clips.length,2);assert.ok(Math.abs(snap.clips[0].in-.5)<1e-9);assert.ok(Math.abs(snap.music.offset-.5)<1e-9);
 const rangedInfo=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-of','json',path.join(dir,rangedDone.stored_name)]).toString());const rangedLen=Number(rangedInfo.format.duration);assert.ok(rangedLen>1.25&&rangedLen<1.6,`ranged render length ${rangedLen}`);
 assert.throws(()=>render.request(project,user,720,null,{start:1,end:1.05}),/at least 0\.2 seconds/);
 // Audio crossfade uses real footage beyond the edit points: two in-phase 440Hz tone clips overlap at -3dB each,
 // so the level on the cut rises ~+3dB above steady tone (a hard cut stays flat; a silence fallback would dip).
 const xfData={...data,texts:[],music:null,clips:[{id:'xa',kind:'video',name:'A',mediaId:assetId,in:.1,out:.7,speed:1,volume:1},{id:'xb',kind:'video',name:'B',mediaId:assetId,in:2.3,out:2.9,speed:1,volume:1,xfade:.6}]};
 const xfJob=render.request(project,user,720,JSON.stringify(xfData)),xfDone=await complete(db,'renders',xfJob.id);assert.equal(xfDone.status,'completed',xfDone.error);
 const xfFile=path.join(dir,xfDone.stored_name),level=(ss,t)=>{const r=require_spawn(['-hide_banner','-ss',String(ss),'-t',String(t),'-i',xfFile,'-af','astats=measure_overall=RMS_level:measure_perchannel=none','-f','null','-']);const m=r.match(/RMS level dB:\s*(-?[\d.]+)/);return m?Number(m[1]):-Infinity};
 const steady=level(.08,.12),onCut=level(.57,.06);if(process.env.SHOW_LEVELS)console.log(`steady ${steady}dB, on cut ${onCut}dB`);
 assert.ok(Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-of','json',xfFile]).toString()).format.duration)<1.4,'crossfade keeps the 1.2s programme length');
 assert.ok(onCut-steady>1.5,`audio overlaps across the cut (steady ${steady.toFixed(1)}dB, cut ${onCut.toFixed(1)}dB)`);
 // Keyframed zoom/pan: a still image only moves if the perspective animation works; a video clip is keyed too.
 const kfData={...data,texts:[],music:null,clips:[
  {id:'kv',kind:'video',name:'V',mediaId:assetId,in:0,out:1,speed:1,volume:1,keys:[{t:0,zoom:1,panX:0,panY:0},{t:1,zoom:1.6,panX:.5,panY:-.4}]},
  {id:'ki',kind:'image',name:'I',mediaId:imageId,in:0,out:1.2,speed:1,volume:1,fit:'fit',keys:[{t:0,zoom:1,panX:0,panY:0},{t:1.2,zoom:2.4,panX:-.6,panY:.5}]}]};
 const kfJob=render.request(project,user,720,JSON.stringify(kfData)),kfDone=await complete(db,'renders',kfJob.id);assert.equal(kfDone.status,'completed',kfDone.error);
 const kfFile=path.join(dir,kfDone.stored_name),frameHash=t=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(t),'-i',kfFile,'-frames:v','1','-f','md5','-']).toString().trim();
 assert.notEqual(frameHash(1.05),frameHash(2.1),'the keyframed still image zooms over time');
 assert.ok(Math.abs(Number(JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-of','json',kfFile]).toString()).format.duration)-2.2)<.15,'keyframes do not change clip timing');
});

test('restart recovery preserves queued work and marks interrupted active jobs retryable',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'replotre-recovery-')),file=path.join(dir,'jobs.sqlite');let db=openDatabase(file);
 t.after(async()=>{db.close();await rm(dir,{recursive:true,force:true})});
 const userId=uuid(),projectId=uuid(),stamp=Date.now();db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(userId,'recovery@example.org','fixture','fixture',stamp);db.prepare('INSERT INTO projects(id,user_id,name,data_json,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(projectId,userId,'Recovery','{}',1,stamp,stamp);
 for(const status of ['queued','running']){db.prepare('INSERT INTO renders(id,project_id,user_id,status,resolution,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').run(uuid(),projectId,userId,status,720,stamp,stamp);db.prepare('INSERT INTO tasks(id,project_id,user_id,kind,status,stage,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(uuid(),projectId,userId,'analyze',status,'Fixture',stamp,stamp)}
 db.close();db=openDatabase(file);
 for(const table of ['renders','tasks']){assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE status='queued'`).get().n,1);assert.equal(db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE status='failed' AND error LIKE '%restart%'`).get().n,1)}
});
