"use client"
import { useEffect } from "react"

export function HtmlWrapper() {
  useEffect(() => {
    document.documentElement.lang = "en"
    document.documentElement.classList.add("light")
    document.documentElement.style.colorScheme = "light"
  }, [])

  return null
}
