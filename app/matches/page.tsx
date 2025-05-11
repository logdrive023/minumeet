import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MessageCircle, Video } from "lucide-react"

export default async function MatchesPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Get all mutual matches
  const { data: matches, error } = await supabase
    .from("matches")
    .select(`
      id,
      created_at,
      user1:user1_id(id, name, age, interests, avatar_url),
      user2:user2_id(id, name, age, interests, avatar_url)
    `)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .eq("mutual", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching matches:", error)
  }

  // Transform matches to get the other user
  const transformedMatches =
    matches?.map((match) => {
      const otherUser = match.user1.id === session.user.id ? match.user2 : match.user1
      return {
        id: match.id,
        created_at: match.created_at,
        user: otherUser,
      }
    }) || []

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6 mt-8">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white ml-2">Your Matches</h1>
        </div>

        {transformedMatches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <MessageCircle className="h-8 w-8 text-pink-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No matches yet</h2>
              <p className="text-gray-500 mb-4">Start video dating to find your matches!</p>
              <Link href="/matchmaking">
                <Button>Start Video Dating</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {transformedMatches.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <CardTitle>
                    {match.user.name}, {match.user.age}
                  </CardTitle>
                  <CardDescription>Matched on {new Date(match.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{match.user.interests || "No interests shared"}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Link href={`/chat/${match.id}`}>
                    <Button variant="outline" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </Button>
                  </Link>
                  <Button className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video Call
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
