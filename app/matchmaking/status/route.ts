import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { useV2 } = await request.json()
    const cookieStore = cookies()
    const supabase = createServerClient()

    // Obter o usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 })
    }

    // Verificar se o usuário já está em uma chamada ativa
    const { data: activeCall } = await supabase
      .from("calls")
      .select("id, room_url")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeCall) {
      return NextResponse.json({
        status: "matched",
        callId: activeCall.id,
        roomUrl: activeCall.room_url,
      })
    }

    // Verificar se o usuário ainda está na fila
    const { data: waitingUser } = await supabase.from("waiting_users").select("*").eq("user_id", user.id).maybeSingle()

    if (!waitingUser) {
      return NextResponse.json({ status: "not_in_queue" })
    }

    // Escolher a API de matchmaking com base na preferência
    const apiEndpoint = useV2 ? "/api/matchmaking-v2" : "/api/matchmaking"

    // Tentar novamente o matchmaking
    const response = await fetch(new URL(apiEndpoint, request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStore.toString(),
      },
      body: JSON.stringify({ userId: user.id }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Erro ao verificar status da fila:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
