import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import ChatInterface from "./chat-interface"

export default async function ChatPage({ params }: { params: { matchId: string } }) {
  const supabase = createServerClient()
  const { matchId } = params

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Get match details
  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      id,
      user1:user1_id(id, name, avatar_url),
      user2:user2_id(id, name, avatar_url)
    `)
    .eq("id", matchId)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .single()

  if (error || !match) {
    redirect("/matches")
  }

  // Determine the other user
  const currentUser = match.user1.id === session.user.id ? match.user1 : match.user2
  const otherUser = match.user1.id === session.user.id ? match.user2 : match.user1

  return (
    <main className="flex min-h-screen flex-col bg-gray-100">
      <div className="bg-white shadow-sm p-3 flex items-center">
        <Link href="/matches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="ml-2">
          <h1 className="font-semibold">{otherUser.name}</h1>
          <p className="text-xs text-gray-500">Chat with your match</p>
        </div>
      </div>

      <ChatInterface
        matchId={matchId}
        currentUserId={session.user.id}
        otherUserId={otherUser.id}
        currentUserName={currentUser.name}
        otherUserName={otherUser.name}
      />
    </main>
  )
}
