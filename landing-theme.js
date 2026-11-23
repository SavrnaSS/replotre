/* Runs before first paint: marks JS as available (reveal effects opt in on it) and applies the theme.
   Light is the default; a saved choice from the toggle wins. Shared by the landing page and the studio. */
(()=>{const d=document.documentElement;d.classList.add('js');try{d.dataset.theme=localStorage.getItem('replotre_theme')==='dark'?'dark':'light'}catch(e){d.dataset.theme='light'}
 try{const c=navigator.connection;if((c&&c.saveData)||(navigator.deviceMemory&&navigator.deviceMemory<=2)||matchMedia('(prefers-reduced-data: reduce)').matches)d.classList.add('lite');if(localStorage.getItem('replotre_motion')==='off')d.classList.add('calm')}catch(e){}})();
