// tools/git/git-list-branches.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_list_branches tool
 * Lists all git branches (local and optionally remote)
 * 
 * @param {Object} args - Tool arguments
 * @param {boolean} [args.include_remote=true] - Whether to include remote branches
 * @returns {Object} - Response with branch listing
 */
export async function gitListBranches(args) {
  try {
    const localOutput = await runGitCommand(['branch'], config.WORKSPACE_PATH);
    let result = "Local branches:\n" + localOutput;
    
    if (args.include_remote) {
      try {
        const remoteOutput = await runGitCommand(['branch', '-r'], config.WORKSPACE_PATH);
        if (remoteOutput) {
          result += "\n\nRemote branches:\n" + remoteOutput;
        }
      } catch (remoteError) {
        result += "\n\nRemote branches: (no remotes configured)";
      }
    }
    
    return {
      content: [{ type: "text", text: result }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
