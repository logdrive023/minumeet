import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Setup subscription tables
    const setupSQL = `
    -- Ensure subscription_plan field exists in users table
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

    -- Create plans table if it doesn't exist
    CREATE TABLE IF NOT EXISTS plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'BRL',
      interval VARCHAR(20) DEFAULT 'month',
      daily_calls INTEGER NOT NULL,
      features JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create subscriptions table if it doesn't exist
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES plans(id),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      payment_provider VARCHAR(50) DEFAULT 'mercadopago',
      payment_provider_id VARCHAR(255),
      payment_method_id VARCHAR(255),
      payment_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create payment_history table if it doesn't exist
    CREATE TABLE IF NOT EXISTS payment_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'BRL',
      status VARCHAR(20) NOT NULL,
      provider VARCHAR(50) DEFAULT 'mercadopago',
      provider_payment_id VARCHAR(255),
      provider_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create boost_logs table if it doesn't exist
    CREATE TABLE IF NOT EXISTS boost_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      boost_type VARCHAR(50) NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Insert default plans if they don't exist
    INSERT INTO plans (name, description, price, daily_calls, features)
    VALUES 
      ('Free', 'Plano gratuito com recursos básicos', 0.00, 10, '{"boosts_per_month": 0, "call_duration": 60}'::jsonb)
    ON CONFLICT DO NOTHING;

    INSERT INTO plans (name, description, price, daily_calls, features)
    VALUES 
      ('Basic', 'Plano básico com mais chamadas diárias', 9.90, 30, '{"boosts_per_month": 1, "call_duration": 60}'::jsonb)
    ON CONFLICT DO NOTHING;

    INSERT INTO plans (name, description, price, daily_calls, features)
    VALUES 
      ('Premium', 'Plano premium com recursos exclusivos', 19.90, 100, '{"boosts_per_month": 3, "call_duration": 180, "premium_badge": true}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- Create function to get user's active plan
    CREATE OR REPLACE FUNCTION get_user_active_plan(p_user_id UUID)
    RETURNS TABLE (
      plan_id UUID,
      plan_name VARCHAR(50),
      daily_calls INTEGER,
      features JSONB
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT p.id, p.name, p.daily_calls, p.features
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
      ORDER BY s.created_at DESC
      LIMIT 1;
    END;
    $$ LANGUAGE plpgsql;

    -- Create function to check if user has available boosts
    CREATE OR REPLACE FUNCTION get_available_boosts(p_user_id UUID)
    RETURNS INTEGER AS $$
    DECLARE
      v_plan_features JSONB;
      v_boosts_per_month INTEGER;
      v_used_boosts INTEGER;
      v_period_start TIMESTAMP WITH TIME ZONE;
      v_period_end TIMESTAMP WITH TIME ZONE;
    BEGIN
      -- Get user's active subscription
      SELECT s.current_period_start, s.current_period_end, p.features
      INTO v_period_start, v_period_end, v_plan_features
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
      ORDER BY s.created_at DESC
      LIMIT 1;
      
      IF v_plan_features IS NULL THEN
        RETURN 0;
      END IF;
      
      -- Get boosts per month from plan features
      v_boosts_per_month := (v_plan_features->>'boosts_per_month')::INTEGER;
      
      -- Count used boosts in current period
      SELECT COUNT(*)
      INTO v_used_boosts
      FROM boost_logs
      WHERE user_id = p_user_id
      AND used_at >= COALESCE(v_period_start, NOW() - INTERVAL '30 days')
      AND used_at <= COALESCE(v_period_end, NOW());
      
      -- Return available boosts
      RETURN GREATEST(0, v_boosts_per_month - v_used_boosts);
    END;
    $$ LANGUAGE plpgsql;
    `

    // Execute the SQL
    await supabase.rpc("exec_sql", { sql: setupSQL })

    return NextResponse.json({ success: true, message: "Subscription tables setup completed successfully" })
  } catch (error: any) {
    console.error("Setup subscription tables error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
