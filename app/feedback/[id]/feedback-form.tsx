"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, Info, Flag, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { addDays } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface FeedbackFormProps {
  callId: string
  userId: string
  otherUserId: string
  otherUserName: string
  isTestUser?: boolean
}

export default function FeedbackForm({
  callId,
  userId,
  otherUserId,
  otherUserName,
  isTestUser = false,
}: FeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()

  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState<string>("")
  const [reportDetails, setReportDetails] = useState<string>("")
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)

  const handleReport = async () => {
    if (!reportReason) {
      setError("Por favor, selecione um motivo para a denúncia")
      return
    }

    setReportSubmitting(true)
    setError(null)

    try {
      // Verificar se a tabela reports existe
      await supabase.rpc("create_reports_table_if_not_exists")

      // Inserir a denúncia
      const { error: reportError } = await supabase.from("reports").insert({
        reporter_id: userId,
        reported_user_id: otherUserId,
        call_id: callId,
        reason: reportReason,
        details: reportDetails,
      })

      if (reportError) throw reportError

      // Inserir rejeição válida por 1 ano
      const expiresAt = addDays(new Date(), 365).toISOString()
      await supabase.from("rejections").upsert({
        user_id: userId,
        rejected_user_id: otherUserId,
        expires_at: expiresAt,
      })

      // Redirecionar para home após denúncia
      router.push("/home")
    } catch (error: any) {
      setError(error.message || "Erro ao enviar denúncia")
    } finally {
      setReportSubmitting(false)
    }
  }


  const handleFeedback = async (liked: boolean) => {
    setLoading(true)
    setError(null)

    try {
      // Salvar o feedback do usuário
      await supabase.from("call_feedbacks").upsert({
        call_id: callId,
        user_id: userId,
        liked,
      })

      // Buscar se o outro usuário já deu like nessa call
      const { data: otherFeedback } = await supabase
        .from("call_feedbacks")
        .select("liked")
        .eq("call_id", callId)
        .eq("user_id", otherUserId)
        .maybeSingle()

      if (liked && otherFeedback?.liked) {
        // Os dois gostaram: criar match
        await supabase.from("matches").insert({
          user1_id: userId,
          user2_id: otherUserId,
          mutual: true,
        })

        router.push("/matches")
      } else if (!liked) {
        // Rejeição padrão
        const expiresAt = addDays(new Date(), 2).toISOString()
        await supabase.from("rejections").upsert({
          user_id: userId,
          rejected_user_id: otherUserId,
          expires_at: expiresAt,
        })
        router.push("/home")
      } else {
        // Like dado, mas ainda aguardando retorno do outro
        router.push("/home")
      }
    } catch (error: any) {
      setError(error.message || "Erro ao enviar feedback")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md relative">
      <CardHeader className="text-center pb-2 pt-6 relative">
        <CardTitle className="text-2xl mt-4">Como foi sua chamada?</CardTitle>
        <CardDescription className="mt-1">Você gostou de conversar com {otherUserName}?</CardDescription>
      </CardHeader>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700 hover:bg-red-50 absolute top-1 right-2 flex items-center gap-1"
        onClick={() => setReportModalOpen(true)}
      >
        <Flag className="h-4 w-4" />
        Denunciar
      </Button>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-800">
            Lembre-se: só será um match se ambos derem like um no outro!
          </AlertDescription>
        </Alert>

        <div className="flex justify-center gap-8 py-4">
          <Button
            variant="outline"
            size="lg"
            className="flex flex-col items-center gap-2 p-6 h-auto hover:bg-green-50 hover:border-green-200 transition-all"
            onClick={() => handleFeedback(true)}
            disabled={loading}
          >
            <ThumbsUp className="h-8 w-8 text-green-500" />
            <span>Sim, gostei!</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="flex flex-col items-center gap-2 p-6 h-auto hover:bg-red-50 hover:border-red-200 transition-all"
            onClick={() => handleFeedback(false)}
            disabled={loading}
          >
            <ThumbsDown className="h-8 w-8 text-red-500" />
            <span>Não gostei</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500 text-center">
          Se ambos derem like, será um match e vocês poderão continuar conversando!
          <br />
        </p>
      </CardFooter>
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Denunciar {otherUserName}</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da denúncia. Sua denúncia será analisada pela nossa equipe.
            </DialogDescription>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">Denúncia enviada</h3>
              <p className="mt-2 text-sm text-gray-500">Obrigado por ajudar a manter nossa comunidade segura.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Motivo da denúncia</Label>
                  <RadioGroup value={reportReason} onValueChange={setReportReason}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="inappropriate_content" id="inappropriate_content" />
                      <Label htmlFor="inappropriate_content">Conteúdo inapropriado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="harassment" id="harassment" />
                      <Label htmlFor="harassment">Assédio ou comportamento ofensivo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fake_profile" id="fake_profile" />
                      <Label htmlFor="fake_profile">Perfil falso</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="spam" id="spam" />
                      <Label htmlFor="spam">Spam ou conteúdo comercial</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" />
                      <Label htmlFor="other">Outro motivo</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-details">Detalhes (opcional)</Label>
                  <Textarea
                    id="report-details"
                    placeholder="Descreva o problema com mais detalhes..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReportModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleReport}
                  disabled={reportSubmitting || !reportReason}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {reportSubmitting ? "Enviando..." : "Enviar denúncia"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
