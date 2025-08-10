/**
 * Category Analysis Modal
 * 
 * Shows AI-powered category suggestions for selected platforms
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { categorySelectionService, ImageAnalysisResult } from '../services/CategorySelectionService'
import { 
  DREAMSTIME_CATEGORIES, 
  ADOBE_STOCK_CATEGORIES, 
  SHUTTERSTOCK_CATEGORIES 
} from '../utils/platformCategories'

interface CategoryAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  imageData: string
  filename: string
  selectedPlatforms: string[]
  existingMetadata?: {
    title?: string
    description?: string
    keywords?: string[]
  }
  onCategoriesSelected: (categories: {
    dreamstime?: number[]
    shutterstock?: number[]
    adobe?: number
  }) => void
}

const CategoryAnalysisModal: React.FC<CategoryAnalysisModalProps> = ({
  isOpen,
  onClose,
  imageData,
  filename,
  selectedPlatforms,
  existingMetadata,
  onCategoriesSelected
}) => {
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<{
    dreamstime?: number[]
    shutterstock?: number[]
    adobe?: number
  }>({})

  // Analyze image when modal opens
  useEffect(() => {
    if (isOpen && imageData && !analysisResult && !isAnalyzing) {
      analyzeImage()
    }
  }, [isOpen, imageData])

  const analyzeImage = async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // Set API key from the first available valid key
      // This would need to be integrated with your existing API key management
      const result = await categorySelectionService.analyzeImageForCategories(
        imageData,
        filename,
        existingMetadata
      )
      
      setAnalysisResult(result)
      
      // Set initial selections based on AI suggestions
      const initialCategories: any = {}
      result.suggestions.forEach(suggestion => {
        if (selectedPlatforms.includes(suggestion.platform)) {
          initialCategories[suggestion.platform] = suggestion.categories
        }
      })
      setSelectedCategories(initialCategories)

    } catch (err) {
      console.error('Category analysis failed:', err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCategoryToggle = (platform: string, categoryId: number) => {
    setSelectedCategories(prev => {
      const updated = { ...prev }
      
      if (platform === 'adobe') {
        // Adobe only allows one category
        updated.adobe = categoryId
      } else if (platform === 'dreamstime') {
        const current = updated.dreamstime || []
        if (current.includes(categoryId)) {
          updated.dreamstime = current.filter(id => id !== categoryId)
        } else if (current.length < 3) {
          updated.dreamstime = [...current, categoryId]
        }
      } else if (platform === 'shutterstock') {
        const current = updated.shutterstock || []
        if (current.includes(categoryId)) {
          updated.shutterstock = current.filter(id => id !== categoryId)
        } else if (current.length < 2) {
          updated.shutterstock = [...current, categoryId]
        }
      }
      
      return updated
    })
  }

  const handleConfirm = () => {
    onCategoriesSelected(selectedCategories)
    onClose()
  }

  const getCategoryName = (platform: string, categoryId: number): string => {
    let categories: any[]
    
    switch (platform) {
      case 'dreamstime':
        categories = DREAMSTIME_CATEGORIES
        break
      case 'shutterstock':
        categories = SHUTTERSTOCK_CATEGORIES
        break
      case 'adobe':
        categories = ADOBE_STOCK_CATEGORIES
        break
      default:
        return 'Unknown'
    }

    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              AI Category Analysis
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isAnalyzing && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">
                Analyzing image for category suggestions...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Image Analysis Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Primary Subjects:</span>
                    <p className="text-blue-700 dark:text-blue-300">{analysisResult.primarySubjects.join(', ')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Visual Style:</span>
                    <p className="text-blue-700 dark:text-blue-300">{analysisResult.style}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Mood:</span>
                    <p className="text-blue-700 dark:text-blue-300">{analysisResult.mood}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Elements:</span>
                    <p className="text-blue-700 dark:text-blue-300">{analysisResult.visualElements.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Platform Categories */}
              {analysisResult.suggestions.map(suggestion => {
                if (!selectedPlatforms.includes(suggestion.platform)) return null

                const platformCategories = selectedCategories[suggestion.platform as keyof typeof selectedCategories] || []
                const maxCategories = suggestion.platform === 'adobe' ? 1 : suggestion.platform === 'shutterstock' ? 2 : 3

                return (
                  <div key={suggestion.platform} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                        {suggestion.platform} Categories
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {Array.isArray(platformCategories) ? platformCategories.length : (platformCategories ? 1 : 0)}/{maxCategories}
                        </span>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          suggestion.confidence >= 80 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : suggestion.confidence >= 60
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {suggestion.confidence}% confidence
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {suggestion.reasoning}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {suggestion.categories.map(categoryId => (
                        <button
                          key={categoryId}
                          onClick={() => handleCategoryToggle(suggestion.platform, categoryId)}
                          className={`p-3 text-left text-sm rounded-lg border transition-all duration-200 ${
                            (Array.isArray(platformCategories) ? platformCategories.includes(categoryId) : platformCategories === categoryId)
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{getCategoryName(suggestion.platform, categoryId)}</span>
                            {(Array.isArray(platformCategories) ? platformCategories.includes(categoryId) : platformCategories === categoryId) && (
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {categoryId}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Apply Categories
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default CategoryAnalysisModal