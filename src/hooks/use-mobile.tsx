import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function checkIsMobile(): boolean {
  if (typeof window === "undefined") return false
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
    window.navigator?.userAgent || ""
  )
  return window.innerWidth < MOBILE_BREAKPOINT || isMobileUA
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => {
      setIsMobile(checkIsMobile())
    }
    mql.addEventListener("change", update)
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    update()
    return () => {
      mql.removeEventListener("change", update)
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])

  return !!isMobile
}

