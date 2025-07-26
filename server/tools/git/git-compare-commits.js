// tools/git/git-compare-commits.js

import { runGitCommand } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the git_compare_commits tool
 * Compares changes between two specific commits
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.commit_from - Starting commit hash or reference
 * @param {string} [args.commit_to="HEAD"] - Ending commit hash or reference
 * @param {string} [args.file_path] - Specific file to compare
 * @param {boolean} [args.show_stats=true] - Show file change statistics
 * @returns {Object} - Response with comparison output
 */
export async function gitCompareCommits(args) {
  try {
    const gitArgs = ['diff', `${args.commit_from}...${args.commit_to || 'HEAD'}`];
    if (args.show_stats) gitArgs.push('--stat');
    if (args.file_path) gitArgs.push(args.file_path);
    
    const output = await runGitCommand(gitArgs, config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: output || `No differences between ${args.commit_from} and ${args.commit_to || 'HEAD'}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
