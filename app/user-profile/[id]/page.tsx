import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, MapPin, Heart, MessageCircle, Info, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { id } = params

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Fetch user profile
  const { data: user, error } = await supabase.from("users").select("*").eq("id", id).single()

  if (error || !user) {
    console.error("Error fetching user profile:", error)
    redirect("/matches")
  }

  // Fetch match information
  const { data: match } = await supabase
    .from("matches")
    .select("id, created_at")
    .or(`(user1_id.eq.${session.user.id}.and.user2_id.eq.${id}),(user1_id.eq.${id}.and.user2_id.eq.${session.user.id})`)
    .eq("mutual", true)
    .single()

  // Função para obter o texto de gênero
  const getGenderText = (gender: string) => {
    switch (gender) {
      case "male":
        return "Homem"
      case "female":
        return "Mulher"
      case "other":
        return "Outro"
      default:
        return "Não informado"
    }
  }

  // Função para obter o texto de preferência de gênero
  const getGenderPreferenceText = (preference: string) => {
    switch (preference) {
      case "male":
        return "Homens"
      case "female":
        return "Mulheres"
      case "all":
        return "Todos"
      default:
        return "Não informado"
    }
  }

  // Função para obter o texto de desejo de relacionamento
  const getRelationshipGoalText = (goal: string) => {
    switch (goal) {
      case "chat":
        return "💬 Apenas conversar"
      case "serious":
        return "💘 Relacionamento sério"
      case "friendship":
        return "👫 Fazer novas amizades"
      default:
        return "Não informado"
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6 mt-8">
          <Link href="/matches">
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white ml-2">Perfil</h1>
        </div>

        <Card className="border-none shadow-lg overflow-hidden mb-4 relative">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-pink-400 to-purple-500 relative">
            {/* Avatar posicionado parcialmente no banner */}
            <div className="absolute left-10 bottom-[-48px] z-10">
              <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-2xl">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Conteúdo do Card */}
          <div className="pt-16 px-6 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-gray-500">{user.age} anos</p>
                {user.gender && <p className="text-gray-500 text-sm">{getGenderText(user.gender)}</p>}
              </div>
              {match && (
                <Badge className="bg-pink-100 text-pink-800 flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-pink-800" />
                  Match {formatDistanceToNow(new Date(match.created_at), { addSuffix: true, locale: ptBR })}
                </Badge>
              )}
            </div>

            {(user.city || user.state) && (
              <div className="flex items-center gap-1 mt-2 text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>{[user.city, user.state].filter(Boolean).join(", ")}</span>
              </div>
            )}

            <Separator className="my-4" />

            <div className="space-y-4">
              {/* Preferências */}
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-500" />
                  Preferências
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Interesse em:</span>
                    <span className="font-medium">{getGenderPreferenceText(user.gender_preference)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Busca por:</span>
                    <span className="font-medium">{getRelationshipGoalText(user.relationship_goal)}</span>
                  </div>
                </div>
              </div>

              {/* Interesses */}
              {user.interests && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Interesses
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {user.interests.split(",").map((interest, i) => (
                      <span key={i} className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full">
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sobre */}
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-pink-500" />
                  Sobre
                </h3>
                <p className="text-gray-600">{user.bio || "Este usuário ainda não adicionou uma descrição."}</p>
              </div>
            </div>
          </div>
        </Card>


        <div className="flex gap-4">
          {match && (
            <Link href={`/chat/${match.id}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-pink-200 hover:bg-pink-50"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar Mensagem
              </Button>
            </Link>
          )}
          <Link href="/matches" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Voltar aos Matches
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
