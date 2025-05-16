import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import MercadoPagoCheckout from "@/components/mercadopago-checkout"

export default async function SubscriptionPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Get user's current plan
  const { data: userData } = await supabase.from("users").select("subscription_plan").eq("id", session.user.id).single()

  // Get available plans
  const { data: plans } = await supabase.from("plans").select("*").order("price", { ascending: true })

  // Get default plan ID (basic plan)
  let defaultPlanId = null
  if (plans) {
    const basicPlan = plans.find((plan) => plan.name.toLowerCase() === "basic")
    if (basicPlan) {
      defaultPlanId = basicPlan.id
    }
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
          <h1 className="text-2xl font-bold text-white ml-2">Assinatura</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-medium mb-2">Seu plano atual</h2>
            <p className="text-gray-600">
              {userData?.subscription_plan
                ? `Plano ${userData.subscription_plan.charAt(0).toUpperCase() + userData.subscription_plan.slice(1)}`
                : "Plano Gratuito"}
            </p>
          </div>

          <MercadoPagoCheckout defaultPlanId={defaultPlanId} />

          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-medium mb-2">Informações importantes</h2>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• A assinatura é renovada automaticamente a cada mês</li>
              <li>• Você pode cancelar a qualquer momento</li>
              <li>• O pagamento é processado pelo Mercado Pago</li>
              <li>• Em caso de dúvidas, entre em contato com o suporte</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
