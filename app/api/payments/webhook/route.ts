import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"


// Mercado Pago SDK
import { MercadoPagoConfig, Payment } from "mercadopago"

export async function POST(request: Request) {
  try {
    // 🔒 1) Captura o body cru como texto
    const rawBody = await request.text()

    // 🔒 2) Lê a assinatura que o Mercado Pago envia no header
    const incomingSig = request.headers.get("x-meli-signature") || ""

    // 🔒 3) Gera o HMAC-SHA256 do rawBody com o seu segredo
    const secret = process.env.MP_WEBHOOK_SECRET!
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")

    // 🔒 4) Compara; se não bater, rejeita
    if (incomingSig !== expectedSig) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
    const body = await request.json()

    // Validate webhook
    if (!body.data || !body.type) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }

    // Only process payment events
    if (body.type !== "payment") {
      return NextResponse.json({ message: "Ignoring non-payment event" })
    }

    const paymentId = body.data.id

    // Initialize Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!mercadoPagoAccessToken) {
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoAccessToken,
    })

    // Get payment details
    const payment = new Payment(client)
    const paymentData = await payment.get({ id: paymentId })

    if (!paymentData) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    const externalReference = paymentData.external_reference

    if (!externalReference) {
      return NextResponse.json({ error: "External reference not found" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get subscription by payment provider ID
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, status")
      .eq("payment_provider_id", externalReference)
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Process payment status
    if (paymentData.status === "approved" || paymentData.status === "authorized") {
      // Update subscription status
      const now = new Date()
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 1) // 1 month subscription

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_method_id: paymentData.payment_method_id,
          payment_details: {
            payment_id: paymentData.id,
            payment_status: paymentData.status,
            payment_date: now.toISOString(),
            payment_method: paymentData.payment_method,
          },
          updated_at: now.toISOString(),
        })
        .eq("id", subscription.id)

      // Update user's subscription plan
      const { data: plan } = await supabase.from("plans").select("name").eq("id", subscription.plan_id).single()

      if (plan) {
        await supabase
          .from("users")
          .update({
            subscription_plan: plan.name.toLowerCase(),
            updated_at: now.toISOString(),
          })
          .eq("id", subscription.user_id)
      }

      // Record payment in payment_history
      await supabase.from("payment_history").insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: paymentData.transaction_amount,
        currency: paymentData.currency_id,
        status: paymentData.status,
        provider: "mercadopago",
        provider_payment_id: paymentData.id.toString(),
        provider_data: paymentData,
      })
    } else if (paymentData.status === "rejected" || paymentData.status === "cancelled") {
      // Update subscription status
      await supabase
        .from("subscriptions")
        .update({
          status: "failed",
          payment_details: {
            payment_id: paymentData.id,
            payment_status: paymentData.status,
            payment_date: new Date().toISOString(),
            payment_method: paymentData.payment_method,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      // Record payment in payment_history
      await supabase.from("payment_history").insert({
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        amount: paymentData.transaction_amount,
        currency: paymentData.currency_id,
        status: paymentData.status,
        provider: "mercadopago",
        provider_payment_id: paymentData.id.toString(),
        provider_data: paymentData,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    })
  } catch (error: any) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: error.message || "Failed to process webhook" }, { status: 500 })
  }
}
