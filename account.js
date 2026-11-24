/* Replotre Account — onboarding, plans and subscription, account centre.
 * Server: /api/account, /api/account/profile, /api/billing/* (payments by Whop). Plan limits are enforced server-side;
 * any 402 response from the API opens the upgrade sheet with the reason. */
(()=>{
'use strict';
const Cloud=()=>window.ReplotreCloud,E=()=>window.ReplotreEditor;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICO_FB={'alert-triangle':'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>','arrow-up':'<path d="m6 12 6-6 6 6M12 6v13"/>','captions':'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 10h4m4 0h4M6 14h8m2 0h2"/>','check':'<path d="m4 12 5 5L20 6"/>','chevron-down':'<path d="m6 9 6 6 6-6"/>','eye':'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>','link':'<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l2-2"/>','shield-check':'<path d="M12 2 4 5v7c0 5 3 8 8 10 5-2 8-5 8-10V5l-8-3Zm-4 10 3 3 5-6"/>','sparkles':'<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16ZM19 2l.7 1.3L21 4l-1.3.7L19 6l-.7-1.3L17 4l1.3-.7L19 2Z"/>','wand-sparkles':'<path d="m4 20 13-13 3 3L7 23l-3-3ZM14 4l1-3 1 3 3 1-3 1-1 3-1-3-3-1 3-1ZM4 7l.5-2L5 7l2 .5L5 8l-.5 2L4 8l-2-.5 2-.5Z"/>','x':'<path d="M18 6 6 18M6 6l12 12"/>','zap':'<path d="m13 2-9 12h7l-1 8 10-12h-7V2Z"/>','grid':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>','play':'<path d="m7 4 13 8-13 8V4Z" fill="currentColor" stroke="none"/>','cloud-upload':'<path d="M12 16V8m-4 4 4-4 4 4M3 17a4.5 4.5 0 0 1 2-8 7 7 0 0 1 14 1 4 4 0 0 1-1 8H5"/>','image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>','clapperboard':'<path d="M3 9h18v12H3V9ZM3 9V5l17-3 1 7M8 5l3 4m3-5 3 5"/>','sliders-horizontal':'<path d="M3 6h12m4 0h2M3 12h4m4 0h10M3 18h12m4 0h2"/><circle cx="17" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'};
// Uses the studio's icon set when it's loaded; this script also runs first (before the editor) so sign-up shows sooner.
const ico=(n,s)=>window.ReplotreIco?window.ReplotreIco(n,s):`<svg ${s?`width="${s}" height="${s}"`:''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO_FB[n]||ICO_FB.sparkles}</svg>`;
const api=async(u,o={})=>{if(Cloud()?.api)return Cloud().api(u,o);const r=await fetch(u,{method:o.method||'GET',credentials:'same-origin',headers:{'X-Replotre-Client':'studio',...(o.body?{'Content-Type':'application/json'}:{})},body:o.body?JSON.stringify(o.body):undefined});let d={};try{d=await r.json()}catch{}if(!r.ok){const e=Error(d.error||`Request failed (${r.status})`);e.status=r.status;e.feature=d.feature;throw e}return d};
const fmtBytes=b=>b>=1024**3?`${(b/1024**3).toFixed(b>=10*1024**3?0:1)} GB`:b>=1048576?`${Math.round(b/1048576)} MB`:`${Math.round(b/1024)} KB`;
const fmtDate=t=>t?new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
const money=(n,cur='usd')=>new Intl.NumberFormat(cur==='usd'?'en-US':undefined,{style:'currency',currency:cur.toUpperCase(),maximumFractionDigits:n%1?2:0}).format(n);

const brandMark=()=>{const m=document.querySelector('svg.r-mark');return m?m.outerHTML:ico('sparkles')};
const S={authMode:'register',status:null,gated:false,account:null,plans:null,mode:'off',interval:'year',ob:null,center:null,tab:'overview'};
const LABEL={
 role:{creator:'Creator',social:'Social media',agency:'Agency / team',freelance:'Freelance editor',business:'Business owner',hobbyist:'Hobbyist',student:'Student',other:'Other'},
 goals:{shorts:'Short reels',youtube:'YouTube',ads:'Ads & promos',podcast:'Podcasts',tutorial:'Tutorials',realestate:'Property tours',events:'Events',brand:'Brand stories'},
 platforms:{tiktok:'TikTok',reels:'Instagram',shorts:'Shorts',youtube:'YouTube',linkedin:'LinkedIn',x:'X'},
 cadence:{daily:'Daily',weekly:'Weekly',monthly:'Monthly',occasional:'Rarely'},
 experience:{new:['New to editing','Guide me with templates and smart defaults'],some:['Comfortable','I know the basics and want speed'],pro:['Professional','Give me precision and every control']},
 team:{solo:'Just me',small:'2–5',mid:'6–20',large:'20+'},
 aspect:{'9:16':'Vertical','16:9':'Landscape','1:1':'Square','4:5':'Portrait'},
 captionStyle:{box:'Highlight box',karaoke:'Karaoke',script:'Script accent',minimal:'Minimal'}
};
const STEPS=[
 {id:'account',label:'Sign up',title:'Create your account.',sub:'Your projects, media and plan live in your Replotre account. It takes a minute.'},
 {id:'about',label:'About you',title:'Who are you?',sub:'We’ll tailor the studio to you.'},
 {id:'work',label:'Your work',title:'What will you make?',sub:'Pick all that apply.'},
 {id:'style',label:'Style',title:'Your default look',sub:'Change it any time in the studio.'},
 {id:'plan',label:'Plan',title:'Choose your plan',sub:'Start free. Upgrade any time.'},
 {id:'ready',label:'Ready',title:'Your studio is ready.',sub:''}
];

/* ---------- Data ---------- */
async function loadAccount(){try{S.account=await api('/api/account')}catch{S.account=null}renderChip();return S.account}
async function loadPlans(){if(S.plans)return S.plans;const pre=window.__rpPre?.plans;if(pre){window.__rpPre.plans=null;const r=await pre;if(r?.plans){S.plans=r.plans;S.mode=r.mode;return S.plans}}try{const r=await fetch('/api/billing/plans',{credentials:'same-origin'}).then(r=>r.json());S.plans=r.plans;S.mode=r.mode}catch{S.plans=[]}return S.plans}
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
function ensureOb(){let el=document.querySelector('.ob');if(!el){el=document.createElement('div');el.className='ob';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','obTitle');document.body.appendChild(el);el.addEventListener('click',onObClick);el.addEventListener('input',onObInput);el.addEventListener('keydown',onObKey);el.addEventListener('submit',onAuthSubmit);el.addEventListener('focusout',e=>{if(e.target.id==='auEmail'&&!e.relatedTarget?.matches?.('[data-ob=fix-email]'))checkEmailField(e.target,true)});
  el._inert=[...document.body.children].filter(n=>n!==el&&!n.inert);for(const n of el._inert)n.inert=true;document.body.style.overflow='hidden'}return el}
async function startOnboarding(fromStep){await Promise.all([S.account?null:loadAccount(),loadPlans()]);if(!S.account)return;
 const p=S.account.profile||{};const first=fromStep??Math.min(STEPS.length-1,Math.max(1,p.onboardedAt?1:(p.step||1)));
 S.ob={step:first,data:{...p},dir:1,anim:true};ensureOb();renderOb();ungate()}
/* Account gate: the studio is for signed-in creators. Step 0 of the same flow is sign up / sign in. */
function startGate(){try{const e=localStorage.getItem('replotre_last_email'),m=localStorage.getItem('replotre_last_method');if(m==='google')S.authMode='login';else if(e&&!S.authEmail){S.authEmail=e;S.authMode='login'}}catch{}S.ob={step:0,data:{},dir:1,gate:true};ensureOb();renderOb();ungate()}
function ungate(){document.documentElement.classList.remove('rp-gate')}
function closeOnboarding(){const el=document.querySelector('.ob');ungate();if(!el)return;for(const n of el._inert||[])n.inert=false;document.body.style.overflow='';el.remove();S.ob=null;renderChip()}
const sel=(k,v)=>Array.isArray(S.ob.data[k])?S.ob.data[k].includes(v):S.ob.data[k]===v;
function valid(step){const d=S.ob.data;switch(STEPS[step].id){case 'about':return !!d.role&&(d.role!=='other'||!!(d.roleOther||'').trim());case 'work':return (d.goals||[]).length>0;case 'style':return !!d.aspect;case 'experience':return !!d.experience&&!!d.team;default:return true}}
function recommendWhy(){const d=S.ob?.data||S.account?.profile||{},p=recommend(),cad={daily:'every day',weekly:'every week'}[d.cadence];
 if(p==='pro')return d.team==='mid'||d.team==='large'?'you edit with a team':d.role==='agency'?'you work for clients as an agency':'you publish daily at a professional level';
 if(p==='creator')return cad?`you publish ${cad}`:`you're a ${({social:'social media manager',agency:'marketing team',freelance:'freelance editor',business:'business owner'})[d.role]||(LABEL.role[d.role]||'creator').toLowerCase()}`;
 return ''}
function recommend(){const d=S.ob?.data||S.account?.profile||{};if(d.role==='agency'||d.team==='mid'||d.team==='large')return 'pro';if(['creator','social','freelance'].includes(d.role)||['daily','weekly'].includes(d.cadence))return 'creator';return 'free'}
function chips(k,{multi=false,icons}={}){return `<div class="ob-chips" data-set="${k}" role="${multi?'group':'radiogroup'}" aria-label="${esc(k)}">${Object.entries(LABEL[k]).map(([v,l],i)=>`<button type="button" class="ob-chip${sel(k,v)?' is-on':''}" role="${multi?'checkbox':'radio'}" aria-checked="${sel(k,v)}" data-ob-pick="${k}" data-value="${v}" data-multi="${multi}">${icons?`<span class="ob-chip-ico">${ico(icons[v]||'check')}</span>`:''}<span>${esc(l)}</span>${multi?`<i class="ob-tick">${ico('check')}</i>`:''}</button>`).join('')}</div>`}
const AU_I={mail:'<svg class="au-fi" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',lock:'<svg class="au-fi" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',wand:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20 14 10"/></svg>'};
const MAIL_DOMAINS=['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','live.com','proton.me','protonmail.com','aol.com','yahoo.in','rediffmail.com','me.com','msn.com'];
function editDist(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1),i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]?d[i-2][j-2]+1:99);return d[m][n]}
function emailSuggestion(v){const m=/^([^\s@]+)@([^\s@]+)$/.exec(v.trim().toLowerCase());if(!m)return '';const dom=m[2];if(MAIL_DOMAINS.includes(dom))return '';let best='',bd=3;for(const d of MAIL_DOMAINS){const x=editDist(dom,d);if(x<bd){bd=x;best=d}}return best&&bd<=2?`${m[1]}@${best}`:''}
function pwChecks(pw){return {len:pw.length>=12,case:/[a-z]/.test(pw)&&/[A-Z]/.test(pw),mix:/[\d\W_]/.test(pw)}}
function strongPassword(){const sets=['abcdefghijkmnpqrstuvwxyz','ABCDEFGHJKLMNPQRSTUVWXYZ','23456789','!@#$%&*?-_+='],all=sets.join(''),r=n=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n};
 let out=sets.map(x=>x[r(x.length)]);while(out.length<18)out.push(all[r(all.length)]);for(let i=out.length-1;i>0;i--){const j=r(i+1);[out[i],out[j]]=[out[j],out[i]]}return out.join('')}
