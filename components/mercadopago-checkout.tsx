"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, CreditCard } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Plan {
  id: string
  name: string
  description: string
  price: number
  daily_calls: number
  features: any
}

interface MercadoPagoCheckoutProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  defaultPlanId?: string
}

export default function MercadoPagoCheckout({ onSuccess, onError, defaultPlanId }: MercadoPagoCheckoutProps) {
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(defaultPlanId || null)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const { toast } = useToast()
  const supabase = getSupabaseClient()

  // Fetch user and plans data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)

          // Get user's current plan
          const { data: userData } = await supabase.from("users").select("subscription_plan").eq("id", user.id).single()

          if (userData) {
            setCurrentPlan(userData.subscription_plan)
          }
        }

        // Get available plans
        const { data: plansData, error: plansError } = await supabase
          .from("plans")
          .select("*")
          .order("price", { ascending: true })

        if (plansError) {
          throw plansError
        }

        if (plansData) {
          // Filter out free plan
          const paidPlans = plansData.filter((plan) => plan.price > 0)
          setPlans(paidPlans)

          // Set default selected plan if not already set
          if (!selectedPlanId && paidPlans.length > 0) {
            setSelectedPlanId(paidPlans[0].id)
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os planos disponíveis",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, toast, defaultPlanId])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId)
  }

  const createCheckoutSession = async () => {
    if (!selectedPlanId || !userId) return

    setProcessingPayment(true)
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlanId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao criar sessão de pagamento")
      }

      const data = await response.json()

      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl)
        // Open checkout URL in a new window
        window.open(data.checkoutUrl, "_blank")

        toast({
          title: "Pagamento iniciado",
          description: "Uma nova janela foi aberta para completar o pagamento",
        })

        // Start polling for payment status
        pollPaymentStatus(data.paymentId)
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive",
      })

      if (onError) {
        onError(error.message || "Erro ao processar pagamento")
      }
    } finally {
      setProcessingPayment(false)
    }
  }

  const pollPaymentStatus = async (paymentId: string) => {
    // Poll payment status every 5 seconds
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/check-status?paymentId=${paymentId}`)

        if (!response.ok) {
          clearInterval(interval)
          return
        }

        const data = await response.json()

        if (data.status === "approved" || data.status === "authorized") {
          clearInterval(interval)
          toast({
            title: "Pagamento aprovado!",
            description: "Seu plano foi atualizado com sucesso",
          })

          if (onSuccess) {
            onSuccess()
          }

          // Refresh the page after successful payment
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else if (data.status === "rejected" || data.status === "cancelled") {
          clearInterval(interval)
          toast({
            title: "Pagamento não aprovado",
            description: "O pagamento não foi aprovado ou foi cancelado",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error checking payment status:", error)
      }
    }, 5000)

    // Stop polling after 10 minutes
    setTimeout(
      () => {
        clearInterval(interval)
      },
      10 * 60 * 1000,
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </CardContent>
      </Card>
    )
  }

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-pink-500" />
          Assinar Plano
        </CardTitle>
        <CardDescription>Escolha um plano para ter mais chamadas diárias</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {plans.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Nenhum plano disponível no momento</div>
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPlanId === plan.id ? "border-pink-500 bg-pink-50" : "border-gray-200 hover:border-pink-200"
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{plan.name}</h3>
                      <p className="text-sm text-gray-500">{plan.description}</p>
                      <div className="mt-2">
                        <span className="text-lg font-bold text-pink-600">R$ {plan.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-500">/mês</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedPlanId === plan.id ? "border-pink-500 bg-pink-500 text-white" : "border-gray-300"
                      }`}
                    >
                      {selectedPlanId === plan.id && <CheckCircle className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{plan.daily_calls} chamadas por dia</span>
                    </div>
                    {plan.features?.boosts_per_month > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          {plan.features.boosts_per_month} boost{plan.features.boosts_per_month > 1 ? "s" : ""} por mês
                        </span>
                      </div>
                    )}
                    {plan.features?.call_duration > 60 && (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Chamadas de {plan.features.call_duration / 60} minutos</span>
                      </div>
                    )}
                    {plan.features?.premium_badge && (
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Selo de usuário premium</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={createCheckoutSession}
          disabled={!selectedPlanId || processingPayment || plans.length === 0}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
        >
          {processingPayment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>Assinar Agora</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
