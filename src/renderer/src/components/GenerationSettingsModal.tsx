import React, { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { updateGenerationSettings } from '../store/slices/settingsSlice'
import { motion, AnimatePresence } from 'framer-motion'
import Slider from './Slider'
import { AI_MODELS } from '../utils/platformCategories'
// import CategorySelector from './CategorySelector'
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
  onConfirm: (settings: {
    titleWords: number
    titleMinWords: number
    titleMaxWords: number
    keywordsCount: number
    keywordsMinCount: number
    keywordsMaxCount: number
    descriptionWords: number
    descriptionMinWords: number
    descriptionMaxWords: number
    platforms: string[]
    keywordSettings: {
      singleWord: boolean
      doubleWord: boolean
      mixed: boolean
    }
    customization: {
      customPrompt: boolean
      customPromptText: string
      prohibitedWords: boolean
      prohibitedWordsList: string
      transparentBackground: boolean
      silhouette: boolean
    }
    titleCustomization: {
      titleStyle: string
      customPrefix: boolean
      prefixText: string
      customPostfix: boolean
      postfixText: string
    }
  }) => void
  buttonRef?: React.RefObject<HTMLButtonElement>
}

type NavigationTab = 'settings' | 'keywords' | 'platforms' | 'customization' | 'titleStyles'

