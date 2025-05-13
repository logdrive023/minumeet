import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()

    // Obter o usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 })
    }

    // Remover o usuário da fila de espera
    await supabase.from("waiting_users").delete().eq("user_id", user.id)

    return NextResponse.json({ status: "success" })
  } catch (error: any) {
    console.error("Erro ao sair da fila:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
