import test from 'node:test';
import assert from 'node:assert/strict';

import { capture, diff, formatDiff } from '../src/index.js';

test('capture copies references eagerly so later mutation does not affect it', () => {
  const root = { a: 1, b: 2 };
  const snap = capture(root);
  root.c = 3;
  root.a = 99;
  assert.deepEqual(Object.keys(snap.refs).sort(), ['a', 'b']);
  assert.equal(snap.refs.a, 1);
});

test('capture rejects null and non-objects', () => {
  assert.throws(() => capture(null), TypeError);
  assert.throws(() => capture(42), TypeError);
  assert.throws(() => capture('nope'), TypeError);
});

test('capture ignores inherited properties', () => {
  const proto = { inherited: true };
  const root = Object.create(proto);
  root.own = 1;
  const snap = capture(root);
  assert.deepEqual(Object.keys(snap.refs), ['own']);
});

test('diff reports added, removed and unchanged keys', () => {
  const before = capture({ a: 1, b: 2, c: 3 });
  const after = capture({ b: 2, c: 3, d: 4 });
  assert.deepEqual(diff(before, after), {
    added: ['d'],
    removed: ['a'],
    unchanged: ['b', 'c'],
  });
});

test('diff output is sorted and independent of insertion order', () => {
  const before = capture({ z: 1, a: 2, m: 3 });
  const after = capture({ q: 1, a: 2, m: 3 });
  const result = diff(before, after);
  assert.deepEqual(result.added, ['q']);
  assert.deepEqual(result.removed, ['z']);
  assert.deepEqual(result.unchanged, ['a', 'm']);
});

test('diff treats a value change as unchanged presence', () => {
  const before = capture({ a: 1 });
  const after = capture({ a: 2 });
  assert.deepEqual(diff(before, after), {
    added: [],
    removed: [],
    unchanged: ['a'],
  });
});

test('diff of identical captures is empty', () => {
  const snap = capture({ x: 1, y: 2 });
  assert.deepEqual(diff(snap, snap), {
    added: [],
    removed: [],
    unchanged: ['x', 'y'],
  });
});

test('diff handles empty snapshots on either side', () => {
  const empty = capture({});
  const full = capture({ a: 1 });
  assert.deepEqual(diff(empty, full), { added: ['a'], removed: [], unchanged: [] });
  assert.deepEqual(diff(full, empty), { added: [], removed: ['a'], unchanged: [] });
});

test('diff rejects malformed snapshots', () => {
  const good = capture({ a: 1 });
  assert.throws(() => diff(null, good), TypeError);
  assert.throws(() => diff(good, undefined), TypeError);
  assert.throws(() => diff({}, good), TypeError);
  assert.throws(() => diff(good, { refs: null }), TypeError);
});

test('formatDiff renders prefixes for each category', () => {
  const result = diff(capture({ a: 1, b: 2 }), capture({ b: 2, c: 3 }));
  assert.equal(formatDiff(result), '+ c\n- a\n  b');
});

test('formatDiff tolerates missing arrays', () => {
  assert.equal(formatDiff({}), '');
  assert.equal(formatDiff({ added: ['x'] }), '+ x');
});

test('formatDiff rejects non-objects', () => {
  assert.throws(() => formatDiff(null), TypeError);
  assert.throws(() => formatDiff('nope'), TypeError);
});
