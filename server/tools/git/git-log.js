// tools/git/git-log.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_log tool
 * Shows git commit history
 * 
 * @param {Object} args - Tool arguments
 * @param {boolean} [args.oneline] - Show one line per commit
 * @param {number} [args.limit] - Number of commits to show
 * @returns {Object} - Response with git log output
 */
export async function gitLog(args) {
  try {
    const gitArgs = ['log'];
    if (args.oneline) gitArgs.push('--oneline');
    if (args.limit) gitArgs.push(`-${args.limit}`);
    
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
