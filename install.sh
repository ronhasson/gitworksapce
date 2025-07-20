#!/bin/bash

# Git Workspace MCP Extension - Installation Script
# This script helps you install and test the Git Workspace MCP Extension

echo "🚀 Git Workspace MCP Extension - Installation & Setup"
echo "=================================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Validate manifest
echo
echo "🔍 Validating manifest.json..."
node -e "
try {
  const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'));
  console.log('✅ Manifest is valid JSON');
  console.log('📋 Extension name:', manifest.name);
  console.log('📋 Version:', manifest.version);
  console.log('📋 Tools count:', manifest.tools.length);
} catch (error) {
  console.error('❌ Manifest validation failed:', error.message);
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
    echo "❌ Manifest validation failed"
    exit 1
fi

# Test server startup
echo
echo "🧪 Testing server startup..."
timeout 5 node server/index.js &> /dev/null

if [ $? -eq 124 ]; then
    echo "✅ Server starts successfully (timed out after 5 seconds as expected)"
elif [ $? -eq 0 ]; then
    echo "⚠️ Server exited immediately - this might be normal for stdio transport"
else
    echo "❌ Server failed to start properly"
    echo "🔧 Try running: node server/index.js"
    exit 1
fi

# Create DXT package
echo
echo "📦 Creating DXT package..."

# Check if zip is available
if ! command -v zip &> /dev/null; then
    echo "❌ zip command not found. Please install zip utility."
    echo "   On Ubuntu/Debian: sudo apt install zip"
    echo "   On macOS: zip should be pre-installed"
    echo "   On Windows: Use Git Bash or install zip utility"
    exit 1
fi

# Create the DXT package
zip -r "git-workspace-v1.0.0.dxt" \
    manifest.json \
    server/ \
    node_modules/ \
    package.json \
    README.md \
    LICENSE \
    icon.svg \
    -x "server/*.ts" "**/.DS_Store" "**/Thumbs.db"

if [ $? -eq 0 ]; then
    echo "✅ DXT package created: git-workspace-v1.0.0.dxt"
    echo
    echo "📊 Package contents:"
    unzip -l git-workspace-v1.0.0.dxt | head -20
    echo "   ... (showing first 20 entries)"
    echo
else
    echo "❌ Failed to create DXT package"
    exit 1
fi

# Success message
echo
echo "🎉 Installation completed successfully!"
echo
echo "📋 **Next Steps:**"
echo "1. 📁 Install in Claude Desktop:"
echo "   - Double-click 'git-workspace-v1.0.0.dxt'"
echo "   - Or drag the file to Claude Desktop"
echo
echo "2. ⚙️ Configuration:"
echo "   - Set your project directory when prompted"
echo "   - This should point to a Git repository root"
echo
echo "3. 🧪 Testing options:"
echo "   npm run inspect  - Debug with MCP Inspector"
echo "   npm run dev      - Run development server"
echo
echo "4. 📚 Usage:"
echo "   - Always start with 'read_file' before editing"
echo "   - Use 'preview_edit' to verify changes"
echo "   - Use 'edit_file' to apply modifications"
echo "   - Use 'git_status' and 'git_diff' for Git operations"
echo
echo "🔧 **Troubleshooting:**"
echo "- If tools don't appear: Check manifest.json validation"
echo "- If files not found: Verify project directory path"
echo "- If Git commands fail: Ensure you're in a Git repository"
echo
echo "📖 **Documentation:** See README.md for detailed usage instructions"
echo

# Offer to run inspector
echo "🔍 Would you like to test with MCP Inspector now? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Starting MCP Inspector..."
    echo "   This will open a browser window for testing the MCP server"
    echo "   Press Ctrl+C to stop when done testing"
    echo
    npx @modelcontextprotocol/inspector node server/index.js
fi

echo
echo "✨ Setup complete! Enjoy using Git Workspace MCP Extension!"
