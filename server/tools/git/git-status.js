// tools/git/git-status.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_status tool
 * Shows the git status of the workspace
 * 
 * @param {Object} args - Tool arguments (none expected)
 * @returns {Object} - Response with git status output
 */
export async function gitStatus(args) {
  try {
    const output = await runGitCommand(['status', '--porcelain'], config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: output || "Working tree clean" }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
