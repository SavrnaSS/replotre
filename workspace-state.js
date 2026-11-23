/* Shared, versioned workspace preferences. These are UI settings, never timeline edits. */
(function(root){
'use strict';
const TOOLS=['media','intelligence','templates','text','audio','brand','variants','effects','transitions'];
const FILTERS=['all','depth','captions','ads','film'];
const record=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const pick=(v,values,fallback)=>values.includes(v)?v:fallback;
const number=(v,min,max,fallback=0)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v)?v:null;
function sanitize(input){const s=record(input)?input:{},scroll=record(s.scroll)?s.scroll:{},templates=record(s.templates)?s.templates:{};
 return {version:1,tool:pick(s.tool,TOOLS,'media'),rightTab:pick(s.rightTab,['ai','properties'],'ai'),mobileSection:pick(s.mobileSection,['studio','assets','ai'],'studio'),
  assetsCollapsed:s.assetsCollapsed===true,rightCollapsed:s.rightCollapsed===true,
  playhead:number(s.playhead,0,3600),zoom:number(s.zoom,.08,12,1),viewerZoom:s.viewerZoom==='fit'?'fit':number(s.viewerZoom,.1,4,'fit'),
  selectedClipId:identifier(s.selectedClipId),selectedTextId:identifier(s.selectedTextId),selectedCutId:identifier(s.selectedCutId),
  scroll:{assets:number(scroll.assets,0,1e7),timeline:number(scroll.timeline,0,1e7),filters:number(scroll.filters,0,1e7)},
  templates:{filter:pick(templates.filter,FILTERS,'all'),query:typeof templates.query==='string'?templates.query.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,120):'',view:pick(templates.view,['grid','list'],'grid')}};
}
function parse(raw){try{if(typeof raw!=='string'||raw.length>12000)return null;const r=JSON.parse(raw);if(!record(r)||!record(r.state)||r.state.version!==1||!Number.isFinite(r.updatedAt))return null;
 return {state:sanitize(r.state),updatedAt:Math.max(0,r.updatedAt),userId:identifier(r.userId),projectId:identifier(r.projectId)}}catch{return null}}
root.ReplotreWorkspaceState={TOOLS,FILTERS,sanitize,parse};
})(typeof globalThis!=='undefined'?globalThis:window);
