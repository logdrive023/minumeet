import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Add subscription_plan field to users table
    const setupSQL = `
    -- Add subscription_plan field if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'subscription_plan'
      ) THEN
        ALTER TABLE public.users ADD COLUMN subscription_plan VARCHAR(20) DEFAULT 'free';
      END IF;
    END
    $$;
    `

    // Execute the SQL
    await supabase.rpc("exec_sql", { sql: setupSQL })

    return NextResponse.json({ success: true, message: "Subscription field added successfully" })
  } catch (error: any) {
    console.error("Setup subscription field error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
