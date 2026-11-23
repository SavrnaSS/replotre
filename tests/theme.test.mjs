import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {build,mapColor,OUTPUT} from '../scripts/build-light-theme.mjs';
const rgb=h=>({rgb:[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16)),a:1});
const lum=h=>{const [r,g,b]=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b};
test('theme-light.css is regenerated after dark style changes',()=>{
  assert.equal(readFileSync(new URL(`../${OUTPUT}`,import.meta.url),'utf8'),build(),'run: node scripts/build-light-theme.mjs');
});
test('light mapping turns dark surfaces light and light text dark, keeping text readable',()=>{
  const bg=mapColor(rgb('#101116')),text=mapColor(rgb('#f4f2fc')),muted=mapColor(rgb('#868695'));
  assert.ok(lum(bg)>.85&&lum(text)<.05);
  const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  assert.ok(contrast(bg,text)>=12,'body text');assert.ok(contrast(bg,muted)>=4.5,'muted text');
});
test('generated theme leaves video overlays untouched and is scoped to light only',()=>{
  const css=build();
  assert.ok(!/^[^:\/@\n}][^\n]*\{/m.test(css.replace(/^:root\[data-theme="light"\][^\n]*$/gm,'').replace(/^@[^\n]*$/gm,'').replace(/^html\[data-theme="light"\][^\n]*$/gm,'')),'every rule is scoped');
  // the burn-in timecode sits on the video, so its colour must be re-asserted unchanged
  assert.match(css,/:root\[data-theme="light"\] \.vb-tc\s*\{color:#ffd9ae\}/);
});
