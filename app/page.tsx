import AuthForm from "@/components/auth-form"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/home")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">MenuMeet</h1>
        <p className="text-white text-opacity-80">Conheça novas pessoas em chamadas de vídeo de 1 minuto</p>
      </div>
      <AuthForm />
    </main>
  )
}
