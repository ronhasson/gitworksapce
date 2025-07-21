#!/usr/bin/env node

// Enhanced startup logging and error handling
console.error('🚀 Starting Git Workspace MCP Server...');
console.error(`📋 Node.js version: ${process.version}`);
console.error(`📋 Platform: ${process.platform}`);
console.error(`📋 Architecture: ${process.arch}`);

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

console.error('📦 Loading dependencies...');

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  RootsListChangedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from 'os';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
import { minimatch } from 'minimatch';
import { diffLines, createTwoFilesPatch } from 'diff';

console.error('✅ Dependencies loaded successfully');

// Configuration from environment variables
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || process.cwd();
const ENABLE_FILE_INDEXING = process.env.ENABLE_FILE_INDEXING !== 'false';
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Performance-critical constants  
const SKIP_DIRS = new Set([
  // Dependencies
  'node_modules', 'vendor', 'venv', 'env',
  // Build outputs  
  'dist', 'build', 'out', 'target', 'bin', 'obj',
  // Framework/tool caches
  '.next', '.nuxt', '__pycache__', '.pytest_cache', '.nyc_output',
  // Version control
  '.git', '.svn', '.hg',
  // Editor/IDE
  '.vscode', '.idea', '.vs',
  // Logs and temp
  'logs', 'log', 'tmp', 'temp', 'coverage',
  // Other common outputs
  'public/build', 'static/build', '.output', '.cache'
]);

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// File index for performance
let fileIndex = new Map();
let indexLastBuilt = null;

function debugLog(...args) {
  if (DEBUG_MODE) {
    console.error('[DEBUG]', ...args);
  }
}

// Utility functions
function normalizePath(p) {
  return path.normalize(p);
}

