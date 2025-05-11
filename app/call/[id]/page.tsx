import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import VideoCall from "./video-call"

export default async function CallPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { room?: string }
}) {
  const supabase = createServerClient()
  const { id } = params
  const roomUrl = searchParams?.room

  if (!roomUrl) {
    redirect("/home")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Verify that the user is part of this call
  const { data: call, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .single()

  if (error || !call) {
    redirect("/home")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-0 bg-black">
      <VideoCall callId={id} roomUrl={roomUrl} userId={session.user.id} />
    </main>
  )
}
