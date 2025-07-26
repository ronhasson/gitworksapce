// tools/implementations.js
// Registry of all tool implementations for easy lookup

// Import all tool implementations
import {
  readFile,
  writeFile,
  editFile,
  previewEdit,
  appendToFile,
  replaceInFile,
  editFileAdvanced,
  listFiles,
  createDirectory,
  deleteFile
} from './filesystem/index.js';

import {
  gitStatus,
  gitDiff,
  gitLog,
  gitListBranches,
  gitCompareBranches,
  gitCompareCommits,
  gitShowCommit,
  gitCurrentBranch,
  gitBranchHistory
} from './git/index.js';

import {
  fastFindFile,
  findFiles,
  searchContent
} from './search/index.js';

import {
  getProjectStructure,
  analyzeCodeQuality,
  findTodosFixmes
} from './analysis/index.js';

import {
  refreshFileIndex,
  fileIndexStats
} from './index-management/index.js';

// Create a registry that maps tool names to their implementations
export const toolImplementations = {
  // Filesystem tools
  'read_file': readFile,
  'write_file': writeFile,
  'edit_file': editFile,
  'preview_edit': previewEdit,
  'append_to_file': appendToFile,
  'replace_in_file': replaceInFile,
  'edit_file_advanced': editFileAdvanced,
  'list_files': listFiles,
  'create_directory': createDirectory,
  'delete_file': deleteFile,
  
  // Git tools
  'git_status': gitStatus,
  'git_diff': gitDiff,
  'git_log': gitLog,
  'git_list_branches': gitListBranches,
  'git_compare_branches': gitCompareBranches,
  'git_compare_commits': gitCompareCommits,
  'git_show_commit': gitShowCommit,
  'git_current_branch': gitCurrentBranch,
  'git_branch_history': gitBranchHistory,
  
  // Search tools
  'fast_find_file': fastFindFile,
  'find_files': findFiles,
  'search_content': searchContent,
  
  // Analysis tools
  'get_project_structure': getProjectStructure,
  'analyze_code_quality': analyzeCodeQuality,
  'find_todos_fixmes': findTodosFixmes,
  
  // Index management tools
  'refresh_file_index': refreshFileIndex,
  'file_index_stats': fileIndexStats
};

// Export individual implementations for direct access if needed
export {
  // Filesystem tools
  readFile,
  writeFile,
  editFile,
  previewEdit,
  appendToFile,
  replaceInFile,
  editFileAdvanced,
  listFiles,
  createDirectory,
  deleteFile,
  
  // Git tools
  gitStatus,
  gitDiff,
  gitLog,
  gitListBranches,
  gitCompareBranches,
  gitCompareCommits,
  gitShowCommit,
  gitCurrentBranch,
  gitBranchHistory,
  
  // Search tools
  fastFindFile,
  findFiles,
  searchContent,
  
  // Analysis tools
  getProjectStructure,
  analyzeCodeQuality,
  findTodosFixmes,
  
  // Index management tools
  refreshFileIndex,
  fileIndexStats
};
