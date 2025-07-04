import { useState } from 'react'
import ImageUploader from '../components/ImageUploader'
import MetadataDisplay from '../components/MetadataDisplay'
import { useGemini } from '../context/GeminiContext'

const Generator = (): React.JSX.Element => {
  const { generateMetadata, isApiKeyValid, isLoading } = useGemini()
  const [file, setFile] = useState<File | null>(null)
  const [metadata, setMetadata] = useState<{ title: string; tags: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const handleImageUpload = (uploadedFile: File): void => {
    setFile(uploadedFile)
    setMetadata(null)
    setError(null)
  }

  const handleGenerate = async (): Promise<void> => {
    if (!file) {
      setError('Please upload an image first')
      return
    }

    if (!isApiKeyValid) {
      setError('Please add a valid Gemini API key in Settings')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Convert file to data URL for processing
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const imageUrl = e.target?.result as string
          const result = await generateMetadata(imageUrl)
          setMetadata(result)
        } catch (err) {
          setError(`Error generating metadata: ${err instanceof Error ? err.message : String(err)}`)
        } finally {
          setIsGenerating(false)
        }
      }
      reader.onerror = () => {
        setError('Error reading file')
        setIsGenerating(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError(`Error processing image: ${err instanceof Error ? err.message : String(err)}`)
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // You could add a toast notification here
        console.log('Copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
      })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Image Metadata Generator</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Upload an image and generate metadata using Gemini AI
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Upload Image</h2>
        <ImageUploader onImageUpload={handleImageUpload} isLoading={isGenerating} />

        {file && !isGenerating && !metadata && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!isApiKeyValid || isLoading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Metadata
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        {!isApiKeyValid && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Please add your Gemini API key in the Settings page
          </div>
        )}
      </div>

      {metadata && (
        <MetadataDisplay
          title={metadata.title}
          tags={metadata.tags}
          onCopyTitle={() => copyToClipboard(metadata.title)}
          onCopyTags={() => copyToClipboard(metadata.tags.join(', '))}
        />
      )}
    </div>
  )
}

export default Generator
