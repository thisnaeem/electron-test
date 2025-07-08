import { useState } from 'react'
import { useAppSelector } from '../../store/hooks'
import { useGemini } from '../../context/useGemini'
import Together from 'together-ai'
import analytics from '../../services/analytics'

interface GeneratedImage {
  id: string
  imageData: string // Can be base64 or URL
  isUrl: boolean
  prompt: string
  timestamp: number
}

interface LoadingPlaceholder {
  id: string
  isLoading: true
  prompt: string
  timestamp: number
  aspectRatio: string
}

type ImageOrPlaceholder = GeneratedImage | LoadingPlaceholder

const ImageGenerator = (): React.JSX.Element => {
  const { togetherApiKey, isTogetherApiKeyValid } = useAppSelector(state => state.settings)
  const { enhancePrompt, isLoading: isEnhancing } = useGemini()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<ImageOrPlaceholder[]>([])
  const [, setError] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState('General')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [numImages, setNumImages] = useState(4)
  const [showSettings, setShowSettings] = useState(false)
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null)

  // Close settings when clicking outside
  const handleClickOutside = (e: React.MouseEvent): void => {
    if (showSettings) {
      const target = e.target as HTMLElement
      const settingsPanel = document.getElementById('settings-panel')
      const settingsButton = document.getElementById('settings-button')

      if (settingsPanel && settingsButton &&
          !settingsPanel.contains(target) &&
          !settingsButton.contains(target)) {
        setShowSettings(false)
      }
    }
  }

    // Pre-written prompt suggestions
  const promptSuggestions = [
    "A majestic dragon flying over a mountain landscape at sunset",
    "A cyberpunk cityscape with neon lights and flying cars at night",
    "A cozy coffee shop interior with warm lighting and vintage furniture",
    "A fantasy forest with glowing mushrooms and magical creatures",
    "A minimalist modern kitchen with marble countertops and natural light",
    "A space station orbiting Earth with astronauts floating outside",
    "A vintage steam locomotive crossing a bridge over a misty valley",
    "A beautiful garden filled with colorful flowers and butterflies",
    "A medieval castle on a cliff overlooking stormy seas",
    "A futuristic robot in a high-tech laboratory environment",
    "A peaceful zen garden with bamboo and a small waterfall",
    "A bustling marketplace in ancient Rome with merchants and citizens"
  ]

  // Style options
  const styleOptions = [
    { name: 'General', description: 'Default AI style' },
    { name: 'Realistic', description: 'Photorealistic images' },
    { name: 'Anime', description: 'Anime/manga style' },
    { name: 'Design', description: 'Modern design aesthetic' },
    { name: 'Render 3D', description: '3D rendered look' },
    { name: 'Artistic', description: 'Artistic and creative' },
    { name: 'Fantasy', description: 'Fantasy and magical' },
    { name: 'Vintage', description: 'Retro and vintage' }
  ]

  // Aspect ratio options
  const aspectRatioOptions = [
    { value: '1:1', label: 'Square (1:1)', width: 1024, height: 1024 },
    { value: '16:9', label: 'Landscape (16:9)', width: 1344, height: 768 },
    { value: '9:16', label: 'Portrait (9:16)', width: 768, height: 1344 },
    { value: '4:3', label: 'Standard (4:3)', width: 1152, height: 896 },
    { value: '3:4', label: 'Portrait (3:4)', width: 896, height: 1152 }
  ]

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    if (!togetherApiKey || !isTogetherApiKeyValid) {
      setError('Please add and validate your Together AI API key in Settings')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const together = new Together({ apiKey: togetherApiKey })

      // Build enhanced prompt with style
      let enhancedPrompt = prompt.trim()
      if (selectedStyle !== 'General') {
        const styleModifiers = {
          'Realistic': ', photorealistic, high quality, detailed',
          'Anime': ', anime style, manga style, cel shaded',
          'Design': ', modern design, clean aesthetic, minimalist',
          'Render 3D': ', 3D rendered, CGI, volumetric lighting',
          'Artistic': ', artistic style, painterly, creative',
          'Fantasy': ', fantasy art, magical, ethereal',
          'Vintage': ', vintage style, retro, classic'
        }
        enhancedPrompt += styleModifiers[selectedStyle] || ''
      }

      // Get dimensions for aspect ratio
      const selectedRatio = aspectRatioOptions.find(ratio => ratio.value === aspectRatio)
      const width = selectedRatio?.width || 1024
      const height = selectedRatio?.height || 1024

      console.log('🎨 Generating images with prompt:', enhancedPrompt)
      console.log('📐 Dimensions:', `${width}x${height}`)
      console.log('🎭 Style:', selectedStyle)
      console.log('🔢 Number of images:', numImages)

      // Track image generation start
      analytics.trackToolUsage('image_generator', 'generate_start', {
        style: selectedStyle,
        aspect_ratio: aspectRatio,
        num_images: numImages,
        prompt_length: prompt.length
      })

      // Create base timestamp for this generation batch
      const batchTimestamp = Date.now()

      // Create loading placeholders immediately
      const loadingPlaceholders: LoadingPlaceholder[] = Array.from({ length: numImages }, (_, index) => ({
        id: `loading-${batchTimestamp}-${index}`,
        isLoading: true as const,
        prompt: enhancedPrompt,
        timestamp: batchTimestamp,
        aspectRatio: aspectRatio
      }))

      // Add loading placeholders to the UI immediately
      setGeneratedImages(prev => [...loadingPlaceholders, ...prev])

      // Generate images one by one and replace loading placeholders as they complete
      for (let index = 0; index < numImages; index++) {
        console.log(`🔄 Generating image ${index + 1} of ${numImages}`)

        try {
          const response = await together.images.create({
            model: "black-forest-labs/FLUX.1-schnell-Free",
            prompt: enhancedPrompt,
            width: width,
            height: height,
            steps: 4,
            n: 1 // Always 1 for the free model
          })

          if (!response.data || response.data.length === 0) {
            throw new Error(`No image generated for request ${index + 1}`)
          }

          const imageData = response.data[0] as any
          const imageSource = imageData.b64_json || imageData.url || imageData.image || ''

          // Check if it's a URL or base64 data
          const isUrl = imageSource.startsWith('http')

          console.log(`🖼️ Image ${index + 1} source:`, isUrl ? 'URL' : 'Base64', imageSource.substring(0, 50))

          const newImage: GeneratedImage = {
            id: `${batchTimestamp}-${index}`,
            imageData: imageSource,
            isUrl: isUrl,
            prompt: enhancedPrompt,
            timestamp: batchTimestamp // Use same timestamp for all images in this batch
          }

          // Replace the loading placeholder with the actual image
          const loadingId = `loading-${batchTimestamp}-${index}`
          setGeneratedImages(prev =>
            prev.map(item =>
              item.id === loadingId ? newImage : item
            )
          )

          console.log(`✅ Image ${index + 1} of ${numImages} generated successfully`)

        } catch (imageError) {
          console.error(`❌ Error generating image ${index + 1}:`, imageError)

          // Replace the loading placeholder with an error placeholder
          const loadingId = `loading-${batchTimestamp}-${index}`
          setGeneratedImages(prev =>
            prev.filter(item => item.id !== loadingId)
          )

          // Continue with next image even if one fails
        }
      }

      setPrompt('') // Clear the prompt after generation starts
      console.log('✅ All image generation requests completed')

      // Track successful generation
      analytics.trackToolUsage('image_generator', 'generate_success', {
        style: selectedStyle,
        aspect_ratio: aspectRatio,
        num_images: numImages,
        prompt_length: prompt.length
      })

    } catch (error) {
      console.error('❌ Image generation error:', error)
      setError(
        error instanceof Error
          ? `Generation failed: ${error.message}`
          : 'Failed to generate images. Check your API key and internet connection.'
      )

      // Track generation error
      analytics.trackToolUsage('image_generator', 'generate_error', {
        error_type: error instanceof Error ? error.name : 'Unknown',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsGenerating(false)

      // Clean up any remaining loading placeholders on completion/error
      setGeneratedImages(prev =>
        prev.filter(item => !('isLoading' in item && item.isLoading))
      )
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (prompt.trim() && !isGenerating && !isEnhancing) {
        handleGenerate()
      }
    }
  }

  const downloadImage = async (image: GeneratedImage): Promise<void> => {
    try {
      setDownloadingImageId(image.id)
      console.log('🔽 Download button clicked for image:', image.id)
      console.log('🔽 Image is URL:', image.isUrl)
      console.log('🔽 Image data length:', image.imageData.length)

      if (image.isUrl) {
        console.log('🔽 Downloading from URL:', image.imageData.substring(0, 100) + '...')
        // If it's a URL, use the main process to download it (bypasses CORS)
        const result = await window.api.downloadImageFromUrl(
          image.imageData,
          `generated-image-${image.id}`
        )

        console.log('🔽 Download result:', result)

        if (result.success && result.base64) {
          // Create download link using the downloaded base64 data
          const link = document.createElement('a')
          link.href = result.base64
          link.download = `generated-image-${image.id}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          console.log('✅ Image downloaded successfully via URL')
        } else {
          throw new Error(result.error || 'Failed to download image')
        }
      } else {
        console.log('🔽 Downloading base64 data directly')
        // If it's base64, create a data URL directly
        const dataUrl = `data:image/png;base64,${image.imageData}`
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `generated-image-${image.id}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log('✅ Image downloaded successfully via base64')
      }

      // Track successful download
      analytics.trackToolUsage('image_generator', 'download_success', {
        image_id: image.id,
        source_type: image.isUrl ? 'url' : 'base64'
      })
    } catch (error) {
      console.error('❌ Error downloading image:', error)
      // Show user-friendly error message
      setError('Failed to download image. Please try again.')
      setTimeout(() => setError(''), 3000)
    } finally {
      setDownloadingImageId(null)
    }
  }

  // const clearImages = (): void => {
  //   setGeneratedImages([])
  // }

  const usePromptSuggestion = (suggestion: string): void => {
    setPrompt(suggestion)
  }

  const handleEnhancePrompt = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to enhance')
      return
    }

    try {
      const enhancedPrompt = await enhancePrompt(prompt.trim())
      setPrompt(enhancedPrompt)
      setError(null)
    } catch (err) {
      console.error('Error enhancing prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt')
    }
  }

  return (
    <div
      className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23] pb-24"
      onClick={handleClickOutside}
    >
      <div className="p-6 max-w-full">

        {/* API Key Status */}
        {(!togetherApiKey || !isTogetherApiKeyValid) && (
          <div className="mb-8 max-w-4xl">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
                    Together AI API Key Required
                  </h3>
                  <p className="text-amber-700 dark:text-amber-400 mb-4">
                    You need to add and validate your Together AI API key to use the image generator.
                  </p>
                  <a
                    href="#settings"
                    className="text-amber-800 dark:text-amber-300 font-medium hover:underline"
                  >
                    Go to Settings →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="max-w-full mb-12">
            <div className="space-y-8">
              {/* Group images by generation batch (same timestamp and prompt) */}
              {Object.entries(
                generatedImages.reduce((groups: { [key: string]: ImageOrPlaceholder[] }, image) => {
                  const key = `${image.timestamp}-${image.prompt}`
                  if (!groups[key]) groups[key] = []
                  groups[key].push(image)
                  return groups
                }, {})
              )
                .sort(([a], [b]) => parseInt(b.split('-')[0]) - parseInt(a.split('-')[0])) // Sort by timestamp desc
                .map(([key, images]) => {
                  // Get original dimensions from aspect ratio
                  const selectedRatio = aspectRatioOptions.find(ratio => ratio.value === aspectRatio)
                  const originalWidth = selectedRatio?.width || 1024
                  const originalHeight = selectedRatio?.height || 1024

                  return (
                    <div key={key} className="space-y-4">
                      {/* Generation Info */}
                      <div className="space-y-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {images[0].prompt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>{new Date(images[0].timestamp).toLocaleString()}</span>
                          <span>{originalWidth} × {originalHeight}px • {images.length} image{images.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Images Row - Show all images from same generation in one horizontal line */}
                      <div className="flex gap-2 overflow-x-auto">
                        {images.map((item) => {
                          // Check if this is a loading placeholder
                          if ('isLoading' in item && item.isLoading) {
                            // Calculate skeleton dimensions based on aspect ratio
                            const getSkeletonDimensions = (ratio: string) => {
                              switch (ratio) {
                                case '1:1':
                                  return { width: 160, height: 160 }
                                case '16:9':
                                  return { width: 240, height: Math.round(240 * 9 / 16) } // Increased from 160 to 240
                                case '9:16':
                                  return { width: 160, height: Math.round(160 * 16 / 9) }
                                case '4:3':
                                  return { width: 176, height: Math.round(176 * 3 / 4) } // Reduced from 200 to 176 to match w-44
                                case '3:4':
                                  return { width: 160, height: Math.round(160 * 4 / 3) }
                                default:
                                  return { width: 160, height: 160 }
                              }
                            }

                            const { width, height } = getSkeletonDimensions(item.aspectRatio)

                            return (
                              <div key={item.id} className="relative bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl overflow-hidden w-40 flex-shrink-0">
                                {/* Skeleton Loading Animation */}
                                <div
                                  className="animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-[shimmer_2s_infinite]"
                                  style={{ width: `${width}px`, height: `${height}px` }}
                                >

                                </div>
                              </div>
                            )
                          }

                          // This is a real image
                          const image = item as GeneratedImage
                          // Calculate image dimensions based on aspect ratio
                          const getImageDimensions = (ratio: string) => {
                            switch (ratio) {
                              case '1:1':
                                return 'w-40' // 160px
                              case '16:9':
                                return 'w-60' // 240px - increased size
                              case '9:16':
                                return 'w-40' // 160px
                              case '4:3':
                                return 'w-44' // 176px - reduced from w-50 (200px)
                              case '3:4':
                                return 'w-40' // 160px
                              default:
                                return 'w-40' // 160px
                            }
                          }

                          return (
                            <div key={image.id} className={`relative bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl overflow-hidden cursor-pointer ${getImageDimensions(aspectRatio)} flex-shrink-0`}>
                              <img
                                src={image.isUrl ? image.imageData : `data:image/png;base64,${image.imageData}`}
                                alt={image.prompt}
                                className="w-full h-auto hover:opacity-90 transition-opacity"
                                loading="lazy"
                                onClick={() => setPreviewImage(image)}
                                onError={(e) => {
                                  console.error('❌ Image failed to load:', image.id)
                                  console.error('❌ Image source type:', image.isUrl ? 'URL' : 'Base64')
                                  console.error('❌ Image data length:', image.imageData.length)
                                  console.error('❌ Image data first 100 chars:', image.imageData.substring(0, 100))
                                  e.currentTarget.style.display = 'none'
                                  const parent = e.currentTarget.parentElement
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="w-full h-64 flex items-center justify-center text-red-500 dark:text-red-400 text-sm">
                                        <div class="text-center">
                                          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                          </svg>
                                          <p>Image failed to load</p>
                                          <p class="text-xs opacity-75">Check console for details</p>
                                        </div>
                                      </div>
                                    `
                                  }
                                }}
                              />

                              {/* Download button overlay */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadImage(image)
                                }}
                                disabled={downloadingImageId === image.id}
                                className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-black/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-black rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                title={downloadingImageId === image.id ? "Downloading..." : "Download image"}
                              >
                                {downloadingImageId === image.id ? (
                                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="currentColor" fill="none">
                                    <path d="M3 16L7.46967 11.5303C7.80923 11.1908 8.26978 11 8.75 11C9.23022 11 9.69077 11.1908 10.0303 11.5303L14 15.5M15.5 17L14 15.5M21 16L18.5303 13.5303C18.1908 13.1908 17.7302 13 17.25 13C16.7698 13 16.3092 13.1908 15.9697 13.5303L14 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                    <path d="M21.5 12C21.5 16.2297 21.5 18.3446 20.302 19.7472C20.1319 19.9464 19.9464 20.1319 19.7472 20.302C18.3446 21.5 16.2297 21.5 12 21.5C7.77027 21.5 5.6554 21.5 4.25276 20.302C4.05358 20.1319 3.86808 19.9464 3.69797 19.7472C2.5 18.3446 2.5 16.2297 2.5 12C2.5 7.77027 2.5 5.6554 3.69797 4.25276C3.86808 4.05358 4.05358 3.86808 4.25276 3.69797C5.6554 2.5 7.77027 2.5 12 2.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                    <path d="M21.5 6.5C20.9102 7.10684 19.3403 9.5 18.5 9.5C17.6597 9.5 16.0898 7.10684 15.5 6.5M18.5 9V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                  </svg>
                                )}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Prompt Suggestions */}
        {generatedImages.length === 0 && (
          <div className="max-w-full mb-12">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-6">
              Popular Prompts to Get Started
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promptSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => usePromptSuggestion(suggestion)}
                  className="p-4 text-left bg-[#f6f6f8] dark:bg-[#2a2d3a] hover:bg-gray-100 dark:hover:bg-[#383b4a] rounded-xl transition-colors border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  disabled={isGenerating || !togetherApiKey || !isTogetherApiKeyValid}
                >
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {suggestion}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Simple Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* Close button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
              title="Close preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Just the image */}
            <img
              src={previewImage.isUrl ? previewImage.imageData : `data:image/png;base64,${previewImage.imageData}`}
              alt={previewImage.prompt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Fixed Bottom Input Section */}
      <div className="fixed bottom-0 left-20 right-0 bg-white dark:bg-[#1a1b23] border-t border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 items-start">
            <div className="flex-1 relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Describe the image you'd like to create..."
                className={`w-full px-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#2a2d3a] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 resize-none transition-all duration-200 ${
                  isInputFocused || prompt.length > 50 ? 'h-20' : 'h-10'
                } leading-tight`}
                style={{
                  minHeight: '40px',
                  maxHeight: '120px'
                }}
                disabled={isGenerating || isEnhancing || !togetherApiKey || !isTogetherApiKeyValid}
                rows={1}
              />
              {/* AI Enhancement Icon */}
              <button
                onClick={handleEnhancePrompt}
                disabled={!prompt.trim() || isEnhancing || isGenerating}
                className={`absolute right-2 p-1 text-gray-400 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400 dark:disabled:hover:text-gray-500 ${
                  isInputFocused || prompt.length > 50 ? 'top-2' : 'top-1/2 transform -translate-y-1/2'
                }`}
                title="Enhance prompt with AI"
              >
                {isEnhancing ? (
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="currentColor" fill="none">
                    <path d="M9.60059 6.11211C9.92247 5.29596 11.0775 5.29596 11.3994 6.11211L12.3103 8.4216C12.8999 9.91665 14.0833 11.1001 15.5784 11.6897L17.8879 12.6006C18.704 12.9225 18.704 14.0775 17.8879 14.3994L15.5784 15.3103C14.0833 15.8999 12.8999 17.0833 12.3103 18.5784L11.3994 20.8879C11.0775 21.704 9.92247 21.704 9.60059 20.8879L8.68974 18.5784C8.1001 17.0833 6.91665 15.8999 5.4216 15.3103L3.11211 14.3994C2.29596 14.0775 2.29596 12.9225 3.11211 12.6006L5.4216 11.6897C6.91665 11.1001 8.1001 9.91665 8.68974 8.4216L9.60059 6.11211Z" stroke="currentColor" strokeWidth="1.5"></path>
                    <path d="M18.1627 2.72954C18.2834 2.42349 18.7166 2.42349 18.8373 2.72954L19.1788 3.5956C19.4 4.15624 19.8438 4.60004 20.4044 4.82115L21.2705 5.16272C21.5765 5.28343 21.5765 5.71657 21.2705 5.83728L20.4044 6.17885C19.8438 6.39996 19.4 6.84376 19.1788 7.4044L18.8373 8.27046C18.7166 8.57651 18.2834 8.57651 18.1627 8.27046L17.8212 7.4044C17.6 6.84376 17.1562 6.39996 16.5956 6.17885L15.7295 5.83728C15.4235 5.71657 15.4235 5.28343 15.7295 5.16272L16.5956 4.82115C17.1562 4.60004 17.6 4.15624 17.8212 3.5956L18.1627 2.72954Z" stroke="currentColor" strokeWidth="1.5"></path>
                  </svg>
                )}
              </button>
            </div>

            {/* Settings Button */}
            <div className="relative">
              <button
                id="settings-button"
                onClick={() => setShowSettings(!showSettings)}
                disabled={isGenerating}
                className="h-10 w-10 bg-gray-100 hover:bg-gray-200 dark:bg-[#383b4a] dark:hover:bg-[#4a4d5a] text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                title="Generation Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="currentColor" fill="none">
                  <path d="M21 17.5C21 19.433 19.433 21 17.5 21C15.567 21 14 19.433 14 17.5C14 15.567 15.567 14 17.5 14C19.433 14 21 15.567 21 17.5Z" stroke="currentColor" strokeWidth="1.5"></path>
                  <path d="M17.5 14H6.5C4.567 14 3 15.567 3 17.5C3 19.433 4.567 21 6.5 21H17.5C19.433 21 21 19.433 21 17.5C21 15.567 19.433 14 17.5 14Z" stroke="currentColor" strokeWidth="1.5"></path>
                  <path d="M3 6.5C3 8.433 4.567 10 6.5 10C8.433 10 10 8.433 10 6.5C10 4.567 8.433 3 6.5 3C4.567 3 3 4.567 3 6.5Z" stroke="currentColor" strokeWidth="1.5"></path>
                  <path d="M6.5 3H17.5C19.433 3 21 4.567 21 6.5C21 8.433 19.433 10 17.5 10H6.5C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3Z" stroke="currentColor" strokeWidth="1.5"></path>
                </svg>
              </button>

              {/* Settings Panel */}
              {showSettings && (
                <div
                  id="settings-panel"
                  className="absolute bottom-12 right-0 bg-white dark:bg-[#1a1b23] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-6 w-96 z-50"
                >
                  <div className="space-y-6">
                    {/* Art Style Selection */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                        Choose Art Style
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {styleOptions.slice(0, 6).map((style) => {
                          const getStyleImage = (styleName: string) => {
                            switch (styleName) {
                              case 'General':
                                return 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                              case 'Realistic':
                                return 'https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                              case 'Anime':
                                return 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                              case 'Design':
                                return 'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                              case 'Render 3D':
                                return 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                              case 'Artistic':
                                return 'https://images.pexels.com/photos/1183992/pexels-photo-1183992.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                              default:
                                return 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop'
                            }
                          }

                          return (
                            <button
                              key={style.name}
                              onClick={() => setSelectedStyle(style.name)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                selectedStyle === style.name
                                  ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                              disabled={isGenerating}
                            >
                              {/* Background Image */}
                              <img
                                src={getStyleImage(style.name)}
                                alt={style.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                              />
                              {/* Dark Overlay */}
                              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                              {/* Text Label */}
                              <div className="relative w-full h-full flex items-center justify-center text-xs font-medium text-white z-10">
                                {style.name}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Aspect Ratio Selection */}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                        Aspect Ratio
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {aspectRatioOptions.map((ratio) => (
                              <button
                                key={ratio.value}
                                onClick={() => setAspectRatio(ratio.value)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  aspectRatio === ratio.value
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                                disabled={isGenerating}
                              >
                                {ratio.value}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="w-12 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                          <div
                            className={`border-2 border-gray-400 dark:border-gray-500 ${
                              aspectRatio === '1:1' ? 'w-6 h-6' :
                              aspectRatio === '16:9' ? 'w-8 h-4' :
                              aspectRatio === '9:16' ? 'w-4 h-8' :
                              aspectRatio === '4:3' ? 'w-7 h-5' :
                              aspectRatio === '3:4' ? 'w-5 h-7' :
                              'w-6 h-6'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Number of Images */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          Number of images: {numImages}
                        </h3>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {[1, 2, 3, 4].map((num) => (
                          <button
                            key={num}
                            onClick={() => setNumImages(num)}
                            className={`w-12 h-8 rounded-lg text-sm font-medium transition-all ${
                              numImages === num
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            disabled={isGenerating}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || isEnhancing || !togetherApiKey || !isTogetherApiKeyValid}
              className="h-10 px-6 bg-[#f5f5f5] hover:bg-gray-200 dark:bg-[#2a2d3a] dark:hover:bg-[#383b4a] text-gray-800 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              {isGenerating ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="currentColor" fill="none">
                    <circle cx="7" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></circle>
                    <path d="M20.9977 11C21 11.4701 21 11.9693 21 12.5C21 16.9783 21 19.2175 19.6088 20.6088C18.2175 22 15.9783 22 11.5 22C7.02166 22 4.78249 22 3.39124 20.6088C2 19.2175 2 16.9783 2 12.5C2 8.02166 2 5.78249 3.39124 4.39124C4.78249 3 7.02166 3 11.5 3C12.0307 3 12.5299 3 13 3.00231" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                    <path d="M18.5 2L18.7579 2.69703C19.0961 3.61102 19.2652 4.06802 19.5986 4.40139C19.932 4.73477 20.389 4.90387 21.303 5.24208L22 5.5L21.303 5.75792C20.389 6.09613 19.932 6.26524 19.5986 6.59861C19.2652 6.93198 19.0961 7.38898 18.7579 8.30297L18.5 9L18.2421 8.30297C17.9039 7.38898 17.7348 6.93198 17.4014 6.59861C17.068 6.26524 16.611 6.09613 15.697 5.75792L15 5.5L15.697 5.24208C16.611 4.90387 17.068 4.73477 17.4014 4.40139C17.7348 4.06802 17.9039 3.61102 18.2421 2.69703L18.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"></path>
                    <path d="M4.5 21.5C8.87246 16.275 13.7741 9.38406 20.9975 14.0424" stroke="currentColor" strokeWidth="1.5"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" color="currentColor" fill="none">
                    <circle cx="7" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></circle>
                    <path d="M20.9977 11C21 11.4701 21 11.9693 21 12.5C21 16.9783 21 19.2175 19.6088 20.6088C18.2175 22 15.9783 22 11.5 22C7.02166 22 4.78249 22 3.39124 20.6088C2 19.2175 2 16.9783 2 12.5C2 8.02166 2 5.78249 3.39124 4.39124C4.78249 3 7.02166 3 11.5 3C12.0307 3 12.5299 3 13 3.00231" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"></path>
                    <path d="M18.5 2L18.7579 2.69703C19.0961 3.61102 19.2652 4.06802 19.5986 4.40139C19.932 4.73477 20.389 4.90387 21.303 5.24208L22 5.5L21.303 5.75792C20.389 6.09613 19.932 6.26524 19.5986 6.59861C19.2652 6.93198 19.0961 7.38898 18.7579 8.30297L18.5 9L18.2421 8.30297C17.9039 7.38898 17.7348 6.93198 17.4014 6.59861C17.068 6.26524 16.611 6.09613 15.697 5.75792L15 5.5L15.697 5.24208C16.611 4.90387 17.068 4.73477 17.4014 4.40139C17.7348 4.06802 17.9039 3.61102 18.2421 2.69703L18.5 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"></path>
                    <path d="M4.5 21.5C8.87246 16.275 13.7741 9.38406 20.9975 14.0424" stroke="currentColor" strokeWidth="1.5"></path>
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageGenerator
