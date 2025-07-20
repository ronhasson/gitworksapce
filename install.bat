@echo off
REM Git Workspace MCP Extension - Windows Installation Script

echo 🚀 Git Workspace MCP Extension - Installation ^& Setup
echo ==================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Validate manifest
echo.
echo 🔍 Validating manifest.json...
node -e "try { const manifest = JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')); console.log('✅ Manifest is valid JSON'); console.log('📋 Extension name:', manifest.name); console.log('📋 Version:', manifest.version); console.log('📋 Tools count:', manifest.tools.length); } catch (error) { console.error('❌ Manifest validation failed:', error.message); process.exit(1); }"

if errorlevel 1 (
    echo ❌ Manifest validation failed
    pause
    exit /b 1
)

REM Create DXT package using PowerShell (since zip might not be available)
echo.
echo 📦 Creating DXT package...

powershell -Command "& {Compress-Archive -Path 'manifest.json','server','node_modules','package.json','README.md','LICENSE','icon.svg' -DestinationPath 'git-workspace-v1.0.0.dxt' -Force}"

if errorlevel 1 (
    echo ❌ Failed to create DXT package
    echo 🔧 Make sure PowerShell is available and try again
    pause
    exit /b 1
)

echo ✅ DXT package created: git-workspace-v1.0.0.dxt

REM Success message
echo.
echo 🎉 Installation completed successfully!
echo.
echo 📋 **Next Steps:**
echo 1. 📁 Install in Claude Desktop:
echo    - Double-click 'git-workspace-v1.0.0.dxt'
echo    - Or drag the file to Claude Desktop
echo.
echo 2. ⚙️ Configuration:
echo    - Set your project directory when prompted
echo    - This should point to a Git repository root
echo.
echo 3. 🧪 Testing options:
echo    npm run inspect  - Debug with MCP Inspector
echo    npm run dev      - Run development server
echo.
echo 4. 📚 Usage:
echo    - Always start with 'read_file' before editing
echo    - Use 'preview_edit' to verify changes  
echo    - Use 'edit_file' to apply modifications
echo    - Use 'git_status' and 'git_diff' for Git operations
echo.
echo 🔧 **Troubleshooting:**
echo - If tools don't appear: Check manifest.json validation
echo - If files not found: Verify project directory path
echo - If Git commands fail: Ensure you're in a Git repository
echo.
echo 📖 **Documentation:** See README.md for detailed usage instructions
echo.

REM Offer to run inspector
set /p response="🔍 Would you like to test with MCP Inspector now? (y/n): "
if /i "%response%"=="y" (
    echo 🚀 Starting MCP Inspector...
    echo    This will open a browser window for testing the MCP server
    echo    Press Ctrl+C to stop when done testing
    echo.
    npx @modelcontextprotocol/inspector node server/index.js
)

echo.
echo ✨ Setup complete! Enjoy using Git Workspace MCP Extension!
pause
