// tools/filesystem/replace-in-file.js

import { validatePath, applyFileEdits } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the replace_in_file tool
 * Replaces text patterns in a file
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {string} args.search_text - Text to search for
 * @param {string} args.replace_text - Text to replace with
 * @param {boolean} [args.replace_all=false] - Whether to replace all occurrences
 * @returns {Object} - Response with diff showing changes
 */
export async function replaceInFile(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    const edits = [{
      oldText: args.search_text,
      newText: args.replace_text
    }];
    
    // Use enhanced line-by-line matching
    const diff = await applyFileEdits(validPath, edits, false);
    
    return {
      content: [{ type: "text", text: diff }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
