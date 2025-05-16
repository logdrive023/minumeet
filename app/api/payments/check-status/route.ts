import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Mercado Pago SDK
import { MercadoPagoConfig, Payment } from "mercadopago"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("paymentId")

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get subscription by payment provider ID
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, status, payment_details")
      .eq("payment_provider_id", paymentId)
      .single()

    if (subscriptionError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // If subscription is already active, return success
    if (subscription.status === "active") {
      return NextResponse.json({
        status: "approved",
        subscription_id: subscription.id,
      })
    }

    // Initialize Mercado Pago
    const mercadoPagoAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!mercadoPagoAccessToken) {
      return NextResponse.json({ error: "Mercado Pago access token not configured" }, { status: 500 })
    }

    const client = new MercadoPagoConfig({
      accessToken: mercadoPagoAccessToken,
    })

    // Check payment status using the preference ID
    const preferenceId = subscription.payment_details?.preference_id

    if (!preferenceId) {
      return NextResponse.json({ error: "Preference ID not found" }, { status: 400 })
    }

    // Get payments associated with this preference
    const payment = new Payment(client)
    const searchResult = await payment.search({
      options: {
        criteria: "desc",
        limit: 1,
      },
      filters: {
        external_reference: paymentId,
      },
    })

    if (!searchResult.paging.total) {
      return NextResponse.json({ status: "pending", message: "No payment found" })
    }

    const latestPayment = searchResult.results[0]

    // Process payment status
    if (latestPayment.status === "approved" || latestPayment.status === "authorized") {
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
          payment_method_id: latestPayment.payment_method_id,
          payment_details: {
            ...subscription.payment_details,
            payment_id: latestPayment.id,
            payment_status: latestPayment.status,
            payment_date: now.toISOString(),
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
        amount: latestPayment.transaction_amount,
        currency: latestPayment.currency_id,
        status: latestPayment.status,
        provider: "mercadopago",
        provider_payment_id: latestPayment.id.toString(),
        provider_data: latestPayment,
      })
    }

    return NextResponse.json({
      status: latestPayment.status,
      payment_id: latestPayment.id,
      subscription_id: subscription.id,
    })
  } catch (error: any) {
    console.error("Check payment status error:", error)
    return NextResponse.json({ error: error.message || "Failed to check payment status" }, { status: 500 })
  }
}
