/* Source-grounded editing tools and the live activity surface. */
(()=>{
'use strict';
const E=()=>window.ReplotreEditor,C=()=>window.ReplotreCloud;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(1).padStart(4,'0')}`;
const active=j=>['queued','running'].includes(j.status);
const labels={analyze:'Footage analysis',transcribe:'Speech transcription',understand:'Visual understanding'};
let summaries=[],tasks=new Map(),renders=new Map(),details=new Map(),loadingDetails=new Set(),capabilities={},section='edit',selected=null,query='',busy='',error='',epoch=0,refreshTimer=null,refreshing=false,refreshAgain=false,revisions=[],loadedProject=null,upload=null;
const waiters=new Map();
const preferences={highlightLength:'30',gradePreset:'cinematic'};
const panel=()=>document.querySelector('.rail-item[data-tab="intelligence"]')?.classList.contains('active')?document.querySelector('#assetContent'):null;
const rerender=()=>{const node=panel();if(node)render(node);updateActivity()};
let backgroundDirty=false;
function backgroundRender(job=null,kind='task'){
 if(job&&job.projectId!==C()?.project()?.id)return;
 if(!E()?.isPlaying?.()){backgroundDirty=false;rerender();return}
 backgroundDirty=true;updateActivity();const node=panel();if(!node)return;
 const count=node.querySelector('.insight-metrics div:last-child strong');if(count)count.textContent=[...tasks.values(),...renders.values()].filter(active).length;
 if(section!=='jobs'||!job)return;
 const card=node.querySelector(`[data-job-id="${job.id}"]`);
 if(!card){node.querySelector('.insight-empty')?.remove();node.querySelector('.insight-section-title')?.insertAdjacentHTML('afterend',jobCard(job,kind));return}
 const status=card.querySelector('.job-state');
 if(!status.classList.contains(job.status)){card.outerHTML=jobCard(job,kind);return}
 const detail=job.error||(kind==='task'?job.stage:job.status==='completed'?'Ready to download':'Saved timeline snapshot');if(card.querySelector('p').textContent!==detail)card.querySelector('p').textContent=detail;
 const progress=card.querySelector('.insight-progress');if(progress){progress.setAttribute('aria-valuenow',job.progress);progress.firstElementChild.style.width=job.progress+'%'}
 const percentage=card.querySelector('.insight-job-actions small');if(percentage&&active(job))percentage.textContent=job.progress+'%';
}
window.addEventListener('replotre:playback',e=>{if(!e.detail.playing&&backgroundDirty){backgroundDirty=false;rerender()}});
const button=(action,title,sub,extra='')=>`<button type="button" class="insight-action" data-insight="${action}" ${busy?'disabled':''} ${extra}><strong>${title}</strong><small>${sub}</small></button>`;
function statusDot(){return `<span class="insight-live ${C()?.isLive()?'connected':''}"><i></i>${C()?.isLive()?'Live updates':'Reconnecting'}</span>`}
function jobCard(job,kind){const task=kind==='task',title=task?labels[job.kind]||job.kind:`MP4 · ${job.resolution}p`;return `<article class="insight-job" data-job-id="${esc(job.id)}"><div class="insight-job-title"><strong>${esc(title)}</strong><span class="job-state ${esc(job.status)}">${esc(job.status)}</span></div><p>${esc(job.error||(task?job.stage:job.status==='completed'?'Ready to download':'Saved timeline snapshot'))}</p>${active(job)?`<div class="insight-progress" role="progressbar" aria-label="${esc(title)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${job.progress}"><span style="width:${job.progress}%"></span></div>`:''}<div class="insight-job-actions">${active(job)?`<button data-insight="${kind}-cancel" data-id="${job.id}">Cancel</button>`:['failed','cancelled'].includes(job.status)?`<button data-insight="${kind}-retry" data-id="${job.id}">Retry</button>`:''}${job.downloadUrl?`<a href="${esc(job.downloadUrl)}" download>Download MP4 ↗</a>`:''}<small>${active(job)?job.progress+'%':new Date(job.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div></article>`}
function transcriptRows(info){const segments=info?.transcript?.segments?.length?info.transcript.segments:[];const matches=segments.filter(s=>!query||s.text.toLowerCase().includes(query.toLowerCase()));return matches.length?matches.slice(0,100).map(s=>`<button type="button" class="transcript-line" data-insight="seek-source" data-start="${s.start}" title="Jump to this passage on the timeline"><time>${time(s.start)}</time><span>${esc(s.text)}</span></button>`).join(''):`<p class="insight-empty">${query?'No matching passages.':'No transcript passages yet.'}</p>`}
function render(node){
 backgroundDirty=false;
 const focused=node.contains(document.activeElement)?document.activeElement:null,id=focused?.id,selection=typeof focused?.selectionStart==='number'?[focused.selectionStart,focused.selectionEnd]:null;
 renderContent(node);
 for(const [key,value] of Object.entries(preferences)){const field=node.querySelector('#'+key);if(field)field.value=value}
 if(id){const field=node.querySelector('#'+id);if(field){field.focus({preventScroll:true});if(selection)try{field.setSelectionRange(...selection)}catch{}}}
}
function renderContent(node){
 if(!C()?.isConnected()){node.innerHTML=`<div class="insight-welcome"><span class="insight-eyebrow">FROM FOOTAGE TO FINISHED</span><h3>Your footage.<br>A smarter workflow.</h3><p>Find scenes, remove quiet gaps, build captions, and watch every job update live.</p><button class="mini-action" data-insight="account">Sign in to your workspace ↗</button><div class="insight-feature-list"><span>Scene detection & source thumbnails</span><span>Measured audio waveforms</span><span>Speech-aligned captions</span><span>Live exports & version history</span></div></div>`;return}
 const media=E().media(),videos=media.filter(m=>m.kind==='video'),analyzed=summaries.filter(a=>a.analyzedAt).length,processing=[...tasks.values(),...renders.values()].filter(active).length;
 node.innerHTML=`<div class="insight-topline"><span class="insight-eyebrow">Footage intelligence</span>${statusDot()}</div><div class="insight-stats"><span><b>${media.length}</b> source${media.length===1?'':'s'}</span><i>·</i><span class="${media.length&&analyzed>=media.length?'is-ok':''}"><b>${analyzed}</b> analyzed${media.length&&analyzed>=media.length?' ✓':''}</span><i>·</i><span class="${processing?'is-busy':''}"><b>${processing}</b> job${processing===1?'':'s'}</span></div><nav class="insight-tabs" aria-label="Intelligence views">${[['edit','Edit'],['footage','Footage'],['jobs','Jobs'],['history','History']].map(([id,label])=>`<button type="button" data-insight="tab" data-section="${id}" class="${section===id?'active':''}" aria-pressed="${section===id}">${label}</button>`).join('')}</nav>${busy?`<div class="insight-working" role="status"><span class="insight-spinner"></span>${esc(busy)}</div>`:''}${error?`<div class="insight-error" role="alert">${esc(error)}<button data-insight="dismiss" aria-label="Dismiss message">×</button></div>`:''}<div id="insightView"></div>`;
 const view=node.querySelector('#insightView');
 if(section==='edit'){
  const hasClips=E().snapshot().clips.some(c=>c.kind!=='demo');
  const I=n=>window.ReplotreIco?window.ReplotreIco(n):'',sums=summaries.filter(a=>media.some(m=>m.id===a.assetId)),quiet=sums.reduce((t,a)=>t+(+a.silenceSeconds||0),0),bpm=sums.find(a=>a.bpm)?.bpm,dis=busy||!hasClips,pending=videos.length-sums.filter(a=>a.analyzedAt).length;
  const next=!hasClips?{icon:'upload',title:'Import footage to start',sub:'Scenes, quiet gaps and beats are detected automatically after upload.',btn:'<button class="mini-action is-primary" data-action="upload">'+I('plus')+' Import footage</button>'}
   :pending>0?{icon:'sparkles',title:`Analyzing ${pending} source${pending===1?'':'s'}…`,sub:'You can start editing now; results improve as analysis finishes.',btn:`<button class="mini-action" data-insight="tab" data-section="footage">View footage</button>`}
   :{icon:'check-circle',title:'Footage analyzed',sub:'',btn:'',compact:true};
  const tile=(id,icn,title,meta,warn=false,tip='')=>`<button type="button" class="ig-tile${warn?' is-warn':''}" data-insight="${id}" ${dis?'disabled':''} title="${tip}"><span class="it-icon">${I(icn)}</span><strong>${title}</strong><small>${meta}</small></button>`;
  const hl=preferences.highlightLength||'30',gp=preferences.gradePreset||'cinematic';
  const grades=[['cinematic','Cinematic','linear-gradient(135deg,#2c3e50,#c79a63)'],['vivid','Vivid','linear-gradient(135deg,#ff6b6b,#ffd93d,#4ecdc4)'],['monochrome','Mono','linear-gradient(135deg,#222,#bbb)'],['natural','Natural','linear-gradient(135deg,#d9b38c,#6b8f71)']];
  view.innerHTML=(next.compact?'':`<div class="insight-next"><span class="in-icon">${I(next.icon)}</span><div><strong>${next.title}</strong><p>${next.sub}</p>${next.btn}</div></div>`)+
  `<section class="ig-sec"><h4>Smart edits</h4><div class="ig-tiles">${tile('remove_silence','scissors','Tighten',quiet>0?`−${quiet.toFixed(1)}s quiet`:'Remove quiet gaps',false,'Remove detected quiet gaps')}${tile('split_scenes','film','Scene cuts','Split at shot changes',false,'Split clips where the shot changes')}${tile('beat_sync','music','Beat cuts',bpm?`On the beat · ${Math.round(bpm)} BPM`:'Cut to the music',false,'Cut on the soundtrack’s beats')}${tile('auto_captions','captions','Captions',capabilities.ai?'From speech':'Needs speech AI',!capabilities.ai,'Captions timed to the spoken words')}</div></section>`+
  `<section class="ig-sec"><h4>Highlight reel</h4><div class="ig-inline"><div class="ig-seg" role="radiogroup" aria-label="Highlight length">${['15','30','60'].map(v=>`<button type="button" class="${hl===v?'is-on':''}" data-pick="highlightLength" data-value="${v}" role="radio" aria-checked="${hl===v}">${v}s</button>`).join('')}</div><button class="ig-go" data-insight="highlights" ${dis?'disabled':''} title="Build a highlight from detected scenes or speech">Create</button></div><select id="highlightLength" hidden aria-hidden="true">${['15','30','60'].map(v=>`<option value="${v}" ${hl===v?'selected':''}>${v}</option>`).join('')}</select></section>`+
  `<section class="ig-sec"><h4>Colour direction</h4><div class="ig-inline"><div class="ig-dots" role="radiogroup" aria-label="Colour direction">${grades.map(([v,l,g])=>`<button type="button" class="${gp===v?'is-on':''}" data-pick="gradePreset" data-value="${v}" role="radio" aria-checked="${gp===v}" title="${l}" aria-label="${l}"><i style="background:${g}"></i></button>`).join('')}</div><button class="ig-go" data-insight="set_grade" ${dis?'disabled':''}>Apply</button></div><p class="ig-note">${grades.find(g=>g[0]===gp)[1]} look on every clip</p><select id="gradePreset" hidden aria-hidden="true">${grades.map(([v])=>`<option value="${v}" ${gp===v?'selected':''}>${v}</option>`).join('')}</select></section>`+
  `<section class="ig-sec is-row"><h4>Caption files</h4><div class="ig-links"><button data-insight="subtitles" data-format="srt">${I('download')}SRT</button><button data-insight="subtitles" data-format="vtt">${I('download')}VTT</button></div></section>`+
  `<p class="ig-foot"><span class="provider-dot ${capabilities.ai?'ready':''}"></span>${capabilities.ai?'Speech & visual AI connected':'Local analysis · captions need an AI provider'}</p>`;
 }else if(section==='footage'){
  if(!media.length){view.innerHTML='<div class="insight-empty">Upload media to inspect scenes, speech, and audio.</div>';return}
  if(!media.some(m=>m.id===selected))selected=videos[0]?.id||media[0].id;
  const m=media.find(m=>m.id===selected),info=details.get(selected),summary=summaries.find(a=>a.assetId===selected);
  view.innerHTML=`<label class="insight-label" for="insightSource">Source file</label><select class="insight-source-select" id="insightSource">${media.map(m=>`<option value="${esc(m.id)}" ${m.id===selected?'selected':''}>${esc(m.name)}</option>`).join('')}</select>${summary?.thumbnail?`<img class="insight-preview" src="${esc(summary.thumbnail)}" alt="Source frame from ${esc(m.name)}">`:''}<div class="insight-source-meta"><span>${time(m.duration)}</span><span>${esc(m.kind)}</span><span>${summary?.bpm?summary.bpm+' BPM estimate':summary?.analyzedAt?'Analyzed':'Awaiting analysis'}</span></div><div class="insight-source-actions"><button data-insight="analyze" ${busy?'disabled':''}>${summary?.analyzedAt?'Reanalyze':'Analyze'}</button>${m.kind!=='image'?`<button data-insight="transcribe" ${busy?'disabled':''}>${summary?.transcribed?'Transcribe again':'Transcribe speech'}</button>`:''}${m.kind!=='audio'?`<button data-insight="understand" ${busy?'disabled':''}>Understand visuals</button>`:''}</div>${summary?.waveform?.length?`<div class="insight-audio"><div><strong>Source waveform</strong><span>${(summary.silenceSeconds||0).toFixed(1)}s quiet</span></div><div class="insight-waveform" aria-label="Measured source audio waveform">${summary.waveform.map(v=>`<i style="height:${Math.max(3,v*100)}%"></i>`).join('')}</div><small>${summary.beats} audio onset markers${summary.bpm?' · estimated '+summary.bpm+' BPM':''}</small></div>`:''}${info?.vision?`<div class="insight-visual-summary"><h3>What’s in the footage</h3><p>${esc(info.vision.summary)}</p><div class="insight-tags">${info.vision.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><small>Based on ${info.frames?.length||0} sampled frames</small></div>`:''}${info?.scenes?.length?`<div class="insight-subhead"><strong>Detected scenes</strong><span>${info.scenes.length}</span></div><div class="insight-scenes">${info.scenes.slice(0,40).map((s,i)=>`<div><button data-insight="seek-source" data-start="${s.start}"><span>Scene ${String(i+1).padStart(2,'0')}</span><time>${time(s.start)} — ${time(s.end)}</time></button><button data-insight="add-scene" data-start="${s.start}" data-end="${s.end}" aria-label="Add scene ${i+1} to timeline">+</button></div>`).join('')}</div>`:''}<div class="insight-subhead"><strong>Transcript</strong><span>${info?.transcript?esc(info.transcript.language):'Speech'}</span></div>${info?.transcript?`<input id="transcriptSearch" class="search-input" placeholder="Search spoken words…" aria-label="Search transcript" value="${esc(query)}"><div id="transcriptRows">${transcriptRows(info)}</div>`:`<p class="insight-empty">${loadingDetails.has(selected)?'Loading source details…':'Transcribe this source to search speech and create aligned captions.'}</p>`}`;
  if(!details.has(selected))loadDetail(selected);
 }else if(section==='jobs'){
  const jobs=[...[...tasks.values()].map(job=>({job,kind:'task'})),...[...renders.values()].map(job=>({job,kind:'render'}))].sort((a,b)=>(active(b.job)-active(a.job))||b.job.createdAt-a.job.createdAt);
  view.innerHTML=`<div class="insight-section-title"><h3>Work in motion.</h3><p>Jobs keep running when you close this panel. Changes arrive live.</p></div>${jobs.length?jobs.slice(0,30).map(({job,kind})=>jobCard(job,kind)).join(''):'<div class="insight-empty">Your analysis tasks and MP4 exports appear here.</div>'}`;
 }else{
  view.innerHTML=`<div class="insight-section-title"><h3>Every edit has a way back.</h3><p>Restore a saved timeline as a new version. Your current version stays in history.</p></div>${revisions.length?revisions.map(r=>`<article class="insight-revision"><div><strong>Version ${r.version}</strong><small>${new Date(r.createdAt).toLocaleString()}</small></div><p>${esc(r.label)}</p>${r.version===C().project()?.version?'<span class="insight-current">Current version</span>':`<button data-insight="restore" data-version="${r.version}" ${busy?'disabled':''}>Restore this version ↗</button>`}</article>`).join(''):'<div class="insight-empty">History is saved as you edit. Your first save creates the first revision.</div>'}`;
 }
}
async function refresh(){
 const project=C()?.project();if(!project)return;if(refreshing){refreshAgain=true;return}refreshing=true;const currentEpoch=epoch;
 try{const result=await C().api(`/api/projects/${project.id}/intelligence`);if(epoch!==currentEpoch||C().project()?.id!==project.id)return;
  summaries=result.analyses;for(const j of result.tasks)receiveTask(j);renders=new Map(result.renders.map(j=>[j.id,j]));E().setAnalysisSummaries(summaries);backgroundRender();
 }catch(e){if(epoch===currentEpoch){error=e.message;rerender()}}finally{refreshing=false;if(refreshAgain){refreshAgain=false;refresh()}}
}
function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refresh,120)}
async function loadDetail(id){if(loadingDetails.has(id))return;loadingDetails.add(id);const project=C().project(),currentEpoch=epoch;try{const r=await C().api(`/api/projects/${project.id}/assets/${id}/analysis`);if(epoch===currentEpoch){details.set(id,r.analysis);rerender()}}catch(e){if(epoch===currentEpoch){details.set(id,null);error=e.message;rerender()}}finally{loadingDetails.delete(id)}}
function receiveTask(task){if(task.projectId!==C()?.project()?.id)return;const previous=tasks.get(task.id);if(previous&&(previous.updatedAt>task.updatedAt||!active(previous)&&active(task)&&previous.updatedAt>=task.updatedAt))return;tasks.set(task.id,task);const waiter=waiters.get(task.id);if(waiter&&!active(task)){clearTimeout(waiter.timer);waiters.delete(task.id);task.status==='completed'?waiter.resolve(task):waiter.reject(Error(task.error||'Task cancelled'))}}
function waitTask(task){if(!active(task))return task.status==='completed'?Promise.resolve(task):Promise.reject(Error(task.error||'Task cancelled'));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiters.delete(task.id);reject(Error('This task is still processing. Follow it in Jobs and retry the edit when ready.'))},600000);waiters.set(task.id,{resolve,reject,timer});const latest=tasks.get(task.id);if(latest&&!active(latest))receiveTask(latest)})}
async function requestTask(assetId,kind){const project=C().project(),r=await C().api(`/api/projects/${project.id}/assets/${assetId}/analysis`,{method:'POST',body:{kind}});receiveTask(r.task);rerender();return r.task}
async function ensureSources(kind){
 if(kind==='transcribe'&&capabilities.transcription===undefined)capabilities=await C().api('/api/status');
 const p=E().snapshot(),allIds=[...new Set(kind==='beat'?p.music?[p.music.mediaId]:[]:p.clips.filter(c=>c.kind==='video').map(c=>c.mediaId))];
 const summaryFor=id=>summaries.find(a=>a.assetId===id),speechReady=id=>summaryFor(id)?.transcribed||!!details.get(id)?.transcript;
 const ids=kind==='transcribe'?allIds.filter(id=>(summaryFor(id)?.hasAudio??details.get(id)?.hasAudio)!==false):allIds;
 if(kind==='beat'&&!ids.length)throw Error('Import a soundtrack before creating beat cuts.');
 if(!ids.length)throw Error(kind==='transcribe'&&allIds.length?'These video sources have no audio stream to caption.':'Add a video to your timeline first.');
 if(kind==='transcribe'&&!capabilities.transcription&&ids.some(id=>!speechReady(id)))throw Error('Speech transcription needs an AI provider connected by your workspace administrator. Scene and audio analysis work without it.');
 const capturedEpoch=epoch;
 for(const id of ids){const summary=summaryFor(id);if(kind==='transcribe'?speechReady(id):summary?.analyzedAt||details.get(id)?.analyzedAt)continue;
  const task=await requestTask(id,kind==='transcribe'?'transcribe':'analyze');busy=kind==='transcribe'?'Transcribing your footage…':'Analyzing your footage…';rerender();await waitTask(task);if(epoch!==capturedEpoch)throw Error('The workspace changed. Your background tasks remain in the original project.');
 }
 await refresh();
}
async function runEdit(action,el){
 const capturedEpoch=epoch,extra=action==='highlights'?{duration:Number(document.querySelector('#highlightLength')?.value||30)}:action==='set_grade'?{value:document.querySelector('#gradePreset')?.value||'cinematic'}:{};
 if(['remove_silence','split_scenes','highlights'].includes(action))await ensureSources('analyze');
 if(action==='auto_captions')await ensureSources('transcribe');if(action==='beat_sync')await ensureSources('beat');
 if(epoch!==capturedEpoch)return;busy='Applying your edit…';rerender();const result=await C().direct({operations:[{type:action,...extra}]});E().notify(result.message);await loadHistory();
}
async function preparePrompt(prompt){
 const text=prompt.toLowerCase(),captions=/\b(captions?|subtitles?)\b/.test(text),removing=/\b(?:remove|delete|hide)\s+(?:(?:the|all|existing|my|these)\s+)*(?:captions?|subtitles?)\b/.test(text),existingCaptions=E().snapshot().texts.some(t=>t.kind==='caption');
 const styling=existingCaptions&&/\b(style|bold|minimal|colou?r|yellow|white|pink|purple|green|blue|red|top|bottom|center|centre|move|position)\b/.test(text);
 const speech=captions&&!removing&&!styling&&!/\bscript\b/.test(text)&&(/\b(add|create|generate|make|auto|put)\b/.test(text)||/^\s*(?:captions?|subtitles?)\b/.test(text));
 const beats=/\b(beat|beats|rhythm)\b/.test(text),analyze=/\b(silence|silent|pauses|scenes?|highlights?|montage|dead air)\b/.test(text);
 if(!speech&&!beats&&!analyze)return;if(busy)throw Error('Wait for the current footage action to finish.');
 const capturedEpoch=epoch;busy='Preparing footage for Director…';rerender();
 try{if(analyze)await ensureSources('analyze');if(beats)await ensureSources('beat');if(speech)await ensureSources('transcribe');if(capturedEpoch!==epoch)throw Error('The workspace changed while preparing this edit.')}finally{busy='';rerender()}
}
async function loadHistory(){const project=C()?.project();if(!project)return;const capturedEpoch=epoch;const r=await C().api(`/api/projects/${project.id}/revisions`);if(capturedEpoch===epoch){revisions=r.revisions;rerender()}}
function updateActivity(){
 let dock=document.querySelector('#liveActivity');if(!dock){dock=document.createElement('button');dock.id='liveActivity';dock.type='button';dock.className='live-activity';dock.onclick=()=>{section='jobs';E().showIntelligence()};document.querySelector('.timeline-footer')?.append(dock)}
 const jobs=[...tasks.values(),...renders.values()].filter(active);
 dock.hidden=!C()?.isConnected();dock.classList.toggle('processing',!!jobs.length);
 dock.textContent=upload?`${upload.name} · ${upload.progress}%${upload.processing?' · verifying':''}`:jobs.length?`${jobs.length} active job${jobs.length===1?'':'s'} · ${Math.max(...jobs.map(j=>j.progress))}% ↗`:C()?.isLive()?'● Live workspace ↗':'○ Reconnecting…';
}
document.addEventListener('change',e=>{if(e.target.id in preferences)preferences[e.target.id]=e.target.value;if(e.target.id==='insightSource'){selected=e.target.value;query='';rerender()}});
document.addEventListener('input',e=>{if(e.target.id==='transcriptSearch'){query=e.target.value;document.querySelector('#transcriptRows').innerHTML=transcriptRows(details.get(selected))}});
document.addEventListener('click',e=>{const p=e.target.closest('[data-pick]');if(!p)return;const key=p.dataset.pick;if(!(key in preferences))return;preferences[key]=p.dataset.value;rerender()});
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-insight]');if(!el)return;const action=el.dataset.insight;
 if(action==='account')return C().openAccount();
 if(action==='tab'){section=el.dataset.section;if(section==='history')loadHistory().catch(ex=>{error=ex.message;rerender()});rerender();return}
 if(action==='dismiss'){error='';rerender();return}
 if(action==='seek-source')return E().seekSource(selected,Number(el.dataset.start));
 if(action==='add-scene')return E().addSourceRange(selected,Number(el.dataset.start),Number(el.dataset.end));
 if(busy)return;error='';busy='Preparing…';
 try{
  if(['remove_silence','auto_captions','split_scenes','beat_sync','highlights','set_grade'].includes(action))await runEdit(action,el);
  else if(['analyze','transcribe','understand'].includes(action)){
   if(action!=='analyze'&&!capabilities.ai)throw Error('Connect an AI provider on the server to enable speech and visual understanding.');
   if(action==='understand'&&!summaries.find(s=>s.assetId===selected)?.analyzedAt){const task=await requestTask(selected,'analyze');busy='Preparing source frames…';rerender();await waitTask(task)}
   await requestTask(selected,action);section='jobs';
  }else if(/^(task|render)-(cancel|retry)$/.test(action)){
   const [kind,operation]=action.split('-');const r=await C().api(`/api/${kind==='task'?'tasks':'renders'}/${el.dataset.id}/${operation}`,{method:'POST'});if(r.task)receiveTask(r.task);if(r.render)renders.set(r.render.id,r.render);
  }else if(action==='restore'){busy='Restoring saved timeline…';rerender();await C().restoreRevision(Number(el.dataset.version));await loadHistory();E().notify('Saved version restored. Your previous edit remains in History.');
  }else if(action==='subtitles'){
   await C().saveNow();const a=document.createElement('a');a.href=`/api/projects/${C().project().id}/subtitles.${el.dataset.format}`;a.download=`captions.${el.dataset.format}`;a.click();
  }
 }catch(ex){error=ex.message}finally{busy='';rerender()}
});
async function cloudChanged(e){
 const {type,...data}=e.detail;
 if(type==='project.loaded'||type==='signed.out'){
  const id=C()?.project()?.id||null;if(id!==loadedProject){loadedProject=id;epoch++;for(const waiter of waiters.values()){clearTimeout(waiter.timer);waiter.reject(Error('Workspace changed'))}waiters.clear();summaries=[];tasks.clear();renders.clear();details.clear();loadingDetails.clear();selected=null;revisions=[];error='';busy=''}
  if(id){try{capabilities=await C().api('/api/status');await refresh()}catch(ex){error=ex.message}}rerender();
 }else if(type==='connection'){if(data.live){scheduleRefresh();if(section==='history')loadHistory().catch(()=>{})}backgroundRender();
 }else if(type==='task.updated'){receiveTask(data.task);backgroundRender(data.task,'task');
 }else if(type==='render.updated'&&data.render.projectId===C()?.project()?.id){const previous=renders.get(data.render.id);renders.set(data.render.id,data.render);if(previous&&active(previous)&&data.render.status==='completed')E().notify('MP4 export ready. Download it from Insights → Jobs.');backgroundRender(data.render,'render');
 }else if(type==='analysis.updated'&&data.projectId===C()?.project()?.id){details.delete(data.assetId);scheduleRefresh();if(data.assetId===selected&&section==='footage')loadDetail(selected);
 }else if(['project.synced','project.restored','director.applied','refresh','upload.done'].includes(type)){scheduleRefresh();if(section==='history')loadHistory().catch(()=>{});if(type==='upload.done')upload=null;
 }else if(type==='upload.progress'){upload=data.error?null:data;updateActivity()}
}
window.addEventListener('replotre:cloud',cloudChanged);
window.ReplotreIntelligence={render,refresh,preparePrompt};
if(C()?.isConnected())cloudChanged({detail:{type:'project.loaded'}});
})();
