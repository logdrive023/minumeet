"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export default function TestDailyPage() {
  const [roomUrl, setRoomUrl] = useState("https://v0.daily.co/hello")
  const [isJoined, setIsJoined] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const callFrameRef = useRef<any>(null)
  const callWrapperRef = useRef<HTMLDivElement>(null)

  // Load the Daily.co script manually
  useEffect(() => {
    // Check if script is already loaded
    if (document.querySelector('script[src="https://unpkg.com/@daily-co/daily-js"]')) {
      console.log("Daily.co script already exists")

      // Check if window.DailyIframe exists
      if (window.DailyIframe) {
        console.log("DailyIframe found in window")
        setScriptLoaded(true)
      } else {
        // Wait a bit and check again
        const checkTimer = setTimeout(() => {
          if (window.DailyIframe) {
            console.log("DailyIframe found after delay")
            setScriptLoaded(true)
          } else {
            console.error("DailyIframe not found even after delay")
            setError("Failed to load Daily.co script. Please refresh the page.")
          }
        }, 2000)

        return () => clearTimeout(checkTimer)
      }
      return
    }

    console.log("Loading Daily.co script...")
    const script = document.createElement("script")
    script.src = "https://unpkg.com/@daily-co/daily-js"
    script.async = true
    script.onload = () => {
      console.log("Daily.co script loaded")
      // Wait a bit to make sure DailyIframe is initialized
      setTimeout(() => {
        if (window.DailyIframe) {
          console.log("DailyIframe found in window after script load")
          setScriptLoaded(true)
          setError(null)
        } else {
          console.error("DailyIframe not found after script load")
          setError("Failed to initialize Daily.co. Please refresh the page.")
        }
      }, 1000)
    }
    script.onerror = () => {
      console.error("Failed to load Daily.co script")
      setError("Failed to load Daily.co script. Please check your internet connection.")
    }

    document.body.appendChild(script)

    return () => {
      // Don't remove the script on unmount as it might be needed by other components
    }
  }, [])

  const generateRoom = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/create-daily-room", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to create room: ${response.status}`)
      }

      const data = await response.json()
      console.log("Room created:", data)

      if (data.url) {
        setRoomUrl(data.url)
      } else {
        throw new Error("No room URL returned")
      }
    } catch (err: any) {
      console.error("Error generating room:", err)
      setError(`Failed to generate room: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const joinRoom = () => {
    setError(null)

    if (!scriptLoaded) {
      setError("Daily.co script not loaded yet. Please wait a moment and try again.")
      return
    }

    if (!callWrapperRef.current) {
      setError("Video container not found. Please refresh the page.")
      return
    }

    try {
      if (!window.DailyIframe) {
        setError("DailyIframe not found in window. Please refresh the page.")
        return
      }

      console.log("Creating Daily.co frame...")

      // Destroy existing frame if any
      if (callFrameRef.current) {
        callFrameRef.current.destroy()
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
      })

      callFrameRef.current = callFrame

      callFrame.on("joining-meeting", () => {
        console.log("Joining meeting...")
      })

      callFrame.on("joined-meeting", () => {
        console.log("Joined meeting!")
        setIsJoined(true)
        setError(null)
      })

      callFrame.on("error", (e: any) => {
        console.error("Daily.co error:", e)
        setError(`Video call error: ${e?.errorMsg || JSON.stringify(e)}`)
      })

      callFrame.on("left-meeting", () => {
        console.log("Left meeting")
        setIsJoined(false)
      })

      console.log(`Joining room: ${roomUrl}`)
      callFrame.join({ url: roomUrl })
    } catch (err: any) {
      console.error("Error setting up video call:", err)
      setError(`Failed to set up video call: ${err.message}`)
    }
  }

  const leaveRoom = () => {
    if (callFrameRef.current) {
      callFrameRef.current.leave()
    }
  }

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      alert("Camera and microphone access granted!")
    } catch (err: any) {
      setError(`Could not access camera or microphone: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <Card className="w-full max-w-md mb-4">
        <CardHeader>
          <CardTitle>Test Daily.co Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Room URL</label>
            <div className="flex gap-2">
              <Input
                value={roomUrl}
                onChange={(e) => setRoomUrl(e.target.value)}
                placeholder="https://your-domain.daily.co/room-name"
              />
              <Button onClick={generateRoom} disabled={isGenerating} variant="secondary">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={joinRoom} disabled={isJoined}>
              Join Room
            </Button>
            <Button onClick={leaveRoom} disabled={!isJoined} variant="outline">
              Leave Room
            </Button>
            <Button onClick={requestCameraPermission} variant="secondary">
              Test Camera
            </Button>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>}

          <div className="text-xs text-gray-500">Script Status: {scriptLoaded ? "Loaded ✅" : "Not Loaded ❌"}</div>
        </CardContent>
      </Card>

      <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
        <div ref={callWrapperRef} className="w-full h-full" />
      </div>
    </div>
  )
}

// Add this to make TypeScript happy
declare global {
  interface Window {
    DailyIframe: any
  }
}
