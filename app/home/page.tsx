import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Users, Settings, Database, Camera } from "lucide-react"
import SetupDbButton from "./setup-db-button"
import CameraDebug from "@/components/camera-debug"

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

  if (userError && userError.code !== "PGRST116") {
    console.error("Error fetching user data:", userError)
  }

  // Get matches count with error handling
  let matchesCount = 0
  try {
    const { count, error } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)

    if (!error) {
      matchesCount = count || 0
    }
  } catch (error) {
    console.error("Error fetching matches count:", error)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 mt-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome, {userData?.name || "User"}</h1>
          <p className="text-white text-opacity-80">Ready to meet someone new?</p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Start Dating
              </CardTitle>
              <CardDescription>Find someone to talk to right now</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/matchmaking" className="w-full">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600">Start Video Date</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Matches
              </CardTitle>
              <CardDescription>You have {matchesCount} matches</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/matches" className="w-full">
                <Button variant="outline" className="w-full">
                  View Matches
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/profile" className="w-full">
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Setup
              </CardTitle>
              <CardDescription>Set up required database tables</CardDescription>
            </CardHeader>
            <CardFooter>
              <SetupDbButton />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Test
              </CardTitle>
              <CardDescription>Test your camera and microphone</CardDescription>
            </CardHeader>
            <CardFooter className="block">
              <CameraDebug />
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
