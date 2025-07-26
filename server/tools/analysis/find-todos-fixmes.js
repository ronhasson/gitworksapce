// tools/analysis/find-todos-fixmes.js

import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';
import { getFileIndex } from '../../file-index/index.js';
import { TODO_KEYWORDS, PERFORMANCE_LIMITS } from '../../constants.js';
import { debugLog } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the find_todos_fixmes tool
 * Finds all TODO, FIXME, HACK, and NOTE comments in the project
 * 
 * @param {Object} args - Tool arguments
 * @param {string} [args.file_pattern="*"] - File pattern to search
 * @param {boolean} [args.include_line_context=true] - Include surrounding code context
 * @returns {Object} - Response with TODO/FIXME comments
 */
export async function findTodosFixmes(args) {
  try {
    const fileIndex = getFileIndex();
    const keywords = TODO_KEYWORDS;
    const results = [];
    let filesSearched = 0;
    const maxFiles = PERFORMANCE_LIMITS.MAX_SEARCH_FILES;
    
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
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const found = keywords.find(keyword => 
            line.toUpperCase().includes(keyword + ':') || 
            line.toUpperCase().includes(keyword + ' ')
          );
          
          if (found) {
            results.push(`${relativePath}:${i + 1}: ${line.trim()}`);
            
            if (args.include_line_context) {
              // Add context lines
              if (i > 0) results.push(`${relativePath}:${i}: ${lines[i - 1].trim()}`);
              if (i < lines.length - 1) results.push(`${relativePath}:${i + 2}: ${lines[i + 1].trim()}`);
              results.push(''); // Empty line for separation
            }
          }
        }
        
        filesSearched++;
      } catch (error) {
        debugLog(`Error searching ${relativePath}:`, error.message);
      }
    }
    
    return {
      content: [{ type: "text", text: results.join('\n') || "No TODO/FIXME comments found" }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
