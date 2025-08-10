import { useState, useCallback, useEffect } from 'react'
import { useGemini } from '../context/useGemini'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { ImageInput, MetadataResult } from '../context/GeminiContext.types'
import { addMetadata, updateMetadata, removeMetadata, clearMetadata } from '../store/slices/filesSlice'
import ImageUploader from '../components/ImageUploader'
import UploadedImagesDisplay from '../components/UploadedImagesDisplay'
import UploadProcessingModal from '../components/UploadProcessingModal'
import GeneratorAccessGuard from '../components/GeneratorAccessGuard'
import { downloadMultiPlatformCSVs, ImageData } from '../utils/csvGenerator'
import { apiKeyValidationService } from '../services/ApiKeyValidationService'
// Remove: import TitleBar from '../components/TitleBar'

const Generator = (): React.JSX.Element => {
  const { generateMetadata, stopGeneration, isLoading, error, processingProgress, generationStartTime } = useGemini()
  const dispatch = useAppDispatch()
  const { files, metadata } = useAppSelector(state => state.files)
  const { apiKeys, generationSettings, autoDownloadCsv, metadataProvider, openaiApiKey, isOpenaiApiKeyValid, openaiSelectedModel, groqApiKey, isGroqApiKeyValid, openrouterApiKey, isOpenrouterApiKeyValid, openrouterSelectedModel } = useAppSelector(state => state.settings)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)

  // Use the validation service to check generator access with provider-specific logic
  const accessResult = apiKeyValidationService.checkGeneratorAccess(
    apiKeys,
    metadataProvider,
    {
      openaiApiKey,
      isOpenaiApiKeyValid,
      groqApiKey,
      isGroqApiKeyValid,
      openrouterApiKey,
      isOpenrouterApiKeyValid
    }
  )
  const needsOnboarding = !accessResult.hasAccess

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
    titleMinWords?: number;
    titleMaxWords?: number;
    keywordsCount: number;
    keywordsMinCount?: number;
    keywordsMaxCount?: number;
    descriptionWords: number;
    descriptionMinWords?: number;
    descriptionMaxWords?: number;
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

    // Check if OpenAI is selected but not configured
    if (metadataProvider === 'openai' && (!openaiApiKey || !isOpenaiApiKeyValid)) {
      setShowErrorDialog(true)
      return
    }

    // Check if Groq is selected but not configured
    if (metadataProvider === 'groq' && (!groqApiKey || !isGroqApiKeyValid)) {
      setShowErrorDialog(true)
      return
    }

    // Check if OpenRouter is selected but not configured
    if (metadataProvider === 'openrouter' && (!openrouterApiKey || !isOpenrouterApiKeyValid)) {
      setShowErrorDialog(true)
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

      // Filter out undefined results (failed generations)
      const successfulResults = results.filter(r => r !== undefined)
      const failedCount = imageInputs.length - successfulResults.length

      // Final fallback - ensure any missed results are added
      // (This shouldn't be needed with real-time updates, but kept as safety net)
      const existingFilenames = metadata.map(m => m.filename)
      const newResults = successfulResults.filter(r => !existingFilenames.includes(r.filename))
      if (newResults.length > 0) {
        console.log(`📋 Adding ${newResults.length} missed results to store`)
        dispatch(addMetadata(newResults))
      }

      // Show native notification when generation completes
      if (successfulResults.length > 0) {
        const notificationBody = failedCount > 0 
          ? `Successfully generated metadata for ${successfulResults.length} image${successfulResults.length > 1 ? 's' : ''}. ${failedCount} failed.`
          : `Successfully generated metadata for ${successfulResults.length} image${successfulResults.length > 1 ? 's' : ''}`
        
        try {
          await window.api.showNotification({
            title: 'Metadata Generation Complete',
            body: notificationBody
          })
        } catch (error) {
          console.log('Could not show notification:', error)
        }
      } else if (failedCount > 0) {
        // All failed
        try {
          await window.api.showNotification({
            title: 'Metadata Generation Failed',
            body: `Failed to generate metadata for ${failedCount} image${failedCount > 1 ? 's' : ''}. Please check image quality and try again.`
          })
        } catch (error) {
          console.log('Could not show notification:', error)
        }
      }

      // Auto-download CSV if enabled and we have successful results
      if (autoDownloadCsv && successfulResults.length > 0) {
        console.log('🚀 Auto-downloading CSV after generation completion')
        
        // Small delay to ensure state is fully updated
        setTimeout(() => {
          // Get the complete metadata (including any existing + new results)
          const allMetadata = [...metadata, ...newResults]
          
          if (allMetadata.length > 0) {
            const selectedPlatforms = generationSettings.platforms || ['freepik']
            
            // Convert MetadataResult to ImageData format
            const imageDataList: ImageData[] = allMetadata.map(result => ({
              filename: result.filename,
              title: result.title,
              keywords: result.keywords,
              description: result.description || ''
            }))

            // Trigger automatic CSV download
            downloadMultiPlatformCSVs(selectedPlatforms, imageDataList, generationSettings.platformOptions)
            console.log('✅ Auto-download CSV completed')
          }
        }, 500) // 500ms delay to ensure UI state is updated
      }

    } catch (err) {
      console.error('Error generating metadata:', err)
      setShowErrorDialog(true)
    }
  }, [generateMetadata, dispatch, metadata, needsOnboarding, autoDownloadCsv, generationSettings.platforms])

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
    downloadMultiPlatformCSVs(selectedPlatforms, imageDataList, generationSettings.platformOptions)
  }, [metadata, generationSettings.platforms, generationSettings.platformOptions])

  const handleMetadataUpdated = useCallback((filename: string, updatedMetadata: { title: string; keywords: string[]; description?: string }) => {
    dispatch(updateMetadata({
      filename,
      title: updatedMetadata.title,
      keywords: updatedMetadata.keywords,
      description: updatedMetadata.description
    }))
  }, [dispatch])



  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 min-h-screen flex flex-col bg-white dark:bg-[#101113]">
      <div className="flex-1 min-h-0 w-full p-4 relative space-y-4 overflow-y-auto">
        {/* Upload Processing Modal */}
        <UploadProcessingModal />
        
        {/* Provider Status Indicator */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              metadataProvider === 'gemini' ? 'bg-blue-500' : 
              metadataProvider === 'openai' ? 'bg-black' : 
              metadataProvider === 'groq' ? 'bg-orange-500' :
              'bg-purple-500'
            }`}></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Using {
                metadataProvider === 'gemini' ? 'Google Gemini' : 
                metadataProvider === 'openai' ? `OpenAI ${openaiSelectedModel || 'GPT-4o-mini'}` : 
                metadataProvider === 'groq' ? 'Groq LLaVA-v1.5-7B' :
                `OpenRouter ${openrouterSelectedModel?.split('/')[1]?.split(':')[0] || 'Model'}`
              } for metadata generation
            </span>
            {metadataProvider === 'openai' && !isOpenaiApiKeyValid && (
              <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                API key not configured
              </span>
            )}
            {metadataProvider === 'groq' && !isGroqApiKeyValid && (
              <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                API key not configured
              </span>
            )}
            {metadataProvider === 'openrouter' && !isOpenrouterApiKeyValid && (
              <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                API key not configured
              </span>
            )}
          </div>
          <button
            onClick={() => window.location.hash = '#/settings'}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Change Provider
          </button>
        </div>
        {/* Image Uploader with Access Guard */}
        {files.length === 0 && !isLoading && (
          <GeneratorAccessGuard>
            <div className="h-full flex items-center justify-center">
              <ImageUploader
                onFilesAccepted={handleFilesAccepted}
                isProcessing={isLoading}
              />
            </div>
          </GeneratorAccessGuard>
        )}

        {/* Uploaded Images Display - Only show if files exist */}
        {files.length > 0 && (
          <GeneratorAccessGuard
            fallback={
              <div className="h-full flex items-center justify-center">
                <div className="w-full max-w-2xl p-8 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-center border border-orange-200 dark:border-orange-800">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">
                        Generator Access Lost
                      </h3>
                      <p className="text-orange-700 dark:text-orange-300 mt-1">
                        You need {accessResult.requiredKeyCount} valid API keys to process images. 
                        Currently have {accessResult.validKeyCount} valid keys.
                      </p>
                    </div>
                    <button
                      onClick={() => window.location.hash = '#/settings'}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Fix API Keys
                    </button>
                  </div>
                </div>
              </div>
            }
          >
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
          </GeneratorAccessGuard>
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
                  {metadataProvider === 'openai' && (!openaiApiKey || !isOpenaiApiKeyValid) 
                    ? 'OpenAI API Key Required' 
                    : metadataProvider === 'groq' && (!groqApiKey || !isGroqApiKeyValid)
                    ? 'Groq API Key Required'
                    : metadataProvider === 'openrouter' && (!openrouterApiKey || !isOpenrouterApiKeyValid)
                    ? 'OpenRouter API Key Required'
                    : 'Generation Failed'}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {metadataProvider === 'openai' && (!openaiApiKey || !isOpenaiApiKeyValid)
                  ? 'You have selected OpenAI as your metadata provider, but no valid API key is configured. Please add and validate your OpenAI API key in Settings.'
                  : metadataProvider === 'groq' && (!groqApiKey || !isGroqApiKeyValid)
                  ? 'You have selected Groq as your metadata provider, but no valid API key is configured. Please add and validate your Groq API key in Settings.'
                  : metadataProvider === 'openrouter' && (!openrouterApiKey || !isOpenrouterApiKeyValid)
                  ? 'You have selected OpenRouter as your metadata provider, but no valid API key is configured. Please add and validate your OpenRouter API key in Settings.'
                  : (error || 'An error occurred while generating metadata. Please try again.')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseErrorDialog}
                  className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                {(metadataProvider === 'openai' && (!openaiApiKey || !isOpenaiApiKeyValid)) || 
                 (metadataProvider === 'groq' && (!groqApiKey || !isGroqApiKeyValid)) ||
                 (metadataProvider === 'openrouter' && (!openrouterApiKey || !isOpenrouterApiKeyValid)) ? (
                  <button
                    onClick={() => {
                      handleCloseErrorDialog()
                      window.location.hash = '#/settings'
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Go to Settings
                  </button>
                ) : (
                  <button
                    onClick={handleRetry}
                    className="px-6 py-2.5 bg-[#f5f5f5] hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Generator
