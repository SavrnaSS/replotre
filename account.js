/* Replotre Account — onboarding, plans and subscription, account centre.
 * Server: /api/account, /api/account/profile, /api/billing/* (payments by Whop). Plan limits are enforced server-side;
 * any 402 response from the API opens the upgrade sheet with the reason. */
(()=>{
'use strict';
const Cloud=()=>window.ReplotreCloud,E=()=>window.ReplotreEditor;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico=(n,s)=>window.ReplotreIco?window.ReplotreIco(n,s):'';
const api=(u,o)=>Cloud().api(u,o);
const fmtBytes=b=>b>=1024**3?`${(b/1024**3).toFixed(b>=10*1024**3?0:1)} GB`:b>=1048576?`${Math.round(b/1048576)} MB`:`${Math.round(b/1024)} KB`;
const fmtDate=t=>t?new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
const money=(n,cur='usd')=>new Intl.NumberFormat(cur==='usd'?'en-US':undefined,{style:'currency',currency:cur.toUpperCase(),maximumFractionDigits:n%1?2:0}).format(n);

const brandMark=()=>{const m=document.querySelector('svg.r-mark');return m?m.outerHTML:ico('sparkles')};
const S={account:null,plans:null,mode:'off',interval:'year',ob:null,center:null,tab:'overview'};
const LABEL={
 role:{creator:'Content creator / YouTuber',social:'Social media manager',agency:'Marketing team / agency',freelance:'Freelance video editor',business:'Business owner',hobbyist:'Hobbyist',student:'Student',other:'Other'},
 goals:{shorts:'Short-form reels',youtube:'YouTube videos',ads:'Ads & promos',podcast:'Podcasts & interviews',tutorial:'Tutorials & explainers',realestate:'Property tours',events:'Events & weddings',brand:'Brand storytelling'},
 platforms:{tiktok:'TikTok',reels:'Instagram Reels',shorts:'YouTube Shorts',youtube:'YouTube',linkedin:'LinkedIn',x:'X'},
 cadence:{daily:'Every day',weekly:'Every week',monthly:'A few a month',occasional:'Now and then'},
 experience:{new:['New to editing','Guide me with templates and smart defaults'],some:['Comfortable','I know the basics and want speed'],pro:['Professional','Give me precision and every control']},
 team:{solo:'Just me',small:'2–5 people',mid:'6–20 people',large:'20+ people'},
 aspect:{'9:16':'Vertical','16:9':'Landscape','1:1':'Square','4:5':'Portrait'},
 captionStyle:{box:'Highlight box',karaoke:'Karaoke',script:'Script accent',minimal:'Minimal'}
};
const STEPS=[
 {id:'account',label:'Account'},
 {id:'about',label:'About you',title:'Who are you?',sub:'We’ll shape Replotre around how you work.'},
 {id:'work',label:'Your work',title:'What will you make?',sub:'Pick everything that applies. We’ll surface the right templates first.'},
 {id:'style',label:'Style',title:'Set your default look.',sub:'Your projects start here. Change it any time.'},
 {id:'experience',label:'Workflow',title:'How do you edit?',sub:'This tunes the amount of guidance you see.'},
 {id:'plan',label:'Plan',title:'Choose your plan.',sub:'Start free. Upgrade when you need more AI, storage or 1080p.'},
 {id:'ready',label:'Ready',title:'Your studio is ready.',sub:''}
];

/* ---------- Data ---------- */
async function loadAccount(){try{S.account=await api('/api/account')}catch{S.account=null}renderChip();return S.account}
async function loadPlans(){if(S.plans)return S.plans;try{const r=await fetch('/api/billing/plans',{credentials:'same-origin'}).then(r=>r.json());S.plans=r.plans;S.mode=r.mode}catch{S.plans=[]}return S.plans}
let saveTimer=0;
function saveProfile(patch,{step,complete}={}){S.ob&&Object.assign(S.ob.data,patch);clearTimeout(saveTimer);
 return new Promise(res=>{saveTimer=setTimeout(async()=>{try{S.account=await api('/api/account/profile',{method:'PUT',body:{profile:patch,step,complete}});renderChip()}catch(e){E()?.notify(e.message)}res()},complete?0:250)})}

/* ---------- Header chip ---------- */
function renderChip(){let chip=document.getElementById('planChip');const a=S.account;
 if(!a||!Cloud()?.isConnected?.()){chip?.remove();return}
 if(!chip){chip=document.createElement('button');chip.id='planChip';chip.type='button';chip.className='acct-chip';chip.addEventListener('click',()=>a&&!S.account.profile.onboardedAt?startOnboarding():openCenter('overview'));document.getElementById('cloudAccount')?.before(chip)}
 const done=!!a.profile.onboardedAt,step=Math.min(STEPS.length-1,Math.max(1,a.profile.step||1));
 if(!done){chip.className='acct-chip is-setup';chip.innerHTML=`<span class="acct-ring" style="--p:${Math.round(step/(STEPS.length-1)*100)}"></span><span>Finish setup</span>`;chip.title='Continue setting up your workspace';return}
 const paid=a.plan.id!=='free';chip.className=`acct-chip${paid?' is-paid':''}`;chip.innerHTML=paid?`${ico('sparkles')}<span>${esc(a.plan.name)}</span>`:`<span>Free</span><b>Upgrade</b>`;chip.title=paid?'Plan & billing':'See plans'}

/* ---------- Onboarding ---------- */
async function startOnboarding(fromStep){await Promise.all([S.account?null:loadAccount(),loadPlans()]);if(!S.account)return;
 const p=S.account.profile||{};const first=fromStep??Math.min(STEPS.length-1,Math.max(1,p.onboardedAt?1:(p.step||1)));
 S.ob={step:first,data:{...p},dir:1};
 let el=document.querySelector('.ob');if(!el){el=document.createElement('div');el.className='ob';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','obTitle');document.body.appendChild(el);el.addEventListener('click',onObClick);el.addEventListener('input',onObInput);el.addEventListener('keydown',onObKey);
  el._inert=[...document.body.children].filter(n=>n!==el&&!n.inert);for(const n of el._inert)n.inert=true;document.body.style.overflow='hidden'}
 renderOb()}
function closeOnboarding(){const el=document.querySelector('.ob');if(!el)return;for(const n of el._inert||[])n.inert=false;document.body.style.overflow='';el.remove();S.ob=null;renderChip()}
const sel=(k,v)=>Array.isArray(S.ob.data[k])?S.ob.data[k].includes(v):S.ob.data[k]===v;
function valid(step){const d=S.ob.data;switch(STEPS[step].id){case 'about':return !!d.role&&(d.role!=='other'||!!(d.roleOther||'').trim());case 'work':return (d.goals||[]).length>0;case 'style':return !!d.aspect;case 'experience':return !!d.experience&&!!d.team;default:return true}}
function recommend(){const d=S.ob?.data||S.account?.profile||{};if(d.team==='mid'||d.team==='large'||d.role==='agency'||(d.experience==='pro'&&d.cadence==='daily'))return 'pro';if(['daily','weekly'].includes(d.cadence)||['creator','social','freelance'].includes(d.role))return 'creator';return 'free'}
function chips(k,{multi=false,icons}={}){return `<div class="ob-chips" role="${multi?'group':'radiogroup'}" aria-label="${esc(k)}">${Object.entries(LABEL[k]).map(([v,l],i)=>`<button type="button" class="ob-chip${sel(k,v)?' is-on':''}" role="${multi?'checkbox':'radio'}" aria-checked="${sel(k,v)}" data-ob-pick="${k}" data-value="${v}" data-multi="${multi}">${icons?`<span class="ob-chip-ico">${ico(icons[v]||'check')}</span>`:''}<span>${esc(l)}</span>${multi?`<i class="ob-tick">${ico('check')}</i>`:''}</button>`).join('')}</div>`}
function stepBody(id){const d=S.ob.data;
 if(id==='about')return `<label class="ob-field"><span>What should we call you? <small>Optional</small></span><input type="text" maxlength="60" autocomplete="given-name" data-ob-text="name" value="${esc(d.name||'')}" placeholder="Your first name"></label>
  <div class="ob-group"><span class="ob-label">I'm a…</span>${chips('role')}</div>
  ${d.role==='other'?`<label class="ob-field ob-field-inline"><span>Tell us more</span><input type="text" maxlength="60" data-ob-text="roleOther" value="${esc(d.roleOther||'')}" placeholder="e.g. Teacher, musician, nonprofit"></label>`:''}`;
 if(id==='work')return `<div class="ob-group">${chips('goals',{multi:true,icons:{shorts:'monitor-play',youtube:'film',ads:'zap',podcast:'volume-2',tutorial:'captions',realestate:'layout',events:'sparkles',brand:'palette'}})}</div>
  <div class="ob-group"><span class="ob-label">Where do you publish?</span>${chips('platforms',{multi:true})}</div>
  <div class="ob-group"><span class="ob-label">How often?</span>${chips('cadence')}</div>`;
 if(id==='style'){const C=window.ReplotreTemplateCatalog;const favs=d.favoriteTemplates||[];const want=new Set(d.goals||[]);
  const tpls=(C?.TEMPLATES||[]).slice().sort((a,b)=>score(b,want)-score(a,want)).slice(0,8);
  return `<div class="ob-group"><span class="ob-label">Default frame</span><div class="ob-aspects" role="radiogroup" aria-label="Default frame">${Object.entries(LABEL.aspect).map(([v,l])=>{const [w,h]=v.split(':').map(Number),k=34/Math.max(w,h);return `<button type="button" class="ob-aspect${sel('aspect',v)?' is-on':''}" role="radio" aria-checked="${sel('aspect',v)}" data-ob-pick="aspect" data-value="${v}"><i style="width:${(w*k).toFixed(1)}px;height:${(h*k).toFixed(1)}px"></i><strong>${v}</strong><small>${l}</small></button>`}).join('')}</div></div>
   <div class="ob-group"><span class="ob-label">Caption style</span><div class="ob-captions" role="radiogroup" aria-label="Caption style">${Object.entries(LABEL.captionStyle).map(([v,l])=>`<button type="button" class="ob-cap ob-cap-${v}${sel('captionStyle',v)?' is-on':''}" role="radio" aria-checked="${sel('captionStyle',v)}" data-ob-pick="captionStyle" data-value="${v}"><span class="ob-cap-demo">${v==='box'?'make it <b>pop</b>':v==='karaoke'?'<b>every</b> word':v==='script'?'so <em>simple</em>':'clean & quiet'}</span><small>${l}</small></button>`).join('')}</div></div>
   ${tpls.length?`<div class="ob-group"><span class="ob-label">Favourite looks <small>Pick up to 3</small></span><div class="ob-tpls">${tpls.map(t=>`<button type="button" class="ob-tpl${favs.includes(t.id)?' is-on':''}" aria-pressed="${favs.includes(t.id)}" data-ob-tpl="${t.id}"><img src="/assets/templates/${esc(t.preview?.poster||t.id+'.jpg')}" alt="" loading="lazy" width="90" height="160"><span>${esc(t.name)}</span><i class="ob-tick">${ico('check')}</i></button>`).join('')}</div></div>`:''}`}
 if(id==='experience')return `<div class="ob-group"><div class="ob-cards" role="radiogroup" aria-label="Experience">${Object.entries(LABEL.experience).map(([v,[l,sub]],i)=>`<button type="button" class="ob-card${sel('experience',v)?' is-on':''}" role="radio" aria-checked="${sel('experience',v)}" data-ob-pick="experience" data-value="${v}"><span class="ob-card-level" aria-hidden="true">${'<i></i>'.repeat(i+1)}${'<i class="off"></i>'.repeat(2-i)}</span><strong>${l}</strong><small>${sub}</small></button>`).join('')}</div></div>
  <div class="ob-group"><span class="ob-label">Team size</span>${chips('team')}</div>`;
 if(id==='plan')return plansMarkup({compact:false,recommended:recommend(),context:'onboarding'});
 if(id==='ready'){const name=d.name?`, ${esc(d.name)}`:'';const favs=(d.favoriteTemplates||[]).map(x=>window.ReplotreTemplateCatalog?.get(x)?.name).filter(Boolean);
  const facts=[d.aspect&&[`${d.aspect} ${LABEL.aspect[d.aspect]}`,'Default frame'],d.captionStyle&&[LABEL.captionStyle[d.captionStyle],'Captions'],favs.length&&[favs.join(', '),'Templates pinned first'],[S.account?.plan?.name||'Free','Plan']].filter(Boolean);
  return `<div class="ob-ready"><div class="ob-ready-mark" aria-hidden="true">${ico('check')}</div><p class="ob-ready-lead">You're all set${name}. Here's what we tuned for you:</p><dl class="ob-facts">${facts.map(([v,k])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`}
 return ''}
function score(t,want){const map={shorts:['crimson','beat-keyword','pop-captions','neon-pulse','candlelit','interview-glow'],youtube:['cinematic-wide','documentary','editorial','motion-deck'],ads:['hero-float','quote-card','pop-captions'],podcast:['interview-glow','documentary','pop-captions'],tutorial:['motion-deck','pop-captions','editorial'],realestate:['property-reel','cinematic-wide'],events:['field-journal','cinematic-wide','candlelit'],brand:['editorial','hero-float','quote-card']};let n=0;for(const g of want)if(map[g]?.includes(t.id))n+=2;return n+(t.tag?1:0)}
function renderOb(){const el=document.querySelector('.ob');if(!el||!S.ob)return;const i=S.ob.step,st=STEPS[i],total=STEPS.length-1;const last=i===total;
 el.innerHTML=`<div class="ob-bg" aria-hidden="true"></div>
 <header class="ob-top"><span class="ob-brand" aria-hidden="true">${brandMark()}</span>
  <ol class="ob-steps">${STEPS.map((s,k)=>`<li class="${k<i?'is-done':k===i?'is-current':''}"><span>${k<i?ico('check'):''}${esc(s.label)}</span></li>`).join('')}</ol>
  <div class="ob-mstep" aria-hidden="true"><span>Step ${i} of ${total}</span><i style="--p:${(i/total*100).toFixed(1)}%"></i></div>
  ${last?'':`<button type="button" class="ob-skip" data-ob="skip">Skip for now</button>`}</header>
 <main class="ob-main ob-dir-${S.ob.dir>0?'next':'prev'}" data-step="${st.id}">
  <div class="ob-count" aria-hidden="true"><b>${String(i).padStart(2,'0')}</b><span>of ${String(total).padStart(2,'0')}</span></div>
  <div class="ob-content"><h1 id="obTitle" tabindex="-1">${esc(st.title)}</h1>${st.sub?`<p class="ob-sub">${esc(st.sub)}</p>`:''}
   <div class="ob-body">${stepBody(st.id)}</div>
   <div class="ob-actions">${i>1&&!last?`<button type="button" class="ob-back" data-ob="back">${ico('chevron-down')}<span>Back</span></button>`:''}
    ${st.id==='plan'?'':`<button type="button" class="ob-next" data-ob="next" ${valid(i)?'':'disabled'}><span>${last?'Open the studio':'Continue'}</span>${ico('arrow-up')}</button>`}
    ${st.id==='plan'?`<button type="button" class="ob-link" data-ob="next">Continue with ${esc(S.account?.plan?.id&&S.account.plan.id!=='free'?S.account.plan.name:'Free')}</button>`:''}
    ${!last&&st.id!=='plan'?`<span class="ob-hint" aria-hidden="true">press <kbd>Enter ↵</kbd></span>`:''}</div>
  </div></main>`;
 requestAnimationFrame(()=>{const h=el.querySelector('#obTitle');h?.focus({preventScroll:true});el.querySelector('.ob-main')?.scrollTo?.(0,0)})}
async function go(delta){const o=S.ob;if(!o)return;const next=o.step+delta;if(delta>0&&!valid(o.step))return;
 if(delta>0)await saveProfile({},{step:next});
 if(next>=STEPS.length){await saveProfile({},{step:STEPS.length-1,complete:true});applyPrefs();closeOnboarding();E()?.notify('Welcome to Replotre');return}
 if(STEPS[next].id==='ready')await saveProfile({},{step:next,complete:true});
 o.dir=delta;o.step=Math.max(1,next);renderOb()}
function applyPrefs(){const d=S.account?.profile||S.ob?.data||{};try{localStorage.setItem('replotre_prefs',JSON.stringify({aspect:d.aspect,captionStyle:d.captionStyle,favoriteTemplates:d.favoriteTemplates||[]}))}catch{}
 const snap=E()?.snapshot?.();if(d.aspect&&snap&&!snap.clips?.length&&snap.aspect!==d.aspect)E().loadSavedEdit({...snap,aspect:d.aspect});window.ReplotreTemplates?.rerender?.()}
function onObClick(e){const b=e.target.closest('button');if(!b)return;const o=S.ob;
 if(b.dataset.ob==='next')return go(1);if(b.dataset.ob==='back')return go(-1);
 if(b.dataset.ob==='skip'){saveProfile({},{step:o.step});closeOnboarding();E()?.notify('You can finish setup any time from the header');return}
 if(b.dataset.obPick){const k=b.dataset.obPick,v=b.dataset.value;if(b.dataset.multi==='true'){const set=new Set(o.data[k]||[]);set.has(v)?set.delete(v):set.add(v);o.data[k]=[...set];saveProfile({[k]:o.data[k]})}else{o.data[k]=v;saveProfile({[k]:v})}
  const y=document.querySelector('.ob-main')?.scrollTop;renderOb();const m=document.querySelector('.ob-main');if(m&&y)m.scrollTop=y;document.querySelector(`[data-ob-pick="${k}"][data-value="${CSS.escape(v)}"]`)?.focus({preventScroll:true});
  if(!b.dataset.multi||b.dataset.multi==='false'){if(['about','experience'].includes(STEPS[o.step].id)&&k!=='role'&&valid(o.step)){}}return}
 if(b.dataset.obTpl){const id=b.dataset.obTpl;let f=o.data.favoriteTemplates||[];f=f.includes(id)?f.filter(x=>x!==id):[...f,id].slice(-3);o.data.favoriteTemplates=f;saveProfile({favoriteTemplates:f});const y=document.querySelector('.ob-main')?.scrollTop;renderOb();const m=document.querySelector('.ob-main');if(m&&y)m.scrollTop=y;document.querySelector(`[data-ob-tpl="${id}"]`)?.focus({preventScroll:true});return}
 if(b.dataset.plan)return choosePlan(b.dataset.plan,'onboarding');
 if(b.dataset.interval){S.interval=b.dataset.interval;const y=document.querySelector('.ob-main')?.scrollTop;renderOb();const m=document.querySelector('.ob-main');if(m&&y)m.scrollTop=y}}
function onObInput(e){const k=e.target.dataset.obText;if(!k)return;S.ob.data[k]=e.target.value;saveProfile({[k]:e.target.value});const n=document.querySelector('.ob-next');if(n)n.disabled=!valid(S.ob.step)}
function onObKey(e){if(e.key==='Enter'&&!e.isComposing&&!(e.target.tagName==='BUTTON')&&STEPS[S.ob.step].id!=='plan'){e.preventDefault();go(1)}
 if(e.key==='Escape'&&STEPS[S.ob.step].id!=='ready'){e.preventDefault();saveProfile({},{step:S.ob.step});closeOnboarding()}}

/* ---------- Plans ---------- */
function planPrice(p){const yearly=S.interval==='year';if(!p.price.month)return {main:money(0),note:'Free forever'};const per=yearly?p.price.year/12:p.price.month;return {main:money(Math.round(per*100)/100),note:yearly?`${money(p.price.year)} billed yearly`:'Billed monthly'}}
function plansMarkup({recommended,context,reason}={}){const plans=S.plans||[],cur=S.account?.plan?.id||'free',sub=S.account?.subscription;const save=plans.filter(p=>p.price.month).map(p=>Math.round((1-p.price.year/(p.price.month*12))*100));const maxSave=save.length?Math.max(...save):0;
 return `<div class="pl" data-context="${context}">
  ${reason?`<div class="pl-reason">${ico('zap')}<span>${esc(reason)}</span></div>`:''}
  <div class="pl-head"><div class="pl-toggle" role="radiogroup" aria-label="Billing period"><button type="button" role="radio" aria-checked="${S.interval==='month'}" data-interval="month">Monthly</button><button type="button" role="radio" aria-checked="${S.interval==='year'}" data-interval="year">Yearly${maxSave?` <em>Save ${maxSave}%</em>`:''}</button></div>
   ${S.mode==='test'?`<span class="pl-test" title="No card is charged. Add WHOP_API_KEY to take payments.">${ico('shield-check')}Test mode, no charge</span>`:S.mode==='off'?`<span class="pl-test">Payments are not configured</span>`:`<span class="pl-secure">${ico('shield-check')}Secure checkout by Whop</span>`}</div>
  <div class="pl-grid">${plans.map(p=>{const pr=planPrice(p),isCur=p.id===cur,rec=p.id===recommended&&!isCur,locked=sub?.provider==='whop'&&cur!=='free'&&!isCur,can=p.purchasable?.[S.interval]!==false&&S.mode!=='off'&&!locked;
   return `<article class="pl-card${isCur?' is-current':''}${rec||(!recommended&&p.popular&&!isCur)?' is-featured':''}">
    ${isCur?'<span class="pl-flag">Current plan</span>':rec?'<span class="pl-flag is-rec">Recommended for you</span>':p.popular&&!recommended?'<span class="pl-flag is-rec">Most popular</span>':''}
    <div class="pl-name"><strong>${esc(p.name)}</strong><small>${esc(p.tagline)}</small></div>
    <div class="pl-price"><b>${pr.main}</b>${p.price.month?'<span>/mo</span>':''}</div><p class="pl-note">${esc(pr.note)}</p>
    <button type="button" class="pl-cta${rec&&!isCur?' is-primary':''}${isCur?' is-current':''}" data-plan="${p.id}" ${isCur&&(!sub||sub.interval===S.interval||p.id==='free'||sub.provider==='whop')||!can?'disabled':''}>${isCur?(p.id!=='free'&&sub&&sub.interval!==S.interval&&sub.provider!=='whop'?`Switch to ${S.interval}ly`:'Current plan'):locked?'Cancel current plan to switch':!can?'Unavailable':p.id==='free'?'Downgrade':cur!=='free'&&planIndex(p.id)<planIndex(cur)?`Switch to ${esc(p.name)}`:`Get ${esc(p.name)}`}</button>
    <ul class="pl-feat">${p.features.map(f=>`<li>${ico('check')}<span>${esc(f)}</span></li>`).join('')}</ul></article>`}).join('')}</div>
  <p class="pl-foot">Prices in USD. Payments are handled by Whop. Cancel any time; paid features stay on until the end of the period.</p></div>`}
const planIndex=id=>(S.plans||[]).findIndex(p=>p.id===id);
async function choosePlan(planId,context){const btns=document.querySelectorAll(`[data-plan="${planId}"]`);btns.forEach(b=>{b.disabled=true;b.dataset.label=b.innerHTML;b.innerHTML='<span class="acct-spin"></span>'});
 try{const r=await api('/api/billing/checkout',{method:'POST',body:{plan:planId,interval:S.interval}});
  if(r.url){sessionStorage.setItem('replotre_billing_ctx',context);
   if(r.redirects!==false){location.assign(r.url);return}
   // Local/http: Whop can't send the buyer back, so checkout opens in a new tab and we watch for the membership.
   window.open(r.url,'_blank','noopener');btns.forEach(b=>{b.innerHTML='<span class="acct-spin"></span>Waiting for payment…'});awaitCheckout(context);return}
  if(r.account){S.account=r.account;renderChip();E()?.notify(planId==='free'?'You are on the Free plan':`${S.account.plan.name} is active${r.test?' (test mode)':''}`);
   if(context==='onboarding'){S.ob.dir=1;S.ob.step=STEPS.findIndex(s=>s.id==='ready');await saveProfile({},{step:S.ob.step,complete:true});renderOb()}else renderCenter()}}
 catch(e){E()?.notify(e.message);btns.forEach(b=>{b.disabled=false;b.innerHTML=b.dataset.label||'Choose'})}}

/* ---------- Account centre ---------- */
const TABS=[['overview','Overview','grid'],['plans','Plans','sparkles'],['billing','Billing','file-json'],['profile','Profile','pencil'],['security','Security','shield-check']];
async function openCenter(tab='overview',reason){await Promise.all([loadAccount(),loadPlans()]);if(!S.account)return Cloud()?.openAccount?.();S.tab=tab;S.reason=reason||'';
 let el=document.querySelector('.ac');if(!el){el=document.createElement('div');el.className='ac';el.innerHTML=`<div class="ac-backdrop" data-ac="close"></div><section class="ac-sheet" role="dialog" aria-modal="true" aria-label="Account" tabindex="-1"></section>`;document.body.appendChild(el);el.addEventListener('click',onCenterClick);el.addEventListener('submit',onCenterSubmit);
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();closeCenter()}};document.addEventListener('keydown',onKey);el._onKey=onKey;el._opener=document.activeElement;
  el._inert=[...document.body.children].filter(n=>n!==el&&!n.inert);for(const n of el._inert)n.inert=true;document.body.style.overflow='hidden'}
 renderCenter();el.querySelector('.ac-sheet').focus({preventScroll:true})}
