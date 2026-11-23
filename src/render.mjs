import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {uuid,now,err,finite} from './core.mjs';
import {probe} from './media.mjs';
import {renderPublic} from './database.mjs';
const fmt=n=>Number(n).toFixed(5);
// Cut a project snapshot down to the timeline range [start,end): clips are trimmed at the edges, titles are
// clipped and shifted to the new zero, and the soundtrack keeps playing from where the range begins.
const num=(v,d)=>{const n=Number(v);return Number.isFinite(n)?n:d};
// Crossfade into clip i, centred on the cut: it borrows d/2 from each neighbour, so it can be at most the shorter clip.
// ffmpeg expression for a keyframed value at time T, eased exactly like the editor (smoothstep between keys).
/* Effects: warmth (colour balance), vignette, blur. Values are validated numbers, so the filter strings stay controlled. */
function fxFilters(clip){let f='';const w=Math.max(-100,Math.min(100,Number(clip.warmth)||0)),v=Math.max(0,Math.min(100,Number(clip.vignette)||0)),b=Math.max(0,Math.min(100,Number(clip.blur)||0));
 if(w){const k=(w/100*.3).toFixed(3),h=(w/100*.15).toFixed(3);f+=`,colorbalance=rm=${k}:bm=${-k}:rs=${h}:bs=${-h}`}
 if(v)f+=`,vignette=angle=${(0.25+v/100*0.85).toFixed(3)}`;if(b)f+=`,gblur=sigma=${(b/100*10).toFixed(2)}`;return f}
export function keyExpr(keys,p,T){const k=keys;let e=fmt(k[k.length-1][p]);for(let i=k.length-2;i>=0;i--){const a=k[i],b=k[i+1],X=`((${T}-${fmt(a.t)})/${fmt(Math.max(1e-6,b.t-a.t))})`;e=`if(lt(${T},${fmt(b.t)}),${fmt(a[p])}+(${fmt(b[p]-a[p])})*${X}*${X}*(3-2*${X}),${e})`}return `if(lt(${T},${fmt(k[0].t)}),${fmt(k[0][p])},${e})`}
// Animated framing: scale to cover (Fill) or letterbox (Fit), then `perspective` maps the moving zoom/pan window onto
// the frame with sub-pixel interpolation (no zoompan jitter). Geometry mirrors drawFramed() in the editor.
export function keyedFrameFilter(keys,fit,iw,ih,w,h){iw=iw||w;ih=ih||h;const s0=fit?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih),cw=Math.max(2,Math.round(iw*s0/2)*2),ch=Math.max(2,Math.round(ih*s0/2)*2);
 const T='(in/30)',Z=`(${keyExpr(keys,'zoom',T)})`,PX=`(${keyExpr(keys,'panX',T)})`,PY=`(${keyExpr(keys,'panY',T)})`,ww=`(${w}/${Z})`,wh=`(${h}/${Z})`;
 const L=fit?`((${w}-${cw})/2+(${cw}-${ww})/2*(1+if(gt(${cw}*${Z},${w}),${PX},0)))`:`((${cw}-${ww})/2*(1+${PX}))`,Tp=fit?`((${h}-${ch})/2+(${ch}-${wh})/2*(1+if(gt(${ch}*${Z},${h}),${PY},0)))`:`((${ch}-${wh})/2*(1+${PY}))`;
 const persp=`perspective=x0='${L}':y0='${Tp}':x1='${L}+${ww}':y1='${Tp}':x2='${L}':y2='${Tp}+${wh}':x3='${L}+${ww}':y3='${Tp}+${wh}':interpolation=linear:eval=frame`;
 return fit?`scale=${cw}:${ch},setsar=1,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black,${persp}`:`scale=${cw}:${ch},setsar=1,${persp},scale=${w}:${h}`}
