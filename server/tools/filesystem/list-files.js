// tools/filesystem/list-files.js

import fs from 'fs/promises';
import path from 'path';
import { validatePath } from '../../utils/index.js';
import { collectFilesFiltered } from '../../file-index/collect.js';
import { config } from '../../config.js';

/**
 * Implementation of the list_files tool
 * Lists files and directories in the workspace
 * 
 * @param {Object} args - Tool arguments
 * @param {string} [args.path="."] - Path to list (relative to workspace)
 * @param {boolean} [args.recursive=false] - Whether to list recursively
 * @param {boolean} [args.include_hidden=false] - Whether to include hidden files
 * @returns {Object} - Response with file listing
 */
export async function listFiles(args) {
  try {
    const targetPath = args.path || ".";
    const validPath = await validatePath(targetPath, config.WORKSPACE_PATH);
    
    if (args.recursive) {
      const files = await collectFilesFiltered(validPath);
      const relativePaths = files.map(f => path.relative(config.WORKSPACE_PATH, f));
      return {
        content: [{ type: "text", text: relativePaths.join('\n') }]
      };
    } else {
      const entries = await fs.readdir(validPath, { withFileTypes: true });
      const formatted = entries
        .filter(entry => args.include_hidden || !entry.name.startsWith('.'))
        .map(entry => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
        .join('\n');
      return {
        content: [{ type: "text", text: formatted }]
      };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
