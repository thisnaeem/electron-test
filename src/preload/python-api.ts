import { ipcRenderer } from 'electron';

export interface PythonResult {
  success: boolean;
  data?: any;
  error?: string;
  stdout?: string;
  stderr?: string;
}

export interface PythonStatus {
  available: boolean;
  version?: string;
  error?: string;
}

export interface PythonSetupResult {
  success: boolean;
  error?: string;
}

export const pythonApi = {
  // Background removal
  removeBackground: (options: {
    inputPath?: string;
    base64Data?: string;
    outputPath?: string;
  }): Promise<PythonResult> => {
    return ipcRenderer.invoke('python:remove-background', options);
  },

  // File conversion
  convertFile: (options: {
    inputFormat: string;
    outputFormat: string;
    base64Data: string;
    quality?: number;
  }): Promise<PythonResult> => {
    return ipcRenderer.invoke('python:convert-file', options);
  },

  // Extract filenames from files
  extractFilenames: (options: {
    file_data: string; // base64
    file_type: string;
    filename: string;
  }): Promise<PythonResult> => {
    return ipcRenderer.invoke('python:extract-filenames', options);
  },

  // Clean filenames
  cleanFilenames: (options: {
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
  }): Promise<PythonResult> => {
    return ipcRenderer.invoke('python:clean-filenames', options);
  },

  // YouTube transcript
  getYouTubeTranscript: (options: {
    urlOrId: string;
    languageCodes?: string[];
  }): Promise<PythonResult> => {
    return ipcRenderer.invoke('python:get-youtube-transcript', options);
  },

  // Python runtime status
  checkStatus: (): Promise<PythonStatus> => {
    return ipcRenderer.invoke('python:check-status');
  },

  // Setup Python runtime
  setupRuntime: (): Promise<PythonSetupResult> => {
    return ipcRenderer.invoke('python:setup-runtime');
  },

  // Execute custom Python script
  executeScript: (options: {
    scriptName: string;
    args?: string[];
    timeout?: number;
  }): Promise<PythonResult> => {
    return ipcRenderer.invoke('python:execute-script', options);
  }
};

export type PythonAPI = typeof pythonApi;