export function xfadeAt(clips,i,durs){if(i<=0)return 0;const d=num(clips[i]?.xfade,0);return d>0?Math.min(d,durs[i-1],durs[i],3):0}
export function sliceTimeline(data,start,end){
 const total=(data.clips||[]).reduce((n,c)=>n+(c.out-c.in)/(c.speed||1),0);
 start=Math.max(0,num(start,0));end=Math.min(total,num(end,total));
 if(!(end-start>=.2))err(400,'The export range must be at least 0.2 seconds long');
 let cursor=0;const clips=[];
 for(const c of data.clips||[]){const sp=c.speed||1,s=cursor,e=cursor+(c.out-c.in)/sp;cursor=e;if(e<=start+1e-6||s>=end-1e-6)continue;
  const from=Math.max(s,start),to=Math.min(e,end);if(to-from<.1)continue;clips.push({...c,...(Array.isArray(c.keys)&&c.keys.length&&from>s+1e-6?{keys:c.keys.map(k=>({...k,t:+(k.t-(from-s)).toFixed(4)}))}:{}),in:c.in+(from-s)*sp,out:c.in+(to-s)*sp,...(from>s+1e-6?{fadeIn:0}:{}),...(to<e-1e-6?{fadeOut:0}:{})})}
 const texts=(data.texts||[]).filter(t=>t.start<end&&t.start+t.duration>start).map(t=>{const s=Math.max(t.start,start),e=Math.min(t.start+t.duration,end);return {...t,start:s-start,duration:e-s}}).filter(t=>t.duration>=.1);
 if(clips[0])clips[0]={...clips[0],xfade:0};
 return {...data,clips,texts,music:data.music?{...data.music,offset:num(data.music.offset,0)+start}:data.music,range:{start,end}}}
