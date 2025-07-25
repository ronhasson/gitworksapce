// tools/index.js
// Main tools module - combines and re-exports all tool definitions

import { filesystemToolDefinitions } from './filesystem/index.js';
import { gitToolDefinitions } from './git/index.js';
import { searchToolDefinitions } from './search/index.js';
import { analysisToolDefinitions } from './analysis/index.js';
import { indexManagementToolDefinitions } from './index-management/index.js';

// Export individual category arrays
export { filesystemToolDefinitions } from './filesystem/index.js';
export { gitToolDefinitions } from './git/index.js';
export { searchToolDefinitions } from './search/index.js';
export { analysisToolDefinitions } from './analysis/index.js';
export { indexManagementToolDefinitions } from './index-management/index.js';

// Export all tool definitions combined
export const allToolDefinitions = [
  ...filesystemToolDefinitions,
  ...gitToolDefinitions,
  ...searchToolDefinitions,
  ...analysisToolDefinitions,
  ...indexManagementToolDefinitions
];

// Export individual tool definitions for direct access
export {
  // Filesystem tools
  readFileDefinition,
  writeFileDefinition,
  editFileDefinition,
  previewEditDefinition,
  appendToFileDefinition,
  replaceInFileDefinition,
  editFileAdvancedDefinition,
  listFilesDefinition,
  createDirectoryDefinition,
  deleteFileDefinition
} from './filesystem/index.js';

export {
  // Git tools
  gitStatusDefinition,
  gitDiffDefinition,
  gitLogDefinition,
  gitListBranchesDefinition,
  gitCompareBranchesDefinition,
  gitCompareCommitsDefinition,
  gitShowCommitDefinition,
  gitCurrentBranchDefinition,
  gitBranchHistoryDefinition
} from './git/index.js';

export {
  // Search tools
  fastFindFileDefinition,
  findFilesDefinition,
  searchContentDefinition
} from './search/index.js';

export {
  // Analysis tools
  getProjectStructureDefinition,
  analyzeCodeQualityDefinition,
  findTodosFixmesDefinition
} from './analysis/index.js';

export {
  // Index management tools
  refreshFileIndexDefinition,
  fileIndexStatsDefinition
} from './index-management/index.js';
