"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { RefreshCw, PhoneCall, Crown, ArrowUpRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function RemainingCallsDisplay() {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [maxCalls, setMaxCalls] = useState<number>(10)
  const [plan, setPlan] = useState<string>("free")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  // Fetch user data including subscription plan
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)

          // Get user subscription data directly from the database
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("subscription_plan")
            .eq("id", user.id)
            .single()

          if (userError) {
            console.error("Error fetching user data:", userError)
          } else if (userData) {
            setPlan(userData.subscription_plan || "free")
          }
        }
      } catch (err) {
        console.error("Error fetching user:", err)
      }
    }

    fetchUserData()
  }, [supabase])

  const fetchRemainingCalls = async () => {
    if (!userId) return

    setLoading(true)
    try {
      // First check if we have an active subscription
      const { data: subscriptionData, error: subError } = await supabase
        .from("subscriptions")
        .select("plan_id, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (subscriptionData && !subError) {
        // If we have an active subscription, update the plan
        const planId = subscriptionData.plan_id

        // Get plan details
        const { data: planData } = await supabase.from("plans").select("name, daily_calls").eq("id", planId).single()

        if (planData) {
          setPlan(planData.name.toLowerCase())
          setMaxCalls(planData.daily_calls)
        }
      }

      // Now fetch remaining calls
      const response = await fetch("/api/call-limits/check")

      if (!response.ok) {
        throw new Error("Failed to fetch remaining calls")
      }

      const data = await response.json()
      setRemaining(data.remaining)

      // If we didn't get plan info from subscription, use the one from the API
      if (!subscriptionData) {
        setMaxCalls(data.max)
        setPlan(data.plan)
      }

      setError(null)
    } catch (err: any) {
      setError(err.message || "Error fetching remaining calls")
      console.error("Error fetching call data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchRemainingCalls()
    }
  }, [userId])

  const getPlanName = () => {
    switch (plan) {
      case "basic":
        return "Básico"
      case "premium":
        return "Premium"
      default:
        return "Gratuito"
    }
  }

  const getPlanColor = () => {
    switch (plan) {
      case "basic":
        return "text-blue-500"
      case "premium":
        return "text-purple-500"
      default:
        return "text-gray-500"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="animate-pulse bg-gray-200 h-5 w-32 rounded"></div>
            <div className="animate-pulse bg-gray-200 h-5 w-16 rounded"></div>
          </div>
          <div className="animate-pulse bg-gray-200 h-2 w-full rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="text-red-500">Erro ao carregar chamadas restantes</div>
            <Button variant="ghost" size="sm" onClick={fetchRemainingCalls}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progressValue = remaining !== null ? (remaining / maxCalls) * 100 : 0
  const isLow = remaining !== null && remaining <= 2

  return (
    <Card className={isLow ? "border-red-200" : ""}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-pink-500" />
            <span className="font-medium">Chamadas Restantes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isLow ? "text-red-500" : "text-pink-500"}`}>
              {remaining} / {maxCalls}
            </span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={fetchRemainingCalls}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <Progress value={progressValue} className={`h-2 ${isLow ? "bg-red-100" : ""}`} />
        <div className="flex justify-between mt-1">
          <div className="flex items-center gap-1">
            <span className="text-xs">Plano:</span>
            <span className={`text-xs font-medium flex items-center gap-0.5 ${getPlanColor()}`}>
              {plan !== "free" && <Crown className="h-3 w-3" />}
              {getPlanName()}
            </span>
          </div>
          <span className="text-xs text-gray-500">Reseta diariamente</span>
        </div>

        {plan === "free" && (
          <div className="mt-3">
            <Link href="/subscription">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7 border-pink-200 text-pink-600 hover:bg-pink-50"
              >
                Fazer upgrade <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
