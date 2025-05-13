"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"

export default function CameraDebug() {
  const [cameraStatus, setCameraStatus] = useState<string>("Não verificado")
  const [micStatus, setMicStatus] = useState<string>("Não verificado")
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
    <div className="w-full space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 p-2 rounded text-center">
          <p className="text-xs font-medium mb-1">Câmera:</p>
          <p className="text-sm">{cameraStatus}</p>
        </div>
        <div className="bg-gray-50 p-2 rounded text-center">
          <p className="text-xs font-medium mb-1">Microfone:</p>
          <p className="text-sm">{micStatus}</p>
        </div>
      </div>

      {showPreview && (
        <div className="relative aspect-video bg-gray-100 rounded-md overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={checkPermissions}
          size="sm"
          className="w-full bg-white hover:bg-gray-100 text-pink-600 transition-all duration-300"
        >
          {showPreview ? "Verifique novamente a câmera" : "Verifique a câmera"}
        </Button>
        {showPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={stopStream}
            className="w-full hover:bg-pink-50 transition-all duration-300"
          >
            Parar Câmera 
          </Button>
        )}
      </div>
    </div>
  )
}
