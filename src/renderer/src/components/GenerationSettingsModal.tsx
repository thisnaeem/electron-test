import React, { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { updateGenerationSettings } from '../store/slices/settingsSlice'
import { motion, AnimatePresence } from 'framer-motion'
import freepikLogo from '../assets/platforms/freepik.png'
import shutterstockLogo from '../assets/platforms/shutterstock.png'
import adobeLogo from '../assets/platforms/adobe.png'
import rf123Logo from '../assets/platforms/123rf.png'
import alamyLogo from '../assets/platforms/alamy.png'
import canvaLogo from '../assets/platforms/canva.png'
import depositphotosLogo from '../assets/platforms/depositphotos.png'
import dreamstimeLogo from '../assets/platforms/dreamstime.png'
import generalLogo from '../assets/platforms/General.png'
import istockLogo from '../assets/platforms/istock.png'
import motionLogo from '../assets/platforms/motion.png'
import pond5Logo from '../assets/platforms/pond5.png'
import vecteezyLogo from '../assets/platforms/vecteezy.png'

interface GenerationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (settings: { titleWords: number; keywordsCount: number; descriptionWords: number; platforms: string[] }) => void
  buttonRef?: React.RefObject<HTMLButtonElement>
}

const GenerationSettingsModal: React.FC<GenerationSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const dispatch = useAppDispatch()
  const { generationSettings } = useAppSelector(state => state.settings)

  const [titleWords, setTitleWords] = useState(generationSettings.titleWords)
  const [keywordsCount, setKeywordsCount] = useState(generationSettings.keywordsCount)
  const [descriptionWords, setDescriptionWords] = useState(generationSettings.descriptionWords)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(generationSettings.platforms || ['freepik'])

  // Debug localStorage on component mount
  useEffect(() => {
    console.log('🔍 Debug localStorage on GenerationSettingsModal mount:')
    console.log('- generationTitleWords:', localStorage.getItem('generationTitleWords'))
    console.log('- generationKeywordsCount:', localStorage.getItem('generationKeywordsCount'))
    console.log('- generationDescriptionWords:', localStorage.getItem('generationDescriptionWords'))
    console.log('- Redux state generationSettings:', generationSettings)
  }, [])

  // Update local state when modal opens with saved settings
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal opened, loading saved settings:', generationSettings)
      setTitleWords(generationSettings.titleWords)
      setKeywordsCount(generationSettings.keywordsCount)
      setDescriptionWords(generationSettings.descriptionWords)
      setSelectedPlatforms(generationSettings.platforms || ['freepik'])
    }
  }, [isOpen, generationSettings])

  // Platform configuration
  const platforms = [
    {
      id: '123rf',
      name: '123RF',
      logo: rf123Logo,
      color: '#FF8C00'
    },
    {
      id: 'adobe-stock',
      name: 'Adobe ',
      logo: adobeLogo,
      color: '#FF0000'
    },
    {
      id: 'alamy',
      name: 'Alamy',
      logo: alamyLogo,
      color: '#8BC34A'
    },
    {
      id: 'canva',
      name: 'Canva',
      logo: canvaLogo,
      color: '#00C4CC'
    },
    {
      id: 'depositphotos',
      name: 'Depositphotos',
      logo: depositphotosLogo,
      color: '#FF6B35'
    },
    {
      id: 'dreamstime',
      name: 'Dreamstime',
      logo: dreamstimeLogo,
      color: '#4CAF50'
    },
    {
      id: 'freepik',
      name: 'Freepik',
      logo: freepikLogo,
      color: '#1273EB'
    },
    {
      id: 'general',
      name: 'General',
      logo: generalLogo,
      color: '#6C757D'
    },
    {
      id: 'istock',
      name: 'iStock',
      logo: istockLogo,
      color: '#000000'
    },
    {
      id: 'motion',
      name: 'Motion',
      logo: motionLogo,
      color: '#6C5CE7'
    },
    {
      id: 'pond5',
      name: 'Pond5',
      logo: pond5Logo,
      color: '#000000'
    },
    {
      id: 'shutterstock',
      name: 'Shutterstock',
      logo: shutterstockLogo,
      color: '#EE2A24'
    },
    {
      id: 'vecteezy',
      name: 'Vecteezy',
      logo: vecteezyLogo,
      color: '#FF8C00'
    }
  ]

  const togglePlatform = (platformId: string): void => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        // Don't allow removing the last platform
        if (prev.length === 1) return prev
        return prev.filter(id => id !== platformId)
      } else {
        return [...prev, platformId]
      }
    })
  }

  if (!isOpen) {
    return null
  }

    const handleConfirm = (): void => {
    console.log('🎯 Confirming generation settings:', { titleWords, keywordsCount, descriptionWords, platforms: selectedPlatforms })

    // Save settings to Redux store and localStorage
    dispatch(updateGenerationSettings({ titleWords, keywordsCount, descriptionWords, platforms: selectedPlatforms }))

    // Pass settings to parent component
    onConfirm({ titleWords, keywordsCount, descriptionWords, platforms: selectedPlatforms })
    onClose()
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <style>
            {`
              .slider::-webkit-slider-thumb {
                appearance: none;
                height: 20px;
                width: 20px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }

              .slider::-moz-range-thumb {
                height: 20px;
                width: 20px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                border: 2px solid #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
            `}
          </style>

                    {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              className="flex max-w-4xl w-full mx-4 shadow-2xl pointer-events-auto"
              initial={{
                scale: 0.3,
                y: 50,
                opacity: 0,
                transformOrigin: "center bottom"
              }}
              animate={{
                scale: 1,
                y: 0,
                opacity: 1,
                transformOrigin: "center bottom"
              }}
              exit={{
                scale: 0.3,
                y: 50,
                opacity: 0,
                transformOrigin: "center bottom"
              }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.5
              }}
            >
          {/* Left Container - Platforms (1/3 width) */}
          <div className="w-1/3 bg-gray-200 dark:bg-gray-700 rounded-l-3xl p-4">
            <div>

              <motion.div
                className="grid grid-cols-3 gap-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      delayChildren: 0.2,
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {platforms.map((platform) => (
                  <motion.button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`
                      relative p-2 rounded-lg transition-all duration-200 text-center
                      ${selectedPlatforms.includes(platform.id)
                        ? 'opacity-100 scale-100 bg-blue-50 dark:bg-blue-900/20'
                        : 'opacity-60 hover:opacity-80 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                    variants={{
                      hidden: { opacity: 0, scale: 0.8, y: 20 },
                      visible: {
                        opacity: selectedPlatforms.includes(platform.id) ? 1 : 0.6,
                        scale: 1,
                        y: 0
                      }
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img
                          src={platform.logo}
                          alt={platform.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                        {platform.name}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Right Container - Main Settings (2/3 width) */}
          <div className="w-2/3 bg-white dark:bg-gray-800 rounded-r-3xl p-6 border border-gray-200 dark:border-gray-700">
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Generation Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Customize how many words and keywords to generate for your images
              </p>
            </motion.div>

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                  Other generation settings
                </h3>
                <div className="space-y-4">
                  {/* Title Words Setting */}
                                      <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          Title Length
                        </label>
                        <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                          {titleWords} words
                        </div>
                      </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="5"
                        max="20"
                        value={titleWords}
                        onChange={(e) => setTitleWords(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((titleWords - 5) / (20 - 5)) * 100}%, #e5e7eb ${((titleWords - 5) / (20 - 5)) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Setting */}
                  <div>
                                          <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          Keywords Count
                        </label>
                        <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                          {keywordsCount} keywords
                        </div>
                      </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="10"
                        max="50"
                        value={keywordsCount}
                        onChange={(e) => setKeywordsCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((keywordsCount - 10) / (50 - 10)) * 100}%, #e5e7eb ${((keywordsCount - 10) / (50 - 10)) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>10</span>
                        <span>20</span>
                        <span>30</span>
                        <span>40</span>
                        <span>50</span>
                      </div>
                    </div>
                  </div>

                  {/* Description Words Setting */}
                  <div>
                                          <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          Description Length
                        </label>
                        <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                          {descriptionWords} words
                        </div>
                      </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="5"
                        max="20"
                        value={descriptionWords}
                        onChange={(e) => setDescriptionWords(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((descriptionWords - 5) / (20 - 5)) * 100}%, #e5e7eb ${((descriptionWords - 5) / (20 - 5)) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>5</span>
                        <span>10</span>
                        <span>15</span>
                        <span>20</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="flex items-center justify-end gap-3 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-600/30"
              >
                Start Generation
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
      )}
    </AnimatePresence>
  )
}

export default GenerationSettingsModal
