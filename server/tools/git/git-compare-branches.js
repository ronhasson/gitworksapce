// tools/git/git-compare-branches.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_compare_branches tool
 * Compares changes between two branches
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.base_branch - Base branch to compare from
 * @param {string} [args.compare_branch="HEAD"] - Branch to compare to
 * @param {string} [args.file_path] - Specific file to compare
 * @param {boolean} [args.show_stats=true] - Show file change statistics
 * @returns {Object} - Response with comparison output
 */
export async function gitCompareBranches(args) {
  try {
    const gitArgs = ['diff', `${args.base_branch}...${args.compare_branch || 'HEAD'}`];
    if (args.show_stats) gitArgs.push('--stat');
    if (args.file_path) gitArgs.push(args.file_path);
    
    const output = await runGitCommand(gitArgs, config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: output || `No differences between ${args.base_branch} and ${args.compare_branch || 'HEAD'}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
