#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const { createWriteStream, createReadStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

class PythonSetup {
  constructor() {
    this.platform = process.platform;
    this.arch = process.arch;
    this.appDir = process.cwd();
    this.pythonDir = path.join(this.appDir, 'python-runtime');
    this.requirementsPath = path.join(this.appDir, 'requirements.txt');

    // Python download URLs for embedded distributions
    this.pythonUrls = {
      'win32-x64': 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip',
      'win32-ia32': 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-win32.zip',
      'darwin-x64': 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg',
      'darwin-arm64': 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg',
      'linux-x64': 'https://www.python.org/ftp/python/3.11.9/Python-3.11.9.tgz'
    };

    this.pipUrl = 'https://bootstrap.pypa.io/get-pip.py';
  }

  log(message) {
    console.log(`[PythonSetup] ${message}`);
  }

  error(message) {
    console.error(`[PythonSetup ERROR] ${message}`);
  }

  async downloadFile(url, outputPath) {
    this.log(`Downloading ${url} to ${outputPath}`);

    return new Promise((resolve, reject) => {
      const file = createWriteStream(outputPath);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          file.close();
          fs.unlinkSync(outputPath);
          this.downloadFile(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(outputPath);
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          file.close();
          fs.unlinkSync(outputPath);
          reject(err);
        });
      }).on('error', (err) => {
        file.close();
        fs.unlinkSync(outputPath);
        reject(err);
      });
    });
  }

  async extractZip(zipPath, extractDir) {
    this.log(`Extracting ${zipPath} to ${extractDir}`);

    // Use PowerShell on Windows for extraction
    if (this.platform === 'win32') {
      const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`;
      execSync(command, { stdio: 'inherit' });
    } else {
      // Use system unzip on Unix systems
      execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { stdio: 'inherit' });
    }
  }

  async setupWindowsPython() {
    const platformKey = `${this.platform}-${this.arch}`;
    const pythonUrl = this.pythonUrls[platformKey];

    if (!pythonUrl) {
      throw new Error(`Unsupported platform: ${platformKey}`);
    }

    // Create python runtime directory
    if (!fs.existsSync(this.pythonDir)) {
      fs.mkdirSync(this.pythonDir, { recursive: true });
    }

    const zipPath = path.join(this.pythonDir, 'python-embedded.zip');

    // Download Python embedded distribution
    await this.downloadFile(pythonUrl, zipPath);

    // Extract Python
    await this.extractZip(zipPath, this.pythonDir);

    // Clean up zip file
    fs.unlinkSync(zipPath);

    // Download and setup pip
    await this.setupPip();

    // Install required packages
    await this.installRequirements();

    this.log('Windows Python setup completed successfully');
  }

  async setupPip() {
    this.log('Setting up pip...');

    const getPipPath = path.join(this.pythonDir, 'get-pip.py');
    await this.downloadFile(this.pipUrl, getPipPath);

    const pythonExe = path.join(this.pythonDir, 'python.exe');

    // Enable pip in embedded Python by modifying python311._pth
    const pthFiles = fs.readdirSync(this.pythonDir).filter(f => f.endsWith('._pth'));
    if (pthFiles.length > 0) {
      const pthPath = path.join(this.pythonDir, pthFiles[0]);
      let pthContent = fs.readFileSync(pthPath, 'utf8');

      // Uncomment import site line if it exists, or add it
      if (pthContent.includes('#import site')) {
        pthContent = pthContent.replace('#import site', 'import site');
      } else if (!pthContent.includes('import site')) {
        pthContent += '\nimport site\n';
      }

      fs.writeFileSync(pthPath, pthContent);
    }

    // Install pip
    execSync(`"${pythonExe}" "${getPipPath}"`, {
      stdio: 'inherit',
      cwd: this.pythonDir
    });

    // Clean up get-pip.py
    fs.unlinkSync(getPipPath);

    this.log('Pip setup completed');
  }

  async installRequirements() {
    if (!fs.existsSync(this.requirementsPath)) {
      this.error('requirements.txt not found, skipping package installation');
      return;
    }

    this.log('Installing Python requirements...');

    const pythonExe = path.join(this.pythonDir, 'python.exe');
    const pipExe = path.join(this.pythonDir, 'Scripts', 'pip.exe');

    try {
      // Install packages from requirements.txt
      execSync(`"${pipExe}" install -r "${this.requirementsPath}" --no-warn-script-location`, {
        stdio: 'inherit',
        cwd: this.pythonDir
      });

      this.log('Python requirements installed successfully');
    } catch (error) {
      this.error(`Failed to install requirements: ${error.message}`);
      throw error;
    }
  }

  async setupMacOSPython() {
    this.log('macOS Python setup not implemented yet - using system Python');
    // For now, we'll use system Python on macOS
    // In production, you might want to use a portable Python distribution

    if (!fs.existsSync(this.requirementsPath)) {
      this.error('requirements.txt not found');
      return;
    }

    try {
      // Install packages using system pip
      execSync(`pip3 install -r "${this.requirementsPath}"`, {
        stdio: 'inherit'
      });

      this.log('macOS requirements installed successfully');
    } catch (error) {
      this.error(`Failed to install requirements on macOS: ${error.message}`);
      throw error;
    }
  }

  async setupLinuxPython() {
    this.log('Linux Python setup not implemented yet - using system Python');
    // For now, we'll use system Python on Linux
    // In production, you might want to use a portable Python distribution

    if (!fs.existsSync(this.requirementsPath)) {
      this.error('requirements.txt not found');
      return;
    }

    try {
      // Install packages using system pip
      execSync(`pip3 install -r "${this.requirementsPath}"`, {
        stdio: 'inherit'
      });

      this.log('Linux requirements installed successfully');
    } catch (error) {
      this.error(`Failed to install requirements on Linux: ${error.message}`);
      throw error;
    }
  }

  async setup() {
    try {
      this.log(`Setting up Python for platform: ${this.platform}`);

      switch (this.platform) {
        case 'win32':
          await this.setupWindowsPython();
          break;
        case 'darwin':
          await this.setupMacOSPython();
          break;
        case 'linux':
          await this.setupLinuxPython();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      this.log('Python setup completed successfully');
    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      process.exit(1);
    }
  }

  // Method to get Python executable path for the app
  getPythonPath() {
    switch (this.platform) {
      case 'win32':
        return path.join(this.pythonDir, 'python.exe');
      case 'darwin':
      case 'linux':
        return 'python3'; // Use system Python for now
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  // Method to check if Python runtime exists
  isSetup() {
    const pythonPath = this.getPythonPath();
    if (this.platform === 'win32') {
      return fs.existsSync(pythonPath);
    } else {
      // For macOS/Linux, check if python3 is available
      try {
        execSync('python3 --version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const setup = new PythonSetup();
  setup.setup();
}

module.exports = PythonSetup;