function validateRender(db,project,user,data){
 const clips=data.clips; if(!clips.length)err(400,'Add footage to the timeline before rendering');if(clips.length>120)err(400,'MP4 rendering supports up to 120 clips per render');
 let duration=0;const source=[];
 for(const clip of clips){if(clip.kind==='demo')err(400,'Sample scenes cannot be rendered to MP4. Replace them with your uploaded footage.');const media=db.prepare('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?').get(clip.mediaId,project.id,user.id);if(!media)err(400,'An asset in the timeline is missing');if(!['video','image'].includes(media.kind)||media.kind!==clip.kind)err(400,'A timeline asset has the wrong type');if(clip.out>media.duration+0.3&&media.kind==='video')err(400,'Clip trim exceeds media length');const dur=(clip.out-clip.in)/clip.speed;if(dur<.1||dur>300)err(400,'Clip duration outside supported range');duration+=dur;source.push({clip,media,dur,raw:clip.out-clip.in})}
 if(duration>300)err(400,'MP4 renders currently support videos up to five minutes');
 const music=data.music?db.prepare('SELECT * FROM assets WHERE id=? AND project_id=? AND user_id=?').get(data.music.mediaId,project.id,user.id):null;
 if(data.music&&(!music||music.kind!=='audio'))err(400,'Soundtrack asset is missing');
 return {source,music,duration};
}
export class RenderQueue{
 constructor(db,dataDir,hub){this.db=db;this.dataDir=dataDir;this.hub=hub;this.jobs=db.prepare("SELECT id FROM renders WHERE status='queued' ORDER BY created_at").all().map(r=>r.id);this.active=null;this.idle=null;this.currentProcess=null;this.closing=false;queueMicrotask(()=>this.pump())}
 emit(id){const row=this.db.prepare('SELECT * FROM renders WHERE id=?').get(id);if(row)this.hub?.publish(row.user_id,'render.updated',{render:renderPublic(row)},row.project_id)}
 request(project,user,resolution,snapshot=null,range=null){if(![720,1080].includes(resolution))err(400,'Resolution must be 720 or 1080');let encoded=snapshot||project.data_json,data=JSON.parse(encoded);if(range&&!snapshot){data=sliceTimeline(data,range.start,range.end);encoded=JSON.stringify(data)}validateRender(this.db,project,user,data);const active=this.db.prepare("SELECT COUNT(*) n FROM renders WHERE user_id=? AND status IN ('queued','running')").get(user.id).n;if(active>=2)err(429,'Two render jobs are already queued');
 const id=uuid(),t=now();this.db.prepare('INSERT INTO renders(id,project_id,user_id,status,resolution,progress,snapshot_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,project.id,user.id,'queued',resolution,0,encoded,t,t);this.jobs.push(id);this.emit(id);queueMicrotask(()=>this.pump());return renderPublic(this.db.prepare('SELECT * FROM renders WHERE id=?').get(id))}
 cancel(id){const row=this.db.prepare('SELECT * FROM renders WHERE id=?').get(id);if(!row)return;if(['queued','running'].includes(row.status)){this.db.prepare("UPDATE renders SET status='cancelled',error=NULL,updated_at=? WHERE id=?").run(now(),id);this.jobs=this.jobs.filter(j=>j!==id);if(this.active===id)this.currentProcess?.kill('SIGKILL');this.emit(id)}return renderPublic(this.db.prepare('SELECT * FROM renders WHERE id=?').get(id))}
 cancelProject(id){for(const row of this.db.prepare("SELECT id FROM renders WHERE project_id=? AND status IN ('queued','running')").all(id))this.cancel(row.id)}
 async pump(){if(this.active||this.closing)return;const id=this.jobs.shift();if(!id)return;let release;this.idle=new Promise(resolve=>release=resolve);this.active=id;try{await this.execute(id)}catch(e){const row=this.db.prepare('SELECT status FROM renders WHERE id=?').get(id);if(row&&row.status!=='cancelled'){console.error('[render]',id,e.message);this.db.prepare("UPDATE renders SET status='failed',error=?,updated_at=? WHERE id=?").run(String(e.message||'Rendering failed').slice(0,250),now(),id);this.emit(id)}}finally{this.active=null;this.currentProcess=null;release();this.idle=null;this.pump()}}
 async execute(id){const job=this.db.prepare('SELECT * FROM renders WHERE id=?').get(id);if(!job||job.status!=='queued')return;const project=this.db.prepare('SELECT * FROM projects WHERE id=? AND user_id=?').get(job.project_id,job.user_id);const user=this.db.prepare('SELECT id FROM users WHERE id=?').get(job.user_id);if(!project||!user)throw Error('Project was removed');const data=JSON.parse(job.snapshot_json||project.data_json);const {source,music,duration}=validateRender(this.db,project,user,data);
 this.db.prepare("UPDATE renders SET status='running',updated_at=? WHERE id=?").run(now(),id);
 this.emit(id);
 const temp=await mkdtemp(path.join(os.tmpdir(),'replotre-render-'));const outputName=`renders/${id}.mp4`,output=path.join(this.dataDir,outputName);await mkdir(path.dirname(output),{recursive:true});
 try{
 const h=job.resolution===1080?1080:720,w=Math.round(h*({'9:16':9/16,'16:9':16/9,'1:1':1,'4:5':4/5}[data.aspect]||9/16)/2)*2;const args=['-hide_banner','-nostdin','-y','-loglevel','error','-progress','pipe:2'];const meta=[];
 const durs0=source.map(s=>s.dur),xf0=source.map((_,i)=>xfadeAt(source.map(s=>s.clip),i,durs0)),anyXf=xf0.some(d=>d>0);
 // Audio handles (source seconds) beyond each edit point, used so sound can genuinely overlap during a crossfade.
 const hs=source.map((s,i)=>{if(s.media.kind!=='video'||!anyXf)return {pre:0,post:0};const sp=s.clip.speed||1,md=num(s.media.duration,0);return {pre:Math.max(0,Math.min(xf0[i]/2*sp,s.clip.in)),post:Math.max(0,Math.min((xf0[i+1]||0)/2*sp,md>0?md-s.clip.out:0))}});
 for(let k=0;k<source.length;k++){const s=source[k],f=path.join(this.dataDir,s.media.stored_name);args.push('-threads','1');if(s.media.kind==='image')args.push('-loop','1','-t',fmt(s.dur),'-i',f);else args.push('-ss',fmt(s.clip.in-hs[k].pre),'-t',fmt(s.raw+hs[k].pre+hs[k].post),'-i',f);meta.push(s.media.kind==='video'?await probe(f):Array.isArray(s.clip.keys)&&s.clip.keys.length?{...await probe(f).catch(()=>({})),hasAudio:false}:{hasAudio:false})}
 let musicIndex=-1;if(music){musicIndex=source.length;const md=num(music.duration,0),offset=md>0?Math.max(0,num(data.music.offset,0))%md:Math.max(0,num(data.music.offset,0));args.push('-stream_loop','-1');if(offset>.01)args.push('-ss',fmt(offset));args.push('-i',path.join(this.dataDir,music.stored_name))}
 const filters=[],toConcat=[];
 for(let i=0;i<source.length;i++){
  const {clip,dur,raw,media}=source[i];const rate=clip.speed;
  const z=Math.min(3,Math.max(1,num(clip.zoom,1))),px=Math.min(1,Math.max(-1,num(clip.panX,0))),py=Math.min(1,Math.max(-1,num(clip.panY,0))),zw=Math.round(w*z/2)*2,zh=Math.round(h*z/2)*2;
  // Framing mirrors the editor preview: Fill crops to the frame, Fit letterboxes; zoom + pan choose the visible region.
  const frame=Array.isArray(clip.keys)&&clip.keys.length?keyedFrameFilter(clip.keys,clip.fit==='fit',meta[i].width||num(media.width,0),meta[i].height||num(media.height,0),w,h):clip.fit==='fit'
   ?`scale=${zw}:${zh}:force_original_aspect_ratio=decrease,crop=w='min(iw,${w})':h='min(ih,${h})':x='(iw-min(iw,${w}))/2*(1+${fmt(px)})':y='(ih-min(ih,${h}))/2*(1+${fmt(py)})',pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`
   :`scale=${zw}:${zh}:force_original_aspect_ratio=increase,crop=${w}:${h}:x='(iw-ow)/2*(1+${fmt(px)})':y='(ih-oh)/2*(1+${fmt(py)})'`;
  const fi=Math.min(num(clip.fadeIn,0),dur/2),fo=Math.min(num(clip.fadeOut,0),dur/2);
  const fades=`${fi>0?`,fade=t=in:st=0:d=${fmt(fi)}`:''}${fo>0?`,fade=t=out:st=${fmt(dur-fo)}:d=${fmt(fo)}`:''}`;
  const afades=`${fi>0?`,afade=t=in:st=0:d=${fmt(fi)}`:''}${fo>0?`,afade=t=out:st=${fmt(dur-fo)}:d=${fmt(fo)}`:''}`;
  const vf=`[${i}:v:0]${media.kind==='image'?`trim=duration=${fmt(dur)},setpts=PTS-STARTPTS`:`trim=start=${fmt(hs[i].pre)}:duration=${fmt(raw)},setpts=(PTS-STARTPTS)/${fmt(rate)}`},fps=30,${frame},setsar=1${clip.flipH===true?',hflip':''},eq=brightness=${fmt(((clip.brightness??100)-100)/200)}:contrast=${fmt(num(clip.contrast,100)/100)}:saturation=${fmt((clip.saturation??100)/100)}${fxFilters(clip)}${fades},format=yuv420p[v${i}]`;
  filters.push(vf);
  const preNeed=anyXf?xf0[i]/2:0,postNeed=anyXf?(xf0[i+1]||0)/2:0;
  if(meta[i].hasAudio){const tempo=rate<.5?`atempo=0.5,atempo=${fmt(rate*2)}`:`atempo=${fmt(rate)}`;
   if(!anyXf)filters.push(`[${i}:a:0]atrim=duration=${fmt(raw)},asetpts=PTS-STARTPTS,${tempo},volume=${fmt(clip.volume??1)},aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=duration=${fmt(dur)}${afades}[a${i}]`);
   else{// Extended segment: [silence?][real pre-roll][clip][real post-roll][silence?] — exactly preNeed + dur + postNeed long.
    const realPre=hs[i].pre/rate,realPost=hs[i].post/rate,lead=Math.max(0,preNeed-realPre),sfades=`${fi>0?`,afade=t=in:st=${fmt(realPre)}:d=${fmt(fi)}`:''}${fo>0?`,afade=t=out:st=${fmt(realPre+dur-fo)}:d=${fmt(fo)}`:''}`;
    filters.push(`[${i}:a:0]atrim=duration=${fmt(raw+hs[i].pre+hs[i].post)},asetpts=PTS-STARTPTS,${tempo},volume=${fmt(clip.volume??1)},aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=duration=${fmt(realPre+dur+realPost)}${sfades}${lead>.0005?`,adelay=delays=${Math.round(lead*1000)}:all=1`:''},apad,atrim=duration=${fmt(preNeed+dur+postNeed)}[a${i}]`)}}
  else filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${fmt(preNeed+dur+postNeed)},asetpts=PTS-STARTPTS[a${i}]`);
  toConcat.push(`[v${i}][a${i}]`)
 }
 const durs=source.map(s=>s.dur),xf=source.map((_,i)=>xfadeAt(source.map(s=>s.clip),i,durs));
 if(!xf.some(d=>d>0))filters.push(`${toConcat.join('')}concat=n=${source.length}:v=1:a=1[vconcat][aconcat]`);
 else{
  // Pad each segment with its own frozen edge frame (d/2 each side of a transition), then chain xfade/concat.
  // Pads and overlaps cancel exactly, so the programme length — and every title, marker and caption — is unchanged.
  for(let i=0;i<source.length;i++){const pre=xf[i]/2,post=(xf[i+1]||0)/2;filters.push(`[v${i}]${pre>0||post>0?`tpad=${pre>0?`start_mode=clone:start_duration=${fmt(pre)}`:''}${pre>0&&post>0?':':''}${post>0?`stop_mode=clone:stop_duration=${fmt(post)}`:''}`:'null'},settb=1/30[p${i}]`)}
  let acc='p0',accLen=durs[0]+(xf[1]||0)/2;
  for(let i=1;i<source.length;i++){const len=durs[i]+xf[i]/2+(xf[i+1]||0)/2,outLabel=i===source.length-1?'vconcat':`x${i}`;
   if(xf[i]>0){filters.push(`[${acc}][p${i}]xfade=transition=fade:duration=${fmt(xf[i])}:offset=${fmt(accLen-xf[i])}[${outLabel}]`);accLen+=len-xf[i]}
   else{filters.push(`[${acc}][p${i}]concat=n=2:v=1:a=0[${outLabel}]`);accLen+=len}
   acc=outLabel}
  if(source.length===1)filters.push(`[p0]null[vconcat]`);
  // Sound: overlap the extended segments with an equal-power crossfade (quarter-sine curves) at each transition.
  let aacc='a0';for(let i=1;i<source.length;i++){const lbl=i===source.length-1?'aconcat':`ax${i}`;filters.push(xf[i]>0?`[${aacc}][a${i}]acrossfade=d=${fmt(xf[i])}:c1=qsin:c2=qsin[${lbl}]`:`[${aacc}][a${i}]concat=n=2:v=0:a=1[${lbl}]`);aacc=lbl}}
 const texts=data.texts.filter(t=>t.text.trim()&&t.start<duration&&t.start+t.duration>0).slice(0,120);let previous='vconcat';
 const font=process.env.FONT_FILE||'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
 for(let j=0;j<texts.length;j++){
  const t=texts[j],file=path.join(temp,`title-${j}.txt`);await writeFile(file,t.text.slice(0,500),'utf8');
  const fontsize=Math.round((t.fontSize||42)*w/(data.aspect==='16:9'?960:540));
  const st=fmt(t.start),en=fmt(Math.min(duration,t.start+t.duration)),anim=['fade','slide','none'].includes(t.anim)?t.anim:'fade';
  const free=Number.isFinite(t.x)&&Number.isFinite(t.y),y0=free?`(h*${fmt(t.y)}-text_h/2)`:t.position==='top'?'(h*0.2-text_h/2)':t.position==='bottom'?'(h*0.78-text_h/2)':'(h*0.53-text_h/2)',x=free?`(w*${fmt(t.x)}-text_w/2)`:'(w-text_w)/2';
  const textColor=/^#[0-9a-fA-F]{6}$/.test(t.color)?t.color:'#ffffff';
  // Filter arguments are restricted to controlled paths and validated numeric and hex values.
  const fsz=Math.max(12,Math.min(140,fontsize)),y=anim==='slide'&&t.cutIn!==true?`'${y0}+pow(1-min(1,(t-${st})/0.35),2)*h*0.04'`:y0,ain=t.cutIn===true?'1':`(t-${st})/0.22`,aout=t.cutOut===true?'1':`(${en}-t)/0.18`,alpha=anim==='none'||ain==='1'&&aout==='1'?'':`:alpha='max(0,min(1,min(${ain},${aout})))'`,boxOn=t.bg==='box'||(t.kind==='caption'&&t.bg!=='none'),boxColor=/^#[0-9a-fA-F]{6}$/.test(t.bgColor||'')?`0x${t.bgColor.slice(1)}@0.9`:'black@0.55',box=boxOn?`:box=1:boxcolor=${boxColor}:boxborderw=${Math.round(fsz*.35)}`:'';
  filters.push(`[${previous}]drawtext=fontfile=${font}:textfile=${file}:fontcolor=0x${textColor.slice(1)}:fontsize=${fsz}${alpha}${box}:x=${x}:y=${y}:shadowcolor=black@0.8:shadowx=2:shadowy=2:enable='between(t,${fmt(t.start)},${fmt(Math.min(duration,t.start+t.duration))})'[vtext${j}]`);
  previous=`vtext${j}`;
 }
 filters.push(`[${previous}]format=yuv420p[vout]`);
 let audioOutput='aconcat';if(music){const mfi=Math.min(num(data.music.fadeIn,0),duration/2),mfo=Math.min(num(data.music.fadeOut,0),duration/2);filters.push(`[${musicIndex}:a:0]atrim=duration=${fmt(duration)},asetpts=PTS-STARTPTS,volume=${fmt(data.music.volume??.3)}${mfi>0?`,afade=t=in:st=0:d=${fmt(mfi)}`:''}${mfo>0?`,afade=t=out:st=${fmt(duration-mfo)}:d=${fmt(mfo)}`:''},aformat=sample_rates=48000:channel_layouts=stereo[bgm]`);filters.push('[aconcat][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]');audioOutput='aout'}
 if(this.db.prepare('SELECT status FROM renders WHERE id=?').get(id)?.status!=='running')throw Error('Render cancelled');
 args.push('-filter_complex_threads','2','-filter_complex',filters.join(';'),'-map','[vout]','-map',`[${audioOutput}]`,'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-r','30','-movflags','+faststart','-t',fmt(duration),'-threads','2',output);
 await this.ffmpeg(args,id,duration);
 if(this.db.prepare('SELECT status FROM renders WHERE id=?').get(id)?.status!=='running')throw Error('Render cancelled');
 const st=await stat(output);if(st.size<1000)throw Error('Render output is empty');
 this.db.prepare("UPDATE renders SET status='completed',stored_name=?,progress=100,updated_at=? WHERE id=?").run(outputName,now(),id);
 this.emit(id);
 }catch(e){await rm(output,{force:true}).catch(()=>{});throw e}finally{await rm(temp,{recursive:true,force:true}).catch(()=>{})}
 }
 ffmpeg(args,id,duration){return new Promise((resolve,reject)=>{const p=spawn(process.env.FFMPEG_PATH||'ffmpeg',args,{stdio:['ignore','ignore','pipe']});this.currentProcess=p;let log='',lastUpdate=0;const timer=setTimeout(()=>p.kill('SIGKILL'),15*60*1000);
 p.stderr.on('data',chunk=>{const s=chunk.toString();log=(log+s).slice(-2500);const matches=[...s.matchAll(/out_time_ms=(\d+)/g)];if(matches.length){const raw=Number(matches[matches.length-1][1]);const pct=Math.max(1,Math.min(99,Math.round(100*(raw/1_000_000)/duration)));if(Date.now()-lastUpdate>500){lastUpdate=Date.now();this.db.prepare("UPDATE renders SET progress=?,updated_at=? WHERE id=? AND status='running'").run(pct,lastUpdate,id);this.emit(id)}}});p.on('error',e=>{clearTimeout(timer);reject(e)});p.on('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(new Error(`FFmpeg exited ${code}: ${log.replace(/\/[^\s]+/g,'[path]').slice(-500)}`))})})}
 shutdown(){this.closing=true;this.currentProcess?.kill('SIGTERM');return this.idle||Promise.resolve()}
}
