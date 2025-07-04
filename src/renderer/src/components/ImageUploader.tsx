import { useState, useRef, ChangeEvent, DragEvent } from 'react'

interface ImageUploaderProps {
  onImageUpload: (file: File) => void
  isLoading?: boolean
}

const ImageUploader = ({ onImageUpload, isLoading = false }: ImageUploaderProps): React.JSX.Element => {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      processFile(file)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      processFile(file)
    }
  }

  const processFile = (file: File): void => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Pass the file to parent component
    onImageUpload(file)
  }

  const triggerFileInput = (): void => {
    fileInputRef.current?.click()
  }

  const clearImage = (): void => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {!previewUrl ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
          onClick={triggerFileInput}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              Drag and drop an image here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              Supported formats: JPG, PNG, GIF, WEBP
            </p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-64 object-contain bg-gray-100 dark:bg-gray-800"
          />
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
          )}
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageUploader
