"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function WaitingAnimation() {
  const [dots, setDots] = useState(".")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "."
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 mb-4 rounded-full border-4 border-t-pink-500 border-r-pink-500 border-b-transparent border-l-transparent animate-spin"></div>
        <h2 className="text-2xl font-bold mb-2">Finding a match</h2>
        <p className="text-gray-500">Waiting for someone to connect{dots}</p>
      </CardContent>
    </Card>
  )
}
