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

    // Reset call logs for the user
    const { error } = await supabase.rpc("reset_call_logs", {
      p_user_id: user.id,
    })

    if (error) throw error

    return NextResponse.json({ success: true, message: "Call logs reset successfully" })
  } catch (error: any) {
    console.error("Reset call logs error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
