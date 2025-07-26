// tools/git/git-show-commit.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_show_commit tool
 * Shows details of a specific commit
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.commit_hash - Commit hash or reference
 * @param {boolean} [args.show_diff=true] - Include the diff in the output
 * @returns {Object} - Response with commit details
 */
export async function gitShowCommit(args) {
  try {
    const gitArgs = ['show'];
    if (!args.show_diff) gitArgs.push('--no-patch');
    gitArgs.push(args.commit_hash);
    
    const output = await runGitCommand(gitArgs, config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: output }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
