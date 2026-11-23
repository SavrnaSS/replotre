import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {validateProject} from '../src/core.mjs';
import {timelineContext,localTemplate,claudeTemplate} from '../src/template-ai.mjs';

const Catalog=globalThis.ReplotreTemplateCatalog;
const baseProject=()=>({projectName:'Launch day',aspect:'9:16',texts:[],music:null,clips:[
 {id:'c1',kind:'video',mediaId:'m1',in:2,out:6,speed:1},
 {id:'c2',kind:'video',mediaId:'m1',in:10,out:14,speed:2}]});
const analyses=()=>new Map([['m1',{hasAudio:true,beats:[2.5,3,3.5,11,12],scenes:[{time:4}],
 transcript:{words:[{word:'nobody',start:1,end:1.5},{word:'talks',start:2.2,end:2.6},{word:'about',start:2.7,end:3},{word:'consistency',start:3.1,end:3.9},{word:'ever',start:10.5,end:11}]},
 frames:[{index:0,time:3}],vision:{summary:'A person talking to camera in a bright kitchen.',tags:['person','kitchen']}}]]);

test('every catalog template builds a valid, renderable instance', ()=>{
 for(const t of Catalog.TEMPLATES){
  const inst=Catalog.build(t.id,{duration:12,title:'Hello there',words:[{w:'consistency',t:1,d:.4}],beats:[.5,1,1.5]});
  assert.ok(inst.elements.length>=2,t.id);
  for(const e of inst.elements){assert.ok(Catalog.ELEMENT_TYPES.includes(e.type));assert.ok(e.start>=0&&e.start<12);assert.ok(e.start+e.duration<=12.001,`${t.id} ${e.type} overruns`)}
  assert.deepEqual(Catalog.sanitize(inst),inst,'sanitize is idempotent');
 }
});

test('sanitize clamps hostile input and project validation stores the clean template', ()=>{
 const dirty={id:'crimson',style:{accent:'red',backdrop:9,font:'comic'},grade:{brightness:999},elements:[{type:'script',start:0},{type:'headline',start:-4,duration:1e9,text:'x'.repeat(900),position:'sideways'}]};
 const clean=Catalog.sanitize(dirty);
 assert.equal(clean.elements.length,1);assert.equal(clean.elements[0].text.length,160);assert.equal(clean.elements[0].position,'center');
 assert.equal(clean.style.accent,Catalog.get('crimson').style.accent);assert.equal(clean.style.backdrop,1);assert.equal(clean.grade.brightness,140);
 const p={...baseProject(),template:dirty};validateProject(p);assert.equal(p.template.elements.length,1);
 assert.throws(()=>validateProject({...baseProject(),template:'nope'}),/Invalid template/);
});

test('timeline context maps transcript words, beats and scenes through trims and speed', ()=>{
 const ctx=timelineContext(baseProject(),analyses());
 assert.equal(ctx.duration,6);
 assert.deepEqual(ctx.words.map(w=>[w.w,w.t]),[['talks',.2],['about',.7],['consistency',1.1],['ever',4.25]]);
 assert.deepEqual(ctx.beats,[.5,1,1.5,4.5,5]);
 assert.ok(ctx.scenes.includes(4)&&ctx.scenes.includes(2));
 const local=localTemplate('crimson',ctx);
 const captions=local.template.elements.find(e=>e.type==='captions');
 assert.equal(captions.words.length,4);assert.equal(local.template.elements[0].text,'consistency');
});

