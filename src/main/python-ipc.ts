import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { pythonRuntime, PythonResult } from './python-runtime';

// Background removal
ipcMain.handle('python:remove-background', async (
  _event: IpcMainInvokeEvent,
  options: {
    inputPath?: string;
    base64Data?: string;
    outputPath?: string;
  }
): Promise<PythonResult> => {
  try {
    return await pythonRuntime.removeBackground(
      options.inputPath,
      options.base64Data,
      options.outputPath
    );
  } catch (error) {
    return {
      success: false,
      error: `Background removal failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// File conversion
ipcMain.handle('python:convert-file', async (
  _event: IpcMainInvokeEvent,
  options: {
    inputFormat: string;
    outputFormat: string;
    base64Data: string;
    quality?: number;
  }
): Promise<PythonResult> => {
  try {
    return await pythonRuntime.convertFile(
      options.inputFormat,
      options.outputFormat,
      options.base64Data,
      options.quality || 85
    );
  } catch (error) {
    return {
      success: false,
      error: `File conversion failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// File processing - extract filenames
ipcMain.handle('python:extract-filenames', async (
  _event: IpcMainInvokeEvent,
  options: {
    file_data: string; // base64
    file_type: string;
    filename: string;
  }
): Promise<PythonResult> => {
  try {
    return await pythonRuntime.processFiles('extract', options);
  } catch (error) {
    return {
      success: false,
      error: `Filename extraction failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// File processing - clean filenames
ipcMain.handle('python:clean-filenames', async (
  _event: IpcMainInvokeEvent,
  options: {
    filenames: string[];
    options?: {
      remove_numbers?: boolean;
      remove_extra_dashes?: boolean;
      remove_underscores?: boolean;
      remove_special_chars?: boolean;
      preserve_extension?: boolean;
      remove_leading_numbers?: boolean;
      normalize_spaces?: boolean;
    };
  }
): Promise<PythonResult> => {
  try {
    return await pythonRuntime.processFiles('clean', options);
  } catch (error) {
    return {
      success: false,
      error: `Filename cleaning failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// YouTube transcript
ipcMain.handle('python:get-youtube-transcript', async (
  _event: IpcMainInvokeEvent,
  options: {
    urlOrId: string;
    languageCodes?: string[];
  }
): Promise<PythonResult> => {
  try {
    return await pythonRuntime.getYouTubeTranscript(
      options.urlOrId,
      options.languageCodes || []
    );
  } catch (error) {
    return {
      success: false,
      error: `YouTube transcript extraction failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// Python runtime status
ipcMain.handle('python:check-status', async (): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> => {
  try {
    const available = pythonRuntime.isPythonAvailable();

    if (available) {
      const version = await pythonRuntime.getPythonVersion();
      return {
        available: true,
        version: version || 'Unknown'
      };
    } else {
      return {
        available: false,
        error: 'Python runtime not available'
      };
    }
  } catch (error) {
    return {
      available: false,
      error: `Status check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// Setup Python runtime
ipcMain.handle('python:setup-runtime', async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const success = await pythonRuntime.setupPythonRuntime();
    return {
      success,
      error: success ? undefined : 'Failed to setup Python runtime'
    };
  } catch (error) {
    return {
      success: false,
      error: `Setup failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

// Execute custom Python script
ipcMain.handle('python:execute-script', async (
  _event: IpcMainInvokeEvent,
  options: {
    scriptName: string;
    args?: string[];
    timeout?: number;
  }
): Promise<PythonResult> => {
  try {
    return await pythonRuntime.executePythonScript(
      options.scriptName,
      options.args || [],
      { timeout: options.timeout }
    );
  } catch (error) {
    return {
      success: false,
      error: `Script execution failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
});

export function setupPythonIPC(): void {
  console.log('[PythonIPC] IPC handlers registered');
}
