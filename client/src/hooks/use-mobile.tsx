import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [windowSize, setWindowSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  React.useEffect(() => {
    // Handle initial load
    const checkMobile = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setWindowSize({ width, height })
      setIsMobile(width < MOBILE_BREAKPOINT)
    }

    // Run on mount
    checkMobile()

    // Setup resize listener with debounce
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', checkMobile)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', checkMobile)
      clearTimeout(timeoutId)
    }
  }, [])

  const getSafeAreaInsets = () => {
    return {
      top: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),
      right: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right'),
      bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom'),
      left: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left'),
    }
  }

  return {
    isMobile: isMobile ?? false,
    windowSize,
    safeAreaInsets: getSafeAreaInsets(),
    isLandscape: windowSize.width > windowSize.height
  }
}