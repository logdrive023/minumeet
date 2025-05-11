"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function DirectLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setStatus(`Session check: ${data.session ? "Logged in" : "Not logged in"}`)
    }

    checkSession()
  }, [supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus("Logging in...")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setStatus(`Error: ${error.message}`)
        return
      }

      setSession(data.session)
      setStatus(`Login successful. Session: ${JSON.stringify(data.session?.user?.email)}`)

      // Direct navigation
      setTimeout(() => {
        window.location.href = "/home"
      }, 2000)
    } catch (error: any) {
      setStatus(`Exception: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setStatus("Logging out...")
    await supabase.auth.signOut()
    setSession(null)
    setStatus("Logged out")
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Direct Login (Debug)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-100 rounded-md overflow-auto max-h-40">
            <pre className="text-xs">{status}</pre>
            {session && (
              <pre className="text-xs mt-2">
                User: {session.user?.email}
                <br />
                Expires: {new Date(session.expires_at * 1000).toLocaleString()}
              </pre>
            )}
          </div>

          {!session ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="debug-email">Email</Label>
                <Input
                  id="debug-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debug-password">Password</Label>
                <Input
                  id="debug-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Button onClick={handleLogout} className="w-full" variant="destructive">
                Logout
              </Button>
              <Button onClick={() => (window.location.href = "/home")} className="w-full" variant="outline">
                Go to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
