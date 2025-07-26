// tools/search/fast-find-file.js

import path from 'path';
import { searchFileIndex } from '../../file-index/search.js';
import { PERFORMANCE_LIMITS } from '../../constants.js';
import { config } from '../../config.js';

/**
 * Implementation of the fast_find_file tool
 * Quickly finds files using the file index
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.file_path - File path to search for
 * @param {number} [args.limit] - Maximum number of results to return
 * @returns {Object} - Response with file paths
 */
export async function fastFindFile(args) {
  try {
    const results = searchFileIndex(args.file_path, args.limit || PERFORMANCE_LIMITS.MAX_FAST_FIND_RESULTS);
    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "No files found matching the search criteria" }]
      };
    }
    
    const relativePaths = results.map(f => path.relative(config.WORKSPACE_PATH, f));
    return {
      content: [{ type: "text", text: relativePaths.join('\n') }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
