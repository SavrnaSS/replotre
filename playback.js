/* Media-clock playback. The browser displays video; JavaScript schedules edits and overlays. */
(()=>{
'use strict';
const bounded=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
// Linear fade envelope: 0→1 over fadeIn at the start, 1→0 over fadeOut at the end of a span of length dur.
// Equal-power crossfade gain for entry `index` at timeline `position`. Transitions are centred on the cut:
// across a dissolve of length d, p runs 0→1; the outgoing clip follows cos(pπ/2), the incoming sin(pπ/2),
// so combined loudness stays constant instead of dipping in the middle.
const xfadeLen=(entries,i)=>{if(i<=0||i>=entries.length)return 0;const d=+entries[i].clip.xfade||0;if(!(d>0))return 0;const a=entries[i-1],b=entries[i];return Math.min(d,a.end-a.start,b.end-b.start,3)};
const xfadeGainAt=(entries,index,position)=>{const e=entries[index];if(!e)return 1;const local=position-e.start,dur=e.end-e.start;let g=1;const din=xfadeLen(entries,index);if(din>0&&local<din/2)g*=Math.sin((.5+local/din)*Math.PI/2);const dout=xfadeLen(entries,index+1);if(dout>0&&local>dur-dout/2)g*=Math.cos(((local-(dur-dout/2))/dout)*Math.PI/2);return bounded(g,0,1)};
const fadeGain=(fadeIn,fadeOut,local,dur)=>{let g=1;if(fadeIn>0)g=Math.min(g,local/fadeIn);if(fadeOut>0)g=Math.min(g,(dur-local)/fadeOut);return bounded(g,0,1)};
class PlaybackEngine {
 constructor({videos,audio,onPosition=()=>{},onFrame=()=>{},onVideo=()=>{},onState=()=>{},onEnd=()=>{},onError=()=>{},now=()=>performance.now(),raf=fn=>requestAnimationFrame(fn),caf=id=>cancelAnimationFrame(id)}){
  this.audio=audio;this.onPosition=onPosition;this.onFrame=onFrame;this.onVideo=onVideo;this.onState=onState;this.onEnd=onEnd;this.onError=onError;this.now=now;this.raf=raf;this.caf=caf;
  this.entries=[];this.media=new Map();this.music=null;this.duration=0;this.position=0;this.playing=false;this.buffering=false;this.visible=true;this.resumeOnVisible=false;this.entry=null;this.active=null;this.displayed=null;this.rafId=null;this.anchorTime=0;this.anchorPosition=0;this.lastAudioSync=-Infinity;this.lastFrame=-Infinity;this.lastState='';this.audioUrl=null;this.audioPlayPending=false;this.disposed=false;
  this.stats={sourceLoads:0,sourceSeeks:0,clipChanges:0,animationTicks:0,videoFrames:0};this.unlisten=[];
  this.slots=videos.map(el=>({el,url:null,key:null,target:null,playPending:false,frameId:null,epoch:0,waiting:false}));
  for(const slot of this.slots){
   slot.el.preload='auto';slot.el.playsInline=true;
   for(const event of ['loadedmetadata','loadeddata','canplay','seeked'])this.listen(slot.el,event,()=>{if(slot.el.readyState>=3)slot.waiting=false;this.ready(slot)});
   this.listen(slot.el,'playing',()=>{slot.waiting=false;if(slot===this.active)this.setBuffering(false)});
   this.listen(slot.el,'waiting',()=>{slot.waiting=true;if(slot===this.active&&this.playing)this.setBuffering(true)});
   this.listen(slot.el,'ended',()=>{if(slot===this.active&&this.playing)this.advance()});
   this.listen(slot.el,'error',()=>{if(slot===this.active){this.pause();this.onError('This video could not be decoded. Try an MP4/H.264 copy.')}});
  }
  if(audio){this.listen(audio,'loadedmetadata',()=>this.syncAudio(true));this.listen(audio,'canplay',()=>this.syncAudio(true))}
 }
 listen(el,event,fn){el.addEventListener(event,fn);this.unlisten.push(()=>el.removeEventListener(event,fn))}
 at(position=this.position){
  if(!this.entries.length)return null;let lo=0,hi=this.entries.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(position<this.entries[mid].end)hi=mid;else lo=mid+1}
  return this.entries[lo];
 }
 source(entry){const m=this.media.get(entry?.clip.mediaId);return m?.previewUrl||m?.url||null}
 key(entry){return entry?`${entry.clip.id}:${this.source(entry)}:${entry.clip.in}:${entry.clip.out}:${entry.clip.speed}`:null}
 update(clips,media,music,position=this.position){
  let cursor=0;this.media=new Map(media.map(m=>[m.id,m]));this.music=music?{...music}:null;
  this.entries=clips.map((clip,index)=>{const start=cursor;cursor+=Math.max(.1,(clip.out-clip.in)/(clip.speed||1));return {clip:{...clip},index,start,end:cursor}});this.duration=cursor;this.position=bounded(position,0,cursor);
  if(!this.entries.length){this.pause();this.entry=null;this.active=null;this.displayed=null;this.onVideo(null,null);this.emitPosition();this.onFrame();return}
  this.activate(this.at(),false);this.syncAudio(true);this.emitPosition();this.onFrame();
 }
 seek(position){
  this.position=bounded(position,0,this.duration);this.activate(this.at(),true);this.syncAudio(true);this.emitPosition();this.onFrame();
  if(this.playing)this.schedule();
 }
 play(){
  if(!this.entries.length)return false;if(!this.visible){this.resumeOnVisible=true;return false}
  if(this.position>=this.duration-.001)this.seek(0);
  this.playing=true;this.anchorTime=this.now();this.anchorPosition=this.position;
  if(!this.entry)this.activate(this.at(),false);
  if(this.active){this.start(this.active);this.ready(this.active)}else this.setBuffering(false);
  this.syncAudio(true);this.emitState();this.schedule();return true;
 }
 pause(){
  this.playing=false;this.resumeOnVisible=false;if(this.rafId!==null){this.caf(this.rafId);this.rafId=null}
  for(const slot of this.slots){slot.epoch++;slot.playPending=false;slot.el.pause();this.cancelVideoFrames(slot)}this.audio?.pause();this.buffering=false;this.emitState();
 }
 activate(entry,forceSeek){
  if(!entry)return;const previous=this.entry,oldActive=this.active,key=this.key(entry),url=this.source(entry);this.entry=entry;
  this.anchorTime=this.now();this.anchorPosition=this.position;
  if(entry.clip.kind!=='video'||!url){
   if(oldActive){oldActive.el.pause();this.cancelVideoFrames(oldActive)}this.active=null;this.displayed=null;this.onVideo(null,entry.clip);this.setBuffering(false);this.prepareNext();return;
  }
  const continuous=!forceSeek&&oldActive&&oldActive.url===url&&previous?.clip.mediaId===entry.clip.mediaId&&Math.abs(previous.clip.out-entry.clip.in)<.025&&Math.abs(this.position-entry.start)<.04;
  const sameClip=oldActive&&oldActive.url===url&&previous?.clip.id===entry.clip.id;
  let slot=oldActive?.key===key||sameClip?oldActive:continuous?oldActive:this.slots.find(s=>s.key===key);
  if(!slot)slot=oldActive?.url===url&&forceSeek?oldActive:this.slots.find(s=>s!==oldActive)||this.slots[0];
  const changed=slot!==oldActive||slot.key!==key;
  if(changed){this.stats.clipChanges++;if(oldActive&&oldActive!==slot){oldActive.el.pause();this.cancelVideoFrames(oldActive)}}
  this.active=slot;
  const target=entry.clip.in+(this.position-entry.start)*(entry.clip.speed||1);
  if(slot.url!==url){this.load(slot,url,key,target)}else{
   slot.key=key;
   if(!continuous&&(forceSeek||changed))slot.target=target;
  }
  if(slot.el.playbackRate!==(entry.clip.speed||1))slot.el.playbackRate=entry.clip.speed||1;
  const volume=bounded((entry.clip.volume??1)*this.clipGain(entry),0,1);if(slot.el.volume!==volume)slot.el.volume=volume;
  slot.el.muted=false;
  if(this.settle(slot)){this.show(slot);if(this.playing)this.start(slot);this.setBuffering(slot.waiting&&this.playing)}else this.setBuffering(this.playing);
  if(this.playing)this.schedule();
 }
 load(slot,url,key,target){
  slot.el.pause();this.cancelVideoFrames(slot);slot.epoch++;slot.playPending=false;slot.waiting=false;slot.url=url;slot.key=key;slot.target=target;slot.el.muted=true;
  slot.el.src=url;slot.el.load();this.stats.sourceLoads++;
 }
 settle(slot){
  const el=slot.el;if(el.readyState<1||el.seeking)return false;
  if(slot.target!==null){
   if(Math.abs(el.currentTime-slot.target)>.025){try{el.currentTime=slot.target;this.stats.sourceSeeks++}catch{}return false}
   slot.target=null;
  }
  return el.readyState>=2&&!el.seeking;
 }
 ready(slot){
  if(this.disposed||!slot.url||!this.settle(slot))return;
  if(slot!==this.active){slot.el.pause();return}
  this.show(slot);this.setBuffering(slot.waiting&&this.playing);
  if(this.playing){this.start(slot);this.schedule()}
  this.onFrame();
 }
 show(slot){
  this.displayed=slot;this.onVideo(slot.el,this.entry?.clip);this.prepareNext();
 }
 prepareNext(){
  if(!this.entry)return;if(this.active&&this.displayed!==this.active)return;
  const next=this.entries.slice(this.entry.index+1,this.entry.index+4).find(e=>e.clip.kind==='video'&&this.source(e));if(!next)return;
  if(this.active&&next.index===this.entry.index+1&&this.source(next)===this.active.url&&Math.abs(this.entry.clip.out-next.clip.in)<.025)return;
  const key=this.key(next);if(this.slots.some(s=>s.key===key))return;
  const spare=this.slots.find(s=>s!==this.active)||this.slots[0];this.load(spare,this.source(next),key,next.clip.in);this.settle(spare);
 }
 start(slot){
  if(!this.playing||!this.visible||slot!==this.active||slot.playPending||slot.el.seeking||slot.target!==null||slot.el.readyState<2)return;
  if(!slot.el.paused){this.armVideoFrames(slot);return}
  const epoch=slot.epoch;slot.playPending=true;
  let result;try{result=slot.el.play()}catch(e){slot.playPending=false;this.failPlay(e);return}
  Promise.resolve(result).then(()=>{if(slot.epoch!==epoch)return;slot.playPending=false;if(slot!==this.active||!this.playing)slot.el.pause();else this.armVideoFrames(slot)}).catch(e=>{if(slot.epoch!==epoch)return;slot.playPending=false;this.failPlay(e)});
 }
 failPlay(error){if(error?.name==='AbortError')return;this.pause();this.onError(error?.name==='NotAllowedError'?'Press Play to allow video playback.':'Playback failed. Try reopening this clip.')}
 armVideoFrames(slot){
  if(slot.frameId!==null||!slot.el.requestVideoFrameCallback||!this.playing||slot!==this.active)return;
  slot.frameId=slot.el.requestVideoFrameCallback((time,metadata)=>{slot.frameId=null;if(slot!==this.active||!this.playing)return;this.stats.videoFrames++;this.onFrame(metadata);this.armVideoFrames(slot)});
 }
 cancelVideoFrames(slot){if(slot.frameId!==null){slot.el.cancelVideoFrameCallback?.(slot.frameId);slot.frameId=null}}
 setBuffering(value){if(this.buffering===value)return;this.buffering=value;if(value)this.audio?.pause();else if(this.playing)this.syncAudio(true);this.emitState()}
 emitState(){const value=`${this.playing}:${this.buffering}`;if(value===this.lastState)return;this.lastState=value;this.onState({playing:this.playing,buffering:this.buffering})}
 emitPosition(){this.onPosition(this.position,this.entry)}
 advance(){
  if(!this.entry)return;const next=this.entries[this.entry.index+1];
  this.position=this.entry.end;
  if(!next){this.position=this.duration;this.emitPosition();this.pause();this.onFrame();this.onEnd();return}
  this.activate(next,false);this.syncAudio(true);this.emitPosition();this.onFrame();
 }
 schedule(){if(this.playing&&this.visible&&!this.disposed&&this.rafId===null)this.rafId=this.raf(time=>{this.rafId=null;this.tick(time)})}
 clipGain(entry){const c=entry?.clip;if(!c)return 1;let g=xfadeGainAt(this.entries,entry.index,this.position);if(c.fadeIn>0||c.fadeOut>0)g*=fadeGain(c.fadeIn||0,c.fadeOut||0,this.position-entry.start,entry.end-entry.start);return g}
 musicVolume(){const mu=this.music;if(!mu)return 0;const base=bounded(mu.volume??.3,0,1);if(!(mu.fadeIn>0||mu.fadeOut>0))return base;const m=this.media.get(mu.mediaId),start=mu.start||0,end=Math.min(this.duration||Infinity,start+(m?.duration||Infinity));return bounded(base*fadeGain(mu.fadeIn||0,mu.fadeOut||0,this.position-start,end-start),0,1)}
 applyGains(){if(this.active&&this.entry){const v=bounded((this.entry.clip.volume??1)*this.clipGain(this.entry),0,1);if(Math.abs(this.active.el.volume-v)>.001)this.active.el.volume=v}if(this.audio&&this.music){const v=this.musicVolume();if(Math.abs(this.audio.volume-v)>.001)this.audio.volume=v}}
 tick(time){
  if(!this.playing||!this.visible||this.disposed)return;this.stats.animationTicks++;
  if(this.active){
   const slot=this.active,el=slot.el;
   if(slot.target!==null)this.ready(slot);
   if(slot.target===null&&el.readyState>=2&&!el.seeking){
    if(el.currentTime>=this.entry.clip.out-.003||el.ended){this.advance();if(!this.playing)return}
    else{this.position=bounded(this.entry.start+(el.currentTime-this.entry.clip.in)/(this.entry.clip.speed||1),this.entry.start,this.entry.end);this.setBuffering(slot.waiting||el.paused&&!slot.playPending);}
   }else this.setBuffering(true);
  }else{
   const target=this.anchorPosition+(time-this.anchorTime)/1000;
   if(target>=this.entry.end){this.advance();if(!this.playing)return}else this.position=target;
  }
  this.emitPosition();this.applyGains();
  if(time-this.lastAudioSync>=200){this.lastAudioSync=time;this.syncAudio()}
  if((!this.active||!this.active.el.requestVideoFrameCallback)&&time-this.lastFrame>=1000/30){this.lastFrame=time;this.onFrame()}
  this.schedule();
 }
 syncAudio(force=false){
  const el=this.audio,m=this.music&&this.media.get(this.music.mediaId);if(!el)return;
  if(!m||m.kind!=='audio'){if(!el.paused)el.pause();return}
  if(this.audioUrl!==m.url){el.pause();this.audioUrl=m.url;el.src=m.url;el.load();this.audioPlayPending=false;force=true}
  const volume=this.musicVolume();if(Math.abs(el.volume-volume)>.001)el.volume=volume;
  const target=this.position-(this.music.start||0),inside=target>=0&&target<(m.duration||Infinity);
  if(!inside||!this.playing||this.buffering||!this.visible){if(!el.paused)el.pause();return}
  if(el.readyState>=1&&!el.seeking&&(force||Math.abs(el.currentTime-target)>.18)&&Math.abs(el.currentTime-target)>.025)try{el.currentTime=target}catch{}
  if(el.readyState>=2&&el.paused&&!this.audioPlayPending){this.audioPlayPending=true;Promise.resolve(el.play()).catch(()=>{}).finally(()=>{this.audioPlayPending=false;if(!this.playing||this.buffering||!this.visible)el.pause()})}
 }
 setVisible(visible){if(visible===this.visible)return;const resume=this.playing||this.resumeOnVisible;this.visible=visible;if(!visible){this.pause();this.resumeOnVisible=resume}else if(resume){this.resumeOnVisible=false;this.play()}}
 reset(){this.pause();for(const slot of this.slots){slot.epoch++;slot.url=null;slot.key=null;slot.target=null;slot.playPending=false;slot.el.removeAttribute('src');slot.el.load()}if(this.audio){this.audio.removeAttribute('src');this.audio.load()}this.audioUrl=null;this.entry=null;this.active=null;this.displayed=null;this.entries=[];this.media.clear();this.duration=0;this.position=0;this.onVideo(null,null)}
 diagnostics(){const quality=this.slots.map(s=>s.el.getVideoPlaybackQuality?.()).filter(Boolean);return {...this.stats,position:this.position,playing:this.playing,buffering:this.buffering,totalVideoFrames:quality.reduce((n,q)=>n+q.totalVideoFrames,0),droppedVideoFrames:quality.reduce((n,q)=>n+q.droppedVideoFrames,0)}}
 dispose(){this.reset();this.disposed=true;this.unlisten.splice(0).forEach(fn=>fn())}
}
globalThis.ReplotrePlayback={PlaybackEngine,fadeGain,xfadeGainAt};
})();
