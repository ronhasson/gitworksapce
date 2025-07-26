// tools/filesystem/preview-edit.js

import fs from 'fs/promises';
import path from 'path';
import { validatePath, detectLineEnding, createUnifiedDiff, formatDiff } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the preview_edit tool
 * Previews what an edit would do without applying it
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.path - File path
 * @param {number} args.line_start - Starting line number (1-based)
 * @param {number} [args.line_end] - Ending line number (defaults to line_start)
 * @param {string} args.new_content - New content to replace the specified lines
 * @returns {Object} - Response with preview diff
 */
export async function previewEdit(args) {
  try {
    const validPath = await validatePath(args.path, config.WORKSPACE_PATH);
    const originalContent = await fs.readFile(validPath, 'utf-8');
    const lineEnding = detectLineEnding(originalContent);
    const lines = originalContent.split(/\r?\n/);
    const newLines = args.new_content.split('\n');
    
    // Enhanced validation with detailed error messages
    if (args.line_start < 1 || args.line_start > lines.length) {
      return {
        content: [{ type: "text", text: `❌ Invalid line_start ${args.line_start} - file only has ${lines.length} lines\n\n🔧 TROUBLESHOOTING:\n1. Use 'read_file ${path.basename(args.path)}' to see current content\n2. Count lines carefully (files start at line 1)\n3. Use 'preview_edit' to test parameters safely\n💡 The file currently has lines 1-${lines.length}` }]
      };
    }
    
    const actualLineEnd = args.line_end || args.line_start;
    if (actualLineEnd < args.line_start || actualLineEnd > lines.length) {
      return {
        content: [{ type: "text", text: `❌ Invalid line_end ${actualLineEnd} - must be between ${args.line_start} and ${lines.length}\n\n🔧 TROUBLESHOOTING:\n1. Ensure line_end >= line_start\n2. Use 'read_file ${path.basename(args.path)}' to see current content\n3. File has ${lines.length} lines total` }]
      };
    }
    
    // Create preview with preserved line endings
    const previewLines = [...lines];
    previewLines.splice(args.line_start - 1, actualLineEnd - args.line_start + 1, ...newLines);
    const previewContent = previewLines.join(lineEnding);
    
    const diff = createUnifiedDiff(originalContent, previewContent, args.path);
    
    return {
      content: [{ type: "text", text: `🔍 PREVIEW - This is what the edit would do:\n\n${formatDiff(diff)}\n✅ Line ending style: ${lineEnding === '\r\n' ? 'CRLF' : lineEnding === '\r' ? 'CR' : 'LF'} (preserved)\n\nTo apply these changes, use: edit_file with the same parameters` }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
