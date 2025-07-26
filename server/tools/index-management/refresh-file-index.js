// tools/index-management/refresh-file-index.js

import { buildFileIndex, getFileIndex } from '../../file-index/index.js';

/**
 * Implementation of the refresh_file_index tool
 * Refreshes the file index to include newly created files
 * 
 * @param {Object} args - Tool arguments (none expected)
 * @returns {Object} - Response with index refresh status
 */
export async function refreshFileIndex(args) {
  try {
    const fileIndex = getFileIndex();
    const oldSize = fileIndex.size;
    await buildFileIndex();
    const newSize = getFileIndex().size;
    
    return {
      content: [{ type: "text", text: `File index refreshed: ${oldSize} → ${newSize} files` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
