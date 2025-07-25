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

// Load configuration and constants
import { config } from './config.js';
import { 
  SKIP_DIRS, 
  ALLOWED_GIT_COMMANDS, 
  FILE_EXTENSIONS,
  PRIORITY_FILES,
  FILE_PRIORITIES,
  TODO_KEYWORDS,
  PERFORMANCE_LIMITS
} from './constants.js';

// Import utility functions
import {
  validatePath,
  detectLineEnding,
  normalizeLineEndings,
  createUnifiedDiff,
  formatDiff,
  writeFileAtomically,
  tailFile,
  headFile,
  applyFileEdits,
  runGitCommand,
  debugLog
} from './utils/index.js';

// Import file index functions
import { 
  buildFileIndex, 
  getFileIndex, 
  getIndexLastBuilt, 
  getFileIndexStats 
} from './file-index/index.js';
import { searchFileIndex } from './file-index/search.js';
import { collectFilesFiltered, shouldSkipDirectory, shouldSkipFile } from './file-index/collect.js';

// Import tool definitions
import { allToolDefinitions } from './tools/index.js';

// Extract config values for easier access
const { 
  WORKSPACE_PATH, 
  ENABLE_FILE_INDEXING, 
  MAX_FILE_SIZE_MB, 
  DEBUG_MODE, 
  MAX_FILE_SIZE_BYTES 
} = config;

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
    tools: allToolDefinitions
  };
});

// Enhanced tool implementations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "read_file": {
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
        
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
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
        
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
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
        const result = await editFileSafely(validPath, args.line_start, args.line_end, args.new_content);
        return {
          content: [{ type: "text", text: result.diff + result.summary }]
        };
      }
      
      case "preview_edit": {
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
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
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
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
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
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
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
        const diff = await applyFileEdits(validPath, args.edits, args.dryRun || false);
        
        const action = args.dryRun ? "PREVIEW" : "Applied";
        return {
          content: [{ type: "text", text: `${action} ${args.edits.length} edit(s):\n\n${diff}` }]
        };
      }
      
      case "list_files": {
        const targetPath = args.path || ".";
        const validPath = await validatePath(targetPath, WORKSPACE_PATH);
        
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
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
        await fs.mkdir(validPath, { recursive: true });
        return {
          content: [{ type: "text", text: `Successfully created directory ${args.path}` }]
        };
      }
      
      case "delete_file": {
        const validPath = await validatePath(args.path, WORKSPACE_PATH);
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
          const output = await runGitCommand(['status', '--porcelain'], WORKSPACE_PATH);
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
          
          const output = await runGitCommand(gitArgs, WORKSPACE_PATH);
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
          
          const output = await runGitCommand(gitArgs, WORKSPACE_PATH);
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
          const localOutput = await runGitCommand(['branch'], WORKSPACE_PATH);
          let result = "Local branches:\n" + localOutput;
          
          if (args.include_remote) {
            try {
              const remoteOutput = await runGitCommand(['branch', '-r'], WORKSPACE_PATH);
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
          
          const output = await runGitCommand(gitArgs, WORKSPACE_PATH);
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
          
          const output = await runGitCommand(gitArgs, WORKSPACE_PATH);
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
          
          const output = await runGitCommand(gitArgs, WORKSPACE_PATH);
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
          const branch = await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], WORKSPACE_PATH);
          const lastCommit = await runGitCommand(['log', '-1', '--oneline'], WORKSPACE_PATH);
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
          
          const output = await runGitCommand(gitArgs, WORKSPACE_PATH);
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
        const results = searchFileIndex(args.file_path, args.limit || PERFORMANCE_LIMITS.MAX_FAST_FIND_RESULTS);
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
        const fileIndex = getFileIndex();
        const searchResults = [];
        let filesSearched = 0;
        const maxFiles = PERFORMANCE_LIMITS.MAX_SEARCH_FILES;
        const maxMatchesPerFile = PERFORMANCE_LIMITS.MAX_MATCHES_PER_FILE;
        
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
        const validPath = await validatePath(args.file_path, WORKSPACE_PATH);
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
        const fileIndex = getFileIndex();
        const keywords = TODO_KEYWORDS;
        const results = [];
        let filesSearched = 0;
        const maxFiles = PERFORMANCE_LIMITS.MAX_SEARCH_FILES;
        
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
        const fileIndex = getFileIndex();
        const oldSize = fileIndex.size;
        await buildFileIndex();
        const newSize = getFileIndex().size;
        
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
        
        const stats = getFileIndexStats();
        
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
