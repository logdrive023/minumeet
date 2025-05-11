"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { createDailyRoom } from "@/lib/daily"

export default function SelfMatchButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleSelfMatch = async () => {
    setLoading(true)
    try {
      // Create a Daily room directly
      const roomUrl = await createDailyRoom()

      // Create a call record with yourself as both users
      const { data: call, error } = await supabase
        .from("calls")
        .insert({
          room_url: roomUrl,
          user1_id: userId,
          user2_id: userId, // Self-match
        })
        .select()
        .single()

      if (error) throw error

      // Redirect to the call
      router.push(`/call/${call.id}?room=${encodeURIComponent(roomUrl)}`)
    } catch (error) {
      console.error("Self-match error:", error)
      alert("Failed to create self-match. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSelfMatch}
      disabled={loading}
      className="mt-4 bg-white/20 text-white hover:bg-white/30"
    >
      {loading ? "Creating..." : "Test Solo (Self-Match)"}
    </Button>
  )
}
