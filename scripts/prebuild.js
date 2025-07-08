#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const PythonSetup = require('./python-setup.js');

async function preBuild() {
  console.log('=== Pre-build Python Setup ===');

  try {
    const setup = new PythonSetup();

    // Check if Python runtime exists
    if (!setup.isSetup()) {
      console.log('Python runtime not found, setting up...');
      await setup.setup();
    } else {
      console.log('Python runtime already exists, skipping download');

      // Still try to install/update requirements
      if (fs.existsSync(path.join(process.cwd(), 'requirements.txt'))) {
        console.log('Installing/updating Python requirements...');
        await setup.installRequirements();
      }
    }

    console.log('✅ Python runtime is ready for build');

    // Verify setup
    const pythonPath = setup.getPythonPath();
    console.log(`Python executable: ${pythonPath}`);

    if (process.platform === 'win32' && fs.existsSync(pythonPath)) {
      console.log('✅ Windows Python runtime verified');
    } else if (process.platform !== 'win32') {
      console.log('✅ System Python will be used for macOS/Linux');
    }

  } catch (error) {
    console.error('❌ Pre-build setup failed:', error.message);

    // Don't fail the build on Python setup errors for cross-platform compatibility
    console.log('⚠️  Continuing build without embedded Python (will require system Python)');
  }
}

if (require.main === module) {
  preBuild();
}

module.exports = preBuild;
