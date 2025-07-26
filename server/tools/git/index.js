// tools/git/index.js

// Re-exports all git tool implementations for convenient importing
export { gitStatus } from './git-status.js';
export { gitDiff } from './git-diff.js';
export { gitLog } from './git-log.js';
export { gitListBranches } from './git-list-branches.js';
export { gitCompareBranches } from './git-compare-branches.js';
export { gitCompareCommits } from './git-compare-commits.js';
export { gitShowCommit } from './git-show-commit.js';
export { gitCurrentBranch } from './git-current-branch.js';
export { gitBranchHistory } from './git-branch-history.js';

// Re-exports all git tool definitions
export {
  gitStatusDefinition,
  gitDiffDefinition,
  gitLogDefinition,
  gitListBranchesDefinition,
  gitCompareBranchesDefinition,
  gitCompareCommitsDefinition,
  gitShowCommitDefinition,
  gitCurrentBranchDefinition,
  gitBranchHistoryDefinition,
  gitToolDefinitions
} from './definitions.js';
