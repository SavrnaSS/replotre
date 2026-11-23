/* Runs before first paint: marks JS as available (reveal effects opt in on it) and applies the theme.
   Shared by the landing page and the studio. The studio (<html data-app="studio">) defaults to dark and
   remembers its own choice; the landing page defaults to light. A saved toggle choice always wins. */
(()=>{const d=document.documentElement;d.classList.add('js');const studio=d.dataset.app==='studio',key=studio?'replotre_studio_theme':'replotre_theme',fallback=studio?'dark':'light';
 try{const saved=localStorage.getItem(key);d.dataset.theme=saved==='dark'||saved==='light'?saved:fallback}catch(e){d.dataset.theme=fallback}
 try{const c=navigator.connection;if((c&&c.saveData)||(navigator.deviceMemory&&navigator.deviceMemory<=2)||matchMedia('(prefers-reduced-data: reduce)').matches)d.classList.add('lite');if(localStorage.getItem('replotre_motion')==='off')d.classList.add('calm')}catch(e){}})();
