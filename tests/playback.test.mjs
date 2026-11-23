import test from 'node:test';
import assert from 'node:assert/strict';
import '../playback.js';
const {PlaybackEngine}=globalThis.ReplotrePlayback;
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve()};
class Media extends EventTarget {
 constructor({video=true,frames=true}={}){super();this.video=video;this._time=0;this.src='';this.readyState=0;this.paused=true;this.seeking=false;this.ended=false;this.volume=1;this.playbackRate=1;this.loads=0;this.seeks=0;this.plays=0;this.frames=new Map();this.nextFrame=1;this.stalled=false;this.presented=0;if(!frames)this.requestVideoFrameCallback=undefined}
 get currentTime(){return this._time}
 set currentTime(time){this.seeks++;this.seeking=true;this._time=time;queueMicrotask(()=>{this.seeking=false;this.dispatchEvent(new Event('seeked'))})}
 load(){this.loads++;this.paused=true;this.readyState=0;this._time=0;this.ended=false;if(!this.src)return;queueMicrotask(()=>{this.readyState=4;this.dispatchEvent(new Event('loadedmetadata'));this.dispatchEvent(new Event('loadeddata'));this.dispatchEvent(new Event('canplay'))})}
 play(){this.plays++;this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve()}
 pause(){this.paused=true}
 removeAttribute(key){if(key==='src')this.src=''}
 requestVideoFrameCallback(fn){const id=this.nextFrame++;this.frames.set(id,fn);return id}
 cancelVideoFrameCallback(id){this.frames.delete(id)}
 getVideoPlaybackQuality(){return {totalVideoFrames:this.presented,droppedVideoFrames:0}}
 step(ms){if(!this.paused&&!this.seeking&&!this.stalled&&this.readyState>=2){this._time+=ms/1000*this.playbackRate;this.presented++;const callbacks=[...this.frames.values()];this.frames.clear();for(const callback of callbacks)callback(0,{mediaTime:this._time,presentedFrames:this.presented})}}
}
const clip=(id,mediaId='a',start=0,end=10,speed=1)=>({id,mediaId,kind:'video',in:start,out:end,speed,volume:1});
const sources=[{id:'a',kind:'video',url:'blob:source-a',duration:100},{id:'b',kind:'video',url:'blob:source-b',duration:100},{id:'music',kind:'audio',url:'blob:music',duration:100}];
function fixture(options={}){
 let time=0,id=0;const scheduled=new Map(),videos=[new Media(options),new Media(options)],audio=new Media({video:false}),positions=[],states=[],draws=[],ends=[];
 const engine=new PlaybackEngine({videos,audio,now:()=>time,raf:fn=>{const key=++id;scheduled.set(key,fn);return key},caf:key=>scheduled.delete(key),onPosition:p=>positions.push(p),onFrame:()=>draws.push(engine.position),onState:s=>states.push(s),onEnd:()=>ends.push(engine.position)});
 async function step(ms=1000/60){time+=ms;for(const media of [...videos,audio])media.step(ms);const callbacks=[...scheduled.values()];scheduled.clear();for(const fn of callbacks)fn(time);await flush()}
 async function run(ms,frame=1000/60){for(let elapsed=0;elapsed<ms-.001;elapsed+=frame)await step(Math.min(frame,ms-elapsed))}
 return {engine,videos,audio,positions,states,draws,ends,step,run,scheduled};
}

