// tools/filesystem/edit-file.js

import { validatePath, editFileSafely } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the edit_file tool
 * Edits file content by replacing specific lines
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {number} args.line_start - Starting line number (1-based)
 * @param {number} [args.line_end] - Ending line number (defaults to line_start)
 * @param {string} args.new_content - New content to replace the specified lines
 * @returns {Object} - Response with diff and summary
 */
export async function editFile(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    const result = await editFileSafely(validPath, args.line_start, args.line_end, args.new_content);
    return {
      content: [{ type: "text", text: result.diff + result.summary }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
