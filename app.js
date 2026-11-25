/* Replotre Studio 2 — live, source-aware editing with private cloud persistence. */
(() => {
'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const escapeHTML = (v) => String(v??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n,min,max) => Math.min(Math.max(Number(n)||0,min),max);
const fmt = (secs) => {const s=Math.max(0,secs);const h=Math.floor(s/3600);const m=Math.floor(s%3600/60);const ss=Math.floor(s%60);return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`};
const iconPaths={
'film':'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5m-5 8h5m10-8h5m-5 8h5"/>',
'layout':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
'type':'<path d="M4 7V4h16v3M12 4v16m-5 0h10"/>',
'music':'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
'palette':'<circle cx="12" cy="12" r="10"/><circle cx="7.5" cy="12" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16.5" cy="11" r="1"/><path d="M16 20c-3-2-2-6 2-6h2"/>',
'layers':'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
'circle-help':'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01"/>',
'x':'<path d="M18 6 6 18M6 6l12 12"/>','list':'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>','search':'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
'monitor-play':'<rect x="2" y="3" width="20" height="15" rx="2"/><path d="m10 7 5 3.5-5 3V7ZM8 22h8M12 18v4"/>',
'grid':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
'rectangle-horizontal':'<rect x="2" y="5" width="20" height="14" rx="2"/>',
'chevron-down':'<path d="m6 9 6 6 6-6"/>',
'maximize':'<path d="M8 3H3v5m18 8v5h-5M3 16v5h5M16 3h5v5"/>',
'sparkles':'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16ZM19 2l.7 1.3L21 4l-1.3.7L19 6l-.7-1.3L17 4l1.3-.7L19 2Z"/>',
'mouse-pointer-2':'<path d="m5 3 14 9-7 1-3 7-4-17Z"/>',
'scissors':'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m9 8 12 12M9 16 21 4"/>',
'trash-2':'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7M14 10v7"/>',
'minus':'<path d="M5 12h14"/>','plus':'<path d="M12 5v14M5 12h14"/>',
'chevrons-up-down':'<path d="m7 10 5-5 5 5M7 14l5 5 5-5"/>',
'skip-back':'<path d="M5 4v16M19 5 8 12l11 7V5Z"/>','skip-forward':'<path d="M19 4v16M5 5l11 7-11 7V5Z"/>',
'rotate-ccw':'<path d="M3 11a9 9 0 1 1 3 7M3 4v7h7"/>','rotate-cw':'<path d="M21 11a9 9 0 1 0-3 7M21 4v7h-7"/>',
'play':'<path d="m7 4 13 8-13 8V4Z" fill="currentColor" stroke="none"/>','pause':'<path d="M6 5h5v14H6zM14 5h5v14h-5z" fill="currentColor" stroke="none"/>',
'sliders-horizontal':'<path d="M3 6h12m4 0h2M3 12h4m4 0h10M3 18h12m4 0h2"/><circle cx="17" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
'arrow-up':'<path d="m6 12 6-6 6 6M12 6v13"/>','upload-cloud':'<path d="M12 16V7m-4 4 4-4 4 4M6 18a4 4 0 0 1-1-7.9A7 7 0 0 1 19 9a4.5 4.5 0 0 1 0 9H6"/>',
'cloud-upload':'<path d="M12 16V8m-4 4 4-4 4 4M3 17a4.5 4.5 0 0 1 2-8 7 7 0 0 1 14 1 4 4 0 0 1-1 8H5"/>',
'download':'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
'undo':'<path d="M3 9V3m0 6h6M3 9a9 9 0 1 1 1 8"/>',
'redo':'<path d="M21 9V3m0 6h-6M21 9a9 9 0 1 0-1 8"/>',
'check':'<path d="m4 12 5 5L20 6"/>',
'captions':'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 10h4m4 0h4M6 14h8m2 0h2"/>',
'image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
'volume-2':'<path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/>',
'wand-sparkles':'<path d="m4 20 13-13 3 3L7 23l-3-3ZM14 4l1-3 1 3 3 1-3 1-1 3-1-3-3-1 3-1ZM4 7l.5-2L5 7l2 .5L5 8l-.5 2L4 8l-2-.5 2-.5Z"/>',
'eye':'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
'panel-left':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
'save':'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8"/>',
'keyboard':'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
'check-circle':'<circle cx="12" cy="12" r="10"/><path d="m7 12 3.5 3.5L17 9"/>',
'link':'<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l2-2"/>',
'file-json':'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7ZM13 2v7h7M9 14l-2 2 2 2m6-4 2 2-2 2"/>',
'clapperboard':'<path d="M3 9h18v12H3V9ZM3 9V5l17-3 1 7M8 5l3 4m3-5 3 5"/>',
'zap':'<path d="m13 2-9 12h7l-1 8 10-12h-7V2Z"/>',
'shield-check':'<path d="M12 2 4 5v7c0 5 3 8 8 10 5-2 8-5 8-10V5l-8-3Zm-4 10 3 3 5-6"/>',
'pencil':'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>','loader':'<path d="M12 3a9 9 0 1 0 9 9"/>','alert-triangle':'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>','overlay':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h4M15 15h2"/>','mark-in':'<path d="M10 4H6v16h4"/><path d="M14 12h5"/><path d="m16 9 3 3-3 3"/>','mark-out':'<path d="M14 4h4v16h-4"/><path d="M10 12H5"/><path d="m8 9-3 3 3 3"/>','frame-back':'<path d="M15 6l-6 6 6 6"/><path d="M19 6v12"/>','frame-fwd':'<path d="m9 6 6 6-6 6"/><path d="M5 6v12"/>','repeat':'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>','magnet':'<path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4M12 15l4 4"/>','bookmark':'<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>','flip':'<path d="M12 3v18"/><path d="m16 7 4 5-4 5V7Z"/><path d="m8 7-4 5 4 5V7Z"/>','crop':'<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>','xfade':'<path d="M3 6l9 6-9 6V6Z" opacity=".55"/><path d="M21 6l-9 6 9 6V6Z"/>','kf':'<path d="M12 3 21 12 12 21 3 12Z"/>','copy':'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'
};
const ico = (name, size) => `<svg ${size?`width="${size}" height="${size}"`:''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.sparkles}</svg>`;
window.ReplotreIco=ico;
$$('[data-ico]').forEach(el=>el.innerHTML=ico(el.dataset.ico));
$('#undoBtn').innerHTML=ico('undo');$('#redoBtn').innerHTML=ico('redo');$('#saveIcon').innerHTML=ico('save');$('#exportIcon').innerHTML=ico('download');
const templateSet = [
 {name:'Field Journal',desc:'Atmospheric short film',ratio:'9:16',palette:['#d8ac85','#352d29'],title:'THE MOMENTS\nBETWEEN',bg:'linear-gradient(110deg,#4c3b32,#b58a66)'},
 {name:'Editorial Cut',desc:'Typography-led storytelling',ratio:'9:16',palette:['#252a29','#ece4d4'],title:'NOTHING\nEXTRA',bg:'linear-gradient(110deg,#454b47,#242828)'},
 {name:'Cinematic Wide',desc:'Landscape films and intros',ratio:'16:9',palette:['#344b4c','#aac0b5'],title:'A DIFFERENT\nPERSPECTIVE',bg:'linear-gradient(110deg,#233a43,#5d7269)'},
 {name:'Product Spotlight',desc:'Modern brand advertisements',ratio:'4:5',palette:['#632d4e','#fd9d6b'],title:'MADE TO STAND OUT',bg:'linear-gradient(110deg,#652d5a,#e48679)'}
];
const DEFAULT_TEXT = [{id:'txt_sample',text:'The moments\nbetween.',start:.65,duration:4.1,position:'center',kind:'title',fontSize:51,color:'#ffffff',fontWeight:500}];
const defaultClips=()=>[
{id:'demo_01',name:'Opening shot',kind:'demo',demo:0,in:0,out:5,speed:1,volume:1,brightness:100,saturation:100},
{id:'demo_02',name:'Golden hour',kind:'demo',demo:1,in:0,out:5,speed:1,volume:1,brightness:100,saturation:100},
{id:'demo_03',name:'Blue hour',kind:'demo',demo:2,in:0,out:5,speed:1,volume:1,brightness:100,saturation:100}];
const bootWorkspace=window.ReplotreWorkspace?.initial()||{};
let workspaceMobileSection=bootWorkspace.mobileSection||'studio',workspaceRestoreVersion=0;
let directorFirst=innerWidth<=980,workspaceRestoring=false;setTimeout(()=>{directorFirst=false},10000);// opening /studio on a phone lands on the AI Director
const state = {
 projectName:'Untitled project',aspect:'9:16', zoom:bootWorkspace.zoom||1,playhead:0,playing:false,lastFrame:0,clips:[],
 texts:[],media:[],music:null,brandColor:'#e2ab77',brandFont:'Georgia',
 selectedClipId:null,selectedTextId:null,tab:bootWorkspace.tool||'media',rightTab:bootWorkspace.rightTab||'ai',messages:[],showGuides:false,
 aiConnected:false,aiBusy:false,serverBusy:false,markIn:null,markOut:null,loop:false,viewerZoom:'fit',overlays:false,exportScope:'range',markers:[],snap:true,clipboard:null,exporting:false,exportResolution:720,history:[],future:[],
 script:'',template:null,
 variantChoice:0,exportStart:0
};
const canvas=$('#previewCanvas'),ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
const videoElements=[$('#sourceVideo'),$('#nextVideo')],audioEl=$('#sourceAudio');
let videoEl=videoElements[0],saveTimeout=0,scrubbing=false,dragClipId=null,dbPromise=null,exportSession=null,audioCtx=null,audioDestination=null,pendingAssetRefresh=false,lastExportUI=0,nativeVideoKey='';
const transport={current:$('#currentTime'),total:$('#totalTime'),zoom:$('#zoomLabel'),line:$('#playheadLine'),play:$('#playIcon'),status:$('#playbackStatus')};
const playback=new window.ReplotrePlayback.PlaybackEngine({videos:videoElements,audio:audioEl,
 onPosition:time=>{state.playhead=time;syncTransitionAudio();if(exportSession&&exportSession.end<totalDuration()-FRAME/2&&time>=exportSession.end){pause();finishExport();updatePlaybackPosition();return}if(state.loop&&state.playing&&!exportSession&&state.markOut!=null&&time>=state.markOut-FRAME/2){seek(loopStart());return}updatePlaybackPosition();if(state.exporting&&performance.now()-lastExportUI>200){lastExportUI=performance.now();updateExportUI()}},
 onVideo:(element,clip)=>{if(element)videoEl=element;const key=element?`${videoElements.indexOf(element)}:${clip?.id}:${clipFilterCSS(clip)}:${clip?.fit}:${clip?.zoom}:${clip?.panX}:${clip?.panY}:${clip?.flipH}`:'none';if(nativeVideoKey===key)return;nativeVideoKey=key;for(const video of videoElements){const visible=video===element;video.classList.toggle('is-active',visible);if(!visible){video.style.transform='';video.style.filter='none'}}if(element)applyNativeLook()},
 onFrame:()=>drawPreview(false),onState:({playing,buffering})=>{state.playing=playing;if(!playing&&!xfAudio.paused)xfAudio.pause();setPreviewStatus(null,playing,buffering);transport.play.innerHTML=ico(playing?'pause':'play');if(transport.status)transport.status.textContent=buffering?'Buffering…':playing?'Playing':'Paused';
  if(exportSession){const rec=exportSession.rec;if((buffering||!playing)&&rec.state==='recording')rec.pause();else if(playing&&!buffering&&!document.hidden&&rec.state==='paused')rec.resume()}
  if(!playing&&pendingAssetRefresh){pendingAssetRefresh=false;renderAssetPanel();renderTimeline()}
  window.dispatchEvent(new CustomEvent('replotre:playback',{detail:{playing,buffering}}));},
 onEnd:()=>{if(exportSession){finishExport();return}if(state.loop&&state.clips.length){seek(loopStart());play()}},onError:toast
});
const ratioDims={'9:16':[540,960],'16:9':[960,540],'1:1':[720,720],'4:5':[640,800]};
const ratioOutput={'9:16':[720,1280],'16:9':[1280,720],'1:1':[720,720],'4:5':[720,900]};
const clipDuration=(c)=>Math.max(.1,(c.out-c.in)/(c.speed||1));
const totalDuration=()=>state.clips.reduce((s,c)=>s+clipDuration(c),0);
function timelineAt(t=state.playhead){let cursor=0;for(let i=0;i<state.clips.length;i++){const c=state.clips[i],duration=clipDuration(c);if(t<cursor+duration || i===state.clips.length-1)return {clip:c,index:i,start:cursor,local:clamp((t-cursor)*(c.speed||1)+c.in,c.in,c.out)};cursor+=duration}return null}
const selectedClip=()=>state.clips.find(c=>c.id===state.selectedClipId)||null;
const selectedText=()=>state.texts.find(c=>c.id===state.selectedTextId)||null;
const getMedia=(id)=>state.media.find(m=>m.id===id);
const LABEL_W=78,ZOOM_MIN=.08,ZOOM_MAX=12;
const pxPerSec=()=>32*state.zoom;
let lastUserScroll=0;
const timelineScrollEl=()=>$('#timelineScroll');
function toast(message){const area=$('#toastArea');while(area.children.length>=3)area.firstElementChild.remove();const node=document.createElement('div');node.className='toast';node.innerHTML=`${ico('check-circle')}<span>${escapeHTML(message)}</span>`;$('#toastArea').append(node);setTimeout(()=>node.remove(),3500)}
function snapshot(){return JSON.stringify({projectName:state.projectName,aspect:state.aspect,clips:state.clips,texts:state.texts,music:state.music,brandColor:state.brandColor,brandFont:state.brandFont,script:state.script,markers:state.markers||[],template:state.template||null})}
function checkpoint(label){state.histSeq=(state.histSeq||0)+1;state.history.push(snapshot());(state.historyLabels||=[]).push(label||'Edit');if(state.history.length>35){state.history.shift();state.historyLabels.shift()}state.future=[];state.futureLabels=[];updateHistoryButtons()}
function hydrate(obj){for(const k of ['projectName','aspect','clips','texts','music','brandColor','brandFont','script','markers'])if(k in obj)state[k]=obj[k];state.template=window.ReplotreTemplateCatalog?.sanitize(obj.template)||null;if(!Array.isArray(state.markers))state.markers=[];state.playhead=clamp(state.playhead,0,totalDuration());if(!state.clips.some(c=>c.id===state.selectedClipId))state.selectedClipId=state.clips[0]?.id||null;state.selectedTextId=null;pause();refreshAll()}
/* Multi-step undo/redo. Returns the labels of the steps it moved through (most recent first). Keeps Director messages in sync. */
function stepHistory(kind,n=1){if(state.serverBusy)return [];const from=kind==='undo'?state.history:state.future,to=kind==='undo'?state.future:state.history;
 const fromL=kind==='undo'?(state.historyLabels||=[]):(state.futureLabels||=[]),toL=kind==='undo'?(state.futureLabels||=[]):(state.historyLabels||=[]);
 const steps=Math.min(Number.isFinite(n)?Math.max(1,n|0):from.length,from.length);if(!steps)return [];
 const L0=state.history.length,S0=state.histSeq||0,labels=[];let cur=snapshot();
 for(let i=0;i<steps;i++){to.push(cur);cur=from.pop();const lb=fromL.pop()||'Edit';toL.push(lb);labels.push(lb)}
 hydrate(JSON.parse(cur));syncMedia?.(true);updateHistoryButtons();queueSave();
 state.histSeq=S0+(kind==='undo'?-steps:steps);const lo=Math.min(S0,state.histSeq),hi=Math.max(S0,state.histSeq);
 for(const m of state.messages){const q=m.undoSeq;if(q!=null&&q>lo&&q<=hi)m.undone=kind==='undo'}
 if(state.rightTab==='ai')renderRightPanel();return labels}
/* Is this Director reply's edit the newest undo step? (history is capped, so compare a step counter, not lengths) */
const isTopStep=m=>!!m&&m.undoSeq!=null&&!m.undone&&state.histSeq===m.undoSeq;
function undo(){return stepHistory('undo',1)}
function redo(){return stepHistory('redo',1)}
/* "undo", "go back", "revert that", "undo last 2", "undo everything", "redo", "bring it back"… */
function historyIntent(text){const t=text.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
 const nums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,a:1,an:1,once:1,twice:2};
 const lead="(?:(?:please|pls|can you|could you|just|now|ok|okay|oops|hey) )*";
 const undoW="undo|revert|go back|step back|roll ?back|take (?:it|that|this) back|cancel (?:it|that|this)|reverse (?:it|that|this)|ctrl z|cmd z";
 const redoW="redo|re do|reapply|re apply|bring (?:it|that|this) back|put (?:it|that|this) back|restore (?:it|that|this)|ctrl y|ctrl shift z|cmd shift z";
 const tail="(?: (?:the|my|that|this))?(?: (?:last|previous|recent))?(?: (\\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an|all|everything|once|twice))?(?: (?:edits?|changes?|steps?|actions?|times?|of them|things?))?(?: again)?(?: (?:please|pls|thanks))?";
 for(const [kind,words] of [['undo',undoW],['redo',redoW]]){const m=new RegExp(`^${lead}(?:${words})${tail}$`).exec(t);if(m){const q=m[1];const n=!q?1:/^(all|everything)$/.test(q)?Infinity:(+q||nums[q]||1);return {kind,n}}}
 if(/^(?:undo|revert) (?:all|everything)(?: edits?| changes?)?$/.test(t))return {kind:'undo',n:Infinity};
 // "undo the title", "redo that crop": history is step-based, so act on the latest step
 const loose=/^(?:(?:please|pls|can you|could you|just) )*(undo|revert|redo)\b/.exec(t);if(loose&&t.split(' ').length<=8)return {kind:loose[1]==='redo'?'redo':'undo',n:1,loose:true};
 return null}
/* "again", "more", "even faster", "a bit more", "too much", "same for all clips", "do that to the first clip" — relative to the last applied prompt. */
function followUpPrompt(text){const t=text.toLowerCase().replace(/[^a-z0-9' ]+/g,' ').replace(/\s+/g,' ').trim(),last=state.lastDirectorPrompt;if(!last)return null;
 if(/^(?:(?:do it|do that|that|same|repeat(?: it| that)?|one more time|once more)(?: again)?|again|more|even more|a bit more|a little more|more please|keep going|go further|further|stronger)(?: please)?$/.test(t))return {prompt:last,why:'again'};
 if(/^(?:too much|that'?s too much|too far|too strong|overdone|less|a bit less|tone it down|not that much|way too much)(?: please)?$/.test(t))return {undo:true,why:'less'};
 let m;if((m=/^(?:(?:do|apply|use)(?: (?:the same|that|it|this))?|same(?: thing)?|that)(?: (?:to|for|on))? (?:the )?(all(?: (?:the|of the))? clips|every clip|each clip|the whole video|everything|(?:first|second|third|last|other) clips?|clip \d+)(?: too| as well)?$/.exec(t)))return {prompt:`${last} on ${m[1].replace(/^other clips?$/,'all clips')}`,why:'scope'};
 if((m=/^even (faster|slower|brighter|darker|louder|quieter|bigger|smaller|more contrast|closer)$/.exec(t)))return {prompt:`much ${m[1]}`,why:'again'};
 return null}
/* Editing a sent prompt: if it's the latest prompt and its edit is still the newest undo step, the new version replaces it. */
function startPromptEdit(i){const m=state.messages[i];if(!m||m.role!=='user')return;if(state.editingMsg==null)state.draftBeforeEdit=state.chatDraft||'';state.editingMsg=i;state.chatDraft=m.text;renderRightPanel();
 requestAnimationFrame(()=>{const ta=$('#chatInput');if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);autosizeChat(ta)}$(`.dr-thread .dr-msg.is-editing-src`)?.scrollIntoView({block:'nearest',behavior:'smooth'})})}
function cancelPromptEdit(){if(state.editingMsg==null)return;state.editingMsg=null;state.chatDraft=state.draftBeforeEdit||'';state.draftBeforeEdit='';renderRightPanel()}
/* Overriding a sent prompt. Newest step → undo it. Older → remove exactly the layers it created (same undo step as the new edit);
   setters (speed, colour, look…) are simply overwritten by the new version. The message pair is replaced where it sits. */
function directorEditTarget(i){const later=state.messages.slice(i+1),nextUser=later.findIndex(m=>m.role==='user'),scope=nextUser<0?later:later.slice(0,nextUser),ag=scope.find(m=>m.role==='agent');return {ag,agIndex:ag?state.messages.indexOf(ag):-1,isLast:nextUser<0}}
function directorEditReplaces(i){return !!directorEditTarget(i).ag}
function takeOverride(){const ids=state.pendingOverrideIds;state.pendingOverrideIds=null;if(!ids?.length)return 0;const set=new Set(ids),n=state.texts.length;state.texts=state.texts.filter(t=>!set.has(t.id));if(set.has(state.selectedTextId))state.selectedTextId=null;return n!==state.texts.length?1:0}
async function resendEditedPrompt(i,text){text=String(text||'').trim();state.editingMsg=null;if(!text){renderRightPanel();return}
 const orig=state.messages[i]?.text,{ag,agIndex,isLast}=directorEditTarget(i);
 const top=isTopStep(ag);
 if(top)stepHistory('undo',1);else if(ag&&!ag.undone&&ag.created?.length)state.pendingOverrideIds=ag.created.filter(id=>state.texts.some(t=>t.id===id));
 const before=state.messages.length;await sendPrompt(text);state.pendingOverrideIds=null;
 const added=state.messages.splice(before);const reply=added.find(m=>m.role==='agent');
 if(reply&&ag&&!reply.error)reply.text=`Updated (was “${orig.length>60?orig.slice(0,58)+'…':orig}”). ${reply.text}`;
 const end=agIndex>i?agIndex+1:i+1;state.messages.splice(i,end-i,...added); // replace the old pair in place
 if(!isLast&&top===false&&ag&&!ag.undone&&!ag.created?.length&&reply&&!reply.error)reply.text+=' Later edits were kept.';
 renderRightPanel()}
function runHistoryIntent(kind,n,loose){const labels=stepHistory(kind,n),k=labels.length;
 const text=!k?(kind==='undo'?(state.future.length?'There’s nothing left to undo — this is the original project. Say “redo” to step forward again.':'There’s nothing to undo yet.'):'There’s nothing to redo — you’re at the latest version.')
  :`${kind==='undo'?'Undid':'Redid'} ${k===1?'the last edit':`${k} edits`}${loose?' (I work step by step, so I reversed the most recent one)':''}. ${kind==='undo'?'Say “redo” or tap Redo to bring it back.':'Your edit is back in place.'}`;
 state.messages.push({role:'agent',text,hist:{kind,labels}});renderRightPanel()} // the chat reply is the feedback; no toast stacking over the preview
function updateHistoryButtons(){const u=!state.history.length||state.serverBusy,r=!state.future.length||state.serverBusy;$('#undoBtn').disabled=!state.history.length;$('#redoBtn').disabled=!state.future.length;const mu=$('#mbUndo'),mr=$('#mbRedo');if(mu)mu.disabled=u;if(mr)mr.disabled=r}
function queueSave(){clearTimeout(saveTimeout);$('#savedLabel').textContent='Saving…';saveTimeout=setTimeout(saveState,500);window.ReplotreCloud?.onLocalMutation?.()}
/* Director chat + its undo history survive a refresh. Saved alongside the project so undo steps stay consistent with it. */
const CHAT_KEY='replotre_director_chat_v1';let chatSaveTimer=0;
function saveChat(){try{const msgs=state.messages.slice(-80).map(m=>{const o={...m};delete o.suggest;return o});
 const base={v:1,at:Date.now(),messages:msgs,draft:state.chatDraft||'',last:state.lastDirectorPrompt||null,seq:state.histSeq||0};
 try{localStorage.setItem(CHAT_KEY,JSON.stringify({...base,history:state.history,historyLabels:state.historyLabels||[],future:state.future,futureLabels:state.futureLabels||[]}))}
 catch(e){localStorage.setItem(CHAT_KEY,JSON.stringify(base))} /* storage full: keep the conversation, drop undo snapshots */}catch(e){}}
function scheduleChatSave(){clearTimeout(chatSaveTimer);chatSaveTimer=setTimeout(saveChat,250)}
function loadChat(){try{const c=JSON.parse(localStorage.getItem(CHAT_KEY)||'null');if(!c||!Array.isArray(c.messages))return;
 state.messages=c.messages.filter(m=>m&&(m.role==='user'||m.role==='agent')&&typeof m.text==='string');
 if(Array.isArray(c.history)){state.histSeq=c.seq||0;state.history=c.history;state.historyLabels=c.historyLabels||[];state.future=Array.isArray(c.future)?c.future:[];state.futureLabels=c.futureLabels||[]}
 if(!Array.isArray(c.history))state.histSeq=(c.seq||0)+1000; /* undo steps weren't saved: restored replies can't claim the top step */
 if(c.draft&&!state.chatDraft)state.chatDraft=c.draft;state.lastDirectorPrompt=c.last||null;
 if(state.messages.length){state.chatRestoredAt=c.at||Date.now();state.chatRestoredCount=0}updateHistoryButtons();renderRightPanel()}catch(e){console.warn('Chat restore skipped',e)}}
window.addEventListener('pagehide',saveChat);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveChat()});
function saveState(){saveChat();try{localStorage.setItem('replotre_project_v1',JSON.stringify({project:snapshot(),media:state.media.filter(m=>!m.cloud).map(({id,name,kind,duration})=>({id,name,kind,duration}))}));if(!window.ReplotreCloud?.isConnected?.())$('#savedLabel').textContent='Saved locally';}catch(e){$('#savedLabel').textContent='Storage unavailable'}}
function applyMutation(fn, message){if(state.serverBusy)return toast('Director is applying your edit');checkpoint(message);fn();state.playhead=clamp(state.playhead,0,totalDuration());refreshAll();queueSave();if(message)toast(message)}
function refreshAll(){invalidatePreview();updateCanvasSize();playback.update(state.clips,state.media,state.music,state.playhead);renderAssetPanel();renderTimeline();renderRightPanel();updateHeader();drawPreview()}
/* ---------- Preview panel ---------- */
const RATIO_INFO={'9:16':['Vertical','Reels · TikTok · Shorts'],'16:9':['Landscape','YouTube · web'],'1:1':['Square','Feed posts'],'4:5':['Portrait','Instagram feed']};
const ratioGlyph=r=>{const [w,h]=r.split(':').map(Number),k=14/Math.max(w,h);return `<i style="width:${Math.round(w*k)}px;height:${Math.round(h*k)}px"></i>`};
let lastClipLabel=null;
function timecode(t){const f=Math.floor((t%1)*30),s=Math.floor(t)%60,m=Math.floor(t/60)%60,h=Math.floor(t/3600),p=n=>String(n).padStart(2,'0');return `${p(h)}:${p(m)}:${p(s)}:${p(f)}`}
/* ---------- Program monitor ---------- */
const FRAME=1/30,VIEWER_ZOOMS=['fit',.25,.5,1,2];
const zoomName=z=>z==='fit'?'Fit':`${Math.round(z*100)}%`;
function updateMonitorStatic(){const total=totalDuration(),mi=state.markIn,mo=state.markOut;$('#previewDuration').textContent=timecode(total);$('#viewerZoomLabel').textContent=zoomName(state.viewerZoom);
 $('#loopBtn').setAttribute('aria-pressed',String(state.loop));$('#loopBtn').classList.toggle('is-on',state.loop);$('#overlaysBtn').setAttribute('aria-pressed',String(state.overlays));$('#overlaysBtn').classList.toggle('is-on',state.overlays);$('#viewerBurnin').classList.toggle('visible',state.overlays&&state.clips.length>0);
 const has=mi!=null||mo!=null,a=mi??0,b=mo??total;$('#mbRange').hidden=!has;if(has){$('#mbRange .mb-range-text').textContent=`${(b-a).toFixed(2).replace(/\.?0+$/,'')}s`;$('#mbRange').title=`In ${mi!=null?timecode(mi):'start'} → Out ${mo!=null?timecode(mo):'end'} · ${timecode(Math.max(0,b-a))}`}
 const r=$('#poRange');if(r){r.style.display=has&&total?'block':'none';if(total){r.style.left=`${a/total*100}%`;r.style.width=`${Math.max(0,b-a)/total*100}%`}}
 const [w,h]=ratioDims[state.aspect]||ratioDims['9:16'];$('#burnRes').textContent=`${state.aspect} · ${w}×${h}`;
 $$('.mb-center .mb-btn,.mb-left .mb-btn').forEach(btn=>btn.disabled=!state.clips.length&&btn.id!=='viewerZoomBtn');if(typeof renderRuler==='function'&&$('#timelineScroll'))renderRuler()}
function setMark(kind){if(!state.clips.length)return;const t=clamp(state.playhead,0,totalDuration());if(kind==='in'){state.markIn=t;if(state.markOut!=null&&state.markOut<=t+FRAME)state.markOut=null}else{state.markOut=t;if(state.markIn!=null&&state.markIn>=t-FRAME)state.markIn=null}updateMonitorStatic();toast(`${kind==='in'?'In':'Out'} point · ${timecode(t)}`)}
function clearMarks(){if(state.markIn==null&&state.markOut==null)return;state.markIn=state.markOut=null;updateMonitorStatic()}
function stepFrames(n){if(!state.clips.length)return;if(state.playing)pause();seek(Math.round(state.playhead/FRAME+n)*FRAME)}
function loopStart(){return state.markIn??0}
function openViewerZoomMenu(open){const menu=$('#viewerZoomMenu'),btn=$('#viewerZoomBtn');open=open??menu.hidden;if(open)menu.innerHTML=VIEWER_ZOOMS.map(z=>`<button class="mb-menu-opt ${state.viewerZoom===z?'is-current':''}" role="menuitemradio" aria-checked="${state.viewerZoom===z}" data-action="set-viewer-zoom" data-value="${z}">${zoomName(z)}${z==='fit'?'<small>Fit to window</small>':z===1?'<small>Actual pixels</small>':''}</button>`).join('');menu.hidden=!open;btn.setAttribute('aria-expanded',String(open))}
function setViewerZoom(z){state.viewerZoom=z==='fit'?'fit':Number(z);openViewerZoomMenu(false);updateCanvasSize();updateMonitorStatic();drawPreview()}
/* ---------- Markers, snapping, clipboard ---------- */
function setSnap(v){state.snap=!!v;try{localStorage.setItem('replotre_ui_snap',state.snap?'1':'0')}catch(e){}const b=$('#snapBtn');if(b){b.classList.toggle('is-on',state.snap);b.setAttribute('aria-pressed',String(state.snap))}toast(state.snap?'Snapping on':'Snapping off')}
function toggleMarker(){if(!state.clips.length)return;const t=+state.playhead.toFixed(3),near=(state.markers||[]).find(m=>Math.abs(m.t-t)<FRAME*1.5);applyMutation(()=>{if(near)state.markers=state.markers.filter(m=>m!==near);else{state.markers=[...(state.markers||[]),{id:uid('mk'),t}].sort((a,b)=>a.t-b.t).slice(0,200)}},near?'Marker removed':`Marker at ${timecode(t)}`)}
function jumpMarker(dir=1){const ms=(state.markers||[]).map(m=>m.t);if(!ms.length)return toast('No markers yet · press M to add one');const now=state.playhead;const next=dir>0?(ms.find(t=>t>now+FRAME/2)??ms[0]):([...ms].reverse().find(t=>t<now-FRAME/2)??ms[ms.length-1]);seek(next)}
function copySelection(){const t=selectedText(),c=selectedClip();if(t)state.clipboard={kind:'text',data:JSON.parse(JSON.stringify(t))};else if(c)state.clipboard={kind:'clip',data:JSON.parse(JSON.stringify(c))};else return;toast(`Copied ${t?'text layer':'clip'}`)}
function pasteClipboard(){const cb=state.clipboard;if(!cb)return toast('Nothing copied yet');if(cb.kind==='text'){if(!state.clips.length)return;applyMutation(()=>{const n={...cb.data,id:uid('txt'),start:clamp(state.playhead,0,Math.max(0,totalDuration()-.2))};n.duration=Math.min(n.duration,Math.max(.2,totalDuration()-n.start));state.texts.push(n);state.selectedTextId=n.id;state.selectedClipId=null},'Text pasted at playhead')}
 else applyMutation(()=>{const n={...cb.data,id:uid('clip')};const idx=state.clips.findIndex(c=>c.id===state.selectedClipId);state.clips.splice(idx<0?state.clips.length:idx+1,0,n);state.selectedClipId=n.id;state.selectedTextId=null},'Clip pasted')}
function trimSelectionToPlayhead(edge){const t=selectedText(),c=selectedClip(),p=state.playhead;
 if(t){const end=t.start+t.duration;if(edge==='start'){if(p>=end-.2)return toast('Move the playhead before the end of this text');applyMutation(()=>{t.start=+p.toFixed(3);t.duration=+(end-p).toFixed(3)},'Start trimmed to playhead')}
  else{if(p<=t.start+.2)return toast('Move the playhead after the start of this text');applyMutation(()=>{t.duration=+(p-t.start).toFixed(3)},'End trimmed to playhead')}return}
 if(c)return handleAction(edge==='start'?'clip-set-in':'clip-set-out',document.body);toast('Select a clip or text layer first')}
function updatePreviewChrome(){const total=totalDuration(),pct=total?clamp(state.playhead/total*100,0,100):0,fill=$('#poFill');if(!fill)return;fill.style.width=`${pct}%`;
 const t=`00:${fmt(state.playhead)}`.slice(-5),tc=timecode(state.playhead);if($('#poTime').textContent!==t)$('#poTime').textContent=t;if($('#previewTimecode').textContent!==tc)$('#previewTimecode').textContent=tc;if(state.overlays&&$('#burnTc').textContent!==tc)$('#burnTc').textContent=tc;
 const hit=timelineAt(),label=hit?`${hit.clip.id}|${hit.clip.name}`:'';if(label!==lastClipLabel){lastClipLabel=label;$('#previewClipLabel .pcl-name').textContent=hit?hit.clip.name:'No clip';$('#burnClip').textContent=hit?hit.clip.name:'';$('#previewClipLabel').classList.toggle('has-clip',!!hit)}}
function updatePreviewStatic(){const total=totalDuration(),empty=!state.clips.length;$('#poTotal').textContent=`00:${fmt(total)}`.slice(-5);$('#previewEmpty').classList.toggle('visible',empty);$('.preview-section').classList.toggle('is-empty',empty);$('#previewOverlay').classList.toggle('hidden',empty);
 const f=$('#previewFrame');f.dataset.aspect=state.aspect;$('#ratioGlyph').innerHTML=ratioGlyph(state.aspect);$('#gridBtn').setAttribute('aria-pressed',String(!!state.showGuides));$('#gridBtn').classList.toggle('is-on',!!state.showGuides);
 $('#poPlayIcon').innerHTML=ico(state.playing?'pause':'play');$('#previewOverlay').classList.toggle('is-playing',!!state.playing);lastClipLabel=null;$('#mbPlayIcon').innerHTML=ico(state.playing?'pause':'play');updateMonitorStatic();updatePreviewChrome()}
function setPreviewStatus(text,playing,buffering){const mb=$('#mbPlayIcon');if(mb)mb.innerHTML=ico(playing?'pause':'play');const b=$('#previewBadge');if(b)b.dataset.state=buffering?'buffering':playing?'playing':'paused';$('#poPlayIcon').innerHTML=ico(playing?'pause':'play');$('#previewOverlay').classList.toggle('is-playing',!!playing)}
function openRatioMenu(open){const menu=$('#ratioMenu'),btn=$('#ratioBtn');open=open??menu.hidden;if(open){menu.innerHTML=Object.keys(ratioDims).map(r=>{const [name,use]=RATIO_INFO[r]||[r,''],[w,h]=ratioDims[r];return `<button class="ratio-opt ${state.aspect===r?'is-current':''}" role="menuitemradio" aria-checked="${state.aspect===r}" data-action="set-ratio" data-value="${r}"><span class="ratio-glyph">${ratioGlyph(r)}</span><span class="ratio-text"><strong>${name} <em>${r}</em></strong><small>${use}</small></span>${state.aspect===r?ico('check'):''}</button>`}).join('')}menu.hidden=!open;btn.setAttribute('aria-expanded',String(open))}
function saveSnapshot(){if(!state.clips.length)return toast('Add footage first');try{drawPreview(true);const src=$('#previewCanvas'),out=document.createElement('canvas');out.width=src.width;out.height=src.height;const o=out.getContext('2d');
 if(playback.displayed&&videoEl?.readyState>=2){const c=timelineAt()?.clip;o.filter=`brightness(${(c?.brightness??100)/100}) saturate(${(c?.saturation??100)/100})`;drawCover(o,videoEl,out.width,out.height);o.filter='none'}o.drawImage(src,0,0);
 out.toBlob(b=>{if(!b)return toast('Snapshot unavailable for this source');const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${(state.projectName||'frame').replace(/[^\w-]+/g,'-')}-${timecode(state.playhead).replace(/:/g,'')}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast('Frame saved as PNG')},'image/png')}catch(e){toast('Snapshot unavailable for this source')}}
function toggleFullscreen(){const el=$('#previewStage');if(document.fullscreenElement)document.exitFullscreen();else el.requestFullscreen?.()}
/* ---------- Header ---------- */
let nameMeasure=null;
function sizeProjectName(){const el=$('#projectName');if(!el)return;nameMeasure=nameMeasure||document.createElement('canvas').getContext('2d');const cs=getComputedStyle(el);nameMeasure.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;el.style.width=`${Math.ceil(Math.min(280,Math.max(60,nameMeasure.measureText(el.value||el.placeholder||'').width+6)))}px`}
function saveStateFrom(text){return /sav(ing)|upload/i.test(text)?'saving':/unsaved/i.test(text)?'dirty':/conflict|unavailable|fail|error/i.test(text)?'error':'saved'}
function engineStateFrom(text){return /reconnect|offline/i.test(text)?'warn':/live|synced/i.test(text)?'live':/ai director|available|studio/i.test(text)?'ready':'local'}
function updateHeader(){if(document.activeElement!==$('#projectName')){$('#projectName').value=state.projectName;sizeProjectName()}$('#projectMeta').textContent=`${state.aspect} · ${fmt(totalDuration())} · ${state.clips.length} clip${state.clips.length===1?'':'s'}`;$('#ratioLabel').textContent=state.aspect;$('#clipCount').textContent=`${state.clips.length} clip${state.clips.length===1?'':'s'}${state.clips.length?` · ${fmt(totalDuration())}`:''}`;$('#canvasGuide').classList.toggle('visible',state.showGuides);$('#playIcon').innerHTML=ico(state.playing?'pause':'play');const [w,h]=ratioDims[state.aspect]||ratioDims['9:16'];$('#resolutionLabel').textContent=`${w} × ${h}`;updateTimeLabels();updateHistoryButtons();updatePreviewStatic()}
function updatePlaybackPosition(){
 // Runs every playback frame. Read timeline scroll geometry first, before any DOM write, so it never forces a synchronous layout.
 const sc=timelineScrollEl(),geo=sc?{left:sc.scrollLeft,width:sc.clientWidth}:null;
 const current=`00:${fmt(state.playhead)}`.slice(-8);if(transport.current.textContent!==current)transport.current.textContent=current;
 if(geo&&state.playing&&!scrubbing&&performance.now()-lastUserScroll>1200)geo.left=revealPlayhead(true,geo);
 updatePreviewChrome();updateTextSelection();if(timelineAt()?.clip?.keys?.length)applyNativeLook();syncKeyframeUI();{const veil=$('#fadeVeil'),native=!state.exporting&&!!playback.displayed&&timelineAt()?.clip?.kind==='video',a=native?fadeAlphaAt():0;if(veil&&veil._a!==a){veil._a=a;veil.style.opacity=a.toFixed(3)}}const x=LABEL_W+state.playhead*pxPerSec(),transform=`translate3d(${x}px,0,0)`;if(transport.line.style.transform!==transform)transport.line.style.transform=transform;
 const hidden=geo&&x<geo.left+LABEL_W-1;if(transport.line.classList.contains('behind-labels')!==!!hidden)transport.line.classList.toggle('behind-labels',!!hidden);
}
// Keep the playhead on screen. "page" mode flips a page ahead like NLEs do during playback.
// `geo` (pre-read {left,width}) lets per-frame callers avoid layout reads; returns the resulting scrollLeft.
function revealPlayhead(page=false,geo=null){const sc=timelineScrollEl();if(!sc)return 0;const sl=geo?geo.left:sc.scrollLeft,cw=geo?geo.width:sc.clientWidth,x=LABEL_W+state.playhead*pxPerSec(),left=sl+LABEL_W,right=sl+cw,margin=Math.min(60,cw*.1);let to=sl;
 if(x>right-margin)to=page?x-LABEL_W-margin:x-cw+margin*2;else if(x<left+(page?0:margin))to=Math.max(0,x-LABEL_W-margin*2);
 if(to!==sl){sc.scrollLeft=to;to=Math.max(0,Math.min(to,sc.scrollWidth-cw))}return to}
// Zoom while keeping the time under `anchorX` (px from the scroll viewport's left edge) fixed on screen.
function setZoom(next,anchorX=null){const sc=timelineScrollEl(),old=pxPerSec();next=clamp(next,ZOOM_MIN,ZOOM_MAX);if(Math.abs(next-state.zoom)<1e-4)return;
 if(anchorX===null){const ph=LABEL_W+state.playhead*old-sc.scrollLeft;anchorX=ph>=LABEL_W&&ph<=sc.clientWidth?ph:(LABEL_W+sc.clientWidth)/2}
 anchorX=Math.max(LABEL_W,anchorX);const t=(sc.scrollLeft+anchorX-LABEL_W)/old;state.zoom=next;renderTimeline();sc.scrollLeft=Math.max(0,LABEL_W+t*pxPerSec()-anchorX);renderRuler();updatePlaybackPosition()}
function zoomToFit(){const sc=timelineScrollEl(),total=totalDuration();if(!total)return;state.zoom=clamp((sc.clientWidth-LABEL_W-40)/total/32,ZOOM_MIN,ZOOM_MAX);renderTimeline();sc.scrollLeft=0;renderRuler()}
const zoomToSlider=z=>Math.log(z/ZOOM_MIN)/Math.log(ZOOM_MAX/ZOOM_MIN)*100,sliderToZoom=v=>ZOOM_MIN*Math.pow(ZOOM_MAX/ZOOM_MIN,v/100);
function syncZoomSlider(){const sl=$('#zoomSlider');if(!sl||document.activeElement===sl&&sl.dataset.dragging)return;const v=zoomToSlider(state.zoom);sl.value=v.toFixed(1);sl.style.setProperty('--fill',`${v.toFixed(1)}%`)}
function updateTimeLabels(){updatePlaybackPosition();syncZoomSlider();const total=`00:${fmt(totalDuration())}`.slice(-8),zoom=`${Math.round(state.zoom*100)}%`;if(transport.total.textContent!==total)transport.total.textContent=total;if(transport.zoom.textContent!==zoom)transport.zoom.textContent=zoom}
function updateCanvasSize(){const [w,h]=ratioDims[state.aspect]||ratioDims['9:16'];if(!state.exporting){if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}}const f=$('#previewFrame');f.style.aspectRatio=`${w}/${h}`;f.style.width='auto';const z=state.viewerZoom;f.style.height=z==='fit'?'100%':`${Math.round(h*z)}px`;$('.preview-section')?.classList.toggle('is-zoomed',z!=='fit');}
function openDB(){if(!('indexedDB' in window))return Promise.reject(new Error('IndexedDB unsupported'));if(!dbPromise)dbPromise=new Promise((res,rej)=>{const req=indexedDB.open('replotre_assets_v1',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files')};req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});return dbPromise}
async function putFile(id,file){try{const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}catch(e){console.warn('Asset persistence unavailable',e)}}
async function getFile(id){try{const db=await openDB();return await new Promise((res,rej)=>{const req=db.transaction('files','readonly').objectStore('files').get(id);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)})}catch(e){return null}}
async function restore(){try{const saved=JSON.parse(localStorage.getItem('replotre_project_v1'));if(!saved)return;const obj=JSON.parse(saved.project);Object.assign(state,obj);state.media=saved.media||[];const restored=await Promise.all(state.media.map(async m=>{const file=await getFile(m.id);return file?{...m,url:URL.createObjectURL(file)}:null}));state.media=restored.filter(Boolean);state.clips=state.clips.filter(c=>c.kind==='demo'||state.media.some(m=>m.id===c.mediaId));if(state.music&&!state.media.some(m=>m.id===state.music.mediaId))state.music=null;state.selectedClipId=state.clips[0]?.id||null;state.playhead=0;refreshAll()}catch(e){console.warn('Project restore skipped',e)}}
async function getMediaMetadata(file,kind,url){
 if(kind==='image')return {duration:5,width:0,height:0};const el=document.createElement(kind==='audio'?'audio':'video');el.preload='metadata';
 return new Promise(resolve=>{let done=false;const timer=setTimeout(finish,4000);function finish(){if(done)return;done=true;clearTimeout(timer);const meta={duration:Math.min(3600,Number.isFinite(el.duration)?el.duration:10),width:el.videoWidth||0,height:el.videoHeight||0};el.onloadedmetadata=null;el.onerror=null;el.removeAttribute('src');el.load();resolve(meta)}el.onloadedmetadata=finish;el.onerror=finish;el.src=url});
}
async function importFiles(files){const selected=[...files].filter(f=>/^(video|image|audio)\//.test(f.type));if(!selected.length){toast('Choose a video, image, or audio file');return}let cleared=false;for(const file of selected){const kind=file.type.split('/')[0];let id=uid('media'),url=URL.createObjectURL(file),meta=await getMediaMetadata(file,kind,url),cloud=false;try{if(window.ReplotreCloud?.isConnected?.()){const asset=await window.ReplotreCloud.upload(file);id=asset.id;URL.revokeObjectURL(url);url=asset.url;meta={...meta,duration:asset.duration};cloud=true;}}catch(e){URL.revokeObjectURL(url);toast(`Upload failed: ${e.message}`);continue}const m={id,name:file.name,kind,url,duration:Math.max(.2,meta.duration),width:meta.width,height:meta.height,cloud};state.media.push(m);if(!cloud)putFile(id,file);if(kind==='audio'){applyMutation(()=>{state.music={mediaId:id,start:0,volume:.3}},`Added soundtrack: ${file.name}`)}else{applyMutation(()=>{if(!cleared&&state.clips.length&&state.clips.every(c=>c.kind==='demo')){state.clips=[];state.texts=[];state.selectedTextId=null;cleared=true}const c={id:uid('clip'),name:file.name,kind,mediaId:id,in:0,out:kind==='image'?5:m.duration,speed:1,volume:1,brightness:100,saturation:100};state.clips.push(c);state.selectedClipId=c.id;state.playhead=0},`Added ${file.name}`)}}refreshAll()}
function addExistingMedia(id){const m=getMedia(id);if(!m)return;if(m.kind==='audio'){applyMutation(()=>state.music={mediaId:id,start:0,volume:.3},'Soundtrack added');return}applyMutation(()=>{const c={id:uid('clip'),name:m.name,kind:m.kind,mediaId:id,in:0,out:m.kind==='image'?5:m.duration,speed:1,volume:1,brightness:100,saturation:100};state.clips.push(c);state.selectedClipId=c.id},'Added clip to timeline')}
function addText(text='Your story starts here',kind='title',start=state.playhead,duration=3){applyMutation(()=>{const t={id:uid('txt'),text,start:clamp(start,0,Math.max(totalDuration()-.1,0)),duration:Math.max(.5,Math.min(duration,totalDuration()||3)),position:kind==='caption'?'bottom':'center',kind,fontSize:kind==='caption'?27:45,color:'#ffffff',fontWeight:600};state.texts.push(t);state.selectedTextId=t.id;state.selectedClipId=null;state.rightTab='properties'},`${kind==='caption'?'Caption':'Text'} added`)}
// Split follows the selection: a selected text layer is cut at the playhead; otherwise the clip under it.
// ⇧S ("all") cuts the clip and every text layer spanning the playhead in one undo step.
function splitClipIn(hit){const c=hit.clip,offset=state.playhead-hit.start,originalEnd=c.out,mid=c.in+offset*(c.speed||1);c.out=mid;const [lk,rk]=splitKeysAt(c.keys,offset);if(lk)c.keys=lk;const b={...c,...(rk?{keys:rk}:{}),id:uid('clip'),name:c.name.replace(/ • \d+$/,'')+' • 2',in:mid,out:originalEnd,fadeIn:0,xfade:0};c.fadeOut=0;state.clips.splice(hit.index+1,0,b);return b}
// The halves join seamlessly: the left half skips its exit animation, the right half skips its entrance.
function splitTextIn(t,p){const end=t.start+t.duration,b={...t,id:uid('txt'),start:+p.toFixed(3),duration:+(end-p).toFixed(3),cutIn:true};t.duration=+(p-t.start).toFixed(3);t.cutOut=true;state.texts.splice(state.texts.indexOf(t)+1,0,b);return b}
const canSplitClip=hit=>hit&&state.playhead-hit.start>.12&&state.playhead-hit.start<clipDuration(hit.clip)-.12;
const canSplitText=t=>t&&state.playhead>t.start+.1&&state.playhead<t.start+t.duration-.1;
function splitAtPlayhead(scope='auto'){const p=state.playhead,t=selectedText();
 if(scope==='all'){const hit=timelineAt(),texts=state.texts.filter(canSplitText);if(!canSplitClip(hit)&&!texts.length)return toast('Nothing to split at the playhead');
  applyMutation(()=>{let last=null;if(canSplitClip(hit))last=splitClipIn(hit);for(const tx of texts)splitTextIn(tx,p);if(last){state.selectedClipId=last.id;state.selectedTextId=null}},`Split ${[canSplitClip(hit)?'clip':'',texts.length?`${texts.length} text layer${texts.length===1?'':'s'}`:''].filter(Boolean).join(' + ')} at playhead`);return}
 if(t){if(!canSplitText(t))return toast('Move the playhead inside the selected text to split it');applyMutation(()=>{const b=splitTextIn(t,p);state.selectedTextId=b.id;state.selectedClipId=null},'Text split at playhead');return}
 const hit=timelineAt();if(!hit)return toast('Add a clip first');if(!canSplitClip(hit))return toast('Move the playhead inside a clip to split');
 applyMutation(()=>{const b=splitClipIn(hit);state.selectedClipId=b.id;state.selectedTextId=null},'Clip split at playhead')}
function deleteSelection(){if(state.selectedTextId){applyMutation(()=>{state.texts=state.texts.filter(t=>t.id!==state.selectedTextId);state.selectedTextId=null},'Text removed');return}if(state.selectedClipId){applyMutation(()=>{state.clips=state.clips.filter(c=>c.id!==state.selectedClipId);state.selectedClipId=state.clips[0]?.id||null},'Clip removed');return}toast('Select a clip or text layer first')}
function seek(time){playback.seek(clamp(time,0,totalDuration()));if(!scrubbing)revealPlayhead();updateTimeLabels();drawPreview(false)}
function pause(){playback.pause();state.playing=false;transport.play.innerHTML=ico('play')}
function play(){if(!state.clips.length){toast('Import a video or add a sample clip first');return}if(state.loop&&(state.playhead<loopStart()-FRAME||(state.markOut!=null&&state.playhead>=state.markOut-FRAME)||state.playhead>=totalDuration()-FRAME))seek(loopStart());audioCtx?.resume().catch(()=>{});playback.play()}
function togglePlay(){state.playing?pause():play()}
function activeMusic(){return state.music?getMedia(state.music.mediaId):null}
function syncMedia(forceSeek=false){const position=state.playhead;playback.update(state.clips,state.media,state.music,position);if(forceSeek)playback.seek(position)}
function wrapLines(context,text,maxWidth,maxLines=5){let lines=[];for(const raw of String(text).split('\n')){const words=raw.split(/\s+/);let line='';for(const word of words){if(context.measureText((line?line+' ':'')+word).width>maxWidth && line){lines.push(line);line=word}else line+=(line?' ':'')+word}lines.push(line)}return lines.slice(0,maxLines)}
function roundRect(context,x,y,w,h,r,fill,stroke){context.beginPath();context.roundRect(x,y,w,h,r);if(fill){context.fillStyle=fill;context.fill()}if(stroke){context.strokeStyle=stroke;context.stroke()}}
/* ---------- Clip framing, color and fades (shared by preview, native video and export) ---------- */
const LOOKS=[['natural','Natural',{brightness:100,contrast:100,saturation:100}],['vivid','Vivid',{brightness:103,contrast:112,saturation:135}],['punch','Punch',{brightness:100,contrast:128,saturation:118}],['matte','Matte',{brightness:108,contrast:84,saturation:88}],['soft','Soft',{brightness:106,contrast:92,saturation:94}],['mono','Mono',{brightness:100,contrast:112,saturation:0}]];
const clipFilterCSS=c=>{const b=c?.brightness??100,ct=c?.contrast??100,s=c?.saturation??100,w=clamp(+c?.warmth||0,-100,100),bl=clamp(+c?.blur||0,0,100);
 const parts=[];if(b!==100||ct!==100||s!==100)parts.push(`brightness(${b/100}) contrast(${ct/100}) saturate(${s/100})`);
 if(w>0)parts.push(`sepia(${(w/100*.32).toFixed(3)}) saturate(${(1+w/100*.18).toFixed(3)})`);else if(w<0)parts.push(`hue-rotate(${(w/100*-14).toFixed(1)}deg) saturate(${(1+w/100*.12).toFixed(3)}) brightness(${(1-w/100*.03).toFixed(3)})`);
 if(bl>0)parts.push(`blur(${(bl/100*6).toFixed(2)}px)`);return parts.length?parts.join(' '):'none'};
function updateFxOverlay(c){const f=$('#previewFrame');if(!f)return;let v=f.querySelector('.fx-vignette');const k=clamp(+c?.vignette||0,0,100);if(!k){if(v)v.style.opacity='0';return}
 if(!v){v=document.createElement('div');v.className='fx-vignette';v.setAttribute('aria-hidden','true');f.appendChild(v)}v.style.opacity='1';v.style.background=`radial-gradient(ellipse at center, transparent ${Math.round(62-k*.3)}%, rgba(0,0,0,${(k/100*.82).toFixed(3)}) 100%)`}
const clipFadeGain=(c,local)=>{const d=clipDuration(c),fi=Math.min(c.fadeIn||0,d/2),fo=Math.min(c.fadeOut||0,d/2);let g=1;if(fi>0)g=Math.min(g,local/fi);if(fo>0)g=Math.min(g,(d-local)/fo);return clamp(g,0,1)};
function fadeAlphaAt(time=state.playhead){const hit=timelineAt(time);return hit?1-clipFadeGain(hit.clip,time-hit.start):0}
// Draw a source into the frame honouring Fill/Fit, zoom, pan and flip (same geometry the server render uses).
function drawFramed(context,img,w,h,clip){const iw=img.videoWidth||img.naturalWidth||img.width||w,ih=img.videoHeight||img.naturalHeight||img.height||h;if(!iw||!ih)return;const fit=clip?.fit==='fit',z=clamp(clip?.zoom??1,1,3),px=clamp(clip?.panX??0,-1,1),py=clamp(clip?.panY??0,-1,1);
 const s=(fit?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*z,dw=iw*s,dh=ih*s;const x=dw>w?-(dw-w)/2*(1+px):(w-dw)/2,y=dh>h?-(dh-h)/2*(1+py):(h-dh)/2;
 context.save();if(fit){context.fillStyle='#000';context.fillRect(0,0,w,h)}if(clip?.flipH){context.translate(w,0);context.scale(-1,1)}context.drawImage(img,0,0,iw,ih,clip?.flipH?w-x-dw:x,y,dw,dh);context.restore()}
// Native <video> path: express the same framing as CSS so preview and export match.
function applyNativeLook(){const hit=timelineAt(),c0=hit?.clip,c=c0?.keys?.length?framingAt(c0,state.playhead-hit.start):c0,v=videoEl;if(!v)return;if(!c||c.kind!=='video'){v.style.transform='';v.style.objectFit='';return}
 const [W,H]=ratioDims[state.aspect]||ratioDims['9:16'],iw=v.videoWidth||W,ih=v.videoHeight||H,fit=c.fit==='fit',z=clamp(c.zoom??1,1,3);const s=fit?Math.min(W/iw,H/ih):Math.max(W/iw,H/ih),rw=iw*s/W*z,rh=ih*s/H*z;
 const tx=rw>1?-(clamp(c.panX??0,-1,1))*(rw-1)/2/z*100:0,ty=rh>1?-(clamp(c.panY??0,-1,1))*(rh-1)/2/z*100:0;
 v.style.objectFit=fit?'contain':'cover';v.style.background=fit?'#000':'';v.style.transform=`scale(${z}) translate(${tx}%,${ty}%)${c.flipH?' scaleX(-1)':''}`;v.style.filter=clipFilterCSS(c);updateFxOverlay(c)}
/* ---------- Crossfade transitions (centred on the cut, programme length unchanged) ---------- */
const XFADE_DEFAULT=.6,XFADE_MAX=3;
function clipStarts(){let t=0;return state.clips.map(c=>{const s=t;t+=clipDuration(c);return s})}
function xfadeFor(i){if(i<=0||i>=state.clips.length)return 0;const d=+state.clips[i].xfade||0;return d>0?Math.min(d,clipDuration(state.clips[i-1]),clipDuration(state.clips[i]),XFADE_MAX):0}
const maxXfade=i=>Math.max(.2,+Math.min(XFADE_MAX,clipDuration(state.clips[i-1]),clipDuration(state.clips[i])).toFixed(1));
// Where the playhead sits inside a transition: p runs 0→1 across the dissolve; the incoming picture weighs p.
function transitionAt(time=state.playhead){const starts=clipStarts();for(let i=1;i<state.clips.length;i++){const d=xfadeFor(i);if(!d)continue;const cut=starts[i];if(time>=cut-d/2&&time<cut+d/2)return {i,cut,d,p:clamp((time-(cut-d/2))/d,0,1)}}return null}
const stillCache=new Map();
function stillKey(c,edge){return `${c.kind}:${c.mediaId||c.demo}:${edge==='first'?c.in.toFixed(2):c.out.toFixed(2)}`}
// Edge frame of a clip as a canvas (first frame of the incoming shot, last frame of the outgoing one).
function requestStill(c,edge){if(c.kind==='demo')return;const key=stillKey(c,edge);if(stillCache.has(key))return;const m=getMedia(c.mediaId);if(!m)return;stillCache.set(key,'pending');
 const finish=cv=>{stillCache.set(key,cv||'failed');if(cv){invalidatePreview();drawPreview(true)}};
 if(m.kind==='image'){const im=new Image();im.onload=()=>finish(im);im.onerror=()=>finish(null);im.src=m.url;return}
 (async()=>{const v=frameGrabVideo(m);let cv=null;try{await loadGrabVideo(v,m.url);const t=edge==='first'?c.in+.02:Math.max(c.in,c.out-.06);await seekFrame(v,Math.min(t,(v.duration||t+1)-.02));const sc=Math.min(1,720/Math.max(v.videoWidth||720,v.videoHeight||720));cv=document.createElement('canvas');cv.width=Math.max(2,Math.round((v.videoWidth||640)*sc));cv.height=Math.max(2,Math.round((v.videoHeight||360)*sc));cv.getContext('2d').drawImage(v,0,0,cv.width,cv.height)}catch(e){cv=null}finally{releaseGrabVideo(v)}finish(cv)})()}
function stillFor(c,edge){if(c.kind==='demo')return 'demo';const v=stillCache.get(stillKey(c,edge));return v&&v!=='pending'&&v!=='failed'?v:null}
function prefetchStills(){for(let i=1;i<state.clips.length;i++)if(xfadeFor(i)){requestStill(state.clips[i-1],'last');requestStill(state.clips[i],'first')}}
function waitForStills(ms=6000){prefetchStills();const t0=performance.now();return new Promise(res=>{const tick=()=>{const pending=[...stillCache.values()].some(v=>v==='pending');if(!pending||performance.now()-t0>ms)res();else setTimeout(tick,120)};tick()})}
// Paint the other side of an active transition over the current frame.
function drawTransitionOverlay(ctx,w,h){const tr=transitionAt();if(!tr)return 0;const before=state.playhead<tr.cut,other=before?state.clips[tr.i]:state.clips[tr.i-1],alpha=before?tr.p:1-tr.p;if(alpha<=.003)return 0;
 const still=stillFor(other,before?'first':'last');if(!still)return 0;ctx.save();ctx.globalAlpha=alpha;ctx.filter=clipFilterCSS(other);
 if(still==='demo'){const off=document.createElement('canvas');off.width=w;off.height=h;drawDemo(off.getContext('2d',{alpha:false}),other.demo||0,1,w,h);ctx.drawImage(off,0,0)}else drawFramed(ctx,still,w,h,framingAt(other,before?0:clipDuration(other)));ctx.restore();return alpha}
// Plays the *other* clip's audio during a transition, from real footage beyond the edit point when it exists:
// before the cut, the incoming clip's sound from just before its in point; after the cut, the outgoing clip's
// sound just past its out point. The engine ramps the main clip; this ramps the handle (equal power).
const xfAudio=document.createElement('audio');xfAudio.preload='auto';xfAudio.style.display='none';document.body.appendChild(xfAudio);
function syncTransitionAudio(){const tr=state.playing?transitionAt():null;const stop=()=>{if(!xfAudio.paused)xfAudio.pause();xfAudio.dataset.key=''};if(!tr)return stop();
 const before=state.playhead<tr.cut,c=before?state.clips[tr.i]:state.clips[tr.i-1],m=getMedia(c.mediaId);if(!m||m.kind!=='video'||(c.volume??1)<=0)return stop();
 const sp=c.speed||1,src=before?c.in-(tr.cut-state.playhead)*sp:c.out+(state.playhead-tr.cut)*sp;if(src<0||(m.duration&&src>m.duration-.03))return stop();
 const g=(c.volume??1)*(before?Math.sin(tr.p*Math.PI/2):Math.cos(tr.p*Math.PI/2)),key=`${c.id}:${before?'head':'tail'}`;
 if(xfAudio.dataset.src!==m.url){xfAudio.src=m.url;xfAudio.dataset.src=m.url}
 if(xfAudio.dataset.key!==key||Math.abs(xfAudio.currentTime-src)>.2){xfAudio.dataset.key=key;try{xfAudio.currentTime=src}catch(e){}}
 if(xfAudio.playbackRate!==sp)xfAudio.playbackRate=sp;xfAudio.volume=clamp(g,0,1);if(xfAudio.paused)xfAudio.play().catch(()=>{})}
/* ---------- Keyframes: animated zoom & position ---------- */
// keys = [{t, zoom, panX, panY}] with t in clip-local timeline seconds. Values ease (smoothstep) between keys and
// hold before the first / after the last. The server render builds the identical curve as ffmpeg expressions.
const KF_MAX=30,smoothstep=x=>x*x*(3-2*x);
// Same placement maths as drawFramed, returned for layers that must line up with the picture (subject cutouts, frosted glass).
function framedGeom(img,w,h,clip){const iw=img.videoWidth||img.naturalWidth||img.width||w,ih=img.videoHeight||img.naturalHeight||img.height||h;if(!iw||!ih)return null;const fit=clip?.fit==='fit',z=clamp(clip?.zoom??1,1,3),px=clamp(clip?.panX??0,-1,1),py=clamp(clip?.panY??0,-1,1);const s=(fit?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*z,dw=iw*s,dh=ih*s;return {iw,ih,w,h,dw,dh,x:dw>w?-(dw-w)/2*(1+px):(w-dw)/2,y:dh>h?-(dh-h)/2*(1+py):(h-dh)/2,flip:!!clip?.flipH}}
function templateInfo(clip,effC,w,h,fadeA){let src=null;const vel=playback.displayed?.el||videoEl;if(clip?.kind==='video'&&vel?.readyState>=2)src=vel;else if(clip?.kind==='image'){const im=imageCache.get(clip.mediaId);if(im?.complete&&im.naturalWidth)src=im}
 return {w,h,time:state.playhead,template:state.template,clip,src,srcKey:src?`${clip.id}:${clip.kind==='video'?Math.round((src.currentTime||0)*30):0}:${w}x${h}`:'',geom:src?framedGeom(src,w,h,effC):null,filter:clipFilterCSS(clip),playing:state.playing,exporting:state.exporting,fade:fadeA}}
function animValue(keys,p,t,fallback){if(!keys?.length)return fallback;if(t<=keys[0].t)return keys[0][p];const n=keys.length-1;if(t>=keys[n].t)return keys[n][p];for(let i=0;i<n;i++)if(t<keys[i+1].t)return keys[i][p]+(keys[i+1][p]-keys[i][p])*smoothstep((t-keys[i].t)/Math.max(1e-6,keys[i+1].t-keys[i].t));return keys[n][p]}
function framingAt(c,local){if(!c?.keys?.length)return c;return {...c,zoom:animValue(c.keys,'zoom',local,c.zoom??1),panX:animValue(c.keys,'panX',local,c.panX??0),panY:animValue(c.keys,'panY',local,c.panY??0)}}
const clipLocalTime=c=>state.playhead-clipStartTime(c.id);
const keyIndexAt=(c,local)=>(c.keys||[]).findIndex(k=>Math.abs(k.t-local)<=FRAME*1.01);
function setKeyAt(c,local,vals={}){const eff=framingAt(c,local),k={t:+clamp(local,0,clipDuration(c)).toFixed(3),zoom:+clamp(vals.zoom??eff.zoom??1,1,3).toFixed(4),panX:+clamp(vals.panX??eff.panX??0,-1,1).toFixed(4),panY:+clamp(vals.panY??eff.panY??0,-1,1).toFixed(4)};c.keys=(c.keys||[]).filter(x=>Math.abs(x.t-k.t)>FRAME*1.01);c.keys.push(k);c.keys.sort((a,b)=>a.t-b.t);if(c.keys.length>KF_MAX)c.keys.length=KF_MAX}
function dropKeys(c,local){const eff=framingAt(c,local);c.zoom=eff.zoom;c.panX=eff.panX;c.panY=eff.panY;delete c.keys}
const shiftKeys=(keys,d)=>keys?.length?keys.map(k=>({...k,t:+(k.t-d).toFixed(4)})):keys;
function splitKeysAt(keys,cut){if(!keys?.length)return [keys,keys];const at=t=>({t,zoom:animValue(keys,'zoom',cut,1),panX:animValue(keys,'panX',cut,0),panY:animValue(keys,'panY',cut,0)});return [[...keys.filter(k=>k.t<cut-1e-6),at(+cut.toFixed(3))],[at(0),...keys.filter(k=>k.t>cut+1e-6).map(k=>({...k,t:+(k.t-cut).toFixed(3)}))]]}
function syncKeyframeUI(){const c=selectedClip();if(!c?.keys?.length||state.rightTab!=='properties')return;const root=$('#rightContent');if(!root)return;const local=clipLocalTime(c),eff=framingAt(c,clamp(local,0,clipDuration(c)));
 const now=root.querySelector('.kf-now');if(now){const inside=local>=0&&local<=clipDuration(c);now.style.left=`${clamp(local/clipDuration(c),0,1)*100}%`;now.style.opacity=inside?'1':'0'}
 const add=root.querySelector('[data-action="kf-set"]');if(add)add.classList.toggle('is-key',keyIndexAt(c,local)>=0);
 for(const [chg,v] of [['clip-zoom',Math.round(eff.zoom*100)],['clip-pan-x',Math.round(eff.panX*100)],['clip-pan-y',Math.round(eff.panY*100)]]){const r=root.querySelector(`input[data-change="${chg}"]`);if(!r||document.activeElement===r||+r.value===v)continue;r.value=v;r.style.setProperty('--fill',`${((v-+r.min)/(+r.max-+r.min)*100).toFixed(1)}%`);const out=r.closest('.pp-slider')?.querySelector('.pp-value');if(out)out.textContent=v+(out.dataset.unit||'')}}
function drawCover(context,img,w,h){const iw=img.videoWidth||img.naturalWidth||w,ih=img.videoHeight||img.naturalHeight||h;if(!iw||!ih)return;const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale,sx=(iw-sw)/2,sy=(ih-sh)/2;context.drawImage(img,sx,sy,sw,sh,0,0,w,h)}
const imageCache=new Map();
const sampleFrameCache=new Map();
function drawDemo(context,demo,time,w,h){
 const cacheKey=`${demo%3}:${w}x${h}`;
 let cached=sampleFrameCache.get(cacheKey);
 if(cached){context.drawImage(cached,0,0,w,h);return}
 const outputContext=context;
 const imageCanvas=document.createElement('canvas'); imageCanvas.width=w; imageCanvas.height=h;
 context=imageCanvas.getContext('2d',{alpha:false});
 // Art-directed sample footage: the preview is the bright moment; the editor chrome stays quiet.
 const palettes=[
  {skyTop:'#847b73',skyMid:'#c59b75',skyBottom:'#e6b787',sun:'#f6d8a8',far:'#8b7766',mid:'#5b584d',front:'#303b39',land:'#1b292b'},
  {skyTop:'#6a6560',skyMid:'#bc7758',skyBottom:'#e8a078',sun:'#f7d0a6',far:'#976754',mid:'#655349',front:'#3d3c39',land:'#242c2e'},
  {skyTop:'#2b4853',skyMid:'#668484',skyBottom:'#d4b298',sun:'#efe1c1',far:'#687f7e',mid:'#405c62',front:'#293f45',land:'#182a30'}
 ];
 const p=palettes[demo%3];
 context.save();
 const horizon=.53*h;
 const sky=context.createLinearGradient(0,0,0,h);
 sky.addColorStop(0,p.skyTop);sky.addColorStop(.48,p.skyMid);sky.addColorStop(.70,p.skyBottom);sky.addColorStop(1,p.land);
 context.fillStyle=sky;context.fillRect(0,0,w,h);
 // Distant sun, rendered as part of the scene rather than a glowing UI ornament.
 const sunX=w*(demo===2?.67:.67)+Math.sin(time*.08)*w*.008,sunY=h*(demo===2?.38:.43);
 const sunR=Math.min(w,h)*.17;
 context.fillStyle=p.sun;context.globalAlpha=demo===2?.65:.84;
 context.beginPath();context.arc(sunX,sunY,sunR,0,Math.PI*2);context.fill();context.globalAlpha=1;
 // Soft atmospheric banding creates photographic depth.
 for(let i=0;i<10;i++){
  const bandY=h*(.39+i*.025);
  context.fillStyle=i%2?'#fff7':'#1c262207';context.fillRect(0,bandY,w,h*.012);
 }
 const ridge=(points,color)=>{context.beginPath();context.moveTo(0,h);context.lineTo(0,points[0][1]*h);
  for(let i=1;i<points.length;i++)context.lineTo(points[i][0]*w,points[i][1]*h);
  context.lineTo(w,h);context.closePath();context.fillStyle=color;context.fill();};
 ridge([[0,.60],[.09,.59],[.22,.55],[.34,.58],[.49,.51],[.6,.55],[.77,.48],[.86,.51],[1,.49]],p.far);
 ridge([[0,.69],[.14,.64],[.28,.68],[.43,.59],[.57,.63],[.73,.57],[.86,.61],[1,.56]],p.mid);
 ridge([[0,.78],[.16,.71],[.32,.77],[.48,.69],[.62,.73],[.81,.65],[1,.70]],p.front);
 ridge([[0,.94],[.16,.86],[.35,.92],[.5,.83],[.67,.9],[.8,.81],[1,.86]],p.land);
 // A long vanishing road: a small visual metaphor for an unfolding edit.
 const road=context.createLinearGradient(0,h*.78,0,h);road.addColorStop(0,'#28312f');road.addColorStop(1,'#101e20');
 context.beginPath();context.moveTo(w*.51,h*.77);context.lineTo(w*.57,h*.77);context.lineTo(w*.89,h);context.lineTo(w*.08,h);context.closePath();context.fillStyle=road;context.fill();
 context.beginPath();context.moveTo(w*.54,h*.82);context.lineTo(w*.55,h*.83);context.lineTo(w*.56,h*.91);context.lineTo(w*.57,h*.925);context.strokeStyle='#dec2a777';context.lineWidth=Math.max(1,w*.003);context.stroke();
 // Foreground silhouettes and thin film texture.
 context.fillStyle='#101c1c';context.fillRect(0,h*.979,w,h*.021);
 for(let i=0;i<550;i++){
  const n=(i*1664525+1013904223)>>>0;
  const x=((n%4096)/4096)*w,y=(((n>>>11)%2048)/2048)*h;
  context.fillStyle=i%3===0?'#ffffff11':'#00000010';context.fillRect(x,y,Math.max(.8,w*.0015),Math.max(.8,h*.0008));
 }
 const shade=context.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#0a121b44');shade.addColorStop(.24,'#00000000');shade.addColorStop(.72,'#00000008');shade.addColorStop(1,'#070e13a9');
 context.fillStyle=shade;context.fillRect(0,0,w,h);
 // Film slate details, subtle enough to remain behind editable title layers.
 context.strokeStyle='#ffffff52';context.lineWidth=Math.max(1,w*.0014);
 const bx=w*.066,by=h*.06;context.beginPath();context.moveTo(bx,by+h*.026);context.lineTo(bx,by);context.lineTo(bx+w*.048,by);context.moveTo(w-bx-w*.048,by);context.lineTo(w-bx,by);context.lineTo(w-bx,by+h*.026);context.stroke();
 context.font=`${Math.max(9,w*.021)}px ui-monospace, monospace`;context.fillStyle='#f6f0e1bd';context.textAlign='left';context.fillText('REPLOTRE  /  FIELD NOTES',bx,by+h*.044);
 context.textAlign='right';context.fillText(`FRAME 0${demo+1}   •   24 FPS`,w-bx,by+h*.044);
 context.textAlign='left';context.font=`${Math.max(9,w*.019)}px ui-monospace, monospace`;context.fillStyle='#f3e7d5bd';context.fillText(['COASTLINE   /   17:42','THE LAST LIGHT   /   18:06','AFTER THE SUN   /   18:29'][demo%3],w*.067,h*.919);
 context.beginPath();context.moveTo(w*.067,h*.94);context.lineTo(w*.933,h*.94);context.strokeStyle='#fff7';context.lineWidth=1;context.stroke();
 context.restore();
 sampleFrameCache.set(cacheKey,imageCanvas);
 outputContext.drawImage(imageCanvas,0,0,w,h);
}

const DEMO_SAMPLES=[{name:'First light',mood:'Dawn'},{name:'Golden hour',mood:'Sunset'},{name:'Blue hour',mood:'Dusk'}];
// Sample-clip thumbnails are drawn after the studio is on screen (drawing + JPEG-encoding all three up front blocked startup for ~2 s).
const BLANK_POSTER='data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const demoCardPosters=[BLANK_POSTER,BLANK_POSTER,BLANK_POSTER];
let demoPostersQueued=false;
function queueDemoPosters(){if(demoPostersQueued)return;demoPostersQueued=true;const idle=window.requestIdleCallback?cb=>requestIdleCallback(cb,{timeout:1500}):cb=>setTimeout(cb,200);
 const make=i=>{if(i>2){if(state.clips.some(c=>c.kind==='demo'))refreshAll();return}
  const c=document.createElement("canvas");c.width=256;c.height=160;drawDemo(c.getContext("2d",{alpha:false}),i,1,c.width,c.height);
  c.toBlob(b=>{if(b){demoCardPosters[i]=URL.createObjectURL(b);document.querySelectorAll(`[data-action="add-demo"][data-index="${i}"] img.poster`).forEach(img=>img.src=demoCardPosters[i])}idle(()=>make(i+1))},'image/jpeg',.85)};
 idle(()=>make(0))}
/* Real sample footage (Mixkit free licence, see assets/demo/CREDITS.md). It goes through the normal import path, so
   it behaves exactly like the user's own upload: real frames, trimming, thumbnails, cloud sync and AI analysis. */
const REAL_SAMPLES=[{file:'vlog.mp4',name:'Sample · Talking to camera.mp4'},{file:'friends.mp4',name:'Sample · Dance duo.mp4'},{file:'looks.mp4',name:'Sample · Creator setup.mp4'}];
let sampleBusy=false;
async function addSample(idx){if(sampleBusy)return;const smp=REAL_SAMPLES[idx]||REAL_SAMPLES[0];
 const existing=state.media.find(m=>m.name===smp.name);if(existing){addExistingMedia(existing.id);return}
 sampleBusy=true;document.querySelectorAll('[data-action="add-demo"]').forEach(b=>{b.disabled=true;b.dataset.label=b.innerHTML;b.innerHTML='<span>Loading sample…</span>'});
 try{const r=await fetch('/assets/demo/'+smp.file,{credentials:'same-origin'});if(!r.ok)throw new Error('Sample unavailable');
  const blob=await r.blob();await importFiles([new File([blob],smp.name,{type:'video/mp4'})])}
 catch(e){toast(`Couldn’t load the sample: ${e.message}`)}
 finally{sampleBusy=false;document.querySelectorAll('[data-action="add-demo"]').forEach(b=>{b.disabled=false;if(b.dataset.label)b.innerHTML=b.dataset.label})}}
function addDemo(idx){const sample=DEMO_SAMPLES[idx]||DEMO_SAMPLES[0];applyMutation(()=>{const c={id:uid('demo'),kind:'demo',demo:idx,name:sample.name,in:0,out:5,speed:1,volume:1,brightness:100,saturation:100};state.clips.push(c);state.selectedClipId=c.id;state.selectedTextId=null},`Added ${sample.name}`)}
function demoCardMarkup(i){const sample=DEMO_SAMPLES[i],used=state.clips.filter(c=>c.kind==='demo'&&(c.demo||0)===i).length;
 return `<button class="asset-card kind-sample ${used?'in-use':''}" data-action="add-demo" data-index="${i}" draggable="true" title="${escapeHTML(sample.name)}: click to add, or drag onto the timeline">`+
 `<div class="asset-thumb has-poster"><img class="poster" src="${demoCardPosters[i]}" alt="" draggable="false">`+
 `<span class="thumb-kind" aria-hidden="true">${ico('film')}</span>`+
 `${used?`<span class="thumb-used" title="On timeline${used>1?` ×${used}`:''}">${ico('check')}${used>1?`<b>${used}</b>`:''}</span>`:''}`+
 `<span class="thumb-add" aria-hidden="true">${ico('plus')}</span><span class="thumb-time">00:05</span></div>`+
 `<div class="asset-name"><span class="asset-base">${escapeHTML(sample.name)}</span></div>`+
 `<div class="asset-sub">Sample · ${sample.mood}</div></button>`}
function drawTextOverlay(context,item,local,w,h){const scale=Math.min(w/540,h/700);let fontSize=Math.max(15,(item.fontSize||42)*scale);const caption=item.kind==='caption';if(caption)fontSize=Math.max(14,(item.fontSize||28)*scale);context.save();const fade=Math.min(1,local/.22,(item.duration-local)/.18);context.globalAlpha=Math.max(0,fade);context.textAlign='center';context.textBaseline='middle';context.font=`${item.fontWeight||800} ${fontSize}px '${state.brandFont}', 'Arial', sans-serif`;const lines=wrapLines(context,item.text,w*(caption?.83:.82));const lineHeight=fontSize*(caption?1.24:1.17),allHeight=lines.length*lineHeight;const free=Number.isFinite(item.x)&&Number.isFinite(item.y),cx=free?item.x*w:w*.5,y=free?item.y*h:item.position==='top'?h*.20:item.position==='bottom'?h*.78:h*.53;context.shadowColor='#0009';context.shadowBlur=20*scale;context.shadowOffsetY=3*scale;
 if(caption?item.bg!=='none':item.bg==='box'){const widest=Math.max(...lines.map(x=>context.measureText(x).width)),boxFill=/^#[0-9a-f]{6}$/i.test(item.bgColor||'')?item.bgColor+'e6':null;if(!caption){context.save();context.shadowColor='transparent';roundRect(context,cx-widest/2-fontSize*.35,y-allHeight/2-fontSize*.22,widest+fontSize*.7,allHeight+fontSize*.44,fontSize*.18,boxFill||'#000000a6');context.restore()}else{context.save();if(boxFill)context.shadowColor='transparent';roundRect(context,cx-widest/2-12*scale,y-allHeight/2-8*scale,widest+24*scale,allHeight+16*scale,12*scale,boxFill||'#0a0913aa');context.restore()}}
 lines.forEach((line,i)=>{context.strokeStyle='#0007';context.lineWidth=Math.max(2,4*scale);const lineY=y-allHeight/2+lineHeight*(i+.5);context.strokeText(line,cx,lineY);context.fillStyle=item.color||'#fff';context.fillText(line,cx,lineY)});context.restore()}
const previewMetrics={canvasPaints:0,videoCanvasCopies:0,textRasterizations:0};
const overlayCache=new Map();let previewRevision=0,lastPreviewKey='',sortedPreviewTexts=[],previewTextCursor=0,previewTextActive=[],lastOverlayTime=-1;
function invalidatePreview(){previewRevision++;lastPreviewKey='';overlayCache.clear();sortedPreviewTexts=[...state.texts].sort((a,b)=>a.start-b.start);previewTextCursor=0;previewTextActive=[];lastOverlayTime=-1}
function textLayersAt(time){
 if(time<lastOverlayTime){previewTextCursor=0;previewTextActive=[]}
 lastOverlayTime=time;previewTextActive=previewTextActive.filter(t=>t.start+t.duration>=time);
 while(previewTextCursor<sortedPreviewTexts.length&&sortedPreviewTexts[previewTextCursor].start<=time){const t=sortedPreviewTexts[previewTextCursor++];if(t.start+t.duration>=time)previewTextActive.push(t)}
 return previewTextActive;
}
/* ---------- On-canvas text editing ---------- */
let textMeasureCtx=null;
// Text block bounds in canvas pixels, using exactly the layout drawTextOverlay uses.
function textBox(item,w,h){const scale=Math.min(w/540,h/700),caption=item.kind==='caption';let fontSize=Math.max(15,(item.fontSize||42)*scale);if(caption)fontSize=Math.max(14,(item.fontSize||28)*scale);
 textMeasureCtx=textMeasureCtx||document.createElement('canvas').getContext('2d');const c=textMeasureCtx;c.font=`${item.fontWeight||800} ${fontSize}px '${state.brandFont}', 'Arial', sans-serif`;
 const lines=wrapLines(c,item.text||' ',w*(caption?.83:.82)),lineHeight=fontSize*(caption?1.24:1.17),height=lines.length*lineHeight,width=Math.max(...lines.map(l=>c.measureText(l).width),fontSize*.6);
 const free=Number.isFinite(item.x)&&Number.isFinite(item.y),cx=free?item.x*w:w*.5,cy=free?item.y*h:item.position==='top'?h*.20:item.position==='bottom'?h*.78:h*.53,pad=(caption?14:8)*scale;
 return {cx,cy,left:cx-width/2-pad,top:cy-height/2-pad,width:width+pad*2,height:height+pad*2}}
const textVisibleAt=(t,time)=>time>=t.start&&time<t.start+t.duration;
function frameToCanvas(e){const r=$('#previewFrame').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*canvas.width,y:(e.clientY-r.top)/r.height*canvas.height,sx:canvas.width/r.width,sy:canvas.height/r.height}}
function hitText(e){const p=frameToCanvas(e),w=canvas.width,h=canvas.height;const vis=state.texts.filter(t=>textVisibleAt(t,state.playhead));for(let i=vis.length-1;i>=0;i--){const b=textBox(vis[i],w,h);if(p.x>=b.left&&p.x<=b.left+b.width&&p.y>=b.top&&p.y<=b.top+b.height)return vis[i]}return null}
function updateTextSelection(){const box=$('#textSelect');if(!box)return;const t=selectedText();const ov=$('#previewOverlay');if(!t||state.exporting||state.playing||!textVisibleAt(t,state.playhead)){if(!box.hidden)box.hidden=true;ov?.classList.remove('has-text-selection');return}ov?.classList.add('has-text-selection');
 const f=$('#previewFrame'),r=f.getBoundingClientRect();if(!r.width)return;const b=textBox(t,canvas.width,canvas.height),kx=r.width/canvas.width,ky=r.height/canvas.height;
 box.hidden=false;box.style.left=`${b.left*kx}px`;box.style.top=`${b.top*ky}px`;box.style.width=`${b.width*kx}px`;box.style.height=`${b.height*ky}px`;box.classList.toggle('label-below',b.top*ky<26)}
// Selecting a layer brings the playhead inside it so edits are always visible in the viewer.
function revealTextLayer(t){if(t&&!textVisibleAt(t,state.playhead)&&!state.playing)seek(Math.min(t.start+Math.min(.35,t.duration/2),Math.max(0,totalDuration()-.01)))}
function selectTextLayer(t,{reveal=true}={}){if(!t)return;state.selectedTextId=t.id;state.selectedClipId=null;state.rightTab='properties';if(reveal)revealTextLayer(t);renderTimeline();renderRightPanel();if(innerWidth>700&&innerWidth<=980)setRightCollapsed?.(false);updateTextSelection()}
function focusTextEditor(){state.rightTab='properties';if(innerWidth<=700){$('#rightPanel').classList.add('is-open');$('#assetPanel').classList.remove('is-open');setMobileNav('ai')}else if(innerWidth<=980)setRightCollapsed?.(false);renderRightPanel();const ta=$('#rightContent textarea[data-change="text-content"]');if(ta){ta.focus();ta.select()}}
function overlayBitmap(item,w,h){
 const key=JSON.stringify([item.id,item.text,item.kind,item.position,item.x,item.y,item.color,item.bgColor,item.fontSize,item.fontWeight,item.bg,state.brandFont,w,h]);
 let bitmap=overlayCache.get(key);if(bitmap){overlayCache.delete(key);overlayCache.set(key,bitmap);return bitmap}
 previewMetrics.textRasterizations++;bitmap=document.createElement('canvas');bitmap.width=w;bitmap.height=h;const context=bitmap.getContext('2d');drawTextOverlay(context,{...item,duration:10},1,w,h);
 overlayCache.set(key,bitmap);if(overlayCache.size>8)overlayCache.delete(overlayCache.keys().next().value);return bitmap;
}
function drawPreview(force=true){
 const w=canvas.width,h=canvas.height,hit=playback.entry?{clip:playback.entry.clip,local:playback.entry.clip.in+(state.playhead-playback.entry.start)*(playback.entry.clip.speed||1)}:timelineAt(),clip=hit?.clip;
 const nativeVideo=clip?.kind==='video'&&!state.exporting&&!!playback.displayed;updateFxOverlay(clip);
 const layers=textLayersAt(state.playhead).map(item=>{const anim=item.anim||'fade',since=state.playhead-item.start,editing=!state.playing&&!state.exporting&&item.id===state.selectedTextId;if(editing||(!state.playing&&!state.exporting&&since<.22))return {item,alpha:1,dy:0}; /* paused on a layer's first frame: show it; the fade-in is for playback */const alpha=anim==='none'?1:clamp(Math.min(1,item.cutIn?1:since/.22,item.cutOut?1:(item.start+item.duration-state.playhead)/.18),0,1);const dy=anim==='slide'&&!item.cutIn?Math.pow(1-clamp(since/.35,0,1),2)*h*.04:0;return {item,alpha,dy}});const fadeA=fadeAlphaAt();
 const effC=clip?.keys?.length?framingAt(clip,state.playhead-clipStartTime(clip.id)):clip,trNow=transitionAt(),TF=state.template&&clip?window.ReplotreTemplates:null,tInfo=TF?templateInfo(clip,effC,w,h,fadeA):null,key=`${TF?TF.frameKey(tInfo)+(tInfo.src?'v':'n')+'|':''}${effC!==clip?`${Math.round(effC.zoom*800)}:${Math.round(effC.panX*800)}:${Math.round(effC.panY*800)}:`:''}${previewRevision}:${w}:${h}:${clip?.id}:${nativeVideo}:${Math.round(fadeA*90)}:${trNow?Math.round(trNow.p*120)+':'+trNow.i:''}:${layers.map(({item,alpha,dy})=>item.id+':'+Math.round(alpha*120)+':'+Math.round(dy)).join('|')}`;
 if(!force&&!state.exporting&&key===lastPreviewKey)return;lastPreviewKey=key;previewMetrics.canvasPaints++;
 ctx.clearRect(0,0,w,h);if(!nativeVideo){ctx.fillStyle='#161718';ctx.fillRect(0,0,w,h)}
 if(!clip){ctx.fillStyle='#232526';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='#b8b7ae';ctx.font=`700 ${Math.round(w*.055)}px sans-serif`;ctx.fillText('Start your story',w/2,h/2);return}
 if(!nativeVideo){ctx.save();ctx.filter=clipFilterCSS(clip);
  if(clip.kind==='demo')drawDemo(ctx,clip.demo||0,hit.local,w,h);
  else if(clip.kind==='video'){if(videoEl.readyState>=2)try{drawFramed(ctx,videoEl,w,h,effC);previewMetrics.videoCanvasCopies++}catch{}}
  else if(clip.kind==='image'){let cached=imageCache.get(clip.mediaId);const media=getMedia(clip.mediaId);if(!cached&&media){cached=new Image();cached.src=media.url;cached.onload=()=>drawPreview();imageCache.set(clip.mediaId,cached);if(imageCache.size>3)imageCache.delete(imageCache.keys().next().value)}if(cached?.complete&&cached.naturalWidth)drawFramed(ctx,cached,w,h,effC)}
  ctx.restore();
  if(trNow)drawTransitionOverlay(ctx,w,h);
  if(fadeA>0.002){ctx.fillStyle=`rgba(0,0,0,${fadeA.toFixed(3)})`;ctx.fillRect(0,0,w,h)}
 }else if(trNow)drawTransitionOverlay(ctx,w,h);
 if(TF)try{TF.drawUnder(ctx,tInfo)}catch(e){console.warn('Template layer failed',e)}
 for(const {item,alpha,dy} of layers){if(alpha<=0)continue;ctx.globalAlpha=alpha;ctx.drawImage(overlayBitmap(item,w,h),0,dy,w,h)}ctx.globalAlpha=1;
 if(TF)try{TF.drawOver(ctx,tInfo)}catch(e){console.warn('Template overlay failed',e)}
}
/* ---------- Media library cards ---------- */
const posterCache=new Map(),posterPending=new Set();
function resolutionLabel(m){const w=m.width||0,h=m.height||0;if(!w||!h)return '';const short=Math.min(w,h);return short>=2160?'4K':short>=1440?'1440p':short>=1080?'1080p':short>=720?'720p':`${w}×${h}`}
function mediaUsage(id){return state.clips.reduce((n,c)=>n+(c.mediaId===id?1:0),0)+(state.music?.mediaId===id?1:0)}
// Grab a real frame (10% in, skipping black lead-ins) for video thumbnails; cached per session.
// Frame-grab helpers. A detached <video> can report "seeked" before the frame is decoded (Chrome then draws
// black), so grabs use an offscreen-but-attached element and wait for the frame to actually be presented.
function frameGrabVideo(m){const v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';if(m.cloud)v.crossOrigin='anonymous';v.setAttribute('aria-hidden','true');v.style.cssText='position:fixed;left:-9999px;top:0;width:160px;height:90px;opacity:0;pointer-events:none';document.body.appendChild(v);return v}
function releaseGrabVideo(v){v.onerror=v.onloadedmetadata=null;try{v.pause();v.removeAttribute('src');v.load()}catch(e){}v.remove()}
function loadGrabVideo(v,url){return new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout')),10000);v.onloadeddata=()=>{clearTimeout(t);res()};v.onerror=()=>{clearTimeout(t);rej(new Error('load'))};v.src=url})}
function seekFrame(v,time){return new Promise(res=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(guard);res()};const guard=setTimeout(finish,1500);
 v.addEventListener('seeked',()=>{if(v.requestVideoFrameCallback){v.requestVideoFrameCallback(()=>finish());setTimeout(finish,300)}else requestAnimationFrame(()=>requestAnimationFrame(finish))},{once:true});v.currentTime=Math.max(0,time)})}
function frameLuma(v){const c=document.createElement('canvas');c.width=16;c.height=9;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0,16,9);const d=x.getImageData(0,0,16,9).data;let sum=0;for(let i=0;i<d.length;i+=4)sum+=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;return sum/(d.length/4)}
// Poster: try a few moments and keep the first that isn't (nearly) black, e.g. clips that fade in from black.
function requestPoster(m){if(m.kind!=='video'||!m.url||posterCache.has(m.id)||posterPending.has(m.id))return;posterPending.add(m.id);
 (async()=>{const v=frameGrabVideo(m);let url=null;try{await loadGrabVideo(v,m.url);const d=v.duration||m.duration||1;let best=null,bestLuma=-1;
  for(const f of [.12,.3,.5,.72,.04]){await seekFrame(v,Math.min(d-.05,d*f));const l=frameLuma(v);if(l>bestLuma){bestLuma=l;best=v.currentTime}if(l>40)break}
  if(Math.abs(v.currentTime-best)>.01)await seekFrame(v,best);
  const c=document.createElement('canvas'),scale=Math.min(1,360/(v.videoWidth||360));c.width=Math.max(1,Math.round((v.videoWidth||320)*scale));c.height=Math.max(1,Math.round((v.videoHeight||180)*scale));c.getContext('2d').drawImage(v,0,0,c.width,c.height);url=c.toDataURL('image/jpeg',.82)}catch(e){url=null}finally{releaseGrabVideo(v)}
  posterPending.delete(m.id);if(!url)return;posterCache.set(m.id,url);$$(`.asset-card[data-id="${CSS.escape(m.id)}"] .asset-thumb`).forEach(t=>{t.classList.add('has-poster');let img=t.querySelector('img.poster');if(!img){img=document.createElement('img');img.className='poster';img.alt='';img.draggable=false;t.prepend(img)}img.src=url})})()}
function assetCardMarkup(m){const poster=m.kind==='image'?m.url:(m.analysis?.thumbnail||posterCache.get(m.id));if(!poster)requestPoster(m);
 const used=mediaUsage(m.id),res=resolutionLabel(m),kindIcon=m.kind==='video'?'film':m.kind==='audio'?'music':'image',kindName=m.kind[0].toUpperCase()+m.kind.slice(1);
 const meta=[kindName,res].filter(Boolean).join(' · ');
 const ext=(m.name.match(/\.[^.]+$/)||[''])[0],base=ext?m.name.slice(0,-ext.length):m.name;
 const bars=m.kind==='audio'?`<span class="thumb-wave">${Array.from({length:22},(_,i)=>`<i style="height:${18+Math.round(Math.abs(Math.sin(i*1.7+m.name.length))*62)}%"></i>`).join('')}</span>`:'';
 return `<button class="asset-card kind-${m.kind} ${used?'in-use':''}" data-action="add-media" data-id="${escapeHTML(m.id)}" draggable="true" title="${escapeHTML(m.name)} — click to add, or drag onto the timeline">`+
 `<div class="asset-thumb ${poster?'has-poster':''}">${poster?`<img class="poster" src="${escapeHTML(poster)}" alt="" loading="lazy" draggable="false">`:''}${bars}`+
 `${m.kind==='video'?'<video class="hover-preview" muted playsinline preload="none" aria-hidden="true"></video><span class="scrub-bar"><i></i></span>':''}`+
 `<span class="thumb-kind" aria-hidden="true">${ico(kindIcon)}</span>`+
 `${used?`<span class="thumb-used" title="On timeline${used>1?` ×${used}`:''}">${ico('check')}${used>1?`<b>${used}</b>`:''}</span>`:''}`+
 `<span class="thumb-add" aria-hidden="true">${ico('plus')}</span>`+
 `${m.kind==='image'?'':`<span class="thumb-time">${fmt(m.duration)}</span>`}</div>`+
 `<div class="asset-name"><span class="asset-base">${escapeHTML(base)}</span><span class="asset-ext">${escapeHTML(ext)}</span></div>`+
 `<div class="asset-sub">${escapeHTML(meta)}</div></button>`}
function renderAssetPanel(){const headings={media:'Media library',intelligence:'Intelligence',templates:'Templates',text:'Typography',audio:'Audio studio',brand:'Brand kit',variants:'Creative variants',effects:'Effects',transitions:'Transitions'};$('#assetHeading').textContent=headings[state.tab];$$('.rail-item[data-tab]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.tab===state.tab);btn.setAttribute('aria-current',btn.dataset.tab===state.tab?'page':'false')});$$('.mt-chip').forEach(c=>{const on=c.dataset.value===state.tab;c.classList.toggle('is-active',on);c.setAttribute('aria-selected',String(on));if(on&&innerWidth<=700)c.scrollIntoView?.({block:'nearest',inline:'nearest'})});updateRailIndicator();updateRailBadges();const body=$('#assetContent');if(state.tab==='intelligence'){window.ReplotreIntelligence?.render(body);return}if(state.tab==='effects'){body.innerHTML=renderEffectsPanel();return}if(state.tab==='transitions'){body.innerHTML=renderTransitionsPanel();return}const uploadInfo=window.ReplotreCloud?.isConnected?.()?'Uploaded media is private to your account.':'Files stay on this device until you sign in.';
 if(state.tab==='media'){
  const cards=state.media.map(assetCardMarkup).join('');
  const tplCards=featuredTemplates().map(templateTileMarkup).join('');
  body.innerHTML=`<div class="upload-zone" data-action="upload"><span class="upload-icon">${ico('cloud-upload')}</span><strong>Drop your footage here</strong><small>Or <em>browse files</em> to upload<br/>MP4, MOV, WebM, images & audio</small></div><div class="section-heading"><span>Your uploads <span class="section-count">${state.media.length}</span></span><button class="section-add" data-action="upload">${ico('plus')}<span>Add new</span></button></div>${state.media.length?`<div class="media-grid">${cards}</div>`:`<div class="asset-placeholder">Imported footage appears here. ${uploadInfo}</div>`}${tplCards?`<div class="section-heading"><span>Templates</span><button class="section-add" data-action="see-templates">${ico('grid')}<span>See all</span></button></div><div class="mt-grid">${tplCards}</div><p class="mt-note">Pick a look: it fits itself to your clips, speech and beats.</p>`:''}<div class="section-heading"><span>Project file</span></div><button class="mini-action" data-action="download-project">${ico('file-json')} Download project JSON</button><button class="mini-action" data-action="open-project" style="margin-top:8px">${ico('upload-cloud')} Open saved project</button>`;
  playTemplateTiles(body);
 }else if(state.tab==='templates'){
  if(window.ReplotreTemplates){window.ReplotreTemplates.render(body);return}body.innerHTML='<p class="panel-intro">Templates are loading…</p>';
 }else if(state.tab==='text'){
  body.innerHTML=`<p class="panel-intro">Beautiful animated overlays and script-based caption blocks, editable directly in the timeline.</p><button class="text-item" data-action="add-title"><span class="text-preview">T</span><span><strong>Hero title</strong><small>Bold, animated headline</small></span>${ico('plus')}</button><button class="text-item" data-action="add-lower"><span class="text-preview" style="font-size:15px">Aa</span><span><strong>Lower third</strong><small>Clean supporting text</small></span>${ico('plus')}</button><button class="text-item" data-action="add-caption"><span class="text-preview" style="font-size:16px">CC</span><span><strong>Caption block</strong><small>Subtitled speech overlay</small></span>${ico('plus')}</button><div class="section-heading"><span>FROM SCRIPT</span></div><textarea class="field-area" id="scriptInput" rows="5" placeholder="Paste your transcript or script">${escapeHTML(state.script)}</textarea><button class="mini-action" data-action="generate-captions" style="margin-top:11px">${ico('captions')} Turn script into timed captions</button><p class="text-help">Script captions use even timing. For speech-aligned captions, open Insights, transcribe your footage, then choose Auto captions.</p>`;
 }else if(state.tab==='audio'){
  const m=activeMusic();body.innerHTML=`<p class="panel-intro">Bring a soundtrack into your video. It plays with your preview and can be included in the WebM export.</p><div class="upload-zone" data-action="upload"><span class="upload-icon">${ico('music')}</span><strong>Import audio</strong><small>MP3, WAV, OGG and more</small></div>${m?`<div class="brand-card"><div class="property-card-title">${ico('music')} Current soundtrack</div><strong style="word-break:break-word">${escapeHTML(m.name)}</strong><p class="text-help">${fmt(m.duration)} · timeline audio</p><label class="field-label">Track volume · ${Math.round((state.music.volume||0)*100)}%</label><input type="range" min="0" max="100" value="${Math.round(state.music.volume*100)}" data-change="music-volume" style="width:100%;accent-color:#e2ab77"/><div class="pp" style="padding:0;margin-top:12px;gap:0">${ppSlider('music-fade-in',+(state.music.fadeIn||0).toFixed(1),0,8,{step:.5,label:'Fade in',unit:'s',reset:0})}${ppSlider('music-fade-out',+(state.music.fadeOut||0).toFixed(1),0,8,{step:.5,label:'Fade out',unit:'s',reset:0})}</div><button class="mini-action" data-action="remove-music" style="margin-top:12px">${ico('trash-2')} Remove soundtrack</button></div>`:'<div class="asset-placeholder">No soundtrack yet. Audio is optional—your source video can retain its sound during playback and export.</div>'}<div class="section-heading"><span>Audio notes</span></div><p class="text-help">Audio remains on your device. Replotre does not upload it to a cloud service by default.</p>`;
 }else if(state.tab==='brand'){
  const palette=['#e2ab77','#f3e7d2','#7fa99a','#c07b59','#ffffff','#71959d'];body.innerHTML=`<p class="panel-intro">Set a visual identity and apply it consistently to new and existing titles.</p><div class="brand-card"><div class="property-card-title">${ico('palette')} Signature color</div><div class="color-palette">${palette.map(c=>`<button title="Use ${c}" class="color-choice ${state.brandColor===c?'selected':''}" data-action="brand-color" data-color="${c}" style="background:${c}"></button>`).join('')}</div><label class="field-label">Custom color</label><input type="color" value="${state.brandColor}" data-change="brand-color" class="property-color" style="width:100%;height:39px"/><label class="field-label">Headline font</label><select class="property-select" style="width:100%" data-change="brand-font"><option ${state.brandFont==='Manrope'?'selected':''}>Manrope</option><option ${state.brandFont==='Arial'?'selected':''}>Arial</option><option ${state.brandFont==='Georgia'?'selected':''}>Georgia</option></select><button class="mini-action" data-action="apply-brand" style="margin-top:18px">${ico('wand-sparkles')} Apply to all text layers</button></div><div class="section-heading"><span>Style notes</span></div><div class="asset-placeholder">Keep colors and typography consistent across clips, platform formats, and creative versions.</div>`;
 }else if(state.tab==='variants'){
  const variants=[{title:'Stop scrolling. This changes everything.',desc:'High-energy curiosity hook'},{title:'Your best idea deserves to be seen.',desc:'Warm, creator-first approach'},{title:'Create more. Edit less. Stand out.',desc:'Direct performance hook'}];body.innerHTML=`<p class="panel-intro">Three alternative opening hooks. Click one to apply it as a real editable title on your timeline.</p>${variants.map((v,i)=>`<button class="variant-card" data-action="apply-variant" data-index="${i}"><span class="variant-number">VARIANT 0${i+1}</span><span class="variant-text">${escapeHTML(v.title)}</span><span class="variant-info">${escapeHTML(v.desc)}</span></button>`).join('')}<div class="asset-placeholder" style="margin-top:17px">These are starter creative variations, not performance predictions. Validate results through A/B testing.</div>`;
 }
}
function waveformMarkup(media,start=0,end=media?.duration||0){
 const values=media?.analysis?.waveform;if(!values?.length)return '';
 const from=Math.max(0,Math.floor(start/media.duration*values.length)),to=Math.max(from+1,Math.ceil(end/media.duration*values.length)),slice=values.slice(from,to),width=200;
 const path=slice.map((v,i)=>{const x=(i+.5)/slice.length*width,height=Math.max(1,v*20);return `M${x.toFixed(2)},${(20-height).toFixed(2)}v${(height*2).toFixed(2)}`}).join('');
 return `<svg class="real-waveform" viewBox="0 0 200 40" preserveAspectRatio="none" aria-label="Measured audio waveform"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
}
function rulerSteps(pps){const majors=[.5,1,2,5,10,15,30,60,120,300,600,1200],minors={.5:.1,1:.25,2:.5,5:1,10:2,15:5,30:5,60:10,120:30,300:60,600:120,1200:300};const major=majors.find(m=>m*pps>=78)||1200;let minor=minors[major];if(minor*pps<9)minor=major;return {major,minor}}
function rulerLabel(t,major){const base=fmt(t);return major<1?`${base}.${Math.round((t%1)*10)%10}`:base}
// Only the visible slice of the ruler is in the DOM, so long timelines stay cheap at deep zoom.
let rulerWin=null;
// force=false (scroll path): skip the rebuild while the visible span is still inside the last rendered, buffered window
function renderRuler(force=true){const sc=timelineScrollEl(),pps=pxPerSec(),{major,minor}=rulerSteps(pps),bodyW=parseFloat($('#timelineBody').style.width)||sc.clientWidth,sl=sc.scrollLeft,cw=sc.clientWidth,maxT=(bodyW-LABEL_W-1)/pps,
 vFrom=Math.max(0,(sl-LABEL_W)/pps-major),vTo=Math.min((sl+cw)/pps+major,maxT);
 if(!force&&rulerWin&&rulerWin.pps===pps&&rulerWin.bodyW===bodyW&&vFrom>=rulerWin.from&&vTo<=rulerWin.to)return;
 const pad=cw/pps,from=Math.max(0,vFrom-pad),to=Math.min(vTo+pad,maxT);rulerWin={pps,bodyW,from,to};let html='<span class="ruler-corner"></span>';
 for(let i=Math.floor(from/minor),n=Math.ceil(to/minor);i<=n;i++){const t=i*minor,r=t/major,isMajor=Math.abs(r-Math.round(r))<1e-6,x=LABEL_W+t*pps;html+=isMajor?`<span class="ruler-mark" data-time="${t}" style="left:${x}px">${rulerLabel(t,major)}</span>`:`<span class="ruler-mark small" style="left:${x}px"></span>`}
 for(const m of state.markers||[]){if(m.t<from-1||m.t>to+1)continue;html+=`<span class="ruler-marker" style="left:${LABEL_W+m.t*pps}px" title="Marker ${timecode(m.t)}"></span>`}
 if(state.markIn!=null||state.markOut!=null){const a=state.markIn??0,b=state.markOut??totalDuration();html+=`<span class="ruler-inout" style="left:${LABEL_W+a*pps}px;width:${Math.max(1,(b-a)*pps)}px">${state.markIn!=null?'<i class="ri-in"></i>':''}${state.markOut!=null?'<i class="ri-out"></i>':''}</span>`}
 $('#timelineRuler').innerHTML=html}
/* ---------- Timeline clip blocks: filmstrips + trim ---------- */
const filmstripCache=new Map(),filmstripPending=new Set();let filmstripRefresh=0;
const clipMaxOut=c=>c.kind==='demo'?20:c.kind==='image'?60:(getMedia(c.mediaId)?.duration||3600);
const canvasBlobURL=(c,q=.8)=>new Promise(r=>c.toBlob(b=>r(b?URL.createObjectURL(b):c.toDataURL('image/jpeg',q)),'image/jpeg',q));
/* Filmstrip frame size: sharp on high-density screens; vertical sources get a minimum width so wide tiles don't upscale them. */
const FRAME_H=Math.round(clamp(72*(window.devicePixelRatio||1),96,180));
const FRAME_MIN_W=Math.round(clamp(60*(window.devicePixelRatio||1),120,200));
const frameSize=aspect=>{let h=FRAME_H,w=Math.round(h*aspect);if(w<FRAME_MIN_W){w=FRAME_MIN_W;h=Math.min(360,Math.round(w/aspect))}return [Math.max(24,w),h]};
function scheduleFilmstripRefresh(){clearTimeout(filmstripRefresh);filmstripRefresh=setTimeout(()=>{if(!trimDrag)renderTimeline()},60)}
// Frames for one source, sampled evenly across its duration. Built once, off the main render path.
function requestFilmstrip(key,build){if(filmstripCache.has(key)||filmstripPending.has(key))return;filmstripPending.add(key);build().then(strip=>{filmstripPending.delete(key);if(strip?.frames?.length){filmstripCache.set(key,strip);scheduleFilmstripRefresh()}}).catch(()=>filmstripPending.delete(key))}
async function videoFilmstrip(m){const v=frameGrabVideo(m),frames=[];let aspect=16/9;try{await loadGrabVideo(v,m.url);const d=v.duration||m.duration||1;aspect=(v.videoWidth&&v.videoHeight)?v.videoWidth/v.videoHeight:16/9;const n=Math.round(clamp(Math.ceil(d/1.5),4,32));
 const [fw,fh]=frameSize(aspect);for(let i=0;i<n;i++){await seekFrame(v,(i+.5)/n*d);const c=document.createElement('canvas');c.width=fw;c.height=fh;const g=c.getContext('2d',{alpha:false});g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(v,0,0,fw,fh);frames.push(await canvasBlobURL(c,.86))}}catch(e){}finally{releaseGrabVideo(v)}
 return frames.length?{frames,aspect,duration:m.duration}:null}
async function demoFilmstrip(idx){const [fw,fh]=frameSize(16/9),src=document.createElement('canvas');src.width=fw*2;src.height=fh*2;drawDemo(src.getContext('2d',{alpha:false}),idx,1,src.width,src.height);const c=document.createElement('canvas');c.width=fw;c.height=fh;const g=c.getContext('2d',{alpha:false});g.imageSmoothingQuality='high';g.drawImage(src,src.width*.14,src.height*.2,src.width*.72,src.height*.6,0,0,fw,fh);return {frames:[await canvasBlobURL(c,.86)],aspect:16/9,duration:5}}
function filmstripFor(c){if(c.kind==='demo'){const key=`demo:${c.demo||0}`;requestFilmstrip(key,()=>demoFilmstrip(c.demo||0));return filmstripCache.get(key)}
 const m=getMedia(c.mediaId);if(!m)return null;if(m.kind==='image')return {frames:[m.url],aspect:(m.width&&m.height)?m.width/m.height:16/9,duration:1,still:true};
 if(m.kind==='video'){requestFilmstrip(m.id,()=>videoFilmstrip(m));return filmstripCache.get(m.id)}return null}
// Tiles are thumb-sized; very long clips widen each tile (repeating its frame) so the DOM stays bounded.
function filmstripMarkup(c,width){const strip=filmstripFor(c);if(!strip)return '<span class="clip-strip pending"></span>';const tileH=44,thumbW=Math.max(34,Math.round(tileH*strip.aspect)),count=Math.max(1,Math.min(48,Math.ceil(width/thumbW))),span=width/count,speed=c.speed||1,pps=pxPerSec();let html='';
 for(let i=0;i<count;i++){const src=c.in+(i*span+span/2)/pps*speed,idx=strip.still?0:Math.max(0,Math.min(strip.frames.length-1,Math.floor(src/strip.duration*strip.frames.length)));html+=`<i style="width:${span.toFixed(2)}px;background-image:url('${strip.frames[idx]}')"></i>`}
 return `<span class="clip-strip" style="--thumb-w:${thumbW}px">${html}</span>`}
function clipBlockMarkup(c,start,pps){const dur=clipDuration(c),width=Math.max(14,dur*pps-3),m=getMedia(c.mediaId),selected=state.selectedClipId===c.id;
 return `<div class="clip-block ${c.kind==='demo'?'demo'+(c.demo||0):c.kind} ${selected?'selected':''}" style="left:${start*pps}px;width:${width}px" data-clip="${c.id}" title="${escapeHTML(c.name)} · ${fmt(dur)} · drag edges to trim, drag to reorder">`+
 filmstripMarkup(c,width)+
 `<span class="clip-label">${ico(c.kind==='image'?'image':'film')}<span class="clip-name">${escapeHTML(c.name)}</span><span class="clip-duration">${fmt(dur)}</span>${(c.speed||1)!==1?`<span class="clip-speed">${+(c.speed).toFixed(2)}×</span>`:''}</span>`+
 `${waveformMarkup(m,c.in,c.out)}${c.keys?.length?`<span class="kf-dots" aria-hidden="true">${c.keys.map(k=>`<i style="left:${clamp(k.t,0,dur)*pps}px"></i>`).join('')}</span>`:''}<span class="trim-handle l" data-trim="in"></span><span class="trim-handle r" data-trim="out"></span></div>`}
// Timeline selection group: names what is selected and enables Duplicate / Remove only when they apply.
function updateTimelineActions(){const t=selectedText(),c=selectedClip(),sel=t||c,group=$('#tlSel');if(!group)return;group.classList.toggle('has-selection',!!sel);
 const name=$('#tlSelName');name.innerHTML=sel?`${ico(t?(t.kind==='caption'?'captions':'type'):c.kind==='image'?'image':'film')}<span>${escapeHTML((t?t.text.replace(/\n/g,' '):c.name)||'Untitled')}</span>`:'';name.title=sel?(t?'Selected text layer':'Selected clip'):'';
 {const sb=$('#splitBtn');if(sb){sb.title=t?'Split this text at the playhead (S) · ⇧S splits everything':'Split the clip at the playhead (S) · ⇧S splits clip + text';sb.classList.toggle('targets-text',!!t)}}
 for(const id of ['duplicateBtn','deleteBtn']){const b=$('#'+id);b.disabled=!sel||state.serverBusy;b.title=sel?(id==='deleteBtn'?`Remove ${t?'text layer':'clip'} (Delete)`:`Duplicate ${t?'text layer':'clip'} (⌘D)`):'Select a clip or text layer first'}}
function renderTimeline(){const pps=pxPerSec(),total=totalDuration(),body=$('#timelineBody'),sc=timelineScrollEl(),view=(sc.clientWidth||650),w=Math.max(view,Math.ceil(LABEL_W+total*pps+Math.max(160,view*.35)));body.style.width=`${w}px`;body.style.setProperty('--grid',`${rulerSteps(pps).major*pps}px`);renderRuler();
 let cursor=0;const vids=state.clips.map(c=>{const start=cursor;cursor+=clipDuration(c);return clipBlockMarkup(c,start,pps)}).join('');
 const cutStarts=clipStarts();let cuts='';for(let i=1;i<state.clips.length;i++){const x=cutStarts[i]*pps,d=xfadeFor(i),sel=state.selectedCutId===state.clips[i].id&&!state.selectedClipId&&!state.selectedTextId;
  cuts+=`${d?`<span class="xfade-band ${sel?'selected':''}" style="left:${x-d*pps/2}px;width:${d*pps}px" aria-hidden="true"></span>`:''}<button class="cut-btn ${d?'has-xfade':''} ${sel?'selected':''}" style="left:${x}px" data-action="select-cut" data-id="${state.clips[i].id}" title="${d?`Crossfade · ${d.toFixed(1)}s`:'Add a transition'}" aria-label="${d?`Crossfade ${d.toFixed(1)} seconds`:'Add transition at this cut'}">${ico(d?'xfade':'plus')}</button>`}
 prefetchStills();
 const progEnd=totalDuration();const texts=state.texts.map(t=>{const over=t.start+t.duration-progEnd,overPx=over>1e-3?Math.min(t.duration,over)*pps:0;return `<div class="clip-block ${t.kind==='caption'?'caption-clip':'text-clip'} ${state.selectedTextId===t.id?'selected':''} ${overPx?'has-overhang':''}" style="left:${t.start*pps}px;width:${Math.max(12,t.duration*pps-3)}px${overPx?`;--over:${overPx}px`:''}" data-text="${t.id}" title="${escapeHTML(t.text)}${overPx?' · runs past the end of the video':''}">${overPx?'<span class="clip-overhang" aria-hidden="true"></span>':''}<span class="clip-label">${ico(t.kind==='caption'?'captions':'type')}<span class="clip-name">${escapeHTML(t.text.replace(/\n/g,' '))}</span></span><span class="trim-handle l" data-trim="start"></span><span class="trim-handle r" data-trim="end"></span></div>`}).join('');const music=activeMusic();
 const audio=music?`<div class="clip-block audio-clip" data-action="select-music" style="left:${(state.music.start||0)*pps}px;width:${Math.max(14,Math.min(total||music.duration,music.duration)*pps)}px"><span class="clip-label">${ico('music')}<span class="clip-name">${escapeHTML(music.name)}</span></span>${waveformMarkup(music)}</div>`:'';
 $('#tracks').innerHTML=`<div class="track-row text-row"><div class="track-label">${ico('type')} T1</div><div class="track-area">${texts}</div></div><div class="track-row"><div class="track-label">${ico('film')} V1</div><div class="track-area" data-drop-track="video">${vids}${cuts}</div></div><div class="track-row audio-row"><div class="track-label">${ico('music')} A1</div><div class="track-area">${audio}</div></div>`;
 $('#clipCount').textContent=`${state.clips.length} clip${state.clips.length===1?'':'s'}${state.clips.length?` · ${fmt(totalDuration())}`:''}`;updateTimelineActions();updateTimeLabels();}
/* ---------- AI Director panel ---------- */
const opLabel=op=>{switch(op?.type){case 'set_aspect':return ['rectangle-horizontal',`Canvas set to ${op.value}`];case 'add_text':return [op.kind==='caption'?'captions':'type',`Added ${op.kind==='caption'?'caption':'title'} “${String(op.text||'').replace(/\n/g,' ').slice(0,40)}”`];case 'generate_script_captions':return ['captions','Captions generated from script'];case 'set_text_color':return ['palette',`Text color ${op.value||op.color||''}`.trim()];case 'set_text_position':return ['layout',`Text moved to ${op.value}`];case 'trim_clip':return ['scissors',`Clip trimmed to ${op.duration}s`];case 'split_clip':return ['scissors','Clip split at playhead'];case 'set_speed':return ['zap',`Speed set to ${op.value}×`];case 'set_volume':return ['volume-2',+op.value===0?'Clip muted':`Volume ${Math.round(op.value*100)}%`];case 'remove_music':return ['music','Soundtrack removed'];case 'remove_text':return ['trash-2','Text removed'];case 'fit_total':return ['scissors',op.summary];case 'range_set':return ['sliders-horizontal',op.summary];case 'range_delete':return ['scissors',op.summary];case 'clip_set':return ['sliders-horizontal',op.summary+(op.who?` · ${op.who}`:'')];case 'music_set':return ['music',op.summary];case 'clip_xfade':return ['xfade',op.summary];case 'clip_delete':return ['trash-2',op.summary];case 'clip_duplicate':return ['copy',op.summary];case 'clip_move':return ['film',op.summary];case 'texts_set':return ['type',op.summary];case 'edit_texts':return ['type',op.summary||'Text edited'];case 'remove_texts':return ['trash-2',op.summary||`Removed ${op.ids?.length||0} text layers`];default:return ['check',String(op?.type||'Edit').replace(/_/g,' ')]}};
function contextSuggestions(m){const types=(m?.ops||[]).map(o=>o.type),has=t=>types.includes(t),set=Object.assign({},...(m?.ops||[]).filter(o=>o.type==='clip_set').map(o=>o.set||{}));
 if(m?.undone||m?.error||!types.length)return directorSuggestions().slice(0,3);
 if(has('add_text'))return [['type','Bigger','make it bigger'],['palette','Yellow','make it yellow'],['layout','Move to top','move it to the top']];
 if(has('texts_set')||has('edit_texts')||has('set_text_color'))return [['type','Bold','make it bold'],['layout','Background box','add a background box to it'],['undo','Undo','undo']];
 if(has('set_speed')||'speed' in set||'speedMul' in set)return [['zap','Even faster','even faster'],['zap','Normal speed','normal speed'],['sparkles','Fade in','fade in']];
 if('look' in set||'brightness' in set||'saturation' in set||'contrast' in set)return [['sparkles','Brighter','slightly brighter'],['sparkles','More contrast','more contrast'],['undo','Reset colors','reset colors']];
 if(has('set_aspect'))return [['type','Add a title','add a title saying Launch day'],['captions','Add a caption','add caption Hello there'],['zap','Speed it up','speed it up']];
 if(has('clip_delete')||has('clip_duplicate')||has('clip_move'))return [['xfade','Crossfades','add crossfades between clips'],['sparkles','Fade in','fade in'],['undo','Undo','undo']];
 return directorSuggestions().slice(0,3)}
function directorSuggestions(){const cloud=window.ReplotreCloud?.isConnected?.(),hasClips=state.clips.length>0,list=[];
 list.push(state.aspect==='9:16'?['rectangle-horizontal','Go landscape','Change canvas to landscape 16:9']:['rectangle-horizontal','Go vertical','Make it vertical 9:16 for Reels']);
 list.push(['type','Add a title','Add a title saying "Launch day"']);
 if(cloud){list.push(['captions','Remove silences','Remove silence from my footage'],['scissors','Find scene cuts','Split footage at scene changes'])}
 else{if(state.script.trim())list.push(['captions','Script captions','Add captions from the script']);if(hasClips)list.push(['scissors','Tighten the opening','Trim the opening clip to 3 seconds']);if(hasClips)list.push(['zap','Speed it up','Make the clip faster'])}
 return list.slice(0,4)}
function directorContext(){const c=selectedClip(),t=selectedText();if(c){const st=clipStartTime(c.id);return {icon:c.kind==='image'?'image':'film',label:c.name,detail:`${fmt(st)}–${fmt(st+clipDuration(c))}`}}
 if(t)return {icon:t.kind==='caption'?'captions':'type',label:t.text.replace(/\n/g,' ')||'Text layer',detail:`${fmt(t.start)}–${fmt(t.start+t.duration)}`};
 return {icon:'layers',label:'Whole project',detail:`${state.clips.length} clip${state.clips.length===1?'':'s'} · ${fmt(totalDuration())}`}}
function directorMessageMarkup(m,i,lastAgent){const sep=state.chatRestoredAt&&i===state.chatRestoredCount?`<div class="dr-session-sep"><span>Earlier · ${new Date(state.chatRestoredAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div>`:'';return sep+directorMessageInner(m,i,lastAgent)}
function directorMessageInner(m,i,lastAgent){if(m.role==='user'){
  const editing=state.editingMsg===i;
  const busy=state.aiBusy||state.serverBusy;return `<div class="dr-msg dr-user${editing?' is-editing-src':''}"><div class="dr-bubble" data-action="director-edit" data-index="${i}" title="Tap to edit">${escapeHTML(m.text)}</div>${busy||editing?'':`<div class="dr-user-actions"><button data-action="director-edit" data-index="${i}" aria-label="Edit prompt" title="Edit">${ico('pencil')}</button><button data-action="director-resend" data-index="${i}" aria-label="Send again" title="Send again">${ico('rotate-ccw')}</button><button data-action="director-copy" data-index="${i}" aria-label="Copy prompt" title="Copy">${ico('copy')}</button></div>`}</div>`}
 if(m.hist){const {kind,labels}=m.hist,k=labels.length,isLast=i===lastAgent,back=kind==='undo'?'redo':'undo',canBack=isLast&&k&&(back==='redo'?state.future.length>=1:state.history.length>=1)&&!state.serverBusy,canMore=isLast&&k&&(kind==='undo'?state.history.length:state.future.length)&&!state.serverBusy;
  return `<div class="dr-msg dr-agent"><div class="dr-avatar">${ico(kind==='undo'?'undo':'redo')}</div><div class="dr-body"><div class="dr-text">${escapeHTML(m.text)}</div>`+
  (k?`<div class="dr-result dr-hist is-${kind}"><div class="dr-result-head">${ico(kind==='undo'?'undo':'redo')}<span>${kind==='undo'?'Undone':'Redone'} · ${k} step${k===1?'':'s'}</span>${canBack?`<button class="dr-undo" data-action="director-history" data-kind="${back}" data-n="${k}">${ico(back)} ${back==='redo'?'Redo':'Undo'}</button>`:''}</div><ul>${labels.slice(0,6).map(l=>`<li>${ico(kind==='undo'?'undo':'redo')}<span>${escapeHTML(l)}</span></li>`).join('')}${k>6?`<li><span>+${k-6} more</span></li>`:''}</ul>${canMore?`<button class="dr-hist-more" data-action="director-history" data-kind="${kind}" data-n="1">${kind==='undo'?'Undo one more':'Redo one more'}</button>`:''}</div>`:'')+`</div></div>`}
 const ops=(m.ops||[]).map(op=>{const [icon,label]=opLabel(op);return `<li>${ico(icon)}<span>${escapeHTML(label)}</span></li>`}).join('');
 const canUndo=i===lastAgent&&isTopStep(m)&&!state.serverBusy;
 return `<div class="dr-msg dr-agent ${m.error?'is-error':''}"><div class="dr-avatar">${ico(m.error?'circle-help':'clapperboard')}</div><div class="dr-body"><div class="dr-text">${escapeHTML(m.text).replace(/\n/g,'<br>')}</div>`+(m.suggest&&i===lastAgent?`<div class="dr-didyoumean">${[].concat(m.suggest).map(sg=>`<button class="dr-chip" data-prompt="${escapeHTML(sg)}">${ico('sparkles')}${escapeHTML(sg)}</button>`).join('')}</div>`:'')+
 (ops?`<div class="dr-result ${m.undone?'is-undone':''}"><div class="dr-result-head">${ico(m.undone?'undo':'check-circle')}<span>${m.undone?'Edits undone':`${m.ops.length} edit${m.ops.length===1?'':'s'} applied`}</span>${canUndo?`<button class="dr-undo" data-action="director-undo" data-index="${i}">${ico('undo')} Undo</button>`:''}</div><ul>${ops}</ul></div>`:'')+`</div></div>`}
function renderDirector(root){const cloud=window.ReplotreCloud?.isConnected?.(),ctx=directorContext(),msgs=state.messages,lastAgent=msgs.map(m=>m.role).lastIndexOf('agent');
 const mode=cloud?(state.aiConnected?'AI planner + footage tools':'Footage tools'):'Local commands',live=cloud&&state.aiConnected;
 const welcome=`<div class="dr-welcome"><div class="dr-hero">${ico('clapperboard')}</div><h3>What should we change?</h3><p>Describe an edit in plain words. The Director applies it to your timeline, and you can undo or refine it anytime.</p></div><div class="dr-suggest-grid">${directorSuggestions().map(([icon,title,prompt])=>`<button class="dr-suggest" data-prompt="${escapeHTML(prompt)}" title="${escapeHTML(prompt)}">${ico(icon)}<strong>${escapeHTML(title)}</strong><span>${escapeHTML(prompt)}</span></button>`).join('')}</div>`;
 const thread=msgs.map((m,i)=>directorMessageMarkup(m,i,lastAgent)).join('')+(state.aiBusy?`<div class="dr-msg dr-agent"><div class="dr-avatar is-thinking">${ico('clapperboard')}</div><div class="dr-body"><div class="dr-thinking"><i></i><i></i><i></i><span class="dr-think-text">${escapeHTML(state.aiStatus||'Planning your edit…')}</span></div><div class="dr-skeleton" aria-hidden="true"><span></span><span></span></div></div></div>`:'');
 const followups=!state.aiBusy&&msgs.length&&msgs[msgs.length-1].role==='agent'?`<div class="dr-followups">${contextSuggestions(msgs[msgs.length-1]).map(([icon,title,prompt])=>`<button class="dr-chip" data-prompt="${escapeHTML(prompt)}">${ico(icon)}${escapeHTML(title)}</button>`).join('')}</div>`:'';
 root.innerHTML=`<div class="dr-header"><div class="dr-id"><div class="agent-avatar">${ico('clapperboard')}</div><div><h3>Director</h3><span class="dr-mode ${live?'is-live':''}"><i></i>${mode}</span></div></div><div class="dr-head-actions">${msgs.length?`<button class="dr-new" data-action="director-clear" title="Start a new conversation">${ico('plus')} New</button>`:''}</div></div>`+
 `<div class="ai-message-list dr-thread" id="aiMessageList">${msgs.length?thread+followups:welcome}</div>`+
 `<div class="ai-compose dr-compose${state.editingMsg!=null?' is-editing':''}">${state.editingMsg!=null?`<div class="dr-editing-bar">${ico('pencil')}<span>Editing your prompt</span><em class="${directorEditReplaces(state.editingMsg)?'is-replace':''}" title="${directorEditReplaces(state.editingMsg)?'Undoes this prompt’s edit, then applies the new version':'Runs as a new edit and keeps later changes'}">${directorEditReplaces(state.editingMsg)?'Replaces edit':'New edit'}</em><button data-action="director-edit-cancel" aria-label="Cancel editing" title="Cancel (Esc)">${ico('x')}</button></div>`:''}<div class="dr-context" title="The Director will focus on this">${ico(ctx.icon)}<span class="dr-context-label">${escapeHTML(ctx.label)}</span><span class="dr-context-detail">${escapeHTML(ctx.detail)}</span></div>`+
 `<div class="composer-box dr-box"><textarea id="chatInput" class="chat-textarea dr-input" rows="1" placeholder="${state.clips.length?'Describe an edit… e.g. “make it vertical and add a title”':'Add footage, then describe an edit…'}" ${state.aiBusy||state.serverBusy?'disabled':''}>${escapeHTML(state.chatDraft||'')}</textarea><div class="composer-footer"><span class="dr-footnote"><i></i>${cloud?'Edits save automatically':'Runs on this device'}</span><span class="dr-keys"><kbd>↵</kbd> send <kbd>⇧↵</kbd> new line</span><button class="send-button" id="chatSend" title="Send" ${state.aiBusy||state.serverBusy||!(state.chatDraft||'').trim()?'disabled':''}>${ico('arrow-up')}</button></div></div>`+
 `<div class="composer-hint">${cloud?'Edits save automatically. Undo anytime.':'Runs on this device. Sign in for footage analysis, captions and the AI planner.'}</div></div>`;
 const list=$('#aiMessageList');list.scrollTop=list.scrollHeight;autosizeChat($('#chatInput'));scheduleChatSave()}
function autosizeChat(el){if(!el)return;el.style.height='auto';const cap=parseFloat(getComputedStyle(el).maxHeight)||160,min=parseFloat(getComputedStyle(el).minHeight)||36;el.style.height=`${Math.min(cap,Math.max(min,el.scrollHeight))}px`;el.style.overflowY=el.scrollHeight>cap?'auto':'hidden'}
function renderRightPanel(){ const rp=$('#rightPanel');rp.classList.add('is-ai');if(innerWidth>700)rp.classList.add('is-expanded');rp.classList.toggle('is-props',state.rightTab==='properties');if(innerWidth<=700)updateAiDock?.();$$('.right-tab').forEach(b=>b.classList.toggle('active',b.dataset.right===state.rightTab));const root=$('#rightContent');
 if(state.rightTab==='ai')renderDirector(root);
 else root.innerHTML=renderProperties();
}
/* ---------- Properties panel ---------- */
const ppSlider=(change,value,min,max,{step=1,unit='',reset=null,label}={})=>{const pct=((value-min)/(max-min)*100).toFixed(1);return `<div class="pp-slider"><div class="pp-slider-top"><span class="pp-label">${label}</span><span class="pp-value" data-unit="${unit}">${value}${unit}</span></div><div class="pp-slider-track"><input class="pp-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-change="${change}" style="--fill:${pct}%" aria-label="${escapeHTML(label)}"${reset!==null?` data-reset="${reset}" title="Double-click to reset"`:''}/></div></div>`};
const ppSeg=(name,change,current,options)=>`<div class="pp-seg" role="radiogroup">${options.map(([v,l,title])=>`<label class="pp-seg-opt" title="${escapeHTML(title||l)}"><input type="radio" name="${name}" value="${v}" data-change="${change}" ${String(current)===String(v)?'checked':''}/><span>${l}</span></label>`).join('')}</div>`;
const ppSection=(icon,title,body,extra='')=>`<section class="pp-section"><div class="pp-section-title">${ico(icon)}<span>${title}</span>${extra}</div>${body}</section>`;
function clipStartTime(id){let t=0;for(const c of state.clips){if(c.id===id)return t;t+=clipDuration(c)}return 0}
function clipThumb(c){if(c.kind==='demo')return demoCardPosters[c.demo||0];const m=getMedia(c.mediaId);if(!m)return '';if(m.kind==='image')return m.url;const strip=filmstripCache.get(m.id);if(strip){const mid=(c.in+c.out)/2;return strip.frames[Math.max(0,Math.min(strip.frames.length-1,Math.floor(mid/strip.duration*strip.frames.length)))]}return posterCache.get(m.id)||m.analysis?.thumbnail||''}
function trimVizMarkup(c){const m=getMedia(c.mediaId);if(!m||m.kind!=='video')return '';const total=m.duration||c.out,strip=filmstripCache.get(m.id),l=(c.in/total*100).toFixed(3),r=(100-c.out/total*100).toFixed(3);
 const frames=strip?strip.frames.map(f=>`<i style="background-image:url('${f}')"></i>`).join(''):'',kept=(c.out-c.in);
 return `<div class="pp-trimviz" data-total="${total}" title="Drag the handles to trim · drag the middle to slide"><div class="pp-trimviz-strip">${frames}</div>`+
 `<span class="pp-trimviz-mask is-l" style="left:0;width:${l}%"></span><span class="pp-trimviz-mask is-r" style="right:0;width:${r}%"></span>`+
 `<span class="pp-trimviz-range" data-trim="body" style="left:${l}%;right:${r}%"></span>`+
 `<button class="pp-tv-handle is-in" data-trim="in" style="left:${l}%" role="slider" aria-label="Trim start" aria-valuemin="0" aria-valuemax="${total.toFixed(1)}" aria-valuenow="${c.in.toFixed(1)}"><span class="pp-tv-tip">${c.in.toFixed(1)}s</span></button>`+
 `<button class="pp-tv-handle is-out" data-trim="out" style="left:${(100-r).toFixed(3)}%" role="slider" aria-label="Trim end" aria-valuemin="0" aria-valuemax="${total.toFixed(1)}" aria-valuenow="${c.out.toFixed(1)}"><span class="pp-tv-tip">${c.out.toFixed(1)}s</span></button></div>`+
 `<div class="pp-trimviz-scale"><span>${fmt(0)}</span><span class="pp-tv-kept">${kept>=total-.05?'Full clip':`Keeping ${kept.toFixed(1)}s of ${total.toFixed(1)}s`}</span><span>${fmt(total)}</span></div>`}
/* Live trim on the filmstrip: drag handles / slide the kept range, preview follows the frame under your finger. */
function trimVizSync(c){const viz=$('.pp-trimviz');if(!viz)return;const total=+viz.dataset.total||c.out,l=c.in/total*100,r=100-c.out/total*100,kept=c.out-c.in;
 viz.querySelector('.is-l').style.width=`${l}%`;viz.querySelector('.is-r').style.width=`${r}%`;const rg=viz.querySelector('.pp-trimviz-range');rg.style.left=`${l}%`;rg.style.right=`${r}%`;
 const hi=viz.querySelector('.is-in'),ho=viz.querySelector('.is-out');hi.style.left=`${l}%`;ho.style.left=`${100-r}%`;hi.firstChild.textContent=`${c.in.toFixed(1)}s`;ho.firstChild.textContent=`${c.out.toFixed(1)}s`;hi.setAttribute('aria-valuenow',c.in.toFixed(1));ho.setAttribute('aria-valuenow',c.out.toFixed(1));
 const k=$('.pp-tv-kept');if(k)k.textContent=kept>=total-.05?'Full clip':`Keeping ${kept.toFixed(1)}s of ${total.toFixed(1)}s`;
 const iin=$('.pp [data-change="clip-in"]'),iout=$('.pp [data-change="clip-out"]');if(iin&&document.activeElement!==iin)iin.value=c.in.toFixed(1);if(iout&&document.activeElement!==iout)iout.value=c.out.toFixed(1);
 const st=$$('.pp-stats strong'),start=clipStartTime(c.id),dur=clipDuration(c);if(st.length===3){st[1].textContent=fmt(start+dur);st[2].textContent=`${dur.toFixed(1)}s`}}
{let td=null,raf=0;const MIN=.2;
 const frameFollow=t=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{invalidatePreview();playback.update(state.clips,state.media,state.music,state.playhead);seek(t)})};
 document.addEventListener('pointerdown',e=>{const el=e.target.closest('.pp-trimviz [data-trim], .pp-trimviz');if(!el||e.button>0)return;const viz=e.target.closest('.pp-trimviz'),c=selectedClip();if(!viz||!c)return;
  const kind=e.target.closest('[data-trim]')?.dataset.trim||'tap';e.preventDefault();e.stopPropagation();
  td={c,kind,viz,total:+viz.dataset.total||c.out,rect:viz.getBoundingClientRect(),x0:e.clientX,in0:c.in,out0:c.out,moved:false,id:e.pointerId,snapped:null};
  try{(e.target.closest('[data-trim]')||viz).setPointerCapture(e.pointerId)}catch(_){}viz.classList.add('is-active');if(kind!=='tap')viz.dataset.drag=kind},true);
 window.addEventListener('pointermove',e=>{if(!td||e.pointerId!==td.id)return;const dx=e.clientX-td.x0;if(!td.moved&&Math.abs(dx)<3)return;
  const {c,total,rect}=td,sec=dx/rect.width*total,sp=c.speed||1;if(td.kind==='tap')td.kind='body';if(!td.moved){td.moved=true;checkpoint(td.kind==='body'?'Slide trim':'Trim');td.viz.dataset.drag=td.kind}
  // snap targets: clip edges and the playhead's source frame (within ~8px)
  const snapPx=8/rect.width*total,hit=timelineAt(),ph=hit&&hit.clip.id===c.id?hit.local:null,snap=v=>{for(const s of [0,total,ph]){if(s!=null&&Math.abs(v-s)<snapPx){if(td.snapped!==s){td.snapped=s;try{navigator.vibrate?.(6)}catch(_){}}return s}}td.snapped=null;return v};
  const q=v=>Math.round(v*10)/10; // 0.1s grid, same precision as the inputs
  if(td.kind==='in')c.in=q(clamp(snap(td.in0+sec),0,c.out-MIN));
  else if(td.kind==='out')c.out=Math.min(total,q(clamp(snap(td.out0+sec),c.in+MIN,total)));
  else{const len=td.out0-td.in0,ni=q(clamp(td.in0+sec,0,total-len));c.in=ni;c.out=+(ni+len).toFixed(3)}
  trimVizSync(c);const start=clipStartTime(c.id);frameFollow(td.kind==='out'?start+clipDuration(c)-FRAME:start);e.preventDefault()});
 const end=e=>{if(!td||e.pointerId!==td.id)return;const d=td;td=null;d.viz.classList.remove('is-active');delete d.viz.dataset.drag;const c=d.c;
  if(!d.moved){if(d.kind==='tap'||d.kind==='body'){const t=(e.clientX-d.rect.left)/d.rect.width*d.total;if(t>=c.in&&t<=c.out)seek(clipStartTime(c.id)+(t-c.in)/(c.speed||1));else toast('That part is trimmed off — drag a handle to bring it back')}return}
  const shift=(c.in-d.in0)/(c.speed||1);if(shift)c.keys=shiftKeys(c.keys,shift);refreshAll();queueSave();
  const msg=d.kind==='body'?`Slid to ${c.in.toFixed(1)}s – ${c.out.toFixed(1)}s`:d.kind==='in'?`Start trimmed to ${c.in.toFixed(1)}s`:`End trimmed to ${c.out.toFixed(1)}s`;toast(msg)};
 window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
 // keyboard: arrows nudge 0.1s (Shift = 1s)
 document.addEventListener('keydown',e=>{const h=e.target.closest?.('.pp-tv-handle');if(!h||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const c=selectedClip();if(!c)return;
  const f=document.createElement('i');f.dataset.edge=h.dataset.trim;f.dataset.d=String((e.key==='ArrowLeft'?-1:1)*(e.shiftKey?1:.1));handleAction('trim-nudge',f);requestAnimationFrame(()=>$(`.pp-tv-handle.is-${h.dataset.trim}`)?.focus())},true);
}
function transitionPanel(i){const c=state.clips[i],a=state.clips[i-1],d=xfadeFor(i),max=maxXfade(i),cut=clipStarts()[i];
 return `<div class="property-scroll pp"><div class="pp-head"><div class="pp-thumb pp-thumb-xf">${ico('xfade')}</div><div class="pp-head-text"><span class="pp-kicker">Transition · cut ${i} of ${state.clips.length-1}</span><strong class="pp-head-name">${escapeHTML(a.name)} → ${escapeHTML(c.name)}</strong><span class="pp-meta">at ${timecode(cut)}${d?` · ${d.toFixed(1)}s`:''}</span></div></div>`+
 ppSection('xfade','Transition',`${ppSeg('pp-xf','cut-type',d?'crossfade':'none',[['none','Cut','Hard cut'],['crossfade','Crossfade','Dissolve between the shots']])}`+(d?ppSlider('cut-duration',+d.toFixed(1),.2,max,{step:.1,label:'Duration',unit:'s',reset:XFADE_DEFAULT}):'')+`<p class="pp-help">Picture and sound crossfade together, centred on the cut, so nothing on your timeline moves. Sound blends using footage just beyond the cut when it exists, otherwise it fades out and in. Max ${max.toFixed(1)}s here.</p>`)+
 `<div class="pp-actions"><button class="pp-btn" data-action="xfade-all" title="Use this transition on every cut">${ico('layers')} Apply to all cuts</button><button class="pp-btn ghost" data-action="cut-preview" title="Play across this cut">${ico('play')} Preview cut</button></div>`+
 (d?`<button class="pp-btn danger full" data-action="xfade-remove">${ico('trash-2')} Remove transition</button>`:'')+`</div>`}
function renderProperties(){const t=selectedText(),c=selectedClip();
 if(!t&&!c&&state.selectedCutId){const i=state.clips.findIndex(x=>x.id===state.selectedCutId);if(i>0)return transitionPanel(i)}
 if(t){const end=t.start+t.duration,swatches=[...new Set(['#ffffff','#111111',state.brandColor,'#f3e7d2','#e2ab77','#7fa99a'])];
  return `<div class="property-scroll pp">`+
  `<div class="pp-head"><div class="pp-thumb pp-thumb-text">${t.kind==='caption'?'CC':'Aa'}</div><div class="pp-head-text"><span class="pp-kicker">${t.kind==='caption'?'Caption layer':'Title layer'}</span><strong class="pp-head-name">${escapeHTML(t.text.split('\n')[0]||'Untitled text')}</strong><span class="pp-meta">${fmt(t.start)} → ${fmt(end)} · ${t.duration.toFixed(1)}s</span></div></div>`+
  ppSection('type','Text',`<textarea class="field-area pp-textarea" data-change="text-content" rows="3" placeholder="Type your text">${escapeHTML(t.text)}</textarea>`)+
  ppSection('palette','Style',
   `<div class="pp-label-row"><span class="pp-label">Color</span></div><div class="pp-swatches">${swatches.map(col=>`<label class="pp-swatch" style="--sw:${col}" title="${col}"><input type="radio" name="pp-color" value="${col}" data-change="text-color" ${String(t.color||'#ffffff').toLowerCase()===col.toLowerCase()?'checked':''}/></label>`).join('')}<label class="pp-swatch pp-swatch-custom" title="Custom color"><input type="color" data-change="text-color" value="${t.color||'#ffffff'}"/></label></div>`+
   ppSlider('text-size',t.fontSize||35,12,100,{label:'Size',unit:'px'})+
   `<div class="pp-label-row"><span class="pp-label">Weight</span></div>${ppSeg('pp-weight','text-weight',t.fontWeight||800,[[400,'Regular'],[600,'Medium'],[800,'Bold']])}`+
   (t.kind==='caption'?'':`<div class="pp-label-row"><span class="pp-label">Background</span></div>${ppSeg('pp-bg','text-bg',t.bg||'none',[['none','None'],['box','Box']])}`)+
   `<div class="pp-label-row"><span class="pp-label">Animation</span></div>${ppSeg('pp-anim','text-anim',t.anim||'fade',[['fade','Fade'],['slide','Slide up'],['none','None']])}`+
   `<div class="pp-label-row"><span class="pp-label">Position</span>${Number.isFinite(t.x)?`<span class="pp-custom">Custom · ${Math.round(t.x*100)}%, ${Math.round(t.y*100)}%</span>`:'<span class="pp-hint">or drag it on the preview</span>'}</div>${ppSeg('pp-pos','text-position',Number.isFinite(t.x)?'':t.position||'center',[['top','Top'],['center','Middle'],['bottom','Bottom']])}`)+
  ppSection('sliders-horizontal','Timing',`${end>totalDuration()+1e-3?`<div class="pp-warn">${ico('alert-triangle')}<span>Runs ${(end-totalDuration()).toFixed(1)}s past the end of the video. That part won’t export.</span><button class="pp-link" data-action="text-fit-end">Trim to video end</button></div>`:''}<div class="pp-grid3"><label class="pp-num"><span>Start</span><input class="property-input" type="number" step="0.1" min="0" max="${totalDuration().toFixed(1)}" data-change="text-start" value="${Number(t.start).toFixed(1)}"/><em>s</em></label><label class="pp-num"><span>End</span><input class="property-input" type="number" step="0.1" min="0.2" max="${totalDuration().toFixed(1)}" data-change="text-end" value="${end.toFixed(1)}"/><em>s</em></label><label class="pp-num"><span>Length</span><input class="property-input" type="number" step="0.1" min="0.2" max="${totalDuration().toFixed(1)}" data-change="text-duration" value="${Number(t.duration).toFixed(1)}"/><em>s</em></label></div><div class="pp-grid2"><button class="pp-btn ghost" data-action="text-to-playhead" title="Move the layer so it starts at the playhead">${ico('skip-back')} Start here</button><button class="pp-btn ghost" data-action="text-end-playhead" title="Trim the end to the playhead (W)">End here ${ico('skip-forward')}</button></div><p class="pp-help">Drag either edge on the timeline, or press <kbd>Q</kbd> / <kbd>W</kbd> to trim the start / end to the playhead.</p>`)+
  `<div class="pp-actions three"><button class="pp-btn" data-action="text-split" title="Split at the playhead (S)">${ico('scissors')} Split</button><button class="pp-btn" data-action="duplicate-selection">${ico('copy')} Duplicate</button><button class="pp-btn danger" data-action="delete-selection">${ico('trash-2')} Remove</button></div></div>`}
 if(c){const m=getMedia(c.mediaId),dur=clipDuration(c),idx=state.clips.indexOf(c),start=clipStartTime(c.id),thumb=clipThumb(c),hasAudio=c.kind==='video',res=m?resolutionLabel(m):'',kindName=c.kind==='demo'?'Sample':c.kind==='image'?'Image':'Video',vol=Math.round((c.volume??1)*100),b=c.brightness??100,sat=c.saturation??100;
  const [cw,ch]=ratioDims[state.aspect]||ratioDims['9:16'],ar=clamp(m&&m.width&&m.height?m.width/m.height:(c.kind==='demo'?16/9:cw/ch),9/16,16/9);
  const meta=[kindName,res,m&&m.kind==='video'?`source ${fmt(m.duration)}`:''].filter(Boolean).join(' · ');
  return `<div class="property-scroll pp">`+
  `<div class="pp-head"><div class="pp-thumb${ar<0.95?' is-portrait':ar>1.05?'':' is-square'}" style="--ar:${ar.toFixed(4)}${thumb?`;background-image:url('${escapeHTML(thumb)}')`:''}">${thumb?'':ico(c.kind==='image'?'image':'film')}<span class="pp-thumb-time">${fmt(dur)}</span></div><div class="pp-head-text"><span class="pp-kicker">Clip ${idx+1} of ${state.clips.length}</span><input class="pp-name" data-change="clip-name" value="${escapeHTML(c.name)}" aria-label="Clip name" spellcheck="false"/><span class="pp-meta">${escapeHTML(meta)}</span></div></div>`+
  `<div class="pp-stats"><div><span>Starts</span><strong>${fmt(start)}</strong></div><div><span>Ends</span><strong>${fmt(start+dur)}</strong></div><div><span>Length</span><strong>${dur.toFixed(1)}s</strong></div></div>`+
  ppSection('scissors','Trim',trimVizMarkup(c)+`<div class="pp-grid2"><label class="pp-num pp-step"><span>In</span><span class="pp-step-row"><button class="pp-step-btn" data-action="trim-nudge" data-edge="in" data-d="-0.1" aria-label="Start 0.1s earlier">${ico('minus')}</button><input class="property-input" data-change="clip-in" type="number" inputmode="decimal" min="0" step="0.1" value="${c.in.toFixed(1)}"/><button class="pp-step-btn" data-action="trim-nudge" data-edge="in" data-d="0.1" aria-label="Start 0.1s later">${ico('plus')}</button></span></label><label class="pp-num pp-step"><span>Out</span><span class="pp-step-row"><button class="pp-step-btn" data-action="trim-nudge" data-edge="out" data-d="-0.1" aria-label="End 0.1s earlier">${ico('minus')}</button><input class="property-input" data-change="clip-out" type="number" inputmode="decimal" min="0.2" step="0.1" value="${c.out.toFixed(1)}"/><button class="pp-step-btn" data-action="trim-nudge" data-edge="out" data-d="0.1" aria-label="End 0.1s later">${ico('plus')}</button></span></label></div><div class="pp-grid2"><button class="pp-btn ghost" data-action="clip-set-in" title="Start this clip at the playhead frame">${ico('skip-back')} In at playhead</button><button class="pp-btn ghost" data-action="clip-set-out" title="End this clip at the playhead frame">Out at playhead ${ico('skip-forward')}</button></div><p class="pp-help">${c.kind==='video'?'Drag the handles to trim, or drag the middle to slide. Tap the strip to preview a frame.':'Tip: drag a clip\'s edges on the timeline to trim it directly.'}</p>`,(c.in>0.05||c.out<clipMaxOut(c)-0.05)?'<button class="pp-link" data-action="trim-reset">Reset</button>':'')+
  ppSection('zap','Speed',ppSeg('pp-speed','clip-speed',+(c.speed||1),[[.5,'0.5×'],[.75,'0.75×'],[1,'1×'],[1.25,'1.25×'],[1.5,'1.5×'],[2,'2×']]))+
  (hasAudio?ppSection('volume-2','Audio',`<div class="pp-audio">${ppSlider('clip-volume',vol,0,100,{label:'Volume',unit:'%',reset:100})}<button class="pp-icon-btn ${vol===0?'is-on':''}" data-action="clip-toggle-mute" title="${vol===0?'Unmute':'Mute'}" aria-pressed="${vol===0}">${ico(vol===0?'x':'volume-2')}</button></div>`):'')+
  (c.kind!=='demo'?ppSection('crop','Framing',`<div class="pp-label-row"><span class="pp-label">Fit to canvas</span>${(c.zoom??1)>1.001||c.panX||c.panY||c.flipH||c.fit==='fit'?'<button class="pp-link" data-action="clip-reset-framing">Reset</button>':''}</div>${ppSeg('pp-fit','clip-fit',c.fit||'fill',[['fill','Fill','Crop to fill the frame'],['fit','Fit','Show the whole shot with bars']])}`+(()=>{const keyed=!!c.keys?.length,local=clipLocalTime(c),fe=framingAt(c,clamp(local,0,dur)),atKey=keyed&&keyIndexAt(c,local)>=0;
   const bar=`<div class="kf-bar"><button class="kf-toggle ${keyed?'is-on':''}" data-action="kf-toggle" aria-pressed="${keyed}" title="Animate zoom and position over time">${ico('kf')}<span>${keyed?'Animated':'Animate'}</span></button>${keyed?`<div class="kf-nav"><button class="kf-btn" data-action="kf-prev" title="Previous keyframe">${ico('frame-back')}</button><button class="kf-btn kf-add ${atKey?'is-key':''}" data-action="kf-set" title="Add / remove a keyframe at the playhead">${ico('kf')}</button><button class="kf-btn" data-action="kf-next" title="Next keyframe">${ico('frame-fwd')}</button></div>`:''}</div>`+
    (keyed?`<div class="kf-track" data-action="kf-track" title="Click to jump; diamonds are keyframes">${c.keys.map((k,ki)=>`<button class="kf-dia" data-action="kf-jump" data-value="${k.t}" style="left:${clamp(k.t/dur,0,1)*100}%" title="Keyframe ${ki+1} · ${k.t.toFixed(2)}s · ${Math.round(k.zoom*100)}%"></button>`).join('')}<span class="kf-now" style="left:${clamp(local/dur,0,1)*100}%;opacity:${local>=0&&local<=dur?1:0}"></span></div><div class="kf-foot"><span>${c.keys.length} keyframe${c.keys.length===1?'':'s'} · changes at the playhead set a key</span><button class="pp-link" data-action="kf-clear">Clear</button></div>`:'');
   return bar+ppSlider('clip-zoom',Math.round((fe.zoom??1)*100),100,300,{label:'Zoom',unit:'%',reset:100})+(keyed||(fe.zoom??1)>1.001||c.fit!=='fit'?ppSlider('clip-pan-x',Math.round((fe.panX??0)*100),-100,100,{label:'Horizontal',unit:'',reset:0})+ppSlider('clip-pan-y',Math.round((fe.panY??0)*100),-100,100,{label:'Vertical',unit:'',reset:0}):'')})()+`<div class="pp-grid2"><button class="pp-btn ghost ${c.flipH?'is-on':''}" data-action="clip-flip" aria-pressed="${!!c.flipH}">${ico('flip')} Flip</button><span class="pp-help pp-inline">Tip: drag the zoomed shot in the preview to reframe it.</span></div>`):'')+
  ppSection('palette','Color',`<div class="pp-looks">${LOOKS.map(([id,name,v])=>`<button class="pp-look ${(c.look||'natural')===id?'is-on':''}" data-action="clip-look" data-value="${id}" title="${name}"><span class="pp-look-swatch${thumb?' has-frame':''}" style="filter:brightness(${v.brightness/100}) contrast(${v.contrast/100}) saturate(${v.saturation/100})${thumb?`;background-image:url('${escapeHTML(thumb)}')`:''}"></span><span>${name}</span></button>`).join('')}</div>`+ppSlider('clip-brightness',b,50,150,{label:'Brightness',unit:'%',reset:100})+ppSlider('clip-contrast',c.contrast??100,50,150,{label:'Contrast',unit:'%',reset:100})+ppSlider('clip-saturation',sat,0,200,{label:'Saturation',unit:'%',reset:100}),(b!==100||sat!==100||(c.contrast??100)!==100)?'<button class="pp-link" data-action="clip-reset-color">Reset</button>':'')+
  ppSection('sparkles','Fades',ppSlider('clip-fade-in',+(c.fadeIn||0).toFixed(1),0,Math.max(.1,+Math.min(3,dur/2).toFixed(1)),{step:.1,label:'Fade in',unit:'s',reset:0})+ppSlider('clip-fade-out',+(c.fadeOut||0).toFixed(1),0,Math.max(.1,+Math.min(3,dur/2).toFixed(1)),{step:.1,label:'Fade out',unit:'s',reset:0})+`<p class="pp-help">Dips the picture to black${hasAudio?' and ramps the clip audio':''}.</p>`)+
  `<div class="pp-actions three"><button class="pp-btn" data-action="clip-split" title="Split at playhead (S)">${ico('scissors')} Split</button><button class="pp-btn" data-action="duplicate-selection">${ico('copy')} Duplicate</button><button class="pp-btn danger" data-action="delete-selection">${ico('trash-2')} Remove</button></div></div>`}
 const [w,h]=ratioDims[state.aspect]||ratioDims['9:16'];
 return `<div class="property-scroll pp pp-empty"><div class="pp-empty-hero">${ico('mouse-pointer-2')}<h3>Nothing selected</h3><p>Pick a clip or text layer on the timeline to edit its trim, speed, color and more.</p></div>`+
 ppSection('monitor-play','Project',`<div class="pp-stats"><div><span>Canvas</span><strong>${state.aspect}</strong></div><div><span>Length</span><strong>${fmt(totalDuration())}</strong></div><div><span>Clips</span><strong>${state.clips.length}</strong></div></div><p class="pp-help">${w} × ${h} · 30 fps${state.texts.length?` · ${state.texts.length} text layer${state.texts.length===1?'':'s'}`:''}</p>`)+
 ppSection('keyboard','Shortcuts',`<ul class="pp-keys"><li><span>Play / pause</span><kbd>Space</kbd></li><li><span>Split at playhead</span><kbd>S</kbd></li><li><span>Delete selection</span><kbd>⌫</kbd></li><li><span>Zoom timeline</span><span><kbd>−</kbd><kbd>+</kbd></span></li><li><span>Fit timeline</span><kbd>⇧ Z</kbd></li><li><span>Undo / redo</span><span><kbd>⌘ Z</kbd><kbd>⇧⌘ Z</kbd></span></li><li><span>Mark in / out</span><span><kbd>I</kbd><kbd>O</kbd></span></li><li><span>Step a frame</span><span><kbd>←</kbd><kbd>→</kbd></span></li><li><span>Add marker / next marker</span><span><kbd>M</kbd><kbd>⇧ M</kbd></span></li><li><span>Snapping</span><kbd>N</kbd></li><li><span>Copy / paste / duplicate</span><span><kbd>⌘ C</kbd><kbd>⌘ V</kbd><kbd>⌘ D</kbd></span></li></ul>`)+`</div>`;
}
function generateCaptionsFromScript(){const words=state.script.trim().split(/\s+/).filter(Boolean);if(!words.length)return toast('Add a script first');if(totalDuration()<=.1)return toast('Add footage before creating captions');const groups=[];for(let i=0;i<words.length;i+=4)groups.push(words.slice(i,i+4).join(' '));const seg=totalDuration()/groups.length;applyMutation(()=>{state.texts=state.texts.filter(t=>t.kind!=='caption');groups.forEach((text,i)=>state.texts.push({id:uid('txt'),text,start:i*seg,duration:seg,kind:'caption',position:'bottom',fontSize:28,color:'#ffffff',fontWeight:600}));state.rightTab='ai';state.selectedTextId=null},`Created ${groups.length} script-based caption blocks`)}
function applyTemplate(index){const d=window.ReplotreTemplateCatalog?.TEMPLATES[index];if(d){state.tab='templates';renderAssetPanel()}}
function applyVariant(index){const variants=['Stop scrolling.\nThis changes everything.','Your best idea\ndeserves to be seen.','Create more. Edit less.\nStand out.'];applyMutation(()=>{let t=state.texts.find(x=>x.kind==='title');if(!t){t={id:uid('txt'),text:'',start:.3,duration:Math.min(totalDuration(),4),kind:'title',position:'center',fontSize:40,color:'#fff',fontWeight:600};state.texts.push(t)}t.text=variants[index]||variants[0];state.selectedTextId=t.id;state.selectedClipId=null;state.variantChoice=index},`Applied creative variant 0${index+1}`)}
let createdIds=null;
function executeOps(ops){let count=0;for(const op of ops){try{if(!op||typeof op.type!=='string')continue;const c=state.clips.find(v=>v.id===op.clipId)||selectedClip()||state.clips[0];switch(op.type){
 case 'set_aspect':if(ratioDims[op.value]){state.aspect=op.value;count++}break;
 case 'add_text':{if(!totalDuration())break;const t={id:uid('txt'),text:String(op.text||'Your next story').slice(0,160),start:clamp(op.start??state.playhead,0,Math.max(totalDuration()-.1,0)),duration:clamp(op.duration||3,.3,Math.max(.3,totalDuration())),position:['top','bottom','center'].includes(op.position)?op.position:'center',kind:op.kind==='caption'?'caption':'title',fontSize:Math.round((op.kind==='caption'?28:44)*clamp(+op.sizeMul||1,.5,2)),color:/^#[0-9a-f]{6}$/i.test(op.color||'')?op.color:'#ffffff',fontWeight:clamp(+op.fontWeight||600,300,900)};if(op.bg==='box'||op.bg==='none')t.bg=op.bg;if(/^#[0-9a-f]{6}$/i.test(op.bgColor||''))t.bgColor=op.bgColor;state.texts.push(t);createdIds?.push(t.id);state.selectedTextId=t.id;state.selectedClipId=null;count++;break}
 case 'set_text_color':{const color=/^#[0-9a-f]{6}$/i.test(op.value||'')?op.value:'#ffdc71';const arr=state.selectedTextId?[selectedText()].filter(Boolean):state.texts;arr.forEach(t=>t.color=color);count+=arr.length?1:0;break}
 case 'set_text_position':{const position=['top','center','bottom'].includes(op.value)?op.value:'bottom';state.texts.forEach(t=>{t.position=position;delete t.x;delete t.y});count++;break}
 case 'clip_set':{const ids=new Set(op.ids||[]),s=op.set||{},ad=op.add||{};let n=0;for(const cl of state.clips){if(!ids.has(cl.id))continue;n++;
   for(const [k,v] of Object.entries(s)){if(['trimStart','trimEnd','keepFirst','keepLast','speedMul','zoomMul','volumeAdd','warmthAdd'].includes(k))continue;if(k==='speed'){const old=cl.speed||1;cl.speed=clamp(v,.25,3);if(cl.keys?.length)cl.keys=cl.keys.map(q=>({...q,t:+(q.t*old/cl.speed).toFixed(4)}))}else if(k==='fadeIn'||k==='fadeOut')cl[k]=clamp(v,0,Math.min(3,clipDuration(cl)/2));else cl[k]=v}
   for(const [k,v] of Object.entries(ad)){const lim={brightness:[50,150],contrast:[50,150],saturation:[0,200]}[k];if(lim)cl[k]=clamp((cl[k]??100)+v,...lim)}
   if(s.warmthAdd!=null)cl.warmth=clamp((cl.warmth||0)+s.warmthAdd,-100,100);if(s.speedMul){const old=cl.speed||1;cl.speed=+clamp(old*s.speedMul,.25,3).toFixed(2)}if(s.zoomMul)cl.zoom=+clamp((cl.zoom||1)*s.zoomMul,1,3).toFixed(2);if(s.volumeAdd!=null)cl.volume=+clamp((cl.volume??1)+s.volumeAdd,0,1).toFixed(2);
   const max=clipMaxOut(cl),sp=cl.speed||1;if(s.trimStart){const d=Math.min(s.trimStart*sp,cl.out-cl.in-.2);cl.in+=d;cl.keys=shiftKeys(cl.keys,d/sp)}if(s.trimEnd)cl.out=Math.max(cl.in+.2,cl.out-s.trimEnd*sp);if(s.keepFirst)cl.out=Math.min(cl.out,cl.in+Math.max(.2,s.keepFirst*sp));if(s.keepLast){const ni=Math.max(cl.in,cl.out-Math.max(.2,s.keepLast*sp));cl.keys=shiftKeys(cl.keys,(ni-cl.in)/sp);cl.in=ni}cl.out=Math.min(cl.out,max)}
  if(n){count++;applyNativeLook?.()}break}
 case 'music_set':{if(!state.music)break;const s=op.set||{},ad=op.add||{};for(const [k,v] of Object.entries(s))state.music[k]=k==='volume'?clamp(v,0,1):clamp(v,0,8);for(const [k,v] of Object.entries(ad))state.music[k]=clamp((state.music[k]??1)+v,0,1);if(audioEl&&state.music.volume!=null)audioEl.volume=state.music.volume;count++;break}
 case 'range_set':case 'range_delete':{const E=.06,a0=op.a,b0=op.b;if(!(b0-a0>.15))break;executeOps([{type:'split_clip',at:b0},{type:'split_clip',at:a0}]);
   const starts=clipStarts(),inside=state.clips.filter((cl,k)=>starts[k]>=a0-E&&starts[k]+clipDuration(cl)<=b0+E);if(!inside.length)break;
   if(op.type==='range_delete'){if(inside.length>=state.clips.length){op.summary='Can’t cut the whole video';break}const ids=new Set(inside.map(cl=>cl.id));state.clips=state.clips.filter(cl=>!ids.has(cl.id));state.selectedClipId=state.clips[0]?.id||null;count++;break}
   const n=executeOps([{type:'clip_set',ids:inside.map(cl=>cl.id),set:op.set,add:op.add}]);if(n){state.selectedClipId=inside[0].id;count++}break}
 case 'fit_total':{const total=state.clips.reduce((s,cl)=>s+clipDuration(cl),0);if(!total)break;const factor=op.factor||(op.target/total);if(!(factor>0)||factor>=.999){op.summary=`Already ${fmt(total)} — under ${op.target}s`;count++;break}
   for(const cl of state.clips){if(op.mode==='speed'){const old=cl.speed||1;cl.speed=+clamp(old/factor,.25,3).toFixed(3);if(cl.keys?.length)cl.keys=cl.keys.map(k=>({...k,t:+(k.t*old/cl.speed).toFixed(4)}))}else cl.out=+Math.max(cl.in+.2,cl.in+(cl.out-cl.in)*factor).toFixed(3)}
   const now=state.clips.reduce((s,cl)=>s+clipDuration(cl),0);op.summary=`${op.target?`Fit to ${op.target}s`:op.summary} (${fmt(total)} → ${fmt(now)}, ${op.mode==='speed'?'sped up':'trimmed each clip'})`;count++;break}
 case 'clip_xfade':{if(state.clips.length<2)break;for(let i=1;i<state.clips.length;i++)state.clips[i].xfade=op.dur?clamp(op.dur,.2,maxXfade(i)):0;count++;break}
 case 'clip_delete':{const ids=new Set(op.ids||[]);if(!ids.size||ids.size>=state.clips.length&&state.clips.length>1&&false)break;const before=state.clips.length;state.clips=state.clips.filter(cl=>!ids.has(cl.id));if(state.clips.length!==before){if(!state.clips.some(cl=>cl.id===state.selectedClipId))state.selectedClipId=state.clips[0]?.id||null;count++}break}
 case 'clip_duplicate':{let n=0;for(const id of [...(op.ids||[])].reverse()){const i=state.clips.findIndex(cl=>cl.id===id);if(i<0)continue;const cp=JSON.parse(JSON.stringify(state.clips[i]));cp.id=uid('clip');cp.name=`${state.clips[i].name} copy`;state.clips.splice(i+1,0,cp);state.selectedClipId=cp.id;n++}if(n)count++;break}
 case 'clip_move':{const i=state.clips.findIndex(cl=>cl.id===op.id);if(i<0||state.clips.length<2)break;const [cl]=state.clips.splice(i,1);if(op.to==='start')state.clips.unshift(cl);else state.clips.push(cl);state.selectedClipId=cl.id;count++;break}
 case 'texts_set':{const ids=new Set(op.ids||[]);let n=0;for(const t of state.texts){if(!ids.has(t.id))continue;n++;const s0={...(op.set||{})};if(s0._clearXY){delete t.x;delete t.y}delete s0._clearXY;Object.assign(t,s0);if(op.mul?.fontSize)t.fontSize=Math.round(clamp((t.fontSize||(t.kind==='caption'?28:44))*op.mul.fontSize,12,100))}if(n)count++;break}
 case 'edit_texts':{let n=0;for(const e of op.edits||[]){const t=state.texts.find(x=>x.id===e.id);if(t&&typeof e.text==='string'&&e.text.trim()){t.text=e.text.slice(0,400);n++}}if(n){count++;const last=op.edits[op.edits.length-1];state.selectedTextId=last.id;state.selectedClipId=null}break}
 case 'remove_texts':{const ids=new Set(op.ids||[]);const before=state.texts.length;state.texts=state.texts.filter(t=>!ids.has(t.id));if(ids.has(state.selectedTextId))state.selectedTextId=null;if(state.texts.length!==before)count++;break}
 case 'remove_text':{if(state.texts.length){state.texts=state.texts.filter(t=>t.id!==op.textId);if(!op.textId)state.texts=[];count++}break}
 case 'trim_clip':{if(!c)break;const duration=clamp(op.duration||3,.2,(c.out-c.in));c.out=c.in+duration;count++;break}
 case 'split_clip':{const target=op.at??state.playhead;const hit=timelineAt(target);if(!hit)break;const off=target-hit.start;if(off<=.1||off>=clipDuration(hit.clip)-.1)break;const mid=hit.clip.in+off*(hit.clip.speed||1),originalEnd=hit.clip.out;hit.clip.out=mid;const [lk2,rk2]=splitKeysAt(hit.clip.keys,off);state.clips.splice(hit.index+1,0,{...hit.clip,id:uid('clip'),in:mid,out:originalEnd,name:hit.clip.name+' • 2',fadeIn:0,xfade:0,...(rk2?{keys:rk2}:{})});hit.clip.fadeOut=0;if(lk2)hit.clip.keys=lk2;count++;break}
 case 'set_speed':if(c){c.speed=clamp(op.value||1,.25,3);count++}break;
 case 'set_volume':if(c){c.volume=clamp(op.value??1,0,1);count++}break;
 case 'remove_music':if(state.music){state.music=null;count++}break;
 case 'generate_script_captions':{const words=state.script.trim().split(/\s+/).filter(Boolean);if(!words.length||!totalDuration())break;const groups=[];for(let i=0;i<words.length;i+=4)groups.push(words.slice(i,i+4).join(' '));const each=totalDuration()/groups.length;state.texts=state.texts.filter(t=>t.kind!=='caption');groups.forEach((text,i)=>state.texts.push({id:uid('txt'),text,start:i*each,duration:each,kind:'caption',position:'bottom',fontSize:28,color:'#ffffff',fontWeight:600}));count++;break}
 }}catch(e){console.warn('Operation skipped',op,e)}}return count}
/* ---------- Forgiving prompt understanding: typo-correct against the planner's vocabulary + map synonyms ---------- */
const PROMPT_VOCAB=['vertical','portrait','landscape','cinematic','youtube','square','instagram','reels','tiktok','shorts','caption','captions','subtitle','subtitles','title','titles','text','headline','overlay','add','insert','create','write','yellow','white','pink','purple','green','blue','red','bottom','center','centre','trim','shorten','split','faster','slower','slow','speed','motion','mute','remove','delete','music','soundtrack','sound','seconds','opening','first','intro','undo','redo','revert','color','colour','position','move','double','half','saying','background','audio','quicker','horizontal','widescreen','silence','heading','brighter','darker','contrast','saturation','saturated','desaturate','vintage','monochrome','vivid','vibrant','punchy','dramatic','fade','fades','zoom','mirror','flip','crossfade','crossfades','transition','transitions','dissolve','duplicate','volume','louder','quieter','unmute','bigger','smaller','larger','bold','normal','frame','letterbox','grayscale','brightness','clip','clips','scene','shot','music','soundtrack','shorter','longer','vignette','blur','warmer','cooler','cinematic','moody','dreamy','energetic','retro','clean','professional','recipe'];
const PROMPT_SYNONYMS=[
 [/\b(portrait mode|stand ?up|upright|phone (?:size|format)|instagram stor(?:y|ies)|ig stor(?:y|ies)|stor(?:y|ies) format|for (?:my )?stor(?:y|ies))\b/g,'vertical'],
 [/\b(horizontal|widescreen|wide ?screen|tv format|for tv|lay ?it down|sideways)\b/g,'landscape'],
 [/\b(instagram feed|feed post|ig post)\b/g,'instagram post'],
 [/\b(slo[- ]?mo|slowmo|slow ?mo)\b/g,'slow motion'],
 [/\b(fast[- ]?forward(?:ed)?|ff|time ?lapse|hyper ?lapse|sped up|zippier|snappier|quicker|speedier|speed(?: it)? up|hurry(?: it)? up|twice as fast|less slow|more fast|fast paced|fast)\b/g,'faster'],
 [/\b(slower paced|less fast|more slow|slowed down|slow(?:er)? it|chill(?:er)?|relaxed)\b/g,'slower'],
 [/\b(sepia|old film|old movie|nostalgic|film grain|analog)\b/g,'vintage'],
 [/\b(colorless|colourless|grey ?scale|gray ?scale|noir)\b/g,'black and white'],
 [/\b(make it pop|more pop|more vibrant|brighter colou?rs)\b/g,'vivid'],
 [/\b(more volume|pump (?:it|the volume) up|crank it up)\b/g,'louder'],
 [/\b(less volume|turn it down|tone it down)\b/g,'quieter'],
 [/\b(half as fast)\b/g,'half speed'],
 [/\b(silence|no sound|no audio|turn off (?:the )?(?:sound|audio)|kill (?:the )?(?:sound|audio)|remove (?:the )?audio|without sound|quiet)\b/g,'mute'],
 [/\b(heading|caption text|label)\b/g,'title'],
 [/\b(subs|cc|closed captions?)\b/g,'captions'],
 [/\b(golden|gold)\b/g,'yellow'],[/\b(violet|lilac)\b/g,'purple'],[/\b(navy|sky blue)\b/g,'blue'],[/\b(crimson|scarlet)\b/g,'red'],
 [/\b(get rid of|take (?:off|out|away)|erase|wipe(?: out)?|clear out|drop|kill)\b/g,'remove'],
 [/\b(middle)\b/g,'center'],[/\b(chop|cut down)\b/g,'trim'],[/\b(sec|secs)\b/g,'seconds'],
];
const PROMPT_COMMON=new Set('into onto mode more most made make makes have with this that these those your from then than them they there their nice also just some like over open clip clips video frame frames start ends time back sure want need give take keep turn look feel same what when where which while will would could should about after before again every each other only very much many here near next last best good great show tell call does done fine cool tone mood warm cold bold font fonts size sized line lines word words name logo song songs beat beats edit edits text title mute sound speed trim'.split(' '));
function editDistance(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;
 for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[m][n]}
function normalizePrompt(text){const fixes=[];const parts=text.split(/(["“‘][^"”’]*["”’])/); // never touch quoted text (titles you typed)
 let contentStarted=false;const out=parts.map((part,i)=>{if(i%2||contentStarted)return part;const cm=/\b(?:saying|says?|called|captions?|subtitles?|subs|titles?|headline|heading|text)\b\s*:?\s*/i.exec(part);let tail='';if(cm){tail=part.slice(cm.index+cm[0].length);part=part.slice(0,cm.index+cm[0].length);contentStarted=true}let p=part;for(const [re,rep] of PROMPT_SYNONYMS)p=p.replace(re,rep);p=p.replace(/\b[a-zA-Z]{4,}\b/g,w=>{const lw=w.toLowerCase();if(PROMPT_VOCAB.includes(lw)||PROMPT_COMMON.has(lw))return w;
   const max=lw.length>=7?2:1;let best=null,bd=9,tie=false;for(const v of PROMPT_VOCAB){if(Math.abs(v.length-lw.length)>max)continue;const dd=editDistance(lw,v);if(dd<bd){bd=dd;best=v;tie=false}else if(dd===bd&&v!==best)tie=true}
   if(best&&bd<=max&&!tie&&best[0]===lw[0]){if(lw===best+'s'||lw===best+'es'||best===lw+'s')return w;fixes.push([w,best]);return best}return w});
  for(const [re,rep] of PROMPT_SYNONYMS)p=p.replace(re,rep);return p+tail});
 return {text:out.join(''),fixes}}
/* Text that follows a keyword in the user's own words (never typo-corrected), minus connectors and trailing style clauses. */
function textAfter(raw,keyRe){const m=keyRe.exec(raw);if(!m)return '';let t=raw.slice(m.index+m[0].length);
 t=t.replace(/^\s*(?:s\b)?\s*(?:saying|(?:that|which|to) says?|says?|reading|reads?|with (?:the )?(?:text|words)|with(?= \S+ \S)|of|for|as|:|-|–|—|=)\s*/i,'').trim();
 const styleTail=/\s*(?:,|\band\b)?\s*(?:(?:at|on|in|to) (?:the )?(?:bottom|top|center|centre|middle)(?: of (?:the )?(?:screen|video|frame))?|in (?:yellow|white|pink|purple|green|blue|red|gold|golden)(?: colou?r)?|(?:yellow|white|pink|purple|green|blue|red) colou?r(?:ed)?|please|thanks?)\s*[.!]?\s*$/i;
 for(let k=0;k<4&&styleTail.test(t);k++)t=t.replace(styleTail,'').trim();
 t=t.replace(/^["“‘']+|["”’']+$/g,'').trim();return /^(?:a|an|the|it|them|this|that|one|some|here)?$/i.test(t)?'':t.slice(0,400)}
/* Split caption text into short, readable timed chunks that fit the remaining video. */
const t2=v=>Math.round(v*100)/100;
function captionChunks(text,start){const words=text.replace(/\s+/g,' ').trim(),sentences=words.split(/(?<=[.!?])\s+/).filter(Boolean),chunks=[];
 for(const sen of sentences){const w=sen.split(' ');if(w.length<=7){chunks.push(sen);continue}const n=Math.ceil(w.length/6),per=Math.ceil(w.length/n);for(let i=0;i<w.length;i+=per)chunks.push(w.slice(i,i+per).join(' '))}
 const total=totalDuration(),room=Math.max(.6,total-start);let durs=chunks.map(c=>clamp(c.split(' ').length*.42,1.2,4));const sum=durs.reduce((x,y)=>x+y,0);if(sum>room)durs=durs.map(d=>d*room/sum);
 let t=start;return chunks.map((c,i)=>{const o={text:c,start:+t.toFixed(2),duration:+Math.max(.3,durs[i]).toFixed(2)};t+=durs[i];return o})}
/* "remove captions", "delete the caption i love you", "remove this title", "remove the last 2 captions", "remove the yellow captions", "remove captions after 5 seconds"… */
function planTextRemoval(raw,lower,opt={}){const verb=opt.verb||'remove',chipTail=opt.chipTail||'';if(!/\b(captions?|subtitles?|subs|titles?|headlines?|headings?|texts?|overlays?|words|everything)\b/.test(lower))return null;
 const isCap=/\b(captions?|subtitles?|subs)\b/.test(lower),isTitle=/\b(titles?|headlines?|headings?)\b/.test(lower),kind=isCap&&!isTitle?'caption':isTitle&&!isCap?'title':null;
 const noun=k=>k==='caption'?'caption':k==='title'?'title':'text layer',plural=/\b(captions|subtitles|subs|titles|headlines|texts|all|every|everything)\b/.test(lower);
 let list=state.texts.filter(t=>!kind||(kind==='caption'?t.kind==='caption':t.kind!=='caption'));
 if(!list.length)return {message:`There ${kind?`are no ${noun(kind)}s`:'is no text'} to ${verb==='remove'?'remove':'edit'}.`,suggest:kind==='caption'?['add caption Hello there']:null};
 const filters=[];
 // look: colour / position
 const colors={yellow:'#ffe074',white:'#ffffff',pink:'#ff9ad3',purple:'#bb9bff',green:'#a0f0b9',blue:'#89b7ff',red:'#ff8585'},col=Object.keys(colors).find(c=>new RegExp(`\\b${c}\\b`).test(lower));
 if(col){list=list.filter(t=>String(t.color||'#ffffff').toLowerCase()===colors[col]);filters.push(col)}
 const pos=/\bbottom\b/.test(lower)?'bottom':/\btop\b/.test(lower)?'top':/\b(center|centre)\b/.test(lower)?'center':null;if(pos){list=list.filter(t=>(t.position||'center')===pos);filters.push(`at the ${pos}`)}
 // time: after / before / between N seconds
 const num='(\\d+(?:\\.\\d+)?)\\s*(?:s|sec|secs|seconds?)?';let m;
 if((m=new RegExp(`\\bbetween ${num} and ${num}`).exec(lower))){const x=+m[1],y=+m[2];list=list.filter(t=>t.start<y&&t.start+t.duration>x);filters.push(`between ${x}s and ${y}s`)}
 else{if((m=new RegExp(`\\b(?:after|from) ${num}`).exec(lower))){const x=+m[1];list=list.filter(t=>t.start>=x-.01);filters.push(`after ${x}s`)}if((m=new RegExp(`\\b(?:before|until) ${num}`).exec(lower))){const x=+m[1];list=list.filter(t=>t.start<x);filters.push(`before ${x}s`)}}
 // where the playhead is
 const here=/\b(here|now|on screen|at the playhead|current(?:ly)?|visible)\b/.test(lower);if(here){list=list.filter(t=>textVisibleAt(t,state.playhead));filters.push('at the playhead')}
 // content: quoted text or the words after the noun
 const quoted=raw.match(/["“'‘]([^"”'’]+)["”'’]/)?.[1];let q=(quoted||textAfter(raw,/\b(?:captions?|subtitles?|subs|titles?|headlines?|headings?|texts?|overlays?)\b/i)).toLowerCase();
 q=q.replace(/\b(?:here|now|on screen|at the playhead|currently|visible|please|(?:after|before|from|until) \d+(?:\.\d+)?\s*(?:s|sec|secs|seconds?)?|between \d+(?:\.\d+)? and \d+(?:\.\d+)?\s*(?:s|sec|secs|seconds?)?|(?:at|on|in) the (?:top|bottom|center|centre|middle)|in (?:yellow|white|pink|purple|green|blue|red))\b/g,'').replace(/\s+/g,' ').trim();
 const nm=/^(?:number|no\.?|#)\s*(\d+)$/.exec(q)||/^(\d+)$/.exec(q);let ordinal=null;if(nm){ordinal=+nm[1];q=''}
 if(q){const words=q.split(' ').filter(w=>w.length>1),hit=list.filter(t=>{const tx=t.text.toLowerCase();if(tx.includes(q)||q.includes(tx))return true;const tw=new Set(tx.split(/\s+/));return words.length&&words.filter(w=>tw.has(w)).length/words.length>=.6});
  if(!hit.length){const pool=state.texts.filter(t=>!kind||(kind==='caption'?t.kind==='caption':t.kind!=='caption')).slice(0,4);return {message:`I couldn’t find a ${noun(kind)} saying “${q}”.${pool.length?` Tap one to ${verb} it:`:''}`,suggest:pool.map(t=>`${verb} ${t.kind==='caption'?'caption':'title'} “${t.text.slice(0,40)}”${chipTail}`)}}
  list=hit;filters.push(`saying “${q}”`)}
 // which one: this/selected, ordinals, first/last N
 list.sort((x,y)=>x.start-y.start);const words2={one:1,two:2,three:3,four:4,five:5};
 const ord=/\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\b(?:\s+(\d+|one|two|three|four|five))?/.exec(lower);
 if(/\b(this|that|selected)\b/.test(lower)&&!q&&!ordinal&&state.selectedTextId){const sel=list.find(t=>t.id===state.selectedTextId);if(sel){list=[sel];filters.push('selected')}}
 else if(ordinal){list=list[ordinal-1]?[list[ordinal-1]]:[];filters.push(`#${ordinal}`)}
 else if(ord){const w=ord[1],n=ord[2]?(+ord[2]||words2[ord[2]]):1,idx={first:0,'1st':0,second:1,'2nd':1,third:2,'3rd':2,fourth:3,'4th':3,fifth:4,'5th':4}[w];
  list=w==='last'?list.slice(-n):ord[2]&&w==='first'?list.slice(0,n):list[idx]?[list[idx]]:[];filters.push(`${w}${ord[2]?' '+n:''}`)}
 if(!list.length)return {message:`No ${noun(kind)}s match that${filters.length?` (${filters.join(', ')})`:''}.`,suggest:null};
 // a bare singular ("remove the caption") with several candidates is ambiguous: ask, with one-tap options
 if(!plural&&!filters.length&&list.length>1){const sel=list.find(t=>t.id===state.selectedTextId);if(sel)list=[sel];else{const vis=list.filter(t=>textVisibleAt(t,state.playhead));if(vis.length===1)list=vis;else return {message:`You have ${list.length} ${noun(kind)}s. Which one should I ${verb==='remove'?'remove':'change'}?`,suggest:[...list.slice(0,3).map(t=>`${verb} ${t.kind==='caption'?'caption':'title'} “${t.text.slice(0,40)}”${chipTail}`),...(verb==='remove'?[`remove all ${kind?noun(kind)+'s':'text'}`]:[])]}}}
 const caps=list.filter(t=>t.kind==='caption').length,tits=list.length-caps;
 const parts=[caps?`${caps} caption${caps===1?'':'s'}`:'',tits?`${tits} title${tits===1?'':'s'}`:''].filter(Boolean).join(' and ');
 const named=list.length===1?` “${list[0].text.slice(0,40).replace(/[.!?,;:]+$/,'')}”`:'';
 return {ids:list.map(t=>t.id),op:{type:'remove_texts',ids:list.map(t=>t.id),summary:`Removed ${list.length===1?(caps?'the caption':'the title'):parts}${named}`}}}
/* Caption / title text edits: rewrite, find & replace, change case. Targets resolve exactly like removal. */
function planTextEdit(raw,lower){const R=raw.trim(),nounRe=/\b(captions?|subtitles?|subs|titles?|headlines?|headings?|texts?|overlays?|words)\b/;
 const look=/^(?:(?:the )?(?:colou?r )?(?:to )?(?:yellow|white|pink|purple|green|blue|red|gold|golden|bigger|smaller|bold|top|bottom|center|centre|middle)(?: colou?r)?)$/i;
 const caseMap=[[/\b(upper ?case|all caps|caps lock|capitali[sz]e(?: all)?|in caps)\b/,'upper'],[/\blower ?case\b/,'lower'],[/\btitle ?case\b/,'title'],[/\bsentence ?case\b/,'sentence']];
 const cm=caseMap.find(([re])=>re.test(lower));
 if(cm&&nounRe.test(lower)){const target=planTextRemoval('remove '+R.replace(caseMap.map(c=>c[0].source).join('|')&&new RegExp(caseMap.map(c=>c[0].source).join('|'),'ig'),'').replace(/\b(make|turn|change|convert|set|put)\b/ig,''),lower.replace(/\b(make|turn|change|convert|set|put)\b/g,''),{verb:'capitalize'});
  if(!target?.ids)return target;const fx={upper:s=>s.toUpperCase(),lower:s=>s.toLowerCase(),title:s=>s.toLowerCase().replace(/\b\p{L}/gu,c=>c.toUpperCase()),sentence:s=>s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu,(m,p,c)=>p+c.toUpperCase())}[cm[1]];
  const edits=state.texts.filter(t=>target.ids.includes(t.id)).map(t=>({id:t.id,text:fx(t.text)})).filter(e=>e.text!==state.texts.find(t=>t.id===e.id).text);
  if(!edits.length)return {message:'Those are already in that case.'};return {op:{type:'edit_texts',edits,summary:`Changed ${edits.length} ${edits.length===1?'layer':'layers'} to ${cm[1]==='upper'?'UPPERCASE':cm[1]==='lower'?'lowercase':cm[1]==='title'?'Title Case':'Sentence case'}`}}}
 const vm=/^(?:(?:please|pls|can you|could you|now|ok|okay) )*(change|edit|update|rename|replace|fix|correct|reword|rewrite|swap|make|set|turn)\b\s*(.*)$/i.exec(R);if(!vm)return null;
 const verb=vm[1].toLowerCase(),rest=vm[2];if(/^(make|set|turn)$/.test(verb)&&!/\b(say|says|read|reads)\b/i.test(rest))return null;
 // split "<target> <connector> <new text>"; two quoted strings win
 const qs=[...rest.matchAll(/["“‘]([^"”’]+)["”’]/g)].map(m=>m[1]);let target,next;
 if(qs.length>=2){target=qs[0];next=qs[1];const before=rest.slice(0,rest.indexOf(qs[0])-1);target=(before+' '+qs[0]).trim()}
 else{const cons=[' so it says ',' so that it says ',' to say ',' to read ',' say ',' says ',' with ',' into ',' to ',' as ',': '];let at=-1,len=0;for(const c of cons){const i=(' '+rest+' ').toLowerCase().indexOf(c);if(i>=0&&(at<0||i<at)){at=i;len=c.length}}
  if(at<0)return null;target=(' '+rest).slice(0,at).trim();next=(' '+rest+' ').slice(at+len).trim()}
 next=next.replace(/^["“‘]+|["”’]+$/g,'').replace(/\s+(?:please|thanks?)$/i,'').trim();if(!next||look.test(next))return null;
 const tl=target.toLowerCase();
 // explicit text target ("the caption …", "this title", "the last caption") → whole-text rewrite
 if(nounRe.test(tl)||/\b(this|that|selected|first|second|third|last|number)\b/.test(tl)||!tl){const res=planTextRemoval('remove '+(target||'the caption'),'remove '+(tl||'the caption'),{verb:'change',chipTail:` to “${next}”`});if(!res)return null;if(!res.ids)return res;
  if(res.ids.length>1){const pool=state.texts.filter(t=>res.ids.includes(t.id)).slice(0,3);return {message:`That matches ${res.ids.length} layers. Which one should say “${next}”?`,suggest:pool.map(t=>`change ${t.kind==='caption'?'caption':'title'} “${t.text.slice(0,40)}” to “${next}”`)}}
  const t=state.texts.find(x=>x.id===res.ids[0]);return {op:{type:'edit_texts',edits:[{id:t.id,text:next}],summary:`Changed the ${t.kind==='caption'?'caption':'title'} “${t.text.slice(0,30).replace(/[.!?]+$/,'')}” to “${next}”`}}}
 // bare words ("replace hello with hi", "change hello to hi") → match inside existing text; fall through if nothing matches
 const clean=tl.replace(/^(?:the )?(?:word|phrase|text)s? /,'').replace(/\s+in (?:the |all )?(?:captions?|subtitles?|titles?|text)$/,'').replace(/^["“‘]|["”’]$/g,'').trim();if(!clean)return null;
 const esc=clean.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),wre=new RegExp(`(^|[^\\p{L}\\p{N}])(${esc})(?=$|[^\\p{L}\\p{N}])`,'giu');
 const scope=/\bcaptions?|subtitles?\b/.test(lower)?state.texts.filter(t=>t.kind==='caption'):/\btitles?\b/.test(lower)?state.texts.filter(t=>t.kind!=='caption'):state.texts;
 const edits=[];for(const t of scope){const whole=t.text.trim().toLowerCase().replace(/[.!?]+$/,'')===clean.replace(/[.!?]+$/,'');const out=whole?next:t.text.replace(wre,(m,p,w)=>p+(w===w.toUpperCase()&&w.length>1?next.toUpperCase():w[0]===w[0].toUpperCase()?next[0].toUpperCase()+next.slice(1):next));if(out!==t.text)edits.push({id:t.id,text:out})}
 if(!edits.length)return /^(replace|fix|correct|rename|swap|reword)$/.test(verb)?{message:`I couldn’t find “${clean}” in your ${scope===state.texts?'text':'captions'}.`}:null;
 return {op:{type:'edit_texts',edits,summary:`Replaced “${clean}” with “${next}” in ${edits.length} ${edits.length===1?'layer':'layers'}`}}}
/* ---------- Everyday clip / text / music commands (speed, volume, looks, colour, fades, framing, transitions, clip ops, trims, text style, music) ---------- */
function promptClips(lower){const cl=state.clips;if(!cl.length)return [];
 if(/\b(all|every|each)\b(?: the| of the)? (?:clips?|shots?|scenes?)\b|\b(whole|entire|full) (?:video|project|edit|thing)\b|\beverything\b|\b(?:the|my|this|our) (?:video|edit|project|movie|reel)\b/.test(lower))return cl.slice();
 const ord=/\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\s+(?:clip|shot|scene)\b/.exec(lower)||/\b(?:clip|shot|scene)\s+(?:number\s+|#)?(\d+)\b/.exec(lower);
 if(ord){const w=ord[1],i={first:0,'1st':0,second:1,'2nd':1,third:2,'3rd':2,fourth:3,'4th':3,fifth:4,'5th':4,last:cl.length-1}[w]??(+w-1);return cl[i]?[cl[i]]:[]}
 const named=cl.filter(c=>c.name&&c.name.length>2&&lower.includes(c.name.toLowerCase()));if(named.length&&named.length<cl.length){const exact=named.filter(c=>!named.some(o=>o!==c&&o.name.toLowerCase().includes(c.name.toLowerCase())&&o.name.length>c.name.length));return exact.length?exact:named}
 const sel=selectedClip()||timelineAt()?.clip||cl[0];return sel?[sel]:[]}
function planCommands(raw,lower){const ops=[],done=new Set(),num=s=>+String(s).replace(',', '.'),R=raw;
 const amt=(base)=>/\b(a (?:little|bit|touch)|slightly|a tad|bit)\b/.test(lower)?base/2:/\b(much|a lot|way|very|really|super|extra)\b/.test(lower)?base*2:base;
 const textNoun=/\b(text|texts|captions?|subtitles?|titles?|headlines?|font|words)\b/.test(lower),musicNoun=/\b(music|soundtrack|song|background (?:music|audio|track)|track)\b/.test(lower);
 const clips=promptClips(lower),who=clips.length===state.clips.length&&clips.length>1?'all clips':clips.length===1?`“${clips[0].name}”`:'';
 const clipOp=(set,summary,extra={})=>{if(clips.length)ops.push({type:'clip_set',ids:clips.map(c=>c.id),set,summary,who:state.clips.length>1?who:'',...extra})};
 // speed
 let m=/(?:\b(?:speed|playback|play)\b[^0-9]{0,14})?(\d+(?:[.,]\d+)?)\s*(?:x|×)\b(?:\s*speed)?/.exec(lower)||/\bspeed\b[^0-9]{0,12}(\d+(?:[.,]\d+)?)\b/.exec(lower);
 if(m&&!musicNoun&&/\b(x|×|speed|playback|times)\b/.test(lower)&&!/\bzoom\b/.test(lower)){const v=clamp(num(m[1]),.25,3);clipOp({speed:v},`Speed ${v}×`);done.add('speed')}
 else if(/\b(normal|regular|original|real ?time|reset(?: the)?) speed\b|\bspeed (?:back )?to normal\b/.test(lower)){clipOp({speed:1},'Normal speed');done.add('speed')}
 else if(/\b(slow motion|half speed)\b/.test(lower)){clipOp({speed:.5},'Slow motion');done.add('speed')}
 else if(/\b(double speed)\b/.test(lower)){clipOp({speed:2},'Double speed');done.add('speed')}
 else if(/\bfaster\b/.test(lower)&&!/\b(a (?:little|bit)|slightly|much|a lot|way|very)\b/.test(lower)){clipOp({speed:1.5},'Speed 1.5×');done.add('speed')}
 else if(/\bfaster\b/.test(lower)&&/\b(a (?:little|bit)|slightly|much|a lot|way|very)\b/.test(lower)){clipOp({speedMul:1+amt(.5)},`${amt(.5)<.5?'A bit':'Much'} faster`);done.add('speed')}
 else if(/\bslower\b|\bslow (?:it )?down\b/.test(lower)&&/\b(a (?:little|bit)|slightly|much|a lot|way|very)\b/.test(lower)){clipOp({speedMul:1/(1+amt(.5))},`${amt(.5)<.5?'A bit':'Much'} slower`);done.add('speed')}
 // volume (clip or music)
 const volTarget=musicNoun?'music':'clip';const setVol=(v,label)=>{if(volTarget==='music'){if(state.music)ops.push({type:'music_set',set:{volume:clamp(v,0,1)},summary:`Music ${label}`})}else clipOp({volume:clamp(v,0,1)},`Volume ${label}`);done.add('volume')};
 if((m=/\b(?:volume|loudness|sound|audio|music|soundtrack)\b[^0-9]{0,12}(\d{1,3})\s*%?/.exec(lower)||/(\d{1,3})\s*%\s*(?:volume|loudness)/.exec(lower)))setVol(num(m[1])/100,`${Math.min(100,num(m[1]))}%`);
 else if(/\bunmute\b|\bturn (?:the )?(?:sound|audio) (?:back )?on\b|\bbring (?:the )?(?:sound|audio) back\b/.test(lower))setVol(1,'100%');
 else if(/\b(louder|turn (?:it|the (?:volume|sound|music)) up|increase (?:the )?(?:volume|sound)|raise (?:the )?volume|volume up|boost (?:the )?(?:audio|sound|volume))\b/.test(lower)){if(volTarget==='music'){if(state.music)ops.push({type:'music_set',add:{volume:amt(.25)},summary:'Music louder'})}else clipOp({volumeAdd:amt(.25)},'Louder');done.add('volume')}
 else if(/\b(quieter|softer|lower (?:the )?(?:volume|sound|music|audio)|turn (?:it|the (?:volume|sound|music)) down|decrease (?:the )?(?:volume|sound)|reduce (?:the )?(?:volume|sound|music)|volume down)\b/.test(lower)){if(volTarget==='music'){if(state.music)ops.push({type:'music_set',add:{volume:-amt(.25)},summary:'Music quieter'})}else clipOp({volumeAdd:-amt(.25)},'Quieter');done.add('volume')}
 // looks
 if(!textNoun){const looks=[[/\b(black and white|black & white|b ?& ?w|bw|grayscale|greyscale|monochrome|mono|no colou?r)\b/,'mono'],[/\b(vintage|retro|faded|film look|filmic|matte|old school)\b/,'matte'],[/\b(vivid|vibrant|colou?rful|pop(?:py)?|saturated look)\b/,'vivid'],[/\b(punch(?:y)?|dramatic|contrasty|bold look)\b/,'punch'],[/\b(soft(?: look)?|dreamy|gentle|pastel)\b/,'soft'],[/\b(natural|original colou?rs?|reset (?:the )?colou?rs?|remove (?:the )?(?:filter|look|grade)|no filter)\b/,'natural']];
  const lk=looks.find(([re])=>re.test(lower));if(lk&&!(lk[1]==='soft'&&/\bsofter\b/.test(lower))){const L=LOOKS.find(x=>x[0]===lk[1]);clipOp({...L[2],look:L[0]},`${L[1]} look`);done.add('look')}
  // fine colour
  const adj=[];if(!done.has('look')){
   if((m=/\bbrightness\b[^0-9]{0,10}(\d{2,3})/.exec(lower)))adj.push(['brightness','set',clamp(num(m[1]),50,150),'Brightness '+m[1]+'%']);else if(/\b(brighter|brighten|lighter|lighten|more light|more exposure)\b/.test(lower))adj.push(['brightness','add',amt(15),'Brighter']);else if(/\b(darker|darken|dim(?:mer)?|less light|moodier)\b/.test(lower))adj.push(['brightness','add',-amt(15),'Darker']);
   if((m=/\bcontrast\b[^0-9]{0,10}(\d{2,3})/.exec(lower)))adj.push(['contrast','set',clamp(num(m[1]),50,150),'Contrast '+m[1]+'%']);else if(/\b(more|increase|higher|boost|add) contrast\b|\bcontrast up\b/.test(lower))adj.push(['contrast','add',amt(15),'More contrast']);else if(/\b(less|lower|reduce|decrease) contrast\b|\bflatter\b/.test(lower))adj.push(['contrast','add',-amt(15),'Less contrast']);
   if((m=/\bsaturation\b[^0-9]{0,10}(\d{1,3})/.exec(lower)))adj.push(['saturation','set',clamp(num(m[1]),0,200),'Saturation '+m[1]+'%']);else if(/\b(more (?:saturated|saturation|colou?r)|saturate|richer colou?rs?|boost (?:the )?colou?rs?)\b/.test(lower))adj.push(['saturation','add',amt(25),'More colour']);else if(/\b(less (?:saturated|saturation|colou?r)|desaturate|muted colou?rs?|washed out)\b/.test(lower))adj.push(['saturation','add',-amt(30),'Less colour']);}
  if(adj.length){const set={},add={};for(const [k,mode,v] of adj)(mode==='set'?set:add)[k]=v;clipOp({...set,look:'custom'},adj.map(x=>x[3]).join(', '),{add});done.add('color')}}
 // effects: warmth, vignette, blur
 if(!textNoun){
  if(/\b(warmer|warm(?: it)? up|warm tones?|golden tones?|more warmth)\b/.test(lower)){clipOp({warmthAdd:amt(30)},'Warmer');done.add('fx')}else if(/\b(cooler|cool(?: it)? down|cold tones?|blue tones?|colder)\b/.test(lower)){clipOp({warmthAdd:-amt(30)},'Cooler');done.add('fx')}
  if(/\b(remove|no|without)(?: the)? vignette\b/.test(lower)){clipOp({vignette:0},'Vignette removed');done.add('fx')}else if(/\bvignette\b/.test(lower)){const v=(m=/\bvignette\b[^0-9]{0,10}(\d{1,3})/.exec(lower))?clamp(num(m[1]),0,100):/\b(subtle|light|slight)\b/.test(lower)?35:/\b(strong|heavy|dark)\b/.test(lower)?85:60;clipOp({vignette:v},`Vignette ${v}%`);done.add('fx')}
  if(/\b(remove|no|without|unblur)(?: the)? blur\b|\bsharp(?:en)?\b/.test(lower)){clipOp({blur:0},'Blur removed');done.add('fx')}else if(/\bblur(?:ry|red)?\b/.test(lower)){const b=(m=/\bblur\b[^0-9]{0,10}(\d{1,3})/.exec(lower))?clamp(num(m[1]),0,100):/\b(slight|subtle|a (?:little|bit))\b/.test(lower)?20:/\b(heavy|strong|very|a lot)\b/.test(lower)?70:40;clipOp({blur:b},`Blur ${b}%`);done.add('fx')}}
 // fades (music if mentioned)
 const fadeSec=(m=/\bfades?(?: (?:in|out|in and out))?(?: (?:of|over|for))?\s*(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?)\b/.exec(lower))?num(m[1]):.8;
 if(/\b(remove|no|without|delete|clear)(?: the| all)? fades?\b/.test(lower)){musicNoun&&state.music?ops.push({type:'music_set',set:{fadeIn:0,fadeOut:0},summary:'Music fades removed'}):clipOp({fadeIn:0,fadeOut:0},'Fades removed');done.add('fade')}
 else if(/\bfade\b|\bfades\b/.test(lower)&&!textNoun){const fin=/\bfade(?:s)? in\b|\bfade (?:it )?in\b|\bfades?\b(?! out)|\bin and out\b/.test(lower)&&!/\bfade out\b(?! and)/.test(lower)||/\bin and out\b|\bfades\b/.test(lower),fout=/\bfade(?:s)? out\b|\bin and out\b|\bfades\b|\bfade (?:it|the \w+) out\b/.test(lower);
  const set={};if(fin)set.fadeIn=fadeSec;if(fout)set.fadeOut=fadeSec;if(!fin&&!fout)set.fadeIn=set.fadeOut=fadeSec;
  if(musicNoun&&state.music)ops.push({type:'music_set',set,summary:`Music ${Object.keys(set).map(k=>k==='fadeIn'?'fade in':'fade out').join(' & ')} ${fadeSec}s`});else clipOp(set,`${Object.keys(set).map(k=>k==='fadeIn'?'Fade in':'Fade out').join(' & ')} ${fadeSec}s`,{fadeTargets:true});done.add('fade')}
 // framing
 if(/\b(fit (?:it )?(?:to|in|inside)? ?(?:the )?(?:frame|screen|canvas)|letterbox|show (?:the )?(?:whole|full|entire) (?:shot|frame|video|clip)|no crop(?:ping)?|don'?t crop)\b/.test(lower)){clipOp({fit:'fit'},'Fit to frame');done.add('frame')}
 else if(/\b(fill (?:the )?(?:frame|screen|canvas)|crop to fill|fill it)\b/.test(lower)){clipOp({fit:'fill'},'Fill the frame');done.add('frame')}
 if((m=/\bzoom(?: in)?(?: to| by)?\s*(\d+(?:[.,]\d+)?)\s*(x|×|%)?/.exec(lower))){let v=num(m[1]);if(m[2]==='%'||v>3)v=v/100;clipOp({zoom:clamp(v,1,3)},`Zoom ${clamp(v,1,3)}×`);done.add('zoom')}
 else if(/\bzoom in\b|\bcloser\b|\bpunch in\b|\btighter (?:shot|crop)\b/.test(lower)){clipOp({zoomMul:1+amt(.3)},'Zoomed in');done.add('zoom')}
 else if(/\bzoom out\b|\breset (?:the )?zoom\b|\bwider\b|\bno zoom\b/.test(lower)){clipOp({zoom:1},'Zoom reset');done.add('zoom')}
 if(/\b(un ?flip|unmirror|flip (?:it )?back)\b/.test(lower)){clipOp({flipH:false},'Unflipped');done.add('flip')}else if(/\b(flip|mirror)\b/.test(lower)){clipOp({flipH:true},'Mirrored');done.add('flip')}
 if(/\breset (?:the )?(?:framing|crop|position)\b/.test(lower)){clipOp({fit:'fill',zoom:1,panX:0,panY:0,flipH:false},'Framing reset');done.add('frame')}
 // transitions
 if(/\b(remove|no|delete|clear|without)(?: the| all)? (?:transitions?|crossfades?|dissolves?)\b|\bhard cuts?\b/.test(lower)){ops.push({type:'clip_xfade',dur:0,summary:'Transitions removed'});done.add('xfade')}
 else if(/\b(crossfades?|cross ?dissolves?|dissolves?|transitions?|smooth (?:cuts|transitions?))\b/.test(lower)&&/\b(add|smooth|use|put|make|crossfade|dissolve)\b/.test(lower)){const d=(m=/(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?)\b/.exec(lower))?num(m[1]):XFADE_DEFAULT;ops.push({type:'clip_xfade',dur:d,summary:`Crossfades ${d}s between clips`});done.add('xfade')}
 // total length: "make it 15 seconds long", "cut the video down to 10s", "fit it into 20 seconds by speeding up", "make it shorter"
 if((m=/\b(?:make|cut|trim|shorten|fit|get|bring|keep)\b[^0-9]{0,40}?(?:to|into|under|down to|at)?\s*(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?)\b\s*(?:long|total|in total|overall|in length|max|maximum)?/.exec(lower))&&(/\b(long|total|overall|in length|whole|entire|video|everything|under|max|fit)\b/.test(lower))&&!/\b(first|last|opening|intro|ending|clip \d|fade|crossfade|transition|caption|title|text|cut out|between)\b/.test(lower)&&!/\bfrom\s+\d[^a-z]*\s*(?:s|sec|secs|seconds?)?\s*(?:to|until|-)\s*\d/.test(lower)){
  ops.push({type:'fit_total',target:num(m[1]),mode:/\b(speed|faster|speeding)\b/.test(lower)?'speed':'trim',summary:`Fit to ${num(m[1])}s`});done.add('trim');done.add('speed')}
 else if(/\b(shorter|tighter edit|shorten (?:it|the video|everything))\b/.test(lower)&&!textNoun){const f=/\b(a (?:little|bit)|slightly)\b/.test(lower)?.85:/\b(much|a lot|way)\b/.test(lower)?.5:.75;ops.push({type:'fit_total',factor:f,mode:'trim',summary:`${Math.round((1-f)*100)}% shorter`});done.add('trim')}
 // clip operations
 const clipNoun=/\b(clips?|shots?|scenes?)\b/.test(lower);
 if(clipNoun&&/\b(remove|delete|cut out|drop)\b/.test(lower)&&!textNoun){ops.push({type:'clip_delete',ids:clips.map(c=>c.id),summary:`Removed ${clips.length===1?`clip “${clips[0]?.name}”`:`${clips.length} clips`}`});done.add('clipop')}
 else if(clipNoun&&/\b(duplicate|copy|repeat|clone)\b/.test(lower)){ops.push({type:'clip_duplicate',ids:clips.map(c=>c.id),summary:`Duplicated ${clips.length===1?`“${clips[0]?.name}”`:`${clips.length} clips`}`});done.add('clipop')}
 else if(clipNoun&&/\bmove\b/.test(lower)&&(m=/\bto (?:the )?(start|beginning|front|end|back)\b/.exec(lower))){ops.push({type:'clip_move',id:clips[0]?.id,to:/start|beginning|front/.test(m[1])?'start':'end',summary:`Moved “${clips[0]?.name}” to the ${/start|beginning|front/.test(m[1])?'start':'end'}`});done.add('clipop')}
 // trims by edge
 const sec='(\\d+(?:[.,]\\d+)?)\\s*(?:s|sec|secs|seconds?)\\b';
 if((m=new RegExp(`\\b(?:cut|remove|trim|delete|chop|drop|lose)(?: off)?(?: the)? first ${sec}`).exec(lower))){clipOp({trimStart:num(m[1])},`Cut the first ${num(m[1])}s`);done.add('trim')}
 else if((m=new RegExp(`\\b(?:cut|remove|trim|delete|chop|drop|lose)(?: off)?(?: the)? last ${sec}`).exec(lower))){clipOp({trimEnd:num(m[1])},`Cut the last ${num(m[1])}s`);done.add('trim')}
 else if((m=new RegExp(`\\bkeep(?: only)?(?: the)? first ${sec}`).exec(lower))){clipOp({keepFirst:num(m[1])},`Kept the first ${num(m[1])}s`);done.add('trim')}
 else if((m=new RegExp(`\\bkeep(?: only)?(?: the)? last ${sec}`).exec(lower))){clipOp({keepLast:num(m[1])},`Kept the last ${num(m[1])}s`);done.add('trim')}
 // text styling
 const addsNewText=/\b(add|insert|create|write|put|new)\b/.test(lower)&&(()=>{const after=textAfter(R,/\b(?:captions?|subtitles?|subs|titles?|headlines?|headings?|text)\b/i);if(!after)return false;const core=splitStyleTail(after).text.replace(/^(?:to|on|for|of)\b.*$/i,'').trim();return core.length>0&&!/^(?:bigger|smaller|larger|bold|bolder)$/i.test(core)})();
 if(textNoun&&state.texts.length&&!addsNewText){const isCap=/\b(captions?|subtitles?)\b/.test(lower),isTit=/\b(titles?|headlines?)\b/.test(lower);let ids=(isCap&&!isTit?state.texts.filter(t=>t.kind==='caption'):isTit&&!isCap?state.texts.filter(t=>t.kind!=='caption'):state.texts).map(t=>t.id);
  if(/\b(this|that|selected|it)\b/.test(lower)&&state.selectedTextId&&state.texts.some(t=>t.id===state.selectedTextId))ids=[state.selectedTextId];const tset={},tmul={},lab=[];
  {const st=parseTextStyle(lower.replace(/\b(bigger|smaller|larger|bold|bolder|big|small|large)\b/g,''));if(st.color&&!/\b(bg|background|box)\b/.test(lower.split(/\b(?:with|on)\b/)[0]||'')){tset.color=st.color;lab.push('Colour '+Object.keys(TEXT_COLORS).find(k=>TEXT_COLORS[k]===st.color))}if(st.bgColor){tset.bg='box';tset.bgColor=st.bgColor;lab.push('Box colour')}
   const pm=/\b(?:to|at|on)(?: the)? (top|bottom|middle|center|centre)\b/.exec(lower);if(pm&&/\b(move|put|place|position|shift|to the|at the)\b/.test(lower)){tset.position=pm[1]==='top'?'top':pm[1]==='bottom'?'bottom':'center';tset._clearXY=true;lab.push('Moved to '+tset.position)}}
  if((m=/\b(?:font|text|caption|title)?\s*size\b[^0-9]{0,8}(\d{2,3})/.exec(lower))){tset.fontSize=clamp(num(m[1]),12,100);lab.push(`Size ${tset.fontSize}`)}else if(/\b(bigger|larger|increase (?:the )?size|enlarge)\b/.test(lower)){tmul.fontSize=1+amt(.25);lab.push('Bigger text')}else if(/\b(smaller|decrease (?:the )?size|shrink)\b/.test(lower)){tmul.fontSize=1/(1+amt(.25));lab.push('Smaller text')}
  if(/\b(not bold|unbold|regular weight|normal weight|thinner|lighter weight)\b/.test(lower)){tset.fontWeight=500;lab.push('Regular weight')}else if(/\b(bold|bolder|heavier|thicker)\b/.test(lower)){tset.fontWeight=800;lab.push('Bold')}
  if(/\b(remove|no|without)(?: the)? (?:background|box|highlight)\b/.test(lower)){tset.bg='none';lab.push('No background box')}else if(/\b(background|box|highlight|backdrop)\b/.test(lower)&&/\b(add|with|put|give|use)\b/.test(lower)){tset.bg='box';lab.push('Background box')}
  if(/\b(no|remove|without|stop)(?: the)? animations?\b/.test(lower)){tset.anim='none';lab.push('No animation')}else if(/\bslide(?: in| up)?\b/.test(lower)){tset.anim='slide';lab.push('Slide in')}else if(/\bfade (?:in )?(?:the )?(?:text|captions?|titles?)\b|\b(?:text|captions?|titles?) fade\b/.test(lower)){tset.anim='fade';lab.push('Fade in')}
  if(lab.length&&ids.length){ops.push({type:'texts_set',ids,set:tset,mul:tmul,summary:`${lab.join(', ')} · ${ids.length} text layer${ids.length===1?'':'s'}`});done.add('textstyle')}}
 // time ranges: "from 2s to 4s", "between 0:02 and 0:05", "for the first/last 3 seconds" → split there and edit only that part
 const T='(\\d+(?::\\d{1,2})?(?:[.,]\\d+)?)\\s*(?:s|sec|secs|seconds?)?';let rg=null;
 if((m=new RegExp(`\\b(?:from|between|out|cut|remove|delete|drop)\\s+${T}\\s*(?:to|and|until|till|-|–)\\s*${T}`).exec(lower))){const x=toSec(m[1].replace(',','.')),y=toSec(m[2].replace(',','.'));if(y>x)rg=[x,y]}
 else if((m=/\b(?:for|in|during) the (first|last) (\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?)\b/.exec(lower))){const n=num(m[2]),tot=totalDuration();rg=m[1]==='first'?[0,Math.min(n,tot)]:[Math.max(0,tot-n),tot]}
 if(rg&&!textNoun){done.add('range');const tot=totalDuration();rg=[clamp(rg[0],0,tot),clamp(rg[1],0,tot)];
  if(/\b(cut out|remove|delete|drop|lose|chop out|get rid of)\b/.test(lower)&&!/\bfades?\b/.test(lower)){for(let k=ops.length-1;k>=0;k--)if(ops[k].type==='clip_delete'||ops[k].type==='clip_set'&&(ops[k].set.trimStart||ops[k].set.trimEnd))ops.splice(k,1);ops.push({type:'range_delete',a:rg[0],b:rg[1],summary:`Cut out ${fmt(rg[0])}–${fmt(rg[1])}`});done.add('trim')}
  else for(const o of ops)if(o.type==='clip_set'&&!o.set.trimStart&&!o.set.trimEnd&&!o.set.keepFirst&&!o.set.keepLast){o.type='range_set';o.a=rg[0];o.b=rg[1];o.summary+=` (${fmt(rg[0])}–${fmt(rg[1])})`;o.who=''}}
 // split at a time: "split at 3s"
 if((m=/\bsplit(?: (?:it|the clip|the video))?(?: at)? (\d+(?::\d{1,2})?(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?)?\b/.exec(lower))){ops.push({type:'split_clip',at:clamp(toSec(m[1].replace(',','.')),0,totalDuration()),summary:`Split at ${m[1]}s`});done.add('split')}
 return {ops,done}}
/* Inline text styling in a prompt: "… with red text and black bg", "… in bold at the top", "… on a white background". */
const TEXT_COLORS={red:'#ff4d4d',black:'#111111',white:'#ffffff',yellow:'#ffe074',gold:'#ffd166',golden:'#ffd166',orange:'#ffa04d',pink:'#ff9ad3',purple:'#bb9bff',violet:'#bb9bff',green:'#7ee08f',blue:'#6fa8ff',navy:'#22325c',cyan:'#7fe3ff',teal:'#3fbfb0',grey:'#b5b5b5',gray:'#b5b5b5',brown:'#8b5a2b',beige:'#e8dcc4',cream:'#f5ecd7'};
const COLOR_RE=Object.keys(TEXT_COLORS).join('|'),STYLE_NOUN='text|font|letters|words|writing|colou?red|colou?r|bg|background|box|backdrop|highlight|outline';
const STYLE_START=new RegExp(`(?:\\s*,\\s*(?:and\\s+)?(?=(?:${COLOR_RE}|bold|bolder|big|bigger|large|small|smaller|no background|without)\\b)|\\s+)(?:(?:(?:with|in|on|using|and|having|plus|but)\\s+(?:an?\\s+|the\\s+|some\\s+)?(?:${COLOR_RE}|bold|bolder|big|bigger|large|larger|huge|small|smaller|tiny|no|without|bg|background|box|backdrop|highlight|outline)\\b)|(?:(?:${COLOR_RE})\\s+(?:${STYLE_NOUN})\\b)|(?:(?:at|on|in|to)\\s+the\\s+(?:top|bottom|center|centre|middle)\\b)|(?<=,\\s*(?:and\\s+)?)(?:${COLOR_RE}|bold|bolder|big|bigger|large|small|smaller|no background|without)\\b)`,'i');
function splitStyleTail(text){const m=STYLE_START.exec(text);if(!m||m.index===0)return {text:text.trim(),tail:''};return {text:text.slice(0,m.index).replace(/[\s,]+$/,'').trim(),tail:text.slice(m.index).trim()}}
function parseTextStyle(str){const s=' '+String(str||'').toLowerCase()+' ',st={};let m;
 // background colour: "black bg", "on a white background", "with a red box", "background black"
 if((m=new RegExp(`\\b(${COLOR_RE})\\s+(?:bg|background|box|backdrop|highlight)\\b`).exec(s))||(m=new RegExp(`\\b(?:bg|background|box|backdrop|highlight)(?:\\s+colou?r)?\\s+(?:is\\s+|of\\s+|in\\s+)?(${COLOR_RE})\\b`).exec(s))){st.bgColor=TEXT_COLORS[m[1]];st.bg='box'}
 else if(/\b(?:no|without|remove(?: the)?)\s+(?:bg|background|box|backdrop|highlight)\b/.test(s))st.bg='none';
 else if(/\b(?:with|add|on)\s+(?:an?\s+|the\s+)?(?:bg|background|box|backdrop|highlight)\b/.test(s))st.bg='box';
 // text colour: "red text", "text in red", "in red", "red coloured", "colour red" (never the background colour)
 const bgWord=m&&st.bgColor?m[1]:null;let tc=null;
 for(const re of [new RegExp(`\\b(${COLOR_RE})\\s+(?:text|font|letters|words|writing|colou?red)\\b`),new RegExp(`\\b(?:text|font|letters|words|writing)(?:\\s+colou?r)?\\s+(?:in\\s+|is\\s+|to\\s+)?(${COLOR_RE})\\b`),new RegExp(`\\b(?:in|colou?r)\\s+(${COLOR_RE})\\b(?!\\s+(?:bg|background|box|backdrop|highlight))`)]){const mm=re.exec(s);if(mm&&mm[1]!==bgWord){tc=mm[1];break}}
 if(!tc){const any=new RegExp(`\\b(${COLOR_RE})\\b`,'g');let mm;while((mm=any.exec(s))){if(mm[1]!==bgWord&&!new RegExp(`^\\s+(?:bg|background|box|backdrop|highlight)`).test(s.slice(mm.index+mm[1].length))){tc=mm[1];break}}}
 if(tc)st.color=TEXT_COLORS[tc];
 if(/\b(not bold|regular|normal weight|thin)\b/.test(s))st.fontWeight=500;else if(/\b(bold|bolder|heavy|thick)\b/.test(s))st.fontWeight=800;
 if(/\b(huge|very big|very large|extra large)\b/.test(s))st.sizeMul=1.6;else if(/\b(big|bigger|large|larger)\b/.test(s))st.sizeMul=1.3;else if(/\b(tiny|very small)\b/.test(s))st.sizeMul=.7;else if(/\b(small|smaller)\b/.test(s))st.sizeMul=.85;
 st.position=/\bbottom\b/.test(s)?'bottom':/\btop\b/.test(s)?'top':/\b(center|centre|middle)\b/.test(s)?'center':undefined;return st}
const TIME_RE=/\s*(?:,\s*)?\b(?:(?:starting |start(?:ing)? )?(?:at|from)\s+(\d+(?::\d{1,2})?(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)?(?:\s+(?:to|until|till|-)\s+(\d+(?::\d{1,2})?(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)?)?|for\s+(\d+(?:\.\d+)?)\s*(?:s|sec|secs|seconds?)\b)/gi;
const toSec=v=>{if(v==null)return null;const p=String(v).split(':');return p.length===2?+p[0]*60+ +p[1]:+v};
function pullTimes(raw){let at=null,until=null,dur=null;const text=raw.replace(TIME_RE,(m,a1,a2,d)=>{if(a1!=null){at=toSec(a1);if(a2!=null)until=toSec(a2)}if(d!=null)dur=+d;return ' '}).replace(/\s{2,}/g,' ').trim();if(at!=null&&until!=null&&until>at)dur=until-at;return {text,at,dur}}
/* ---------- Style recipes: one word → a coordinated set of edits ---------- */
const RECIPES=[
 [/\b(cinematic|movie|filmic|film like|like a film)\b/,'Cinematic','make it landscape, matte look on all clips, subtle vignette on all clips, add crossfades between clips, fade in and out on all clips'],
 [/\b(moody|dramatic|intense|dark and moody|gritty)\b/,'Moody','punchy look on all clips, fade in and out on all clips'],
 [/\b(dreamy|soft and dreamy|romantic|ethereal|aesthetic)\b/,'Dreamy','soft look on all clips, add crossfades between clips, fade in and out on all clips'],
 [/\b(energetic|hype|upbeat|exciting|high energy|punchy edit|tiktok style|reels style)\b/,'Energetic','vivid look on all clips, a bit faster on all clips, remove transitions'],
 [/\b(clean|professional|polished|corporate|minimal)\b/,'Clean','natural look on all clips, add crossfades between clips, fade in and out on all clips'],
 [/\b(retro|old school|vhs|throwback)\b/,'Retro','vintage look on all clips, fade in and out on all clips'],
];
function recipeFor(lower){if(/\b(captions?|titles?|text|subtitles?|remove|delete|add|trim|cut|speed|clips?|volume|zoom|music|undo|redo|seconds?)\b|\d/.test(lower)||lower.split(' ').length>9)return null;if(!/^(?:(?:please|pls|can you|could you|now|just) )*(?:make (?:it|this|the video|everything|my video)(?: look| feel)?(?: more)?|give (?:it|this|the video) (?:an? )?|turn (?:it|this) into (?:an? )?|go|style (?:it|this) |apply (?:an? )?)?\s*(?:more |very |super |a )?[a-z &-]+?(?: (?:look|vibe|feel|style|edit|mood|feeling|aesthetic))?(?: please)?$/.test(lower))return null;
 return RECIPES.find(([re])=>re.test(lower))||null}
/* ---------- Answers about the project (no edits) ---------- */
function answerQuestion(text){const t=text.toLowerCase().trim(),q=/\?$/.test(t)||/^(what|how|which|is|are|list|show|tell|help|do i|does|did|where|when|why)\b/.test(t);if(!q)return null;
 const total=totalDuration(),caps=state.texts.filter(x=>x.kind==='caption'),tits=state.texts.filter(x=>x.kind!=='caption'),c=selectedClip()||timelineAt()?.clip;
 if(/^(help|what can you do|what do you do|commands|how do i use|how does this work|what can i (say|ask|do))/.test(t))return {text:'I can edit with plain words: aspect ratio (“make it vertical”), captions and titles (“add caption Hello in red text with black bg”, “change the caption to …”, “remove the last caption”), speed (“2x speed”, “slow motion”), volume, looks (“black and white”, “cinematic”), brightness/contrast, fades, zoom, crossfades, trims (“cut the first 2 seconds”, “make it 15 seconds long”), and clip order. You can chain steps with “then”, and say “undo”, “again” or “too much”.',suggest:['make it cinematic','add caption Hello there','make it 15 seconds long']};
 if(/\b(how long|duration|length|how many seconds|runtime|run time)\b/.test(t))return {text:total?`Your video is ${fmt(total)} long (${total.toFixed(1)}s) across ${state.clips.length} clip${state.clips.length===1?'':'s'}.`:'There’s no footage yet, so the video is 0 seconds long.',suggest:total>5?[`make it ${Math.max(3,Math.round(total*.6))} seconds long`]:null};
 if(/\b(aspect|ratio|orientation|format|vertical or|landscape or|portrait or|what size)\b/.test(t)){const [w,h]=ratioDims[state.aspect]||[];return {text:`The canvas is ${state.aspect}${w?` (${w}×${h})`:''} — ${state.aspect==='9:16'?'vertical, good for Reels, TikTok and Shorts':state.aspect==='16:9'?'landscape, good for YouTube':state.aspect==='1:1'?'square':'portrait feed'}.`,suggest:[state.aspect==='9:16'?'make it landscape':'make it vertical']}}
 if(/\b(captions?|subtitles?|titles?|text)\b/.test(t)&&/\b(how many|list|which|what|show)\b/.test(t)){if(!state.texts.length)return {text:'There’s no text on the video yet.',suggest:['add caption Hello there']};
  return {text:`${caps.length} caption${caps.length===1?'':'s'} and ${tits.length} title${tits.length===1?'':'s'}:\n${state.texts.slice().sort((x,y)=>x.start-y.start).slice(0,8).map(x=>`• ${fmt(x.start)} ${x.kind==='caption'?'caption':'title'} “${x.text.slice(0,40)}”`).join('\n')}${state.texts.length>8?`\n…and ${state.texts.length-8} more`:''}`}}
 if(/\bhow many (clips|shots|scenes)\b/.test(t))return {text:`${state.clips.length} clip${state.clips.length===1?'':'s'}: ${state.clips.slice(0,6).map((x,i)=>`${i+1}. ${x.name} (${clipDuration(x).toFixed(1)}s)`).join(', ')}.`};
 if(/\b(what (did you|have you|has been) (do|done|change|changed|edit|edited)|what changed|recent edits|edit history|history)\b/.test(t)){const ls=(state.historyLabels||[]).slice(-6).reverse();return {text:ls.length?`Recent edits (newest first):\n${ls.map(l=>`• ${l}`).join('\n')}`:'No edits yet in this session.',suggest:ls.length?['undo']:null}}
 if(c&&/\b(speed|how fast)\b/.test(t))return {text:`“${c.name}” plays at ${c.speed||1}×.`};
 if(c&&/\b(muted|volume|sound|audio)\b/.test(t))return {text:`“${c.name}” volume is ${Math.round((c.volume??1)*100)}%${(c.volume??1)===0?' (muted)':''}.`};
 return null}
function guessPrompt(lower){const has=w=>new RegExp(`\\b${w}`).test(lower);
 if(has('vert')||has('port')||has('tal')||has('phone')||has('reel')||has('tik'))return 'make it vertical';if(has('land')||has('wide')||has('hori'))return 'make it landscape';if(has('squ'))return 'make it square';
 if(has('tit')||has('text')||has('word')||has('name'))return 'add a title saying Launch day';if(has('capt')||has('sub'))return 'add captions';
 if(has('fast')||has('quick')||has('speed'))return 'speed it up';if(has('slow'))return 'slow it down';if(has('short')||has('trim')||has('cut')||has('long'))return 'trim the opening to 3 seconds';
 if(has('sound')||has('audio')||has('loud')||has('volume'))return 'mute the clip';return null}
function localPlan(prompt,depth=0){if(depth===0){const rc=recipeFor(prompt.trim().toLowerCase());if(rc){const r=localPlan(rc[2],1);if(r.ops.length)return {...r,message:`${rc[1]} recipe: ${r.message.replace(/^Done: /,'')}`}}}const norm=normalizePrompt(prompt.trim());let s=norm.text,lower=s.toLowerCase();const ops=[];
 if(state.lastTouched==='text'&&state.selectedTextId&&/\b(it|that|this|them)\b/.test(lower)&&!/\b(text|texts|captions?|subtitles?|titles?|font|clips?|video|music|vertical|landscape|square|portrait|look|filter|vintage|vivid|mono|monochrome|matte|punchy|soft|natural)\b|black and white|b ?& ?w|\b(?:from|between)\s+\d|\bthe (?:first|last) \d/.test(lower)&&new RegExp(`\\b(bigger|smaller|larger|bold|bolder|regular|box|background|highlight|top|bottom|middle|center|centre|slide|${COLOR_RE})\\b`).test(lower)){s+=' (this text)';lower+=' this text'}
 {const ed=state.texts.length?planTextEdit(prompt,lower):null;if(ed){if(ed.op)return {ops:[ed.op],message:`${ed.op.summary}. Say “undo” to go back.`};return {ops:[],message:ed.message,suggest:ed.suggest||null}}}const quoted=s.match(/["“'‘]([^"”'’]+)["”'’]/);const extracted=quoted?.[1];
 if(/\b(vertical|portrait|reels?|tiktok|shorts?|9[:x]16)\b/i.test(s))ops.push({type:'set_aspect',value:'9:16'});
 else if(/\b(wide|landscape|cinematic|youtube|16[:x]9)\b/i.test(s))ops.push({type:'set_aspect',value:'16:9'});
 else if(/\b(square|1[:x]1)\b/i.test(s))ops.push({type:'set_aspect',value:'1:1'});
 else if(/\b(4[:x]5|instagram post)\b/i.test(s))ops.push({type:'set_aspect',value:'4:5'});
 const cmd=planCommands(prompt,lower);ops.push(...cmd.ops);
 // style words in the same sentence apply to the new text only (not every layer)
 const styleColor=Object.entries({yellow:'#ffe074',white:'#ffffff',pink:'#ff9ad3',purple:'#bb9bff',green:'#a0f0b9',blue:'#89b7ff',red:'#ff8585'}).find(([k])=>new RegExp(`\\b${k}\\b`).test(lower))?.[1];
 const stylePos=/\bbottom\b/.test(lower)?'bottom':/\btop\b/.test(lower)?'top':/\b(center|centre)\b/.test(lower)?'center':null;let addedText=false;
 const tm=/\b(captions?|subtitles?|subs|titles?|headlines?|text)\b/i.test(prompt)&&/\b(add|insert|put|create|write)\b/i.test(prompt)?pullTimes(prompt.trim()):{text:prompt.trim(),at:null,dur:null},raw=tm.text,removing=/\b(remove|delete|hide|clear)\b/i.test(s),removeTextPlan=removing?planTextRemoval(raw,lower):null;if(removeTextPlan)addedText=true;
 if(/\b(captions?|subtitles?)\b/i.test(s)&&!removing&&!cmd.done.has('textstyle')){
  const typoKeys=norm.fixes.filter(([,b])=>/^(caption|subtitle)/.test(b)).map(([w])=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),capRe=new RegExp(`\\b(?:captions?|subtitles?|subs|cc${typoKeys.length?'|'+typoKeys.join('|'):''})\\b`,'i');
  let words=extracted||textAfter(raw,capRe);
  const capSplit=words?splitStyleTail(words):null,capPrefix=raw.slice(0,Math.max(0,capRe.exec(raw)?.index??0)),capStyle=parseTextStyle(capPrefix+' '+(capSplit?.tail||'')+' '+(extracted?raw.replace(extracted,''):''));if(capSplit)words=capSplit.text||words;
  if(words){let start=state.playhead>=totalDuration()-.5?0:state.playhead;if(tm.at!=null)start=clamp(tm.at,0,Math.max(0,totalDuration()-.3));else for(let g=0;g<50;g++){const hit=state.texts.find(t=>t.kind==='caption'&&start>=t.start-.01&&start<t.start+t.duration-.05);if(!hit)break;start=t2(hit.start+hit.duration)}if(start>=totalDuration()-.3)start=state.playhead>=totalDuration()-.5?0:state.playhead; // next free caption slot, so captions follow each other instead of stacking
 const chunks=captionChunks(words,start);if(tm.dur&&chunks.length===1)chunks[0].duration=clamp(tm.dur,.3,Math.max(.3,totalDuration()-start));for(const ch of chunks)ops.push({type:'add_text',kind:'caption',text:ch.text,start:ch.start,duration:ch.duration,position:capStyle.position||stylePos||'bottom',color:capStyle.color||styleColor,bg:capStyle.bg,bgColor:capStyle.bgColor,fontWeight:capStyle.fontWeight,sizeMul:capStyle.sizeMul});addedText=true}
  else if(state.script.trim())ops.push({type:'generate_script_captions'});
  else return {ops:[],message:'What should the captions say? Type the words after “add captions”, and long text is split into timed captions automatically.',suggest:['add captions: Welcome to my channel','add caption Thanks for watching at the bottom']};
 }
 if(!addedText&&!cmd.done.has('textstyle')&&/\b(add|insert|put|create|write)\b/i.test(s)&&/\b(title|text|headline|overlay|hook)\b/i.test(s)){
  const after=extracted||textAfter(raw,/\b(?:saying|says|reads?|called|that says)\b/i)||textAfter(raw,/\b(?:title|headline|heading|hook|overlay|tittle|text)\b/i);
  const tSplit=after?splitStyleTail(after):{text:'',tail:''},tPrefix=raw.slice(0,Math.max(0,/\b(?:title|headline|heading|hook|overlay|tittle|text)\b/i.exec(raw)?.index??0)),tStyle=parseTextStyle(tPrefix+' '+tSplit.tail+' '+(extracted?raw.replace(extracted,''):''));
  ops.push({type:'add_text',text:tSplit.text||after||'Create something remarkable.',start:tm.at!=null?clamp(tm.at,0,Math.max(0,totalDuration()-.3)):state.playhead,duration:Math.min(tm.dur||4,totalDuration()),kind:'title',position:tStyle.position||stylePos||undefined,color:tStyle.color||styleColor,bg:tStyle.bg,bgColor:tStyle.bgColor,fontWeight:tStyle.fontWeight,sizeMul:tStyle.sizeMul});addedText=true;
 }
 if(!addedText&&!cmd.done.has('textstyle')&&/\b(yellow|white|pink|purple|green|blue|red)\b/i.test(s)&&/\b(text|caption|title|font)\b/i.test(s)){
  const color=Object.entries({yellow:'#ffe074',white:'#ffffff',pink:'#ff9ad3',purple:'#bb9bff',green:'#a0f0b9',blue:'#89b7ff',red:'#ff8585'}).find(([k])=>new RegExp(`\\b${k}\\b`).test(lower))?.[1];if(color)ops.push({type:'set_text_color',value:color});
 }
 if(!addedText&&!cmd.done.has('textstyle')&&/\b(bottom|top|center|centre)\b/i.test(s)&&/\b(text|caption|title|move|position)\b/i.test(s)){const pos=/bottom/.test(lower)?'bottom':/top/.test(lower)?'top':'center';ops.push({type:'set_text_position',value:pos})}
 const trim=!cmd.done.has('trim')&&!cmd.done.has('range')&&!cmd.done.has('fade')&&!cmd.done.has('xfade')&&s.match(/(?:trim|cut|shorten|make)\b.{0,38}?(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s\b)/i);if(trim)ops.push({type:'trim_clip',duration:Number(trim[1]),clipId:/first|opening|intro/.test(lower)?state.clips[0]?.id:state.selectedClipId});
 if(!cmd.done.has('split')&&/\b(split)\b/i.test(s))ops.push({type:'split_clip',at:state.playhead});
 if(!cmd.done.has('speed')&&/\b(speed up|faster|double speed)\b/i.test(s))ops.push({type:'set_speed',value:/double/.test(lower)?2:1.5});
 if(!cmd.done.has('speed')&&/\b(slow down|slower|half speed|slow motion)\b/i.test(s))ops.push({type:'set_speed',value:.5});
 if(!cmd.done.has('volume')&&/\b(mute|remove (the )?sound)\b/i.test(s)&&!/\bunmute\b/i.test(s))ops.push({type:'set_volume',value:0});
 if(/\b(remove|delete)\b.*\b(music|soundtrack|background audio)\b/i.test(s))ops.push({type:'remove_music'});
 if(removeTextPlan){if(removeTextPlan.op)ops.push(removeTextPlan.op);else return {ops:[],message:removeTextPlan.message,suggest:removeTextPlan.suggest}}
 const hasCaptions=ops.some(x=>x.type==='generate_script_captions');if(hasCaptions&&!state.script.trim())return {ops:[],message:'Paste a script in Typography first, then I can turn it into timed captions.'};
 const readAs=norm.fixes.length?` (I read ${norm.fixes.slice(0,3).map(([w,b])=>`“${w}” as “${b}”`).join(', ')}.)`:'';
 if(!ops.length&&depth===0){const guess=guessPrompt(lower);if(guess){const g=localPlan(guess,1);if(g.ops.length)return {ops:g.ops,message:`I read “${prompt.trim()}” as “${guess}”. ${g.message}`,guessed:guess}}}
 if(!ops.length){const guess=guessPrompt(lower);return {ops:[],message:guess?`I’m not sure what to change there.${readAs} Did you mean this?`:'I couldn’t match that to an edit yet. Tap one of these to start, or describe the change in your own words.',suggest:guess?[guess]:['make it vertical','add a title saying Launch day','speed it up']}}
 if(ops.length&&ops.every(o=>o.summary&&/^(clip_set|music_set|clip_xfade|clip_delete|clip_duplicate|clip_move|texts_set|fit_total|range_set|range_delete|split_clip)$/.test(o.type))){const whos=[...new Set(ops.map(o=>o.who).filter(Boolean))];return {ops,message:`Done: ${ops.map(o=>o.summary).join(' · ')}${whos.length===1?` on ${whos[0]}`:''}.${readAs} Say “undo” to go back.`}}
 if(ops.length===1&&ops[0].type==='remove_texts')return {ops,message:`${ops[0].summary}.${readAs} Say “undo” if you want ${ops[0].ids.length===1?'it':'them'} back.`};
 const caps=ops.filter(o=>o.type==='add_text'&&o.kind==='caption');if(caps.length&&caps.length===ops.length)return {ops,message:`Added ${caps.length} caption${caps.length===1?'':'s'} from ${fmt(caps[0].start)}${caps.length>1?`, timed across ${fmt(caps.at(-1).start+caps.at(-1).duration-caps[0].start)}`:''}.${readAs} Tap a caption on the timeline to edit its words or timing.`};
 return {ops,message:`Done: ${ops.map(o=>opLabel(o)[1]).slice(0,4).join(' · ')}${ops.length>4?` +${ops.length-4} more`:''}.${readAs} Say “undo” to go back.`}
}
function splitSteps(prompt){const quoted=[];let t=prompt.replace(/["“‘][^"”’]*["”’]/g,m=>{quoted.push(m);return `\u0000${quoted.length-1}\u0000`});
 const verbs='add|make|remove|delete|change|set|mute|unmute|speed|slow|trim|cut|zoom|fade|crop|flip|mirror|duplicate|move|put|turn|replace|rename|apply|give|use|keep';
 const parts=t.split(new RegExp(`\\s*(?:;|\\n+|,?\\s+(?:and\\s+)?then\\s+|,?\\s+after that\\s+|,?\\s+also\\s+|,?\\s+and\\s+(?=(?:${verbs})\\b)|,\\s+(?=(?:${verbs})\\b))\\s*`,'i')).map(x=>x.replace(/\u0000(\d+)\u0000/g,(m,i)=>quoted[+i]).trim()).filter(Boolean);
 return parts.length>1&&parts.length<=6?parts:[prompt]}
const FOOTAGE_INTENT=/\b(?:remove|cut|delete|trim|drop|skip|get rid of)\b[^.]{0,30}\b(?:silences?|silent parts?|quiet (?:parts?|bits?|gaps?)|pauses?|dead air|gaps?|ums?)\b|\b(?:tighten (?:the|my) edit|jump ?cuts?|scene (?:cuts?|changes?|detection)|split (?:it )?(?:at|on|by|into) (?:the )?scenes?|cut (?:it )?(?:at|on) (?:the )?scenes?|highlights?(?: reel)?|best (?:moments|parts|bits)|recap|beat (?:cuts?|sync)|cut (?:to|on) the (?:beat|music)|sync (?:to|with) the (?:beat|music)|transcri\w*|auto[- ]?captions?|automatic captions?|captions? (?:from|for) (?:the )?(?:speech|audio|voice|dialogue|what (?:i|they) say)|caption (?:the|my) (?:video|speech|voice)|generate (?:the )?captions?|subtitles? (?:from|for) (?:the )?(?:speech|audio)|analy[sz]e (?:the |my )?(?:footage|video|clips?))\b/i;
async function sendPrompt(message){
 const prompt=(message??$('#chatInput')?.value??'').trim();if(!prompt||state.aiBusy||state.serverBusy)return;
 if(message===undefined&&state.editingMsg!=null){const i=state.editingMsg;state.chatDraft=state.draftBeforeEdit||'';state.draftBeforeEdit='';return resendEditedPrompt(i,prompt)}
 if(message===undefined)state.chatDraft='';
 state.messages.push({role:'user',text:prompt});
 const hi=historyIntent(prompt)||historyIntent(normalizePrompt(prompt).text);if(hi){runHistoryIntent(hi.kind,hi.n,hi.loose);return}
 {const ans=answerQuestion(prompt);if(ans){state.messages.push({role:'agent',text:ans.text,suggest:ans.suggest||null,info:true});renderRightPanel();return}}
 const fu=followUpPrompt(prompt);
 if(fu?.undo){const labels=stepHistory('undo',1);state.messages.push({role:'agent',text:labels.length?`Undid “${labels[0]}”. Want a gentler version?`:'There’s nothing to tone down yet.',suggest:labels.length&&state.lastDirectorPrompt?[`slightly ${state.lastDirectorPrompt}`]:null});renderRightPanel();return}
 state.aiBusy=true;state.aiStatus='Reading your prompt…';renderRightPanel();
 const setStatus=t=>{state.aiStatus=t;const el=$('.dr-think-text');if(el)el.textContent=t};
 {const stepsN=splitSteps(prompt).length,wait=Math.min(950,420+prompt.length*6+(stepsN-1)*160);setTimeout(()=>{if(state.aiBusy)setStatus(stepsN>1?`Planning ${stepsN} steps…`:'Planning your edit…')},Math.round(wait*.35));setTimeout(()=>{if(state.aiBusy)setStatus('Applying to your timeline…')},Math.round(wait*.7));await new Promise(r=>setTimeout(r,wait))}
 try{
  /* Routing: the local Director handles everyday edits in both modes (instant, undoable, works offline).
     Signed in, footage-analysis edits (quiet gaps, scenes, beats, highlights, speech captions) and anything local can't match go to the server. */
  const cloud=!!window.ReplotreCloud?.isConnected?.();
  const runCloud=async()=>{setStatus(FOOTAGE_INTENT.test(prompt)?'Analyzing your footage…':'Asking the AI planner…');await window.ReplotreIntelligence?.preparePrompt?.(prompt);setStatus('Applying to your timeline…');const result=await window.ReplotreCloud.direct({prompt});state.messages.push({role:'agent',text:result.message,ops:Array.isArray(result.operations)&&result.changed?result.operations:undefined})};
  if(cloud&&!fu&&FOOTAGE_INTENT.test(prompt)){await runCloud()}else{
   const steps=fu?.prompt?[fu.prompt]:splitSteps(prompt);
   if(steps.length>1){checkpoint(prompt.length>48?prompt.slice(0,46)+'…':prompt);takeOverride();createdIds=[];const allOps=[],lines=[];let touched=null;
    const scopeRe=/\b(all(?: the| of the)? clips|every clip|each clip|the whole video|(?:first|second|third|last) clip|clip \d+)\b/i;let scope=null;
    for(let st of steps){const sm=scopeRe.exec(st);if(sm)scope=sm[1];else if(scope&&!/\b(text|captions?|titles?|it|this|that)\b/i.test(st))st=`${st} on ${scope}`;const pl=localPlan(st);if(pl.ops.length&&executeOps(pl.ops)){allOps.push(...pl.ops);lines.push(`✓ ${st}`);touched=pl.ops.some(o=>/text/.test(o.type))?'text':'clip';state.lastTouched=touched;refreshAll()}else lines.push(`✗ ${st}: ${pl.message.replace(/\s*Say “undo”.*$/,'')}`)}
    if(allOps.length){state.playhead=clamp(state.playhead,0,totalDuration());queueSave();refreshAll();syncMedia(true);state.messages.push({role:'agent',text:`Did ${allOps.length} edit${allOps.length===1?'':'s'} in ${steps.length} steps:\n${lines.join('\n')}\nSay “undo” to reverse all of it at once.`,ops:allOps,undoLen:state.history.length,undoSeq:state.histSeq,created:createdIds});createdIds=null;state.lastDirectorPrompt=steps.at(-1)}
    else{state.history.pop();state.historyLabels?.pop();state.histSeq--;updateHistoryButtons();if(cloud){await runCloud();return}state.messages.push({role:'agent',text:`I couldn’t apply any of those steps:\n${lines.join('\n')}`,error:true})}
    return}
   const plan=localPlan(fu?.prompt||prompt);if(fu?.prompt&&plan.ops.length)plan.message=(fu.why==='scope'?'Same edit, wider: ':'Again: ')+plan.message.replace(/^Done: /,'');const label=fu?.prompt||prompt;
   if(plan.ops.length){checkpoint(label.length>48?label.slice(0,46)+'…':label);const pre=takeOverride();createdIds=[];const applied=executeOps(plan.ops)||pre;const made=createdIds;createdIds=null;if(applied&&plan.ops.some(o=>o.type==='fit_total'))plan.message=`Done: ${plan.ops.map(o=>o.summary||opLabel(o)[1]).join(' · ')}. Say “undo” to go back.`;if(applied){state.playhead=clamp(state.playhead,0,totalDuration());queueSave();refreshAll();syncMedia(true);state.messages.push({role:'agent',text:plan.message,ops:plan.ops,undoLen:state.history.length,undoSeq:state.histSeq,created:made});state.lastTouched=plan.ops.some(o=>/text/.test(o.type))?'text':plan.ops.some(o=>/^(clip|set_speed|set_volume|trim|split)/.test(o.type))?'clip':state.lastTouched;state.lastDirectorPrompt=(plan.guessed||fu?.prompt||prompt).replace(/^(?:(?:a bit|a little|slightly|much|way|a lot|even) )+/i,'').replace(/ on (?:all(?: (?:the|of the))? clips|every clip|each clip|the whole video|everything|(?:first|second|third|last) clip|clip \d+)$/i,'')}else{state.history.pop();state.historyLabels?.pop();state.histSeq--;updateHistoryButtons();state.messages.push({role:'agent',text:'I couldn’t apply that here. Select a clip or add footage, then try again.',error:true})}}
   else if(cloud){await runCloud()}
   else state.messages.push({role:'agent',text:plan.message,hint:true,suggest:plan.suggest});
  }
 }catch(e){state.messages.push({role:'agent',text:e.message||'Something went wrong applying that edit.',error:true})}finally{state.aiBusy=false;state.aiStatus='';renderRightPanel()}
}
function openModal(title,content,foot=''){const root=$('#modalRoot');root.innerHTML=`<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="modal-header"><h2>${escapeHTML(title)}</h2><button class="icon-button" data-action="close-modal" title="Close">${ico('x')}</button></div><div class="modal-content">${content}</div>${foot}</div></div>`}
function closeModal(){if(state.exporting)return;$('#modalRoot').innerHTML=''}
function exportRange(){const total=totalDuration(),has=state.markIn!=null||state.markOut!=null;if(!has||state.exportScope==='all')return {start:0,end:total,ranged:false};const a=clamp(state.markIn??0,0,total),b=clamp(state.markOut??total,0,total);return b-a>=.2?{start:a,end:b,ranged:true}:{start:0,end:total,ranged:false}}
function exportScopeMarkup(){const total=totalDuration(),has=state.markIn!=null||state.markOut!=null;if(!has)return '';const a=state.markIn??0,b=state.markOut??total,cur=exportRange().ranged?'range':'all';
 return `<div class="property-card-title" style="margin-top:18px">${ico('scissors')} What to export</div><div class="export-grid export-scope">${[['range','In/Out range',`${timecode(a)} → ${timecode(b)} · ${fmt(b-a)}`],['all','Entire timeline',`00:00 → ${fmt(total)}`]].map(([v,t,sub])=>`<button class="export-option ${cur===v?'active':''}" data-action="export-scope" data-value="${v}"><strong>${t}</strong><small>${sub}</small></button>`).join('')}</div>`}
function exportEstimate(){const r=exportRange(),d=Math.max(0,r.end-r.start),fmtX=state.exportFormat||'webm',res=state.exportResolution||720;
 const mbps={webm:{720:4,1080:7},mp4:{720:3.5,1080:6}}[fmtX][res],mb=mbps*d/8,[bw,bh]=ratioOutput[state.aspect]||ratioOutput['9:16'],k=res/720;
 return {d,size:mb<1?`${Math.max(.1,mb).toFixed(1)} MB`:`${Math.round(mb)} MB`,time:fmtX==='mp4'?`~${fmt(Math.max(5,d*.6))} on server`:`${fmt(d)} · real time`,dims:`${Math.round(bw*k)}×${Math.round(bh*k)}`}}
function refreshExportSummary(){const e=exportEstimate(),f=state.exportFormat||'webm',cloud=!!window.ReplotreCloud?.isConnected?.();
 const set=(id,v)=>{const el=document.querySelector(id);if(el)el.textContent=v};set('#exportDurationValue',fmt(e.d));set('#exportSizeValue',`~${e.size}`);set('#exportTimeValue',e.time);set('#exportDimsValue',`${e.dims} · 30 fps · ${f==='mp4'?'H.264 + AAC':'VP8/VP9 + Opus'}`);
 document.querySelectorAll('.ex-format').forEach(b=>{const on=b.dataset.value===f;b.classList.toggle('is-on',on);b.setAttribute('aria-checked',String(on))});
 document.querySelectorAll('.ex-res .export-option').forEach(b=>{const v=+b.dataset.value,mbps={webm:{720:4,1080:7},mp4:{720:3.5,1080:6}}[f][v],mb=mbps*e.d/8;const s=b.querySelector('.ex-size');if(s)s.textContent=`~${mb<1?Math.max(.1,mb).toFixed(1):Math.round(mb)} MB`});
 const btn=document.querySelector('#startExportBtn');if(btn&&!state.exporting){const needSignIn=f==='mp4'&&!cloud;btn.dataset.action=needSignIn?'cloud-signin':f==='mp4'?'cloud-mp4':'start-export';btn.innerHTML=`${ico(needSignIn?'cloud-upload':'download')} ${needSignIn?'Sign in to export MP4':f==='mp4'?'Export MP4':'Export WebM'}`}}
function openExport(){if(!state.clips.length)return toast('Add footage before exporting');const cloud=!!window.ReplotreCloud?.isConnected?.();state.exportResolution=state.exportResolution||720;state.exportScope='range';state.exportFormat=state.exportFormat||(cloud?'mp4':'webm');
 const first=state.clips[0],thumb=clipThumb(first),[aw,ah]=(state.aspect||'9:16').split(':').map(Number),total=totalDuration();
 const fmts=[['mp4','MP4','H.264 · plays everywhere',cloud?'Rendered on the server':'Needs sign-in'],['webm','WebM','Rendered in this browser','No account needed']];
 const res=[{v:720,title:'720p',sub:'HD · faster'},{v:1080,title:'1080p',sub:'Full HD · sharper'}];
 openModal('Export',`<div class="ex-summary"><span class="ex-thumb" style="aspect-ratio:${aw}/${ah}${thumb?`;background-image:url('${escapeHTML(thumb)}')`:''}"></span><div class="ex-sum-text"><strong>${escapeHTML(state.projectName||'Untitled project')}</strong><div class="ex-chips"><span>${state.aspect}</span><span>${fmt(total)}</span><span>${state.clips.length} clip${state.clips.length===1?'':'s'}</span>${state.texts.length?`<span>${state.texts.length} text layer${state.texts.length===1?'':'s'}</span>`:''}${state.music?'<span>Music</span>':''}</div></div></div>`+
  `<div class="ex-label">Format</div><div class="ex-formats" role="radiogroup" aria-label="Format">${fmts.map(([v,t,sub,note])=>`<button class="ex-format" role="radio" data-action="export-format" data-value="${v}"><strong>${t}</strong><small>${sub}</small><em class="${v==='mp4'&&!cloud?'is-warn':''}">${note}</em></button>`).join('')}</div>`+
  `<div class="ex-label">Quality</div><div class="export-grid ex-res">${res.map(o=>`<button class="export-option ${o.v===state.exportResolution?'active':''}" data-action="export-resolution" data-value="${o.v}"><strong>${o.title}</strong><small>${o.sub}</small><span class="ex-size"></span></button>`).join('')}</div>${exportScopeMarkup()}`+
  `<div class="ex-details"><div><span>Length</span><strong id="exportDurationValue"></strong></div><div><span>Estimated size</span><strong id="exportSizeValue"></strong></div><div><span>Render time</span><strong id="exportTimeValue"></strong></div><p id="exportDimsValue"></p></div>`+
  `<div id="exportProgressBlock" style="display:none"><p class="property-help" id="exportProgressLabel">Rendering…</p><div class="export-progress"><span id="exportProgressFill"></span></div></div>`,
  `<div class="export-footer ex-footer"><button class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" id="startExportBtn" data-action="start-export"></button></div>`);
 if(state.template){const n=document.createElement('p');n.className='tpl-export-note';n.textContent=`${state.template.name} motion layers render in WebM (browser export). MP4 includes the template grade and your text layers.`;document.querySelector('.ex-summary')?.after(n)}refreshExportSummary()}
async function initAudioRecording(){try{if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();audioDestination=audioCtx.createMediaStreamDestination();for(const element of [...videoElements,audioEl,xfAudio]){const src=audioCtx.createMediaElementSource(element);const gain=audioCtx.createGain();src.connect(gain);gain.connect(audioCtx.destination);gain.connect(audioDestination)}}await audioCtx.resume();return audioDestination.stream.getAudioTracks()}catch(e){console.warn('Audio stream setup failed',e);return []}}
async function startExport(){if(state.exporting)return;const type=['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm'].find(t=>window.MediaRecorder?.isTypeSupported(t));if(!type||!canvas.captureStream)return toast('Use a current Chromium browser for WebM export');const range=exportRange(),duration=range.end-range.start;if(duration<=0)return toast('No footage to export');pause();if(state.clips.some((c,i)=>xfadeFor(i))){const lbl=$('#exportProgressLabel');if(lbl){$('#exportProgressBlock').style.display='block';lbl.textContent='Preparing transitions…'}await waitForStills()}state.exporting=true;$('#startExportBtn').disabled=true;$('#startExportBtn').textContent='Rendering…';$('#exportProgressBlock').style.display='block';const [baseW,baseH]=ratioOutput[state.aspect]||ratioOutput['9:16'];const k=state.exportResolution/720;canvas.width=Math.round(baseW*k);canvas.height=Math.round(baseH*k);
 seek(range.start);const stream=canvas.captureStream(30);const soundTracks=await initAudioRecording();for(const track of soundTracks)stream.addTrack(track);const parts=[];let rec;try{rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:state.exportResolution===1080?6500000:3500000,audioBitsPerSecond:128000})}catch(e){state.exporting=false;stream.getTracks().forEach(track=>track.stop());toast('Unable to initialize your video recorder');updateCanvasSize();drawPreview();const button=$('#startExportBtn');if(button){button.disabled=false;button.textContent='Export WebM'}return}
 exportSession={rec,parts,stream,duration,start:range.start,end:range.end,ranged:range.ranged};rec.ondataavailable=e=>{if(e.data?.size>0)parts.push(e.data)};rec.onerror=e=>{console.error('Recorder error',e);toast('Video render failed');finishExport()};rec.onstop=()=>{const blob=new Blob(parts,{type:'video/webm'});if(blob.size){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${state.projectName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'replotre'}-${state.aspect.replace(':','x')}${exportSession?.ranged?`-${timecode(exportSession.start).replace(/:/g,'')}-${timecode(exportSession.end).replace(/:/g,'')}`:''}.webm`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Your WebM video is ready')}else toast('No video data was recorded');const back=exportSession?.start||0;stream.getTracks().forEach(tr=>tr.stop());exportSession=null;state.exporting=false;pause();$('#modalRoot').innerHTML='';updateCanvasSize();seek(back)};rec.start(250);state.exportStart=performance.now();play();
}
function finishExport(){if(!exportSession||exportSession.rec.state==='inactive')return;exportSession.rec.stop()}
function updateExportUI(){if(!state.exporting)return;const p=$('#exportProgressFill'),label=$('#exportProgressLabel');const a=exportSession?.start||0,d=Math.max(exportSession?.duration||totalDuration(),.1),done=clamp(state.playhead-a,0,d);if(p)p.style.width=`${Math.round(100*done/d)}%`;if(label)label.textContent=`Rendering ${fmt(done)} / ${fmt(d)}${exportSession?.ranged?' (in/out range)':''} — keep this tab active`}
function downloadProject(){const obj={app:'replotre',version:1,createdAt:new Date().toISOString(),project:JSON.parse(snapshot()),assets:state.media.map(({id,name,kind,duration})=>({id,name,kind,duration}))};const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='replotre-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Project JSON downloaded. Media files are not embedded.')}
async function openProject(file){if(window.ReplotreCloud?.isConnected?.()){toast('Use Cloud Projects to open a saved project. Sign out to import local JSON.');return}try{const obj=JSON.parse(await file.text());if(obj.app!=='replotre'||!obj.project||!Array.isArray(obj.project.clips))throw Error('Not a Replotre project');checkpoint();const mediaNeeded=obj.assets||[];const loaded=[];for(const m of mediaNeeded){const f=await getFile(m.id);if(f)loaded.push({...m,url:URL.createObjectURL(f)})}state.media=loaded;hydrate(obj.project);state.clips=state.clips.filter(c=>c.kind==='demo'||!c.mediaId||loaded.some(m=>m.id===c.mediaId));state.selectedClipId=state.clips[0]?.id||null;refreshAll();queueSave();toast(`Project opened${loaded.length<mediaNeeded.length?' (some media unavailable)':''}`)}catch(e){toast('Could not load project: '+e.message)}}
function trackInputChange(target){if(state.serverBusy)return;const change=target.dataset.change;if(!change)return;const value=target.value,t=selectedText(),c=selectedClip();if(change==='brand-font')state.brandFont=value;
 else if(change==='brand-color')state.brandColor=value;
 else if(change==='music-volume'&&state.music){state.music.volume=clamp(value/100,0,1);audioEl.volume=state.music.volume}
 else if(change==='text-content'&&t)t.text=value;
 else if(change==='text-color'&&t)t.color=value;
 else if(change==='text-size'&&t)t.fontSize=clamp(value,12,100);
 else if(change==='text-position'&&t){t.position=value;delete t.x;delete t.y}
 else if(change==='text-weight'&&t)t.fontWeight=clamp(value,300,900);
 else if(change==='text-start'&&t)t.start=clamp(value,0,totalDuration());
 else if(change==='text-duration'&&t)t.duration=clamp(value,.2,Math.max(.2,totalDuration()-t.start));
 else if(change==='text-end'&&t){const en=clamp(value,t.start+.2,Math.max(t.start+.2,totalDuration()));t.duration=+(en-t.start).toFixed(3)}
 else if(change==='clip-name'&&c)c.name=value;
 else if(change==='clip-speed'&&c){const old=c.speed||1;c.speed=clamp(value,.25,3);if(c.keys?.length)c.keys=c.keys.map(k=>({...k,t:+(k.t*old/c.speed).toFixed(4)}))}
 else if(change==='clip-volume'&&c)c.volume=clamp(value/100,0,1);
 else if(change==='clip-in'&&c){const old=c.in;c.in=clamp(value,0,c.out-.1);c.keys=shiftKeys(c.keys,(c.in-old)/(c.speed||1))}
 else if(change==='clip-out'&&c){const max=c.kind==='demo'?20:c.kind==='image'?60:(getMedia(c.mediaId)?.duration||3600);c.out=clamp(value,c.in+.1,max)}
 else if(change==='clip-brightness'&&c){c.brightness=clamp(value,50,150);c.look='custom'}
 else if(change==='clip-contrast'&&c){c.contrast=clamp(value,50,150);c.look='custom'}
 else if(change==='clip-fit'&&c)c.fit=value==='fit'?'fit':'fill';
 else if(change==='clip-zoom'&&c){const v=clamp(value/100,1,3);if(c.keys?.length){const l=clipLocalTime(c);if(l<-FRAME||l>clipDuration(c)+FRAME){toast('Move the playhead over this clip to keyframe it');return}setKeyAt(c,l,{zoom:v})}else c.zoom=v}
 else if(change==='clip-pan-x'&&c){const v=clamp(value/100,-1,1);if(c.keys?.length){const l=clipLocalTime(c);if(l<-FRAME||l>clipDuration(c)+FRAME){toast('Move the playhead over this clip to keyframe it');return}setKeyAt(c,l,{panX:v})}else c.panX=v}
 else if(change==='clip-pan-y'&&c){const v=clamp(value/100,-1,1);if(c.keys?.length){const l=clipLocalTime(c);if(l<-FRAME||l>clipDuration(c)+FRAME){toast('Move the playhead over this clip to keyframe it');return}setKeyAt(c,l,{panY:v})}else c.panY=v}
 else if(change==='clip-fade-in'&&c)c.fadeIn=clamp(value,0,Math.min(3,clipDuration(c)/2));
 else if(change==='clip-fade-out'&&c)c.fadeOut=clamp(value,0,Math.min(3,clipDuration(c)/2));
 else if(change==='text-bg'&&t)t.bg=value==='box'?'box':'none';
 else if((change==='cut-type'||change==='cut-duration')&&state.selectedCutId){const i=state.clips.findIndex(x=>x.id===state.selectedCutId);if(i>0){const ci=state.clips[i];if(change==='cut-type')ci.xfade=value==='crossfade'?Math.min(XFADE_DEFAULT,maxXfade(i)):0;else ci.xfade=clamp(value,.2,maxXfade(i))}renderTimeline()}
 else if(change==='text-anim'&&t)t.anim=['fade','slide','none'].includes(value)?value:'fade';
 else if(change==='music-fade-in'&&state.music)state.music.fadeIn=clamp(value,0,8);
 else if(change==='music-fade-out'&&state.music)state.music.fadeOut=clamp(value,0,8);
 else if(change==='clip-saturation'&&c){c.saturation=clamp(value,0,200);c.look='custom'}
 else if(change.startsWith('fx-')){const k=change.slice(3),lim={brightness:[50,150],contrast:[50,150],saturation:[0,200],warmth:[-100,100],vignette:[0,100],blur:[0,100]}[k];if(lim){const tg=fxTargets();for(const cl of tg){cl[k]=clamp(+value,...lim);if(/brightness|contrast|saturation/.test(k))cl.look='custom'}revealClip(tg)}}
 else if(change==='tr-duration'){state.trDur=clamp(+value,.2,2)}
 else if(change==='script-input')state.script=value;
 invalidatePreview();if(change==='clip-speed'||change==='clip-in'||change==='clip-out'||change.startsWith('text-')||change==='clip-name'||(c?.keys?.length&&/^clip-(zoom|pan-x|pan-y)$/.test(change)))renderTimeline();if(change.startsWith('clip-')||change.startsWith('music-')||change.startsWith('fx-'))syncMedia(false);if(change.startsWith('clip-')||change.startsWith('fx-'))applyNativeLook();drawPreview();queueSave()}
/* ---------- Left rail ---------- */
const RAIL_TABS=['media','intelligence','templates','text','audio','brand','variants','effects','transitions'];
let assetsCollapsed=bootWorkspace.assetsCollapsed===true;
function setAssetsCollapsed(v){assetsCollapsed=!!v;try{localStorage.setItem('replotre_ui_assets_collapsed',assetsCollapsed?'1':'0')}catch(e){}
 $('.workspace').classList.toggle('assets-collapsed',assetsCollapsed);const btn=$('#railCollapse');btn.setAttribute('aria-pressed',String(assetsCollapsed));btn.title=assetsCollapsed?'Show panel ([)':'Hide panel ([)';btn.querySelector('.rail-label').textContent=assetsCollapsed?'Show':'Hide';
 updateRailIndicator();window.dispatchEvent(new Event('resize'))}
function updateRailIndicator(){const ind=$('#railIndicator'),act=$('.rail-item.active[data-tab]');if(!ind||!act)return;ind.style.transform=`translateY(${act.offsetTop}px)`;ind.style.height=`${act.offsetHeight}px`;ind.classList.toggle('is-dim',assetsCollapsed&&innerWidth>980)}
function updateRailBadges(){const set=(k,v)=>{const b=$(`.rail-badge[data-badge="${k}"]`);if(!b)return;b.textContent=typeof v==='number'?(v>99?'99+':String(v)):'';b.classList.toggle('is-dot',v===true);b.classList.toggle('is-on',!!v)};
 set('media',state.media.length||0);set('text',state.texts.length||0);set('audio',!!activeMusic())}
// Rail clicks: picking the open tool again folds the panel away (or closes the drawer on small screens).
function setRightCollapsed(v){$('.workspace').classList.toggle('right-collapsed',!!v);const b=$('#rightToggleBtn');if(b){b.setAttribute('aria-pressed',String(!v));b.classList.toggle('is-on',!v)}window.dispatchEvent(new Event('resize'))}
/* ---------- Effects & Transitions tools ---------- */
const FX_KEYS=[['brightness',100],['contrast',100],['saturation',100],['warmth',0],['vignette',0],['blur',0]];
/* Keep the edited clip on screen: if the playhead isn't over it, jump to its first frames. */
function revealClip(tg){if(!tg?.length||state.playing)return;const cur=timelineAt()?.clip;if(tg.includes(cur))return;const i=state.clips.indexOf(tg[0]);if(i>=0)seek(Math.min(clipStarts()[i]+.05,totalDuration()-.01))}
function fxTargets(){const all=state.fxScope==='all';const c=selectedClip()||timelineAt()?.clip;return all?state.clips.slice():c?[c]:[]}
function renderEffectsPanel(){const t=fxTargets(),c=t[0],all=state.fxScope==='all';
 if(!state.clips.length)return `<div class="fx-empty">${ico('sparkles')}<h3>No clips yet</h3><p>Add footage, then grade it, add a vignette or blur here.</p></div>`;
 const v=k=>Math.round(c?.[k]??FX_KEYS.find(x=>x[0]===k)[1]),thumb=c?clipThumb(c):'',changed=c&&FX_KEYS.some(([k,d])=>(c[k]??d)!==d);
 return `<div class="fx pp">`+
 `<div class="fx-scope" role="radiogroup" aria-label="Apply effects to"><button class="${all?'':'is-on'}" data-action="fx-scope" data-value="clip" role="radio" aria-checked="${!all}">${ico('film')}<span>${c&&!all?escapeHTML(c.name):'This clip'}</span></button><button class="${all?'is-on':''}" data-action="fx-scope" data-value="all" role="radio" aria-checked="${all}">${ico('layers')}<span>All ${state.clips.length} clips</span></button></div>`+
 ppSection('palette','Looks',`<div class="pp-looks">${LOOKS.map(([id,name,lv])=>`<button class="pp-look ${(c?.look||'natural')===id?'is-on':''}" data-action="fx-look" data-value="${id}" title="${name}"><span class="pp-look-swatch${thumb?' has-frame':''}" style="filter:brightness(${lv.brightness/100}) contrast(${lv.contrast/100}) saturate(${lv.saturation/100})${thumb?`;background-image:url('${escapeHTML(thumb)}')`:''}"></span><span>${name}</span></button>`).join('')}</div>`)+
 ppSection('sliders-horizontal','Adjust',ppSlider('fx-brightness',v('brightness'),50,150,{label:'Brightness',unit:'%',reset:100})+ppSlider('fx-contrast',v('contrast'),50,150,{label:'Contrast',unit:'%',reset:100})+ppSlider('fx-saturation',v('saturation'),0,200,{label:'Saturation',unit:'%',reset:100})+ppSlider('fx-warmth',v('warmth'),-100,100,{label:'Warmth',unit:'',reset:0}),changed?'<button class="pp-link" data-action="fx-reset">Reset</button>':'')+
 ppSection('sparkles','Effects',ppSlider('fx-vignette',v('vignette'),0,100,{label:'Vignette',unit:'%',reset:0})+ppSlider('fx-blur',v('blur'),0,100,{label:'Blur',unit:'%',reset:0})+`<p class="pp-help">Effects show live in the preview and are rendered into the export.</p>`)+
 `</div>`}
function transitionAtCut(i){const c=state.clips[i],p=state.clips[i-1];if(!c||!p)return 'cut';if(xfadeFor(i)>0)return 'crossfade';if((p.fadeOut||0)>0&&(c.fadeIn||0)>0)return 'dip';return 'cut'}
function renderTransitionsPanel(){if(state.clips.length<2)return `<div class="fx-empty">${ico('xfade')}<h3>Transitions need two clips</h3><p>Add another clip to the timeline, then choose how shots flow into each other.</p></div>`;
 const d=state.trDur??.6,styles=[['cut','Cut','Hard cut, no blend','scissors'],['crossfade','Crossfade','Dissolve between shots','xfade'],['dip','Dip to black','Fade out, then in','sparkles']],starts=clipStarts();
 return `<div class="fx pp">`+ppSection('xfade','Apply to every cut',`<div class="tr-styles">${styles.map(([id,name,sub,icn])=>`<button class="tr-style" data-action="tr-apply" data-value="${id}">${ico(icn)}<strong>${name}</strong><span>${sub}</span></button>`).join('')}</div>`+ppSlider('tr-duration',d,.2,2,{step:.1,label:'Duration',unit:'s',reset:.6}))+
 ppSection('film',`Cuts · ${state.clips.length-1}`,`<div class="tr-cuts">${state.clips.slice(1).map((c,k)=>{const i=k+1,ty=transitionAtCut(i);return `<button class="tr-cut ${state.selectedCutId===c.id?'is-on':''}" data-action="tr-select" data-index="${i}"><span class="tr-cut-time">${fmt(starts[i])}</span><span class="tr-cut-names">${escapeHTML(state.clips[i-1].name)} → ${escapeHTML(c.name)}</span><span class="tr-badge is-${ty}">${ty==='crossfade'?`Crossfade ${xfadeFor(i).toFixed(1)}s`:ty==='dip'?'Dip':'Cut'}</span></button>`}).join('')}</div>`)+`</div>`}
function applyTransitionStyle(style,idxs){const d=clamp(state.trDur??.6,.2,2);for(const i of idxs){const c=state.clips[i],p=state.clips[i-1];if(!c||!p)continue;
  if(style==='crossfade'){c.xfade=clamp(d,.2,maxXfade(i))}else c.xfade=0;
  if(style==='dip'){p.fadeOut=clamp(d/2,.1,Math.min(3,clipDuration(p)/2));c.fadeIn=clamp(d/2,.1,Math.min(3,clipDuration(c)/2))}else if(transitionAtCut(i)==='dip'||style==='cut'){if(style!=='dip'){p.fadeOut=0;c.fadeIn=0}}}}
function railSelect(tab){const wide=innerWidth>980;if(tab===state.tab){if(wide){setAssetsCollapsed(!assetsCollapsed);return}if($('#assetPanel').classList.contains('is-open')){$('#assetPanel').classList.remove('is-open');return}}chooseTool(tab)}
function chooseTool(tab){if(!RAIL_TABS.includes(tab))return;if(assetsCollapsed&&innerWidth>980)setAssetsCollapsed(false);state.tab=tab;renderAssetPanel();if(innerWidth<=980)$('#assetPanel').classList.add('is-open');if(innerWidth<=700){$('#rightPanel').classList.remove('is-open');setMobileNav('assets')}window.ReplotreWorkspace?.schedule()}
// Media tab: a few templates in place of the old sample clips. Favourites from setup first, then the catalog order.
/* Template tiles loop their preview while on screen. Videos load only when visible, pause off screen or when the tab is
   hidden, and stay as still posters with reduced motion or data saver. */
let tileObserver=null;
function playTemplateTiles(root){const vids=[...root.querySelectorAll('.mt-vid')];if(!vids.length)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||navigator.connection?.saveData)return;
 tileObserver?.disconnect();
 tileObserver=new IntersectionObserver(entries=>{for(const e of entries){const v=e.target;
  if(e.isIntersecting&&document.visibilityState==='visible'){if(!v.src){v.src=v.dataset.src;v.addEventListener('playing',()=>v.classList.add('is-on'),{once:true})}v.play().catch(()=>{})}
  else if(!v.paused)v.pause()}},{rootMargin:'80px 0px',threshold:.25});
 vids.forEach(v=>tileObserver.observe(v))}
document.addEventListener('visibilitychange',()=>{document.querySelectorAll('.mt-vid').forEach(v=>{if(document.visibilityState!=='visible')v.pause();else if(v.src&&v.getBoundingClientRect().height&&v.closest('.mt-grid')?.offsetParent)v.play().catch(()=>{})})});
function featuredTemplates(){const C=window.ReplotreTemplateCatalog;if(!C?.TEMPLATES)return [];let fav=[];try{fav=JSON.parse(localStorage.getItem('replotre_prefs')||'{}').favoriteTemplates||[]}catch{}
 const all=C.TEMPLATES.filter(t=>t.id!=='custom'),pick=[...fav.map(id=>all.find(t=>t.id===id)).filter(Boolean),...all];return [...new Set(pick)].slice(0,6)}
function templateTileMarkup(t){const tEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const cur=window.ReplotreEditor?.template?.get?.()?.id===t.id;const ratio=t.ratio==='16:9'?'Landscape':t.ratio==='4:5'?'Portrait':t.ratio==='1:1'?'Square':'Vertical';
 return `<button type="button" class="mt-tile${cur?' is-current':''}" data-action="open-template" data-id="${tEsc(t.id)}" aria-label="${tEsc(t.name)} template: ${tEsc(t.desc||'')}"><span class="mt-thumb"><img src="/assets/templates/${tEsc(t.preview?.poster||t.id+'.jpg')}" alt="" loading="lazy" decoding="async" width="360" height="640"><video class="mt-vid" data-src="/assets/templates/${tEsc(t.preview?.video||t.id+'.mp4')}" muted loop playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1"></video>${cur?`<em class="mt-cur">In use</em>`:''}</span><strong>${tEsc(t.name)}</strong><small>${ratio}</small></button>`}
function setMobileNav(section){if(section!=='ai'&&!workspaceRestoring)directorFirst=false;workspaceMobileSection=section;$$('.mobile-bottom-nav button').forEach(b=>b.classList.remove('mobile-nav-active'));if(section==='assets')$('#mobileAssets').classList.add('mobile-nav-active');else if(section==='ai')$('#mobileAI').classList.add('mobile-nav-active');else $('#mobileStudio').classList.add('mobile-nav-active')}
function handleAction(action,el,event){const id=el.dataset.id;switch(action){case 'upload':$('#mediaInput').click();break;
 case 'add-demo':addSample(Number(el.dataset.index)||0);break;
 case 'see-templates':chooseTool('templates');break;
 case 'open-template':chooseTool('templates');requestAnimationFrame(()=>window.ReplotreTemplates?.openDetail?.(el.dataset.id));break;
 case 'add-media':addExistingMedia(id);break;
 case 'download-project':downloadProject();break;
 case 'open-project':$('#projectInput').click();break;
 case 'apply-template':applyTemplate(Number(el.dataset.index));break;
 case 'apply-variant':applyVariant(Number(el.dataset.index));break;
 case 'add-title':addText();break;
 case 'add-lower':addText('Put your supporting message here','title',state.playhead,3);const lower=selectedText();if(lower){lower.position='bottom';lower.fontSize=26;renderRightPanel();drawPreview()}break;
 case 'add-caption':addText('Your caption goes here','caption');break;
 case 'generate-captions':state.script=$('#scriptInput')?.value||state.script;generateCaptionsFromScript();break;
 case 'brand-color':state.brandColor=el.dataset.color;renderAssetPanel();queueSave();break;
 case 'apply-brand':applyMutation(()=>state.texts.forEach(t=>t.color=state.brandColor),'Brand style applied');break;
 case 'remove-music':applyMutation(()=>{state.music=null;audioEl.pause()},'Soundtrack removed');break;
 case 'delete-selection':deleteSelection();break;
 case 'kf-toggle':{const c=selectedClip();if(!c)break;const start=clipStartTime(c.id),dur=clipDuration(c);if(c.keys?.length){applyMutation(()=>dropKeys(c,clamp(state.playhead-start,0,dur)),'Animation removed');applyNativeLook();break}
  if(state.playhead<start||state.playhead>start+dur)seek(start);applyMutation(()=>setKeyAt(c,clamp(state.playhead-start,0,dur),{zoom:c.zoom??1,panX:c.panX??0,panY:c.panY??0}),'Keyframe added · move the playhead and change zoom or position');break}
 case 'kf-set':{const c=selectedClip();if(!c?.keys?.length)break;const l=clipLocalTime(c);if(l<-FRAME||l>clipDuration(c)+FRAME){toast('Move the playhead over this clip');break}const i=keyIndexAt(c,l);
  if(i>=0)applyMutation(()=>{if(c.keys.length===1)dropKeys(c,l);else c.keys.splice(i,1)},'Keyframe removed');else applyMutation(()=>setKeyAt(c,l),'Keyframe added');applyNativeLook();break}
 case 'kf-prev':case 'kf-next':{const c=selectedClip();if(!c?.keys?.length)break;const l=clipLocalTime(c),ts=c.keys.map(k=>k.t),t=action==='kf-next'?ts.find(x=>x>l+FRAME/2):[...ts].reverse().find(x=>x<l-FRAME/2);if(t===undefined){toast(action==='kf-next'?'No later keyframe':'No earlier keyframe');break}seek(clipStartTime(c.id)+t);break}
 case 'kf-jump':{const c=selectedClip();if(c)seek(clipStartTime(c.id)+(+el.dataset.value));break}
 case 'kf-track':{const c=selectedClip();if(!c||!event)break;const r=el.getBoundingClientRect();seek(clipStartTime(c.id)+clamp((event.clientX-r.left)/r.width,0,1)*clipDuration(c));break}
 case 'kf-clear':{const c=selectedClip();if(c?.keys?.length)applyMutation(()=>dropKeys(c,clamp(clipLocalTime(c),0,clipDuration(c))),'Keyframes cleared');applyNativeLook();break}
 case 'text-split':splitAtPlayhead();break;
 case 'zoom-fit':zoomToFit();syncZoomSlider();break;
 case 'select-cut':{const i=state.clips.findIndex(x=>x.id===el.dataset.id);if(i<=0)break;const c=state.clips[i];
  if(!xfadeFor(i))applyMutation(()=>{c.xfade=Math.min(XFADE_DEFAULT,maxXfade(i))},'Crossfade added');
  state.selectedCutId=c.id;state.selectedClipId=null;state.selectedTextId=null;state.rightTab='properties';if(innerWidth<=700){$('#rightPanel').classList.add('is-open');setMobileNav('ai')}else if(innerWidth<=980)setRightCollapsed(false);
  if(!state.playing)seek(Math.max(0,clipStarts()[i]-xfadeFor(i)/4));renderTimeline();renderRightPanel();break}
 case 'xfade-remove':{const c=state.clips.find(x=>x.id===state.selectedCutId);if(c)applyMutation(()=>{c.xfade=0},'Transition removed');break}
 case 'xfade-all':{const src=state.clips.find(x=>x.id===state.selectedCutId),d=+src?.xfade||XFADE_DEFAULT;applyMutation(()=>{state.clips.forEach((c,i)=>{if(i>0)c.xfade=Math.min(d,maxXfade(i))})},`Crossfade on ${state.clips.length-1} cut${state.clips.length===2?'':'s'}`);break}
 case 'cut-preview':{const i=state.clips.findIndex(x=>x.id===state.selectedCutId);if(i>0){seek(Math.max(0,clipStarts()[i]-xfadeFor(i)/2-1));play()}break}
 case 'text-fit-end':{const t=selectedText();if(t)applyMutation(()=>{const tot=totalDuration();if(t.start>=tot-.2)t.start=Math.max(0,tot-Math.min(t.duration,3));t.duration=+Math.max(.2,tot-t.start).toFixed(3)},'Trimmed to the video end');break}
 case 'text-end-playhead':trimSelectionToPlayhead('end');break;
 case 'mon-start':seek(state.markIn??0);break;case 'mon-end':seek(state.markOut??totalDuration());break;
 case 'toggle-right':setRightCollapsed(!$('.workspace').classList.contains('right-collapsed'));break;
 case 'undo-mobile':undo();break;case 'redo-mobile':redo();break;
 case 'choose-tool':chooseTool(el.dataset.value);break;
 case 'mark-in':setMark('in');break;case 'mark-out':setMark('out');break;case 'clear-marks':clearMarks();break;
 case 'step-back':stepFrames(-1);break;case 'step-fwd':stepFrames(1);break;
 case 'toggle-loop':state.loop=!state.loop;updateMonitorStatic();toast(state.loop?(state.markIn!=null||state.markOut!=null?'Looping the in/out range':'Looping the whole timeline'):'Loop off');break;
 case 'toggle-overlays':state.overlays=!state.overlays;try{localStorage.setItem('replotre_ui_overlays',state.overlays?'1':'0')}catch(e){}lastClipLabel=null;updateMonitorStatic();updatePreviewChrome();break;
 case 'viewer-zoom-menu':openViewerZoomMenu();break;case 'set-viewer-zoom':setViewerZoom(el.dataset.value);break;
 case 'toggle-assets':setAssetsCollapsed(!assetsCollapsed);break;
 case 'set-ratio':{const r=el.dataset.value;openRatioMenu(false);if(r!==state.aspect&&ratioDims[r])applyMutation(()=>{state.aspect=r},`Canvas set to ${r} · ${(RATIO_INFO[r]||[''])[0]}`);break}
 case 'preview-toggle':togglePlay();break;
 case 'preview-fullscreen':toggleFullscreen();break;
 case 'ai-dock-toggle':setAiDockExpanded(!$('#rightPanel').classList.contains('is-expanded'));break;
 case 'ai-dock-close':if(window.aiSheetClose)window.aiSheetClose();else{$('#rightPanel').classList.remove('is-open','is-expanded');setMobileNav('studio')}break;
 case 'director-clear':state.messages=[];state.editingMsg=null;state.chatRestoredAt=null;scheduleChatSave();renderRightPanel();break;
 case 'director-edit':{if(state.aiBusy||state.serverBusy)break;startPromptEdit(+el.dataset.index);break}
 case 'director-edit-cancel':{cancelPromptEdit();break}
 case 'director-edit-save':{const ta=$('.dr-edit-input');resendEditedPrompt(+el.dataset.index,ta?.value);break}
 case 'director-resend':{const m=state.messages[+el.dataset.index];if(m)sendPrompt(m.text);break}
 case 'director-copy':{const m=state.messages[+el.dataset.index];if(m){navigator.clipboard?.writeText(m.text).then(()=>toast('Prompt copied'),()=>{});const ci=$('#chatInput');if(ci&&!ci.value){ci.value=m.text;state.chatDraft=m.text;ci.dispatchEvent(new Event('input',{bubbles:true}));ci.focus()}}break}
 case 'fx-scope':{state.fxScope=el.dataset.value==='all'?'all':'clip';renderAssetPanel();break}
 case 'fx-look':{const L=LOOKS.find(l=>l[0]===el.dataset.value),t=fxTargets();if(L&&t.length){applyMutation(()=>t.forEach(c=>{Object.assign(c,L[2]);c.look=L[0]}),`${L[1]} look${t.length>1?` · ${t.length} clips`:''}`);revealClip(t)}applyNativeLook();break}
 case 'fx-reset':{const t=fxTargets();if(t.length)applyMutation(()=>t.forEach(c=>{for(const [k,d] of FX_KEYS)c[k]=d;c.look='natural'}),'Effects reset');applyNativeLook();break}
 case 'tr-apply':{const st=el.dataset.value,idx=state.clips.map((_,i)=>i).slice(1);applyMutation(()=>applyTransitionStyle(st,idx),`${st==='crossfade'?'Crossfades':st==='dip'?'Dip to black':'Hard cuts'} on ${idx.length} cut${idx.length===1?'':'s'}`);break}
 case 'tr-select':{const i=+el.dataset.index,c=state.clips[i];if(c){state.selectedCutId=c.id;state.selectedClipId=null;state.selectedTextId=null;state.rightTab='properties';seek(Math.max(0,clipStarts()[i]-.3));renderTimeline();renderRightPanel();renderAssetPanel();if(innerWidth<=700){$('#rightPanel').classList.add('is-open');setMobileNav('ai')}}break}
 case 'director-history':{runHistoryIntent(el.dataset.kind,+el.dataset.n||1);break}
 case 'director-undo':{const m=state.messages[Number(el.dataset.index)];if(isTopStep(m)){undo();m.undone=true;renderRightPanel()}break}
 case 'clip-split':splitAtPlayhead();break;
 case 'duplicate-selection':{const t=selectedText(),c=selectedClip();if(t)applyMutation(()=>{const copy={...t,id:uid('txt'),start:clamp(t.start+t.duration,0,Math.max(0,totalDuration()-.3))};state.texts.push(copy);state.selectedTextId=copy.id},'Text duplicated');else if(c)applyMutation(()=>{const copy={...c,id:uid('clip'),name:`${c.name} copy`};state.clips.splice(state.clips.indexOf(c)+1,0,copy);state.selectedClipId=copy.id},'Clip duplicated');break}
 case 'trim-nudge':{const c=selectedClip();if(!c)break;const d=+el.dataset.d||0,edge=el.dataset.edge,max=clipMaxOut(c);applyMutation(()=>{if(edge==='in'){const old=c.in;c.in=+clamp(c.in+d,0,c.out-.2).toFixed(2);c.keys=shiftKeys(c.keys,(c.in-old)/(c.speed||1))}else c.out=+clamp(c.out+d,c.in+.2,max).toFixed(2)});break}
 case 'trim-reset':{const c=selectedClip();if(!c)break;applyMutation(()=>{const old=c.in;c.in=0;c.out=clipMaxOut(c);c.keys=shiftKeys(c.keys,(0-old)/(c.speed||1))},'Trim reset to the full clip');break}
 case 'clip-set-in':case 'clip-set-out':{const c=selectedClip(),hit=timelineAt();if(!c)break;if(!hit||hit.clip.id!==c.id){toast('Move the playhead over this clip first');break}const local=hit.local,sp=c.speed||1;if(action==='clip-set-in'){if(local>=c.out-.1*sp){toast('In point must be before the out point');break}applyMutation(()=>{const d=(local-c.in)/sp;c.in=local;c.keys=shiftKeys(c.keys,d)},'In point set')}else{if(local<=c.in+.1*sp){toast('Out point must be after the in point');break}applyMutation(()=>{c.out=local},'Out point set')}break}
 case 'clip-toggle-mute':{const c=selectedClip();if(c)applyMutation(()=>{if((c.volume??1)>0){c.prevVolume=c.volume??1;c.volume=0}else{c.volume=c.prevVolume||1;delete c.prevVolume}});break}
 case 'clip-reset-color':{const c=selectedClip();if(c)applyMutation(()=>{c.brightness=100;c.saturation=100;c.contrast=100;c.look='natural'},'Color reset');applyNativeLook();break}
 case 'clip-look':{const c=selectedClip(),look=LOOKS.find(l=>l[0]===el.dataset.value);if(c&&look)applyMutation(()=>{Object.assign(c,look[2]);c.look=look[0]},`${look[1]} look`);applyNativeLook();break}
 case 'clip-flip':{const c=selectedClip();if(c)applyMutation(()=>{c.flipH=!c.flipH});applyNativeLook();break}
 case 'clip-reset-framing':{const c=selectedClip();if(c)applyMutation(()=>{c.fit='fill';c.zoom=1;c.panX=0;c.panY=0;c.flipH=false;delete c.keys},'Framing reset');applyNativeLook();break}
 case 'toggle-snap':setSnap(!state.snap);break;
 case 'add-marker':toggleMarker();break;
 case 'text-to-playhead':{const t=selectedText();if(t)applyMutation(()=>{t.start=clamp(state.playhead,0,Math.max(0,totalDuration()-.2));t.duration=Math.min(t.duration,Math.max(.2,totalDuration()-t.start))},'Moved to playhead');break}
 case 'select-music':state.tab='audio';renderAssetPanel();break;
 case 'modal-backdrop':if(el===event.target)closeModal();break;
 case 'close-modal':closeModal();break;
 case 'export-resolution':state.exportResolution=Number(el.dataset.value);document.querySelectorAll('.ex-res .export-option').forEach(o=>o.classList.toggle('active',o.dataset.value===el.dataset.value));refreshExportSummary();break;
 case 'export-format':state.exportFormat=el.dataset.value==='mp4'?'mp4':'webm';refreshExportSummary();break;
 case 'cloud-signin':closeModal();window.ReplotreCloud?.openAccount?.();break;
 case 'export-scope':state.exportScope=el.dataset.value;$$('.export-scope .export-option').forEach(o=>o.classList.toggle('active',o.dataset.value===el.dataset.value));refreshExportSummary();break;
 case 'start-export':startExport();break;case 'cloud-mp4':{const r=exportRange();window.ReplotreCloud?.renderMP4?.(state.exportResolution,r.ranged?{start:r.start,end:r.end}:null);break}}}
// Main delegated UI events.
document.addEventListener('click',event=>{
 const e=event.target.closest('button,[data-action]');if(!e)return;
 if(e.dataset.tab){railSelect(e.dataset.tab);return}
 if(e.dataset.right){state.rightTab=e.dataset.right;renderRightPanel();return}
 if(e.dataset.prompt){sendPrompt(e.dataset.prompt);return}
 if(e.dataset.action){handleAction(e.dataset.action,e,event);return}
 switch(e.id){
 case 'undoBtn':undo();break;case 'redoBtn':redo();break;case 'saveBtn':saveState();if(window.ReplotreCloud?.isConnected?.())window.ReplotreCloud.saveNow().catch(e=>toast(e.message));else toast('Project saved on this device');break;
 case 'exportBtn':openExport();break;case 'playBtn':togglePlay();break;case 'goStart':seek(0);break;case 'goEnd':seek(totalDuration());break;
 case 'backwardBtn':seek(state.playhead-5);break;case 'forwardBtn':seek(state.playhead+5);break;case 'splitBtn':splitAtPlayhead();break;
 case 'deleteBtn':deleteSelection();break;case 'addTextQuick':addText();break;
 case 'zoomIn':setZoom(state.zoom*1.25);break;case 'zoomOut':setZoom(state.zoom/1.25);break;
 case 'timelineExpand':$('#timelineSection').classList.toggle('expanded');break;
 case 'gridBtn':state.showGuides=!state.showGuides;updateHeader();break;
 case 'ratioBtn':openRatioMenu();break;case 'snapshotBtn':saveSnapshot();break;
 case 'fullscreenBtn':toggleFullscreen();break
 case 'chatSend':sendPrompt();break;case 'helpBtn':openHelp();break;
 case 'mobileTools':$('#assetPanel').classList.add('is-open');setMobileNav('assets');break;
 case 'closeAssetBtn':$('#assetPanel').classList.remove('is-open');setMobileNav('studio');break;
 case 'closeRightBtn':if(innerWidth>700){setRightCollapsed(true);break}if(window.aiSheetClose)window.aiSheetClose();else{$('#rightPanel').classList.remove('is-open');setMobileNav('studio')}break;
 case 'mobileStudio':$('#assetPanel').classList.remove('is-open');$('#rightPanel').classList.remove('is-open');setMobileNav('studio');break;
 case 'mobileAssets':$('#assetPanel').classList.add('is-open');$('#rightPanel').classList.remove('is-open');setMobileNav('assets');break;
 case 'mobileAI':state.rightTab='ai';$('#rightPanel').classList.remove('is-expanded');renderRightPanel();updateAiDock();$('#rightPanel').classList.add('is-open');requestAnimationFrame(()=>{const l=$('#aiMessageList');if(l)l.scrollTop=l.scrollHeight});$('#assetPanel').classList.remove('is-open');setMobileNav('ai');break;
 }
});
/* Mobile: the Director docks as a sheet under the preview so the video stays visible while prompting. */
function updateAiDock(){const panel=$('#rightPanel'),bar=$('#timelineSection');if(panel){const desk=innerWidth>700;if(desk)panel.classList.add('is-expanded');else if(panel.dataset.wasDesk==='1'&&!panel.classList.contains('is-open'))panel.classList.remove('is-expanded');panel.dataset.wasDesk=desk?'1':'0'}if(!panel||!bar||innerWidth>700)return;
 const host=(panel.offsetParent||document.body).getBoundingClientRect(),nav=$('.mobile-bottom-nav')?.offsetHeight||64;
 const header=$('.app-header')?.getBoundingClientRect().bottom||56,minSheet=Math.min(220,host.height*.4);
 const top=Math.max(header-host.top,Math.min(bar.getBoundingClientRect().top-host.top,host.height-nav-minSheet));
 panel.style.setProperty('--ai-dock-top',`${Math.round(top)}px`);const mb=$('.preview-bottom')?.getBoundingClientRect(),clearTop=Math.min(host.top+top,mb&&mb.height?mb.top:host.top+top);document.documentElement.style.setProperty('--ai-sheet-clear',`${Math.round(document.documentElement.clientHeight-clearTop+12)}px`)}
function setAiDockExpanded(on){const p=$('#rightPanel');p.classList.toggle('is-expanded',on);p.querySelectorAll('.dr-dock-toggle').forEach(b=>{b.setAttribute('aria-label',on?'Collapse panel':'Expand panel');b.title=on?'Collapse':'Expand'})}
window.addEventListener('resize',updateAiDock);window.visualViewport?.addEventListener('resize',updateAiDock);
/* On-screen keyboard: lift the Director so the composer stays visible above it (iOS/Android overlay the keyboard). */
function aiKeyboardSync(kbOverride){const panel=$('#rightPanel'),vv=window.visualViewport;if(!panel)return;
 const kb=kbOverride??(vv?Math.max(0,Math.round(innerHeight-vv.height-vv.offsetTop)):0);
 const on=kb>80&&innerWidth<=700&&panel.classList.contains('is-ai')&&panel.classList.contains('is-open')&&panel.contains(document.activeElement);
 panel.classList.toggle('kb-open',on);if(!on){panel.style.removeProperty('--kb-bottom');panel.style.removeProperty('--kb-top');return}
 const host=(panel.offsetParent||document.body).getBoundingClientRect(),hdr=($('.app-header')?.getBoundingClientRect().bottom||56)-host.top;
 const bottom=Math.max(0,kb-(innerHeight-host.bottom)),ex=panel.classList.contains('is-expanded');
 const dock=parseFloat(panel.style.getPropertyValue('--ai-dock-top'))||host.height*.5,nav=$('.mobile-bottom-nav')?.offsetHeight||64;
 const sheetH=ex?host.height-hdr-bottom:Math.max(200,host.height-nav-dock);const top=Math.max(hdr,host.height-bottom-sheetH);
 panel.style.setProperty('--kb-bottom',`${Math.round(bottom)}px`);panel.style.setProperty('--kb-top',`${Math.round(top)}px`);
 requestAnimationFrame(()=>{const ta=$('#chatInput');if(ta&&document.activeElement===ta)ta.scrollIntoView({block:'nearest'})})}
window.aiKeyboardSync=aiKeyboardSync;
window.visualViewport?.addEventListener('resize',()=>aiKeyboardSync());window.visualViewport?.addEventListener('scroll',()=>aiKeyboardSync());
document.addEventListener('focusin',()=>setTimeout(()=>aiKeyboardSync(),60));document.addEventListener('focusout',()=>setTimeout(()=>aiKeyboardSync(),60));
{const ps=$('.preview-section');if(ps&&window.ResizeObserver)new ResizeObserver(updateAiDock).observe(ps)}
/* Draggable sheet: follows the finger, snaps to expanded / docked / closed by position + flick velocity. */
{const panel=$('#rightPanel');let drag=null,suppressClick=false;
 const geo=()=>{const host=(panel.offsetParent||document.body).getBoundingClientRect(),hdr=$('.app-header')?.getBoundingClientRect().bottom||56,nav=$('.mobile-bottom-nav')?.offsetHeight||64;
  const exp=Math.round(hdr-host.top),dock=parseFloat(panel.style.getPropertyValue('--ai-dock-top'))||Math.round(host.height*.5),closed=Math.round(host.height-nav);return {exp,dock:Math.max(dock,exp),closed}};
 const docked=()=>innerWidth<=700&&panel.classList.contains('is-ai')&&panel.classList.contains('is-open');
 const buzz=()=>{try{navigator.vibrate?.(8)}catch(e){}};
 const closeSheet=()=>{const g=geo();panel.style.setProperty('top',`${g.closed}px`,'important');panel.classList.add('is-closing');
  setTimeout(()=>{panel.classList.remove('is-open','is-expanded','is-closing');panel.style.removeProperty('top');setMobileNav('studio')},260)};
 const snapTo=target=>{panel.classList.remove('is-dragging');if(target==='closed'){closeSheet();return}
  setAiDockExpanded(target==='exp');panel.style.removeProperty('top');buzz()};
 window.aiSheetClose=closeSheet;
 panel?.addEventListener('pointerdown',e=>{if(!docked()||e.button>0)return;
  const zone=e.target.closest('.dr-grab,.right-header,.dr-header');
  if(!zone||(e.target.closest('button,textarea,input,a')&&!e.target.closest('.dr-grab')))return;
  if(e.pointerType==='mouse')e.preventDefault();const g=geo(),start=panel.classList.contains('is-expanded')?g.exp:g.dock;drag={id:e.pointerId,y0:e.clientY,start,g,last:e.clientY,t:performance.now(),v:0,moved:false}});
 window.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dy=e.clientY-drag.y0;
  if(!drag.moved){if(Math.abs(dy)<6)return;drag.moved=true;try{panel.setPointerCapture(e.pointerId)}catch(_){}panel.classList.add('is-dragging')}
  const now=performance.now(),dt=Math.max(1,now-drag.t);drag.v=drag.v*.6+((e.clientY-drag.last)/dt)*.4;drag.last=e.clientY;drag.t=now;
  const {exp,closed}=drag.g;let top=drag.start+dy;if(top<exp)top=exp-(exp-top)*.22;top=Math.min(top,closed-40);
  panel.style.setProperty('top',`${Math.round(top)}px`,'important');e.preventDefault()});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;if(!d.moved)return;suppressClick=true;setTimeout(()=>suppressClick=false,0);
  const top=parseFloat(panel.style.top)||d.start,{exp,dock,closed}=d.g,proj=top+d.v*220;
  const opts=[['exp',exp],['dock',dock],['closed',closed]];let target=opts.reduce((b,o)=>Math.abs(o[1]-proj)<Math.abs(b[1]-proj)?o:b)[0];
  if(d.start===exp&&target==='closed'&&d.v<1.2)target='dock'; // from full screen a normal drag lands on docked first
  snapTo(target)};
 window.addEventListener('pointerup',end);window.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id){drag=null;panel.classList.remove('is-dragging');panel.style.removeProperty('top')}});
 panel?.addEventListener('click',e=>{if(suppressClick){e.stopPropagation();e.preventDefault();suppressClick=false}},true);
 panel?.addEventListener('keydown',e=>{if(!e.target.closest('.dr-grab'))return;const ex=panel.classList.contains('is-expanded');
  if(e.key==='ArrowUp'&&!ex){e.preventDefault();snapTo('exp')}else if(e.key==='ArrowDown'){e.preventDefault();snapTo(ex?'dock':'closed')}else if(e.key==='Escape'){e.preventDefault();snapTo('closed')}});
}
function openHelp(){openModal('Studio shortcuts',`<p class="modal-description">Create with keyboard shortcuts or with the AI Director. These actions work locally and don't require a subscription.</p><div class="help-shortcuts">${[['Play / pause','Space'],['Split at playhead','S'],['Undo','⌘ / Ctrl + Z'],['Redo','⌘ / Ctrl + Shift + Z'],['Delete selected','Delete'],['Save project','⌘ / Ctrl + S']].map(([k,v])=>`<div class="shortcut"><span>${k}</span><kbd>${v}</kbd></div>`).join('')}</div><p class="text-help">Local editing and WebM export work in supported browsers. Sign in for persistent cloud projects, hosted media, server-rendered MP4, and optional AI edit planning. Open Insights for scene detection, measured waveforms, silence removal, beat cuts, speech transcription, version history, and live jobs. Transcription and visual understanding require a configured AI provider.</p>`)}
$('#projectName').addEventListener('change',e=>{checkpoint();state.projectName=e.target.value.slice(0,80)||'Untitled project';queueSave()});
$('#mediaInput').addEventListener('change',async e=>{await importFiles(e.target.files);e.target.value=''});
$('#projectInput').addEventListener('change',async e=>{if(e.target.files[0])await openProject(e.target.files[0]);e.target.value=''});
document.addEventListener('input',e=>{if(e.target.id==='scriptInput'){state.script=e.target.value;queueSave()}if(e.target.dataset.change)trackInputChange(e.target)});
document.addEventListener('change',e=>{if(e.target.dataset.change){trackInputChange(e.target);if(state.rightTab==='properties')renderRightPanel();else renderAssetPanel()}});
document.addEventListener('focusin',e=>{if(e.target.dataset.change)checkpoint(({'text-content':'Text edit','clip-name':'Rename clip','clip-in':'Trim start','clip-out':'Trim end'})[e.target.dataset.change]||'Property change')});
document.addEventListener('input',e=>{if(e.target.id!=='chatInput')return;state.chatDraft=e.target.value;scheduleChatSave();autosizeChat(e.target);const send=$('#chatSend');if(send)send.disabled=!e.target.value.trim()||state.aiBusy||state.serverBusy});
document.addEventListener('input',e=>{const r=e.target;if(!r.classList?.contains('pp-range'))return;const min=+r.min,max=+r.max;r.style.setProperty('--fill',`${((r.value-min)/(max-min)*100).toFixed(1)}%`);const out=r.closest('.pp-slider')?.querySelector('.pp-value');if(out)out.textContent=r.value+(out.dataset.unit||'')});
document.addEventListener('dblclick',e=>{const r=e.target;if(!r.classList?.contains('pp-range')||r.dataset.reset===undefined)return;checkpoint();r.value=r.dataset.reset;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}))});
$('#tracks').addEventListener('click',e=>{if(e.target.closest('[data-trim],[data-cut],.cut-btn'))return;const text=e.target.closest('[data-text]'),clip=e.target.closest('[data-clip]');if(!text&&!clip&&e.target.closest('.track-area')&&!e.target.closest('.clip-block')){seek((e.clientX-$('#timelineBody').getBoundingClientRect().left-LABEL_W)/pxPerSec());return}if(text){if(textMoveJustEnded){textMoveJustEnded=false;return}selectTextLayer(state.texts.find(t=>t.id===text.dataset.text))}else if(clip){state.selectedClipId=clip.dataset.clip;state.selectedTextId=null;state.rightTab='properties';renderTimeline();renderRightPanel()}});
$('#tracks').addEventListener('dragstart',e=>{const clip=e.target.closest('[data-clip]');if(!clip)return;dragClipId=clip.dataset.clip;e.dataTransfer.setData('text/plain',dragClipId);e.dataTransfer.effectAllowed='move'});
$('#tracks').addEventListener('dragover',e=>{if(dragMediaId&&e.target.closest('.track-area')){e.preventDefault();e.dataTransfer.dropEffect='copy';return}if(e.target.closest('[data-clip],[data-drop-track]'))e.preventDefault()});
$('#tracks').addEventListener('drop',e=>{e.preventDefault();if(dragMediaId){const id=dragMediaId;dragMediaId=null;$('#timelineSection').classList.remove('media-drop-ready');if(id.startsWith('demo:'))addDemo(Number(id.slice(5)));else addExistingMedia(id);return}const target=e.target.closest('[data-clip]')?.dataset.clip;if(!dragClipId||dragClipId===target){dragClipId=null;return}applyMutation(()=>{const idx=state.clips.findIndex(x=>x.id===dragClipId);if(idx<0)return;const [moved]=state.clips.splice(idx,1);let targetIdx=target?state.clips.findIndex(x=>x.id===target):state.clips.length;if(targetIdx<0)targetIdx=state.clips.length;state.clips.splice(targetIdx,0,moved)},'Clips reordered');dragClipId=null});
{const sc=timelineScrollEl();let scrollFrame=null,zoomFrame=null,pendingZoom=null,pendingAnchor=null,pinch=null;
 sc.addEventListener('scroll',()=>{if(scrollFrame!==null)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;renderRuler(false);updatePlaybackPosition()})},{passive:true});
 const queueZoom=(z,anchor)=>{pendingZoom=clamp(z,ZOOM_MIN,ZOOM_MAX);pendingAnchor=anchor;if(zoomFrame===null)zoomFrame=requestAnimationFrame(()=>{zoomFrame=null;setZoom(pendingZoom,pendingAnchor);pendingZoom=null})};
 sc.addEventListener('wheel',e=>{lastUserScroll=performance.now();const unit=e.deltaMode===1?16:e.deltaMode===2?sc.clientWidth:1;
  // Ctrl/Cmd + wheel, and trackpad pinch (reported as ctrl+wheel), zoom around the cursor.
  if(e.ctrlKey||e.metaKey){e.preventDefault();const dy=clamp(e.deltaY*unit,-30,30);queueZoom((pendingZoom??state.zoom)*Math.exp(-dy*.012),e.clientX-sc.getBoundingClientRect().left);return}
  // A plain vertical wheel scrolls the timeline sideways, unless the tracks themselves overflow vertically.
  if(!e.shiftKey&&Math.abs(e.deltaY)>Math.abs(e.deltaX)&&sc.scrollHeight<=sc.clientHeight+1){e.preventDefault();sc.scrollLeft+=e.deltaY*unit}},{passive:false});
 // Two-finger pinch on touch screens.
 const span=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 sc.addEventListener('touchstart',e=>{lastUserScroll=performance.now();if(e.touches.length===2)pinch={d:span(e.touches),z:state.zoom}},{passive:true});
 sc.addEventListener('touchmove',e=>{lastUserScroll=performance.now();if(!pinch||e.touches.length!==2)return;e.preventDefault();const mid=(e.touches[0].clientX+e.touches[1].clientX)/2-sc.getBoundingClientRect().left;queueZoom(pinch.z*span(e.touches)/pinch.d,mid)},{passive:false});
 sc.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
 sc.addEventListener('pointerdown',e=>{if(e.target===sc)lastUserScroll=performance.now()});
 $('#zoomLabel').title='Double-click to fit timeline';$('#zoomLabel').addEventListener('dblclick',zoomToFit);
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable)return;const mod=e.metaKey||e.ctrlKey;
  if(e.key==='='||e.key==='+'){if(mod)return;e.preventDefault();setZoom(state.zoom*1.25)}else if(e.key==='-'&&!mod){e.preventDefault();setZoom(state.zoom/1.25)}else if(e.shiftKey&&e.key.toLowerCase()==='z'&&!mod){e.preventDefault();zoomToFit()}});
}
{const panel=$('#assetContent');let hoverCard=null,hoverFrame=null,hoverFrac=0;
 const stop=()=>{if(!hoverCard)return;const v=hoverCard.querySelector('.hover-preview');if(v){v.pause();v.classList.remove('ready')}hoverCard.classList.remove('scrubbing');hoverCard=null};
 // Hover-scrub: moving across a video thumbnail previews that moment of the clip.
 panel.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const thumb=e.target.closest('.asset-card.kind-video .asset-thumb');const card=thumb?thumb.closest('.asset-card'):null;if(card!==hoverCard)stop();if(!thumb)return;const m=getMedia(card.dataset.id),v=thumb.querySelector('.hover-preview');if(!m||!v)return;
  if(!hoverCard){hoverCard=card;card.classList.add('scrubbing');if(!v.getAttribute('src')){if(m.cloud)v.crossOrigin='anonymous';v.preload='auto';v.addEventListener('seeked',()=>v.classList.add('ready'));v.src=m.url}}
  const r=thumb.getBoundingClientRect();hoverFrac=clamp((e.clientX-r.left)/r.width,0,1);thumb.style.setProperty('--scrub',`${hoverFrac*100}%`);
  if(hoverFrame===null)hoverFrame=requestAnimationFrame(()=>{hoverFrame=null;if(hoverCard!==card)return;const d=v.duration||m.duration||0;if(d&&v.readyState>=1){try{v.currentTime=Math.min(d-.05,hoverFrac*d)}catch(err){}}})});
 panel.addEventListener('pointerleave',stop);
 panel.addEventListener('dragstart',e=>{const card=e.target.closest('.asset-card[data-action="add-media"],.asset-card[data-action="add-demo"]');if(!card)return;stop();dragMediaId=card.dataset.action==='add-demo'?`demo:${card.dataset.index}`:card.dataset.id;e.dataTransfer.setData('text/plain',dragMediaId);e.dataTransfer.effectAllowed='copy';card.classList.add('dragging');$('#timelineSection').classList.add('media-drop-ready')});
 panel.addEventListener('dragend',e=>{const card=e.target.closest&&e.target.closest('.asset-card');if(card)card.classList.remove('dragging');$('#timelineSection').classList.remove('media-drop-ready');setTimeout(()=>{dragMediaId=null},0)});
}
let dragMediaId=null;
let trimDrag=null;
{const tracks=$('#tracks');let trimFrame=null,trimX=0;
 const hint=$('#timelineFooterHint'),defaultHint=hint.textContent;
 const find=()=>trimDrag.isText?state.texts.find(t=>t.id===trimDrag.id):state.clips.find(c=>c.id===trimDrag.id);
 // Snap targets in timeline seconds: start/end of the programme, playhead, markers, clip cuts, other text edges.
 const trimSnapPoints=skipId=>{if(!state.snap)return [];const pts=[0,totalDuration(),state.playhead,...(state.markers||[]).map(m=>m.t)];let c=0;for(const clip of state.clips){c+=clipDuration(clip);pts.push(c)}for(const t of state.texts)if(t.id!==skipId)pts.push(t.start,t.start+t.duration);return pts};
 const snapTo=(time,pts,pps)=>{const tol=8/pps;let best=null;for(const p of pts){const d=p-time;if(Math.abs(d)<=tol&&(best===null||Math.abs(d)<Math.abs(best-time)))best=p}return best};
 const apply=()=>{trimFrame=null;if(!trimDrag)return;const item=find();if(!item)return;const o=trimDrag.orig,pps=trimDrag.pps,dt=(trimX-trimDrag.x0)/pps;
  if(!trimDrag.moved){if(Math.abs(trimX-trimDrag.x0)<2)return;trimDrag.moved=true;checkpoint()}
  const total=totalDuration();let snapped=null,guideAt=null;
  if(trimDrag.isText){const oEnd=o.start+o.duration;
   if(trimDrag.edge==='start'){let st=clamp(o.start+dt,0,oEnd-.3);const sn=snapTo(st,trimDrag.pts,pps);if(sn!==null&&sn<=oEnd-.3){st=sn;snapped=sn}item.start=+st.toFixed(3);item.duration=+(oEnd-item.start).toFixed(3);guideAt=item.start}
   // The end edge follows the pointer exactly; it may sit past the programme end (shown as an overhang) but never jumps.
   else{let en=clamp(oEnd+dt,o.start+.3,Math.max(total,oEnd));const sn=snapTo(en,trimDrag.pts,pps);if(sn!==null&&sn>=o.start+.3){en=sn;snapped=sn}item.duration=+(en-o.start).toFixed(3);guideAt=en}}
  else{const sp=o.speed||1;if(trimDrag.edge==='in'){item.in=clamp(o.in+dt*sp,0,o.out-.2*sp);if(o.keys?.length)item.keys=shiftKeys(o.keys,(item.in-o.in)/sp)}
   else{let out=clamp(o.out+dt*sp,o.in+.2*sp,clipMaxOut(o));const endT=trimDrag.clipStart+(out-o.in)/sp,sn=snapTo(endT,trimDrag.pts,pps);if(sn!==null){const so=o.in+(sn-trimDrag.clipStart)*sp;if(so>=o.in+.2*sp&&so<=clipMaxOut(o)){out=so;snapped=sn}}item.out=+out.toFixed(4);guideAt=trimDrag.clipStart+(item.out-o.in)/sp}}
  const startT=trimDrag.isText?item.start:trimDrag.clipStart,endT=trimDrag.isText?item.start+item.duration:trimDrag.clipStart+clipDuration(item),d=endT-startT;
  hint.textContent=`Trimming · ${d.toFixed(1)}s`;state.playhead=clamp(state.playhead,0,totalDuration());invalidatePreview();renderTimeline();drawPreview(false);
  showTrimFeedback({x:trimX,startT,endT,snapped,guideAt,past:trimDrag.isText&&endT>totalDuration()+1e-6})};
 const badge=document.createElement('div');badge.className='trim-badge';badge.hidden=true;document.body.appendChild(badge);
 const guide=document.createElement('div');guide.className='snap-guide';guide.hidden=true;$('#timelineBody').appendChild(guide);
 function showTrimFeedback({x,startT,endT,snapped,guideAt,past}){const blk=$(`#tracks .clip-block.selected`),r=blk?.getBoundingClientRect();
  badge.hidden=false;badge.innerHTML=`<b>${fmt(startT)}${(startT%1).toFixed(1).slice(1)}</b> → <b>${fmt(endT)}${(endT%1).toFixed(1).slice(1)}</b> · ${(endT-startT).toFixed(1)}s${snapped!==null?' <i>snap</i>':''}${past?' <em>past end</em>':''}`;
  const bw=badge.offsetWidth;badge.style.left=`${clamp(x-bw/2,8,innerWidth-bw-8)}px`;badge.style.top=`${Math.max(8,(r?r.top:0)-34)}px`;
  if(guideAt!==null&&snapped!==null){guide.hidden=false;guide.style.transform=`translateX(${LABEL_W+guideAt*pxPerSec()}px)`}else guide.hidden=true}
 const hideTrimFeedback=()=>{badge.hidden=true;guide.hidden=true};
 tracks.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-trim]');if(!h||e.button!==0)return;if(state.serverBusy){toast('Director is applying your edit');return}const block=h.closest('.clip-block'),isText=!!block.dataset.text,id=isText?block.dataset.text:block.dataset.clip,item=isText?state.texts.find(t=>t.id===id):state.clips.find(c=>c.id===id);if(!item)return;
  e.preventDefault();e.stopPropagation();trimDrag={edge:h.dataset.trim,isText,id,x0:e.clientX,orig:{...item},pps:pxPerSec(),moved:false,pts:trimSnapPoints(isText?id:null),clipStart:isText?0:clipStartTime(id)};if(!isText){const own=clipStartTime(id);trimDrag.pts=trimDrag.pts.filter(p=>Math.abs(p-own)>1e-6&&Math.abs(p-(own+clipDuration(item)))>1e-6)}trimX=e.clientX;
  if(isText){state.selectedTextId=id;state.selectedClipId=null}else{state.selectedClipId=id;state.selectedTextId=null}
  tracks.setPointerCapture(e.pointerId);document.body.classList.add('is-trimming');renderTimeline()});
 tracks.addEventListener('pointermove',e=>{if(!trimDrag)return;trimX=e.clientX;if(trimFrame===null)trimFrame=requestAnimationFrame(apply)});
 let lastHandleTap={id:null,t:0};
 const end=e=>{if(!trimDrag)return;if(trimFrame!==null){cancelAnimationFrame(trimFrame);apply()}const moved=trimDrag.moved,wasText=trimDrag.isText,wasId=trimDrag.id;trimDrag=null;hideTrimFeedback();
  // A quick second tap on a text block's edge opens it for editing too.
  if(!moved&&wasText){const now=performance.now();if(lastHandleTap.id===wasId&&now-lastHandleTap.t<400){lastHandleTap={id:null,t:0};document.body.classList.remove('is-trimming');hint.textContent=defaultHint;try{tracks.releasePointerCapture(e.pointerId)}catch(err){}selectTextLayer(state.texts.find(x=>x.id===wasId));focusTextEditor();return}lastHandleTap={id:wasId,t:now}}document.body.classList.remove('is-trimming');hint.textContent=defaultHint;try{tracks.releasePointerCapture(e.pointerId)}catch(err){}
  state.rightTab='properties';if(moved){refreshAll();queueSave()}else{renderTimeline();renderRightPanel()}};
 tracks.addEventListener('pointerup',end);tracks.addEventListener('pointercancel',end);
 tracks.addEventListener('dragstart',e=>{if(trimDrag||document.body.classList.contains('is-trimming'))e.preventDefault()},true);
}
{const overlay=$('#previewOverlay'),track=$('#poTrack');let seeking=false;
 overlay.addEventListener('click',e=>{if(e.target===overlay)togglePlay()});
 overlay.addEventListener('dblclick',e=>{if(e.target===overlay||e.target.closest('.po-play'))toggleFullscreen()});
 const seekAt=e=>{const r=track.getBoundingClientRect();seek(clamp((e.clientX-r.left)/r.width,0,1)*totalDuration())};
 track.addEventListener('pointerdown',e=>{seeking=true;track.setPointerCapture(e.pointerId);overlay.classList.add('is-seeking');seekAt(e)});
 track.addEventListener('pointermove',e=>{if(seeking)seekAt(e)});
 const stopSeek=e=>{if(!seeking)return;seeking=false;overlay.classList.remove('is-seeking');try{track.releasePointerCapture(e.pointerId)}catch(err){}};
 track.addEventListener('pointerup',stopSeek);track.addEventListener('pointercancel',stopSeek);
 let idle=0;const wake=()=>{overlay.classList.add('is-awake');clearTimeout(idle);idle=setTimeout(()=>overlay.classList.remove('is-awake'),2200)};
 $('#previewStage').addEventListener('pointermove',wake);
 document.addEventListener('pointerdown',e=>{if(!$('#ratioMenu').hidden&&!e.target.closest('.ratio-wrap'))openRatioMenu(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#ratioMenu').hidden){openRatioMenu(false);return}if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='f'||e.key==='F'){e.preventDefault();toggleFullscreen()}else if(e.key==='g'||e.key==='G'){e.preventDefault();state.showGuides=!state.showGuides;updateHeader()}});
 document.addEventListener('fullscreenchange',()=>$('#previewStage').classList.toggle('is-fullscreen',document.fullscreenElement===$('#previewStage')));
}
{const saved=$('#savedLabel'),engine=$('#engineStatus'),wrap=$('#saveState'),chip=$('#engineChip');
 const icons={saving:'loader',dirty:null,error:'alert-triangle',saved:'check'};
 const syncSave=()=>{const st=saveStateFrom(saved.textContent);if(wrap.dataset.state!==st||!wrap.dataset.ready){wrap.dataset.state=st;wrap.dataset.ready='1';wrap.querySelector('.save-icon').innerHTML=icons[st]?ico(icons[st]):''}};
 const syncEngine=()=>{chip.dataset.state=engineStateFrom(engine.textContent)};
 new MutationObserver(syncSave).observe(saved,{childList:true,characterData:true,subtree:true});
 new MutationObserver(syncEngine).observe(engine,{childList:true,characterData:true,subtree:true});
 syncSave();syncEngine();
 const name=$('#projectName');let before='';
 name.addEventListener('focus',()=>{before=name.value;name.select()});
 name.addEventListener('input',sizeProjectName);
 name.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();name.blur()}else if(e.key==='Escape'){name.value=before;sizeProjectName();name.blur()}});
 name.addEventListener('blur',()=>{if(!name.value.trim()){name.value='Untitled project';sizeProjectName()}});
 document.fonts?.ready.then(sizeProjectName);
}
{if(assetsCollapsed)setAssetsCollapsed(true);requestAnimationFrame(updateRailIndicator);document.fonts?.ready.then(updateRailIndicator);
 window.addEventListener('resize',()=>updateRailIndicator());
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||e.metaKey||e.ctrlKey||e.altKey||state.serverBusy)return;
  if(/^[1-9]$/.test(e.key)){e.preventDefault();chooseTool(RAIL_TABS[+e.key-1])}else if(e.key==='['){e.preventDefault();setAssetsCollapsed(!assetsCollapsed)}else if(e.key==='?'){e.preventDefault();openHelp()}});
}
{try{state.overlays=localStorage.getItem('replotre_ui_overlays')==='1'}catch(e){}
 document.addEventListener('pointerdown',e=>{if(!$('#viewerZoomMenu').hidden&&!e.target.closest('.mb-menu-wrap'))openViewerZoomMenu(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#viewerZoomMenu').hidden){openViewerZoomMenu(false);return}
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||e.metaKey||e.ctrlKey||state.serverBusy)return;
  const k=e.key;if(e.altKey){if(e.code==='KeyX'){e.preventDefault();clearMarks()}return}
  if(k==='i'||k==='I'){e.preventDefault();setMark('in')}else if(k==='o'||k==='O'){e.preventDefault();setMark('out')}
  else if(k==='ArrowLeft'){e.preventDefault();e.shiftKey?(state.playing&&pause(),seek(state.playhead-1)):stepFrames(-1)}else if(k==='ArrowRight'){e.preventDefault();e.shiftKey?(state.playing&&pause(),seek(state.playhead+1)):stepFrames(1)}
  else if(k==='Home'){e.preventDefault();seek(0)}else if(k==='End'){e.preventDefault();seek(totalDuration())}
  else if(k==='k'||k==='K'){e.preventDefault();pause()}else if(k==='l'){e.preventDefault();play()}else if(k==='L'){e.preventDefault();handleAction('toggle-loop',document.body)}else if(k==='j'||k==='J'){e.preventDefault();if(state.playing)pause();seek(state.playhead-1)}
  else if(k==='t'||k==='T'){e.preventDefault();handleAction('toggle-overlays',document.body)}});
}
{const empty=$('#previewEmpty');let depth=0;
 const hasFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
 empty.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();depth++;empty.classList.add('is-drag')});
 empty.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy'});
 empty.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)empty.classList.remove('is-drag')});
 empty.addEventListener('drop',e=>{if(!e.dataTransfer?.files?.length)return;e.preventDefault();e.stopPropagation();depth=0;empty.classList.remove('is-drag');importFiles(e.dataTransfer.files)});
}
if(matchMedia('(min-width:701px) and (max-width:980px) and (max-height:520px)').matches)setRightCollapsed(true);
let textMoveJustEnded=false;
{const overlay=$('#previewOverlay'),box=$('#textSelect'),guides=$('#textGuides');let drag=null,frame=null,lastE=null,suppressClick=false;
 const SNAP=.018;
 const apply=()=>{frame=null;if(!drag||!lastE)return;const t=state.texts.find(x=>x.id===drag.id);if(!t)return;const p=frameToCanvas(lastE),w=canvas.width,h=canvas.height;
  if(!drag.moved){if(Math.hypot(lastE.clientX-drag.x0,lastE.clientY-drag.y0)<3)return;drag.moved=true;checkpoint();document.body.classList.add('is-text-dragging')}
  if(drag.mode==='move'){const bb=textBox(t,w,h),hw=Math.min(.5,bb.width/2/w),hh=Math.min(.5,bb.height/2/h);let nx=clamp((drag.cx+(p.x-drag.px))/w,hw,1-hw),ny=clamp((drag.cy+(p.y-drag.py))/h,hh,1-hh);const sv=Math.abs(nx-.5)<SNAP,sh=Math.abs(ny-.5)<SNAP;if(sv)nx=.5;if(sh)ny=.5;
   t.x=+nx.toFixed(4);t.y=+ny.toFixed(4);guides.classList.toggle('show-v',sv);guides.classList.toggle('show-h',sh)}
  else{const d=Math.hypot(p.x-drag.bcx,p.y-drag.bcy);t.fontSize=Math.round(clamp(drag.size*d/Math.max(8,drag.dist),12,100))}
  invalidatePreview();drawPreview(true);updateTextSelection()};
 const start=(e,t,mode)=>{const b=textBox(t,canvas.width,canvas.height),p=frameToCanvas(e);drag={id:t.id,mode,x0:e.clientX,y0:e.clientY,px:p.x,py:p.y,cx:b.cx,cy:b.cy,bcx:b.cx,bcy:b.cy,size:t.fontSize||42,dist:Math.hypot(p.x-b.cx,p.y-b.cy),moved:false};lastE=e;(mode==='move'?overlay:box).setPointerCapture(e.pointerId)};
 overlay.addEventListener('pointerdown',e=>{if(e.button!==0||state.serverBusy||state.exporting||e.target.closest('.po-bar'))return;if(state.playing)return;const t=hitText(e);if(!t)return;
  e.preventDefault();suppressClick=true;if(state.selectedTextId!==t.id)selectTextLayer(t,{reveal:false});start(e,t,'move')},true);
 box.addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-handle="scale"]');if(!handle||e.button!==0)return;const t=selectedText();if(!t)return;e.preventDefault();e.stopPropagation();suppressClick=true;start(e,t,'scale')});
 const move=e=>{if(!drag)return;lastE=e;if(frame===null)frame=requestAnimationFrame(apply)};
 const end=e=>{if(!drag)return;if(frame!==null){cancelAnimationFrame(frame);apply()}const moved=drag.moved;drag=null;guides.className='text-guides';document.body.classList.remove('is-text-dragging');if(moved){queueSave();renderTimeline();renderRightPanel()}};
 overlay.addEventListener('pointermove',move);overlay.addEventListener('pointerup',end);overlay.addEventListener('pointercancel',end);
 box.addEventListener('pointermove',move);box.addEventListener('pointerup',end);box.addEventListener('pointercancel',end);
 // A press that landed on text must not also toggle playback.
 overlay.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.stopImmediatePropagation()}},true);
 overlay.addEventListener('dblclick',e=>{const t=hitText(e);if(t){e.stopImmediatePropagation();selectTextLayer(t,{reveal:false});focusTextEditor()}},true);
 // Hover feedback: show a move cursor over draggable text.
 overlay.addEventListener('pointermove',e=>{if(drag||state.playing||e.pointerType==='touch')return;overlay.classList.toggle('over-text',!!hitText(e))});
 window.addEventListener('resize',()=>requestAnimationFrame(updateTextSelection));
 // Live properties header while typing.
 document.addEventListener('input',e=>{if(e.target.dataset?.change!=='text-content')return;const n=$('#rightContent .pp-head-name');if(n)n.textContent=e.target.value.split('\n')[0]||'Untitled text';updateTextSelection()});
}
{// Timeline: drag a text block to move it in time (snaps to playhead, clip edges and other text edges).
 const tracks=$('#tracks');let mv=null,frame=null,lastX=0;const hint=$('#timelineFooterHint');
 const snapPoints=id=>{if(!state.snap)return [];const pts=[0,state.playhead,totalDuration(),...(state.markers||[]).map(m=>m.t)];let c=0;for(const clip of state.clips){c+=clipDuration(clip);pts.push(c)}for(const t of state.texts)if(t.id!==id)pts.push(t.start,t.start+t.duration);return pts};
 const apply=()=>{frame=null;if(!mv)return;const t=state.texts.find(x=>x.id===mv.id);if(!t)return;if(!mv.moved){if(Math.abs(lastX-mv.x0)<4)return;mv.moved=true;checkpoint();document.body.classList.add('is-trimming')}
  const pps=pxPerSec(),max=Math.max(0,totalDuration()-.1);let ns=clamp(mv.start+(lastX-mv.x0)/pps,0,max);const tol=8/pps;let best=null;
  for(const p of mv.pts){for(const edge of [0,t.duration]){const dlt=p-(ns+edge);if(Math.abs(dlt)<tol&&(best===null||Math.abs(dlt)<Math.abs(best)))best=dlt}}
  if(best!==null)ns=clamp(ns+best,0,max);t.start=+ns.toFixed(3);hint.textContent=`Moving · starts ${fmt(t.start)}${best!==null?' · snapped':''}`;invalidatePreview();renderTimeline();drawPreview(false)};
 tracks.addEventListener('pointerdown',e=>{const block=e.target.closest('.clip-block[data-text]');if(!block||e.target.closest('[data-trim]')||e.button!==0||state.serverBusy)return;const t=state.texts.find(x=>x.id===block.dataset.text);if(!t)return;
  mv={id:t.id,x0:e.clientX,start:t.start,moved:false,pts:snapPoints(t.id),hintBefore:hint.textContent};lastX=e.clientX;tracks.setPointerCapture(e.pointerId)});
 tracks.addEventListener('pointermove',e=>{if(!mv)return;lastX=e.clientX;if(frame===null)frame=requestAnimationFrame(apply)});
 let lastTap={id:null,t:0};
 const end=()=>{if(!mv)return;if(frame!==null){cancelAnimationFrame(frame);apply()}const was=mv;mv=null;hint.textContent=was.hintBefore;document.body.classList.remove('is-trimming');
  // Pointer capture swallows dblclick on the block, so detect a quick second tap here.
  if(!was.moved){const now=performance.now();if(lastTap.id===was.id&&now-lastTap.t<400){lastTap={id:null,t:0};textMoveJustEnded=true;setTimeout(()=>{textMoveJustEnded=false},0);selectTextLayer(state.texts.find(x=>x.id===was.id));focusTextEditor();return}lastTap={id:was.id,t:now}}else lastTap={id:null,t:0};
  textMoveJustEnded=true;setTimeout(()=>{textMoveJustEnded=false},0);if(was.moved)queueSave();selectTextLayer(state.texts.find(x=>x.id===was.id))};
 tracks.addEventListener('pointerup',end);tracks.addEventListener('pointercancel',end);
}
{const overlay=$('#previewOverlay');let pan=null,frame=null,lastE=null;
 const canPan=c=>{if(!c||c.kind==='demo')return false;const e=framingAt(c,clamp(clipLocalTime(c),0,clipDuration(c)));return (e.zoom??1)>1.001||c.fit!=='fit'};
 overlay.addEventListener('pointerdown',e=>{if(e.defaultPrevented||e.button!==0||state.playing||state.serverBusy||e.target.closest('.po-bar,.po-play'))return;const c=selectedClip();if(!canPan(c)||hitText(e))return;
  const r=$('#previewFrame').getBoundingClientRect();const eff0=framingAt(c,clamp(clipLocalTime(c),0,clipDuration(c)));if(c.keys?.length){const l=clipLocalTime(c);if(l<-FRAME||l>clipDuration(c)+FRAME){toast('Move the playhead over this clip to keyframe it');return}}pan={id:c.id,x0:e.clientX,y0:e.clientY,px:eff0.panX??0,py:eff0.panY??0,w:r.width,h:r.height,moved:false};lastE=e;overlay.setPointerCapture(e.pointerId)});
 overlay.addEventListener('pointermove',e=>{if(!pan)return;lastE=e;if(frame===null)frame=requestAnimationFrame(()=>{frame=null;if(!pan)return;const c=state.clips.find(x=>x.id===pan.id);if(!c)return;const dx=lastE.clientX-pan.x0,dy=lastE.clientY-pan.y0;if(!pan.moved){if(Math.hypot(dx,dy)<4)return;pan.moved=true;checkpoint();overlay.classList.add('is-panning')}
  const nx=+clamp(pan.px-dx/(pan.w/2),-1,1).toFixed(3),ny=+clamp(pan.py-dy/(pan.h/2),-1,1).toFixed(3);if(c.keys?.length)setKeyAt(c,clipLocalTime(c),{panX:nx,panY:ny});else{c.panX=nx;c.panY=ny}applyNativeLook();invalidatePreview();drawPreview(true)})});
 const end=e=>{if(!pan)return;const moved=pan.moved;pan=null;overlay.classList.remove('is-panning');if(moved){e.preventDefault();overlay.dataset.suppress='1';setTimeout(()=>{delete overlay.dataset.suppress},0);queueSave();renderRightPanel()}};
 overlay.addEventListener('pointerup',end);overlay.addEventListener('pointercancel',end);
 overlay.addEventListener('click',e=>{if(overlay.dataset.suppress){e.stopImmediatePropagation()}},true);
 try{state.snap=localStorage.getItem('replotre_ui_snap')!=='0'}catch(e){}requestAnimationFrame(()=>{const b=$('#snapBtn');if(b){b.classList.toggle('is-on',state.snap);b.setAttribute('aria-pressed',String(state.snap))}});
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable||state.serverBusy)return;const mod=e.metaKey||e.ctrlKey,k=e.key.toLowerCase();
  if(mod&&k==='c'){if(selectedText()||selectedClip()){e.preventDefault();copySelection()}return}
  if(mod&&k==='v'){if(state.clipboard){e.preventDefault();pasteClipboard()}return}
  if(mod&&k==='d'){e.preventDefault();handleAction('duplicate-selection',document.body);return}
  if(mod||e.altKey)return;
  if(k==='m'){e.preventDefault();e.shiftKey?jumpMarker(1):toggleMarker()}else if(k==='n'){e.preventDefault();setSnap(!state.snap)}else if(k==='q'&&!e.shiftKey){e.preventDefault();trimSelectionToPlayhead('start')}else if(k==='w'&&!e.shiftKey){e.preventDefault();trimSelectionToPlayhead('end')}});
}
{const sl=$('#zoomSlider');let f=null,v=0;
 sl.addEventListener('pointerdown',()=>{sl.dataset.dragging='1'});const done=()=>{delete sl.dataset.dragging;syncZoomSlider()};sl.addEventListener('pointerup',done);sl.addEventListener('change',done);
 sl.addEventListener('input',()=>{v=+sl.value;sl.style.setProperty('--fill',`${v}%`);if(f===null)f=requestAnimationFrame(()=>{f=null;setZoom(sliderToZoom(v))})});
}
$('#tracks').addEventListener('dblclick',e=>{if(e.target.closest('[data-trim],.cut-btn'))return;const tb=e.target.closest('.clip-block[data-text]'),cb=e.target.closest('.clip-block[data-clip]');
 if(tb){const t=state.texts.find(x=>x.id===tb.dataset.text);if(t){selectTextLayer(t);focusTextEditor()}}
 else if(cb){state.selectedClipId=cb.dataset.clip;state.selectedTextId=null;state.rightTab='properties';if(innerWidth<=700){$('#rightPanel').classList.add('is-open');$('#assetPanel').classList.remove('is-open');setMobileNav('ai')}else if(innerWidth<=980)setRightCollapsed(false);renderTimeline();renderRightPanel()}});
// Logo → home. Work is autosaved on unload, but a running WebM export would be lost, so hold the navigation.
{const tt=$('#themeToggle'),meta=document.querySelector('meta[name="theme-color"]');const sync=()=>{const dark=document.documentElement.dataset.theme==='dark';tt?.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');meta?.setAttribute('content',dark?'#0b0c11':'#f7f4ee')};sync();
 tt?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('replotre_studio_theme',next)}catch(e){}sync()})}
$('#brandHome')?.addEventListener('click',e=>{if(state.exporting){e.preventDefault();toast('Export in progress · wait for it to finish before leaving')}else saveState()});
let scrubFrame=null,scrubTarget=null,scrubGeometry=null;
/* Pointer reorder for clips (mouse + touch). Touch: tap to select first, then drag the selected clip. */
{const tracks=$('#tracks');let rd=null,frame=null,lastX=0,lastTap={id:null,t:0};
 const marker=document.createElement('div');marker.className='reorder-marker';marker.hidden=true;$('#timelineBody').appendChild(marker);
 const plan=()=>{const pps=pxPerSec(),bodyLeft=$('#timelineBody').getBoundingClientRect().left,pt=(lastX-bodyLeft-LABEL_W)/pps,starts=clipStarts(),others=state.clips.map((c,i)=>({c,i,s:starts[i],d:clipDuration(c)})).filter(o=>o.c.id!==rd.id);
  let target=others.filter(o=>o.s+o.d/2<pt).length;const boundary=target===0?(others[0]?.s??0):others[target-1].s+others[target-1].d;return {target,boundary}};
 const apply=()=>{frame=null;if(!rd)return;const dx=lastX-rd.x0;if(!rd.moved){if(Math.abs(dx)<6)return;rd.moved=true;document.body.classList.add('is-reordering');rd.block.classList.add('is-lifted')}
  rd.block.style.transform=`translateX(${dx}px)`;const {target,boundary}=plan();rd.target=target;const same=target===rd.startIdx;marker.hidden=same;if(!same)marker.style.transform=`translateX(${LABEL_W+boundary*pxPerSec()}px)`;
  $('#timelineFooterHint').textContent=same?'Drop to keep the clip in place':`Move to position ${target+1} of ${state.clips.length}`;
  // auto-scroll near the edges
  const sc=timelineScrollEl(),r=sc.getBoundingClientRect();if(lastX<r.left+LABEL_W+30)sc.scrollLeft-=12;else if(lastX>r.right-30)sc.scrollLeft+=12};
 tracks.addEventListener('pointerdown',e=>{const b=e.target.closest('.clip-block[data-clip]');if(!b||e.target.closest('[data-trim],.cut-btn')||e.button!==0||state.serverBusy)return;if(e.pointerType==='touch'&&!b.classList.contains('selected'))return;
  rd={id:b.dataset.clip,x0:e.clientX,moved:false,block:b,startIdx:state.clips.findIndex(c=>c.id===b.dataset.clip),target:null};lastX=e.clientX;tracks.setPointerCapture(e.pointerId)});
 tracks.addEventListener('pointermove',e=>{if(!rd)return;lastX=e.clientX;if(frame===null)frame=requestAnimationFrame(apply)});
 const end=()=>{if(!rd)return;if(frame!==null){cancelAnimationFrame(frame);apply()}const was=rd;rd=null;marker.hidden=true;document.body.classList.remove('is-reordering');was.block.classList.remove('is-lifted');was.block.style.transform='';$('#timelineFooterHint').textContent='Select a clip to trim · Drag to reorder';
  if(was.moved&&was.target!=null&&was.target!==was.startIdx){applyMutation(()=>{const idx=state.clips.findIndex(c=>c.id===was.id);const [m]=state.clips.splice(idx,1);state.clips.splice(was.target,0,m);state.selectedClipId=m.id;state.selectedTextId=null},`Clip moved to position ${was.target+1}`);return}
  if(!was.moved){// pointer capture swallows click/dblclick on the block: select here, and treat a quick second tap as a double-click
   const now=performance.now(),dbl=lastTap.id===was.id&&now-lastTap.t<400;lastTap=dbl?{id:null,t:0}:{id:was.id,t:now};
   state.selectedClipId=was.id;state.selectedTextId=null;state.rightTab='properties';if(dbl){if(innerWidth<=700){$('#rightPanel').classList.add('is-open');$('#assetPanel').classList.remove('is-open');setMobileNav('ai')}else if(innerWidth<=980)setRightCollapsed(false)}renderTimeline();renderRightPanel()}else renderTimeline()};
 tracks.addEventListener('pointerup',end);tracks.addEventListener('pointercancel',end);
}
/* Grab the playhead head itself to scrub (snaps like the ruler). */
{const head=$('#playheadLine .playhead-handle');
 head.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();scrubbing=true;scrubGeometry={left:$('#timelineBody').getBoundingClientRect().left,scale:pxPerSec()};head.setPointerCapture(e.pointerId);document.body.classList.add('is-scrubbing');if(state.playing)pause()});
 head.addEventListener('pointermove',e=>{if(scrubbing&&scrubGeometry)seekFromPointer(e)});
 const stop=e=>{if(!scrubbing)return;seekFromPointer(e,true);scrubbing=false;scrubGeometry=null;showSnapGuide(null);document.body.classList.remove('is-scrubbing')};
 head.addEventListener('pointerup',stop);head.addEventListener('pointercancel',stop);
}

function flushScrub(){if(scrubFrame!==null){cancelAnimationFrame(scrubFrame);scrubFrame=null}if(scrubTarget!==null){const target=scrubTarget;scrubTarget=null;seek(target)}}
function scrubSnapPoints(){const pts=[0,totalDuration(),...(state.markers||[]).map(m=>m.t)];let c=0;for(const clip of state.clips){c+=clipDuration(clip);pts.push(c)}for(const t of state.texts)pts.push(t.start,t.start+t.duration);if(state.markIn!=null)pts.push(state.markIn);if(state.markOut!=null)pts.push(state.markOut);return pts}
function showSnapGuide(time){const g=document.querySelector('#timelineBody .snap-guide');if(!g)return;if(time==null){g.hidden=true;return}g.hidden=false;g.style.transform=`translateX(${LABEL_W+time*pxPerSec()}px)`}
function seekFromPointer(e,immediate=false){const geometry=scrubGeometry||{left:$('#timelineBody').getBoundingClientRect().left,scale:pxPerSec()};scrubTarget=(e.clientX-geometry.left-LABEL_W)/geometry.scale;
 if(state.snap&&!e.altKey){const tol=7/geometry.scale;let best=null;for(const p of (geometry.pts||=scrubSnapPoints()))if(Math.abs(p-scrubTarget)<=tol&&(best===null||Math.abs(p-scrubTarget)<Math.abs(best-scrubTarget)))best=p;if(best!==null){scrubTarget=best;showSnapGuide(best)}else showSnapGuide(null)}if(immediate)flushScrub();else if(scrubFrame===null)scrubFrame=requestAnimationFrame(()=>{scrubFrame=null;flushScrub()})}
$('#timelineRuler').addEventListener('pointerdown',e=>{scrubbing=true;scrubGeometry={left:$('#timelineBody').getBoundingClientRect().left,scale:pxPerSec()};seekFromPointer(e,true);e.currentTarget.setPointerCapture?.(e.pointerId)});
$('#timelineRuler').addEventListener('pointermove',e=>{if(scrubbing)seekFromPointer(e)});
$('#timelineRuler').addEventListener('pointerup',e=>{if(scrubbing)seekFromPointer(e,true);scrubbing=false;scrubGeometry=null;showSnapGuide(null);e.currentTarget.releasePointerCapture?.(e.pointerId)});
$('#timelineRuler').addEventListener('pointercancel',()=>{flushScrub();scrubbing=false;scrubGeometry=null});
document.addEventListener('keydown',e=>{if(state.serverBusy&&e.code!=='Space'&&e.key!=='Escape'){e.preventDefault();return}const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable;if(e.key==='Escape'){if(state.editingMsg!=null){cancelPromptEdit();return}closeModal();return}if(typing){if(e.key==='Enter'&&e.target.id==='chatInput'&&!e.shiftKey){e.preventDefault();sendPrompt()}else if(e.target.classList?.contains('dr-edit-input')){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();resendEditedPrompt(+e.target.dataset.index,e.target.value)}else if(e.key==='Escape'){e.preventDefault();state.editingMsg=null;renderRightPanel()}}else if(e.key==='ArrowUp'&&e.target.id==='chatInput'&&!e.target.value){const lastU=state.messages.map((m,k)=>[m,k]).filter(([m])=>m.role==='user').pop();if(lastU){e.preventDefault();startPromptEdit(lastU[1])}}return}const mod=e.metaKey||e.ctrlKey;if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();saveState();if(window.ReplotreCloud?.isConnected?.())window.ReplotreCloud.saveNow().catch(e=>toast(e.message));else toast('Saved locally');return}if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}if(e.code==='Space'){e.preventDefault();togglePlay()}else if(e.key.toLowerCase()==='s'&&!mod){e.preventDefault();splitAtPlayhead(e.shiftKey?'all':'auto')}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelection()}});
for(const target of [$('#previewWorkspace'),$('#assetPanel'),$('#editor-main'),$('#previewStage'),$('#assetContent')].filter(Boolean)){
 target.addEventListener('dragover',e=>{if([...e.dataTransfer?.types||[]].includes('Files')){e.preventDefault();target.classList.add('drag-over')}});
 target.addEventListener('drop',e=>{if(e.dataTransfer?.files?.length){e.preventDefault();target.classList.remove('drag-over');importFiles(e.dataTransfer.files)}});
 target.addEventListener('dragleave',()=>target.classList.remove('drag-over'));
}
// The studio is sized to 100dvh, so on phones the virtual keyboard and the sliding address bar fire resize repeatedly.
// The timeline and preview raster only depend on widths (the canvas has a fixed resolution and CSS scales it), so a
// height-only change just re-applies the frame sizing instead of rebuilding every clip block and repainting the preview.
let resizePending=false,lastResizeKey='';window.addEventListener('resize',()=>{if(resizePending)return;resizePending=true;requestAnimationFrame(()=>{resizePending=false;
 const key=`${innerWidth}|${timelineScrollEl()?.clientWidth||0}`;if(key===lastResizeKey){updateCanvasSize();return}lastResizeKey=key;
 invalidatePreview();renderTimeline();updateCanvasSize();drawPreview()})});
document.addEventListener('visibilitychange',()=>playback.setVisible(!document.hidden));
window.addEventListener('pagehide',()=>playback.pause());
document.fonts?.ready.then(()=>{invalidatePreview();drawPreview()});
window.addEventListener('beforeunload',()=>{if(!state.exporting)saveState()});
async function checkAI(){try{const controller=new AbortController();const t=setTimeout(()=>controller.abort(),2000);const r=await fetch('/api/status',{signal:controller.signal});clearTimeout(t);const d=await r.json();state.aiConnected=!!d.ai&&!!d.authenticated;$('#engineStatus').textContent=window.ReplotreCloud?.isLive?.()?'Live · project synced':state.aiConnected?'AI Director available':(d.cloud?'Studio ready':'Local editor ready');renderRightPanel()}catch(e){state.aiConnected=false;renderRightPanel()}}
window.ReplotreEditor={ready:false,
 workspace:{
  capture:()=>({version:1,tool:state.tab,rightTab:state.rightTab,mobileSection:innerWidth<=980?($('#assetPanel').classList.contains('is-open')?'assets':$('#rightPanel').classList.contains('is-open')?'ai':'studio'):workspaceMobileSection,
   assetsCollapsed,rightCollapsed:$('.workspace').classList.contains('right-collapsed'),playhead:state.playhead,zoom:state.zoom,viewerZoom:state.viewerZoom,
   selectedClipId:state.selectedClipId,selectedTextId:state.selectedTextId,selectedCutId:state.selectedCutId,
   scroll:{assets:$('#assetContent').scrollTop,timeline:timelineScrollEl().scrollLeft,filters:$('#assetContent .tpl-filters')?.scrollLeft||0},templates:window.ReplotreTemplates?.workspace?.()}),
  restore:settings=>{const s=window.ReplotreWorkspaceState.sanitize(settings),restoreVersion=++workspaceRestoreVersion;if(directorFirst&&innerWidth<=980){s.mobileSection='ai';s.rightTab='ai'}pause();state.tab=s.tool;state.rightTab=s.rightTab;state.zoom=s.zoom;state.viewerZoom=s.viewerZoom;workspaceMobileSection=s.mobileSection;
   state.selectedTextId=state.texts.some(t=>t.id===s.selectedTextId)?s.selectedTextId:null;state.selectedCutId=state.clips.slice(1).some(c=>c.id===s.selectedCutId)?s.selectedCutId:null;
   state.selectedClipId=!state.selectedTextId&&!state.selectedCutId?(state.clips.some(c=>c.id===s.selectedClipId)?s.selectedClipId:state.clips[0]?.id||null):null;
   state.playhead=clamp(s.playhead,0,totalDuration());window.ReplotreTemplates?.restoreWorkspace?.(s.templates);setAssetsCollapsed(s.assetsCollapsed);setRightCollapsed(s.rightCollapsed);refreshAll();syncMedia(true);
   if(innerWidth<=980){$('#assetPanel').classList.toggle('is-open',s.mobileSection==='assets');$('#rightPanel').classList.toggle('is-open',s.mobileSection==='ai');if(s.mobileSection==='ai')updateAiDock?.();setMobileNav(s.mobileSection)}
   const applyScroll=()=>{if(restoreVersion!==workspaceRestoreVersion)return;$('#assetContent').scrollTop=s.scroll.assets;timelineScrollEl().scrollLeft=s.scroll.timeline;const filters=$('#assetContent .tpl-filters');if(filters)filters.scrollLeft=s.scroll.filters;renderRuler()};applyScroll();requestAnimationFrame(applyScroll);
  }
 },
 snapshot:()=>JSON.parse(snapshot()),media:()=>state.media.map(m=>({...m})),context:()=>({selectedClipId:state.selectedClipId,playhead:state.playhead}),
 loadCloudProject:(data,assets,{preserveWorkspace=false}={})=>{const savedWorkspace=preserveWorkspace?window.ReplotreEditor.workspace.capture():null;pause();playback.reset();for(const m of state.media)if(m.url?.startsWith('blob:'))URL.revokeObjectURL(m.url);imageCache.clear();state.playhead=0;state.history=[];state.future=[];state.historyLabels=[];state.futureLabels=[];state.histSeq=(state.histSeq||0)+1000;state.media=assets.map(m=>({...m,cloud:true}));hydrate(data);state.playhead=0;state.selectedClipId=state.clips[0]?.id||null;refreshAll();syncMedia(true);if(savedWorkspace)window.ReplotreEditor.workspace.restore(savedWorkspace)},
 loadSavedEdit:data=>{checkpoint();hydrate(data);syncMedia(true);saveState()},
 lockEditing:locked=>{state.serverBusy=locked;document.querySelector('#app').classList.toggle('editing-pending',locked);$('#projectName').readOnly=locked;updateHistoryButtons();$('#undoBtn').disabled=locked||!state.history.length;$('#redoBtn').disabled=locked||!state.future.length},
 setAnalysisSummaries:summaries=>{const byId=new Map(summaries.map(s=>[s.assetId,s]));state.media.forEach(m=>m.analysis=byId.get(m.id)||m.analysis);if(state.playing){pendingAssetRefresh=true;return}renderAssetPanel();renderTimeline()},
 isPlaying:()=>state.playing,playbackStats:()=>({...playback.diagnostics(),...previewMetrics}),
 refreshAssets:()=>renderAssetPanel(),showIntelligence:()=>chooseTool('intelligence'),
 seekSource:(id,time)=>{let cursor=0;for(const c of state.clips){if(c.mediaId===id&&time>=c.in&&time<c.out){state.selectedClipId=c.id;seek(cursor+(time-c.in)/c.speed);renderTimeline();return}cursor+=clipDuration(c)}toast('This moment is outside the timeline. Add this scene to view it.')},
 addSourceRange:(id,start,end)=>{const media=getMedia(id);if(!media||media.kind!=='video')return;applyMutation(()=>{const c={id:uid('clip'),name:media.name,kind:'video',mediaId:id,in:Math.max(0,start),out:Math.min(media.duration,end),speed:1,volume:1,brightness:100,saturation:100};state.clips.push(c);state.selectedClipId=c.id},'Scene added to timeline')},
 notify:toast,closeModal,checkAI,saveLocal:saveState,downloadProject,defaultData:()=>JSON.parse(snapshot()),
 redraw:()=>{lastPreviewKey='';drawPreview()},
 template:{
  get:()=>state.template,playhead:()=>state.playhead,
  context:()=>({duration:totalDuration(),aspect:state.aspect,title:(state.texts.find(t=>t.kind!=='caption')?.text||'').replace(/\s+/g,' ').trim(),script:state.script||'',words:[],beats:(state.markers||[]).map(m=>m.t).sort((a,b)=>a-b)}),
  // Apply/replace/remove a whole template as one undoable step. The template grade is written onto every clip.
  set:(instance,label)=>applyMutation(()=>{const prev=state.template;state.template=instance||null;const g=instance?.grade||{brightness:100,contrast:100,saturation:100,warmth:0};if(instance||prev)for(const c of state.clips){c.brightness=g.brightness;c.contrast=g.contrast;c.saturation=g.saturation;c.warmth=g.warmth;delete c.look}},label),
  // Fine edits from the panel: one checkpoint per edit session, live repaint while typing/dragging, save on commit.
  begin:label=>{if(!state.serverBusy)checkpoint(label)},
  touch:instance=>{state.template=instance;window.ReplotreTemplates?.invalidate();lastPreviewKey='';drawPreview()},
  commit:()=>{queueSave();updateHistoryButtons()},
  seek:(t,playIt)=>{seek(clamp(t,0,Math.max(0,totalDuration()-.01)));if(playIt&&!state.playing)play()}
 }
};
window.ReplotreTemplates?.restoreWorkspace?.(bootWorkspace.templates);
refreshAll();restore().then(()=>{loadChat();syncMedia(true);
 // A prompt typed on the landing page (/studio?q=...) lands in the Director composer, ready to send.
 try{const u=new URL(location.href),q=(u.searchParams.get('q')||'').replace(/\s+/g,' ').trim().slice(0,140);if(u.searchParams.has('q')){u.searchParams.delete('q');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}if(q){state.chatDraft=q;state.rightTab='ai';refreshAll();requestAnimationFrame(()=>{const ta=$('#chatInput');if(ta&&!ta.disabled){ta.focus();ta.setSelectionRange(q.length,q.length)}})}}catch(e){}
 window.ReplotreEditor.ready=true;checkAI();if(directorFirst&&innerWidth<=980&&!$('#rightPanel').classList.contains('is-open'))$('#mobileAI')?.click();window.dispatchEvent(new Event('replotre:ready'));queueDemoPosters()});
})();
