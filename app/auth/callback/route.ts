import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = createServerClient()
    await supabase.auth.exchangeCodeForSession(code)

    // After exchanging the code for a session, redirect to home
    return NextResponse.redirect(`${origin}/home`)
  }

  // If no code is provided, redirect to the login page
  return NextResponse.redirect(`${origin}/`)
}
