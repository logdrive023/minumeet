"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export default function TestMode() {
  const [name, setName] = useState("Test User")
  const [age, setAge] = useState("25")
  const [interests, setInterests] = useState("Testing, Development")
  const [loading, setLoading] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tablesExist, setTablesExist] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Check if tables exist
  useEffect(() => {
    const checkTablesExist = async () => {
      try {
        // Try to query the users table
        const { error } = await supabase.from("users").select("id").limit(1)
        setTablesExist(!error)
      } catch (err) {
        setTablesExist(false)
      }
    }

    checkTablesExist()
  }, [supabase])

  const setupDatabase = async () => {
    setSetupLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/setup-db", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to set up database")
      }

      setTablesExist(true)
      setSuccess("Database setup completed successfully!")
    } catch (error: any) {
      setError(error.message || "An error occurred setting up the database")
    } finally {
      setSetupLoading(false)
    }
  }

  const createTestUser = async () => {
    if (!tablesExist) {
      setError("Please set up the database first")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Create a test user directly with SQL
      const { data, error: sqlError } = await supabase.rpc("create_test_user", {
        user_name: name,
        user_age: Number.parseInt(age),
        user_interests: interests,
      })

      if (sqlError) throw sqlError

      if (!data) {
        throw new Error("Failed to create test user")
      }

      const testUserId = data

      // Add test user to waiting queue
      const { error: queueError } = await supabase.from("waiting_users").insert({
        user_id: testUserId,
      })

      if (queueError) throw queueError

      setSuccess(`Test user "${name}" created and added to queue`)

      // Trigger matchmaking
      try {
        await fetch("/api/matchmaking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: testUserId }),
        })
      } catch (fetchError) {
        console.error("Error triggering matchmaking:", fetchError)
        // Continue anyway
      }

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (error: any) {
      setError(error.message || "Error creating test user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Test Mode</CardTitle>
        <CardDescription>Create a test user to simulate matching</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {tablesExist === false && (
          <div className="mb-4">
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Database tables not set up</AlertDescription>
            </Alert>
            <Button onClick={setupDatabase} disabled={setupLoading} className="w-full">
              {setupLoading ? "Setting up..." : "Setup Database"}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-name">Name</Label>
            <Input id="test-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Test User" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-age">Age</Label>
            <Input
              id="test-age"
              type="number"
              min="18"
              max="120"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-interests">Interests</Label>
            <Input
              id="test-interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Interests, separated, by, commas"
            />
          </div>

          <Button onClick={createTestUser} disabled={loading || tablesExist === false} className="w-full">
            {loading ? "Creating..." : "Create Test User & Match"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