function closeCenter(){const el=document.querySelector('.ac');if(!el)return;document.removeEventListener('keydown',el._onKey);for(const n of el._inert||[])n.inert=false;document.body.style.overflow='';el.remove();el._opener?.focus?.({preventScroll:true})}
function meter(label,used,limit,fmt=x=>x){const pct=Math.min(100,limit?used/limit*100:0);return `<div class="ac-meter${pct>=90?' is-hot':pct>=70?' is-warm':''}"><div class="ac-meter-top"><span>${esc(label)}</span><b>${esc(fmt(used))} <small>/ ${esc(fmt(limit))}</small></b></div><i><em style="width:${pct.toFixed(1)}%"></em></i></div>`}
function centerBody(){const a=S.account,ent=a.entitlements,u=a.usage,sub=a.subscription,plan=(S.plans||[]).find(p=>p.id===a.plan.id);
 if(S.tab==='overview'){const prof=a.profile,steps=STEPS.length-1,step=prof.onboardedAt?steps:Math.max(0,(prof.step||1)-1);
  return `<div class="ac-plan-hero"><div><span class="ac-kicker">Current plan</span><h3>${esc(a.plan.name)}${sub?.provider==='test'?' <em>Test</em>':''}</h3><p>${sub&&a.plan.id!=='free'?(sub.cancelAtPeriodEnd?`Ends ${fmtDate(sub.currentPeriodEnd)}`:`Renews ${fmtDate(sub.currentPeriodEnd)} · ${sub.interval==='year'?'Yearly':'Monthly'}`):esc(plan?.tagline||'')}${sub?.status==='past_due'?' · <b class="ac-warn">Payment failed</b>':''}</p></div>
   <button type="button" class="ac-btn ${a.plan.id==='free'?'is-primary':''}" data-ac-tab="plans">${a.plan.id==='free'?'Upgrade':'Change plan'}</button></div>
   <h4 class="ac-h">Usage</h4><div class="ac-meters">${meter('AI requests today',u.aiToday,ent.aiDaily)}${meter('Cloud storage',u.storageBytes,ent.maxStorageBytes,fmtBytes)}${meter('Projects',u.projects,ent.projects)}</div>
   <div class="ac-limits"><div><span>Export</span><b>${ent.maxExport}p</b></div><div><span>Max upload</span><b>${fmtBytes(ent.maxFileBytes)}</b></div><div><span>Video length</span><b>${ent.renderMinutes} min</b></div><div><span>Exports, 30 days</span><b>${u.rendersMonth}</b></div></div>
   ${prof.onboardedAt?'':`<button type="button" class="ac-setup" data-ac="setup"><span class="acct-ring" style="--p:${Math.round(step/steps*100)}"></span><span><strong>Finish setting up</strong><small>${step} of ${steps} steps done</small></span>${ico('chevron-down')}</button>`}`}
 if(S.tab==='plans')return plansMarkup({recommended:a.plan.id==='free'?recommend():null,context:'center',reason:S.reason});
 if(S.tab==='billing'){const can=S.mode==='whop'&&sub?.provider==='whop';
  return `<div class="ac-card"><div class="ac-row"><div><span class="ac-kicker">Subscription</span><strong>${esc(a.plan.name)}${sub?.interval&&a.plan.id!=='free'?` · ${sub.interval==='year'?'Yearly':'Monthly'}`:''}</strong><small>${a.plan.id==='free'?'No active subscription':sub?.cancelAtPeriodEnd?`Cancels on ${fmtDate(sub.currentPeriodEnd)}`:sub?.currentPeriodEnd?`Next renewal ${fmtDate(sub.currentPeriodEnd)}`:'Active'}</small></div>
   <div class="ac-row-actions">${a.plan.id!=='free'?(sub?.cancelAtPeriodEnd?`<button type="button" class="ac-btn is-primary" data-ac="resume">Resume plan</button>`:`<button type="button" class="ac-btn is-quiet" data-ac="cancel">Cancel plan</button>`):`<button type="button" class="ac-btn is-primary" data-ac-tab="plans">See plans</button>`}</div></div>
   ${sub?.status==='past_due'?`<p class="ac-note ac-note-warn">${ico('alert-triangle')} Your last payment failed. Update your payment method on Whop to keep your plan.</p>`:''}
   ${sub?.provider==='test'?`<p class="ac-note">${ico('shield-check')} This plan was activated in test mode. No card was charged.</p>`:''}</div>
   <h4 class="ac-h">Payments & receipts</h4>
   ${can?`<div class="ac-card ac-whop"><div class="ac-row"><div><strong>Managed by Whop</strong><small>Update your card, download receipts and see every payment in your Whop billing page.</small></div><button type="button" class="ac-btn" data-ac="portal">${ico('link')} Manage on Whop</button></div></div>`:`<p class="ac-empty">${S.mode==='whop'?'Receipts appear in your Whop billing page after your first payment.':S.mode==='test'?'Test mode: no payments are taken, so there are no receipts.':'Payments are not configured on this server.'}</p>`}`}
 if(S.tab==='profile'){const p=a.profile;const sel1=(k)=>`<select name="${k}"><option value="">—</option>${Object.entries(LABEL[k]).map(([v,l])=>`<option value="${v}" ${p[k]===v?'selected':''}>${esc(Array.isArray(l)?l[0]:l)}</option>`).join('')}</select>`;
  return `<form class="ac-form" data-form="profile"><label><span>Name</span><input name="name" maxlength="60" value="${esc(p.name||'')}" autocomplete="given-name"></label>
   <div class="ac-grid2"><label><span>Role</span>${sel1('role')}</label><label><span>Experience</span>${sel1('experience')}</label><label><span>Team</span>${sel1('team')}</label><label><span>Publishing</span>${sel1('cadence')}</label><label><span>Default frame</span>${sel1('aspect')}</label><label><span>Captions</span>${sel1('captionStyle')}</label></div>
   <fieldset><legend>What you make</legend><div class="ac-checks">${Object.entries(LABEL.goals).map(([v,l])=>`<label><input type="checkbox" name="goals" value="${v}" ${(p.goals||[]).includes(v)?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div></fieldset>
   <fieldset><legend>Platforms</legend><div class="ac-checks">${Object.entries(LABEL.platforms).map(([v,l])=>`<label><input type="checkbox" name="platforms" value="${v}" ${(p.platforms||[]).includes(v)?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div></fieldset>
   <div class="ac-form-foot"><button type="button" class="ac-btn is-quiet" data-ac="setup">Re-run setup</button><button type="submit" class="ac-btn is-primary">Save profile</button></div></form>`}
 if(S.tab==='security')return `<div class="ac-card"><div class="ac-row"><div><span class="ac-kicker">Signed in as</span><strong>${esc(a.user.email)}</strong><small>Member since ${fmtDate(a.user.createdAt)}</small></div><button type="button" class="ac-btn is-quiet" data-ac="signout">Sign out</button></div></div>
  <form class="ac-form" data-form="password"><h4 class="ac-h">Change password</h4><label><span>Current password</span><input type="password" name="current" autocomplete="current-password" required></label><label><span>New password <small>12+ characters</small></span><input type="password" name="next" autocomplete="new-password" minlength="12" maxlength="128" required></label><div class="ac-form-foot"><button type="submit" class="ac-btn is-primary">Update password</button></div></form>`;
 return ''}
function renderCenter(){const el=document.querySelector('.ac-sheet');if(!el||!S.account)return;const a=S.account;const initial=(a.profile.name||a.user.email)[0].toUpperCase();
 el.innerHTML=`<header class="ac-top"><div class="ac-id"><span class="ac-avatar">${esc(initial)}</span><div><strong>${esc(a.profile.name||a.user.email.split('@')[0])}</strong><small>${esc(a.user.email)}</small></div></div><button type="button" class="ac-x" data-ac="close" aria-label="Close">${ico('x')}</button></header>
 <nav class="ac-tabs" role="tablist">${TABS.map(([id,l,i])=>`<button type="button" role="tab" aria-selected="${S.tab===id}" data-ac-tab="${id}">${ico(i)}<span>${l}</span></button>`).join('')}</nav>
 <div class="ac-body" role="tabpanel">${centerBody()}</div>`}
async function onCenterClick(e){const b=e.target.closest('[data-ac],[data-ac-tab],[data-plan],[data-interval]');if(!b)return;
 if(b.dataset.acTab){S.tab=b.dataset.acTab;if(S.tab!=='plans')S.reason='';renderCenter();return}
 if(b.dataset.plan)return choosePlan(b.dataset.plan,'center');
 if(b.dataset.interval){S.interval=b.dataset.interval;renderCenter();return}
 const act=b.dataset.ac;
 if(act==='close')return closeCenter();
 if(act==='setup'){closeCenter();return startOnboarding(1)}
 if(act==='signout'){try{await Cloud().saveNow?.();await api('/api/auth/logout',{method:'POST'})}catch{}location.reload();return}
 if(act==='portal'){b.disabled=true;try{const r=await api('/api/billing/portal',{method:'POST'});window.open(r.url,'_blank','noopener');sessionStorage.setItem('replotre_portal_open','1')}catch(err){E()?.notify(err.message)}b.disabled=false;return}
 if(act==='cancel'||act==='resume'){b.disabled=true;try{const r=await api('/api/billing/cancel',{method:'POST',body:{resume:act==='resume'}});S.account=r.account;renderChip();renderCenter();E()?.notify(act==='resume'?'Your plan will keep renewing':'Your plan stays active until the end of the period')}catch(err){E()?.notify(err.message);b.disabled=false}}}
async function onCenterSubmit(e){e.preventDefault();const f=e.target,btn=f.querySelector('[type=submit]');btn.disabled=true;
 try{if(f.dataset.form==='profile'){const fd=new FormData(f),profile={name:fd.get('name'),goals:fd.getAll('goals'),platforms:fd.getAll('platforms')};for(const k of ['role','experience','team','cadence','aspect','captionStyle'])profile[k]=fd.get(k)||null;S.account=await api('/api/account/profile',{method:'PUT',body:{profile}});applyPrefs();renderCenter();E()?.notify('Profile saved')}
  if(f.dataset.form==='password'){const fd=new FormData(f);await api('/api/auth/password',{method:'POST',body:{currentPassword:fd.get('current'),newPassword:fd.get('next')}});f.reset();E()?.notify('Password updated')}}
 catch(err){E()?.notify(err.message)}finally{btn.disabled=false}}

async function awaitCheckout(context){E()?.notify('Finish payment in the Whop tab. Your plan unlocks here automatically.');const t0=Date.now(),before=S.account?.plan?.id||'free';
 while(Date.now()-t0<10*60000){await new Promise(r=>setTimeout(r,document.visibilityState==='visible'?3000:6000));let a;try{a=(await api('/api/billing/refresh',{method:'POST'})).account}catch{continue}
  if(a?.plan?.id&&a.plan.id!=='free'&&a.plan.id!==before){S.account=a;renderChip();E()?.notify(`Welcome to ${a.plan.name}`);if(context==='onboarding'&&S.ob){S.ob.dir=1;S.ob.step=STEPS.findIndex(s=>s.id==='ready');await saveProfile({},{step:S.ob.step,complete:true});renderOb()}else renderCenter();return}}
 E()?.notify('Still waiting on Whop. Your plan unlocks as soon as the payment is confirmed.');document.querySelectorAll('[data-plan]').forEach(b=>{b.disabled=false});renderCenter()}
/* ---------- Upgrade prompt, billing return, lifecycle ---------- */
function upgrade({message}={}){if(!Cloud()?.isConnected?.())return;openCenter('plans',message||'Upgrade to unlock this')}
async function billingReturn(){const u=new URL(location.href),state=u.searchParams.get('billing');if(!state)return;
 u.searchParams.delete('billing');u.searchParams.delete('session_id');history.replaceState(history.state,'',u.pathname+u.search+u.hash);const ctx=sessionStorage.getItem('replotre_billing_ctx');sessionStorage.removeItem('replotre_billing_ctx');
 if(state==='success'){const before=S.account?.plan?.id||'free';E()?.notify('Payment received. Activating your plan…');
  // Whop confirms the membership by webhook; wait for it (up to ~40s), refreshing from Whop as we go.
  for(let i=0;i<20;i++){try{S.account=(await api('/api/billing/refresh',{method:'POST'})).account}catch{}if(S.account?.plan?.id&&S.account.plan.id!=='free'&&S.account.plan.id!==before||S.account?.subscription?.provider==='whop'&&S.account.plan.id!=='free')break;await new Promise(r=>setTimeout(r,2000))}
  renderChip();const ok=S.account?.plan?.id&&S.account.plan.id!=='free';E()?.notify(ok?`Welcome to ${S.account.plan.name}`:'Your payment is processing. Your plan unlocks as soon as Whop confirms it.');
  if(ctx==='onboarding'&&!S.account?.profile?.onboardedAt)startOnboarding(STEPS.findIndex(s=>s.id==='ready'));else openCenter(ok?'overview':'billing')}
 else if(state==='cancel'){E()?.notify('Checkout cancelled. Nothing was charged.');if(ctx==='onboarding')startOnboarding(STEPS.findIndex(s=>s.id==='plan'))}
 else if(state==='return'){try{S.account=(await api('/api/billing/refresh',{method:'POST'})).account}catch{await loadAccount()}renderChip();openCenter('billing')}}
let wasConnected=false;
async function onConnection(){const c=!!Cloud()?.isConnected?.();if(c===wasConnected)return;wasConnected=c;if(!c){S.account=null;renderChip();return}
 await loadAccount();if(!S.account)return;
 if(new URL(location.href).searchParams.get('billing'))return billingReturn();
 const fresh=sessionStorage.getItem('replotre_new_account')==='1';sessionStorage.removeItem('replotre_new_account');
 if(!S.account.profile.onboardedAt&&(fresh||!sessionStorage.getItem('replotre_ob_seen'))){sessionStorage.setItem('replotre_ob_seen','1');startOnboarding()}}
window.addEventListener('replotre:cloud',onConnection);
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState!=='visible'||!sessionStorage.getItem('replotre_portal_open'))return;sessionStorage.removeItem('replotre_portal_open');try{S.account=(await api('/api/billing/refresh',{method:'POST'})).account;renderChip();renderCenter()}catch{}});
window.addEventListener('replotre:ready',()=>setTimeout(onConnection,800),{once:true});
window.ReplotreAccount={open:openCenter,openPlans:reason=>openCenter('plans',reason),upgrade,startOnboarding,refresh:loadAccount,get:()=>S.account};
})();
