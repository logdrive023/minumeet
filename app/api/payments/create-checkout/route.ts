import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Obter o cliente Supabase
    const supabase = createServerComponentClient({ cookies })

    // Verificar autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Obter dados do corpo da requisição
    const { planId } = await request.json()

    if (!planId) {
      return NextResponse.json({ error: "ID do plano não fornecido" }, { status: 400 })
    }

    // Buscar detalhes do plano
    const { data: planData, error: planError } = await supabase.from("plans").select("*").eq("id", planId).single()

    if (planError || !planData) {
      console.error("Erro ao buscar plano:", planError)
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Buscar dados do usuário
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", user.id)
      .single()


    if (userError || !userData) {
      console.log("Dados do usuário:", userData)
      console.error("Erro ao buscar dados do usuário:", userError)
      return NextResponse.json({ error: "Erro ao buscar dados do usuário" }, { status: 500 })
    }

    // Configurar a preferência de pagamento do Mercado Pago
    const mercadoPagoUrl = "https://api.mercadopago.com/checkout/preferences"

    // Obter a URL base da aplicação
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Criar um ID de referência único para esta transação
    const referenceId = `${user.id}_${planId}_${Date.now()}`

    const testBuyerId = process.env.MP_TEST_BUYER_ID || "123456789";


    // Configurar os dados do pagamento
    const paymentData = {
      items: [
        {
          id: planData.id,
          title: planData.name,
          description: planData.description,
          quantity: 1,
          currency_id: planData.currency,
          unit_price: Number.parseFloat(planData.price),
        },
      ],
      payer: {
        type: "customer",                   // opcional mas recomendado
        email:userData.email,
        name: userData.name?.split(" ")[0] || "Usuário",
        surname: userData.name?.split(" ").slice(1).join(" ") || "",
      },
      back_urls: {
        success: `${appUrl}/payment/success?reference=${referenceId}`,
        failure: `${appUrl}/payment/failure?reference=${referenceId}`,
        pending: `${appUrl}/payment/pending?reference=${referenceId}`,
      },
      auto_return: "approved",
      external_reference: referenceId,
      statement_descriptor: "OneMinute Assinatura",
    }
    console.log("Aqui dentro")

    console.log("Enviando dados para o Mercado Pago:", JSON.stringify(paymentData, null, 2))
    console.log("URL da API do Mercado Pago:", mercadoPagoUrl)
    console.log("Token de acesso do Mercado Pago disponível:", !!process.env.MERCADOPAGO_ACCESS_TOKEN)

    // Fazer a requisição para o Mercado Pago
    const mpResponse = await fetch(mercadoPagoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(paymentData),
    })

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error("Erro na resposta do Mercado Pago:", errorText)
      return NextResponse.json(
        { error: `Erro ao criar preferência de pagamento: ${mpResponse.status} ${mpResponse.statusText}` },
        { status: 500 },
      )
    }

    const mpData = await mpResponse.json()
    console.log("Resposta do Mercado Pago:", JSON.stringify(mpData, null, 2))

    if (!mpData.init_point) {
      console.error("URL de checkout não encontrada na resposta do Mercado Pago")
      return NextResponse.json({ error: "URL de checkout não encontrada" }, { status: 500 })
    }

    // Registrar a tentativa de pagamento no banco de dados
    const { data: paymentRecord, error: paymentError } = await supabase.from("payment_history").insert({
      user_id: user.id,
      plan_id: planData.id,
      amount: Number.parseFloat(planData.price),
      currency: planData.currency,
      status: "pending",
      payment_method: "mercado_pago",
      reference_id: referenceId,
      metadata: {
        preference_id: mpData.id,
        init_point: mpData.init_point,
      },
    })

    if (paymentError) {
      console.error("Erro ao registrar pagamento:", paymentError)
      // Continuar mesmo com erro no registro
    }

    // Retornar a URL de checkout
    return NextResponse.json({ checkoutUrl: mpData.init_point })
  } catch (error) {
    console.error("Erro ao processar requisição:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
