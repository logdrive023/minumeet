import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { status } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID da denúncia não fornecido" }, { status: 400 })
    }

    if (!status || !["resolved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verificar se o usuário está autenticado
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Atualizar o status da denúncia
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Erro ao atualizar denúncia:", error)
    return NextResponse.json({ error: error.message || "Erro desconhecido" }, { status: 500 })
  }
}
