import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import SettingsForm from "./settings-form"

export default async function SettingsPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Buscar as configurações atuais do usuário
  const { data: userData, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  // Se o usuário não existir na tabela users, vamos criar um registro básico
  if (error && error.code === "PGRST116") {
    console.log("Usuário não encontrado na tabela users, criando registro básico...")

    // Extrair informações básicas da sessão
    const userName =
      session.user.user_metadata?.name ||
      session.user.user_metadata?.full_name ||
      session.user.email?.split("@")[0] ||
      "User"

    // Criar um registro básico para o usuário
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        id: session.user.id,
        name: userName,
        email: session.user.email,
        gender_preference: "other",
        terms_accepted: true,
        min_age_preference: 18,
        max_age_preference: 99,
        max_distance_preference: 50,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("Erro ao criar registro de usuário:", insertError)
    }

    // Buscar o usuário recém-criado
    const { data: createdUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()

    // Usar o usuário recém-criado ou um objeto vazio se falhar
    return (
      <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
        <div className="w-full max-w-md">
          <div className="flex items-center mb-6 mt-8">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white ml-2">Configurações</h1>
          </div>

          <SettingsForm user={createdUser || {}} />
        </div>
      </main>
    )
  }

  // Se houve outro tipo de erro, apenas registramos
  if (error) {
    console.error("Error fetching user settings:", error)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6 mt-8">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white ml-2">Configurações</h1>
        </div>

        <SettingsForm user={userData} />
      </div>
    </main>
  )
}
