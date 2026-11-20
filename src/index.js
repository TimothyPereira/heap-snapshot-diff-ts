/**
 * Public entry point for heap-snapshot-diff-ts.
 *
 * Keeping the entry point thin means the core diffing logic can be tested and
 * reasoned about without pulling in re-export bookkeeping. Consumers import
 * from here, never from core.js directly, so this file is the single place
 * where the public surface is declared.
 */
export { capture, diff, formatDiff } from './core.js';
