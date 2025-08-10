import React from 'react'
import * as Toast from '@radix-ui/react-toast'

interface ToastProps {
  title: string
  description?: string
  type?: 'success' | 'error' | 'info'
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ToastComponent: React.FC<ToastProps> = ({
  title,
  description,
  type = 'info',
  open,
  onOpenChange
}) => {
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200'
      case 'error':
        return 'text-red-800 dark:text-red-200'
      default:
        return 'text-blue-800 dark:text-blue-200'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <Toast.Root
      className={`${getToastStyles()} border rounded-lg p-4 shadow-lg data-[state=open]:animate-slideIn data-[state=closed]:animate-hide data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=end]:animate-swipeOut`}
      open={open}
      onOpenChange={onOpenChange}
      duration={5000}
    >
      <div className="flex items-start gap-3">
        <div className={`${getIconColor()} mt-0.5 flex-shrink-0`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <Toast.Title className={`${getTextColor()} font-medium text-sm`}>
            {title}
          </Toast.Title>
          {description && (
            <Toast.Description className={`${getTextColor()} text-sm mt-1 opacity-90`}>
              {description}
            </Toast.Description>
          )}
        </div>
        <Toast.Close className={`${getTextColor()} hover:opacity-70 transition-opacity`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Toast.Close>
      </div>
    </Toast.Root>
  )
}

export default ToastComponent