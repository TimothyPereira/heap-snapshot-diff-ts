/**
 * Core heap snapshot diffing.
 *
 * A "heap snapshot" here is deliberately small: a map from reference name to
 * an opaque value. We only care about *which references exist*, not their
 * contents, so values are stored as-is and compared by identity of the key
 * rather than deep equality. That keeps the diff cheap and predictable.
 *
 * Two design decisions are worth calling out:
 *
 * 1. `capture` reads the references eagerly into a plain object. If it stored
 *    a live reference to the root, a later mutation of the root would change
 *    the "before" snapshot retroactively and the diff would always be empty.
 *    Eager copying is the whole point of a snapshot.
 *
 * 2. `diff` reports added and removed keys. A key whose value changed but whose
 *    presence did not is *not* reported. The brief is about references being
 *    added or removed, and conflating presence with value churn would make the
 *    output noisy for callers who only track lifetimes.
 */

/**
 * Capture the own enumerable references of a root object at a point in time.
 *
 * @param {object} root Object whose own enumerable properties are the refs.
 * @returns {{refs: Record<string, unknown>}} A frozen snapshot.
 * @throws {TypeError} If root is null or not an object.
 */
export function capture(root) {
  if (root === null || typeof root !== 'object') {
    throw new TypeError('capture: root must be a non-null object');
  }

  // Object.keys gives own enumerable string keys in insertion order, which is
  // what callers expect when they print a diff. We copy values by assignment;
  // nested objects are shared, but since we only compare key presence that is
  // fine and avoids a deep clone that would be both slow and surprising.
  const refs = {};
  for (const key of Object.keys(root)) {
    refs[key] = root[key];
  }

  return Object.freeze({ refs: Object.freeze(refs) });
}

/**
 * Compute which references were added or removed between two captures.
 *
 * @param {{refs: Record<string, unknown>}} before Snapshot from `capture`.
 * @param {{refs: Record<string, unknown>}} after Snapshot from `capture`.
 * @returns {{added: string[], removed: string[], unchanged: string[]}}
 *   Keys are sorted so the result is stable regardless of insertion order.
 */
export function diff(before, after) {
  assertSnapshot(before, 'before');
  assertSnapshot(after, 'after');

  const beforeKeys = Object.keys(before.refs);
  const afterKeys = Object.keys(after.refs);
  const beforeSet = new Set(beforeKeys);
  const afterSet = new Set(afterKeys);

  const added = [];
  const removed = [];
  const unchanged = [];

  for (const key of afterKeys) {
    if (beforeSet.has(key)) {
      unchanged.push(key);
    } else {
      added.push(key);
    }
  }

  for (const key of beforeKeys) {
    if (!afterSet.has(key)) {
      removed.push(key);
    }
  }

  // Sorting makes the output deterministic even when the two roots were built
  // in different orders, which matters for tests and for diffing across runs.
  added.sort();
  removed.sort();
  unchanged.sort();

  return { added, removed, unchanged };
}

/**
 * Render a diff as a human-readable multi-line string.
 *
 * @param {{added: string[], removed: string[], unchanged: string[]}} result
 * @returns {string}
 */
export function formatDiff(result) {
  if (result === null || typeof result !== 'object') {
    throw new TypeError('formatDiff: result must be an object');
  }
  const { added = [], removed = [], unchanged = [] } = result;
  const lines = [];
  for (const key of added) {
    lines.push(`+ ${key}`);
  }
  for (const key of removed) {
    lines.push(`- ${key}`);
  }
  for (const key of unchanged) {
    lines.push(`  ${key}`);
  }
  return lines.join('\n');
}

function assertSnapshot(value, label) {
  if (value === null || typeof value !== 'object' || value.refs === null || typeof value.refs !== 'object') {
    throw new TypeError(`diff: ${label} must be a snapshot with a refs object`);
  }
}
