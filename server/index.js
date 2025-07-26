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

console.error('✅ Dependencies loaded successfully');

// Load configuration and constants
import { config } from './config.js';

// Import tool definitions and implementations
import { allToolDefinitions } from './tools/index.js';
import { toolImplementations } from './tools/implementations.js';

// Import file index functions
import { buildFileIndex } from './file-index/index.js';

// Extract config values for easier access
const { 
  WORKSPACE_PATH, 
  ENABLE_FILE_INDEXING
} = config;

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

// Enhanced tool implementations using the extracted modules
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    // Look up the tool implementation
    const toolImplementation = toolImplementations[name];
    
    if (!toolImplementation) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    // Call the tool implementation
    return await toolImplementation(args);
    
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
