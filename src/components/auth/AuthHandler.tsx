"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function AuthHandler() {
  const router = useRouter()

  useEffect(() => {
    const handleUnauthorized = () => {
      router.replace("/auth/login")
    }

    window.addEventListener("forge:unauthorized", handleUnauthorized)
    return () => {
      window.removeEventListener("forge:unauthorized", handleUnauthorized)
    }
  }, [router])

  return null
}
