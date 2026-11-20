# heap-snapshot-diff-ts

Captures the references held by a module-scoped root object at two points in time and reports which references were added or removed.

```js
import { capture, diff, formatDiff } from './src/index.js';

const registry = { alpha: {}, beta: {} };

const before = capture(registry);
registry.gamma = {};
delete registry.alpha;
const after = capture(registry);

const result = diff(before, after);
// { added: ['gamma'], removed: ['alpha'], unchanged: ['beta'] }

console.log(formatDiff(result));
// + gamma
// - alpha
//   beta
```

## Why this exists

Long-lived module state tends to accumulate references that nobody remembers adding. A full heap profiler answers "how much memory", but not "which named reference appeared between these two checkpoints". This library answers the second question with a tiny surface: you hand it a root object, it copies the own enumerable keys, and it compares key presence between two copies.

The trade-off is that values are not compared. If you mutate `registry.beta` in place, `beta` shows up as unchanged. That is intentional: the diff is about reference lifetimes, and deep-comparing values would be slow, order-sensitive, and would report churn that callers tracking leaks do not care about. If you need value changes, capture a new key or compare the values yourself.

The other trade-off is eager copying. `capture` reads the keys immediately rather than holding a live view of the root. A live view would make the "before" snapshot change whenever the root changed, which defeats the purpose of having a snapshot at all.

## Awkward edge

Only own enumerable string keys are captured. Inherited properties and symbol keys are ignored, matching `Object.keys` semantics. If your root object uses symbols as reference names, this library will not see them, and that is a documented limitation rather than a bug.

## API

- `capture(root)` returns a frozen `{ refs }` snapshot. Throws `TypeError` if `root` is null or not an object.
- `diff(before, after)` returns `{ added, removed, unchanged }`, each a sorted `string[]`. Throws `TypeError` if either argument is not a snapshot with a `refs` object.
- `formatDiff(result)` returns a string with `+ `, `- ` and two-space prefixes for added, removed and unchanged keys respectively.
