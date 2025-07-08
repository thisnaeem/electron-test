import React, { useState } from 'react'

interface TranscriptEntry {
  start: number
  duration: number
  text: string
}

interface VideoInfo {
  success: boolean
  title?: string
  author_name?: string
  author_url?: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  video_url?: string
  video_id?: string
  error?: string
}

interface TranscriptResult {
  success: boolean
  error?: string
  transcript?: string
  timestamped_transcript?: TranscriptEntry[]
  language?: string
  language_code?: string
  is_auto_generated?: boolean
  video_id?: string
  total_entries?: number
  available_languages?: Array<{
    language: string
    language_code: string
    is_generated: boolean
  }>
}

const YouTubeTranscriber = (): React.JSX.Element => {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [transcriptResult, setTranscriptResult] = useState<TranscriptResult | null>(null)
  const [error, setError] = useState('')
  const [showTimestamps, setShowTimestamps] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en'])

  const languageOptions = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' }
  ]

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }

    // If it's just a video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
      return url.trim()
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      setError('Please enter a valid YouTube URL')
      return
    }

    setIsProcessing(true)
    setError('')
    setVideoInfo(null)
    setTranscriptResult(null)

    try {
      const result = await window.api.getYouTubeTranscript(youtubeUrl, selectedLanguages)

      // Handle the new response structure
      setVideoInfo(result.video_info)
      setTranscriptResult(result.transcript_result)

      if (!result.transcript_result.success) {
        setError(result.transcript_result.error || 'Failed to get transcript')
      } else if (!result.video_info.success && result.video_info.error) {
        // Video info failed but transcript succeeded - show warning instead of error
        console.warn('Video info failed:', result.video_info.error)
      }
    } catch (apiError) {
      console.error('YouTube transcript API error:', apiError)
      setError('Failed to process request. Please check if Python and youtube-transcript-api are installed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const downloadTranscript = () => {
    if (!transcriptResult?.transcript) return

    const blob = new Blob([transcriptResult.transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transcript-${transcriptResult.video_id || 'youtube'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const downloadTimestampedTranscript = () => {
    if (!transcriptResult?.timestamped_transcript) return

    const timestampedText = transcriptResult.timestamped_transcript
      .map(entry => `${formatTime(entry.start)} - ${entry.text}`)
      .join('\n')

    const blob = new Blob([timestampedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transcript-timestamped-${transcriptResult.video_id || 'youtube'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const toggleLanguage = (langCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(langCode)
        ? prev.filter(code => code !== langCode)
        : [...prev, langCode]
    )
  }

  return (
    <div className="absolute top-10 left-20 right-0 bottom-0 overflow-auto bg-white dark:bg-[#1a1b23]">
      <div className="p-6 max-w-full">
        <h2 className="text-3xl font-semibold mb-8 text-gray-900 dark:text-white">YouTube Transcriber</h2>

        {/* Input Form */}
        <div className="mb-8 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                YouTube URL or Video ID
              </label>
              <input
                type="text"
                id="youtube-url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or video ID"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2a2d3a] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={isProcessing}
              />
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Preferred Languages (optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedLanguages.includes(lang.code)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select preferred languages. The transcriber will try these languages first, then fall back to English or any available language.
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !youtubeUrl.trim()}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Getting Transcript...
                </>
              ) : (
                'Get Transcript'
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 max-w-4xl">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">Error</h3>
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  {transcriptResult?.available_languages && transcriptResult.available_languages.length > 0 && (
                    <div className="mt-3">
                      <p className="text-red-700 dark:text-red-400 text-sm font-medium">Available languages:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {transcriptResult.available_languages.map((lang, index) => (
                          <span key={index} className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                            {lang.language} ({lang.language_code}) {lang.is_generated ? '(auto)' : '(manual)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Information */}
        {videoInfo?.success && (
          <div className="max-w-full mb-6">
            <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Video Information</h3>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Thumbnail */}
                {videoInfo.thumbnail_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={videoInfo.thumbnail_url}
                      alt={videoInfo.title || 'Video thumbnail'}
                      className="w-full lg:w-80 h-auto rounded-xl border border-gray-200 dark:border-gray-600"
                      onError={(e) => {
                        // Fallback to lower quality thumbnail if high quality fails
                        const img = e.target as HTMLImageElement
                        if (img.src.includes('maxresdefault')) {
                          img.src = `https://img.youtube.com/vi/${videoInfo.video_id}/hqdefault.jpg`
                        }
                      }}
                    />
                  </div>
                )}

                {/* Video Details */}
                <div className="flex-1 space-y-4">
                  {videoInfo.title && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {videoInfo.title}
                      </h4>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {videoInfo.author_name && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Channel:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {videoInfo.author_url ? (
                            <button
                              onClick={() => window.api.openExternalLink(videoInfo.author_url!)}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {videoInfo.author_name}
                            </button>
                          ) : (
                            videoInfo.author_name
                          )}
                        </p>
                      </div>
                    )}

                    {videoInfo.video_id && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Video ID:</span>
                        <p className="font-medium text-gray-900 dark:text-white font-mono">
                          {videoInfo.video_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {videoInfo.video_url && (
                    <div className="pt-2">
                      <button
                        onClick={() => window.api.openExternalLink(videoInfo.video_url!)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        Watch on YouTube
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Result */}
        {transcriptResult?.success && (
          <div className="max-w-full">
            {/* Transcript Info */}
            <div className="bg-[#f6f6f8] dark:bg-[#2a2d3a] rounded-xl p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Transcript Ready
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowTimestamps(!showTimestamps)}
                    className="px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    {showTimestamps ? 'Hide Timestamps' : 'Show Timestamps'}
                  </button>
                  <button
                    onClick={downloadTranscript}
                    className="px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Text
                  </button>
                  {showTimestamps && (
                    <button
                      onClick={downloadTimestampedTranscript}
                      className="px-4 py-2 bg-[#f5f5f5] hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Download with Timestamps
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Language:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transcriptResult.language} ({transcriptResult.language_code})
                    {transcriptResult.is_auto_generated && (
                      <span className="ml-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1 py-0.5 rounded">
                        Auto-generated
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Video ID:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{transcriptResult.video_id}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Entries:</span>
                  <p className="font-medium text-gray-900 dark:text-white">{transcriptResult.total_entries}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transcriptResult.is_auto_generated ? 'Auto-generated' : 'Manual'}
                  </p>
                </div>
              </div>
            </div>

            {/* Transcript Content */}
            <div className="bg-white dark:bg-[#2a2d3a] rounded-xl border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
              <div className="p-6">
                {showTimestamps && transcriptResult.timestamped_transcript ? (
                  <div className="space-y-3">
                    {transcriptResult.timestamped_transcript.map((entry, index) => (
                      <div key={index} className="flex gap-4">
                        <span className="text-blue-600 dark:text-blue-400 font-mono text-sm flex-shrink-0 mt-0.5">
                          {formatTime(entry.start)}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {entry.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {transcriptResult.transcript}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

export default YouTubeTranscriber