function fieldMsg(name,text,kind='error',html=false){const f=document.querySelector(`.au-f[data-f="${name}"]`);if(!f)return;const m=f.querySelector('.au-msg');f.classList.toggle('is-error',!!text&&kind==='error');f.classList.toggle('is-tip',!!text&&kind==='tip');if(html)m.innerHTML=text;else m.textContent=text||'';f.querySelector('input')?.setAttribute('aria-invalid',String(!!text&&kind==='error'))}
function checkEmailField(inp,final){const v=inp.value.trim();if(!v){fieldMsg('email','');return}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){if(final)fieldMsg('email','Enter a full email address, like name@example.com.');else fieldMsg('email','');return}
 const sug=emailSuggestion(v);if(sug)fieldMsg('email',`Did you mean <button type="button" class="au-fix" data-ob="fix-email" data-v="${esc(sug)}">${esc(sug.split('@')[0])}@<b>${esc(sug.split('@')[1])}</b></button>?`,'tip',true);else fieldMsg('email','')}
const lastMethod=()=>{try{return localStorage.getItem('replotre_last_method')}catch{return null}};
function authBody(){const reg=S.authMode==='register',st=S.status||{},closed=reg&&st.signup===false;
 return `<div class="au-tabs" role="tablist" aria-label="Account">
   <button type="button" role="tab" aria-selected="${reg}" class="${reg?'is-on':''}" data-ob="auth-mode" data-mode="register">Create account</button>
   <button type="button" role="tab" aria-selected="${!reg}" class="${reg?'':'is-on'}" data-ob="auth-mode" data-mode="login">Sign in</button><i aria-hidden="true"></i></div>
 ${st.google?`<button type="button" class="au-google${lastMethod()==='google'?' has-last':''}" data-ob="google"><span class="au-g-chip" aria-hidden="true"><span class="au-g-spin"></span><svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg></span><span class="au-g-label">${reg?'Sign up with Google':'Continue with Google'}</span><span class="au-g-go" aria-hidden="true">${ico('arrow-up')}</span>${lastMethod()==='google'?'<em class="au-last"><i aria-hidden="true"></i>Last used</em>':''}</button>
 <div class="au-or" role="separator"><span>or ${reg?'sign up':'sign in'} with email</span></div>`:''}
 <form class="ob-auth" novalidate>
  ${closed?`<p class="ob-auth-note">${ico('shield-check')}<span>New sign-ups are paused right now. If you already have an account, sign in.</span></p>`:''}
  <div class="ob-field au-f" data-f="email"><label for="auEmail">Email</label><span class="au-input has-ico">${AU_I.mail}<input id="auEmail" type="email" name="email" autocomplete="${reg?'email':'username'}" inputmode="email" autocapitalize="off" spellcheck="false" required maxlength="254" placeholder="you@studio.com" aria-describedby="auEmailMsg" value="${esc(S.authEmail||'')}"><i class="au-ok" aria-hidden="true">${ico('check')}</i></span><p class="au-msg" id="auEmailMsg" aria-live="polite"></p></div>
  <div class="ob-field au-f" data-f="password"><span class="au-row"><label for="auPw">Password</label><small class="au-caps" hidden>Caps Lock is on</small>${reg?`<button type="button" class="au-suggest" data-ob="suggest">${AU_I.wand}Suggest strong password</button>`:''}</span>
   <span class="ob-pw au-input has-ico">${AU_I.lock}<input id="auPw" type="password" name="password" autocomplete="${reg?'new-password':'current-password'}" required minlength="${reg?12:1}" maxlength="128" placeholder="${reg?'At least 12 characters':'Your password'}" aria-describedby="auPwMsg${reg?' auReqs':''}"><button type="button" class="ob-pw-toggle" data-ob="pw" aria-label="Show password" aria-pressed="false">${ico('eye')}</button></span>
   ${reg?`<div class="au-meter"><span class="ob-strength" aria-hidden="true"><i></i><i></i><i></i><i></i></span><small class="ob-strength-label" aria-live="polite"></small></div>
   <ul class="au-reqs" id="auReqs" aria-label="Password requirements"><li data-r="len">${ico('check')}12+ chars</li><li data-r="case">${ico('check')}Upper &amp; lower</li><li data-r="mix">${ico('check')}Number or symbol</li></ul>`:''}
   <p class="au-msg" id="auPwMsg" aria-live="polite"></p></div>
  ${reg&&st.inviteRequired?`<label class="ob-field"><span>Invitation code</span><span class="au-input"><input type="text" name="invite" autocomplete="off" required maxlength="120" placeholder="From your invite email"></span></label>`:''}
  <p class="ob-auth-error" role="alert" hidden></p>
  <button type="submit" class="ob-next au-submit" ${closed?'disabled':''}><span>${reg?'Create account':'Sign in'}</span>${ico('arrow-up')}</button>
  ${reg?`<p class="ob-legal au-legal">${AU_I.lock}<span>Encrypted. By continuing you agree to our <a href="/terms" target="_blank" rel="noopener">Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</span></p>`:`<p class="ob-legal">Forgot your password? Email support from the address on your account and we'll reset it.</p>`}
 </form>`}
const WALL=['crimson','editorial','neon-pulse','candlelit','pop-captions','documentary','hero-float','field-journal','beat-keyword','cinematic-wide','motion-deck','quote-card'];
function wall(){if(document.documentElement.classList.contains('lite'))return '';const phone=!matchMedia('(min-width:721px)').matches;
 const cols=(phone?[0,1,2]:[0,1,2,3,4,5]).map(c=>[0,1,2,3].map(r=>(phone?WALL.slice(0,6):WALL)[(c*5+r*3)%(phone?6:WALL.length)]));
 return `<div class="au-wall${phone?' is-phone':''}" aria-hidden="true"><div class="au-wall-grid">${cols.map((col,c)=>`<div class="au-col" style="--d:${55+c%3*12}s;--o:${-(c*7)}s">${[...col,...col].map(id=>`<img src="/assets/templates/${id}.jpg" alt="" loading="lazy" decoding="async" width="360" height="640">`).join('')}</div>`).join('')}</div></div>`}
function renderAuth(el){const reg=S.authMode==='register';
 el.innerHTML=`<div class="ob-bg au-bg" aria-hidden="true"><i class="au-orb a"></i><i class="au-orb b"></i><i class="au-dots-bg"></i></div>${wall()}
 <main class="au-main" data-step="account" data-mode="${S.authMode}">
  <a class="au-brand" href="/" aria-label="Replotre home"><span class="ob-brand" aria-hidden="true">${brandMark()}</span><span class="au-word">replotre<b>.</b></span></a>
  <div class="au-center">
   <section class="au-card-wrap ob-content">
    ${reg?`<div class="au-steps" aria-label="Step 1 of ${STEPS.length}"><span class="au-dots" aria-hidden="true">${'<i></i>'.repeat(STEPS.length)}</span><span>Step 1 of ${STEPS.length}</span></div>`:''}
    <h1 id="obTitle" tabindex="-1">${reg?'Create your account':'Welcome back'}</h1>
    <p class="ob-sub">${reg?'Start editing in minutes. Free, no card needed.':'Sign in to pick up where you left off.'}</p>
    ${authBody()}
   </section>
   <ul class="au-feats-row" aria-label="What you get"><li>${ico('wand-sparkles')}<span>AI Director</span></li><li>${ico('captions')}<span>Auto captions</span></li><li>${ico('zap')}<span>Smart templates</span></li></ul>
  </div>
 </main>`;
 if(S.authError){const er=el.querySelector('.ob-auth-error');if(er){er.textContent=S.authError;er.hidden=false}S.authError=''}
 requestAnimationFrame(()=>{const em=el.querySelector('input[name=email]');(em&&!em.value?em:el.querySelector('input[name=password]'))?.focus({preventScroll:true});validateEmail(em)})}
function validateEmail(inp){if(!inp)return;inp.closest('.au-input')?.classList.toggle('is-ok',/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim()))}
const stepOf=id=>STEPS.findIndex(s=>s.id===id);
function readyBody(){const d=S.ob.data,C=window.ReplotreTemplateCatalog,[w,h]=(d.aspect||'9:16').split(':').map(Number),k=150/Math.max(w,h),cs=d.captionStyle||'box';
 const favs=(d.favoriteTemplates||[]).map(x=>C?.get(x)).filter(Boolean),plan=S.account?.plan||{id:'free',name:'Free'};
 const chips=(key)=>(d[key]||[]).map(x=>LABEL[key][x]).filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
 const edit=(id,label='Edit')=>`<button type="button" class="rd-edit" data-ob="edit" data-step="${stepOf(id)}">${esc(label)}</button>`;
 const row=(icon,label,val,id,btn)=>`<div class="rd-row"><span class="rd-ico">${ico(icon)}</span><div class="rd-val"><small>${label}</small><div>${val||'<i>Not set</i>'}</div></div>${btn??edit(id)}</div>`;
 const firstStart=['hobbyist','student'].includes(d.role)||d.experience==='new'?'sample':'upload';
 const starts=[['upload','cloud-upload','Import your footage','Drop in clips from your device'],['sample','play','Try a sample clip','See the AI Director on real footage'],['templates','grid','Browse templates',favs.length?`Starting with ${esc(favs[0].name)}`:'Pick a look to start from']];
 return `<div class="rd">
  <div class="rd-next"><p class="ob-label">Start with</p><div class="rd-starts">${starts.map(([a,i,t,sub])=>`<button type="button" class="rd-start${a===firstStart?' is-rec':''}" data-ob="finish" data-start="${a}"><span class="rd-start-ico">${ico(i)}</span><span><strong>${t}</strong><small>${sub}</small></span>${a===firstStart?'<em>Suggested</em>':''}</button>`).join('')}</div></div>
  <div class="rd-setup"><p class="ob-label">Your setup</p>
  <div class="rd-card">
   <div class="rd-stage" aria-hidden="true"><div class="obp-frame" style="--fw:${(w*k).toFixed(0)}px;--fh:${(h*k).toFixed(0)}px"><img src="/assets/templates/${esc(previewPoster(d))}.jpg" alt=""><span class="obp-cap obp-cap-${cs}">${CAP_DEMO[cs]}</span><span class="obp-ar">${esc(d.aspect||'9:16')}</span></div></div>
   <div class="rd-rows">
    ${row('image','Look',d.aspect?`<span>${esc(d.aspect)} ${esc(LABEL.aspect[d.aspect])}</span>${d.captionStyle?`<span>${esc(LABEL.captionStyle[d.captionStyle])} captions</span>`:''}`:'','style')}
    ${row('sparkles','Pinned templates',favs.length?`<span class="rd-thumbs">${favs.map(t=>`<img src="/assets/templates/${esc(t.id)}.jpg" alt="" title="${esc(t.name)}">`).join('')}</span><span class="rd-plain">${esc(favs.map(t=>t.name).join(', '))}</span>`:'','style')}
    ${row('clapperboard','You make',chips('goals'),'work')}
    ${row('shield-check','Plan',`<span class="${plan.id!=='free'?'is-paid':''}">${esc(plan.name)}</span>`,'plan',plan.id==='free'?`<button type="button" class="rd-edit is-up" data-ob="edit" data-step="${stepOf('plan')}">Upgrade</button>`:'')}
   </div>
  </div></div>
 </div>`}
function finishOnboarding(start){saveProfile({},{step:STEPS.length-1,complete:true});applyPrefs();closeOnboarding();
 const q=sel=>document.querySelector(sel);
 if(start==='upload')q('[data-action="upload"]')?.click();
 else if(start==='sample')q('[data-action="add-demo"][data-index="0"]')?.click();
 else if(start==='templates')q('.rail-item[data-tab="templates"]')?.click();
 E()?.notify(S.ob?.data?.name?`Welcome to Replotre, ${S.ob.data.name}`:'Welcome to Replotre')}
function stepBody(id){const d=S.ob.data;
 if(id==='account')return authBody();
 if(id==='about')return `<label class="ob-field"><span>What should we call you? <small>Optional</small></span><input type="text" maxlength="60" autocomplete="given-name" data-ob-text="name" value="${esc(d.name||'')}" placeholder="Your first name"></label>
  <div class="ob-group"><span class="ob-label">I'm a…</span>${chips('role')}</div>
  ${d.role==='other'?`<label class="ob-field ob-field-inline"><span>Tell us more</span><input type="text" maxlength="60" data-ob-text="roleOther" value="${esc(d.roleOther||'')}" placeholder="e.g. Teacher, musician, nonprofit"></label>`:''}`;
 if(id==='work')return `<div class="ob-group">${chips('goals',{multi:true,icons:{shorts:'monitor-play',youtube:'film',ads:'zap',podcast:'volume-2',tutorial:'captions',realestate:'layout',events:'sparkles',brand:'palette'}})}</div>`;
 if(id==='style'){const C=window.ReplotreTemplateCatalog;const favs=d.favoriteTemplates||[];const want=new Set(d.goals||[]);
  const tpls=(C?.TEMPLATES||[]).slice().sort((a,b)=>score(b,want)-score(a,want)).slice(0,8);
  return `<div class="ob-group"><span class="ob-label">Default frame</span><div class="ob-aspects" role="radiogroup" aria-label="Default frame">${Object.entries(LABEL.aspect).map(([v,l])=>{const [w,h]=v.split(':').map(Number),k=34/Math.max(w,h);return `<button type="button" class="ob-aspect${sel('aspect',v)?' is-on':''}" role="radio" aria-checked="${sel('aspect',v)}" data-ob-pick="aspect" data-value="${v}"><i style="width:${(w*k).toFixed(1)}px;height:${(h*k).toFixed(1)}px"></i><strong>${v}</strong><small>${l}</small></button>`}).join('')}</div></div>
   <div class="ob-group"><span class="ob-label">Caption style</span><div class="ob-captions" role="radiogroup" aria-label="Caption style">${Object.entries(LABEL.captionStyle).map(([v,l])=>`<button type="button" class="ob-cap ob-cap-${v}${sel('captionStyle',v)?' is-on':''}" role="radio" aria-checked="${sel('captionStyle',v)}" data-ob-pick="captionStyle" data-value="${v}"><span class="ob-cap-demo">${v==='box'?'make it <b>pop</b>':v==='karaoke'?'<b>every</b> word':v==='script'?'so <em>simple</em>':'clean & quiet'}</span><small>${l}</small></button>`).join('')}</div></div>`}
 if(id==='experience')return `<div class="ob-group"><div class="ob-cards" role="radiogroup" aria-label="Experience">${Object.entries(LABEL.experience).map(([v,[l,sub]],i)=>`<button type="button" class="ob-card${sel('experience',v)?' is-on':''}" role="radio" aria-checked="${sel('experience',v)}" data-ob-pick="experience" data-value="${v}"><span class="ob-card-level" aria-hidden="true">${'<i></i>'.repeat(i+1)}${'<i class="off"></i>'.repeat(2-i)}</span><strong>${l}</strong><small>${sub}</small></button>`).join('')}</div></div>
  <div class="ob-group"><span class="ob-label">Team size</span>${chips('team')}</div>`;
 if(id==='plan')return plansMarkup({compact:false,recommended:recommend(),context:'onboarding',why:recommendWhy()});
 if(id==='ready')return readyBody();
 return ''}
function score(t,want){const map={shorts:['crimson','beat-keyword','pop-captions','neon-pulse','candlelit','interview-glow'],youtube:['cinematic-wide','documentary','editorial','motion-deck'],ads:['hero-float','quote-card','pop-captions'],podcast:['interview-glow','documentary','pop-captions'],tutorial:['motion-deck','pop-captions','editorial'],realestate:['property-reel','cinematic-wide'],events:['field-journal','cinematic-wide','candlelit'],brand:['editorial','hero-float','quote-card']};let n=0;for(const g of want)if(map[g]?.includes(t.id))n+=2;return n+(t.tag?1:0)}
const CAP_DEMO={box:'make it <b>pop</b>',karaoke:'<b>every</b> word',script:'so <em>simple</em>',minimal:'clean &amp; quiet'};
const STEP_HINT={about:'You',work:'Makes',style:'Look',experience:'Level',plan:'Plan',ready:''};
function previewPoster(d){const C=window.ReplotreTemplateCatalog;const fav=(d.favoriteTemplates||[])[0];if(fav)return fav;
 const want=new Set(d.goals||[]);const best=(C?.TEMPLATES||[]).slice().sort((x,y)=>score(y,want)-score(x,want))[0];return best?.id||'crimson'}
function obSummary(d){const c=[];const n=(k,one,many)=>{const v=(d[k]||[]).length;if(v)c.push(v===1?LABEL[k][d[k][0]]:`${v} ${many}`)};
 if(d.aspect)c.push(`${d.aspect} ${LABEL.aspect[d.aspect]}`);if(d.captionStyle)c.push(LABEL.captionStyle[d.captionStyle]);n('goals','','formats');n('platforms','','platforms');
 if(d.cadence)c.push(LABEL.cadence[d.cadence]);if(d.experience)c.push(LABEL.experience[d.experience][0]);if(d.team)c.push(LABEL.team[d.team]);
 const ids=['about','work','style'],done=ids.filter(id=>valid(STEPS.findIndex(x=>x.id===id))).length,total=ids.length;
 return `<div class="obp-sum"><div class="obp-chips">${c.length?c.slice(0,4).map(x=>`<span>${esc(x)}</span>`).join('')+(c.length>4?`<span class="more">+${c.length-4}</span>`:''):'<em>Your picks will show up here</em>'}</div><span class="obp-prog" aria-label="${done} of ${total} sections done"><i style="--p:${(done/total*100).toFixed(0)}%"></i>${done}/${total}</span></div>`}
function obPreview(){const d=S.ob.data,i=S.ob.step,id=STEPS[i].id;
 const name=(d.name||'').trim(),role=d.role==='other'?(d.roleOther||'').trim()||'Other':LABEL.role[d.role]||'';
 const [w,h]=(d.aspect||'9:16').split(':').map(Number),k=250/Math.max(w,h),cs=d.captionStyle||'box',poster=previewPoster(d);
 const list=(key,max=3)=>{const v=(d[key]||[]).map(x=>LABEL[key][x]).filter(Boolean);return v.length?v.slice(0,max).map(x=>`<span>${esc(x)}</span>`).join('')+(v.length>max?`<span class="more">+${v.length-max}</span>`:''):''};
 const exp=d.experience?LABEL.experience[d.experience][0]:'',team=d.team?LABEL.team[d.team]:'';
 const row=(label,val,active)=>`<div class="obp-row${active?' is-active':''}${val?'':' is-empty'}"><dt>${label}</dt><dd>${val||'<i>Not set yet</i>'}</dd></div>`;
 const tpls=(d.favoriteTemplates||[]).map(x=>window.ReplotreTemplateCatalog?.get(x)?.name).filter(Boolean);
 return `<aside class="obp" aria-label="Your studio preview"><div class="obp-card">
  <div class="obp-head"><span class="obp-avatar" aria-hidden="true">${esc((name||'R')[0].toUpperCase())}</span><div><strong class="obp-name">${esc(name||'Your studio')}</strong><small>${esc(role||'Live preview')}</small></div><span class="obp-live" aria-hidden="true"><i></i>Live</span></div>
  <div class="obp-stage${id==='style'?' is-active':''}" aria-hidden="true"><div class="obp-frame" style="--fw:${(w*k).toFixed(0)}px;--fh:${(h*k).toFixed(0)}px"><img src="/assets/templates/${esc(poster)}.jpg" alt=""><span class="obp-cap obp-cap-${cs}">${CAP_DEMO[cs]}</span><span class="obp-ar">${esc(d.aspect||'9:16')}</span></div></div>
  <dl class="obp-facts">
   ${row('Makes',list('goals',4),id==='work')}
   ${row('Look',d.aspect?`<span>${esc(d.aspect)} ${esc(LABEL.aspect[d.aspect])}</span>${d.captionStyle?`<span>${esc(LABEL.captionStyle[d.captionStyle])}</span>`:''}${tpls.length?`<span>${esc(tpls.length)} favourite${tpls.length>1?'s':''}</span>`:''}`:'',id==='style')}
  </dl>${obSummary(d)}</div>
  <p class="obp-note">${ico('sparkles')}Everything here becomes your studio’s defaults. Change it any time.</p></aside>`}
function renderOb(){const el=document.querySelector('.ob');if(!el||!S.ob)return;const i=S.ob.step,st=STEPS[i],total=STEPS.length-1;const last=i===total;
 if(i===0)return renderAuth(el);
 const anim=S.ob.anim!==false;S.ob.anim=false;const side=!['plan','ready'].includes(st.id);
 el.innerHTML=`<div class="ob-bg obx-bg" aria-hidden="true"></div>
 <header class="ob-top obx-top"><span class="ob-brand" aria-hidden="true">${brandMark()}</span>
  <div class="obx-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${i}" aria-label="Setup progress">
   <div class="obx-label"><span>Step ${i} of ${total}</span><b>${esc(st.label)}</b></div>
   <div class="obx-segs" style="--n:${total}">${STEPS.slice(1).map((s,k)=>`<i class="${k+1<i||last?'is-done':k+1===i?'is-current':''}" title="${esc(s.label)}"></i>`).join('')}</div></div>
  ${last?'<span class="obx-spacer"></span>':`<button type="button" class="ob-skip obx-signout" data-ob="signout">${ico('link')}<span>Sign out</span></button>`}</header>
 <main class="ob-main obx-main${anim?` ob-dir-${S.ob.dir>0?'next':'prev'} is-anim`:''}" data-step="${st.id}">
  <div class="obx-grid${side?' has-side':''}">
   <section class="ob-content obx-content">${last?`<div class="rd-mark${anim?' is-anim':''}" aria-hidden="true">${ico('check')}${'<i></i>'.repeat(10)}</div>`:''}<p class="obx-kicker">${esc(st.label)}</p><h1 id="obTitle" tabindex="-1">${esc(last?((S.ob.data.name||'').trim()?`You’re all set, ${S.ob.data.name.trim()}.`:'You’re all set.'):st.title)}</h1>${last?`<p class="ob-sub">Your studio is tuned to how you work. Change anything here, or later in Settings.</p>`:st.sub?`<p class="ob-sub">${esc(st.sub)}</p>`:''}
    <div class="ob-body">${stepBody(st.id)}</div></section>
   ${side?obPreview():''}
  </div></main>
 <footer class="obx-bar"><div class="obx-bar-in">
  ${i>1&&!last?`<button type="button" class="ob-back" data-ob="back">${ico('chevron-down')}<span>Back</span></button>`:'<span></span>'}
  <div class="obx-bar-end">
   ${!last&&st.id!=='plan'?`<span class="ob-hint" aria-hidden="true">${valid(i)?'Press':'Choose an option, then press'} <kbd>Enter ↵</kbd></span>`:''}
   ${st.id==='plan'?`<button type="button" class="ob-next${(S.account?.plan?.id||'free')==='free'?' is-ghost':''}" data-ob="next"><span>Continue with ${esc(S.account?.plan?.id&&S.account.plan.id!=='free'?S.account.plan.name:'Free')}</span>${ico('arrow-up')}</button>`:`<button type="button" class="ob-next" data-ob="next" ${valid(i)?'':'disabled'}><span>${last?'Open the studio':'Continue'}</span>${ico('arrow-up')}</button>`}
  </div></div></footer>`;
 if(anim)requestAnimationFrame(()=>{el.querySelector('#obTitle')?.focus({preventScroll:true});el.querySelector('.ob-main')?.scrollTo?.(0,0)});
 if(st.id==='plan')planCarousel(el,anim)}
/* Phones: plans become a swipeable row that opens on the recommended plan. */
function planCarousel(el,first){const g=el.querySelector('.pl[data-context=onboarding] .pl-grid');if(!g)return;const cards=[...g.children],dots=[...el.querySelectorAll('[data-pl-dot]')];
 const mark=()=>{const mid=g.scrollLeft+g.clientWidth/2;let best=0,dist=1e9;cards.forEach((c,k)=>{const d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);if(d<dist){dist=d;best=k}});dots.forEach((d,k)=>d.classList.toggle('is-on',k===best))};
 const go=k=>{const c=cards[k];if(c)g.scrollTo({left:c.offsetLeft-(g.clientWidth-c.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
 dots.forEach((d,k)=>d.addEventListener('click',()=>go(k)));g.addEventListener('scroll',()=>requestAnimationFrame(mark),{passive:true});
 requestAnimationFrame(()=>{if(g.scrollWidth<=g.clientWidth+4)return;if(first||S.plScroll==null){const k=Math.max(0,cards.findIndex(c=>c.classList.contains('is-featured')));const c=cards[k];g.scrollLeft=c.offsetLeft-(g.clientWidth-c.offsetWidth)/2}else g.scrollLeft=S.plScroll;mark()});
 g.addEventListener('scroll',()=>{S.plScroll=g.scrollLeft},{passive:true})}
async function go(delta){const o=S.ob;if(!o)return;const next=o.step+delta;if(delta>0&&!valid(o.step))return;
 if(delta>0)await saveProfile({},{step:next});
 if(next>=STEPS.length){await saveProfile({},{step:STEPS.length-1,complete:true});applyPrefs();closeOnboarding();E()?.notify('Welcome to Replotre');return}
 if(STEPS[next].id==='ready')await saveProfile({},{step:next,complete:true});
 o.dir=delta;o.anim=true;o.step=Math.max(1,next);renderOb()}
function applyPrefs(){const d=S.account?.profile||S.ob?.data||{};try{localStorage.setItem('replotre_prefs',JSON.stringify({aspect:d.aspect,captionStyle:d.captionStyle,favoriteTemplates:d.favoriteTemplates||[]}))}catch{}
 const snap=E()?.snapshot?.();if(d.aspect&&snap&&!snap.clips?.length&&snap.aspect!==d.aspect)E().loadSavedEdit({...snap,aspect:d.aspect});window.ReplotreTemplates?.rerender?.()}
async function onObClick(e){const b=e.target.closest('button');if(!b)return;
 const o=S.ob;
 if(b.dataset.ob==='next')return STEPS[o.step]?.id==='ready'?finishOnboarding():go(1);
 if(b.dataset.ob==='google'){b.disabled=true;b.classList.add('is-busy');b.querySelector('.au-g-label').textContent='Redirecting to Google…';try{localStorage.setItem('replotre_last_method','google')}catch{}location.href='/api/auth/google/start?mode='+(S.authMode==='login'?'login':'register');return}
 if(b.dataset.ob==='suggest'){const i=document.getElementById('auPw');i.value=strongPassword();i.type='text';const t=document.querySelector('[data-ob=pw]');t?.setAttribute('aria-pressed','true');t?.classList.add('is-on');i.dispatchEvent(new Event('input',{bubbles:true}));fieldMsg('password','Strong password added. Save it in your password manager before you continue.','tip');i.focus();i.select();return}
 if(b.dataset.ob==='fix-email'){const i=document.getElementById('auEmail');i.value=b.dataset.v;i.dispatchEvent(new Event('input',{bubbles:true}));clearTimeout(S.emT);fieldMsg('email','');document.getElementById('auPw')?.focus();return}
 if(b.dataset.ob==='finish')return finishOnboarding(b.dataset.start);
 if(b.dataset.ob==='edit'){o.dir=-1;o.anim=true;o.step=Math.max(1,+b.dataset.step);renderOb();return}if(b.dataset.ob==='back')return go(-1);
 if(b.dataset.ob==='signout'){b.disabled=true;try{await Cloud()?.saveNow?.()}catch{}try{await api('/api/auth/logout',{method:'POST'})}catch{}sessionStorage.removeItem('replotre_new_account');location.reload();return}
 if(b.dataset.ob==='auth-mode'){const m=b.dataset.mode||(S.authMode==='register'?'login':'register');if(m===S.authMode)return;S.authEmail=document.querySelector('.ob-auth input[name=email]')?.value||S.authEmail;S.authMode=m;renderOb();return}
 if(b.dataset.ob==='pw'){const inp=b.parentElement.querySelector('input');const show=inp.type==='password';inp.type=show?'text':'password';b.setAttribute('aria-label',show?'Hide password':'Show password');b.setAttribute('aria-pressed',String(show));b.classList.toggle('is-on',show);inp.focus();return}
 if(b.dataset.obPick){const k=b.dataset.obPick,v=b.dataset.value;if(b.dataset.multi==='true'){const set=new Set(o.data[k]||[]);set.has(v)?set.delete(v):set.add(v);o.data[k]=[...set];saveProfile({[k]:o.data[k]})}else{o.data[k]=v;saveProfile({[k]:v})}
  const y=document.querySelector('.ob-main')?.scrollTop;renderOb();const m=document.querySelector('.ob-main');if(m&&y)m.scrollTop=y;document.querySelector(`[data-ob-pick="${k}"][data-value="${CSS.escape(v)}"]`)?.focus({preventScroll:true});
  if(!b.dataset.multi||b.dataset.multi==='false'){if(['about','experience'].includes(STEPS[o.step].id)&&k!=='role'&&valid(o.step)){}}return}
 if(b.dataset.obTpl){const id=b.dataset.obTpl;let f=o.data.favoriteTemplates||[];f=f.includes(id)?f.filter(x=>x!==id):[...f,id].slice(-3);o.data.favoriteTemplates=f;saveProfile({favoriteTemplates:f});const y=document.querySelector('.ob-main')?.scrollTop;renderOb();const m=document.querySelector('.ob-main');if(m&&y)m.scrollTop=y;document.querySelector(`[data-ob-tpl="${id}"]`)?.focus({preventScroll:true});return}
 if(b.dataset.plan)return choosePlan(b.dataset.plan,'onboarding');
 if(b.dataset.interval){S.interval=b.dataset.interval;const y=document.querySelector('.ob-main')?.scrollTop;renderOb();const m=document.querySelector('.ob-main');if(m&&y)m.scrollTop=y}}
function strength(pw){let n=0;if(pw.length>=12)n++;if(pw.length>=16)n++;if(/[a-z]/.test(pw)&&/[A-Z]/.test(pw))n++;if(/\d/.test(pw)&&/[^A-Za-z0-9]/.test(pw))n++;return pw.length<12?Math.min(n,1):Math.max(1,n)}
function onObInput(e){if(e.target.name==='password'&&S.authMode==='register'){const n=strength(e.target.value),m=e.target.closest('.ob-field');m?.querySelectorAll('.ob-strength i').forEach((x,i)=>x.classList.toggle('on',i<n));m?.querySelector('.ob-strength')?.setAttribute('data-n',String(n));const l=m?.querySelector('.ob-strength-label');if(l)l.textContent=e.target.value?(e.target.value.length<12?`${12-e.target.value.length} more character${12-e.target.value.length===1?'':'s'}`:['','Okay','Good','Strong','Excellent'][n]):'';m?.querySelector('.au-meter')?.classList.toggle('is-on',!!e.target.value)}
 if(e.target.name==='email'){validateEmail(e.target);clearTimeout(S.emT);const t=e.target;S.emT=setTimeout(()=>checkEmailField(t,false),450)}
 if(e.target.name==='password'){const c=pwChecks(e.target.value);document.querySelectorAll('.au-reqs li').forEach(li=>li.classList.toggle('is-ok',!!c[li.dataset.r]));document.querySelector('.au-f[data-f=password]')?.classList.toggle('is-typing',!!e.target.value);fieldMsg('password','')}
 const err=document.querySelector('.ob-auth-error');if(err&&e.target.closest('.ob-auth'))err.hidden=true;
 const k=e.target.dataset.obText;if(!k)return;S.ob.data[k]=e.target.value;saveProfile({[k]:e.target.value});const n=document.querySelector('.ob-next');if(n)n.disabled=!valid(S.ob.step);if(k==='name'){const v=e.target.value.trim(),pn=document.querySelector('.obp-name'),pa=document.querySelector('.obp-avatar');if(pn)pn.textContent=v||'Your studio';if(pa)pa.textContent=(v||'R')[0].toUpperCase()}}
function onObKey(e){if(e.target.name==='password'&&e.getModifierState){const c=document.querySelector('.au-caps');if(c)c.hidden=!e.getModifierState('CapsLock')}
 if(e.key==='Enter'&&!e.isComposing&&e.target.tagName!=='BUTTON'&&S.ob.step>0&&STEPS[S.ob.step].id!=='plan'){e.preventDefault();go(1)}}
async function onAuthSubmit(e){e.preventDefault();const f=e.target,btn=f.querySelector('[type=submit]'),err=f.querySelector('.ob-auth-error'),fd=new FormData(f),reg=S.authMode==='register';
 const email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');S.authEmail=email;
 const reset=()=>{btn.disabled=false;btn.innerHTML=`<span>${reg?'Create account':'Sign in'}</span>${ico('arrow-up')}`};
 const fail=(m,action)=>{err.innerHTML=esc(m)+(action||'');err.hidden=false;reset()};
 err.hidden=true;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){fieldMsg('email','Enter a full email address, like name@example.com.');f.email.focus();return}
 if(!password){fieldMsg('password','Enter your password.');f.password.focus();return}
 if(reg&&password.length<12){fieldMsg('password',`Add ${12-password.length} more character${12-password.length===1?'':'s'}. Passwords need at least 12.`);f.password.focus();return}
 btn.disabled=true;btn.innerHTML='<span class="acct-spin"></span><span>'+(reg?'Creating account…':'Signing in…')+'</span>';
 try{await api(`/api/auth/${reg?'register':'login'}`,{method:'POST',body:{email,password,inviteCode:String(fd.get('invite')||'')}});
  try{localStorage.setItem('replotre_last_email',email);localStorage.setItem('replotre_last_method','email')}catch{}if(reg)sessionStorage.setItem('replotre_new_account','1');btn.innerHTML=`<span class="acct-spin"></span><span>${reg?'Setting up your studio…':'Opening your studio…'}</span>`;location.reload()}
 catch(ex){const msg=(ex.status===401?'That email and password don\'t match.':ex.status===409?(()=>{fail('An account with this email already exists.',' <button type="button" class="au-fix" data-ob="auth-mode" data-mode="login">Sign in instead</button>');return null})():ex.status===429?'Too many attempts. Wait a few minutes and try again.':ex.status===403?(ex.message||'Sign-ups are closed right now.'):ex.message||'Something went wrong. Try again.');if(msg)fail(msg)}}

/* ---------- Plans ---------- */
function planPrice(p){const yearly=S.interval==='year';if(!p.price.month)return {main:money(0),note:'Free forever'};const per=yearly?p.price.year/12:p.price.month;return {main:money(Math.round(per*100)/100),note:yearly?`${money(p.price.year)} billed yearly`:'Billed monthly'}}
function plansMarkup({recommended,context,reason,why}={}){const plans=S.plans||[],cur=S.account?.plan?.id||'free',sub=S.account?.subscription;if(recommended===cur)recommended=null;const recName=recommended&&plans.find(x=>x.id===recommended)?.name;const save=plans.filter(p=>p.price.month).map(p=>Math.round((1-p.price.year/(p.price.month*12))*100));const maxSave=save.length?Math.max(...save):0;
 return `<div class="pl" data-context="${context}">
  ${reason?`<div class="pl-reason">${ico('zap')}<span>${esc(reason)}</span></div>`:''}
  ${why&&recName?`<div class="pl-why">${ico('sparkles')}<span>We recommend <b>${esc(recName)}</b> because ${esc(why)}.</span></div>`:''}
  <div class="pl-head"><div class="pl-toggle" role="radiogroup" aria-label="Billing period"><button type="button" role="radio" aria-checked="${S.interval==='month'}" data-interval="month">Monthly</button><button type="button" role="radio" aria-checked="${S.interval==='year'}" data-interval="year">Yearly${maxSave?` <em>Save ${maxSave}%</em>`:''}</button></div>
   ${S.mode==='test'?`<span class="pl-test" title="No card is charged. Add WHOP_API_KEY to take payments.">${ico('shield-check')}Test mode<span class="pl-more">, no charge</span></span>`:S.mode==='off'?`<span class="pl-test">Payments are not configured</span>`:`<span class="pl-secure">${ico('shield-check')}Secure checkout by Whop</span>`}</div>
  <div class="pl-grid">${plans.map(p=>{const pr=planPrice(p),isCur=p.id===cur,rec=p.id===recommended&&!isCur,locked=sub?.provider==='whop'&&cur!=='free'&&!isCur,can=p.purchasable?.[S.interval]!==false&&S.mode!=='off'&&!locked;
   return `<article class="pl-card${isCur?' is-current':''}${rec||(!recommended&&p.popular&&!isCur)?' is-featured':''}">
    ${isCur?'<span class="pl-flag">Current plan</span>':rec?'<span class="pl-flag is-rec">Recommended for you</span>':p.popular&&!recommended?'<span class="pl-flag is-rec">Most popular</span>':''}
    <div class="pl-name"><strong>${esc(p.name)}</strong><small>${esc(p.tagline)}</small></div>
    <div class="pl-price"><b>${pr.main}</b>${p.price.month?'<span>/mo</span>':''}</div><p class="pl-note">${esc(pr.note)}</p>
    ${context==='onboarding'&&isCur&&p.id==='free'?`<button type="button" class="pl-cta is-start" data-ob="next">Start with Free</button>`:''}<button type="button" ${context==='onboarding'&&isCur&&p.id==='free'?'hidden ':''}class="pl-cta${(rec||(!recommended&&p.popular))&&!isCur?' is-primary':''}${isCur?' is-current':''}" data-plan="${p.id}" ${isCur&&(!sub||sub.interval===S.interval||p.id==='free'||sub.provider==='whop')||!can?'disabled':''}>${isCur?(p.id!=='free'&&sub&&sub.interval!==S.interval&&sub.provider!=='whop'?`Switch to ${S.interval}ly`:'Current plan'):locked?'Cancel current plan to switch':!can?'Unavailable':p.id==='free'?'Downgrade':cur!=='free'&&planIndex(p.id)<planIndex(cur)?`Switch to ${esc(p.name)}`:`Get ${esc(p.name)}`}</button>
    <ul class="pl-feat">${p.features.map(f=>`<li>${ico('check')}<span>${esc(f)}</span></li>`).join('')}</ul></article>`}).join('')}</div>
  ${context==='onboarding'?`<div class="pl-dots" aria-hidden="true">${plans.map((p,k)=>`<button type="button" tabindex="-1" data-pl-dot="${k}"></button>`).join('')}</div>`:''}
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
 sessionStorage.removeItem('replotre_new_account');
 if(!S.account.profile.onboardedAt){if(!(S.ob&&document.querySelector('.ob')))startOnboarding()}else ungate()}
