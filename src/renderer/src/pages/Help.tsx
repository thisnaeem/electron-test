import React, { useState } from 'react'

type HelpSection = 'getting-started' | 'features' | 'troubleshooting' | 'contact'

const Help = (): React.JSX.Element => {
  const [activeSection, setActiveSection] = useState<HelpSection>('getting-started')

  const sidebarSections = [
    {
      id: 'getting-started' as HelpSection,
      name: 'Getting Started',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'features' as HelpSection,
      name: 'Features',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      id: 'troubleshooting' as HelpSection,
      name: 'Troubleshooting',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'contact' as HelpSection,
      name: 'Contact & Support',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ]

  const renderGettingStartedContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Welcome to CSVGen Pro</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          CSVGen Pro is your all-in-one AI-powered content generation and file processing tool. Get started with these simple steps.
        </p>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="p-4 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">1</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Set Up API Keys</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Navigate to Settings → API Keys and add your Gemini API keys. You'll need at least 5 valid keys to use the Generator feature.
                </p>
                <button
                  onClick={() => window.location.hash = '#/settings'}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Go to Settings
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 dark:text-green-400 font-semibold text-sm">2</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Start Generating Content</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Upload your images to the Generator and let AI create amazing content, metadata, and descriptions automatically.
                </p>
                <button
                  onClick={() => window.location.hash = '#/generator'}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Try Generator
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">3</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Explore Additional Tools</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Access powerful tools for image generation, background removal, file conversion, and more through the Tools navigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderFeaturesContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Features Overview</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Discover all the powerful features available in CSVGen Pro.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Content Generator */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">AI Content Generator</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Upload images and generate AI-powered content including titles, descriptions, metadata, and SEO-optimized text.
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Automatic image analysis</li>
              <li>• SEO-friendly content generation</li>
              <li>• Batch processing support</li>
              <li>• Multiple output formats</li>
            </ul>
          </div>

          {/* AI Image Generator */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">AI Image Generator</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Create stunning images from text prompts using advanced AI models with customizable styles and aspect ratios.
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Multiple art styles</li>
              <li>• Custom aspect ratios</li>
              <li>• Prompt enhancement</li>
              <li>• High-quality outputs</li>
            </ul>
          </div>

          {/* File Processing Tools */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707v11a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">File Processing</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Access professional file conversion, background removal, and processing tools.
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• File format conversion</li>
              <li>• Background removal</li>
              <li>• Batch file processing</li>
              <li>• YouTube transcription</li>
            </ul>
          </div>

          {/* Settings & Customization */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Customization</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Personalize your experience with dark mode, API key management, and automatic updates.
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Dark/Light mode toggle</li>
              <li>• API key management</li>
              <li>• Automatic updates</li>
              <li>• User preferences</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTroubleshootingContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Troubleshooting</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Common issues and solutions to help you get the most out of CSVGen Pro.
        </p>

        <div className="space-y-6">
          {/* API Key Issues */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              API Key Issues
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Problem: "Please add and validate your API keys" message
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Solution:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 ml-4 space-y-1">
                  <li>• Go to Settings → API Keys</li>
                  <li>• Add at least 5 valid Gemini API keys</li>
                  <li>• Click "Validate" for each key</li>
                  <li>• Ensure all keys show green checkmarks</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Problem: API key validation fails
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 ml-4 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Verify the API key is copied correctly</li>
                  <li>• Ensure the API key has proper permissions</li>
                  <li>• Try regenerating the API key from Google AI Studio</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Image Generation Issues */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image Generation Issues
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Problem: Images fail to generate
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 ml-4 space-y-1">
                  <li>• Verify your Together AI API key is valid</li>
                  <li>• Check your account credits/quota</li>
                  <li>• Try a simpler prompt</li>
                  <li>• Reduce the number of images to generate</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Problem: Slow image generation
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 ml-4 space-y-1">
                  <li>• This is normal for high-quality AI generation</li>
                  <li>• Try generating fewer images at once</li>
                  <li>• Check your internet connection speed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* General Issues */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              General Issues
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Problem: App is slow or unresponsive
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 ml-4 space-y-1">
                  <li>• Close and restart the application</li>
                  <li>• Clear browser cache if using web version</li>
                  <li>• Check available system memory</li>
                  <li>• Update to the latest version</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Problem: Files not uploading
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 ml-4 space-y-1">
                  <li>• Check file size (max 10MB per file)</li>
                  <li>• Ensure file format is supported</li>
                  <li>• Try uploading fewer files at once</li>
                  <li>• Verify file isn't corrupted</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContactContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Contact & Support</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Need help? We're here to assist you with any questions or issues.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* WhatsApp Support */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">WhatsApp Channel</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Join our WhatsApp channel for updates, tips, and community support.
            </p>
            <button
              onClick={() => window.open('https://whatsapp.com/channel/0029VaNKNAoE2UVIFWtlUL2y', '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Join Channel
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>

          {/* Email Support */}
          <div className="p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Email Support</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Send us an email for detailed technical support and inquiries.
            </p>
            <button
              onClick={() => window.open('mailto:support@csvgen.com', '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Send Email
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 p-6 bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h4>
          <div className="space-y-4">
            <div>
              <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                How many API keys do I need?
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You need at least 5 valid Gemini API keys to use the Generator feature. This ensures reliable service and rate limit management.
              </p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Is my data secure?
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Yes, your data is processed securely. Images are only sent to AI services for processing and are not stored permanently.
              </p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                Can I use this offline?
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Some features require an internet connection to access AI services. File processing and basic navigation work offline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return renderGettingStartedContent()
      case 'features':
        return renderFeaturesContent()
      case 'troubleshooting':
        return renderTroubleshootingContent()
      case 'contact':
        return renderContactContent()
      default:
        return renderGettingStartedContent()
    }
  }

  return (
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-[#f6f6f8] dark:bg-[#2a2d3a] p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Help & Support</h2>
          <nav className="space-y-2">
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-white text-[#1a1b1e] dark:bg-[#383b4a] dark:text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white/60 hover:text-[#1a1b1e] dark:text-gray-300 dark:hover:bg-[#383b4a]/60 dark:hover:text-white'
                }`}
              >
                <span className={`${
                  activeSection === section.id
                    ? 'text-[#1a1b1e] dark:text-white'
                    : 'text-gray-400 dark:text-gray-400'
                }`}>
                  {section.icon}
                </span>
                <span className="text-sm font-medium">{section.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default Help
