import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Create the function to create tables if they don't exist
    const createTablesSQL = `
    CREATE OR REPLACE FUNCTION create_tables_if_not_exist()
    RETURNS void AS $$
    BEGIN
      -- Create users table if it doesn't exist
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE public.users (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          age INT,
          interests TEXT,
          last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_available BOOLEAN DEFAULT FALSE,
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      END IF;

      -- Create waiting_users table if it doesn't exist
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_users') THEN
        CREATE TABLE public.waiting_users (
          user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      END IF;

      -- Create matches table if it doesn't exist
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'matches') THEN
        CREATE TABLE public.matches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          mutual BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user1_id, user2_id)
        );
      END IF;

      -- Create calls table if it doesn't exist
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calls') THEN
        CREATE TABLE public.calls (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_url TEXT NOT NULL,
          user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          end_time TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      END IF;

      -- Create messages table if it doesn't exist
      IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        CREATE TABLE public.messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
          sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      END IF;
    END;
    $$ LANGUAGE plpgsql;
    `

    // Create function to create test users
    const createTestUserSQL = `
    CREATE OR REPLACE FUNCTION create_test_user(user_name text, user_age int, user_interests text)
    RETURNS uuid AS $$
    DECLARE
      new_user_id uuid;
    BEGIN
      -- Generate a new UUID
      new_user_id := gen_random_uuid();
      
      -- Insert the test user
      INSERT INTO public.users (id, name, age, interests, is_available)
      VALUES (new_user_id, user_name, user_age, user_interests, true);
      
      -- Return the new user ID
      RETURN new_user_id;
    END;
    $$ LANGUAGE plpgsql;
    `

    // Execute the SQL to create the functions
    await supabase.rpc("create_tables_if_not_exist")

    // Create the test user function
    const { error: fnError } = await supabase.sql(createTestUserSQL)
    if (fnError) {
      console.error("Error creating test user function:", fnError)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Setup DB error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to set up the database" })
}
