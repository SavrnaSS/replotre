import test from 'node:test';
import assert from 'node:assert/strict';
import '../playback.js';
import {validateProject} from '../src/core.mjs';
import {sliceTimeline} from '../src/render.mjs';

const {fadeGain} = globalThis.ReplotrePlayback;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);

test('fade envelope ramps in, holds, and ramps out', () => {
  near(fadeGain(1, 2, 0, 10), 0, 'start of fade-in');
  near(fadeGain(1, 2, 0.5, 10), 0.5, 'middle of fade-in');
  near(fadeGain(1, 2, 5, 10), 1, 'hold');
  near(fadeGain(1, 2, 9, 10), 0.5, 'middle of fade-out');
  near(fadeGain(1, 2, 10, 10), 0, 'end');
  near(fadeGain(0, 0, 3, 10), 1, 'no fades');
});

const base = (clip = {}, text = {}, extra = {}) => ({
  projectName: 'Features', aspect: '9:16', script: '',
  clips: [{id: 'c1', kind: 'demo', demo: 0, name: 'S', in: 0, out: 5, speed: 1, volume: 1, ...clip}],
  texts: [{id: 't1', kind: 'title', text: 'Hi', start: 0, duration: 2, position: 'center', color: '#ffffff', ...text}],
  music: null, ...extra,
});

test('framing, looks, fades, text styles and markers validate', () => {
  assert.doesNotThrow(() => validateProject(base(
    {fit: 'fit', zoom: 1.6, panX: -0.4, panY: 0.2, flipH: true, contrast: 120, look: 'vivid', fadeIn: 0.5, fadeOut: 1},
    {bg: 'box', anim: 'slide'},
    {markers: [{id: 'm1', t: 1.5}, {id: 'm2', t: 3}]},
  )));
});

test('out-of-range editing values are rejected', () => {
  for (const bad of [{zoom: 4}, {zoom: 0.5}, {panX: 2}, {fit: 'stretch'}, {flipH: 'yes'}, {contrast: 300}, {fadeIn: -1}, {fadeOut: 20}]) {
    assert.throws(() => validateProject(base(bad)), /Invalid clip/, JSON.stringify(bad));
  }
  assert.throws(() => validateProject(base({}, {anim: 'spin'})), /Invalid text style/);
  assert.throws(() => validateProject(base({}, {bg: 'glow'})), /Invalid text style/);
  assert.throws(() => validateProject(base({}, {}, {markers: [{id: 'm', t: -1}]})), /Invalid markers/);
  assert.throws(() => validateProject(base({}, {}, {markers: 'nope'})), /Invalid markers/);
});

test('cutting a range drops fades that would land mid-shot', () => {
  const data = {clips: [{id: 'a', kind: 'video', mediaId: 'm', in: 0, out: 10, speed: 1, fadeIn: 1, fadeOut: 1}], texts: [], music: null};
  const inner = sliceTimeline(data, 2, 8).clips[0];
  assert.equal(inner.fadeIn, 0);
  assert.equal(inner.fadeOut, 0);
  const whole = sliceTimeline(data, 0, 10).clips[0];
  assert.equal(whole.fadeIn, 1);
  assert.equal(whole.fadeOut, 1);
});

import {xfadeAt} from '../src/render.mjs';
import {applyOperations} from '../src/director.mjs';

test('crossfade length is clamped to the shorter neighbouring clip', () => {
  const clips = [{xfade: 0}, {xfade: 2}, {xfade: 0.5}];
  assert.equal(xfadeAt(clips, 0, [4, 1.2, 6]), 0, 'first clip has no incoming cut');
  assert.equal(xfadeAt(clips, 1, [4, 1.2, 6]), 1.2, 'limited by the 1.2s clip');
  assert.equal(xfadeAt(clips, 2, [4, 1.2, 6]), 0.5);
  assert.equal(xfadeAt([{}, {xfade: 9}], 1, [10, 10]), 3, 'never longer than 3s');
});

test('a range export never opens on a transition from a removed clip', () => {
  const data = {clips: [
    {id: 'a', kind: 'video', mediaId: 'm', in: 0, out: 4, speed: 1},
    {id: 'b', kind: 'video', mediaId: 'm', in: 0, out: 4, speed: 1, xfade: 1},
    {id: 'c', kind: 'video', mediaId: 'm', in: 0, out: 4, speed: 1, xfade: 0.8},
  ], texts: [], music: null};
  const cut = sliceTimeline(data, 5, 12);
  assert.deepEqual(cut.clips.map(c => c.id), ['b', 'c']);
  assert.equal(cut.clips[0].xfade, 0, 'b loses the transition from a');
  assert.equal(cut.clips[1].xfade, 0.8, 'the b→c transition is kept');
});

test('transition lengths are validated', () => {
  assert.doesNotThrow(() => validateProject(base({xfade: 1.5})));
  assert.throws(() => validateProject(base({xfade: 5})), /Invalid clip/);
  assert.throws(() => validateProject(base({xfade: -1})), /Invalid clip/);
});

