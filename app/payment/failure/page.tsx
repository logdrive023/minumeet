import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function PaymentFailurePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento não aprovado</CardTitle>
          <CardDescription>Houve um problema com o seu pagamento</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            Infelizmente, seu pagamento não foi aprovado. Por favor, verifique os dados do seu cartão e tente novamente.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Link href="/subscription">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
              Tentar Novamente
            </Button>
          </Link>
          <Link href="/home">
            <Button variant="outline">Voltar para o Início</Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  )
}
