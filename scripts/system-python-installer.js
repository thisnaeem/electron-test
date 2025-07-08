#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

class SystemPythonInstaller {
  constructor() {
    this.platform = process.platform;
    this.arch = process.arch;
    this.tempDir = path.join(process.env.TEMP || process.env.TMPDIR || '/tmp', 'python-installer');

    // Python installer URLs
    this.pythonInstallers = {
      'win32-x64': {
        url: 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe',
        filename: 'python-3.11.9-amd64.exe'
      },
      'win32-ia32': {
        url: 'https://www.python.org/ftp/python/3.11.9/python-3.11.9.exe',
        filename: 'python-3.11.9.exe'
      },
      'darwin-x64': {
        url: 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg',
        filename: 'python-3.11.9-macos11.pkg'
      },
      'darwin-arm64': {
        url: 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-macos11.pkg',
        filename: 'python-3.11.9-macos11.pkg'
      },
      'linux-x64': {
        url: 'https://www.python.org/ftp/python/3.11.9/Python-3.11.9.tar.xz',
        filename: 'Python-3.11.9.tar.xz'
      }
    };
  }

  async downloadFile(url, dest) {
    console.log(`[SystemPythonInstaller] Downloading ${url}...`);

    return new Promise((resolve, reject) => {
      const file = createWriteStream(dest);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirects
          return this.downloadFile(response.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize) {
            const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r[SystemPythonInstaller] Download progress: ${progress}%`);
          }
        });

        pipelineAsync(response, file)
          .then(() => {
            console.log(`\n[SystemPythonInstaller] Download completed: ${dest}`);
            resolve(dest);
          })
          .catch(reject);
      }).on('error', reject);
    });
  }

  async isPythonInstalled() {
    try {
      if (this.platform === 'win32') {
        // Check both python and python3 commands
        try {
          const version = execSync('python --version', { stdio: 'pipe', encoding: 'utf8' });
          if (version.includes('Python 3.11')) {
            console.log(`[SystemPythonInstaller] Found Python: ${version.trim()}`);
            return true;
          }
        } catch (e) {
          // Try python3
          try {
            const version = execSync('python3 --version', { stdio: 'pipe', encoding: 'utf8' });
            if (version.includes('Python 3.11')) {
              console.log(`[SystemPythonInstaller] Found Python3: ${version.trim()}`);
              return true;
            }
          } catch (e2) {
            // Neither worked
          }
        }
      } else {
        const version = execSync('python3 --version', { stdio: 'pipe', encoding: 'utf8' });
        if (version.includes('Python 3.11')) {
          console.log(`[SystemPythonInstaller] Found Python3: ${version.trim()}`);
          return true;
        }
      }
    } catch (error) {
      // Python not found or wrong version
    }
    return false;
  }

  async installPythonWindows(installerPath) {
    console.log('[SystemPythonInstaller] Installing Python on Windows...');

    // Install Python with specific options:
    // - /quiet: Silent installation
    // - InstallAllUsers=1: Install for all users
    // - PrependPath=1: Add to PATH
    // - Include_test=0: Don't include test suite
    // - Include_doc=0: Don't include documentation
    // - Include_dev=1: Include development headers
    // - Include_pip=1: Include pip
    // - Include_tcltk=0: Don't include Tkinter

    const installArgs = [
      '/quiet',
      'InstallAllUsers=1',
      'PrependPath=1',
      'Include_test=0',
      'Include_doc=0',
      'Include_dev=1',
      'Include_pip=1',
      'Include_tcltk=0',
      'SimpleInstall=1'
    ];

    return new Promise((resolve, reject) => {
      console.log(`[SystemPythonInstaller] Running: ${installerPath} ${installArgs.join(' ')}`);

      const child = spawn(installerPath, installArgs, {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        console.log('[SystemPythonInstaller]', data.toString().trim());
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
        console.log('[SystemPythonInstaller] Error:', data.toString().trim());
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('[SystemPythonInstaller] Python installation completed successfully');
          resolve();
        } else {
          console.error(`[SystemPythonInstaller] Python installation failed with code ${code}`);
          reject(new Error(`Installation failed with code ${code}: ${error}`));
        }
      });

      child.on('error', (err) => {
        console.error('[SystemPythonInstaller] Failed to start installer:', err);
        reject(err);
      });
    });
  }

  async installPythonMacOS(installerPath) {
    console.log('[SystemPythonInstaller] Installing Python on macOS...');

    return new Promise((resolve, reject) => {
      const child = spawn('sudo', ['installer', '-pkg', installerPath, '-target', '/'], {
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('[SystemPythonInstaller] Python installation completed successfully');
          resolve();
        } else {
          reject(new Error(`Installation failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  async installPythonLinux() {
    console.log('[SystemPythonInstaller] Installing Python on Linux...');

    try {
      // Try different package managers
      if (fs.existsSync('/usr/bin/apt-get')) {
        execSync('sudo apt-get update && sudo apt-get install -y python3.11 python3.11-pip python3.11-dev', { stdio: 'inherit' });
      } else if (fs.existsSync('/usr/bin/yum')) {
        execSync('sudo yum install -y python3.11 python3.11-pip python3.11-devel', { stdio: 'inherit' });
      } else if (fs.existsSync('/usr/bin/dnf')) {
        execSync('sudo dnf install -y python3.11 python3.11-pip python3.11-devel', { stdio: 'inherit' });
      } else if (fs.existsSync('/usr/bin/zypper')) {
        execSync('sudo zypper install -y python311 python311-pip python311-devel', { stdio: 'inherit' });
      } else {
        throw new Error('No supported package manager found');
      }

      console.log('[SystemPythonInstaller] Python installation completed successfully');
    } catch (error) {
      throw new Error(`Linux installation failed: ${error.message}`);
    }
  }

  async installRequirements() {
    console.log('[SystemPythonInstaller] Installing Python requirements...');

    const requirementsPath = path.join(process.cwd(), 'requirements.txt');
    if (!fs.existsSync(requirementsPath)) {
      console.log('[SystemPythonInstaller] No requirements.txt found, skipping package installation');
      return;
    }

    try {
      const pythonCmd = this.platform === 'win32' ? 'python' : 'python3';
      const pipCmd = this.platform === 'win32' ? 'pip' : 'pip3';

      // Upgrade pip first
      console.log('[SystemPythonInstaller] Upgrading pip...');
      execSync(`${pythonCmd} -m pip install --upgrade pip`, { stdio: 'inherit' });

      // Install requirements
      console.log('[SystemPythonInstaller] Installing requirements...');
      execSync(`${pipCmd} install -r "${requirementsPath}"`, { stdio: 'inherit' });

      console.log('[SystemPythonInstaller] Requirements installed successfully');
    } catch (error) {
      console.error('[SystemPythonInstaller] Failed to install requirements:', error.message);
      throw error;
    }
  }

  async setup() {
    try {
      console.log('=== System Python Installation ===');
      console.log(`Platform: ${this.platform}-${this.arch}`);

      // Check if Python is already installed
      if (await this.isPythonInstalled()) {
        console.log('[SystemPythonInstaller] Python 3.11 is already installed');
        await this.installRequirements();
        return;
      }

      console.log('[SystemPythonInstaller] Python 3.11 not found, installing...');

      // Create temp directory
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      const platformKey = `${this.platform}-${this.arch}`;
      const installerInfo = this.pythonInstallers[platformKey];

      if (!installerInfo) {
        throw new Error(`Unsupported platform: ${platformKey}`);
      }

      // Download installer
      const installerPath = path.join(this.tempDir, installerInfo.filename);
      await this.downloadFile(installerInfo.url, installerPath);

      // Install Python
      if (this.platform === 'win32') {
        await this.installPythonWindows(installerPath);
      } else if (this.platform === 'darwin') {
        await this.installPythonMacOS(installerPath);
      } else if (this.platform === 'linux') {
        await this.installPythonLinux();
      }

      // Wait a bit for PATH to update
      console.log('[SystemPythonInstaller] Waiting for PATH to update...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify installation
      if (await this.isPythonInstalled()) {
        console.log('✅ Python installation verified');

        // Install requirements
        await this.installRequirements();

        console.log('✅ System Python setup completed successfully');
      } else {
        throw new Error('Python installation verification failed');
      }

      // Clean up
      if (fs.existsSync(installerPath)) {
        fs.unlinkSync(installerPath);
      }

    } catch (error) {
      console.error('❌ System Python installation failed:', error.message);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const installer = new SystemPythonInstaller();
  installer.setup().catch(error => {
    console.error('Installation failed:', error);
    process.exit(1);
  });
}

module.exports = SystemPythonInstaller;