const GenerationSettingsModal: React.FC<GenerationSettingsModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const dispatch = useAppDispatch()
  const { generationSettings } = useAppSelector(state => state.settings)

  const [activeTab, setActiveTab] = useState<NavigationTab>('settings')
  const [titleWords, setTitleWords] = useState(generationSettings.titleWords)
  const [titleMinWords, setTitleMinWords] = useState(generationSettings.titleMinWords)
  const [titleMaxWords, setTitleMaxWords] = useState(generationSettings.titleMaxWords)
  const [keywordsCount, setKeywordsCount] = useState(generationSettings.keywordsCount)
  const [keywordsMinCount, setKeywordsMinCount] = useState(generationSettings.keywordsMinCount)
  const [keywordsMaxCount, setKeywordsMaxCount] = useState(generationSettings.keywordsMaxCount)
  const [descriptionWords, setDescriptionWords] = useState(generationSettings.descriptionWords)
  const [descriptionMinWords, setDescriptionMinWords] = useState(generationSettings.descriptionMinWords)
  const [descriptionMaxWords, setDescriptionMaxWords] = useState(generationSettings.descriptionMaxWords)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(generationSettings.platforms || ['freepik'])

  // Keyword settings state - only one should be true by default
  const [keywordSettings, setKeywordSettings] = useState(() => {
    const saved = generationSettings.keywordSettings
    // If saved settings exist, use them but ensure only one is true
    if (saved) {
      if (saved.singleWord) return { singleWord: true, doubleWord: false, mixed: false }
      if (saved.doubleWord) return { singleWord: false, doubleWord: true, mixed: false }
      if (saved.mixed) return { singleWord: false, doubleWord: false, mixed: true }
    }
    // Default to single word keywords
    return { singleWord: true, doubleWord: false, mixed: false }
  })

  // Customization settings state
  const [customization, setCustomization] = useState({
    customPrompt: generationSettings.customization?.customPrompt ?? false,
    customPromptText: generationSettings.customization?.customPromptText ?? '',
    prohibitedWords: generationSettings.customization?.prohibitedWords ?? false,
    prohibitedWordsList: generationSettings.customization?.prohibitedWordsList ?? '',
    transparentBackground: generationSettings.customization?.transparentBackground ?? false,
    silhouette: generationSettings.customization?.silhouette ?? false
  })

  // Title customization settings state
  const [titleCustomization, setTitleCustomization] = useState({
    titleStyle: generationSettings.titleCustomization?.titleStyle ?? 'seo-optimized',
    customPrefix: generationSettings.titleCustomization?.customPrefix ?? false,
    prefixText: generationSettings.titleCustomization?.prefixText ?? '',
    customPostfix: generationSettings.titleCustomization?.customPostfix ?? false,
    postfixText: generationSettings.titleCustomization?.postfixText ?? ''
  })

  // Platform-specific options state
  const [platformOptions, setPlatformOptions] = useState({
    freepik: {
      isAiGenerated: generationSettings.platformOptions?.freepik?.isAiGenerated ?? false,
      aiModel: generationSettings.platformOptions?.freepik?.aiModel ?? 'Midjourney 6'
    },
    "123rf": {
      country: generationSettings.platformOptions?.["123rf"]?.country ?? 'US'
    },
    canva: {
      artistName: generationSettings.platformOptions?.canva?.artistName ?? 'Your Artist Name'
    },
    dreamstime: {
      isAiGenerated: generationSettings.platformOptions?.dreamstime?.isAiGenerated ?? false,
      isFree: generationSettings.platformOptions?.dreamstime?.isFree ?? false,
      isEditorial: generationSettings.platformOptions?.dreamstime?.isEditorial ?? false
    }
  })



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
      setTitleMinWords(generationSettings.titleMinWords)
      setTitleMaxWords(generationSettings.titleMaxWords)
      setKeywordsCount(generationSettings.keywordsCount)
      setKeywordsMinCount(generationSettings.keywordsMinCount)
      setKeywordsMaxCount(generationSettings.keywordsMaxCount)
      setDescriptionWords(generationSettings.descriptionWords)
      setDescriptionMinWords(generationSettings.descriptionMinWords)
      setDescriptionMaxWords(generationSettings.descriptionMaxWords)
      setSelectedPlatforms(generationSettings.platforms || ['freepik'])
      // Load keyword settings with mutual exclusivity
      const saved = generationSettings.keywordSettings
      if (saved) {
        if (saved.singleWord) setKeywordSettings({ singleWord: true, doubleWord: false, mixed: false })
        else if (saved.doubleWord) setKeywordSettings({ singleWord: false, doubleWord: true, mixed: false })
        else if (saved.mixed) setKeywordSettings({ singleWord: false, doubleWord: false, mixed: true })
        else setKeywordSettings({ singleWord: true, doubleWord: false, mixed: false }) // fallback
      } else {
        setKeywordSettings({ singleWord: true, doubleWord: false, mixed: false }) // default
      }

      // Load customization settings
      setCustomization({
        customPrompt: generationSettings.customization?.customPrompt ?? false,
        customPromptText: generationSettings.customization?.customPromptText ?? '',
        prohibitedWords: generationSettings.customization?.prohibitedWords ?? false,
        prohibitedWordsList: generationSettings.customization?.prohibitedWordsList ?? '',
        transparentBackground: generationSettings.customization?.transparentBackground ?? false,
        silhouette: generationSettings.customization?.silhouette ?? false
      })
      setActiveTab('settings') // Reset to settings tab when modal opens
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
      name: 'Adobe',
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

  const toggleKeywordSetting = (setting: 'singleWord' | 'doubleWord' | 'mixed'): void => {
    // Make toggles mutually exclusive - only one can be active at a time
    setKeywordSettings({
      singleWord: setting === 'singleWord',
      doubleWord: setting === 'doubleWord',
      mixed: setting === 'mixed'
    })
  }

  const toggleCustomization = (setting: keyof typeof customization): void => {
    setCustomization(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  const updateCustomizationText = (field: 'customPromptText' | 'prohibitedWordsList', value: string): void => {
    setCustomization(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleConfirm = (): void => {
    const settings = {
      titleWords,
      titleMinWords,
      titleMaxWords,
      keywordsCount,
      keywordsMinCount,
      keywordsMaxCount,
      descriptionWords,
      descriptionMinWords,
      descriptionMaxWords,
      platforms: selectedPlatforms,
      keywordSettings,
      customization,
      titleCustomization,
      platformOptions
    }

    console.log('🎯 Confirming generation settings:', settings)

    // Save settings to Redux store and localStorage
    dispatch(updateGenerationSettings(settings))

    // Pass settings to parent component
    onConfirm(settings)
    onClose()
  }

  if (!isOpen) {
    return null
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

              .toggle-switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
              }

              .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
              }

              .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #cbd5e1;
                transition: .4s;
                border-radius: 24px;
              }

              .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }

              .toggle-switch input:checked + .toggle-slider {
                background-color: #3b82f6;
              }

              .toggle-switch input:checked + .toggle-slider:before {
                transform: translateX(20px);
              }

              .dark .toggle-slider {
                background-color: #475569;
              }

              .dark .toggle-switch input:checked + .toggle-slider {
                background-color: #3b82f6;
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
              className="flex max-w-4xl w-full mx-4 h-[80vh] shadow-2xl pointer-events-auto"
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
              {/* Left Navigation Sidebar */}
              <div className="w-64 bg-gray-100 dark:bg-gray-800 rounded-l-3xl border-r border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Generation Settings
                  </h2>

                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === 'settings'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <div className="font-medium">Basic Settings</div>
                        <div className="text-sm opacity-75">Title, Keywords & Description</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('keywords')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === 'keywords'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div>
                        <div className="font-medium">Keyword Settings</div>
                        <div className="text-sm opacity-75">
                          {Object.values(keywordSettings).filter(Boolean).length} types enabled
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('titleStyles')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === 'titleStyles'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      <div>
                        <div className="font-medium">Title Styles</div>
                        <div className="text-sm opacity-75">
                          {titleCustomization.titleStyle.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('platforms')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === 'platforms'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <div>
                        <div className="font-medium">Platforms</div>
                        <div className="text-sm opacity-75">
                          {selectedPlatforms.length} selected
                        </div>
                      </div>
                    </button>



                    <button
                      onClick={() => setActiveTab('customization')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === 'customization'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                      <div>
                        <div className="font-medium">Customization</div>
                        <div className="text-sm opacity-75">
                          {Object.values(customization).filter(Boolean).length} features enabled
                        </div>
                      </div>
                    </button>
                  </nav>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-r-3xl flex flex-col">
                <div className="flex-1 p-6 overflow-y-auto">
                  {/* Basic Settings Content */}
                  {activeTab === 'settings' && (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Content Generation Settings
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Customize how many words and keywords to generate for your images
                        </p>
                      </div>

                      {/* Provider Information */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              AI Provider Information
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              These settings apply to metadata generation using your selected AI provider. 
                              <button 
                                onClick={() => window.location.hash = '#/settings'}
                                className="underline hover:no-underline ml-1"
                              >
                                Change provider in Settings
                              </button>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {/* Title Words Settings */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="mb-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              Title Length Settings
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Configure minimum and maximum words for image titles
                            </p>
                          </div>
                          
                          <div className="space-y-6">
                            {/* Min Title Words */}
                            <div className="mb-6">
                              <Slider
                                value={titleMinWords}
                                onChange={(value) => {
                                  setTitleMinWords(value)
                                  if (value > titleMaxWords) setTitleMaxWords(value)
                                }}
                                min={5}
                                max={20}
                                label="Min Title Words"
                                unit=" words"
                              />
                            </div>

                            {/* Max Title Words */}
                            <div className="mb-6">
                              <Slider
                                value={titleMaxWords}
                                onChange={(value) => {
                                  setTitleMaxWords(value)
                                  if (value < titleMinWords) setTitleMinWords(value)
                                }}
                                min={5}
                                max={20}
                                label="Max Title Words"
                                unit=" words"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Keywords Settings */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="mb-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              Keywords Count Settings
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Configure minimum and maximum keywords to generate
                            </p>
                          </div>
                          
                          <div className="space-y-6">
                            {/* Min Keywords */}
                            <div className="mb-6">
                              <Slider
                                value={keywordsMinCount}
                                onChange={(value) => {
                                  setKeywordsMinCount(value)
                                  if (value > keywordsMaxCount) setKeywordsMaxCount(value)
                                }}
                                min={10}
                                max={50}
                                label="Min Keywords"
                                unit=" keywords"
                              />
                            </div>

                            {/* Max Keywords */}
                            <div className="mb-6">
                              <Slider
                                value={keywordsMaxCount}
                                onChange={(value) => {
                                  setKeywordsMaxCount(value)
                                  if (value < keywordsMinCount) setKeywordsMinCount(value)
                                }}
                                min={10}
                                max={50}
                                label="Max Keywords"
                                unit=" keywords"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Description Words Settings */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="mb-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              Description Length Settings
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Configure minimum and maximum words for descriptions
                            </p>
                          </div>
                          
                          <div className="space-y-6">
                            {/* Min Description Words */}
                            <div className="mb-6">
                              <Slider
                                value={descriptionMinWords}
                                onChange={(value) => {
                                  setDescriptionMinWords(value)
                                  if (value > descriptionMaxWords) setDescriptionMaxWords(value)
                                }}
                                min={5}
                                max={50}
                                label="Min Description Words"
                                unit=" words"
                              />
                            </div>

                            {/* Max Description Words */}
                            <div className="mb-6">
                              <Slider
                                value={descriptionMaxWords}
                                onChange={(value) => {
                                  setDescriptionMaxWords(value)
                                  if (value < descriptionMinWords) setDescriptionMinWords(value)
                                }}
                                min={5}
                                max={50}
                                label="Max Description Words"
                                unit=" words"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Keyword Settings Content */}
                  {activeTab === 'keywords' && (
                    <motion.div
                      key="keywords"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Keyword Settings
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Choose what types of keywords to generate for your images
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Single-Word Keywords */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Single-Word Keywords
                              </h4>
                                                             <p className="text-sm text-gray-600 dark:text-gray-400">
                                 Generate individual words as keywords (e.g., &quot;sunset&quot;, &quot;mountain&quot;, &quot;ocean&quot;)
                               </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={keywordSettings.singleWord}
                                onChange={() => toggleKeywordSetting('singleWord')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>

                        {/* Double-Word Keywords */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Double-Word Keywords
                              </h4>
                                                             <p className="text-sm text-gray-600 dark:text-gray-400">
                                 Generate two-word phrases as keywords (e.g., &quot;golden sunset&quot;, &quot;snow mountain&quot;)
                               </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={keywordSettings.doubleWord}
                                onChange={() => toggleKeywordSetting('doubleWord')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>

                        {/* Mixed Keywords */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Mixed Keywords
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Generate a combination of single words and phrases for better coverage
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={keywordSettings.mixed}
                                onChange={() => toggleKeywordSetting('mixed')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Keyword Generation Tips
                              </h5>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                At least one keyword type must be enabled. Different platforms may favor different keyword styles, so experiment with combinations for best results.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Platforms Content */}
                  {activeTab === 'platforms' && (
                    <motion.div
                      key="platforms"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Platform Selection
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Choose which platforms to optimize your content for. You can select multiple platforms.
                        </p>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">
                            {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                      </div>

                      <motion.div
                        className="grid grid-cols-4 gap-6"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: {
                              delayChildren: 0.1,
                              staggerChildren: 0.05
                            }
                          }
                        }}
                      >
                        {platforms.map((platform) => (
                          <motion.button
                            key={platform.id}
                            onClick={() => togglePlatform(platform.id)}
                            className="relative flex flex-col items-center gap-2 p-2 transition-all duration-200 hover:scale-105"
                            variants={{
                              hidden: { opacity: 0, scale: 0.8, y: 20 },
                              visible: {
                                opacity: 1,
                                scale: 1,
                                y: 0
                              }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {/* Selection indicator */}
                            {selectedPlatforms.includes(platform.id) && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center z-10">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            
                            {/* Platform logo */}
                            <div className={`w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 ${
                              selectedPlatforms.includes(platform.id)
                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}>
                              <img
                                src={platform.logo}
                                alt={platform.name}
                                className="w-8 h-8 object-contain"
                              />
                            </div>
                            
                            {/* Platform name */}
                            <span className={`text-xs font-medium text-center transition-colors duration-200 ${
                              selectedPlatforms.includes(platform.id)
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {platform.name}
                            </span>
                          </motion.button>
                        ))}
                      </motion.div>

                      {/* Platform-Specific Settings */}
                      {selectedPlatforms.length > 0 && (
                        <div className="space-y-6">
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                              Platform-Specific Settings
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                              Configure platform-specific options for better CSV generation and compliance.
                            </p>
                          </div>

                          {/* Freepik Settings */}
                          {selectedPlatforms.includes('freepik') && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <img src={freepikLogo} alt="Freepik" className="w-8 h-8 object-contain" />
                                <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                                  Freepik Settings
                                </h5>
                              </div>
                              
                              <div className="space-y-4">
                                {/* AI Generated Toggle */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      AI Generated Content
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Enable if your images are AI-generated (adds Prompt and Model columns)
                                    </p>
                                  </div>
                                  <label className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      checked={platformOptions.freepik.isAiGenerated}
                                      onChange={(e) => setPlatformOptions(prev => ({
                                        ...prev,
                                        freepik: { ...prev.freepik, isAiGenerated: e.target.checked }
                                      }))}
                                    />
                                    <span className="toggle-slider"></span>
                                  </label>
                                </div>

                                {/* AI Model Selection */}
                                {platformOptions.freepik.isAiGenerated && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                      AI Model Used
                                    </label>
                                    <select
                                      value={platformOptions.freepik.aiModel}
                                      onChange={(e) => setPlatformOptions(prev => ({
                                        ...prev,
                                        freepik: { ...prev.freepik, aiModel: e.target.value }
                                      }))}
                                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                                    >
                                      {AI_MODELS.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 123RF Settings */}
                          {selectedPlatforms.includes('123rf') && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <img src={rf123Logo} alt="123RF" className="w-8 h-8 object-contain" />
                                <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                                  123RF Settings
                                </h5>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Country
                                </label>
                                <select
                                  value={platformOptions["123rf"].country}
                                  onChange={(e) => setPlatformOptions(prev => ({
                                    ...prev,
                                    "123rf": { ...prev["123rf"], country: e.target.value }
                                  }))}
                                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                                >
                                  <option value="US">United States</option>
                                  <option value="UK">United Kingdom</option>
                                  <option value="CA">Canada</option>
                                  <option value="AU">Australia</option>
                                  <option value="DE">Germany</option>
                                  <option value="FR">France</option>
                                  <option value="IT">Italy</option>
                                  <option value="ES">Spain</option>
                                  <option value="JP">Japan</option>
                                  <option value="CN">China</option>
                                  <option value="IN">India</option>
                                  <option value="BR">Brazil</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Canva Settings */}
                          {selectedPlatforms.includes('canva') && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <img src={canvaLogo} alt="Canva" className="w-8 h-8 object-contain" />
                                <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                                  Canva Settings
                                </h5>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Artist Name
                                </label>
                                <input
                                  type="text"
                                  value={platformOptions.canva.artistName}
                                  onChange={(e) => setPlatformOptions(prev => ({
                                    ...prev,
                                    canva: { ...prev.canva, artistName: e.target.value }
                                  }))}
                                  placeholder="Enter your artist name"
                                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* Dreamstime Settings */}
                          {selectedPlatforms.includes('dreamstime') && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                              <div className="flex items-center gap-3 mb-4">
                                <img src={dreamstimeLogo} alt="Dreamstime" className="w-8 h-8 object-contain" />
                                <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                                  Dreamstime Settings
                                </h5>
                              </div>
                              
                              <div className="space-y-4">
                                {/* AI Generated Toggle */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      AI Generated Content
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Mark content as AI-generated (affects category selection)
                                    </p>
                                  </div>
                                  <label className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      checked={platformOptions.dreamstime.isAiGenerated}
                                      onChange={(e) => setPlatformOptions(prev => ({
                                        ...prev,
                                        dreamstime: { ...prev.dreamstime, isAiGenerated: e.target.checked }
                                      }))}
                                    />
                                    <span className="toggle-slider"></span>
                                  </label>
                                </div>

                                {/* Free Content Toggle */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Free Content
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Mark content as free to download
                                    </p>
                                  </div>
                                  <label className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      checked={platformOptions.dreamstime.isFree}
                                      onChange={(e) => setPlatformOptions(prev => ({
                                        ...prev,
                                        dreamstime: { ...prev.dreamstime, isFree: e.target.checked }
                                      }))}
                                    />
                                    <span className="toggle-slider"></span>
                                  </label>
                                </div>

                                {/* Editorial Content Toggle */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Editorial Content
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Mark content as editorial use only
                                    </p>
                                  </div>
                                  <label className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      checked={platformOptions.dreamstime.isEditorial}
                                      onChange={(e) => setPlatformOptions(prev => ({
                                        ...prev,
                                        dreamstime: { ...prev.dreamstime, isEditorial: e.target.checked }
                                      }))}
                                    />
                                    <span className="toggle-slider"></span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}



                  {/* Customization Content */}
                  {activeTab === 'customization' && (
                    <motion.div
                      key="customization"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Customization Options
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Advanced settings to fine-tune how Gemini generates your content
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Custom Prompt */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Custom Prompt
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Add custom instructions to control how Gemini generates your content
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={customization.customPrompt}
                                onChange={() => toggleCustomization('customPrompt')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>

                          {customization.customPrompt && (
                            <div className="mt-4">
                              <textarea
                                value={customization.customPromptText}
                                onChange={(e) => updateCustomizationText('customPromptText', e.target.value)}
                                placeholder="Enter custom instructions for Gemini (e.g., 'Focus on artistic style', 'Emphasize commercial use keywords', etc.)"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                                rows={3}
                              />
                            </div>
                          )}
                        </div>

                        {/* Prohibited Words */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Prohibited Words
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Words to exclude from title, keywords, and description
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={customization.prohibitedWords}
                                onChange={() => toggleCustomization('prohibitedWords')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>

                          {customization.prohibitedWords && (
                            <div className="mt-4">
                              <input
                                type="text"
                                value={customization.prohibitedWordsList}
                                onChange={(e) => updateCustomizationText('prohibitedWordsList', e.target.value)}
                                placeholder="Enter comma-separated words (e.g., adult, violent, political)"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Gemini will avoid using these words in the generated metadata. Separate multiple words with commas.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Transparent Background */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Transparent Background
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                When enabled, Gemini will:
                              </p>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-4 space-y-1">
                                <li>• Add "on transparent background" to the end of the title</li>
                                <li>• Include "transparent background" as a keyword</li>
                                <li>• Mention transparent background in the description</li>
                              </ul>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                Use this for PNG images with transparent backgrounds to improve their discoverability.
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={customization.transparentBackground}
                                onChange={() => toggleCustomization('transparentBackground')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>

                        {/* Silhouette */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Silhouette
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                When enabled, Gemini will:
                              </p>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-4 space-y-1">
                                <li>• Add "silhouette" to the end of the title</li>
                                <li>• Include "silhouette" as a keyword</li>
                                <li>• Mention silhouette in the description</li>
                              </ul>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                Use this for silhouette-style images to improve their discoverability in marketplaces.
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={customization.silhouette}
                                onChange={() => toggleCustomization('silhouette')}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Title Styles Content */}
                  {activeTab === 'titleStyles' && (
                    <motion.div
                      key="titleStyles"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                          Title Customization
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          Choose a title style template and add custom prefix/postfix text to your generated titles
                        </p>
                      </div>

                      <div className="space-y-6">
                        {/* Title Style Templates */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="mb-6">
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                              Title Style Template
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Choose how Gemini should generate your titles
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              {
                                id: 'seo-optimized',
                                name: 'SEO-Optimized',
                                description: 'Keyword-rich titles designed for search engines',
                                example: 'Beautiful Mountain Landscape at Sunset with Golden Sky'
                              },
                              {
                                id: 'descriptive',
                                name: 'Descriptive',
                                description: 'Detailed descriptions focusing on visual elements',
                                example: 'Majestic Snow-Capped Mountain Peak During Golden Hour Sunset'
                              },
                              {
                                id: 'short-concise',
                                name: 'Short & Concise',
                                description: 'Brief, punchy titles that get to the point',
                                example: 'Mountain Sunset Landscape'
                              },
                              {
                                id: 'creative',
                                name: 'Creative',
                                description: 'Artistic and imaginative title styles',
                                example: 'When Nature Paints the Sky: A Mountain Story'
                              },
                              {
                                id: 'commercial',
                                name: 'Commercial',
                                description: 'Business-focused titles for commercial use',
                                example: 'Professional Mountain Landscape Background Image'
                              },
                              {
                                id: 'emotional',
                                name: 'Emotional',
                                description: 'Titles that evoke feelings and emotions',
                                example: 'Breathtaking Mountain Vista Inspiring Wonder and Peace'
                              }
                            ].map((style) => (
                              <button
                                key={style.id}
                                onClick={() => setTitleCustomization(prev => ({ ...prev, titleStyle: style.id }))}
                                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                  titleCustomization.titleStyle === style.id
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    {style.name}
                                  </h5>
                                  {titleCustomization.titleStyle === style.id && (
                                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                  {style.description}
                                </p>
                                <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
                                  <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                                    Example: &quot;{style.example}&quot;
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Prefix */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Custom Prefix
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Add text before the generated title
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={titleCustomization.customPrefix}
                                onChange={() => setTitleCustomization(prev => ({ ...prev, customPrefix: !prev.customPrefix }))}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>

                          {titleCustomization.customPrefix && (
                            <div className="mt-4">
                              <input
                                type="text"
                                value={titleCustomization.prefixText}
                                onChange={(e) => setTitleCustomization(prev => ({ ...prev, prefixText: e.target.value }))}
                                placeholder="Enter prefix text (e.g., 'Premium', 'HD', 'Professional')"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                This text will be added before every generated title. Example: &quot;Premium&quot; + &quot;Mountain Landscape&quot; = &quot;Premium Mountain Landscape&quot;
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Custom Postfix */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                Custom Postfix
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Add text after the generated title
                              </p>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={titleCustomization.customPostfix}
                                onChange={() => setTitleCustomization(prev => ({ ...prev, customPostfix: !prev.customPostfix }))}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>

                          {titleCustomization.customPostfix && (
                            <div className="mt-4">
                              <input
                                type="text"
                                value={titleCustomization.postfixText}
                                onChange={(e) => setTitleCustomization(prev => ({ ...prev, postfixText: e.target.value }))}
                                placeholder="Enter postfix text (e.g., 'Vector', 'Illustration', '4K')"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                This text will be added after every generated title. Example: &quot;Mountain Landscape&quot; + &quot;Vector&quot; = &quot;Mountain Landscape Vector&quot;
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Preview */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                Title Preview Format
                              </h5>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                {titleCustomization.customPrefix && titleCustomization.prefixText ? `${titleCustomization.prefixText} + ` : ''}
                                <span className="font-medium">[Generated Title using {titleCustomization.titleStyle.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} style]</span>
                                {titleCustomization.customPostfix && titleCustomization.postfixText ? ` + ${titleCustomization.postfixText}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons - Fixed at bottom */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-br-3xl">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} • {titleWords + keywordsCount + descriptionWords} total words • {Object.values(keywordSettings).filter(Boolean).length} keyword types
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={onClose}
                        className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl font-medium transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirm}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-600/30"
                      >
                        Start Generation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export default GenerationSettingsModal
