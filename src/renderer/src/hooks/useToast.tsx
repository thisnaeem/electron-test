import React, { createContext, useContext, useState, ReactNode } from 'react'
import * as Toast from '@radix-ui/react-toast'
import ToastComponent from '../components/Toast'

interface ToastData {
  id: string
  title: string
  description?: string
  type?: 'success' | 'error' | 'info'
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void
  showSuccess: (title: string, description?: string) => void
  showError: (title: string, description?: string) => void
  showInfo: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const showToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])
  }

  const showSuccess = (title: string, description?: string) => {
    showToast({ title, description, type: 'success' })
  }

  const showError = (title: string, description?: string) => {
    showToast({ title, description, type: 'error' })
  }

  const showInfo = (title: string, description?: string) => {
    showToast({ title, description, type: 'info' })
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            title={toast.title}
            description={toast.description}
            type={toast.type}
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                removeToast(toast.id)
              }
            }}
          />
        ))}
        <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-6 gap-2 w-96 max-w-[100vw] m-0 list-none z-50 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}