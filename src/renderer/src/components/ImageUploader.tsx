import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import uploadIcon from '../assets/icons/image-upload-stroke-rounded.svg'

interface ImageUploaderProps {
  onFilesAccepted: (files: File[]) => void
  isProcessing: boolean
  onExport: () => void
  onClear: () => void
}

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const ImageUploader = ({ onFilesAccepted, isProcessing, onExport, onClear }: ImageUploaderProps): React.JSX.Element => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file =>
      file.size <= MAX_FILE_SIZE && ALLOWED_TYPES.includes(file.type)
    )

    if (validFiles.length > 0) {
      onFilesAccepted(validFiles)
    }
  }, [onFilesAccepted])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    disabled: isProcessing
  })

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 transition-all duration-200 ease-in-out
          ${isDragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          <img
            src={uploadIcon}
            alt="Upload"
            className="w-12 h-12 mb-4"
            draggable="false"
          />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragActive ? 'Drop images here' : 'Drop images here or click to upload'}
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: JPEG, PNG, GIF, WebP (max 4MB)
          </p>
        </div>
      </div>
      <div className="flex gap-4 justify-end">
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          type="button"
        >
          Clear All
        </button>
        <button
          onClick={onExport}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
          type="button"
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}

export default ImageUploader
