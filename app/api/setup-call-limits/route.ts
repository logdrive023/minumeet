import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Create call_logs table and related functions
    const setupSQL = `
    -- Create call_logs table if it doesn't exist
    CREATE TABLE IF NOT EXISTS call_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      call_date DATE NOT NULL DEFAULT CURRENT_DATE,
      call_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, call_date)
    );

    -- Create function to get remaining calls for a user
    CREATE OR REPLACE FUNCTION get_remaining_calls(p_user_id UUID, p_max_calls INTEGER DEFAULT 10)
    RETURNS INTEGER AS $$
    DECLARE
      v_used_calls INTEGER;
    BEGIN
      -- Get calls used today
      SELECT COALESCE(call_count, 0) INTO v_used_calls
      FROM call_logs
      WHERE user_id = p_user_id AND call_date = CURRENT_DATE;
      
      -- Return remaining calls
      RETURN GREATEST(0, p_max_calls - COALESCE(v_used_calls, 0));
    END;
    $$ LANGUAGE plpgsql;

    -- Create function to log a call and check limits
    CREATE OR REPLACE FUNCTION log_call_and_check_limit(p_user_id UUID, p_max_calls INTEGER DEFAULT 10)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_remaining INTEGER;
    BEGIN
      -- Get remaining calls before logging
      v_remaining := get_remaining_calls(p_user_id, p_max_calls);
      
      IF v_remaining <= 0 THEN
        -- No calls remaining
        RETURN FALSE;
      END IF;
      
      -- Log the call
      INSERT INTO call_logs (user_id, call_date, call_count)
      VALUES (p_user_id, CURRENT_DATE, 1)
      ON CONFLICT (user_id, call_date)
      DO UPDATE SET 
        call_count = call_logs.call_count + 1,
        updated_at = NOW();
        
      RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql;

    -- Create function to reset call counts (for testing)
    CREATE OR REPLACE FUNCTION reset_call_logs(p_user_id UUID)
    RETURNS VOID AS $$
    BEGIN
      DELETE FROM call_logs WHERE user_id = p_user_id AND call_date = CURRENT_DATE;
    END;
    $$ LANGUAGE plpgsql;
    `

    // Execute the SQL to create the table and functions
    await supabase.rpc("exec_sql", { sql: setupSQL })

    return NextResponse.json({ success: true, message: "Call limits setup completed successfully" })
  } catch (error: any) {
    console.error("Setup call limits error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
