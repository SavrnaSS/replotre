import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProject} from '../src/core.mjs';
import {applyOperations} from '../src/director.mjs';

const project = (text = {}) => ({
  projectName: 'Positions', aspect: '9:16', script: '',
  clips: [{id: 'c1', kind: 'demo', demo: 0, name: 'Sample', in: 0, out: 5, speed: 1, volume: 1}],
  texts: [{id: 't1', kind: 'title', text: 'Hello', start: 0, duration: 3, position: 'center', color: '#ffffff', fontSize: 40, fontWeight: 700, ...text}],
  music: null,
});

test('free x/y text positions inside the frame are accepted', () => {
  assert.doesNotThrow(() => validateProject(project({x: 0.25, y: 0.8})));
  assert.doesNotThrow(() => validateProject(project({x: 0, y: 1})));
});

test('text positions outside the frame are rejected', () => {
  assert.throws(() => validateProject(project({x: 1.2, y: 0.5})), /Invalid text position/);
  assert.throws(() => validateProject(project({x: 0.5, y: -0.1})), /Invalid text position/);
  assert.throws(() => validateProject(project({x: '0.5', y: 0.5})), /Invalid text position/);
});

test('a Director position preset clears a dragged position', () => {
  const data = project({x: 0.3, y: 0.7});
  const {data: result, changed} = applyOperations(data, [{type: 'set_text_position', value: 'top'}]);
  assert.equal(changed, true);
  assert.equal(data.texts[0].x, 0.3, 'input project is not mutated');
  const t = result.texts[0];
  assert.equal(t.position, 'top');
  assert.equal(t.x, undefined);
  assert.equal(t.y, undefined);
});