test('splitting a clip keeps fades and transitions on the correct side', () => {
  const project = {projectName: 'S', aspect: '9:16', script: '', texts: [], music: null,
    clips: [{id: 'x', kind: 'video', mediaId: 'm', name: 'X', in: 0, out: 8, speed: 1, volume: 1, fadeIn: 1, fadeOut: 1, xfade: 0.5}]};
  const {data} = applyOperations(project, [{type: 'split_clip', at: 4}]);
  const [left, right] = data.clips;
  assert.equal(left.fadeIn, 1); assert.equal(left.fadeOut, 0); assert.equal(left.xfade, 0.5);
  assert.equal(right.fadeIn, 0); assert.equal(right.fadeOut, 1); assert.equal(right.xfade, 0, 'no dissolve in the middle of a shot');
});

test('split text halves carry seam flags that validate', () => {
  assert.doesNotThrow(() => validateProject(base({}, {cutOut: true})));
  assert.doesNotThrow(() => validateProject(base({}, {cutIn: true, anim: 'slide'})));
  assert.throws(() => validateProject(base({}, {cutIn: 'yes'})), /Invalid text style/);
});

test('audio crossfade is equal-power and centred on the cut', () => {
  const {xfadeGainAt} = globalThis.ReplotrePlayback;
  const entries = [
    {index: 0, start: 0, end: 4, clip: {}},
    {index: 1, start: 4, end: 8, clip: {xfade: 1}},
  ];
  near(xfadeGainAt(entries, 0, 3.0), 1, 'outgoing untouched before the dissolve');
  near(xfadeGainAt(entries, 0, 3.5), 1, 'dissolve begins at full level');
  const out = xfadeGainAt(entries, 0, 3.999999), inn = xfadeGainAt(entries, 1, 4.0);
  assert.ok(Math.abs(out - Math.SQRT1_2) < 1e-4 && Math.abs(inn - Math.SQRT1_2) < 1e-4, 'both sides at -3dB on the cut');
  assert.ok(Math.abs(out * out + inn * inn - 1) < 1e-3, 'constant power across the cut');
  near(xfadeGainAt(entries, 1, 4.5), 1, 'incoming reaches full level at the end of the dissolve');
  near(xfadeGainAt(entries, 1, 6), 1, 'no change outside transitions');
});

import {keyExpr} from '../src/render.mjs';
import {splitKeys} from '../src/director.mjs';

// Reference easing used by the editor preview: smoothstep between keys, hold outside.
const easeRef = (keys, p, t) => {
  if (t <= keys[0].t) return keys[0][p];
  const n = keys.length - 1;
  if (t >= keys[n].t) return keys[n][p];
  for (let i = 0; i < n; i++) if (t < keys[i + 1].t) { const x = (t - keys[i].t) / (keys[i + 1].t - keys[i].t); return keys[i][p] + (keys[i + 1][p] - keys[i][p]) * x * x * (3 - 2 * x); }
};
const evalFfmpeg = expr => new Function('T', 'IF', 'LT', 'GT', `return ${expr.replace(/\bif\(/g, 'IF(').replace(/\blt\(/g, 'LT(').replace(/\bgt\(/g, 'GT(')}`);

test('server keyframe expressions match the editor easing curve', () => {
  const keys = [{t: 0.5, zoom: 1, panX: -0.6, panY: 0}, {t: 2, zoom: 1.8, panX: 0.4, panY: -0.25}, {t: 3.2, zoom: 1.2, panX: 0.4, panY: 0.3}];
  for (const p of ['zoom', 'panX', 'panY']) {
    const f = evalFfmpeg(keyExpr(keys, p, 'T'));
    for (let t = 0; t <= 4; t += 0.05) {
      const got = f(t, (c, a, b) => (c ? a : b), (a, b) => (a < b ? 1 : 0), (a, b) => (a > b ? 1 : 0));
      assert.ok(Math.abs(got - easeRef(keys, p, t)) < 1e-4, `${p} at ${t.toFixed(2)}s: ${got} vs ${easeRef(keys, p, t)}`);
    }
  }
});

test('splitting a keyframed clip keeps the motion continuous across the cut', () => {
  const keys = [{t: 0, zoom: 1, panX: 0, panY: 0}, {t: 4, zoom: 2, panX: 1, panY: -1}];
  const [left, right] = splitKeys(keys, 1.5);
  assert.equal(left.at(-1).t, 1.5);
  assert.equal(right[0].t, 0);
  for (const p of ['zoom', 'panX', 'panY']) near(left.at(-1)[p], right[0][p], `${p} matches at the seam`);
  near(right.at(-1).t, 2.5, 'later keys shift to the new clip start');
});

test('range exports keep keyframes attached to the picture', () => {
  const data = {clips: [{id: 'a', kind: 'video', mediaId: 'm', in: 0, out: 6, speed: 1, keys: [{t: 1, zoom: 1, panX: 0, panY: 0}, {t: 5, zoom: 2, panX: 0, panY: 0}]}], texts: [], music: null};
  const cut = sliceTimeline(data, 2, 6).clips[0];
  near(cut.keys[0].t, -1, 'keys move with the new start');
  near(cut.keys[1].t, 3, 'keys move with the new start');
});

test('keyframes validate', () => {
  assert.doesNotThrow(() => validateProject(base({keys: [{t: 0, zoom: 1, panX: 0, panY: 0}, {t: 3, zoom: 2.5, panX: -0.5, panY: 0.2}]})));
  assert.throws(() => validateProject(base({keys: [{t: 0, zoom: 4, panX: 0, panY: 0}]})), /Invalid clip/);
  assert.throws(() => validateProject(base({keys: 'zoom'})), /Invalid clip/);
});
