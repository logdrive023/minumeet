"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

interface VideoTimerProps {
  callId: string
  duration?: number // in seconds
  onEndCall?: () => void
}

export default function VideoTimer({ callId, duration = 60, onEndCall }: VideoTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const router = useRouter()

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onEndCall) {
        onEndCall()
      } else {
        router.push(`/feedback/${callId}`)
      }
      return
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeLeft, router, callId, onEndCall])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const handleEndCall = () => {
    if (onEndCall) {
      onEndCall()
    } else {
      router.push(`/feedback/${callId}`)
    }
  }

  return (
    <Card className="absolute top-4 right-4 bg-opacity-80 bg-black text-white">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="text-xl font-bold">{formatTime(timeLeft)}</div>
        <Button variant="destructive" size="sm" onClick={handleEndCall}>
          End Call
        </Button>
      </CardContent>
    </Card>
  )
}
