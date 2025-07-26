// utils/edit.js

import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { detectLineEnding, createUnifiedDiff, formatDiff, writeFileAtomically } from './index.js';

/**
 * Enhanced file editing with line-by-line matching and better error handling
 * 
 * @param {string} filePath - Path to the file to edit
 * @param {number} lineStart - Starting line number (1-based)
 * @param {number} [lineEnd] - Ending line number (defaults to lineStart)
 * @param {string} newContent - New content to replace the specified lines
 * @returns {Object} - Object with diff and summary
 */
export async function editFileSafely(filePath, lineStart, lineEnd, newContent) {
  // Read original content and preserve line endings
  const originalContent = await fs.readFile(filePath, 'utf-8');
  const lineEnding = detectLineEnding(originalContent);
  
  // Parse lines
  const lines = originalContent.split(/\r?\n/);
  const newLines = newContent.split('\n');
  
  // Enhanced validation with detailed error messages
  if (lineStart < 1 || lineStart > lines.length) {
    throw new Error(`❌ Invalid line_start ${lineStart} - file only has ${lines.length} lines\n\n🔧 TROUBLESHOOTING:\n1. Use 'read_file ${path.basename(filePath)}' to see current content\n2. Count lines carefully (files start at line 1)\n3. Use 'preview_edit' to test parameters safely\n💡 The file currently has lines 1-${lines.length}`);
  }
  
  const actualLineEnd = lineEnd || lineStart;
  if (actualLineEnd < lineStart || actualLineEnd > lines.length) {
    throw new Error(`❌ Invalid line_end ${actualLineEnd} - must be between ${lineStart} and ${lines.length}\n\n🔧 TROUBLESHOOTING:\n1. Use 'read_file ${path.basename(filePath)}' to see current content\n2. Ensure line_end >= line_start\n3. Use 'preview_edit' to test parameters safely`);
  }
  
  // Apply edit with preserved line endings
  const editedLines = [...lines];
  editedLines.splice(lineStart - 1, actualLineEnd - lineStart + 1, ...newLines);
  const newFileContent = editedLines.join(lineEnding);
  
  // Create diff for response
  const diff = createUnifiedDiff(originalContent, newFileContent, filePath);
  
  // Enhanced atomic write with verification
  const tempPath = `${filePath}.${randomBytes(16).toString('hex')}.tmp`;
  
  try {
    // Write to temp file
    await fs.writeFile(tempPath, newFileContent, 'utf-8');
    
    // Atomic rename
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
  
  // Enhanced verification - check for corruption
  try {
    const verificationContent = await fs.readFile(filePath, 'utf-8');
    if (verificationContent.length === 0 && newFileContent.length > 0) {
      // Corruption detected! Restore from backup
      await writeFileAtomically(filePath, originalContent);
      throw new Error("❌ File corruption detected - restored from backup");
    }
  } catch (verifyError) {
    // Restore backup if verification fails
    try {
      await writeFileAtomically(filePath, originalContent);
      throw new Error(`❌ File verification failed - restored from backup: ${verifyError.message}`);
    } catch (restoreError) {
      throw new Error(`❌ CRITICAL: File write failed AND backup restoration failed! Manual recovery needed: ${verifyError.message}`);
    }
  }
  
  // Calculate statistics
  const linesReplaced = actualLineEnd - lineStart + 1;
  const linesAdded = newLines.length;
  const finalLineCount = editedLines.length;
  
  return {
    diff: formatDiff(diff),
    summary: `✅ Successfully edited ${path.basename(filePath)}:\n• Replaced ${linesReplaced} lines (lines ${lineStart}-${actualLineEnd})\n• Added ${linesAdded} new lines\n• File now has ${finalLineCount} lines (was ${lines.length})\n• Line ending style: ${lineEnding === '\r\n' ? 'CRLF' : lineEnding === '\r' ? 'CR' : 'LF'}\n\n🔍 VERIFICATION RECOMMENDED:\nUse 'read_file ${path.basename(filePath)}' to confirm edit looks correct\nUse 'git_diff' to see changes in context`
  };
}
