/* Device-first workspace recovery, with private cloud fallback for each project. */
(()=>{
'use strict';
const Model=window.ReplotreWorkspaceState,KEY='replotre_workspace_v1',SESSION=KEY+':tab',E=()=>window.ReplotreEditor;
const read=(kind,key)=>{try{return Model.parse(window[kind].getItem(key))}catch{return null}};
const write=(kind,key,value)=>{try{window[kind].setItem(key,JSON.stringify(value));return true}catch{return false}};
const scope=(userId,projectId)=>userId&&projectId?`${KEY}:${userId}:${projectId}`:KEY+':local';
let legacy={};try{legacy={assetsCollapsed:localStorage.getItem('replotre_ui_assets_collapsed')==='1',templates:{view:localStorage.getItem('replotre_tpl_view')}}}catch{}
const tabRecord=read('sessionStorage',SESSION);
const initialRecord=tabRecord||read('localStorage',KEY)||{state:Model.sanitize(legacy),updatedAt:0,userId:null,projectId:null};
let context={userId:initialRecord.userId,projectId:initialRecord.projectId},current=initialRecord,connection=null,ready=false,applying=false,timer=0,interactions=0,lastState='';
function schedule(delay=0){if(applying)return;clearTimeout(timer);timer=setTimeout(saveNow,delay)}
function capture(){return Model.sanitize(E()?.workspace?.capture?.()||current.state)}
function saveNow(){clearTimeout(timer);if(!ready||applying)return;const state=capture(),serialized=JSON.stringify(state);
 if(serialized!==lastState){current={state,updatedAt:Date.now(),...context};lastState=serialized;
  write('localStorage',scope(context.userId,context.projectId),current);write('localStorage',KEY,current);write('sessionStorage',SESSION,current);
  if(connection){connection.latest=state;connection.dirty=true;queueRemote(connection)}}
 return current;
}
function queueRemote(c){clearTimeout(c.timer);c.timer=setTimeout(()=>flushRemote(c),900)}
async function flushRemote(c=connection,keepalive=false){if(!c)return;clearTimeout(c.timer);if(!c.dirty||c.inFlight)return c.inFlight;
 const state=c.latest,activate=c.activate;c.dirty=false;c.activate=false;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 let ok=false;
 c.inFlight=(async()=>{try{const response=await fetch('/api/workspace',{method:'PUT',credentials:'same-origin',keepalive,signal:controller.signal,headers:{'Content-Type':'application/json','X-Replotre-Client':'studio'},body:JSON.stringify({projectId:c.projectId,state,activate})});
  if(!response.ok)throw Error('Workspace sync unavailable');ok=true;
 }catch{c.dirty=true;c.activate=c.activate||activate}finally{clearTimeout(timeout);c.inFlight=null;if(ok&&c.dirty&&connection===c)queueRemote(c)}})();
 return c.inFlight;
}
function apply(state){applying=true;try{current={...current,state:Model.sanitize(state)};E()?.workspace?.restore?.(current.state)}finally{applying=false}lastState='';saveNow()}
function beginProjectChange(){saveNow();if(connection)flushRemote(connection);clearTimeout(timer);connection=null}
function activate({userId,projectId,remote}){
 context={userId,projectId};const local=read('localStorage',scope(userId,projectId));
 const fallback={...current.state,playhead:0,selectedClipId:null,selectedTextId:null,selectedCutId:null,scroll:{assets:0,timeline:0,filters:0}};
 // A device keeps its own layout; a new device can recover the account's saved workspace.
 const state=local?.state||(remote?.state?.version===1?remote.state:null)||fallback;
 connection={userId,projectId,latest:Model.sanitize(state),dirty:true,activate:!document.hidden,timer:0,inFlight:null};apply(state);queueRemote(connection);
}
function activateLocal({prepared=false}={}){if(!context.userId){saveNow();return}if(!prepared)beginProjectChange();context={userId:null,projectId:null};const saved=read('localStorage',scope());apply(saved?.state||{...current.state,playhead:0,selectedClipId:null,selectedTextId:null,selectedCutId:null})}
function flush(){saveNow();if(connection)flushRemote(connection,true)}
window.ReplotreWorkspace={initial:()=>Model.sanitize(initialRecord.state),save:saveNow,schedule,beginProjectChange,activate,activateLocal,
 preferredProject:userId=>{const saved=read('sessionStorage',SESSION);return saved?.userId===userId?saved.projectId:null}};
window.addEventListener('replotre:ready',()=>{ready=true;if(!interactions)apply(initialRecord.state);else saveNow()},{once:true});
for(const type of ['click','input','change','pointerup','keyup'])document.addEventListener(type,event=>{if(!event.target.closest?.('#app,.tpl-gallery,.tpl-detail'))return;interactions++;schedule(type==='input'?120:0)},true);
document.addEventListener('scroll',event=>{const t=event.target;if(t?.id==='assetContent'||t?.id==='timelineScroll'||t?.classList?.contains('tpl-filters'))schedule(150)},true);
window.addEventListener('pagehide',flush);window.addEventListener('beforeunload',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush()});
for(const type of ['online','focus'])window.addEventListener(type,event=>{saveNow();if(connection){connection.activate=connection.activate||(event.type==='focus'&&!document.hidden);connection.dirty=true;flushRemote(connection)}});
})();
