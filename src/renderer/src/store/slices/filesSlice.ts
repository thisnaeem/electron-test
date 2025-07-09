import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export interface FileData {
  id: string
  name: string
  type: string
  size: number
  lastModified: number
  previewPath?: string
  previewData?: string
}

export interface MetadataResult {
  filename: string
  title: string
  keywords: string[]
  description?: string
}

interface FilesState {
  files: FileData[]
  metadata: MetadataResult[]
  isLoading: boolean
  error: string | null
  isUploadProcessing: boolean
  uploadProgress: {
    current: number
    total: number
    currentFileName: string
  }
}

const initialState: FilesState = {
  files: [],
  metadata: [],
  isLoading: false,
  error: null,
  isUploadProcessing: false,
  uploadProgress: {
    current: 0,
    total: 0,
    currentFileName: ''
  }
}

// Async thunk to save image preview to Electron file system
export const saveImagePreview = createAsyncThunk(
  'files/saveImagePreview',
  async ({ imageData, filename }: { imageData: string; filename: string }, { rejectWithValue }) => {
    try {
      const result = await (window.api as any).saveImagePreview(imageData, filename)
      if (result.success) {
        return { id: result.id, path: result.path, previewData: imageData }
      } else {
        return rejectWithValue(result.error || 'Failed to save image preview')
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Async thunk to load all image previews from Electron file system
export const loadImagePreviews = createAsyncThunk(
  'files/loadImagePreviews',
  async (_, { rejectWithValue }) => {
    try {
      const result = await (window.api as any).getImagePreviews()
      if (result.success) {
        return result.previews
      } else {
        return rejectWithValue(result.error || 'Failed to load image previews')
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error')
    }
  }
)

// Async thunk to delete a single image preview
export const deleteImagePreview = createAsyncThunk(
  'files/deleteImagePreview',
  async (filename: string, { rejectWithValue }) => {
    try {
      // Check if the API is available
      if (window.api && typeof (window.api as any).deleteImagePreview === 'function') {
        const result = await (window.api as any).deleteImagePreview(filename)
        if (result.success) {
          return filename
        } else {
          return rejectWithValue(result.error || 'Failed to delete image preview')
        }
      } else {
        // API not available, just return success to continue with state cleanup
        console.warn('deleteImagePreview API not available, skipping file cleanup')
        return filename
      }
    } catch (error) {
      console.warn('Failed to delete image preview:', error)
      // Return success anyway to allow state cleanup to continue
      return filename
    }
  }
)

// Async thunk to clear all image previews
export const clearAllPreviews = createAsyncThunk(
  'files/clearAllPreviews',
  async (_, { rejectWithValue }) => {
    try {
      // Check if the API is available
      if (window.api && typeof (window.api as any).clearAllPreviews === 'function') {
        const result = await (window.api as any).clearAllPreviews()
        if (result.success) {
          return true
        } else {
          return rejectWithValue(result.error || 'Failed to clear all previews')
        }
      } else {
        // API not available, just return success to continue with state cleanup
        console.warn('clearAllPreviews API not available, skipping file cleanup')
        return true
      }
    } catch (error) {
      console.warn('Failed to clear all previews:', error)
      // Return success anyway to allow state cleanup to continue
      return true
    }
  }
)

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    addFile: (state, action: PayloadAction<FileData>) => {
      state.files.push(action.payload)
    },
    addFiles: (state, action: PayloadAction<FileData[]>) => {
      state.files.push(...action.payload)
    },
    removeFile: (state, action: PayloadAction<string>) => {
      const removedFile = state.files.find(file => file.id === action.payload)
      state.files = state.files.filter(file => file.id !== action.payload)

      // Also remove metadata for the removed file
      if (removedFile) {
        state.metadata = state.metadata.filter(meta => meta.filename !== removedFile.name)
      }
    },
    clearFiles: (state) => {
      state.files = []
      state.metadata = [] // Clear metadata when files are cleared
    },
    updateFilePreview: (state, action: PayloadAction<{ id: string; previewData: string; previewPath?: string }>) => {
      const file = state.files.find(f => f.id === action.payload.id)
      if (file) {
        file.previewData = action.payload.previewData
        if (action.payload.previewPath) {
          file.previewPath = action.payload.previewPath
        }
      }
    },
    // Metadata management
    addMetadata: (state, action: PayloadAction<MetadataResult[]>) => {
      // Add new metadata results, avoiding duplicates
      action.payload.forEach(newMetadata => {
        const existingIndex = state.metadata.findIndex(m => m.filename === newMetadata.filename)
        if (existingIndex >= 0) {
          state.metadata[existingIndex] = newMetadata
        } else {
          state.metadata.push(newMetadata)
        }
      })
    },
    updateMetadata: (state, action: PayloadAction<{ filename: string; title: string; keywords: string[]; description?: string }>) => {
      const existingIndex = state.metadata.findIndex(m => m.filename === action.payload.filename)
      if (existingIndex >= 0) {
        state.metadata[existingIndex] = {
          filename: action.payload.filename,
          title: action.payload.title,
          keywords: action.payload.keywords,
          description: action.payload.description
        }
      }
    },
    removeMetadata: (state, action: PayloadAction<string>) => {
      state.metadata = state.metadata.filter(m => m.filename !== action.payload)
    },
    clearMetadata: (state) => {
      state.metadata = []
    },
    clearError: (state) => {
      state.error = null
    },
    // Upload processing management
    setUploadProcessing: (state, action: PayloadAction<{ isProcessing: boolean; total?: number }>) => {
      state.isUploadProcessing = action.payload.isProcessing
      if (action.payload.total !== undefined) {
        state.uploadProgress.total = action.payload.total
        state.uploadProgress.current = 0
        state.uploadProgress.currentFileName = ''
      }
      if (!action.payload.isProcessing) {
        // Reset progress when processing ends
        state.uploadProgress = {
          current: 0,
          total: 0,
          currentFileName: ''
        }
      }
    },
    updateUploadProgress: (state, action: PayloadAction<{ current: number; currentFileName: string }>) => {
      state.uploadProgress.current = action.payload.current
      state.uploadProgress.currentFileName = action.payload.currentFileName
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveImagePreview.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(saveImagePreview.fulfilled, (state, action) => {
        state.isLoading = false
        const { id, path, previewData } = action.payload
        const file = state.files.find(f => f.id === id || f.name.includes(id.split('_')[0]))
        if (file) {
          file.previewPath = path
          file.previewData = previewData
        }
      })
      .addCase(saveImagePreview.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(loadImagePreviews.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loadImagePreviews.fulfilled, (state, action) => {
        state.isLoading = false
        // Update existing files with loaded previews
        const previews = action.payload as Record<string, string>
        state.files.forEach(file => {
          const previewKey = Object.keys(previews).find(key => key.includes(file.name.replace(/[^a-zA-Z0-9]/g, '_')))
          if (previewKey) {
            file.previewData = previews[previewKey]
            file.previewPath = previewKey
          }
        })
      })
      .addCase(loadImagePreviews.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(deleteImagePreview.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteImagePreview.fulfilled, (state) => {
        state.isLoading = false
        // Remove the file from state - filename cleanup is handled by the thunk
      })
      .addCase(deleteImagePreview.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      .addCase(clearAllPreviews.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(clearAllPreviews.fulfilled, (state) => {
        state.isLoading = false
        // Files are cleared by the clearFiles reducer
      })
      .addCase(clearAllPreviews.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

export const { addFile, addFiles, removeFile, clearFiles, updateFilePreview, addMetadata, updateMetadata, removeMetadata, clearMetadata, clearError, setUploadProcessing, updateUploadProgress } = filesSlice.actions
export default filesSlice.reducer
