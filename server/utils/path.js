/**
 * Path validation and normalization utilities
 * Provides security-focused path handling for the Git Workspace MCP Server
 */

import path from 'path';
import os from 'os';
import fs from 'fs/promises';

/**
 * Normalize a file path for consistent handling
 * @param {string} p - Path to normalize
 * @returns {string} - Normalized path
 */
export function normalizePath(p) {
  return path.normalize(p);
}

/**
 * Expand home directory (~) in file paths
 * @param {string} filepath - File path that may contain ~
 * @returns {string} - Path with ~ expanded to home directory
 */
export function expandHome(filepath) {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Enhanced security: Path validation with better symlink handling
 * Ensures paths are within the workspace and prevents directory traversal attacks
 * @param {string} requestedPath - Path to validate
 * @param {string} workspacePath - Base workspace path
 * @returns {Promise<string>} - Validated absolute path
 * @throws {Error} If path is outside workspace or invalid
 */
export async function validatePath(requestedPath, workspacePath) {
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(workspacePath, expandedPath);

  const normalizedRequested = normalizePath(absolute);
  const normalizedWorkspace = normalizePath(path.resolve(workspacePath));

  // Check if path is within workspace
  const relativePath = path.relative(normalizedWorkspace, normalizedRequested);
  const isWithin = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  
  if (!isWithin) {
    throw new Error(`Access denied - path outside workspace: ${absolute} not in ${normalizedWorkspace}`);
  }

  // Enhanced symlink handling - check real path
  try {
    const realPath = await fs.realpath(absolute);
    const normalizedReal = normalizePath(realPath);
    const realRelativePath = path.relative(normalizedWorkspace, normalizedReal);
    const realIsWithin = !realRelativePath.startsWith('..') && !path.isAbsolute(realRelativePath);
    
    if (!realIsWithin) {
      throw new Error(`Access denied - symlink target outside workspace: ${realPath} not in ${normalizedWorkspace}`);
    }
    return realPath;
  } catch (error) {
    // For new files that don't exist yet, verify parent directory
    if (error.code === 'ENOENT') {
      const parentDir = path.dirname(absolute);
      try {
        const realParentPath = await fs.realpath(parentDir);
        const normalizedParent = normalizePath(realParentPath);
        const parentRelativePath = path.relative(normalizedWorkspace, normalizedParent);
        const parentIsWithin = !parentRelativePath.startsWith('..') && !path.isAbsolute(parentRelativePath);
        
        if (!parentIsWithin) {
          throw new Error(`Access denied - parent directory outside workspace: ${realParentPath} not in ${normalizedWorkspace}`);
        }
        return absolute;
      } catch {
        throw new Error(`Parent directory does not exist: ${parentDir}`);
      }
    }
    throw error;
  }
}
