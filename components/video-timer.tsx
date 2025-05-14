"use client"

import { useState, useEffect, useRef, MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"

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

  const handleEndCall = async () => {
    try {
      // 1. Obter informações da chamada do banco de dados
      const supabase = getSupabaseClient()
      const { data: callData, error: callError } = await supabase
        .from("calls")
        .select("room_url")
        .eq("id", callId)
        .single()

      if (callError) {
        console.error("Erro ao buscar informações da chamada:", callError)
        throw callError
      }

      // 2. Extrair o nome da sala do URL
      const roomName = callData.room_url.split("/").pop()

      // 3. Encerrar a sala no Daily.co
      if (roomName) {
        try {
          // Tentar encerrar a sala via API do Daily.co
          const response = await fetch(`/api/end-daily-room`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ roomName }),
          })

          if (!response.ok) {
            console.warn("Não foi possível encerrar a sala via API:", await response.text())
          }
        } catch (apiError) {
          console.error("Erro ao chamar API para encerrar sala:", apiError)
          // Continuar mesmo se a API falhar
        }
      }

      // 4. Encerrar a chamada no banco de dados
      await supabase.from("calls").update({ end_time: new Date().toISOString() }).eq("id", callId)

      // 5. Encerrar a chamada localmente
      if (window.DailyIframe && window.callFrame) {
        try {
          window.callFrame.leave()
          window.callFrame.destroy()
        } catch (dailyError) {
          console.error("Erro ao encerrar chamada no cliente:", dailyError)
        }
      }

      // 6. Redirecionar para a página de feedback
      if (onEndCall) {
        onEndCall()
      } else {
        router.push(`/feedback/${callId}`)
      }
    } catch (error) {
      console.error("Erro ao encerrar chamada:", error)
      // Em caso de erro, ainda tentamos redirecionar o usuário
      if (onEndCall) {
        onEndCall()
      } else {
        router.push(`/feedback/${callId}`)
      }
    }
  }


  // posição do card
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  // refs para drag
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const initPosRef = useRef({ x: 0, y: 0 })

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    draggingRef.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initPosRef.current = { ...position }
    window.addEventListener("mousemove", onMouseMove as any)
    window.addEventListener("mouseup", onMouseUp)
  }

  // posicionar no top-right na primeira montagem
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const { width } = el.getBoundingClientRect()
    const margin = 16
    setPosition({
      x: window.innerWidth - width - margin,
      y: margin,
    })
  }, [])

  // funções de drag
  const onMouseMove = (e: MouseEvent<Document>) => {
    if (!draggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPosition({
      x: initPosRef.current.x + dx,
      y: initPosRef.current.y + dy,
    })
  }
  const onMouseUp = () => {
    draggingRef.current = false
    window.removeEventListener("mousemove", onMouseMove as any)
    window.removeEventListener("mouseup", onMouseUp)
  }

  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 50,
      }}
    >
      <Card className="bg-black bg-opacity-80 text-white">
        <CardContent className="p-3 flex items-center justify-between">
          {/* apenas este DIV inicia o drag */}
          <div
            onMouseDown={onMouseDown}
            className="cursor-move select-none text-xl font-bold"
            title="Segure e arraste"
          >
            {!timerActive ? "Esperando..." : formatTime(timeLeft)}
          </div>

          {/* botão normal, sem drag */}
          <Button type="button" variant="destructive" size="sm" onClick={handleEndCall}>
            Encerrar Chamada
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Adicionar declaração para o objeto global
declare global {
  interface Window {
    DailyIframe: any
    callFrame: any
  }
}
