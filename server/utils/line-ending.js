/**
 * Line ending detection and normalization utilities
 * Handles different line ending formats (CRLF, LF, CR) consistently
 */

/**
 * Detect the line ending format used in content
 * @param {string} content - Text content to analyze
 * @returns {string} - Line ending format ('\r\n', '\r', or '\n')
 */
export function detectLineEnding(content) {
  if (content.includes('\r\n')) return '\r\n';
  if (content.includes('\r')) return '\r';
  return '\n';
}

/**
 * Normalize line endings to Unix format (\n)
 * @param {string} text - Text with potentially mixed line endings
 * @returns {string} - Text with normalized line endings
 */
export function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}
