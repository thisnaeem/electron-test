/// <reference types="vite/client" />

interface Window {
  api: {
    checkForUpdates: () => Promise<any>
    downloadUpdate: () => Promise<any>
    quitAndInstall: () => Promise<any>
    onUpdateStatus: (callback: (data: any) => void) => () => void
    getAppVersion: () => Promise<string>
    openExternalLink: (url: string) => void
  }
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}
