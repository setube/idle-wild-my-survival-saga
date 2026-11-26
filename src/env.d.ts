/// <reference types="vite/client" />
/// <reference types="element-plus/global" />
import type { GlobalComponents as ElementComponents } from "element-plus"

type IconComponents = typeof import("@element-plus/icons-vue")

declare global {
  const __APP_NAME__: string
  const __APP_TITLE__: string
  const __APP_VERSION__: string
}

declare module "vue" {
  interface GlobalComponents extends IconComponents, ElementComponents {}
}

export {}
