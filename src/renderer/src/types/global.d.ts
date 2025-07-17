declare global {
  interface Window {
    api: {
      // Auto-updater APIs
      checkForUpdates: () => Promise<any>
      downloadUpdate: () => Promise<any>
      quitAndInstall: () => Promise<any>
      onUpdateStatus: (callback: (data: any) => void) => () => void
      getAppVersion: () => Promise<string>

      // External links
      openExternalLink: (url: string) => void

      // File operations
      readImageFile: (filePath: string) => Promise<any>
      saveImagePreview: (imageData: string, filename: string) => Promise<any>
      getImagePreviews: () => Promise<any>
      deleteImagePreview: (filename: string) => Promise<any>
      clearAllPreviews: () => Promise<any>
      downloadImageFromUrl: (imageUrl: string, filename: string) => Promise<any>

      // Native notifications
      showNotification: (options: {
        title: string
        body: string
        icon?: string
      }) => Promise<{ success: boolean; error?: string }>

      // KeyAuth APIs
      keyauth: {
        initialize: () => Promise<boolean>
        login: (username: string, password: string) => Promise<any>
        register: (username: string, password: string, license: string) => Promise<any>
        license: (licenseKey: string) => Promise<any>
        getCurrentUser: () => Promise<any>
        isAuthenticated: () => Promise<boolean>
        isSubscriptionValid: () => Promise<boolean>
        getDaysRemaining: () => Promise<number>
        logout: () => Promise<any>
      }

      // Auth success notification
      authSuccess: (userInfo: any) => void

      // Window control
      onWindowMaximized: (callback: () => void) => () => void
      onWindowUnmaximized: (callback: () => void) => () => void
      minimizeWindow: () => void
      maximizeWindow: () => void
      unmaximizeWindow: () => void
      closeWindow: () => void
      quitApp: () => void
    }
  }
}

export {}