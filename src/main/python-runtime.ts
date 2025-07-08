import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface PythonResult {
  success: boolean;
  data?: any;
  error?: string;
  stdout?: string;
  stderr?: string;
}

export class PythonRuntime {
  private pythonPath: string = '';
  private scriptsDir: string = '';
  private appDataPath: string;

  constructor() {
    this.appDataPath = app.getPath('userData');
    this.setupPaths();
  }

  private setupPaths(): void {
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Development mode - use project directory
      this.scriptsDir = path.join(process.cwd(), 'scripts');
      this.pythonPath = this.getPythonExecutable(process.cwd());
    } else {
      // Production mode - use app resources
      const resourcesPath = process.resourcesPath;
      this.scriptsDir = path.join(resourcesPath, 'scripts');
      this.pythonPath = this.getPythonExecutable(resourcesPath);
    }
  }

  private getPythonExecutable(basePath: string): string {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        const winPythonPath = path.join(basePath, 'python-runtime', 'python.exe');
        if (fs.existsSync(winPythonPath)) {
          return winPythonPath;
        }
        // Fallback to system Python
        return 'python';

      case 'darwin':
      case 'linux':
        // For macOS and Linux, use system Python for now
        // In production, you might want to bundle Python here too
        return 'python3';

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async executePythonScript(
    scriptName: string,
    args: string[] = [],
    options: { timeout?: number; cwd?: string } = {}
  ): Promise<PythonResult> {
    return new Promise((resolve) => {
      const scriptPath = path.join(this.scriptsDir, scriptName);

      if (!fs.existsSync(scriptPath)) {
        resolve({
          success: false,
          error: `Script not found: ${scriptPath}`
        });
        return;
      }

      const allArgs = [scriptPath, ...args];
      const timeout = options.timeout || 30000; // 30 seconds default
      const cwd = options.cwd || this.scriptsDir;

      console.log(`[PythonRuntime] Executing: ${this.pythonPath} ${allArgs.join(' ')}`);

      const child: ChildProcess = spawn(this.pythonPath, allArgs, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      // Set up timeout
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Script execution timed out after ${timeout}ms`
        });
      }, timeout);

      // Collect stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);

        console.log(`[PythonRuntime] Script ${scriptName} exited with code ${code}`);

        if (code === 0) {
          // Try to parse JSON output
          try {
            const jsonData = JSON.parse(stdout.trim());
            resolve({
              success: true,
              data: jsonData,
              stdout,
              stderr
            });
          } catch (parseError) {
            // If not JSON, return raw stdout
            resolve({
              success: true,
              data: stdout.trim(),
              stdout,
              stderr
            });
          }
        } else {
          resolve({
            success: false,
            error: `Script exited with code ${code}`,
            stdout,
            stderr
          });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to start Python process: ${error.message}`,
          stderr: error.message
        });
      });
    });
  }

  // Background removal using rembg
  async removeBackground(
    inputPath?: string,
    base64Data?: string,
    outputPath?: string
  ): Promise<PythonResult> {
    const args: string[] = [];

    if (base64Data) {
      args.push('base64', base64Data);
    } else if (inputPath) {
      args.push('file', inputPath);
      if (outputPath) {
        args.push(outputPath);
      }
    } else {
      return {
        success: false,
        error: 'Either inputPath or base64Data must be provided'
      };
    }

    return this.executePythonScript('bg_remover.py', args, { timeout: 60000 });
  }

  // File format conversion
  async convertFile(
    inputFormat: string,
    outputFormat: string,
    base64Data: string,
    quality: number = 85
  ): Promise<PythonResult> {
    // Create temporary input file for the converter
    const tempDir = path.join(this.appDataPath, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputFile = path.join(tempDir, `converter_input_${Date.now()}.json`);

    try {
      const inputData = {
        inputFormat,
        outputFormat,
        base64Data,
        quality
      };

      fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));

      const result = await this.executePythonScript('file_converter.py', [inputFile], { timeout: 60000 });

      // Clean up temp file
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }

      return result;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }

      return {
        success: false,
        error: `File conversion failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // File processing (extract filenames, clean filenames)
  async processFiles(
    operation: 'extract' | 'clean',
    data: any
  ): Promise<PythonResult> {
    const tempDir = path.join(this.appDataPath, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const inputFile = path.join(tempDir, `file_processor_input_${Date.now()}.json`);

    try {
      const inputData = {
        operation,
        ...data
      };

      fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));

      const result = await this.executePythonScript('file_processor.py', [inputFile], { timeout: 60000 });

      // Clean up temp file
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }

      return result;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(inputFile)) {
        fs.unlinkSync(inputFile);
      }

      return {
        success: false,
        error: `File processing failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // YouTube transcript extraction
  async getYouTubeTranscript(
    urlOrId: string,
    languageCodes: string[] = []
  ): Promise<PythonResult> {
    const args = [urlOrId, ...languageCodes];
    return this.executePythonScript('youtube_transcriber.py', args, { timeout: 30000 });
  }

  // Check if Python runtime is available
  isPythonAvailable(): boolean {
    try {
      if (process.platform === 'win32') {
        return fs.existsSync(this.pythonPath);
      } else {
        // For Unix systems, try to execute python --version
        const { execSync } = require('child_process');
        execSync(`${this.pythonPath} --version`, { stdio: 'ignore' });
        return true;
      }
    } catch {
      return false;
    }
  }

  // Get Python version
  async getPythonVersion(): Promise<string | null> {
    try {
      const result = await this.executePythonScript('--version', [], { timeout: 5000 });
      if (result.success) {
        return result.stdout?.trim() || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  // Setup Python runtime if not available
  async setupPythonRuntime(): Promise<boolean> {
    try {
      const PythonSetup = require('../../scripts/python-setup.js');
      const setup = new PythonSetup();

      if (!setup.isSetup()) {
        console.log('[PythonRuntime] Setting up Python runtime...');
        await setup.setup();

        // Update python path after setup
        this.setupPaths();

        return this.isPythonAvailable();
      }

      return true;
    } catch (error) {
      console.error('[PythonRuntime] Failed to setup Python runtime:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pythonRuntime = new PythonRuntime();
