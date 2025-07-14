import React, { useState, useCallback } from 'react'
import { useGemini } from '../../context/useGemini'
import { PromptGenerationRequest, PromptGenerationResult } from '../../context/GeminiContext.types'
import uploadIcon from '../../assets/icons/image-upload-stroke-rounded.svg'
import addSquareIcon from '../../assets/icons/add-square-stroke-rounded.svg'

const PromptGenerator: React.FC = () => {
  const { generatePrompts, isLoading, error } = useGemini()

  const [input, setInput] = useState('')
  const [inputType, setInputType] = useState<'text' | 'image'>('text')
  const [platform, setPlatform] = useState('midjourney')
  const [style, setStyle] = useState('photorealistic')
  const [promptType, setPromptType] = useState<'image' | 'video'>('image')
  const [count, setCount] = useState(3)
  const [imageData, setImageData] = useState<string>('')
  const [imagePreview, setImagePreview] = useState<string>('')
  const [results, setResults] = useState<PromptGenerationResult | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const platforms = [
    { value: 'midjourney', label: 'Midjourney', description: 'Discord-based AI art generator' },
    { value: 'recraft', label: 'Recraft AI', description: 'Professional design AI tool' },
    { value: 'ideogram', label: 'Ideogram', description: 'Text and logo generation AI' },
    { value: 'dalle', label: 'DALL-E', description: 'OpenAI image generator' },
    { value: 'leonardo', label: 'Leonardo AI', description: 'Gaming and character AI art' },
    { value: 'stable-diffusion', label: 'Stable Diffusion', description: 'Open-source AI model' }
  ]

  const styles = [
    { value: 'photorealistic', label: 'Photorealistic', description: 'Realistic photography style' },
    { value: 'artistic', label: 'Artistic', description: 'Creative and expressive' },
    { value: 'minimalist', label: 'Minimalist', description: 'Clean and simple' },
    { value: 'vintage', label: 'Vintage', description: 'Retro and nostalgic' },
    { value: 'futuristic', label: 'Futuristic', description: 'Sci-fi and modern' },
    { value: 'fantasy', label: 'Fantasy', description: 'Magical and mythical' },
    { value: 'abstract', label: 'Abstract', description: 'Non-representational art' },
    { value: 'cartoon', label: 'Cartoon', description: 'Animated and stylized' },
    { value: 'cinematic', label: 'Cinematic', description: 'Movie-like quality' },
    { value: 'watercolor', label: 'Watercolor', description: 'Painted artwork style' }
  ]

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = e.target?.result as string
      setImageData(base64Data)
      setImagePreview(base64Data)
      setInputType('image')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleImageUpload(files[0])
    }
  }, [handleImageUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleImageUpload(files[0])
    }
  }, [handleImageUpload])

  const handleGenerate = async () => {
    if (!input.trim() && inputType === 'text') {
      alert('Please enter some text or upload an image')
      return
    }

    if (inputType === 'image' && !imageData) {
      alert('Please upload an image')
      return
    }

    const request: PromptGenerationRequest = {
      input,
      inputType,
      platform,
      style,
      promptType,
      count,
      imageData: inputType === 'image' ? imageData : undefined
    }

    const result = await generatePrompts(request)
    setResults(result)
  }

  const copyToClipboard = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    // You could add a toast notification here
  }

  const copyAllPrompts = () => {
    if (results?.prompts) {
      const allPrompts = results.prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join('\n\n')
      navigator.clipboard.writeText(allPrompts)
    }
  }

  return (
    <div
      className="absolute top-0 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]"
      style={{ padding: '2rem 0' }}
    >
      <div className="px-8">
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
          AI Prompt Generator
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Generate platform-specific prompts for AI image and video generation tools using text or image input.
        </p>

        {/* Input Type Selection */}
        <div className="max-w-4xl mb-8">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Input Type</h3>
          <div className="flex gap-3 max-w-2xl">
            <button
              onClick={() => setInputType('text')}
              className={`px-6 py-3 rounded-xl transition-all duration-200 text-left ${
                inputType === 'text'
                  ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-sm font-medium">Text to Prompt</div>
              <div className="text-sm opacity-75 mt-1">Generate prompts from text input</div>
            </button>

            <button
              onClick={() => setInputType('image')}
              className={`px-6 py-3 rounded-xl transition-all duration-200 text-left ${
                inputType === 'image'
                  ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-sm font-medium">Image to Prompt</div>
              <div className="text-sm opacity-75 mt-1">Generate prompts from image input</div>
            </button>
          </div>
        </div>

        {/* Text Input */}
        {inputType === 'text' && (
          <div className="max-w-4xl mb-8">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Text Input</h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your concept, idea, or keywords here..."
              className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Image Input */}
        {inputType === 'image' && (
          <div className="max-w-4xl mb-8">
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Image Input</h3>

            {!imagePreview ? (
              <div
                className={`
                  rounded-2xl p-8 transition-all duration-200 ease-in-out bg-[#f9fafb] text-center cursor-pointer
                  ${isDragOver ? 'bg-violet-50' : 'hover:bg-gray-100'}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={isHovering ? addSquareIcon : uploadIcon}
                    alt="Upload"
                    className="w-16 h-16 mb-4 transition-all duration-200"
                    draggable="false"
                  />
                  <div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      {isDragOver ? 'Drop the image here' : 'Drop an image here or click to browse'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports JPG, PNG, GIF, WebP
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-64 object-contain rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    onClick={() => {
                      setImagePreview('')
                      setImageData('')
                    }}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Optional: Add additional context or specific requirements..."
                  className="w-full h-24 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        )}

        {/* Platform Selection */}
        <div className="max-w-4xl mb-8">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Target Platform</h3>
          <div className="flex flex-wrap gap-3">
            {platforms.map((p) => (
              <label
                key={p.value}
                className={`px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                  platform === p.value
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  value={p.value}
                  checked={platform === p.value}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="sr-only"
                />
                <span className="font-medium">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="max-w-4xl mb-8">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Style Preference</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {styles.map((s) => (
              <label
                key={s.value}
                className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${
                  style === s.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  value={s.value}
                  checked={style === s.value}
                  onChange={(e) => setStyle(e.target.value)}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900 dark:text-white text-sm">{s.label}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{s.description}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Content Type and Count */}
        <div className="max-w-4xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Content Type</h3>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="image"
                  checked={promptType === 'image'}
                  onChange={(e) => setPromptType(e.target.value as 'image' | 'video')}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Image Prompts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="video"
                  checked={promptType === 'video'}
                  onChange={(e) => setPromptType(e.target.value as 'image' | 'video')}
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">Video Prompts</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Number of Prompts</h3>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num} prompt{num !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="max-w-4xl mb-8">
          <button
            onClick={handleGenerate}
            disabled={isLoading || (!input.trim() && inputType === 'text') || (inputType === 'image' && !imageData)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            style={{ borderRadius: '0.5rem', backgroundColor: '#f5f5f5', color: '#333' }}
          >
            {isLoading ? 'Generating Prompts...' : 'Generate Prompts'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Generated Prompts for {platforms.find(p => p.value === results.platform)?.label}
              </h3>
              {results.success && results.prompts.length > 0 && (
                <button
                  onClick={copyAllPrompts}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                  style={{ borderRadius: '0.375rem', backgroundColor: '#f5f5f5', color: '#333' }}
                >
                  Copy All
                </button>
              )}
            </div>

            {results.success ? (
              <div className="space-y-4">
                {results.prompts.map((prompt, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Prompt {index + 1}
                          </span>
                        </div>
                        <p className="text-gray-900 dark:text-white leading-relaxed">{prompt}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(prompt)}
                        className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        style={{ borderRadius: '0.25rem', backgroundColor: '#f5f5f5', color: '#333' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-200">{results.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PromptGenerator
