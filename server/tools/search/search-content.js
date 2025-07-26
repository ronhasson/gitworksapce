// tools/search/search-content.js

import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';
import { getFileIndex } from '../../file-index/index.js';
import { PERFORMANCE_LIMITS } from '../../constants.js';
import { debugLog } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the search_content tool
 * Searches for text content within files
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.query - Text to search for
 * @param {string} [args.file_pattern="*"] - File pattern to search in
 * @param {boolean} [args.case_sensitive=false] - Case sensitive search
 * @returns {Object} - Response with search results
 */
export async function searchContent(args) {
  try {
    const fileIndex = getFileIndex();
    const searchResults = [];
    let filesSearched = 0;
    const maxFiles = PERFORMANCE_LIMITS.MAX_SEARCH_FILES;
    const maxMatchesPerFile = PERFORMANCE_LIMITS.MAX_MATCHES_PER_FILE;
    
    for (const [relativePath, info] of fileIndex) {
      if (filesSearched >= maxFiles) break;
      
      // Skip if doesn't match file pattern
      if (args.file_pattern && args.file_pattern !== '*') {
        if (!minimatch(info.name, args.file_pattern)) continue;
      }
      
      try {
        const fullPath = path.resolve(config.WORKSPACE_PATH, relativePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        const query = args.case_sensitive ? args.query : args.query.toLowerCase();
        let matches = 0;
        
        for (let i = 0; i < lines.length && matches < maxMatchesPerFile; i++) {
          const line = args.case_sensitive ? lines[i] : lines[i].toLowerCase();
          if (line.includes(query)) {
            searchResults.push(`${relativePath}:${i + 1}: ${lines[i].trim()}`);
            matches++;
          }
        }
        
        filesSearched++;
      } catch (error) {
        debugLog(`Error searching ${relativePath}:`, error.message);
      }
    }
    
    return {
      content: [{ type: "text", text: searchResults.join('\n') || "No matches found" }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
