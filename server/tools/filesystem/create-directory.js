// tools/filesystem/create-directory.js

import fs from 'fs/promises';
import { validatePath } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the create_directory tool
 * Creates a new directory (with recursive option)
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - Directory path to create
 * @returns {Object} - Response with success message
 */
export async function createDirectory(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    await fs.mkdir(validPath, { recursive: true });
    return {
      content: [{ type: "text", text: `Successfully created directory ${args.path}` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
