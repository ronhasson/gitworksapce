// tools/filesystem/append-to-file.js

import fs from 'fs/promises';
import { validatePath, writeFileAtomically } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the append_to_file tool
 * Appends content to the end of a file
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {string} args.content - Content to append
 * @param {boolean} [args.add_newline=true] - Whether to add a newline before content
 * @returns {Object} - Response with success message
 */
export async function appendToFile(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    let existingContent = '';
    
    try {
      existingContent = await fs.readFile(validPath, 'utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    
    const newContent = existingContent + 
                      (args.add_newline !== false && existingContent ? '\n' : '') + 
                      args.content;
    
    // Use atomic write
    await writeFileAtomically(validPath, newContent);
    return {
      content: [{ type: "text", text: `Successfully appended to ${args.path}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
