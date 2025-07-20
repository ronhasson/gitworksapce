#!/usr/bin/env node

/**
 * Git Workspace MCP Extension - Validation Script
 * 
 * This script validates the extension setup and tests core functionality
 */

import * as fs from "fs/promises";
import * as path from "path";
import { spawn } from "child_process";

class Validator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      console.log(`✅ PASS: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name} - ${error.message}`);
      this.errors.push(`${name}: ${error.message}`);
      this.failed++;
    }
  }

  async warn(name, testFn) {
    try {
      await testFn();
    } catch (error) {
      console.log(`⚠️ WARNING: ${name} - ${error.message}`);
      this.warnings.push(`${name}: ${error.message}`);
    }
  }

  async validateManifest() {
    await this.test("Manifest exists and is valid JSON", async () => {
      const content = await fs.readFile("manifest.json", "utf-8");
      const manifest = JSON.parse(content);
      
      // Check required fields
      const required = ["dxt_version", "name", "version", "description", "server", "user_config"];
      for (const field of required) {
        if (!manifest[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Check server config
      if (!manifest.server.entry_point) {
        throw new Error("Server entry_point not specified");
      }
      
      // Check tools array
      if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
        throw new Error("Tools array is empty or invalid");
      }
      
      console.log(`  📋 Extension: ${manifest.name} v${manifest.version}`);
      console.log(`  🔧 Tools: ${manifest.tools.length}`);
    });
  }

  async validatePackageJson() {
    await this.test("package.json exists and has required dependencies", async () => {
      const content = await fs.readFile("package.json", "utf-8");
      const pkg = JSON.parse(content);
      
      if (!pkg.dependencies || !pkg.dependencies["@modelcontextprotocol/sdk"]) {
        throw new Error("Missing @modelcontextprotocol/sdk dependency");
      }
      
      if (!pkg.scripts || !pkg.scripts.dev) {
        throw new Error("Missing dev script");
      }
    });
  }

  async validateServerFile() {
    await this.test("Server entry point exists", async () => {
      const serverPath = "server/index.js";
      await fs.access(serverPath);
      
      const content = await fs.readFile(serverPath, "utf-8");
      
      // Check for required imports
      if (!content.includes("@modelcontextprotocol/sdk")) {
        throw new Error("Missing MCP SDK import");
      }
      
      // Check for server class
      if (!content.includes("class GitWorkspaceServer")) {
        throw new Error("Missing GitWorkspaceServer class");
      }
      
      // Check for required methods
      const requiredMethods = ["setupTools", "handleReadFile", "handleEditFile", "handlePreviewEdit"];
      for (const method of requiredMethods) {
        if (!content.includes(method)) {
          throw new Error(`Missing required method: ${method}`);
        }
      }
      
      console.log(`  📄 Server file size: ${content.length} characters`);
    });
  }

  async validateSyntax() {
    await this.test("Server JavaScript syntax is valid", async () => {
      return new Promise((resolve, reject) => {
        const nodeProcess = spawn("node", ["-c", "server/index.js"], {
          stdio: ["pipe", "pipe", "pipe"]
        });
        
        let stderr = "";
        nodeProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        
        nodeProcess.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Syntax error: ${stderr}`));
          } else {
            resolve();
          }
        });
        
        nodeProcess.on("error", (error) => {
          reject(new Error(`Failed to validate syntax: ${error.message}`));
        });
      });
    });
  }

  async validateFiles() {
    const requiredFiles = [
      "README.md",
      "LICENSE", 
      "icon.svg",
      ".gitignore",
      "CHANGELOG.md"
    ];
    
    for (const file of requiredFiles) {
      await this.test(`Required file exists: ${file}`, async () => {
        await fs.access(file);
      });
    }
  }

  async validateInstallScripts() {
    await this.test("Installation scripts exist", async () => {
      await fs.access("install.sh");
      await fs.access("install.bat");
    });
    
    await this.warn("install.sh is executable", async () => {
      const stats = await fs.stat("install.sh");
      if (!(stats.mode & parseInt('111', 8))) {
        throw new Error("install.sh is not executable (run: chmod +x install.sh)");
      }
    });
  }

  async validateNodeModules() {
    await this.warn("node_modules exists (dependencies installed)", async () => {
      await fs.access("node_modules");
      await fs.access("node_modules/@modelcontextprotocol");
    });
  }

  async validateDependencies() {
    await this.test("Can import MCP SDK", async () => {
      return new Promise((resolve, reject) => {
        const testScript = `
          try {
            require('@modelcontextprotocol/sdk/server/index.js');
            console.log('SUCCESS');
          } catch (error) {
            console.error('ERROR:', error.message);
            process.exit(1);
          }
        `;
        
        const nodeProcess = spawn("node", ["-e", testScript], {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"]
        });
        
        let stdout = "";
        let stderr = "";
        
        nodeProcess.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        
        nodeProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        
        nodeProcess.on("close", (code) => {
          if (code !== 0 || !stdout.includes("SUCCESS")) {
            reject(new Error(`Cannot import MCP SDK: ${stderr}`));
          } else {
            resolve();
          }
        });
        
        nodeProcess.on("error", (error) => {
          reject(new Error(`Failed to test import: ${error.message}`));
        });
      });
    });
  }

  async testServerStartup() {
    await this.test("Server can start without errors", async () => {
      return new Promise((resolve, reject) => {
        const serverProcess = spawn("node", ["server/index.js"], {
          stdio: ["pipe", "pipe", "pipe"]
        });
        
        let stderr = "";
        let startupDetected = false;
        
        serverProcess.stdout.on("data", (data) => {
          const output = data.toString();
          if (output.includes("Git Workspace MCP Server running") || 
              output.includes("Building file index")) {
            startupDetected = true;
          }
        });
        
        serverProcess.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        
        // Give server 3 seconds to start
        setTimeout(() => {
          serverProcess.kill('SIGTERM');
          
          if (stderr && !startupDetected) {
            reject(new Error(`Server startup failed: ${stderr}`));
          } else {
            resolve();
          }
        }, 3000);
        
        serverProcess.on("error", (error) => {
          reject(new Error(`Failed to start server: ${error.message}`));
        });
      });
    });
  }

  async run() {
    console.log("🚀 Git Workspace MCP Extension - Validation");
    console.log("==========================================\n");
    
    try {
      await this.validateManifest();
      await this.validatePackageJson(); 
      await this.validateServerFile();
      await this.validateSyntax();
      await this.validateFiles();
      await this.validateInstallScripts();
      await this.validateNodeModules();
      await this.validateDependencies();
      await this.testServerStartup();
      
    } catch (error) {
      console.error(`\n💥 Validation failed with error: ${error.message}`);
      process.exit(1);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log(`📊 VALIDATION SUMMARY`);
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`⚠️ Warnings: ${this.warnings.length}`);
    
    if (this.warnings.length > 0) {
      console.log("\n⚠️ WARNINGS:");
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (this.failed > 0) {
      console.log("\n❌ ERRORS:");
      this.errors.forEach(error => console.log(`  - ${error}`));
      console.log("\n🔧 Please fix the errors above before packaging the extension.");
      process.exit(1);
    }
    
    console.log("\n🎉 All validations passed!");
    console.log("✨ Extension is ready for packaging and distribution.");
    
    console.log("\n📦 Next steps:");
    console.log("  npm run package     - Create DXT package (Unix/macOS)");
    console.log("  npm run package-win - Create DXT package (Windows)");
    console.log("  npm run inspect     - Test with MCP Inspector");
  }
}

// Run validation
const validator = new Validator();
validator.run().catch(console.error);
