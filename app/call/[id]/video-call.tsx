"use client"

import { useEffect, useRef, useState } from "react"
import VideoTimer from "@/components/video-timer"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"

interface VideoCallProps {
  callId: string
  roomUrl: string
  userId: string
}

declare global {
  interface Window {
    DailyIframe: any
  }
}

export default function VideoCall({ callId, roomUrl, userId }: VideoCallProps) {
  const callFrameRef = useRef<any>(null)
  const callWrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [bothParticipantsJoined, setBothParticipantsJoined] = useState(false)
  const supabase = getSupabaseClient()

  // Load Daily.js
  useEffect(() => {
    if (document.querySelector('script[src="https://unpkg.com/@daily-co/daily-js"]')) {
      if (window.DailyIframe) setScriptLoaded(true)
      else {
        const checkTimer = setTimeout(() => {
          if (window.DailyIframe) setScriptLoaded(true)
          else setError("Failed to load Daily.co script. Please refresh the page.")
        }, 2000)
        return () => clearTimeout(checkTimer)
      }
      return
    }

    const script = document.createElement("script")
    script.src = "https://unpkg.com/@daily-co/daily-js"
    script.async = true
    script.onload = () => {
      setTimeout(() => {
        if (window.DailyIframe) setScriptLoaded(true)
        else setError("Failed to initialize Daily.co. Please refresh the page.")
      }, 1000)
    }
    script.onerror = () => setError("Failed to load Daily.co script.")
    document.body.appendChild(script)
  }, [])

  // Supabase subscription to end call
  useEffect(() => {
    const channel = supabase
      .channel(`call_${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          if (payload.new && payload.new.end_time) {
            if (callFrameRef.current) callFrameRef.current.leave()
            router.push(`/feedback/${callId}`)
          }
        },
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [callId, router, supabase])

  const handleEndCall = async () => {
    try {
      await supabase.from("calls").update({ end_time: new Date().toISOString() }).eq("id", callId)
      if (callFrameRef.current) callFrameRef.current.leave()
      router.push(`/feedback/${callId}`)
    } catch (error) {
      console.error("Error ending call:", error)
    }
  }

  // Function to check if both participants have joined
  const checkParticipants = (callFrame: any) => {
    if (!callFrame) return

    const participants = callFrame.participants()
    console.log("Current participants:", participants)

    // Count participants that are actually in the call (not just loading)
    const activeParticipants = Object.values(participants).filter((p: any) => p.session_id && p.video)

    console.log("Active participants:", activeParticipants.length)

    // Set bothParticipantsJoined to true if we have at least 2 participants
    const bothJoined = activeParticipants.length >= 2
    setBothParticipantsJoined(bothJoined)

    if (bothJoined) {
      console.log("Both participants have joined!")
    }
  }

  // Initialize call
  useEffect(() => {
    if (!scriptLoaded || !callWrapperRef.current) return

    const initTimer = setTimeout(() => {
      if (!window.DailyIframe) {
        setError("Video call library not loaded properly.")
        setIsLoading(false)
        return
      }

      const callFrame = window.DailyIframe.createFrame(callWrapperRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "12px",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
        dailyConfig: {
          experimentalChromeVideoMuteLightOff: true,
        },
      })

      // Register events BEFORE assigning to ref
      callFrame.on("joining-meeting", () => {
        console.log("Joining meeting...")
      })

      callFrame.on("joined-meeting", () => {
        console.log("Joined meeting!")
        setIsLoading(false)

        // Check if both participants have joined
        checkParticipants(callFrame)
      })

      // This event fires when participants join or leave
      callFrame.on("participant-joined", () => {
        console.log("Participant joined!")
        // Check if both participants have joined
        checkParticipants(callFrame)
      })

      callFrame.on("participant-left", () => {
        console.log("Participant left!")
        // Check if we still have both participants
        checkParticipants(callFrame)
      })

      callFrame.on("error", (e: any) => {
        console.error("Daily.co error:", e)
        setError(`Video call error: ${e?.errorMsg || "Unknown error"}`)
        setIsLoading(false)
      })

      callFrame.on("camera-error", (e: any) => {
        console.error("Camera error:", e)
        setError(`Camera error: ${e?.errorMsg || "Could not access camera"}`)
        setIsLoading(false)
      })

      callFrame.on("left-meeting", async () => {
        await handleEndCall()
      })

      callFrameRef.current = callFrame
      const cleanRoomUrl = roomUrl.trim()
      callFrame.join({ url: cleanRoomUrl })

      // Fallback timeout in case "joined-meeting" never fires
      setTimeout(() => {
        if (isLoading) {
          console.warn("Timeout fallback — forcing end of loading")
          setIsLoading(false)
        }
      }, 15000)
    }, 1000)

    return () => {
      clearTimeout(initTimer)
      if (callFrameRef.current) {
        callFrameRef.current.destroy()
      }
    }
  }, [roomUrl, callId, router, scriptLoaded])

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      window.location.reload()
    } catch (err) {
      setError("Could not access camera or microphone. Check browser permissions.")
    }
  }

  const retryConnection = () => {
    setError(null)
    setIsLoading(true)
    if (callFrameRef.current) {
      callFrameRef.current.destroy()
      callFrameRef.current = null
    }
    window.location.reload()
  }

  return (
    <div className="relative w-full h-screen">
      <div ref={callWrapperRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
          <div className="text-center">
            <div className="w-16 h-16 mb-4 mx-auto rounded-full border-4 border-t-pink-500 border-r-pink-500 border-b-transparent border-l-transparent animate-spin"></div>
            <p>Connecting to video call...</p>
            <p className="text-xs mt-2 text-gray-400">Room URL: {roomUrl}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
          <Alert className="max-w-md">
            <AlertTitle>Video Call Error</AlertTitle>
            <AlertDescription>
              <p className="mb-4">{error}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={requestCameraPermission}>Grant Camera Access</Button>
                <Button onClick={retryConnection} variant="secondary">
                  Retry Connection
                </Button>
                <Button variant="outline" onClick={handleEndCall}>
                  Skip to Feedback
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <VideoTimer callId={callId} onEndCall={handleEndCall} bothParticipantsJoined={bothParticipantsJoined} />
    </div>
  )
}
