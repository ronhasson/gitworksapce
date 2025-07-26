// tools/git/git-diff.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_diff tool
 * Shows git diff output
 * 
 * @param {Object} args - Tool arguments
 * @param {boolean} [args.staged] - Show staged changes only
 * @param {string} [args.file_path] - Specific file to diff
 * @returns {Object} - Response with git diff output
 */
export async function gitDiff(args) {
  try {
    const gitArgs = ['diff'];
    if (args.staged) gitArgs.push('--cached');
    if (args.file_path) gitArgs.push(args.file_path);
    
    const output = await runGitCommand(gitArgs, config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: output || "No changes" }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
