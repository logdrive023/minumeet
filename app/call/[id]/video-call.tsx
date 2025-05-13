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
    callFrame: any
  }
}

export default function VideoCall({ callId, roomUrl, userId }: VideoCallProps) {
  const callFrameRef = useRef<any>(null)
  const callWrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [bothParticipantsJoined, setBothParticipantsJoined] = useState(false)
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (document.querySelector('script[src="https://unpkg.com/@daily-co/daily-js"]')) {
      if (window.DailyIframe) setScriptLoaded(true)
      else {
        const checkTimer = setTimeout(() => {
          if (window.DailyIframe) setScriptLoaded(true)
          else setError("Failed to load Daily.co script. Please refresh the page.")
        }, 6000)
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
      }, 3000)
    }
    script.onerror = () => setError("Failed to load Daily.co script.")
    document.body.appendChild(script)
  }, [])

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
        }
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

  const checkParticipants = (callFrame: any) => {
    if (!callFrame) return
    const participants = callFrame.participants()
    const activeParticipants = Object.values(participants).filter((p: any) => p.session_id && p.video)
    setBothParticipantsJoined(activeParticipants.length >= 2)
  }

  useEffect(() => {
    if (!scriptLoaded || !callWrapperRef.current) return

    const initTimer = setTimeout(() => {
      if (!window.DailyIframe?.createFrame) {
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

      let joined = false
      let waitedMinTime = false

      const finalizeJoin = () => {
        if (joined && waitedMinTime) {
          setIsLoading(false)
          checkParticipants(callFrame)
        }
      }

      callFrame.on("joined-meeting", () => {
        joined = true
        finalizeJoin()
      })

      setTimeout(() => {
        waitedMinTime = true
        finalizeJoin()
      }, 5000)

      callFrame.on("participant-joined", () => checkParticipants(callFrame))
      callFrame.on("participant-left", () => checkParticipants(callFrame))
      callFrame.on("error", (e: any) => {
        console.error("🟥 Daily.co error", e)
        setError(`Erro da chamada: ${e?.errorMsg || e?.status || e?.errorType || "Erro desconhecido"}`)
        setIsLoading(false)
      })
      callFrame.on("camera-error", (e: any) => {
        setError(`Camera error: ${e?.errorMsg || "Could not access camera"}`)
        setIsLoading(false)
      })
      callFrame.on("left-meeting", async () => await handleEndCall())

      callFrameRef.current = callFrame
      window.callFrame = callFrame

      if (!roomUrl || !roomUrl.startsWith("https://")) {
        setError("A URL da sala de chamada está inválida ou não foi fornecida.")
        setIsLoading(false)
        return
      }

      const cleanRoomUrl = roomUrl.trim()

      // Espera 2 segundos antes de tentar entrar na sala
      setTimeout(() => {
        callFrame.join({ url: cleanRoomUrl })
      }, 2000)


      setTimeout(() => {
        if (isLoading) {
          console.warn("Timeout fallback — forcing end of loading")
          setIsLoading(false)
        }
      }, 15000)
    }, 4000)

    return () => {
      clearTimeout(initTimer)
      if (callFrameRef.current) {
        callFrameRef.current.destroy()
        window.callFrame = null
      }
    }
  }, [roomUrl, callId, router, scriptLoaded])

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      window.location.reload()
    } catch {
      setError("Could not access camera or microphone. Check browser permissions.")
    }
  }

  const retryConnection = () => {
    setError(null)
    setIsLoading(true)
    if (callFrameRef.current) {
      callFrameRef.current.destroy()
      callFrameRef.current = null
      window.callFrame = null
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
