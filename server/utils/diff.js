/**
 * Diff generation and formatting utilities
 * Provides unified diff creation and formatting for file operations
 */

import { createTwoFilesPatch } from 'diff';
import { normalizeLineEndings } from './line-ending.js';

/**
 * Create a unified diff between two file contents
 * @param {string} originalContent - Original file content
 * @param {string} newContent - Modified file content
 * @param {string} filepath - File path for context (default: 'file')
 * @returns {string} - Unified diff string
 */
export function createUnifiedDiff(originalContent, newContent, filepath = 'file') {
  const normalizedOriginal = normalizeLineEndings(originalContent);
  const normalizedNew = normalizeLineEndings(newContent);

  return createTwoFilesPatch(
    filepath,
    filepath,
    normalizedOriginal,
    normalizedNew,
    'original',
    'modified'
  );
}

/**
 * Format a diff with proper markdown code blocks
 * Automatically determines the number of backticks needed to avoid conflicts
 * @param {string} diff - Diff content to format
 * @returns {string} - Formatted diff with markdown code blocks
 */
export function formatDiff(diff) {
  let numBackticks = 3;
  while (diff.includes('`'.repeat(numBackticks))) {
    numBackticks++;
  }
  return `${'`'.repeat(numBackticks)}diff\n${diff}${'`'.repeat(numBackticks)}\n\n`;
}
