import { useState, useRef, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { useGemini } from '../../context/useGemini'
import { Link } from 'react-router-dom'
import { addMessage, clearMessages, ChatMessage } from '../../store/slices/chatSlice'

const ChatInterface = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { apiKeys } = useAppSelector(state => state.settings)
  const { messages } = useAppSelector(state => state.chat)
  const { chat, isLoading } = useGemini()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Remove unused variable

  const hasValidApiKey = apiKeys.some(key => key.isValid)

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setUploadedImages(prev => [...prev, result])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeImage = (index: number): void => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const cleanResponse = (text: string): string => {
    // Remove extra asterisks, clean up formatting
    return text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
      .replace(/^\s*\*\s*/gm, '• ') // Convert asterisk lists to bullet points
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines to double
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if ((!input.trim() && uploadedImages.length === 0) || isLoading) return

    const messageText = input.trim()
    const messageImages = [...uploadedImages]

    // Clear inputs immediately
    setInput('')
    setUploadedImages([])
    setError(null)

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
      images: messageImages.length > 0 ? messageImages : undefined
    }

    dispatch(addMessage(userMessage))

    try {
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.images
      }))

      const response = await chat(
        messageText,
        messageImages.length > 0 ? messageImages : undefined,
        conversationHistory.length > 0 ? conversationHistory : undefined
      )
      const cleanedResponse = cleanResponse(response)

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: cleanedResponse,
        timestamp: Date.now()
      }
      dispatch(addMessage(assistantMessage))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const adjustTextareaHeight = (): void => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  if (!hasValidApiKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 text-center border border-orange-200 dark:border-orange-800">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-600 dark:text-orange-400"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
          </div>
          <h2 className="text-orange-800 dark:text-orange-200 text-xl font-semibold mb-3">
            API Key Required
          </h2>
          <p className="text-orange-700 dark:text-orange-300 mb-4">
            You need to add and validate your Gemini API key to use the chat interface.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Settings
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute top-0 left-20 right-0 bottom-0 bg-gray-50 dark:bg-[#101113] flex flex-col">
      {/* Chat Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#141517] border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="/src/assets/app-logo.png"
                alt="App Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                AI Assistant
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {messages.length > 0
                  ? `${messages.length} message${messages.length !== 1 ? 's' : ''} in conversation`
                  : 'Ask me anything about your images and more'
                }
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* New Chat Button */}
            <button
              onClick={() => {
                dispatch(clearMessages())
                setError(null)
                setUploadedImages([])
                setInput('')
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800"
              title="Start a new chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Chat
            </button>

            {/* Clear Chat Button */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  dispatch(clearMessages())
                  setError(null)
                  setUploadedImages([])
                  setInput('')
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800"
                title="Clear chat history"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center px-4">
              {/* Modern Chat Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-purple-500/25 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white relative z-10"
                >
                  <path d="M8 12h.01" />
                  <path d="M12 12h.01" />
                  <path d="M16 12h.01" />
                  <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              {/* Title and Description */}
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Start a conversation
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 max-w-2xl leading-relaxed">
                Upload images and ask questions, or just chat about anything you&apos;d like to know. I&apos;ll remember our conversation context.
              </p>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="group bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 text-left border border-gray-200/50 dark:border-gray-700/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Analyze images
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Upload and ask about your photos
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => textareaRef.current?.focus()}
                  className="group bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 text-left border border-gray-200/50 dark:border-gray-700/50 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        <path d="M8 10h8" />
                        <path d="M8 14h6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        General chat
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Ask questions or have a conversation
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Subtle hint text */}
              <div className="mt-12 text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-60"
                >
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Press Enter to send • Shift + Enter for new line
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-4 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            color="#ffffff"
                            fill="none"
                          >
                            <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M14.75 9.5C14.75 11.0188 13.5188 12.25 12 12.25C10.4812 12.25 9.25 11.0188 9.25 9.5C9.25 7.98122 10.4812 6.75 12 6.75C13.5188 6.75 14.75 7.98122 14.75 9.5Z" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M5.49994 19.0001L6.06034 18.0194C6.95055 16.4616 8.60727 15.5001 10.4016 15.5001H13.5983C15.3926 15.5001 17.0493 16.4616 17.9395 18.0194L18.4999 19.0001" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center">
                          <img
                            src="/src/assets/app-logo.png"
                            alt="App Logo"
                            className="w-10 h-10 object-contain"
                          />
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <div
                        className={`rounded-2xl px-5 py-4 shadow-sm ${message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-[#141517] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                          }`}
                      >
                        {message.images && message.images.length > 0 && (
                          <div className="mb-4 space-y-3">
                            {message.images.map((image, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={image}
                                alt={`Uploaded ${imgIndex + 1}`}
                                className="max-w-full h-auto rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm"
                                style={{ maxHeight: '300px' }}
                              />
                            ))}
                          </div>
                        )}
                        {message.content && (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-[#141517] border-t border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          {/* Image Preview */}
          {uploadedImages.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              {uploadedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Simplified Input Container */}
          <div className="relative">
            <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-2xl p-3">
              {/* Image Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Upload images"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-500 dark:text-gray-400"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {}}
                onBlur={() => {}}
                placeholder="Type your message..."
                className="flex-1 resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm py-2"
                rows={1}
                style={{ minHeight: '24px', maxHeight: '96px' }}
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!input.trim() && uploadedImages.length === 0) || isLoading}
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${(!input.trim() && uploadedImages.length === 0) || isLoading
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                title="Send message"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
