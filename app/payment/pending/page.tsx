import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

export default function PaymentPendingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
          <CardDescription>Seu pagamento está sendo processado</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            Seu pagamento está sendo processado. Assim que for aprovado, sua assinatura será ativada automaticamente.
          </p>
          <p className="text-gray-600 mt-2">
            Este processo pode levar alguns minutos. Você receberá uma notificação quando for concluído.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/home">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Voltar para o Início
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
