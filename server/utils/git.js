/**
 * Git command execution utilities
 * Provides secure, read-only Git operations with enhanced error handling
 */

import { spawn } from 'child_process';
import { ALLOWED_GIT_COMMANDS } from '../constants.js';

/**
 * Execute a Git command with security restrictions
 * Only allows read-only Git operations for security
 * @param {Array<string>} args - Git command arguments (e.g., ['status', '--porcelain'])
 * @param {string} workspacePath - Working directory for Git command
 * @param {Object} options - Additional spawn options
 * @returns {Promise<string>} - Git command output
 * @throws {Error} If command is not allowed or execution fails
 */
export async function runGitCommand(args, workspacePath, options = {}) {
  const command = args[0];
  
  // Enhanced security - explicitly block ALL write operations
  const blockedCommands = ['add', 'commit', 'push', 'pull', 'merge', 'rebase', 'reset', 'checkout', 'switch', 'restore', 'clean', 'rm'];
  if (blockedCommands.includes(command)) {
    throw new Error(`❌ Git command '${command}' is not allowed - this server only supports read operations for security`);
  }
  
  if (!ALLOWED_GIT_COMMANDS.includes(command)) {
    throw new Error(`❌ Git command '${command}' is not in the allowed list. Allowed commands: ${ALLOWED_GIT_COMMANDS.join(', ')}`);
  }
  
  return new Promise((resolve, reject) => {
    const git = spawn('git', args, {
      cwd: workspacePath,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });
    
    let stdout = '';
    let stderr = '';
    
    git.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    git.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    git.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Git command failed (exit code ${code}): ${stderr || stdout}`));
      }
    });
    
    git.on('error', (err) => {
      reject(new Error(`Failed to run git command: ${err.message}`));
    });
  });
}