test('Claude planner sends a grounded structured-output request and grounds the reply', async()=>{
 const requests=[];
 const plan={message:'Kept your hook word behind you and timed captions to speech.',name:'Ignored for apply',
  style:{accent:'#ffd0c0',ink:'#ffffff',washA:'#901c30',washB:'#300810',backdrop:.9,wash:.2,vignette:.5,grain:.1,glow:.2,letterbox:0,leak:0,flicker:false,scanlines:false,font:'sans',accentFont:'script'},
  grade:{brightness:102,contrast:110,saturation:95,warmth:6},
  elements:[{type:'headline',start:0,duration:3,text:'consistency',sub:'nobody talks about',items:[],emphasis:['consistency'],value:0,behind:true,position:'top',variant:'standard'},
   {type:'captions',start:0,duration:99,text:'',sub:'',items:[],emphasis:['consistency'],value:0,behind:false,position:'lower',variant:'script'},
   {type:'keyword',start:1,duration:4,text:'',sub:'',items:['SHOW','UP'],emphasis:[],value:0,behind:true,position:'upper',variant:'standard'}]};
 const server=http.createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{requests.push({url:req.url,headers:req.headers,body:JSON.parse(body)});
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({id:'msg_test',type:'message',role:'assistant',model:'claude-opus-5-5',stop_reason:'end_turn',stop_sequence:null,
   usage:{input_tokens:10,output_tokens:10},content:[{type:'text',text:JSON.stringify(plan)}]}))})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const prev={key:process.env.ANTHROPIC_API_KEY,url:process.env.ANTHROPIC_BASE_URL};
 process.env.ANTHROPIC_API_KEY='test-key';process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${server.address().port}`;
 try{
  const ctx=timelineContext(baseProject(),analyses());
  const result=await claudeTemplate({templateId:'crimson',mode:'apply',brief:'punchier',ctx,dataDir:'/nonexistent',useFrames:true});
  const sent=requests[0];
  assert.match(sent.url,/\/v1\/messages/);
  assert.equal(sent.body.model,'claude-opus-5-5');
  assert.equal(sent.body.fallbacks,'default');
  assert.match(String(sent.headers['anthropic-beta']),/server-side-fallback-2026-07-01/);
  assert.equal(sent.body.output_config.format.type,'json_schema');
  assert.equal(sent.body.output_config.effort,'medium');
  assert.equal(sent.body.thinking,undefined);
  const text=sent.body.messages[0].content.at(-1).text;
  assert.match(text,/consistency/);assert.match(text,/<editor_data>/);
  assert.equal(result.engine,'claude');assert.equal(result.template.id,'crimson');assert.equal(result.template.name,'Crimson Studio');
  const cap=result.template.elements.find(e=>e.type==='captions');
  assert.equal(cap.duration,6,'clamped to the timeline');assert.equal(cap.words.length,4,'word timings come from the transcript, not the model');
  const kw=result.template.elements.find(e=>e.type==='keyword');assert.deepEqual(kw.beats,[1,1.5,4.5],'beats come from analysis');
 }finally{server.close();if(prev.key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=prev.key;if(prev.url===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=prev.url}
});

test('templates fill the timeline: headlines pop on spoken key words, placeholder copy without a transcript', ()=>{
 const words='so it does not matter how much content you post if nobody watches consistency is everything and honestly growth takes time'.split(' ').map((w,i)=>({w,t:+(.3+i*.38).toFixed(2),d:.33}));
 const synced=Catalog.build('crimson',{duration:9,words});
 const heads=synced.elements.filter(e=>e.type==='headline');
 assert.ok(heads.length>=2,'several headline pops');
 const content=heads.find(e=>e.text==='content');assert.ok(content,'picks a spoken key word');
 assert.ok(Math.abs(content.start-(words.find(w=>w.w==='content').t-.12))<.01,'pops just before the word is spoken');
 assert.match(content.sub,/how much$/,'kicker is the words leading into it');
 for(const e of heads)assert.ok(!['does','much','about'].includes(e.text.toLowerCase()),'filler words are never headlines');
 const plain=Catalog.build('interview-glow',{duration:9,title:'',words:[]});
 const pops=plain.elements.filter(e=>e.type==='headline');
 assert.ok(pops.length>=3,'placeholder pops spread across the clip');
 assert.ok(pops.at(-1).start>5,'motion reaches the end of the timeline');
 const kw=Catalog.build('beat-keyword',{duration:9,words}).elements.find(e=>e.type==='keyword');
 assert.equal(kw.items.length,kw.beats.length,'keyword swaps exactly when each word is spoken');
});
