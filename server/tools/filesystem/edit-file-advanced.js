// tools/filesystem/edit-file-advanced.js

import { validatePath, applyFileEdits } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the edit_file_advanced tool
 * Applies multiple edits to a file using advanced edit operations
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {Array} args.edits - Array of edit operations
 * @param {boolean} [args.dryRun=false] - Whether to preview changes without applying
 * @returns {Object} - Response with diff showing changes
 */
export async function editFileAdvanced(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    const diff = await applyFileEdits(validPath, args.edits, args.dryRun || false);
    
    const action = args.dryRun ? "PREVIEW" : "Applied";
    return {
      content: [{ type: "text", text: `${action} ${args.edits.length} edit(s):\n\n${diff}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