function expandHome(filepath) {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Enhanced security: Path validation with better symlink handling
async function validatePath(requestedPath) {
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(WORKSPACE_PATH, expandedPath);

  const normalizedRequested = normalizePath(absolute);
  const normalizedWorkspace = normalizePath(path.resolve(WORKSPACE_PATH));

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

// Enhanced line ending utilities
function detectLineEnding(content) {
  if (content.includes('\r\n')) return '\r\n';
  if (content.includes('\r')) return '\r';
  return '\n';
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

// Enhanced diff utilities
function createUnifiedDiff(originalContent, newContent, filepath = 'file') {
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

function formatDiff(diff) {
  let numBackticks = 3;
  while (diff.includes('`'.repeat(numBackticks))) {
    numBackticks++;
  }
  return `${'`'.repeat(numBackticks)}diff\n${diff}${'`'.repeat(numBackticks)}\n\n`;
}

// Enhanced atomic file operations
async function writeFileAtomically(filePath, content) {
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

// Enhanced file editing with line-by-line matching and better error handling
async function editFileSafely(filePath, lineStart, lineEnd, newContent) {
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

// Memory-efficient tail file reading
async function tailFile(filePath, numLines) {
  const CHUNK_SIZE = 1024; // Read 1KB at a time
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

// Memory-efficient head file reading
async function headFile(filePath, numLines) {
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const lines = [];
    let buffer = '';
    let bytesRead = 0;
    const chunk = Buffer.alloc(1024); // 1KB buffer
    
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

// Enhanced find-and-replace with line-by-line matching
async function applyFileEdits(filePath, edits, dryRun = false) {
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

// Git operations (read-only) - enhanced security
const ALLOWED_GIT_COMMANDS = [
  'status', 'diff', 'log', 'branch', 'show', 'rev-parse', 'config'
];

async function runGitCommand(args, options = {}) {
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
      cwd: WORKSPACE_PATH,
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

// File indexing system (unchanged but optimized)
function shouldSkipDirectory(dirName) {
  return dirName.startsWith('.') || SKIP_DIRS.has(dirName);
}

function shouldSkipFile(fileName) {
  return fileName.startsWith('.') && 
         !fileName.endsWith('.gitignore') && 
         !fileName.endsWith('.env.example');
}

function getFilePriority(filePath, extension) {
  const name = path.basename(filePath).toLowerCase();
  
  // Priority 1: Critical project files
  if (['package.json', 'requirements.txt', 'dockerfile', 'makefile', 'readme.md'].includes(name)) {
    return 1;
  }
  
  // Priority 2: Code files
  const codeExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h', 
                         '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala'];
  if (codeExtensions.includes(extension)) {
    return 2;
  }
  
  // Priority 3: Config files
  const configExtensions = ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf'];
  if (configExtensions.includes(extension)) {
    return 3;
  }
  
  // Priority 4: Documentation
  const docExtensions = ['.md', '.txt', '.rst', '.adoc'];
  if (docExtensions.includes(extension)) {
    return 4;
  }
  
  // Priority 5: Other files
  return 5;
}

async function collectFilesFiltered(currentPath) {
  const files = [];
  
  async function walk(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          if (shouldSkipDirectory(entry.name)) {
            continue;
          }
          await walk(fullPath);
        } else if (entry.isFile()) {
          if (shouldSkipFile(entry.name)) {
            continue;
          }
          files.push(fullPath);
        }
      }
    } catch (error) {
      debugLog(`Cannot read directory ${dirPath}:`, error.message);
    }
  }
  
  await walk(currentPath);
  return files;
}

async function buildFileIndex() {
  if (!ENABLE_FILE_INDEXING) {
    debugLog('File indexing disabled');
    return;
  }
  
  console.error("Building file index...");
  const startTime = Date.now();
  
  try {
    const allFiles = await collectFilesFiltered(WORKSPACE_PATH);
    console.error(`Found ${allFiles.length} files to index`);
    
    fileIndex.clear();
    let processed = 0;
    
    for (const filePath of allFiles) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > MAX_FILE_SIZE_BYTES) {
          debugLog(`Skipping large file: ${filePath} (${stats.size} bytes)`);
          continue;
        }
        
        const relativePath = path.relative(WORKSPACE_PATH, filePath);
        const extension = path.extname(filePath).toLowerCase();
        
        fileIndex.set(relativePath, {
          path: relativePath,
          name: path.basename(filePath),
          size: stats.size,
          modified: stats.mtime.getTime(),
          priority: getFilePriority(filePath, extension),
          extension
        });
        
        processed++;
        if (processed % 1000 === 0) {
          console.error(`Indexed ${processed}/${allFiles.length} files...`);
        }
      } catch (error) {
        debugLog(`Error indexing ${filePath}:`, error.message);
      }
    }
    
    indexLastBuilt = new Date();
    const duration = Date.now() - startTime;
    console.error(`File index built: ${fileIndex.size} files indexed in ${duration}ms`);
  } catch (error) {
    console.error(`Error building file index: ${error.message}`);
  }
}

// Search functions using index
function searchFileIndex(query, limit = 10) {
  if (!ENABLE_FILE_INDEXING || fileIndex.size === 0) {
    return [];
  }
  
  const results = [];
  const queryLower = query.toLowerCase();
  
  for (const [, info] of fileIndex) {
    let score = 0;
    
    // Exact path match
    if (info.path.toLowerCase() === queryLower) {
      score = 1000;
    }
    // Exact filename match
    else if (info.name.toLowerCase() === queryLower) {
      score = 900;
    }
    // Path contains query
    else if (info.path.toLowerCase().includes(queryLower)) {
      score = 500 + (100 - info.path.length); // Prefer shorter paths
    }
    // Filename contains query
    else if (info.name.toLowerCase().includes(queryLower)) {
      score = 400 + (50 - info.name.length); // Prefer shorter names
    }
    
    if (score > 0) {
      results.push({ ...info, score });
    }
  }
  
  // Sort by score (desc), then priority (asc), then name
  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.name.localeCompare(b.name);
  });
  
  return results.slice(0, limit).map(r => path.resolve(WORKSPACE_PATH, r.path));
}

// Server setup
const server = new Server(
  {
    name: "git-workspace-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize file index on startup
if (ENABLE_FILE_INDEXING) {
  buildFileIndex().catch(err => {
    console.error('Failed to build initial file index:', err.message);
  });
}

// Tool definitions with enhanced intelligent prompting
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_file",
        description: 
          "📋 EDITING WORKFLOW STEP 1: ALWAYS use this tool first before editing any file\n" +
          "✅ See current content and structure\n" +
          "✅ Count exact line numbers for edits (lines start at 1)\n" +
          "✅ Understand context around the changes\n" +
          "✅ Verify the file structure matches expectations\n\n" +
          "REQUIRED WORKFLOW FOR EDITING:\n" +
          "1. Call 'read_file' (this tool) - see current content\n" +
          "2. Call 'preview_edit' - verify what will change\n" +
          "3. Call 'edit_file' - apply the changes\n" +
          "4. Call 'read_file' again - verify the result\n\n" +
          "EXAMPLE: \"Use read_file to see the current structure of auth.js\"\n" +
          "Then: \"Use preview_edit to show what changing lines 45-50 would do\"\n\n" +
          "⚠️ NEVER edit without reading the file first - line numbers must be exact!",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            tail: {
              type: "integer",
              description: "If provided, returns only the last N lines of the file (memory-efficient for large files)"
            },
            head: {
              type: "integer", 
              description: "If provided, returns only the first N lines of the file (memory-efficient for large files)"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "write_file",
        description:
          "⚠️ WARNING: This COMPLETELY REPLACES the file content\n" +
          "✅ Use for: Creating new files, complete rewrites\n" +
          "❌ Don't use for: Small edits (use 'edit_file' tool instead)\n" +
          "❌ Don't use for: Adding/changing a few lines (use 'edit_file' or 'append_to_file' tools)\n\n" +
          "💡 WORKFLOW FOR EXISTING FILES:\n" +
          "1. Call 'read_file' tool first to see current content (if you want to preserve any of it)\n" +
          "2. Call 'write_file' (this tool) to completely replace the file\n" +
          "3. Call 'read_file' tool again to verify the new content\n\n" +
          "🛡️ SAFETY: Has automatic atomic operations and corruption protection\n" +
          "⚠️ CAUTION: This erases ALL existing content - use 'edit_file' for partial changes\n\n" +
          "EXAMPLE:\n" +
          "- \"Use read_file to see what's currently in config.js\"\n" +
          "- \"Use write_file to replace it with the new configuration\"\n" +
          "- \"Use read_file to verify the new config is correct\"",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            content: {
              type: "string",
              description: "Content to write to the file"
            }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "edit_file",
        description:
          "✏️ Edit specific lines or sections of a file with ADVANCED CORRUPTION PROTECTION\n" +
          "⚠️ CRITICAL WORKFLOW - Follow these exact tool calls in order:\n" +
          "1. FIRST: Call 'read_file' tool to see current content\n" +
          "2. SECOND: Call 'preview_edit' tool to verify changes\n" +
          "3. THIRD: Call 'edit_file' tool with verified parameters\n" +
          "4. FOURTH: Call 'read_file' tool to confirm success\n\n" +
          "❌ NEVER guess line numbers - always use read_file first\n" +
          "⚠️ This is a real tool - call it by name: preview_edit\n\n" +
          "🛡️ SAFETY FEATURES:\n" +
          "• Automatic backup before editing\n" +
          "• Line ending preservation (CRLF/LF/CR)\n" +
          "• Write verification and corruption detection\n" +
          "• Auto-recovery if corruption detected\n\n" +
          "EXAMPLE WORKFLOW:\n" +
          "- \"Use read_file to check current content\"\n" +
          "- \"Use preview_edit to show what will change\"\n" +
          "- \"Use edit_file to apply the changes\"\n" +
          "- \"Use read_file to verify the result\"",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            line_start: {
              type: "integer",
              description: "Starting line number (1-based)"
            },
            line_end: {
              type: "integer",
              description: "Ending line number (1-based, optional - defaults to line_start)"
            },
            new_content: {
              type: "string",
              description: "New content to replace the specified lines"
            }
          },
          required: ["path", "line_start", "new_content"]
        }
      },
      {
        name: "preview_edit",
        description:
          "🛡️ ESSENTIAL SAFETY TOOL: Always call this tool before using edit_file\n" +
          "Preview what an edit would do before applying it (safer for complex edits)\n\n" +
          "REQUIRED WORKFLOW: read_file → preview_edit → edit_file → read_file\n\n" +
          "⚠️ This is a real tool - call it by name: preview_edit\n\n" +
          "EXAMPLE: \"Use preview_edit to show what changing lines 45-50 would do\"",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            line_start: {
              type: "integer",
              description: "Starting line number (1-based)"
            },
            line_end: {
              type: "integer",
              description: "Ending line number (1-based, optional - defaults to line_start)"
            },
            new_content: {
              type: "string",
              description: "New content to replace the specified lines"
            }
          },
          required: ["path", "line_start", "new_content"]
        }
      },
      {
        name: "append_to_file",
        description: "Append content to the end of a file with atomic operations",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            content: {
              type: "string",
              description: "Content to append to the file"
            },
            add_newline: {
              type: "boolean",
              description: "Add a newline before the appended content",
              default: true
            }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "replace_in_file",
        description:
          "Replace text patterns in a file with INTELLIGENT LINE-BY-LINE MATCHING.\n\n" +
          "💡 RECOMMENDED WORKFLOW:\n" +
          "1. Call 'read_file' tool first to see what text exists and will be replaced\n" +
          "2. Call 'replace_in_file' (this tool) to make the replacements\n" +
          "3. Call 'read_file' tool again to verify the replacements worked correctly\n\n" +
          "🧠 INTELLIGENT FEATURES:\n" +
          "• Exact text matching for simple cases\n" +
          "• Line-by-line matching with flexible whitespace handling\n" +
          "• Indentation preservation\n" +
          "• Atomic file operations\n\n" +
          "✅ Use for: Find and replace operations, updating configuration values\n" +
          "⚠️ TIP: Use 'read_file' first to confirm the search text exists\n" +
          "⚠️ CAUTION: Be specific with search text to avoid unintended replacements\n\n" +
          "EXAMPLE WORKFLOW:\n" +
          "- \"Use read_file to see current config values\"\n" +
          "- \"Use replace_in_file to update the API URL\"\n" +
          "- \"Use read_file to confirm the change worked\"",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            search_text: {
              type: "string",
              description: "Text to search for"
            },
            replace_text: {
              type: "string",
              description: "Text to replace with"
            },
            replace_all: {
              type: "boolean",
              description: "Replace all occurrences (default: first occurrence only)",
              default: false
            }
          },
          required: ["path", "search_text", "replace_text"]
        }
      },
      {
        name: "edit_file_advanced",
        description:
          "🚀 ADVANCED: Make multiple find-and-replace edits in a single operation\n" +
          "Features intelligent line-by-line matching and indentation preservation\n" +
          "Use when you need to make several related changes at once",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            edits: {
              type: "array",
              description: "Array of edit operations to apply sequentially",
              items: {
                type: "object",
                properties: {
                  oldText: {
                    type: "string",
                    description: "Text to search for - must match exactly"
                  },
                  newText: {
                    type: "string", 
                    description: "Text to replace with"
                  }
                },
                required: ["oldText", "newText"]
              }
            },
            dryRun: {
              type: "boolean",
              description: "Preview changes using git-style diff format",
              default: false
            }
          },
          required: ["path", "edits"]
        }
      },
      {
        name: "list_files",
        description: "List files and directories in the workspace",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path from workspace root (default: '.')",
              default: "."
            },
            include_hidden: {
              type: "boolean",
              description: "Include hidden files and directories",
              default: false
            },
            recursive: {
              type: "boolean",
              description: "List files recursively",
              default: false
            }
          }
        }
      },
      {
        name: "create_directory",
        description: "Create a new directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path for the new directory"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "delete_file",
        description: "Delete a file or directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file/directory to delete"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "git_status",
        description: "Get Git status of the workspace",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "git_diff",
        description: "Get Git diff for specified files or all changes",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Specific file to diff (optional)"
            },
            staged: {
              type: "boolean",
              description: "Show staged changes only",
              default: false
            }
          }
        }
      },
      {
        name: "git_log",
        description: "Get Git commit history",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "integer",
              description: "Number of commits to show",
              default: 10
            },
            oneline: {
              type: "boolean",
              description: "Show one line per commit",
              default: true
            }
          }
        }
      },
      {
        name: "git_list_branches",
        description: "List all Git branches (local and remote)",
        inputSchema: {
          type: "object",
          properties: {
            include_remote: {
              type: "boolean",
              description: "Include remote branches",
              default: true
            }
          }
        }
      },
      {
        name: "git_compare_branches",
        description: "Compare changes between two branches",
        inputSchema: {
          type: "object",
          properties: {
            base_branch: {
              type: "string",
              description: "Base branch to compare from (e.g., 'master', 'main')"
            },
            compare_branch: {
              type: "string",
              description: "Branch to compare to (default: current branch)",
              default: "HEAD"
            },
            file_path: {
              type: "string",
              description: "Specific file to compare (optional)"
            },
            show_stats: {
              type: "boolean",
              description: "Show file change statistics",
              default: true
            }
          },
          required: ["base_branch"]
        }
      },
      {
        name: "git_compare_commits",
        description: "Compare changes between two specific commits",
        inputSchema: {
          type: "object",
          properties: {
            commit_from: {
              type: "string",
              description: "Starting commit hash or reference"
            },
            commit_to: {
              type: "string",
              description: "Ending commit hash or reference (default: HEAD)",
              default: "HEAD"
            },
            file_path: {
              type: "string",
              description: "Specific file to compare (optional)"
            },
            show_stats: {
              type: "boolean",
              description: "Show file change statistics",
              default: true
            }
          },
          required: ["commit_from"]
        }
      },
      {
        name: "git_show_commit",
        description: "Show details of a specific commit",
        inputSchema: {
          type: "object",
          properties: {
            commit_hash: {
              type: "string",
              description: "Commit hash or reference (e.g., HEAD, HEAD~1)"
            },
            show_diff: {
              type: "boolean",
              description: "Include the diff in the output",
              default: true
            }
          },
          required: ["commit_hash"]
        }
      },
      {
        name: "git_current_branch",
        description: "Get the current active branch",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "git_branch_history",
        description: "Show commit history for a specific branch",
        inputSchema: {
          type: "object",
          properties: {
            branch_name: {
              type: "string",
              description: "Branch name (default: current branch)",
              default: "HEAD"
            },
            limit: {
              type: "integer",
              description: "Number of commits to show",
              default: 10
            },
            since: {
              type: "string",
              description: "Show commits since date (e.g., '2024-01-01', '1 week ago')"
            }
          }
        }
      },
      {
        name: "fast_find_file",
        description: "Quickly find a specific file by exact or partial path using performance index",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Exact or partial file path to search for"
            },
            limit: {
              type: "integer",
              description: "Maximum number of results to return",
              default: 10
            }
          },
          required: ["file_path"]
        }
      },
      {
        name: "find_files",
        description: "Search for files by name pattern (uses fast file index)",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "File name pattern (supports wildcards) or partial filename"
            },
            case_sensitive: {
              type: "boolean",
              description: "Case sensitive search",
              default: false
            },
            fuzzy_match: {
              type: "boolean",
              description: "Enable fuzzy matching for better results",
              default: true
            }
          },
          required: ["pattern"]
        }
      },
      {
        name: "search_content",
        description: "Search for text content within files",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Text to search for"
            },
            file_pattern: {
              type: "string",
              description: "File pattern to search in (e.g., '*.py')",
              default: "*"
            },
            case_sensitive: {
              type: "boolean",
              description: "Case sensitive search",
              default: false
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_project_structure",
        description: "Get an overview of the project structure",
        inputSchema: {
          type: "object",
          properties: {
            max_depth: {
              type: "integer",
              description: "Maximum directory depth to traverse",
              default: 3
            }
          }
        }
      },
      {
        name: "analyze_code_quality",
        description: "Analyze code quality and suggest improvements",
        inputSchema: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to file to analyze"
            },
            language: {
              type: "string",
              description: "Programming language (auto-detected if not specified)"
            }
          },
          required: ["file_path"]
        }
      },
      {
        name: "find_todos_fixmes",
        description: "Find all TODO, FIXME, HACK, and NOTE comments in the project",
        inputSchema: {
          type: "object",
          properties: {
            file_pattern: {
              type: "string",
              description: "File pattern to search (e.g., '*.py')",
              default: "*"
            },
            include_line_context: {
              type: "boolean",
              description: "Include surrounding code context",
              default: true
            }
          }
        }
      },
      {
        name: "refresh_file_index",
        description: "Refresh the file index to include newly created files",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "file_index_stats",
        description: "Show file index statistics and status",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

// Enhanced tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "read_file": {
        const validPath = await validatePath(args.path);
        
        // Enhanced: Support tail and head operations for large files
        if (args.tail && args.head) {
          throw new Error("Cannot specify both tail and head parameters simultaneously");
        }
        
        if (args.tail) {
          // Use memory-efficient tail implementation for large files
          const tailContent = await tailFile(validPath, args.tail);
          return {
            content: [{ type: "text", text: tailContent }],
          };
        }
        
        if (args.head) {
          // Use memory-efficient head implementation for large files
          const headContent = await headFile(validPath, args.head);
          return {
            content: [{ type: "text", text: headContent }],
          };
        }
        
        const content = await fs.readFile(validPath, "utf-8");
        return {
          content: [{ type: "text", text: content }]
        };
      }
      
      case "write_file": {
        const validPath = await validatePath(args.path);
        
        // Enhanced: Use atomic operations with proper error handling
        try {
          // Try exclusive creation first
          await fs.writeFile(validPath, args.content, { encoding: "utf-8", flag: 'wx' });
        } catch (error) {
          if (error.code === 'EEXIST') {
            // File exists, use atomic write
            await writeFileAtomically(validPath, args.content);
          } else {
            throw error;
          }
        }
        
        return {
          content: [{ type: "text", text: `Successfully wrote to ${args.path}` }]
        };
      }
      
      case "edit_file": {
        const validPath = await validatePath(args.path);
        const result = await editFileSafely(validPath, args.line_start, args.line_end, args.new_content);
        return {
          content: [{ type: "text", text: result.diff + result.summary }]
        };
      }
      
      case "preview_edit": {
        const validPath = await validatePath(args.path);
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
      }
      
      case "append_to_file": {
        const validPath = await validatePath(args.path);
        let existingContent = '';
        
        try {
          existingContent = await fs.readFile(validPath, 'utf-8');
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        
        const newContent = existingContent + 
                          (args.add_newline !== false && existingContent ? '\n' : '') + 
                          args.content;
        
        // Use atomic write
        await writeFileAtomically(validPath, newContent);
        return {
          content: [{ type: "text", text: `Successfully appended to ${args.path}` }]
        };
      }
      
      case "replace_in_file": {
        const validPath = await validatePath(args.path);
        const edits = [{
          oldText: args.search_text,
          newText: args.replace_text
        }];
        
        // Use enhanced line-by-line matching
        const diff = await applyFileEdits(validPath, edits, false);
        
        return {
          content: [{ type: "text", text: diff }]
        };
      }
      
      case "edit_file_advanced": {
        const validPath = await validatePath(args.path);
        const diff = await applyFileEdits(validPath, args.edits, args.dryRun || false);
        
        const action = args.dryRun ? "PREVIEW" : "Applied";
        return {
          content: [{ type: "text", text: `${action} ${args.edits.length} edit(s):\n\n${diff}` }]
        };
      }
      
      case "list_files": {
        const targetPath = args.path || ".";
        const validPath = await validatePath(targetPath);
        
        if (args.recursive) {
          const files = await collectFilesFiltered(validPath);
          const relativePaths = files.map(f => path.relative(WORKSPACE_PATH, f));
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
      }
      
      case "create_directory": {
        const validPath = await validatePath(args.path);
        await fs.mkdir(validPath, { recursive: true });
        return {
          content: [{ type: "text", text: `Successfully created directory ${args.path}` }]
        };
      }
      
      case "delete_file": {
        const validPath = await validatePath(args.path);
        const stats = await fs.stat(validPath);
        
        if (stats.isDirectory()) {
          await fs.rm(validPath, { recursive: true, force: true });
          return {
            content: [{ type: "text", text: `Successfully deleted directory ${args.path}` }]
          };
        } else {
          await fs.unlink(validPath);
          return {
            content: [{ type: "text", text: `Successfully deleted file ${args.path}` }]
          };
        }
      }
      
      // Git operations (enhanced security)
      case "git_status": {
        try {
          const output = await runGitCommand(['status', '--porcelain']);
          return {
            content: [{ type: "text", text: output || "Working tree clean" }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_diff": {
        try {
          const gitArgs = ['diff'];
          if (args.staged) gitArgs.push('--cached');
          if (args.file_path) gitArgs.push(args.file_path);
          
          const output = await runGitCommand(gitArgs);
          return {
            content: [{ type: "text", text: output || "No changes" }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_log": {
        try {
          const gitArgs = ['log'];
          if (args.oneline) gitArgs.push('--oneline');
          if (args.limit) gitArgs.push(`-${args.limit}`);
          
          const output = await runGitCommand(gitArgs);
          return {
            content: [{ type: "text", text: output }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_list_branches": {
        try {
          const localOutput = await runGitCommand(['branch']);
          let result = "Local branches:\n" + localOutput;
          
          if (args.include_remote) {
            try {
              const remoteOutput = await runGitCommand(['branch', '-r']);
              if (remoteOutput) {
                result += "\n\nRemote branches:\n" + remoteOutput;
              }
            } catch (remoteError) {
              result += "\n\nRemote branches: (no remotes configured)";
            }
          }
          
          return {
            content: [{ type: "text", text: result }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_compare_branches": {
        try {
          const gitArgs = ['diff', `${args.base_branch}...${args.compare_branch || 'HEAD'}`];
          if (args.show_stats) gitArgs.push('--stat');
          if (args.file_path) gitArgs.push(args.file_path);
          
          const output = await runGitCommand(gitArgs);
          return {
            content: [{ type: "text", text: output || `No differences between ${args.base_branch} and ${args.compare_branch || 'HEAD'}` }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_compare_commits": {
        try {
          const gitArgs = ['diff', `${args.commit_from}...${args.commit_to || 'HEAD'}`];
          if (args.show_stats) gitArgs.push('--stat');
          if (args.file_path) gitArgs.push(args.file_path);
          
          const output = await runGitCommand(gitArgs);
          return {
            content: [{ type: "text", text: output || `No differences between ${args.commit_from} and ${args.commit_to || 'HEAD'}` }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_show_commit": {
        try {
          const gitArgs = ['show'];
          if (!args.show_diff) gitArgs.push('--no-patch');
          gitArgs.push(args.commit_hash);
          
          const output = await runGitCommand(gitArgs);
          return {
            content: [{ type: "text", text: output }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_current_branch": {
        try {
          const branch = await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
          const lastCommit = await runGitCommand(['log', '-1', '--oneline']);
          return {
            content: [{ type: "text", text: `Current branch: ${branch}\nLast commit: ${lastCommit}` }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      case "git_branch_history": {
        try {
          const gitArgs = ['log', args.branch_name || 'HEAD'];
          if (args.limit) gitArgs.push(`-${args.limit}`);
          if (args.since) gitArgs.push(`--since="${args.since}"`);
          gitArgs.push('--oneline');
          
          const output = await runGitCommand(gitArgs);
          return {
            content: [{ type: "text", text: output }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
          };
        }
      }
      
      // Search and intelligence tools
      case "fast_find_file": {
        const results = searchFileIndex(args.file_path, args.limit || 10);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No files found matching the search criteria" }]
          };
        }
        
        const relativePaths = results.map(f => path.relative(WORKSPACE_PATH, f));
        return {
          content: [{ type: "text", text: relativePaths.join('\n') }]
        };
      }
      
      case "find_files": {
        if (!args.fuzzy_match) {
          // Use simple pattern matching
          const allFiles = await collectFilesFiltered(WORKSPACE_PATH);
          const pattern = args.case_sensitive ? args.pattern : args.pattern.toLowerCase();
          const results = allFiles.filter(filePath => {
            const fileName = path.basename(filePath);
            const checkName = args.case_sensitive ? fileName : fileName.toLowerCase();
            return minimatch(checkName, `*${pattern}*`);
          });
          
          const relativePaths = results.map(f => path.relative(WORKSPACE_PATH, f));
          return {
            content: [{ type: "text", text: relativePaths.join('\n') || "No files found" }]
          };
        } else {
          // Use file index for fuzzy matching
          const results = searchFileIndex(args.pattern);
          const relativePaths = results.map(f => path.relative(WORKSPACE_PATH, f));
          return {
            content: [{ type: "text", text: relativePaths.join('\n') || "No files found" }]
          };
        }
      }
      
      case "search_content": {
        const searchResults = [];
        let filesSearched = 0;
        const maxFiles = 20;
        const maxMatchesPerFile = 5;
        
        for (const [relativePath, info] of fileIndex) {
          if (filesSearched >= maxFiles) break;
          
          // Skip if doesn't match file pattern
          if (args.file_pattern && args.file_pattern !== '*') {
            if (!minimatch(info.name, args.file_pattern)) continue;
          }
          
          try {
            const fullPath = path.resolve(WORKSPACE_PATH, relativePath);
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            const query = args.case_sensitive ? args.query : args.query.toLowerCase();
            let matches = 0;
            
            for (let i = 0; i < lines.length && matches < maxMatchesPerFile; i++) {
              const line = args.case_sensitive ? lines[i] : lines[i].toLowerCase();
              if (line.includes(query)) {
                searchResults.push(`${relativePath}:${i + 1}: ${lines[i].trim()}`);
                matches++;
              }
            }
            
            filesSearched++;
          } catch (error) {
            debugLog(`Error searching ${relativePath}:`, error.message);
          }
        }
        
        return {
          content: [{ type: "text", text: searchResults.join('\n') || "No matches found" }]
        };
      }
      
      case "get_project_structure": {
        async function buildTree(currentPath, currentDepth = 0) {
          if (currentDepth >= (args.max_depth || 3)) return [];
          
          try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            const result = [];
            
            for (const entry of entries) {
              if (shouldSkipDirectory(entry.name) || shouldSkipFile(entry.name)) continue;
              
              const entryPath = path.join(currentPath, entry.name);
              const relativePath = path.relative(WORKSPACE_PATH, entryPath);
              const prefix = '  '.repeat(currentDepth) + (entry.isDirectory() ? '📁 ' : '📄 ');
              
              result.push(prefix + entry.name);
              
              if (entry.isDirectory()) {
                const children = await buildTree(entryPath, currentDepth + 1);
                result.push(...children);
              }
            }
            
            return result;
          } catch (error) {
            return [];
          }
        }
        
        const tree = await buildTree(WORKSPACE_PATH);
        return {
          content: [{ type: "text", text: tree.join('\n') || "Empty project" }]
        };
      }
      
      case "analyze_code_quality": {
        const validPath = await validatePath(args.file_path);
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
      }
      
      case "find_todos_fixmes": {
        const keywords = ['TODO', 'FIXME', 'HACK', 'NOTE', 'BUG', 'XXX'];
        const results = [];
        let filesSearched = 0;
        const maxFiles = 200;
        
        for (const [relativePath, info] of fileIndex) {
          if (filesSearched >= maxFiles) break;
          
          // Skip if doesn't match file pattern
          if (args.file_pattern && args.file_pattern !== '*') {
            if (!minimatch(info.name, args.file_pattern)) continue;
          }
          
          try {
            const fullPath = path.resolve(WORKSPACE_PATH, relativePath);
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const found = keywords.find(keyword => 
                line.toUpperCase().includes(keyword + ':') || 
                line.toUpperCase().includes(keyword + ' ')
              );
              
              if (found) {
                results.push(`${relativePath}:${i + 1}: ${line.trim()}`);
                
                if (args.include_line_context) {
                  // Add context lines
                  if (i > 0) results.push(`${relativePath}:${i}: ${lines[i - 1].trim()}`);
                  if (i < lines.length - 1) results.push(`${relativePath}:${i + 2}: ${lines[i + 1].trim()}`);
                  results.push(''); // Empty line for separation
                }
              }
            }
            
            filesSearched++;
          } catch (error) {
            debugLog(`Error searching ${relativePath}:`, error.message);
          }
        }
        
        return {
          content: [{ type: "text", text: results.join('\n') || "No TODO/FIXME comments found" }]
        };
      }
      
      case "refresh_file_index": {
        const oldSize = fileIndex.size;
        await buildFileIndex();
        const newSize = fileIndex.size;
        
        return {
          content: [{ type: "text", text: `File index refreshed: ${oldSize} → ${newSize} files` }]
        };
      }
      
      case "file_index_stats": {
        if (!ENABLE_FILE_INDEXING) {
          return {
            content: [{ type: "text", text: "File indexing is disabled" }]
          };
        }
        
        const stats = {
          totalFiles: fileIndex.size,
          lastBuilt: indexLastBuilt ? indexLastBuilt.toISOString() : 'Never',
          fileSizeDistribution: {}
        };
        
        // Calculate file type distribution
        for (const [, info] of fileIndex) {
          const ext = info.extension || '(no extension)';
          stats.fileSizeDistribution[ext] = (stats.fileSizeDistribution[ext] || 0) + 1;
        }
        
        const result = [
          `File Index Statistics:`,
          `• Total files indexed: ${stats.totalFiles}`,
          `• Last built: ${stats.lastBuilt}`,
          `• Index enabled: ${ENABLE_FILE_INDEXING}`,
          `• Max file size: ${MAX_FILE_SIZE_MB}MB`,
          '',
          'File type distribution:',
          ...Object.entries(stats.fileSizeDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([ext, count]) => `• ${ext}: ${count} files`)
        ];
        
        return {
          content: [{ type: "text", text: result.join('\n') }]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true
    };
  }
});

// Start server
async function runServer() {
  // Verify workspace exists and is accessible
  try {
    console.error(`Git Workspace MCP Server starting...`);
    console.error(`Workspace path: ${WORKSPACE_PATH}`);
    
    const stats = await fs.stat(WORKSPACE_PATH);
    if (!stats.isDirectory()) {
      console.error(`Error: Workspace path is not a directory: ${WORKSPACE_PATH}`);
      process.exit(1);
    }
    console.error(`Workspace verified: ${WORKSPACE_PATH}`);
  } catch (error) {
    console.error(`Error accessing workspace directory ${WORKSPACE_PATH}:`, error);
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Git Workspace MCP Server running on stdio");
  console.error(`📁 Workspace: ${WORKSPACE_PATH}`);
  console.error(`⚡ File indexing: ${ENABLE_FILE_INDEXING ? 'enabled' : 'disabled'}`);
  console.error(`🛡️ Enhanced security: atomic operations, corruption protection, read-only Git`);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
