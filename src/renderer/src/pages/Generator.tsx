import { useState, useCallback, useEffect } from 'react'
import { useGemini } from '../context/useGemini'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { ImageInput, MetadataResult } from '../context/GeminiContext.types'
import { addMetadata, updateMetadata, removeMetadata, clearMetadata } from '../store/slices/filesSlice'
import ImageUploader from '../components/ImageUploader'
import UploadedImagesDisplay from '../components/UploadedImagesDisplay'
import UploadProcessingModal from '../components/UploadProcessingModal'
import { downloadMultiPlatformCSVs, ImageData } from '../utils/csvGenerator'

const Generator = (): React.JSX.Element => {
  const { generateMetadata, stopGeneration, isLoading, error, processingProgress, generationStartTime } = useGemini()
  const dispatch = useAppDispatch()
  const { files, metadata } = useAppSelector(state => state.files)
  const { hasCompletedOnboarding, apiKeys, generationSettings } = useAppSelector(state => state.settings)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)

  // Check if user has completed onboarding (5+ valid API keys)
  const validApiKeysCount = apiKeys.filter(key => key.isValid).length
  const needsOnboarding = !hasCompletedOnboarding || validApiKeysCount < 5

  // Clear metadata when no files are left
  useEffect(() => {
    if (files.length === 0 && metadata.length > 0) {
      dispatch(clearMetadata())
      setSelectedImageId(null)
    }
  }, [files.length, metadata.length, dispatch])

  // Clear selected image if it no longer exists
  useEffect(() => {
    if (selectedImageId && !files.find(f => f.id === selectedImageId)) {
      setSelectedImageId(null)
    }
  }, [files, selectedImageId])



  const handleFilesAccepted = useCallback((files: File[] | ImageInput[]) => {
    console.log('Files accepted:', files.length)
  }, [])

  const handleImageSelected = useCallback((imageId: string) => {
    setSelectedImageId(imageId)
  }, [])

    const handleProcess = useCallback(async (input: File[] | ImageInput[], settings?: {
    titleWords: number;
    keywordsCount: number;
    descriptionWords: number;
    keywordSettings?: {
      singleWord: boolean;
      doubleWord: boolean;
      mixed: boolean;
    }
    customization?: {
      customPrompt: boolean;
      customPromptText: string;
      prohibitedWords: boolean;
      prohibitedWordsList: string;
      transparentBackground: boolean;
      silhouette: boolean;
    }
    titleCustomization?: {
      titleStyle: string;
      customPrefix: boolean;
      prefixText: string;
      customPostfix: boolean;
      postfixText: string;
    }
  }) => {
    if (input.length === 0) return

    // Check if user has enough API keys to use the generator
    if (needsOnboarding) {
      // Show inline message instead of processing
      return
    }

    try {
      // Convert to ImageInput format if needed
      let imageInputs: ImageInput[]

      if (input.length > 0 && 'imageData' in input[0]) {
        // Already in ImageInput format
        imageInputs = input as ImageInput[]
      } else {
        // Convert File[] to ImageInput[] (this shouldn't happen in current flow)
        const fileInputs = input as File[]
        imageInputs = await Promise.all(
          fileInputs.map(async (file) => {
            const imageData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = () => reject(new Error('Failed to read file'))
              reader.readAsDataURL(file)
            })
            return {
              imageData,
              filename: file.name
            }
          })
        )
      }

      // Real-time metadata callback - add each result immediately when generated
      const handleMetadataGenerated = (result: MetadataResult): void => {
        console.log('🔥 Real-time metadata generated:', result.filename)
        dispatch(addMetadata([result]))
      }

      // Use the new parallel processing system with real-time callback
      const results = await generateMetadata(imageInputs, handleMetadataGenerated, settings)

      // Final fallback - ensure any missed results are added
      // (This shouldn't be needed with real-time updates, but kept as safety net)
      const existingFilenames = metadata.map(m => m.filename)
      const newResults = results.filter(r => !existingFilenames.includes(r.filename))
      if (newResults.length > 0) {
        console.log(`📋 Adding ${newResults.length} missed results to store`)
        dispatch(addMetadata(newResults))
      }

    } catch (err) {
      console.error('Error generating metadata:', err)
      setShowErrorDialog(true)
    }
  }, [generateMetadata, dispatch, metadata, needsOnboarding])

  const handleImageRemoved = useCallback((filename: string) => {
    // Remove metadata for the removed image
    dispatch(removeMetadata(filename))

    // Clear selection if the removed image was selected
    const removedFile = files.find(f => f.name === filename)
    if (removedFile && selectedImageId === removedFile.id) {
      setSelectedImageId(null)
    }
  }, [files, selectedImageId, dispatch])

  const handleClear = useCallback(() => {
    dispatch(clearMetadata())
    setSelectedImageId(null)
  }, [dispatch])

  const handleCloseErrorDialog = useCallback(() => {
    setShowErrorDialog(false)
  }, [])

  const handleRetry = useCallback(() => {
    setShowErrorDialog(false)
    if (files.length > 0) {
      // Create ImageInput array from stored files for retry
      const imageInputs = files
        .filter(file => file.previewData && file.previewData.trim() !== '')
        .map(file => {
          // For vector files (SVGs) that have been converted, update the filename to reflect the conversion
          let processedFilename = file.name
          if (file.fileType === 'vector' && file.name.toLowerCase().endsWith('.svg')) {
            // Change .svg extension to .png since we converted it
            processedFilename = file.name.replace(/\.svg$/i, '.png')
          }

          return {
            imageData: file.previewData,
            filename: processedFilename,
            fileType: file.fileType || 'image',
            originalData: file.originalData
          }
        })

      if (imageInputs.length > 0) {
        handleProcess(imageInputs as ImageInput[])
      }
    }
  }, [files, handleProcess])

  // Get selected platforms from settings outside of callback

  const handleExportCSV = useCallback(() => {
    if (metadata.length === 0) return

    const selectedPlatforms = generationSettings.platforms || ['freepik']

    // Convert MetadataResult to ImageData format
    const imageDataList: ImageData[] = metadata.map(result => ({
      filename: result.filename,
      title: result.title,
      keywords: result.keywords,
      description: result.description || ''
    }))

    // Use the new comprehensive CSV generator for all platforms
    downloadMultiPlatformCSVs(selectedPlatforms, imageDataList)
  }, [metadata, generationSettings.platforms])

  const handleMetadataUpdated = useCallback((filename: string, updatedMetadata: { title: string; keywords: string[]; description?: string }) => {
    dispatch(updateMetadata({
      filename,
      title: updatedMetadata.title,
      keywords: updatedMetadata.keywords,
      description: updatedMetadata.description
    }))
  }, [dispatch])



  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 min-h-screen flex items-center justify-center overflow-auto bg-white dark:bg-[#101113]">
      <div className="min-h-full w-full p-4 relative space-y-4">
        {/* Upload Processing Modal */}
        <UploadProcessingModal />
        {/* Image Uploader or API Keys Required Message */}
        {files.length === 0 && !isLoading && (
          <div className="h-full flex items-center justify-center">
            {needsOnboarding ? (
              <div className="w-full max-w-2xl p-12 bg-[#f3f4f6] dark:bg-[#2a2d3a] rounded-2xl text-center">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white">Generator Requires API Keys</h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      Add 5 Gemini API keys in Settings to use the generator feature.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Current: {validApiKeysCount}/5
                    </p>
                  </div>
                  <button
                    onClick={() => window.location.hash = '#/settings'}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Go to Settings
                  </button>
                </div>
              </div>
            ) : (
              <ImageUploader
                onFilesAccepted={handleFilesAccepted}
                isProcessing={isLoading}
              />
            )}
          </div>
        )}

        {/* Uploaded Images Display - Only show if files exist */}
        {files.length > 0 && (
          <UploadedImagesDisplay
            onClear={handleClear}
            onProcess={handleProcess}
            onFilesAccepted={handleFilesAccepted}
            onImageRemoved={handleImageRemoved}
            onImageSelected={handleImageSelected}
            selectedImageId={selectedImageId}
            isProcessing={isLoading}
            hasMetadata={metadata.length > 0}
            metadataResults={metadata}
            onExportCSV={handleExportCSV}
            processingProgress={processingProgress ? {
              current: processingProgress.completed,
              total: processingProgress.total
            } : undefined}
            currentProcessingFilename={processingProgress?.currentFilename || null}
            generationStartTime={generationStartTime}
            onMetadataUpdated={handleMetadataUpdated}
            onStopGeneration={stopGeneration}
          />
        )}

        {/* Error Dialog */}
        {showErrorDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generation Failed
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {error || 'An error occurred while generating metadata. Please try again.'}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseErrorDialog}
                  className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Generator
