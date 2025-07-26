// tools/filesystem/read-file.js

import fs from 'fs/promises';
import { validatePath, tailFile, headFile } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the read_file tool
 * Reads file contents with optional tail/head operations
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {number} [args.tail] - Number of lines to read from end
 * @param {number} [args.head] - Number of lines to read from start
 * @returns {Object} - Response with file content
 */
export async function readFile(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    
    // Enhanced: Support tail and head operations for large files
    if (args.tail && args.head) {
      throw new Error("Cannot specify both tail and head parameters simultaneously");
    }
    
    if (args.tail) {
      // Use memory-efficient tail implementation for large files
      const tailContent = await tailFile(validPath, args.tail);
      return {
        content: [{ type: "text", text: tailContent }],
      };
    }
    
    if (args.head) {
      // Use memory-efficient head implementation for large files
      const headContent = await headFile(validPath, args.head);
      return {
        content: [{ type: "text", text: headContent }],
      };
    }
    
    const content = await fs.readFile(validPath, "utf-8");
    return {
      content: [{ type: "text", text: content }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
