import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  images?: string[]
}

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
}

// Helper function to load chat history from localStorage
const loadChatHistoryFromStorage = (): ChatMessage[] => {
  try {
    const stored = localStorage.getItem('chatHistory')
    if (!stored) {
      return []
    }
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('❌ Error loading chat history from localStorage:', error)
    return []
  }
}

// Helper function to save chat history to localStorage
const saveChatHistoryToStorage = (messages: ChatMessage[]): void => {
  try {
    // Only save last 50 messages to avoid localStorage size limits
    const recentMessages = messages.slice(-50)
    const serialized = JSON.stringify(recentMessages)
    localStorage.setItem('chatHistory', serialized)
    console.log('💾 Saved chat history to localStorage:', recentMessages.length, 'messages')
  } catch (error) {
    console.error('❌ Error saving chat history to localStorage:', error)
  }
}

const initialState: ChatState = {
  messages: loadChatHistoryFromStorage(),
  isLoading: false,
  error: null
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload)
      // Save to localStorage whenever a message is added
      saveChatHistoryToStorage(state.messages)
    },

    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload
      // Save to localStorage whenever messages are set
      saveChatHistoryToStorage(state.messages)
    },

    clearMessages: (state) => {
      state.messages = []
      // Clear localStorage as well
      localStorage.removeItem('chatHistory')
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

export const {
  addMessage,
  setMessages,
  clearMessages,
  setLoading,
  setError
} = chatSlice.actions

export default chatSlice.reducer
