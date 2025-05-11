"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

interface VideoTimerProps {
  callId: string
  duration?: number // in seconds
  onEndCall?: () => void
  bothParticipantsJoined?: boolean
}

export default function VideoTimer({
  callId,
  duration = 60,
  onEndCall,
  bothParticipantsJoined = false,
}: VideoTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [timerActive, setTimerActive] = useState(false)
  const router = useRouter()

  // Start timer only when both participants have joined
  useEffect(() => {
    if (bothParticipantsJoined && !timerActive) {
      console.log("Both participants joined, starting timer!")
      setTimerActive(true)
    }
  }, [bothParticipantsJoined, timerActive])

  // Handle the timer countdown
  useEffect(() => {
    // Only count down if timer is active
    if (!timerActive) return

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
  }, [timeLeft, router, callId, onEndCall, timerActive])

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
        <div className="text-xl font-bold">{!timerActive ? "Waiting..." : formatTime(timeLeft)}</div>
        <Button variant="destructive" size="sm" onClick={handleEndCall}>
          End Call
        </Button>
      </CardContent>
    </Card>
  )
}
