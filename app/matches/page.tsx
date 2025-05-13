import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MessageCircle, User, Calendar, Heart, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

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
      user1:user1_id(id, name, age, interests, avatar_url, city, state),
      user2:user2_id(id, name, age, interests, avatar_url, city, state)
    `)
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
    .eq("mutual", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching matches:", error)
  }

  // Transform and deduplicate matches
  const transformedMatches =
    matches?.map((match) => {
      const otherUser = match.user1?.id === session.user.id ? match.user2 : match.user1
      return {
        id: match.id,
        created_at: match.created_at,
        user: otherUser,
      }
    }) || []

  const uniqueMatches = new Map()
  transformedMatches.forEach((match) => {
    const key = [session.user.id, match.user.id].sort().join("-")
    if (!uniqueMatches.has(key)) {
      uniqueMatches.set(key, match)
    }
  })

  const deduplicatedMatches = Array.from(uniqueMatches.values())

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6 mt-8">
          <div className="flex items-center">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white ml-2">Seus Matches</h1>
          </div>
          <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
            {deduplicatedMatches.length} {deduplicatedMatches.length === 1 ? "match" : "matches"}
          </div>
        </div>

        {deduplicatedMatches.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-pink-100 p-4 mb-4">
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhum match ainda</h2>
              <p className="text-gray-500 mb-6">
                Comece a fazer OneMinute para encontrar seus matches! Lembre-se que só será um match quando ambos derem
                like um no outro.
              </p>
              <Link href="/matchmaking">
                <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                  Começar OneMinute
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {deduplicatedMatches.map((match) => (
              <Card
                key={match.id}
                className="border-none shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border-2 border-pink-200 flex-shrink-0">
                        <AvatarImage src={match.user.avatar_url || undefined} alt={match.user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                          {match.user.name?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="pt-1">
                        <CardTitle className="text-xl">
                          {match.user.name}, {match.user.age}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(match.created_at), { addSuffix: true, locale: ptBR })}
                        </CardDescription>
                        {match.user.city && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {match.user.city}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  {match.user.interests ? (
                    <div className="flex flex-wrap gap-1">
                      {match.user.interests.split(",").map((interest, i) => (
                        <span key={i} className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                          {interest.trim()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nenhum interesse compartilhado</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2 pb-3 gap-2">
                  <Link href={`/chat/${match.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 border-pink-200 hover:bg-pink-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </Button>
                  </Link>
                  <Link href={`/user-profile/${match.user.id}`} className="flex-1">
                    <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex items-center justify-center gap-2">
                      <User className="h-4 w-4" />
                      Perfil
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}