/* Studio entry: decide between the account gate, setup and the studio before the studio is shown. */
const GOOGLE_ERR={google_cancelled:'Google sign-in was cancelled. Try again, or use your email.',google_expired:'That sign-in took too long. Try Google again.',google_unverified:'Your Google account email isn’t verified yet.',signup_closed:'New sign-ups are closed right now. Sign in if you already have an account.',invite_required:'Sign-ups need an invitation code. Create your account with email and the code.',capacity:'We’re at capacity for new accounts right now. Please try again later.',google_unavailable:'Google sign-in isn’t available right now. Use your email instead.'};
function readAuthReturn(){const u=new URL(location.href),e=u.searchParams.get('auth_error'),g=u.searchParams.get('auth');if(!e&&!g)return;
 if(e)S.authError=GOOGLE_ERR[e]||'Google sign-in didn’t work. Try again, or use your email.';
 if(g==='google'&&u.searchParams.get('new')==='1')sessionStorage.setItem('replotre_new_account','1');
 ['auth_error','auth','new'].forEach(k=>u.searchParams.delete(k));history.replaceState(null,'',u.pathname+(u.search||'')+u.hash)}
async function boot(){readAuthReturn();let status=null,me=null,acct=null;const pre=window.__rpPre;
 try{[status,me,acct]=await Promise.all(pre?[pre.status,pre.me,pre.account]:[fetch('/api/status',{credentials:'same-origin'}).then(r=>r.ok?r.json():null),fetch('/api/auth/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null),null])}catch{}
 S.status=status;
 if(!status?.cloud){ungate();return} // no account server (static preview): open the local studio
 if(!me?.user){startGate();return}
 if(acct&&acct.profile&&!new URL(location.href).searchParams.get('billing')){S.account=acct;renderChip();if(acct.profile.onboardedAt)ungate();else startOnboarding()}
 setTimeout(()=>{if(document.documentElement.classList.contains('rp-gate'))onConnection()},4000)}
window.addEventListener('replotre:cloud',onConnection);
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState!=='visible'||!sessionStorage.getItem('replotre_portal_open'))return;sessionStorage.removeItem('replotre_portal_open');try{S.account=(await api('/api/billing/refresh',{method:'POST'})).account;renderChip();renderCenter()}catch{}});
boot();
window.ReplotreAccount={open:openCenter,openPlans:reason=>openCenter('plans',reason),upgrade,startOnboarding,refresh:loadAccount,get:()=>S.account};
})();
