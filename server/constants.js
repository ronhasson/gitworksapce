/**
 * Constants used throughout the Git Workspace MCP Server
 */

/**
 * Directories to skip during file indexing and operations
 * These are performance-critical exclusions for common build/cache directories
 */
export const SKIP_DIRS = new Set([
  // Dependencies
  'node_modules', 'vendor', 'venv', 'env',
  // Build outputs  
  'dist', 'build', 'out', 'target', 'bin', 'obj',
  // Framework/tool caches
  '.next', '.nuxt', '__pycache__', '.pytest_cache', '.nyc_output',
  // Version control
  '.git', '.svn', '.hg',
  // Editor/IDE
  '.vscode', '.idea', '.vs',
  // Logs and temp
  'logs', 'log', 'tmp', 'temp', 'coverage',
  // Other common outputs
  'public/build', 'static/build', '.output', '.cache'
]);

/**
 * Git commands that are allowed for read-only operations
 * This is a security measure to prevent destructive Git operations
 */
export const ALLOWED_GIT_COMMANDS = [
  'status', 'diff', 'log', 'branch', 'show', 'rev-parse', 'config'
];

/**
 * File extensions for different categories used in file indexing
 */
export const FILE_EXTENSIONS = {
  CODE: ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', 
         '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala'],
  CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'],
  DOCS: ['.md', '.txt', '.rst', '.adoc']
};

/**
 * Priority files that should be indexed first
 */
export const PRIORITY_FILES = [
  'package.json', 'requirements.txt', 'dockerfile', 'makefile', 'readme.md'
];

/**
 * File priorities for indexing (lower number = higher priority)
 */
export const FILE_PRIORITIES = {
  CRITICAL: 1,    // package.json, requirements.txt, etc.
  CODE: 2,        // Source code files
  CONFIG: 3,      // Configuration files
  DOCS: 4,        // Documentation files
  OTHER: 5        // Everything else
};

/**
 * Keywords to search for in TODO/FIXME finder
 */
export const TODO_KEYWORDS = ['TODO', 'FIXME', 'HACK', 'NOTE', 'BUG', 'XXX'];

/**
 * Performance limits for various operations
 */
export const PERFORMANCE_LIMITS = {
  CHUNK_SIZE: 1024,           // Bytes to read at a time for large files
  MAX_SEARCH_FILES: 200,      // Maximum files to search for TODOs/content
  MAX_MATCHES_PER_FILE: 5,    // Maximum matches to show per file in search
  MAX_FAST_FIND_RESULTS: 10,  // Default max results for fast file find
  INDEX_PROGRESS_INTERVAL: 1000  // Show progress every N files during indexing
};
