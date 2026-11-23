import test from 'node:test';
import assert from 'node:assert/strict';
import {sliceTimeline} from '../src/render.mjs';

const clip = (id, inPt, outPt, speed = 1) => ({id, kind: 'video', mediaId: `m_${id}`, in: inPt, out: outPt, speed, volume: 1});
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`);

// Timeline: A [0,7) · B [7,21) · C at 2× speed covers source 0..6 → timeline [21,24)
const project = () => ({
  aspect: '9:16',
  clips: [clip('a', 0, 7), clip('b', 0, 14), clip('c', 0, 6, 2)],
  texts: [
    {id: 't1', text: 'Before', start: 0, duration: 2},
    {id: 't2', text: 'Spans in point', start: 2, duration: 3},
    {id: 't3', text: 'Inside', start: 9, duration: 1},
    {id: 't4', text: 'After', start: 23, duration: 1},
  ],
  music: {mediaId: 'song', start: 0, volume: 0.3},
});

test('range inside one clip trims both edges of that clip', () => {
  const out = sliceTimeline(project(), 9, 12);
  assert.equal(out.clips.length, 1);
  assert.equal(out.clips[0].id, 'b');
  near(out.clips[0].in, 2, 'in');
  near(out.clips[0].out, 5, 'out');
  assert.deepEqual(out.range, {start: 9, end: 12});
});

test('range across clips trims the first and last clip and keeps the middle intact', () => {
  const out = sliceTimeline(project(), 3, 22);
  assert.deepEqual(out.clips.map(c => c.id), ['a', 'b', 'c']);
  near(out.clips[0].in, 3, 'a.in');
  near(out.clips[0].out, 7, 'a.out');
  near(out.clips[1].in, 0, 'b.in');
  near(out.clips[1].out, 14, 'b.out');
  // C runs at 2×: 1s of timeline = 2s of source
  near(out.clips[2].in, 0, 'c.in');
  near(out.clips[2].out, 2, 'c.out');
  const length = out.clips.reduce((n, c) => n + (c.out - c.in) / c.speed, 0);
  near(length, 19, 'sliced length');
});

test('titles are clipped to the range and shifted to start at zero', () => {
  const out = sliceTimeline(project(), 3, 12);
  assert.deepEqual(out.texts.map(t => t.id), ['t2', 't3']);
  near(out.texts[0].start, 0, 't2.start');
  near(out.texts[0].duration, 2, 't2.duration');
  near(out.texts[1].start, 6, 't3.start');
  near(out.texts[1].duration, 1, 't3.duration');
});

test('soundtrack keeps its place by offsetting to the range start', () => {
  const out = sliceTimeline(project(), 5, 10);
  near(out.music.offset, 5, 'music offset');
  const again = sliceTimeline({...project(), music: {...project().music, offset: 2}}, 5, 10);
  near(again.music.offset, 7, 'offsets accumulate');
});

test('original project data is not modified', () => {
  const data = project();
  const before = JSON.stringify(data);
  sliceTimeline(data, 3, 12);
  assert.equal(JSON.stringify(data), before);
});

test('range is clamped to the timeline and slivers under 0.1s are dropped', () => {
  const out = sliceTimeline(project(), 6.95, 30);
  assert.deepEqual(out.clips.map(c => c.id), ['b', 'c']);
  near(out.range.end, 24, 'clamped end');
});

test('ranges shorter than 0.2s are rejected', () => {
  assert.throws(() => sliceTimeline(project(), 5, 5.1), /at least 0\.2 seconds/);
});
