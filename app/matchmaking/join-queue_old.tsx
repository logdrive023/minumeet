"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import WaitingAnimation from "@/components/waiting-animation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function JoinQueue({ userId }: { userId: string }) {
  const [isJoining, setIsJoining] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tablesExist, setTablesExist] = useState<boolean | null>(null) // null means we haven't checked yet
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Check if tables exist using a different approach
  useEffect(() => {
    const checkTablesExist = async () => {
      try {
        // Try to query the users table first (which should exist if the user is logged in)
        const { error: usersError } = await supabase.from("users").select("id").limit(1)

        if (usersError) {
          console.log("Users table error:", usersError.message)
          setTablesExist(false)
          return
        }

        // If we get here, at least the users table exists
        // Let's create the other tables if they don't exist
        await createRequiredTables()

        // Set tables as existing
        setTablesExist(true)
      } catch (err: any) {
        console.error("Exception checking tables:", err)
        setTablesExist(false)
      }
    }

    checkTablesExist()
  }, [supabase])

  // Function to create required tables
  const createRequiredTables = async () => {
    try {
      // Create waiting_users table if it doesn't exist
      await supabase.rpc("create_tables_if_not_exist")
      return true
    } catch (error) {
      console.error("Error creating tables:", error)
      return false
    }
  }

  // Check if user is already in an active call
  useEffect(() => {
    if (tablesExist !== true) return

    const checkActiveCall = async () => {
      try {
        const { data: activeCall, error } = await supabase
          .from("calls")
          .select("id, room_url")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .is("end_time", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error("Error checking active call:", error)
          return
        }

        if (activeCall) {
          console.log("User already in active call:", activeCall)
          // Redirect to the active call
          router.push(`/call/${activeCall.id}?room=${encodeURIComponent(activeCall.room_url)}`)
        }
      } catch (err) {
        console.error("Exception checking active call:", err)
      }
    }

    checkActiveCall()
  }, [userId, router, supabase, tablesExist])

  // Check for matches periodically
  useEffect(() => {
    if (!isInQueue || tablesExist !== true) return

    const checkForMatch = async () => {
      try {
        // Verifica se usuário foi removido da fila
        const { data: stillWaiting } = await supabase
          .from("waiting_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle()

        // Se não está mais esperando, verifica se caiu em uma call
        if (!stillWaiting) {
          const { data: activeCall } = await supabase
            .from("calls")
            .select("id, room_url")
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .is("end_time", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (activeCall) {
            router.push(`/call/${activeCall.id}?room=${encodeURIComponent(activeCall.room_url)}`)
            return
          }
        }

        // Dispara o matchmaking APENAS se ainda está esperando
        const response = await fetch("/api/matchmaking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        })

        if (!response.ok) throw new Error(`Matchmaking API error: ${response.status}`)

        const data = await response.json()

        // Só redireciona se o backend sinalizou match de verdade
        if (data.status === "matched") {
          router.push(`/call/${data.callId}?room=${encodeURIComponent(data.roomUrl)}`)
        }

      } catch (error) {
        console.error("Erro ao buscar match:", error)
      }
    }

    const interval = setInterval(checkForMatch, 3000)
    return () => clearInterval(interval)
  }, [isInQueue, userId, router, supabase, tablesExist])


  const joinQueue = async () => {
    if (tablesExist !== true) {
      setError("Database tables not set up properly. Please contact support.")
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      // First, make sure the user exists in the users table
      const { data: userData, error: userError } = await supabase.from("users").select("id").eq("id", userId).single()

      if (userError) {
        // User doesn't exist, create a basic record
        const { error: insertError } = await supabase
          .from("users")
          .insert({ id: userId, name: "User", is_available: true })

        if (insertError) throw insertError
      }

      // Check if user is already in an active call
      const { data: activeCall } = await supabase
        .from("calls")
        .select("id, room_url")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .is("end_time", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeCall) {
        // User already in active call, redirect
        router.push(`/call/${activeCall.id}?room=${encodeURIComponent(activeCall.room_url)}`)
        return
      }

      // Now try to add to waiting_users
      const { error: joinError } = await supabase.from("waiting_users").upsert({ user_id: userId })

      if (joinError) throw joinError

      // Update user availability
      const { error: updateError } = await supabase.from("users").update({ is_available: true }).eq("id", userId)

      if (updateError) throw updateError

      setIsInQueue(true)

      // Trigger the matchmaking function
       try {
         await fetch("/api/matchmaking", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify({ userId }),
         })
       } catch (fetchError) {
         console.error("Error triggering matchmaking:", fetchError)
         // Continue anyway, as the polling will still work
       }
    } catch (error: any) {
      setError(error.message || "Error joining queue")
      setIsInQueue(false)
    } finally {
      setIsJoining(false)
    }
  }

  const leaveQueue = async () => {
    setIsJoining(true)
    setError(null)

    try {
      // Remove user from waiting_users table
      const { error: leaveError } = await supabase.from("waiting_users").delete().eq("user_id", userId)

      if (leaveError && !leaveError.message.includes("does not exist")) throw leaveError

      // Update user availability
      const { error: updateError } = await supabase.from("users").update({ is_available: false }).eq("id", userId)

      if (updateError) throw updateError

      setIsInQueue(false)
      router.push("/home")
    } catch (error: any) {
      setError(error.message || "Error leaving queue")
    } finally {
      setIsJoining(false)
    }
  }

  // Check if user is already in queue on component mount
  useEffect(() => {
    const checkQueueStatus = async () => {
      // Only check queue status if tables exist
      if (tablesExist !== true) return

      try {
        const { data, error } = await supabase.from("waiting_users").select("*").eq("user_id", userId).maybeSingle()

        // If the error is not about the table not existing
        if (error && !error.message.includes("does not exist")) {
          console.error("Error checking queue status:", error)
          return
        }

        setIsInQueue(!!data)
      } catch (error) {
        // Only log the error if it's not related to the table not existing
        console.error("Exception checking queue status:", error)
      }
    }

    if (tablesExist === true) {
      checkQueueStatus()
    }
  }, [userId, supabase, tablesExist])

  // Show loading state while checking if tables exist
  if (tablesExist === null) {
    return (
      <div className="flex flex-col items-center justify-center">
        <WaitingAnimation />
        <p className="text-white mt-4">Checking database setup...</p>
      </div>
    )
  }

  // Show setup instructions if tables don't exist
  if (tablesExist === false) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            The required database tables have not been set up yet. Please run the SQL setup script in your Supabase
            dashboard.
          </AlertDescription>
        </Alert>
        <div className="bg-white p-4 rounded-md w-full">
          <h3 className="font-bold mb-2">Required Tables:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>users</li>
            <li>waiting_users</li>
            <li>matches</li>
            <li>calls</li>
          </ul>
          <div className="mt-4">
            <p className="text-sm mb-2">Run this SQL in your Supabase SQL Editor:</p>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-60">
              {`-- Create a function to create tables if they don't exist
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

-- Execute the function to create tables
SELECT create_tables_if_not_exist();`}
            </pre>
          </div>
        </div>
        <Link href="/home">
          <Button variant="outline">Go Back Home</Button>
        </Link>
      </div>
    )
  }

  if (isInQueue) {
    return (
      <div className="flex flex-col items-center gap-6">
        <WaitingAnimation />
        <Button
          variant="outline"
          onClick={leaveQueue}
          disabled={isJoining}
          className="bg-white text-pink-600 hover:bg-gray-100"
        >
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-3xl font-bold text-white mb-2">Pronto para conhecer alguém?</h1>
      <p className="text-white text-opacity-80 max-w-md">
        Clique no botão abaixo para entrar na fila e ser pareado com alguém para uma videochamada de 1 minuto.
      </p>
      {error && <p className="text-red-300">{error}</p>}
      <Button onClick={joinQueue} disabled={isJoining} size="lg" className="bg-white text-pink-600 hover:bg-gray-100">
        {isJoining ? "Juntando-se..." : "Entrar na fila"}
      </Button>
      <Button variant="ghost" onClick={() => router.push("/home")} className="text-white hover:bg-white/10">
        Voltar
      </Button>
    </div>
  )
}
