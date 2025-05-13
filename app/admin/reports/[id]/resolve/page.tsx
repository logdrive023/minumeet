import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, CheckCircle } from "lucide-react"

export default async function ResolveReportPage({ params }: { params: { id: string } }) {
  const { id } = params
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Buscar a denúncia
  const { data: report, error } = await supabase
    .from("reports")
    .select(`
      *,
      reporter:reporter_id(id, name),
      reported:reported_user_id(id, name)
    `)
    .eq("id", id)
    .single()

  if (error || !report) {
    redirect("/admin/reports")
  }

  // Função para resolver a denúncia
  async function resolveReport() {
    "use server"

    const supabase = createServerClient()

    try {
      await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id)
    } catch (error) {
      console.error("Erro ao resolver denúncia:", error)
    }

    redirect("/admin/reports")
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6 mt-8">
          <Link href="/admin/reports">
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white ml-2">Resolver Denúncia</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Confirmar resolução</CardTitle>
            <CardDescription>Você está prestes a marcar esta denúncia como resolvida.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Detalhes da denúncia:</h3>
                <p className="text-sm">
                  <span className="font-medium">Denunciante:</span> {report.reporter?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Denunciado:</span> {report.reported?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Motivo:</span> {formatReasonText(report.reason)}
                </p>
                {report.details && (
                  <p className="text-sm mt-2">
                    <span className="font-medium">Detalhes:</span> {report.details}
                  </p>
                )}
              </div>

              <div className="bg-green-50 p-4 rounded-md flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">Confirmar resolução</p>
                  <p className="text-sm text-green-700">
                    Ao resolver esta denúncia, você confirma que tomou as medidas necessárias para lidar com o problema
                    relatado.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/admin/reports">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <form action={resolveReport}>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Confirmar Resolução
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

function formatReasonText(reason: string): string {
  switch (reason) {
    case "inappropriate_content":
      return "Conteúdo inapropriado"
    case "harassment":
      return "Assédio ou comportamento ofensivo"
    case "fake_profile":
      return "Perfil falso"
    case "spam":
      return "Spam ou conteúdo comercial"
    case "other":
      return "Outro motivo"
    default:
      return reason
  }
}
