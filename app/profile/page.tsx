import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/profile-form"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function ProfilePage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  const { data: user, error } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  if (error) {
    console.error("Error fetching user profile:", error)
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
          <h1 className="text-2xl font-bold text-white ml-2">Profile Settings</h1>
        </div>

        <ProfileForm user={user} />
      </div>
    </main>
  )
}
