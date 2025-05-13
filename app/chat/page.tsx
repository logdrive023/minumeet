import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ChatLayout from "./chat-layout"

export default async function ChatPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Buscar todos os matches mútuos do usuário
  const { data: matches, error } = await supabase
    .from("matches")
    .select(`
      id,
      created_at,
      user1:user1_id(id, name, avatar_url),
      user2:user2_id(id, name, avatar_url)
    `)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .eq("mutual", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar matches:", error)
  }

  // Transformar matches para obter o outro usuário
  const transformedMatches =
    matches?.map((match) => {
      const otherUser = match.user1.id === session.user.id ? match.user2 : match.user1
      return {
        id: match.id,
        created_at: match.created_at,
        user: otherUser,
      }
    }) || []

  return <ChatLayout userId={session.user.id} matches={transformedMatches} />
}
