"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

export function AuthHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleUnauthorized = () => {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`)
    }

    window.addEventListener("forge:unauthorized", handleUnauthorized)
    return () => {
      window.removeEventListener("forge:unauthorized", handleUnauthorized)
    }
  }, [router, pathname])

  return null
}
