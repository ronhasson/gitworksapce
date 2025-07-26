// tools/filesystem/write-file.js

import fs from 'fs/promises';
import { validatePath, writeFileAtomically } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the write_file tool
 * Writes content to a file with atomic operations
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {string} args.content - Content to write
 * @returns {Object} - Response with success message
 */
export async function writeFile(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    
    // Enhanced: Use atomic operations with proper error handling
    try {
      // Try exclusive creation first
      await fs.writeFile(validPath, args.content, { encoding: "utf-8", flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') {
        // File exists, use atomic write
        await writeFileAtomically(validPath, args.content);
      } else {
        throw error;
      }
    }
    
    return {
      content: [{ type: "text", text: `Successfully wrote to ${args.path}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
