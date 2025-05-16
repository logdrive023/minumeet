"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import WaitingAnimation from "@/components/waiting-animation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function JoinQueue({ userId }: { userId: string }) {
  const [isJoining, setIsJoining] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tablesExist, setTablesExist] = useState<boolean | null>(null)
  const [matchFoundAt, setMatchFoundAt] = useState<Date | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [limitMessage, setLimitMessage] = useState("")
  const [plan, setPlan] = useState("free")
  const [maxCalls, setMaxCalls] = useState(10)
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Verifica existência das tabelas
  useEffect(() => {
    const checkTables = async () => {
      try {
        const { error } = await supabase.from("users").select("id").limit(1)
        if (error) return setTablesExist(false)
        await supabase.rpc("create_tables_if_not_exist")
        setTablesExist(true)
      } catch {
        setTablesExist(false)
      }
    }
    checkTables()
  }, [supabase])

  // Verifica se usuário já está na fila
  useEffect(() => {
    if (tablesExist !== true) return

    const check = async () => {
      const { data } = await supabase
        .from("waiting_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle()

      setIsInQueue(Boolean(data))
    }

    check()
  }, [tablesExist, supabase, userId])

  // Polling para matchmaking
  useEffect(() => {
    if (!isInQueue || tablesExist !== true) return

    const interval = setInterval(async () => {
      try {
        // Verifica se usuário ainda está na fila
        const { data: stillWaiting } = await supabase
          .from("waiting_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle()

        if (!stillWaiting) {
          const { data: activeCall } = await supabase
            .from("calls")
            .select("id, room_url")
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .is("end_time", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (activeCall) {
            const now = new Date()
            const waited = matchFoundAt ? now.getTime() - matchFoundAt.getTime() : 0
            const MIN_DELAY = 5000

            if (waited >= MIN_DELAY) {
              router.push(`/call/${activeCall.id}?room=${encodeURIComponent(activeCall.room_url)}`)
            } else {
              setTimeout(() => {
                router.push(`/call/${activeCall.id}?room=${encodeURIComponent(activeCall.room_url)}`)
              }, MIN_DELAY - waited)
            }
            return
          }
        }

        const res = await fetch("/api/matchmaking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })

        if (!res.ok) return

        const data = await res.json()
        if (data.status === "matched") {
          setMatchFoundAt(new Date())

          // 🔥 Redirecionar imediatamente se já tem a chamada
          router.push(`/call/${data.callId}?room=${encodeURIComponent(data.roomUrl)}`)
          return
        }

      } catch (err) {
        console.error("Erro no matchmaking:", err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isInQueue, userId, router, supabase, tablesExist, matchFoundAt])

  const joinQueue = async () => {
    if (tablesExist !== true) {
      setError("As tabelas do banco não foram configuradas.")
      return
    }

    setIsJoining(true)
    setLimitReached(false)
    setError(null)

    try {
      // Verifica chamada ativa
      const { data: call } = await supabase
        .from("calls")
        .select("id, room_url")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .is("end_time", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (call) {
        router.push(`/call/${call.id}?room=${encodeURIComponent(call.room_url)}`)
        return
      }

      // Garante usuário na tabela
      const { error: userError } = await supabase
        .from("users")
        .upsert({ id: userId, name: "User", is_available: true })

      if (userError) throw userError

      // Entra na fila
      const { error: queueError } = await supabase
        .from("waiting_users")
        .upsert({ user_id: userId })

      if (queueError) throw queueError

      // Marca como disponível
      const { error: availableError } = await supabase
        .from("users")
        .update({ is_available: true })
        .eq("id", userId)

      if (availableError) throw availableError

      setIsInQueue(true)
      setIsSearching(true)
      setMatchFoundAt(new Date()) // começa contagem mínima

      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.status === 403 && data.status === "limit_reached") {
        setLimitReached(true)
        setLimitMessage(data.message || "Limite diário de chamadas atingido")
        setPlan(data.plan || "free")
        setMaxCalls(data.max || 10)
        setIsSearching(false)    // para o spinner de busca
        return
      }

    } catch (err: any) {
      setError(err.message || "Erro ao entrar na fila.")
      setIsInQueue(false)
    } finally {
      setIsJoining(false)
    }
  }

  const leaveQueue = async () => {
    setIsJoining(true)
    setError(null)
    try {
      await supabase.from("waiting_users").delete().eq("user_id", userId)
      await supabase.from("users").update({ is_available: false }).eq("id", userId)
      setIsInQueue(false)
      setIsSearching(false)
      setMatchFoundAt(null)
      router.push("/home")
    } catch (err: any) {
      setError(err.message || "Erro ao sair da fila.")
    } finally {
      setIsJoining(false)
    }
  }

  if (tablesExist === null) {
    return (
      <div className="flex flex-col items-center justify-center">
        <WaitingAnimation />
        <p className="text-white mt-4">Verificando banco de dados...</p>
      </div>
    )
  }

  if (tablesExist === false) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Banco de dados ausente</AlertTitle>
          <AlertDescription>
            As tabelas necessárias ainda não foram criadas. Execute o script no Supabase.
          </AlertDescription>
        </Alert>
        <Link href="/home">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    )
  }

  if (isInQueue) {
    return (
      <div className="flex flex-col items-center gap-6">
        <WaitingAnimation />
        <p className="text-white">Procurando alguém para te conectar...</p>
        <Button
          variant="outline"
          onClick={leaveQueue}
          disabled={isJoining}
          className="bg-white text-pink-600 hover:bg-gray-100"
        >
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-3xl font-bold text-white mb-2">Pronto para conhecer alguém?</h1>
      <p className="text-white text-opacity-80 max-w-md">
        Clique no botão abaixo para entrar na fila e ser pareado com alguém para uma videochamada de 1 minuto.
      </p>
      {error && <p className="text-red-300">{error}</p>}
      <Button onClick={joinQueue} disabled={isJoining} size="lg" className="bg-white text-pink-600 hover:bg-gray-100">
        {isJoining ? "Juntando-se..." : "Entrar na fila"}
      </Button>
      <Button variant="ghost" onClick={() => router.push("/home")} className="text-white hover:bg-white/10">
        Voltar
      </Button>
    </div>
  )
}
