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

    // Escolher a API de matchmaking com base na preferência
    const apiEndpoint = useV2 ? "/api/matchmaking-v2" : "/api/matchmaking"

    // Chamar a API de matchmaking apropriada
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
    console.error("Erro ao entrar na fila:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
