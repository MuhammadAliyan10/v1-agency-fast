import * as React from "react"

const MOBILE_BREAKPOINT = 768

const subscribe = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

const getSnapshot = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

const getServerSnapshot = () => false

export function useIsMobile() {
  const isMobile = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return isMobile
}
