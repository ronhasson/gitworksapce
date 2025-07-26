// tools/git/git-branch-history.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_branch_history tool
 * Shows commit history for a specific branch
 * 
 * @param {Object} args - Tool arguments
 * @param {string} [args.branch_name="HEAD"] - Branch name
 * @param {number} [args.limit] - Number of commits to show
 * @param {string} [args.since] - Show commits since date
 * @returns {Object} - Response with branch history
 */
export async function gitBranchHistory(args) {
  try {
    const gitArgs = ['log', args.branch_name || 'HEAD'];
    if (args.limit) gitArgs.push(`-${args.limit}`);
    if (args.since) gitArgs.push(`--since="${args.since}"`);
    gitArgs.push('--oneline');
    
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
