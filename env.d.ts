/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*/api/api.js' {
  export function signalBilan<T>(signal: AbortSignal, fn: () => T): T
  export const bekorXatomi: (e: unknown) => boolean
  export const api: {
    get:    (path: string) => Promise<any>
    post:   (path: string, body: unknown) => Promise<any>
    patch:  (path: string, body: unknown) => Promise<any>
    delete: (path: string) => Promise<any>
  }
}
