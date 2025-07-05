import { useState, useCallback } from 'react'
import { useGemini } from '../context/useGemini'
import ImageUploader from '../components/ImageUploader'
import MetadataDisplay from '../components/MetadataDisplay'

interface MetadataResult {
  title: string
  keywords: string[]
  filename: string
}

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const Generator = (): React.JSX.Element => {
  const { generateMetadata } = useGemini()
  const [results, setResults] = useState<MetadataResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFiles = useCallback((files: File[]): File[] => {
    return files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`File type not supported: ${file.name}`)
        return false
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large (max 4MB): ${file.name}`)
        return false
      }
      return true
    })
  }, [])

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true)
    setError(null)
    const newResults: MetadataResult[] = []

    try {
      const validFiles = validateFiles(files)
      for (const file of validFiles) {
        const result = await generateMetadata(file)
        newResults.push({
          ...result,
          filename: file.name
        })
      }

      setResults(prev => [...prev, ...newResults])
    } catch (error) {
      console.error('Error processing files:', error)
      setError(error instanceof Error ? error.message : 'Failed to process files')
    } finally {
      setIsProcessing(false)
    }
  }, [generateMetadata, validateFiles])

  const exportToCsv = useCallback(() => {
    if (results.length === 0) return

    const csvContent = results.map(item => {
      const escapedTitle = `"${item.title.replace(/"/g, '""')}"`
      const escapedKeywords = `"${item.keywords.join(', ').replace(/"/g, '""')}"`
      return `${item.filename},${escapedTitle},${escapedKeywords}`
    }).join('\n')

    const header = 'Filename,Title,Keywords\n'
    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    link.href = URL.createObjectURL(blob)
    link.download = `image-metadata-${date}.csv`
    link.click()
  }, [results])

  const clearMetadata = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4">
      <ImageUploader
        onFilesAccepted={processFiles}
        isProcessing={isProcessing}
        onExport={exportToCsv}
        onClear={clearMetadata}
      />
      {error && <div className="text-red-500">{error}</div>}
      <MetadataDisplay results={results} />
    </div>
  )
}

export default Generator
