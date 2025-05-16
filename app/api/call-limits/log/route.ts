import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user subscription plan (default to free)
    const { data: userData } = await supabase.from("users").select("subscription_plan").eq("id", user.id).single()

    // Determine max calls based on subscription plan
    let maxCalls = 10 // Default for free plan
    if (userData?.subscription_plan === "basic") {
      maxCalls = 30
    } else if (userData?.subscription_plan === "premium") {
      maxCalls = 100
    }

    // Log the call and check if it's allowed
    const { data: isAllowed, error } = await supabase.rpc("log_call_and_check_limit", {
      p_user_id: user.id,
      p_max_calls: maxCalls,
    })

    if (error) throw error

    if (!isAllowed) {
      return NextResponse.json(
        {
          allowed: false,
          message: "Daily call limit reached",
          plan: userData?.subscription_plan || "free",
          max: maxCalls,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      allowed: true,
      message: "Call logged successfully",
      plan: userData?.subscription_plan || "free",
    })
  } catch (error: any) {
    console.error("Log call error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
