// tools/analysis/analyze-code-quality.js

import fs from 'fs/promises';
import { validatePath } from '../../utils/index.js';
import { config } from '../../config.js';

/**
 * Implementation of the analyze_code_quality tool
 * Analyzes code quality and suggests improvements
 * 
 * @param {Object} args - Tool arguments
 * @param {string} args.file_path - Path to file to analyze
 * @param {string} [args.language] - Programming language (auto-detected if not specified)
 * @returns {Object} - Response with code quality analysis
 */
export async function analyzeCodeQuality(args) {
  try {
    const validPath = await validatePath(args.file_path, config.WORKSPACE_PATH);
    const content = await fs.readFile(validPath, 'utf-8');
    const lines = content.split('\n');
    
    const analysis = {
      totalLines: lines.length,
      codeLines: lines.filter(line => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('#')).length,
      commentLines: lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('#')).length,
      blankLines: lines.filter(line => !line.trim()).length,
      longLines: lines.filter(line => line.length > 100).length,
      trailingWhitespace: lines.filter(line => /\s+$/.test(line)).length
    };
    
    const issues = [];
    if (analysis.longLines > 0) issues.push(`${analysis.longLines} lines exceed 100 characters`);
    if (analysis.trailingWhitespace > 0) issues.push(`${analysis.trailingWhitespace} lines have trailing whitespace`);
    
    const result = [
      `Code Quality Analysis for ${args.file_path}:`,
      `• Total lines: ${analysis.totalLines}`,
      `• Code lines: ${analysis.codeLines}`,
      `• Comment lines: ${analysis.commentLines}`,
      `• Blank lines: ${analysis.blankLines}`,
      '',
      issues.length > 0 ? 'Issues found:' : 'No major issues found',
      ...issues.map(issue => `• ${issue}`)
    ].filter(Boolean);
    
    return {
      content: [{ type: "text", text: result.join('\n') }]
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}
