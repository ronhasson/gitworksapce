/**
 * Advanced file operation utilities
 * Provides atomic file operations, memory-efficient reading, and advanced editing
 */

import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { detectLineEnding, normalizeLineEndings } from './line-ending.js';
import { createUnifiedDiff, formatDiff } from './diff.js';
import { PERFORMANCE_LIMITS } from '../constants.js';

/**
 * Write file content atomically to prevent corruption
 * Uses temporary file + atomic rename for safety
 * @param {string} filePath - Target file path
 * @param {string} content - Content to write
 * @throws {Error} If write operation fails
 */
export async function writeFileAtomically(filePath, content) {
  // Use random temp file name to prevent collisions
  const tempPath = `${filePath}.${randomBytes(16).toString('hex')}.tmp`;
  
  try {
    // Write to temp file first
    await fs.writeFile(tempPath, content, 'utf-8');
    
    // Atomic rename - this is the key security feature
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {}
    throw error;
  }
}

/**
 * Memory-efficient tail file reading
 * Reads the last N lines without loading entire file into memory
 * @param {string} filePath - File to read from
 * @param {number} numLines - Number of lines to read from end
 * @returns {Promise<string>} - Last N lines joined with newlines
 */
export async function tailFile(filePath, numLines) {
  const CHUNK_SIZE = PERFORMANCE_LIMITS.CHUNK_SIZE; // Read chunks at a time
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;
  
  if (fileSize === 0) return '';
  
  // Open file for reading
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const lines = [];
    let position = fileSize;
    let chunk = Buffer.alloc(CHUNK_SIZE);
    let linesFound = 0;
    let remainingText = '';
    
    // Read chunks from the end of the file until we have enough lines
    while (position > 0 && linesFound < numLines) {
      const size = Math.min(CHUNK_SIZE, position);
      position -= size;
      
      const { bytesRead } = await fileHandle.read(chunk, 0, size, position);
      if (!bytesRead) break;
      
      // Get the chunk as a string and prepend any remaining text from previous iteration
      const readData = chunk.slice(0, bytesRead).toString('utf-8');
      const chunkText = readData + remainingText;
      
      // Split by newlines and count
      const chunkLines = normalizeLineEndings(chunkText).split('\n');
      
      // If this isn't the end of the file, the first line is likely incomplete
      // Save it to prepend to the next chunk
      if (position > 0) {
        remainingText = chunkLines[0];
        chunkLines.shift(); // Remove the first (incomplete) line
      }
      
      // Add lines to our result (up to the number we need)
      for (let i = chunkLines.length - 1; i >= 0 && linesFound < numLines; i--) {
        lines.unshift(chunkLines[i]);
        linesFound++;
      }
    }
    
    return lines.join('\n');
  } finally {
    await fileHandle.close();
  }
}

/**
 * Memory-efficient head file reading
 * Reads the first N lines without loading entire file into memory
 * @param {string} filePath - File to read from
 * @param {number} numLines - Number of lines to read from start
 * @returns {Promise<string>} - First N lines joined with newlines
 */
export async function headFile(filePath, numLines) {
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const lines = [];
    let buffer = '';
    let bytesRead = 0;
    const chunk = Buffer.alloc(PERFORMANCE_LIMITS.CHUNK_SIZE); // Chunk buffer
    
    // Read chunks and count lines until we have enough or reach EOF
    while (lines.length < numLines) {
      const result = await fileHandle.read(chunk, 0, chunk.length, bytesRead);
      if (result.bytesRead === 0) break; // End of file
      bytesRead += result.bytesRead;
      buffer += chunk.slice(0, result.bytesRead).toString('utf-8');
      
      const newLineIndex = buffer.lastIndexOf('\n');
      if (newLineIndex !== -1) {
        const completeLines = buffer.slice(0, newLineIndex).split('\n');
        buffer = buffer.slice(newLineIndex + 1);
        for (const line of completeLines) {
          lines.push(line);
          if (lines.length >= numLines) break;
        }
      }
    }
    
    // If there is leftover content and we still need lines, add it
    if (buffer.length > 0 && lines.length < numLines) {
      lines.push(buffer);
    }
    
    return lines.join('\n');
  } finally {
    await fileHandle.close();
  }
}

/**
 * Enhanced find-and-replace with intelligent line-by-line matching
 * Supports exact matching and flexible whitespace handling with indentation preservation
 * @param {string} filePath - File to edit
 * @param {Array} edits - Array of {oldText, newText} edit operations
 * @param {boolean} dryRun - If true, only return diff without applying changes
 * @returns {Promise<string>} - Formatted diff of changes
 * @throws {Error} If edit operations fail
 */
export async function applyFileEdits(filePath, edits, dryRun = false) {
  // Read file content and normalize line endings
  const content = normalizeLineEndings(await fs.readFile(filePath, 'utf-8'));
  const originalLineEnding = detectLineEnding(await fs.readFile(filePath, 'utf-8'));

  // Apply edits sequentially
  let modifiedContent = content;
  for (const edit of edits) {
    const normalizedOld = normalizeLineEndings(edit.oldText);
    const normalizedNew = normalizeLineEndings(edit.newText);

    // If exact match exists, use it
    if (modifiedContent.includes(normalizedOld)) {
      modifiedContent = modifiedContent.replace(normalizedOld, normalizedNew);
      continue;
    }

    // Otherwise, try line-by-line matching with flexibility for whitespace
    const oldLines = normalizedOld.split('\n');
    const contentLines = modifiedContent.split('\n');
    let matchFound = false;

    for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
      const potentialMatch = contentLines.slice(i, i + oldLines.length);

      // Compare lines with normalized whitespace
      const isMatch = oldLines.every((oldLine, j) => {
        const contentLine = potentialMatch[j];
        return oldLine.trim() === contentLine.trim();
      });

      if (isMatch) {
        // Preserve original indentation of first line
        const originalIndent = contentLines[i].match(/^\s*/)?.[0] || '';
        const newLines = normalizedNew.split('\n').map((line, j) => {
          if (j === 0) return originalIndent + line.trimStart();
          // For subsequent lines, try to preserve relative indentation
          const oldIndent = oldLines[j]?.match(/^\s*/)?.[0] || '';
          const newIndent = line.match(/^\s*/)?.[0] || '';
          if (oldIndent && newIndent) {
            const relativeIndent = newIndent.length - oldIndent.length;
            return originalIndent + ' '.repeat(Math.max(0, relativeIndent)) + line.trimStart();
          }
          return line;
        });

        contentLines.splice(i, oldLines.length, ...newLines);
        modifiedContent = contentLines.join('\n');
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      throw new Error(`Could not find exact match for edit:\n${edit.oldText}`);
    }
  }

  // Restore original line endings
  const finalContent = modifiedContent.split('\n').join(originalLineEnding);

  // Create unified diff
  const originalFileContent = await fs.readFile(filePath, 'utf-8');
  const diff = createUnifiedDiff(originalFileContent, finalContent, filePath);

  if (!dryRun) {
    // Use atomic write
    await writeFileAtomically(filePath, finalContent);
  }

  return formatDiff(diff);
}
