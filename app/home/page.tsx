import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Users, Settings, Database, Camera, LogOut, Sliders, CreditCard } from "lucide-react"
import CameraDebug from "@/components/camera-debug"
import { DynamicDatingText } from "@/components/dynamic-dating-text"
import { LogoutButton } from "@/components/logout-button"
import { SubscriptionCarousel } from "@/components/subscripton-carousel"
import RemainingCallsDisplay from "@/components/remaining-calls-display"

export default async function HomePage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Get user data with error handling
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single()

  // Fallback to auth metadata if user data is not found in the users table
  let userName = "User"

  if (userData?.name) {
    userName = userData.name
  } else if (session.user.user_metadata?.name) {
    userName = session.user.user_metadata.name
  } else if (session.user.user_metadata?.full_name) {
    userName = session.user.user_metadata.full_name
  } else if (session.user.email) {
    userName = session.user.email.split("@")[0]
  }

  // Get matches count with error handling
  let matchesCount = 0

  try {
    const { data: matches, error } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      .eq("mutual", true)

    if (matches && !error) {
      const uniqueMatchMap = new Map()

      for (const match of matches) {
        const ids = [match.user1_id, match.user2_id].sort().join("-")
        uniqueMatchMap.set(ids, true)
      }

      matchesCount = uniqueMatchMap.size
    }
  } catch (error) {
    console.error("Error fetching matches count:", error)
  }


  // Text options for the dynamic dating card
  const titleOptions = [
    "Bora conversar?",
    "Conheça alguém novo",
    "Comece uma conexão",
    'Seu próximo match começa com um "oi"',
    "Um minuto, uma chance",
    "Encontre sua próxima conexão",
  ]

  const subtitleOptions = [
    "Encontre alguém legal para um papo agora mesmo",
    "Troque ideias, histórias e quem sabe… algo mais?",
    "Converse por 1 minuto e veja no que dá",
    "Dê o primeiro passo agora",
    "Descubra quem te espera do outro lado",
    "Tudo começa com uma boa conversa",
  ]

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600">
      <div className="w-full max-w-md">
        <div className="text-center py-6 relative">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Bem vindo, {userName}
          </h1>
          <p className="text-base sm:text-lg text-white text-opacity-80">
            Pronto para conhecer alguém novo?
            <div className="top-4 right-4">
              <LogoutButton />
            </div>
          </p>


        </div>


        <div className="grid gap-4">
          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2">
              <DynamicDatingText
                titleOptions={titleOptions}
                subtitleOptions={subtitleOptions}
                displayDuration={10000}
                transitionDuration={800}
              />
            </CardHeader>
            <CardFooter className="pt-2">
              <Link href="/matchmaking" className="w-full">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-300">
                  1 minuto pra conquistar 💘
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-pink-500" />
                Seus Matches
              </CardTitle>
              <CardDescription>Você tem {matchesCount} matches</CardDescription>
            </CardHeader>
            <CardFooter className="pt-2">
              <Link href="/matches" className="w-full">
                <Button variant="outline" className="w-full hover:bg-pink-50 transition-all duration-300">
                  Ver Matches
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <RemainingCallsDisplay />

          {/* Novo Card de Planos de Assinatura */}
          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="h-5 w-5 text-pink-500" />
                Meu Plano
              </CardTitle>
              <CardDescription>👉 Escolha o plano ideal para você</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
              <SubscriptionCarousel />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="h-5 w-5 text-pink-500" />
                  Perfil
                </CardTitle>
                <CardDescription>Atualize seu perfil</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/profile" className="w-full">
                  <Button variant="outline" className="w-full hover:bg-pink-50 transition-all duration-300">
                    Editar Perfil
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sliders className="h-5 w-5 text-pink-500" />
                  Config
                </CardTitle>
                <CardDescription>Preferências</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <Link href="/settings" className="w-full">
                  <Button variant="outline" className="w-full hover:bg-pink-50 transition-all duration-300">
                    Configurar
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-2">
            {/*<Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Database className="h-5 w-5 text-pink-500" />
                  Database Setup
                </CardTitle>
                <CardDescription>Set up required tables</CardDescription>
              </CardHeader>
              <CardFooter className="pt-2">
                <SetupDbButton />
              </CardFooter>
            </Card>*/}

            <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Camera className="h-5 w-5 text-pink-500" />
                  Teste de Câmera
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-4">
                <CameraDebug />
              </CardContent>
            </Card>
          </div>

          {/*<div className="mt-6 text-center">
            <Link href="/admin/reports">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                Administração de Denúncias
              </Button>
            </Link>
          </div>*/}
        </div>
      </div>
    </main>
  )
}
