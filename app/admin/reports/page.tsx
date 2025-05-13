import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ReportsAdminPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/")
  }

  // Verificar se o usuário é um administrador (você pode implementar sua própria lógica aqui)
  const isAdmin = true // Simplificado para este exemplo

  if (!isAdmin) {
    redirect("/home")
  }

  // Garantir que a tabela reports exista
  try {
    await supabase.rpc("create_reports_table_if_not_exists")
  } catch (error) {
    console.error("Erro ao criar tabela de denúncias:", error)
  }

  // Buscar todas as denúncias com uma abordagem mais segura
  const reports = []
  let error = null

  try {
    // Primeiro, verificar se a tabela existe
    const { error: tableCheckError } = await supabase.from("reports").select("id").limit(1)

    if (!tableCheckError) {
      // Se a tabela existir, buscar os dados com joins
      const { data, error: fetchError } = await supabase
        .from("reports")
        .select(`
          id, reason, details, status, created_at, resolved_at,
          reporter_id, reported_user_id, call_id
        `)
        .order("created_at", { ascending: false })

      if (fetchError) {
        error = fetchError
      } else if (data) {
        // Buscar informações adicionais separadamente
        for (const report of data) {
          // Buscar informações do denunciante
          const { data: reporter } = await supabase
            .from("users")
            .select("id, name")
            .eq("id", report.reporter_id)
            .single()

          // Buscar informações do denunciado
          const { data: reported } = await supabase
            .from("users")
            .select("id, name")
            .eq("id", report.reported_user_id)
            .single()

          // Buscar informações da chamada
          let call = null
          if (report.call_id) {
            const { data: callData } = await supabase
              .from("calls")
              .select("id, start_time, end_time")
              .eq("id", report.call_id)
              .single()
            call = callData
          }

          reports.push({
            ...report,
            reporter,
            reported,
            call,
          })
        }
      }
    }
  } catch (e) {
    console.error("Erro ao buscar denúncias:", e)
    error = e
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-4xl">
        <div className="flex items-center mb-6 mt-8">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white ml-2">Administração de Denúncias</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Denúncias</CardTitle>
            <CardDescription>Total de denúncias: {reports?.length || 0}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-50 p-4 rounded-md mb-4 text-red-800">
                <p className="font-medium">Erro ao carregar denúncias</p>
                <p className="text-sm">{error.message || "Ocorreu um erro desconhecido"}</p>
              </div>
            )}

            {!reports || reports.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Nenhuma denúncia encontrada.</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">
                          Denúncia de {report.reporter?.name || "Usuário"} contra {report.reported?.name || "Usuário"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <Badge
                        className={
                          report.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : report.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {report.status === "pending"
                          ? "Pendente"
                          : report.status === "resolved"
                            ? "Resolvido"
                            : "Rejeitado"}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md mb-3">
                      <p className="font-medium text-sm">Motivo: {formatReasonText(report.reason)}</p>
                      {report.details && <p className="text-sm mt-2">{report.details}</p>}
                    </div>

                    {report.call && (
                      <div className="text-xs text-gray-500">
                        Chamada: {new Date(report.call.start_time).toLocaleString()}
                        {report.call.end_time && <> até {new Date(report.call.end_time).toLocaleString()}</>}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Link href={`/user-profile/${report.reported_user_id}`}>
                        <Button variant="outline" size="sm">
                          Ver perfil denunciado
                        </Button>
                      </Link>
                      <Link href={`/admin/reports/${report.id}/resolve`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Resolver
                        </Button>
                      </Link>
                      <Link href={`/admin/reports/${report.id}/reject`}>
                        <Button variant="destructive" size="sm">
                          Rejeitar
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
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
