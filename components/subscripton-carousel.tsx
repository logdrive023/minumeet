"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Zap,
  Crown,
  CheckCircle,
  Target,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

// Tipo para os planos vindos do banco de dados
type PlanFeatures = {
  call_duration: number
  boosts_per_month: number
  premium_badge?: boolean
}

type Plan = {
  id: string
  name: string
  description: string
  price: string
  currency: string
  interval: string
  daily_calls: number
  features: PlanFeatures
  level?: number // Adicionado durante o processamento
  icon?: React.ElementType // Adicionado durante o processamento
  color?: string // Adicionado durante o processamento
}

// Mapeamento de ícones e cores para os planos
const planIcons: Record<string, React.ElementType> = {
  Free: Target,
  Basic: CreditCard,
  Premium: Crown,
}

const planColors: Record<string, string> = {
  Free: "from-blue-400 to-teal-500",
  Basic: "from-pink-500 to-purple-500",
  Premium: "from-purple-500 to-indigo-500",
}

// Mapeamento de níveis para os planos
const planLevels: Record<string, number> = {
  Free: 0,
  Basic: 1,
  Premium: 2,
}

export function SubscriptionCarousel() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlan, setCurrentPlan] = useState(0)
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [userPlanLevel, setUserPlanLevel] = useState(0)
  const [direction, setDirection] = useState(0) // -1 para esquerda, 1 para direita
  const [loading, setLoading] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const { toast } = useToast()

  // Buscar planos do banco de dados
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true)
      try {
        const { data, error } = await supabase.from("plans").select("*").order("daily_calls", { ascending: true }) // Ordenar do plano mais básico para o premium

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          // Processar os planos para adicionar propriedades visuais
          const processedPlans = data.map((plan) => {
            const planName = plan.name
            return {
              ...plan,
              icon: planIcons[planName] || Target,
              color: planColors[planName] || "from-gray-400 to-gray-500",
              level: planLevels[planName] || 0,
            }
          })

          setPlans(processedPlans)
        } else {
          toast({
            title: "Aviso",
            description: "Não foi possível carregar os planos. Tente novamente mais tarde.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Erro ao buscar planos:", error)
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao carregar os planos. Tente novamente mais tarde.",
          variant: "destructive",
        })
      } finally {
        setLoadingPlans(false)
      }
    }

    fetchPlans()
  }, [supabase, toast])

  // Buscar o plano do usuário
  useEffect(() => {
    const fetchUserPlan = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("subscription_plan")
          .eq("id", user.id)
          .single()

        if (userData) {
          const plan = userData.subscription_plan || "free"
          setUserPlan(plan)

          // Definir o nível do plano
          let planLevel = 0
          if (plan === "basic") planLevel = 1
          if (plan === "premium") planLevel = 2
          setUserPlanLevel(planLevel)

          // Definir o plano atual no carrossel quando os planos forem carregados
          if (plans.length > 0) {
            const planIndex = plans.findIndex((p) => p.id === plan)
            if (planIndex !== -1) {
              setCurrentPlan(planIndex)
            }
          }
        }

        // Verificar se há uma assinatura ativa
        const { data: subscriptionData, error: subError } = await supabase
          .from("subscriptions")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (subscriptionData && !subError) {
          setHasActiveSubscription(true)
          setSubscriptionId(subscriptionData.id)
        } else {
          setHasActiveSubscription(false)
        }
      }
    }

    if (plans.length > 0) {
      fetchUserPlan()
    }
  }, [supabase, plans])

  const nextPlan = () => {
    if (plans.length === 0) return
    setDirection(1)
    setCurrentPlan((prev) => (prev + 1) % plans.length)
  }

  const prevPlan = () => {
    if (plans.length === 0) return
    setDirection(-1)
    setCurrentPlan((prev) => (prev - 1 + plans.length) % plans.length)
  }

  const goToPlan = (index: number) => {
    if (plans.length === 0) return
    setDirection(index > currentPlan ? 1 : -1)
    setCurrentPlan(index)
  }

  const handleSubscribe = async () => {
    if (plans.length === 0) return

    setLoading(true)
    try {
      const plan = plans[currentPlan]

      // Não permitir selecionar o plano gratuito
      if (plan.id === "free" || plan.name === "Free") {
        toast({
          title: "Ação não permitida",
          description:
            "Não é possível assinar o plano gratuito. Para cancelar sua assinatura atual, use a opção 'Cancelar Plano'.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Iniciar processo de checkout
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Erro na resposta:", errorData)
        throw new Error(`Falha ao criar checkout: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.checkoutUrl) {
        throw new Error("URL de checkout não retornada pela API")
      }

      console.log("Redirecionando para:", data.checkoutUrl)

      // Redirecionar para a página de checkout do Mercado Pago
      window.location.href = data.checkoutUrl
    } catch (error) {
      console.error("Erro ao processar assinatura:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura? Você perderá os benefícios do plano atual.")) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/payments/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId,
        }),
      })

      if (!response.ok) {
        throw new Error("Falha ao cancelar assinatura")
      }

      // Atualizar o plano do usuário para gratuito
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("users").update({ subscription_plan: "free" }).eq("id", user.id)
      }

      // Atualizar o status da assinatura
      if (subscriptionId) {
        await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", subscriptionId)
      }

      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso. Você voltou ao plano gratuito.",
      })

      // Atualizar estado
      setUserPlan("free")
      setUserPlanLevel(0)

      // Encontrar o índice do plano gratuito
      const freePlanIndex = plans.findIndex((p) => p.id === "free" || p.name === "Free")
      if (freePlanIndex !== -1) {
        setCurrentPlan(freePlanIndex)
      } else {
        setCurrentPlan(0)
      }

      setHasActiveSubscription(false)
      setSubscriptionId(null)

      // Recarregar a página para atualizar os componentes
      router.refresh()
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao cancelar sua assinatura. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Se estiver carregando os planos, mostrar um indicador de carregamento
  if (loadingPlans) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <span className="ml-2 text-gray-600">Carregando planos...</span>
      </div>
    )
  }

  // Se não houver planos, mostrar uma mensagem
  if (plans.length === 0) {
    return (
      <Card className="w-full border-none shadow-lg">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">Planos indisponíveis</h3>
          <p className="text-gray-600">
            Não foi possível carregar os planos de assinatura. Por favor, tente novamente mais tarde.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  const plan = plans[currentPlan]
  const isPlanActive = userPlan === plan.id
  const isUpgrade = (plan.level || 0) > userPlanLevel
  const isDowngrade = (plan.level || 0) < userPlanLevel
  const isFree = plan.id === "free" || plan.name === "Free"

  // Variantes de animação para o carrossel
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  // Determinar o texto e a cor do botão
  const getButtonText = () => {
    if (loading) return "Processando..."
    if (isPlanActive) return "Plano Atual"
    if (isFree) return "Plano Gratuito"
    if (isUpgrade) return "Fazer Upgrade"
    if (isDowngrade) return "Fazer Downgrade"
    return "Assinar Agora"
  }

  const getButtonColor = () => {
    if (isPlanActive) return "bg-green-500 hover:bg-green-600"
    if (isFree) return "bg-gray-500 hover:bg-gray-600"
    if (isUpgrade) return "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
    if (isDowngrade) return "bg-amber-500 hover:bg-amber-600"
    return "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
  }

  const isButtonDisabled = () => {
    return loading || isPlanActive || (isFree && !hasActiveSubscription)
  }

  // Formatar o preço para exibição
  const formatPrice = (price: string, currency: string, interval: string) => {
    if (Number.parseFloat(price) === 0) return "Gratuito"
    return `R$${price}/${interval === "month" ? "mês" : interval}`
  }

  // Extrair recursos do plano para exibição
  const getPlanFeatures = (plan: Plan) => {
    const features = []

    // Adicionar número de chamadas diárias
    features.push(`${plan.daily_calls} chamadas por dia`)

    // Adicionar duração da chamada
    const callDuration = plan.features?.call_duration || 60
    features.push(`Duração de cada chamada: ${callDuration / 60} ${callDuration / 60 > 1 ? "minutos" : "minuto"}`)

    // Adicionar boosts por mês
    const boostsPerMonth = plan.features?.boosts_per_month || 0
    if (boostsPerMonth > 0) {
      features.push(`${boostsPerMonth} boost${boostsPerMonth > 1 ? "s" : ""} por mês`)
    }

    // Adicionar selo premium se disponível
    if (plan.features?.premium_badge) {
      features.push('Selo de "usuário premium" (destaque visual)')
    }

    return features
  }

  return (
    <div className="relative w-full">
      <div className="overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentPlan}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
          >
            <Card className="w-full border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full bg-gradient-to-r ${plan.color} text-white mr-3`}>
                      {plan.icon && <plan.icon className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <p className="text-pink-600 font-semibold">
                        {formatPrice(plan.price, plan.currency, plan.interval)}
                      </p>
                    </div>
                  </div>

                  {isPlanActive && (
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Seu plano atual
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-4">
                  {getPlanFeatures(plan).map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Zap className="h-4 w-4 text-pink-500 mr-2 mt-1 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{feature}</p>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full mt-6 ${getButtonColor()}`}
                  disabled={isButtonDisabled()}
                  onClick={handleSubscribe}
                >
                  {getButtonText()}
                </Button>

                {/* Mostrar botão de cancelamento apenas se o usuário tiver uma assinatura ativa */}
                {hasActiveSubscription && !isFree && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-500 border-red-200 hover:bg-red-50 flex items-center justify-center gap-1"
                      onClick={handleCancelSubscription}
                      disabled={loading}
                    >
                      <AlertCircle className="h-3 w-3" />
                      Cancelar Assinatura
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controles de navegação */}
      <div className="absolute inset-y-0 left-0 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/80 shadow-md hover:bg-white ml-[-12px]"
          onClick={prevPlan}
          disabled={plans.length <= 1}
        >
          <ChevronLeft className="h-4 w-4 text-pink-500" />
        </Button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/80 shadow-md hover:bg-white mr-[-12px]"
          onClick={nextPlan}
          disabled={plans.length <= 1}
        >
          <ChevronRight className="h-4 w-4 text-pink-500" />
        </Button>
      </div>

      {/* Indicadores */}
      <div className="flex justify-center mt-4 space-x-2">
        {plans.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              currentPlan === index ? "bg-pink-500" : "bg-gray-300",
            )}
            onClick={() => goToPlan(index)}
            aria-label={`Ver plano ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
