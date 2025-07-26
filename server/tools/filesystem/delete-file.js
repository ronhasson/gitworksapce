// tools/filesystem/delete-file.js

import fs from 'fs/promises';
import { validatePath } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the delete_file tool
 * Deletes a file or directory
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Path to delete
 * @returns {Object} - Response with success message
 */
export async function deleteFile(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    const stats = await fs.stat(validPath);
    
    if (stats.isDirectory()) {
      await fs.rm(validPath, { recursive: true, force: true });
      return {
        content: [{ type: "text", text: `Successfully deleted directory ${args.path}` }]
      };
    } else {
      await fs.unlink(validPath);
      return {
        content: [{ type: "text", text: `Successfully deleted file ${args.path}` }]
      };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
