import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import FeedbackForm from "./feedback-form"

export default async function FeedbackPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { id } = params

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Verify that the user is part of this call
  const { data: call, error } = await supabase
    .from("calls")
    .select("*, user1:user1_id(name), user2:user2_id(name)")
    .eq("id", id)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .single()

  if (error || !call) {
    redirect("/home")
  }

  // Determine the other user
  const otherUser = call.user1_id === session.user.id ? call.user2 : call.user1
  const otherUserId = call.user1_id === session.user.id ? call.user2_id : call.user1_id

  // Check if the other user is a test user (doesn't have an auth record)
  const { data: authUser } = await supabase.auth.admin.getUserById(otherUserId)
  const isTestUser = !authUser?.user

  // Update call end time if not already set
  if (!call.end_time) {
    await supabase.from("calls").update({ end_time: new Date().toISOString() }).eq("id", id)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <FeedbackForm
        callId={id}
        userId={session.user.id}
        otherUserId={otherUserId}
        otherUserName={otherUser.name}
        isTestUser={isTestUser}
      />
    </main>
  )
}
