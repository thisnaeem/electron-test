import { useState, useRef, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../../store/hooks'
import { useGemini } from '../../context/useGemini'
import { Link } from 'react-router-dom'
import { addMessage, clearMessages, ChatMessage } from '../../store/slices/chatSlice'
import { PromptBox } from '../../components/ui/PromptBox'

const ChatInterface = (): React.JSX.Element => {
  const dispatch = useAppDispatch()
  const { apiKeys } = useAppSelector(state => state.settings)
  const { messages } = useAppSelector(state => state.chat)
  const { chat, isLoading } = useGemini()
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasValidApiKey = apiKeys.some(key => key.isValid)

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handlePromptSubmit = async (messageText: string, messageImages: string[]): Promise<void> => {
    if (isLoading) return

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

  const cleanResponse = (text: string): string => {
    // Remove extra asterisks, clean up formatting
    return text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
      .replace(/^\s*\*\s*/gm, '• ') // Convert asterisk lists to bullet points
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines to double
      .trim()
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
    <div className="absolute top-0 left-20 right-0 bottom-0 bg-white dark:bg-[#212121] flex flex-col">
      {/* Modern Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#212121] border-b border-gray-100 dark:border-gray-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Ask me anything about your images and more
              </p>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              dispatch(clearMessages())
              setError(null)
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 border border-gray-200 dark:border-gray-700"
          >
            <svg
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
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              {/* Modern Chat Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <svg
                  width="32"
                  height="32"
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
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
                Start a conversation
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-16 max-w-2xl leading-relaxed">
                Upload images and ask questions, or just chat about anything you&apos;d like to know. I&apos;ll remember our conversation context.
              </p>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl w-full">
                <div className="group bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 text-left border border-gray-100 dark:border-gray-700/50 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <svg
                        width="24"
                        height="24"
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
                      <div className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Analyze images
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Upload and ask about your photos
                      </div>
                    </div>
                  </div>
                </div>

                <div className="group bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 text-left border border-gray-100 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <svg
                        width="24"
                        height="24"
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
                      <div className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        General chat
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Ask questions or have a conversation
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-6 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg
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
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <svg
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
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <div
                        className={`rounded-3xl px-6 py-4 shadow-sm ${message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700'
                          }`}
                      >
                        {message.images && message.images.length > 0 && (
                          <div className="mb-4 space-y-3">
                            {message.images.map((image, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={image}
                                alt={`Uploaded ${imgIndex + 1}`}
                                className="max-w-full h-auto rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm"
                                style={{ maxHeight: '300px' }}
                              />
                            ))}
                          </div>
                        )}
                        {message.content && (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs text-gray-500 dark:text-gray-400 mt-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
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

      {/* Modern Input Area */}
      <div className="flex-shrink-0 bg-white dark:bg-[#212121] border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <PromptBox
            onSubmit={handlePromptSubmit}
            placeholder="Type your message..."
            disabled={isLoading}
            className="w-full"
          />
          
          {error && (
            <div className="mt-4 text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
