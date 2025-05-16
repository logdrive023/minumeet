import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()

    // Verificar autenticação
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Obter dados da requisição
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "ID da assinatura não fornecido" }, { status: 400 })
    }

    // Verificar se a assinatura pertence ao usuário
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", session.user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })
    }

    // Atualizar status da assinatura
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", subscriptionId)

    if (updateError) {
      console.error("Erro ao atualizar assinatura:", updateError)
      return NextResponse.json({ error: "Erro ao cancelar assinatura" }, { status: 500 })
    }

    // Atualizar plano do usuário para gratuito
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ subscription_plan: "free" })
      .eq("id", session.user.id)

    if (userUpdateError) {
      console.error("Erro ao atualizar plano do usuário:", userUpdateError)
      return NextResponse.json({ error: "Erro ao atualizar plano do usuário" }, { status: 500 })
    }

    // Registrar cancelamento no histórico de pagamentos
    await supabase.from("payment_history").insert({
      user_id: session.user.id,
      subscription_id: subscriptionId,
      amount: 0,
      status: "cancelled",
      payment_method: "cancellation",
      description: "Assinatura cancelada pelo usuário",
    })

    return NextResponse.json({ success: true, message: "Assinatura cancelada com sucesso" })
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
