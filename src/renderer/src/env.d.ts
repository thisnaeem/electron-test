/// <reference types="vite/client" />
/// <reference types="../preload/index.d.ts" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}
