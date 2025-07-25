/**
 * Utility functions index
 * Re-exports all utility functions for convenient importing
 */

// Path utilities
export {
  normalizePath,
  expandHome,
  validatePath
} from './path.js';

// Line ending utilities
export {
  detectLineEnding,
  normalizeLineEndings
} from './line-ending.js';

// Diff utilities
export {
  createUnifiedDiff,
  formatDiff
} from './diff.js';

// File operation utilities
export {
  writeFileAtomically,
  tailFile,
  headFile,
  applyFileEdits
} from './file.js';

// Git utilities
export {
  runGitCommand
} from './git.js';

// Logger utilities
export {
  debugLog
} from './logger.js';
