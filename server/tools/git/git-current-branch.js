// tools/git/git-current-branch.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_current_branch tool
 * Shows the current active branch and last commit
 * 
 * @param {Object} args - Tool arguments (none expected)
 * @returns {Object} - Response with current branch info
 */
export async function gitCurrentBranch(args) {
  try {
    const branch = await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], config.WORKSPACE_PATH);
    const lastCommit = await runGitCommand(['log', '-1', '--oneline'], config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: `Current branch: ${branch}\nLast commit: ${lastCommit}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
