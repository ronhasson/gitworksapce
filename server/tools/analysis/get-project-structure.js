// tools/analysis/get-project-structure.js

import fs from 'fs/promises';
import path from 'path';
import { shouldSkipDirectory, shouldSkipFile } from '../../file-index/collect.js';
import { config } from '../../config.js';

/**
 * Implementation of the get_project_structure tool
 * Gets an overview of the project structure
 * 
 * @param {Object} args - Tool arguments
 * @param {number} [args.max_depth=3] - Maximum directory depth to traverse
 * @returns {Object} - Response with project structure tree
 */
export async function getProjectStructure(args) {
  try {
    async function buildTree(currentPath, currentDepth = 0) {
      if (currentDepth >= (args.max_depth || 3)) return [];
      
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const result = [];
        
        for (const entry of entries) {
          if (shouldSkipDirectory(entry.name) || shouldSkipFile(entry.name)) continue;
          
          const entryPath = path.join(currentPath, entry.name);
          const relativePath = path.relative(config.WORKSPACE_PATH, entryPath);
          const prefix = '  '.repeat(currentDepth) + (entry.isDirectory() ? '📁 ' : '📄 ');
          
          result.push(prefix + entry.name);
          
          if (entry.isDirectory()) {
            const children = await buildTree(entryPath, currentDepth + 1);
            result.push(...children);
          }
        }
        
        return result;
      } catch (error) {
        return [];
      }
    }
    
    const tree = await buildTree(config.WORKSPACE_PATH);
    return {
      content: [{ type: "text", text: tree.join('\n') || "Empty project" }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