test('paused preview schedules no animation frames or repeated drawing',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,null);await flush();const paints=f.draws.length;await f.run(10000);assert.equal(f.scheduled.size,0);assert.equal(f.draws.length,paints);assert.equal(f.engine.diagnostics().animationTicks,0);f.engine.dispose();
});
test('video is the master clock: a long decode stall causes zero catch-up seeks',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,null);await flush();f.engine.play();await flush();await f.run(1000);
 const media=f.engine.active.el,position=f.engine.position,seeks=media.seeks;media.stalled=true;media.readyState=2;media.dispatchEvent(new Event('waiting'));
 await f.run(3000);assert.equal(f.engine.position,position);assert.equal(media.seeks,seeks);assert.equal(f.engine.buffering,true);
 media.stalled=false;media.readyState=4;media.dispatchEvent(new Event('canplay'));await f.run(1000);assert.ok(Math.abs(f.engine.position-position-1)<.03);assert.equal(media.seeks,seeks);assert.equal(media.plays,1);f.engine.dispose();
});
test('next clip is preloaded and switches players without reloading either source',async()=>{
 const f=fixture();f.engine.update([clip('one','a',0,1),clip('two','b',4,6)],sources,null);await flush();
 assert.equal(f.videos[0].loads,1);assert.equal(f.videos[1].loads,1);assert.equal(f.videos[1].currentTime,4);const first=f.engine.active.el;
 f.engine.play();await flush();await f.run(1100);assert.notEqual(f.engine.active.el,first);assert.equal(f.engine.entry.clip.id,'two');assert.equal(first.paused,true);assert.equal(f.videos[0].loads+f.videos[1].loads,2);assert.ok(f.engine.position>=1&&f.engine.position<1.15);f.engine.dispose();
});
test('contiguous cuts keep the same decoder and never seek or preload duplicate footage',async()=>{
 const f=fixture();f.engine.update([clip('one','a',0,1),clip('two','a',1,2),clip('three','a',2,3)],sources,null);await flush();const source=f.engine.active.el;
 f.engine.play();await flush();await f.run(2600);assert.equal(f.engine.active.el,source);assert.equal(f.engine.entry.clip.id,'three');assert.equal(f.videos.reduce((n,v)=>n+v.loads,0),1);assert.equal(source.seeks,0);assert.equal(source.plays,1);f.engine.dispose();
});
test('speed mapping follows decoded source time while the soundtrack follows timeline time',async()=>{
 const f=fixture();f.engine.update([clip('fast','a',2,10,2)],sources,{mediaId:'music',volume:.3,start:0});await flush();f.engine.play();await flush();await f.run(1000);
 assert.ok(Math.abs(f.engine.position-1)<.02);assert.ok(Math.abs(f.engine.active.el.currentTime-4)<.03);assert.ok(Math.abs(f.audio.currentTime-1)<.03);assert.equal(f.engine.active.el.seeks,1);assert.equal(f.audio.plays,1);f.engine.dispose();
});
test('buffering pauses the soundtrack and resumes it without repeatedly restarting playback',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,{mediaId:'music',volume:.4,start:0});await flush();f.engine.play();await flush();await f.run(500);
 const source=f.engine.active.el;source.stalled=true;source.readyState=2;source.dispatchEvent(new Event('waiting'));await f.run(1000);assert.equal(f.audio.paused,true);const time=f.audio.currentTime;
 await f.run(1000);assert.equal(f.audio.currentTime,time);source.stalled=false;source.readyState=4;source.dispatchEvent(new Event('canplay'));await f.run(500);assert.equal(f.audio.paused,false);assert.equal(f.audio.plays,2);f.engine.dispose();
});
test('rapid seeks coalesce behind the decoder instead of issuing one seek per pointer event',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,null);await flush();const source=f.engine.active.el;
 for(let i=1;i<=100;i++)f.engine.seek(i/20);await flush();assert.equal(f.engine.position,5);assert.equal(source.currentTime,5);assert.ok(source.seeks<=2,`Issued ${source.seeks} seeks`);assert.equal(f.scheduled.size,0);f.engine.dispose();
});
test('mixed image/video timelines and browsers without frame callbacks reach the exact end',async()=>{
 const f=fixture({frames:false});f.engine.update([{id:'still',kind:'image',mediaId:'image',in:0,out:.5,speed:1},clip('one','a',0,1)],sources,null);await flush();f.engine.play();await flush();await f.run(1700);
 assert.equal(f.engine.position,1.5);assert.equal(f.engine.playing,false);assert.deepEqual(f.ends,[1.5]);assert.equal(f.scheduled.size,0);assert.ok(f.draws.length>10);f.engine.dispose();
});
test('a long montage handles preloaded discontinuous cuts and never exposes audio from both players',async()=>{
 const f=fixture();f.engine.update(Array.from({length:120},(_,i)=>clip('cut-'+i,i%2?'b':'a',i%5,i%5+.1)),sources,null);await flush();f.engine.play();await flush();
 for(let i=0;i<800&&f.engine.playing;i++){await f.step(1000/60);assert.ok(f.videos.filter(v=>!v.paused).length<=1)}
 assert.equal(f.engine.playing,false);assert.ok(Math.abs(f.engine.position-12)<.001);assert.equal(f.ends.length,1);f.engine.dispose();
});
test('hiding the editor suspends playback and manual pause cancels automatic resume',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,null);await flush();f.engine.play();await flush();await f.run(500);
 f.engine.setVisible(false);const position=f.engine.position;await f.run(2000);assert.equal(f.engine.position,position);assert.equal(f.scheduled.size,0);
 f.engine.setVisible(true);await flush();await f.run(500);assert.ok(f.engine.position>position);f.engine.setVisible(false);f.engine.pause();f.engine.setVisible(true);assert.equal(f.engine.playing,false);f.engine.dispose();
});
test('updating titles or clip color during playback does not reload or seek video',async()=>{
 const f=fixture();const clips=[clip('one')];f.engine.update(clips,sources,null);await flush();f.engine.play();await flush();await f.run(500);
 const media=f.engine.active.el,loads=media.loads,seeks=media.seeks;f.engine.update([{...clips[0],brightness:110}],sources,null,f.engine.position);await flush();await f.run(500);
 assert.equal(media.loads,loads);assert.equal(media.seeks,seeks);assert.equal(media.plays,1);assert.ok(f.engine.position>.95);f.engine.dispose();
});
test('rapid pause/resume ignores an old unresolved play promise',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,null);await flush();const source=f.engine.active.el,pending=[];
 source.play=function(){this.plays++;this.paused=false;return new Promise(resolve=>pending.push(resolve))};
 f.engine.play();f.engine.pause();f.engine.play();assert.equal(source.plays,2);for(const resolve of pending)resolve();await flush();await f.run(500);
 assert.equal(f.engine.playing,true);assert.equal(source.paused,false);assert.ok(f.engine.position>.45);f.engine.dispose();
});
test('changing a playing clip trim keeps its loaded decoder',async()=>{
 const f=fixture();f.engine.update([clip('one')],sources,null);await flush();const source=f.engine.active.el;f.engine.play();await flush();await f.run(500);
 f.engine.update([clip('one','a',0,7)],sources,null,f.engine.position);await flush();assert.equal(f.engine.active.el,source);assert.equal(source.loads,1);assert.equal(source.seeks,0);await f.run(500);assert.ok(f.engine.position>.95);f.engine.dispose();
});
