import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export const getScreenConfig = () => {
  if (typeof window === 'undefined') return {}
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  return {
    prefersReducedMotion,
    prefersColorScheme,
    isTouch
  }
}
