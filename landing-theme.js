/* Runs before first paint: marks JS as available (reveal effects opt in on it) and applies the theme.
   Shared by the landing page and the studio. The studio (<html data-app="studio">) defaults to dark and
   remembers its own choice; the landing page defaults to light. A saved toggle choice always wins. */
(()=>{const d=document.documentElement;d.classList.add('js');const studio=d.dataset.app==='studio',key=studio?'replotre_studio_theme':'replotre_theme',fallback=studio?'dark':'light';
 try{const saved=localStorage.getItem(key);d.dataset.theme=saved==='dark'||saved==='light'?saved:fallback}catch(e){d.dataset.theme=fallback}
 if(studio){d.classList.add('rp-gate','rp-bare');setTimeout(()=>d.classList.remove('rp-gate'),15000);
  // Ask the server who this is right away, in parallel with downloading the studio, so sign-up/setup can show without waiting for the editor.
  const j=u=>fetch(u,{credentials:'same-origin'}).then(r=>r.ok?r.json():null).catch(()=>null);
  try{window.__rpPre={status:j('/api/status'),me:j('/api/auth/me'),account:j('/api/account'),plans:j('/api/billing/plans')}}catch(e){}} // hidden until the account check decides (failsafe 15s)
 try{const c=navigator.connection;if((c&&c.saveData)||(navigator.deviceMemory&&navigator.deviceMemory<=2)||matchMedia('(prefers-reduced-data: reduce)').matches)d.classList.add('lite');if(localStorage.getItem('replotre_motion')==='off')d.classList.add('calm')}catch(e){}})();
