// tools/search/find-files.js

import path from 'path';
import { minimatch } from 'minimatch';
import { collectFilesFiltered } from '../../file-index/collect.js';
import { searchFileIndex } from '../../file-index/search.js';
import { config } from '../../config.js';

/**
 * Implementation of the find_files tool
 * Finds files by name pattern with optional fuzzy matching
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.pattern - File name pattern to search for
 * @param {boolean} [args.fuzzy_match=true] - Enable fuzzy matching
 * @param {boolean} [args.case_sensitive=false] - Case sensitive search
 * @returns {Object} - Response with matching file paths
 */
export async function findFiles(args) {
  try {
    if (!args.fuzzy_match) {
      // Use simple pattern matching
      const allFiles = await collectFilesFiltered(config.WORKSPACE_PATH);
      const pattern = args.case_sensitive ? args.pattern : args.pattern.toLowerCase();
      const results = allFiles.filter(filePath => {
        const fileName = path.basename(filePath);
        const checkName = args.case_sensitive ? fileName : fileName.toLowerCase();
        return minimatch(checkName, `*${pattern}*`);
      });
      
      const relativePaths = results.map(f => path.relative(config.WORKSPACE_PATH, f));
      return {
        content: [{ type: "text", text: relativePaths.join('\n') || "No files found" }]
      };
    } else {
      // Use file index for fuzzy matching
      const results = searchFileIndex(args.pattern);
      const relativePaths = results.map(f => path.relative(config.WORKSPACE_PATH, f));
      return {
        content: [{ type: "text", text: relativePaths.join('\n') || "No files found" }]
      };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
