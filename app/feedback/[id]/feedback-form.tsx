"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown } from "lucide-react"

interface FeedbackFormProps {
  callId: string
  userId: string
  otherUserId: string
  otherUserName: string
  isTestUser?: boolean
}

export default function FeedbackForm({
  callId,
  userId,
  otherUserId,
  otherUserName,
  isTestUser = false,
}: FeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleFeedback = async (liked: boolean) => {
    setLoading(true)
    setError(null)

    try {
      if (liked) {
        // Check if there's already a match from the other user
        const { data: existingMatch, error: matchError } = await supabase
          .from("matches")
          .select("*")
          .eq("user1_id", otherUserId)
          .eq("user2_id", userId)
          .single()

        if (matchError && matchError.code !== "PGRST116") {
          throw matchError
        }

        if (existingMatch) {
          // It's a mutual match! Update the existing match
          await supabase.from("matches").update({ mutual: true }).eq("id", existingMatch.id)
        } else {
          // Create a new potential match
          await supabase.from("matches").insert({
            user1_id: userId,
            user2_id: otherUserId,
            mutual: isTestUser, // If it's a test user, automatically make it mutual
          })
        }
      }

      router.push(liked ? "/matches" : "/home")
    } catch (error: any) {
      setError(error.message || "Error submitting feedback")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">How was your call?</CardTitle>
        <CardDescription>Did you enjoy talking with {otherUserName}?</CardDescription>
        {isTestUser && (
          <p className="text-xs text-pink-600 mt-2">
            This was a test user. Liking them will create an automatic match.
          </p>
        )}
      </CardHeader>
      <CardContent className="flex justify-center gap-8 py-6">
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <Button
          variant="outline"
          size="lg"
          className="flex flex-col items-center gap-2 p-6 h-auto"
          onClick={() => handleFeedback(true)}
          disabled={loading}
        >
          <ThumbsUp className="h-8 w-8 text-green-500" />
          <span>Yes!</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="flex flex-col items-center gap-2 p-6 h-auto"
          onClick={() => handleFeedback(false)}
          disabled={loading}
        >
          <ThumbsDown className="h-8 w-8 text-red-500" />
          <span>No</span>
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">If both of you like each other, it's a match!</p>
      </CardFooter>
    </Card>
  )
}
