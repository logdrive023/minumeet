import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import JoinQueue from "./join-queue"
import SelfMatchButton from "./selft-match-button"

export default async function MatchmakingPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <JoinQueue userId={session.user.id} />
      <div className="mt-8">
        <SelfMatchButton userId={session.user.id} />
      </div>
    </main>
  )
}
