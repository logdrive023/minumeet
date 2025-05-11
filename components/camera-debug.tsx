"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CameraDebug() {
  const [cameraStatus, setCameraStatus] = useState<string>("Not checked")
  const [micStatus, setMicStatus] = useState<string>("Not checked")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const checkPermissions = async () => {
    try {
      setCameraStatus("Checking...")
      setMicStatus("Checking...")

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      setCameraStatus("✅ Allowed")
      setMicStatus("✅ Allowed")
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setShowPreview(true)
    } catch (err: any) {
      console.error("Media permission error:", err)

      if (err.name === "NotAllowedError") {
        setCameraStatus("❌ Blocked by user")
        setMicStatus("❌ Blocked by user")
      } else if (err.name === "NotFoundError") {
        setCameraStatus("❌ No camera found")
        setMicStatus("❌ No microphone found")
      } else {
        setCameraStatus(`❌ Error: ${err.name}`)
        setMicStatus(`❌ Error: ${err.name}`)
      }
    }
  }

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setShowPreview(false)
    }
  }

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Camera & Microphone Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-1">Camera:</p>
            <p className="text-sm">{cameraStatus}</p>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Microphone:</p>
            <p className="text-sm">{micStatus}</p>
          </div>
        </div>

        {showPreview && (
          <div className="relative aspect-video bg-gray-100 rounded-md overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={checkPermissions} className="flex-1">
            {showPreview ? "Recheck Permissions" : "Check Permissions"}
          </Button>
          {showPreview && (
            <Button variant="outline" onClick={stopStream}>
              Stop Camera
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
