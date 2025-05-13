"use client"

import { useState, useEffect } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function MatchmakingVersionSelector() {
  const [useV2, setUseV2] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    // Carregar preferência do localStorage
    const savedPreference = localStorage.getItem("useMatchmakingV2")
    if (savedPreference) {
      setUseV2(savedPreference === "true")
    }
  }, [])

  const handleToggleVersion = (checked: boolean) => {
    setUseV2(checked)
    localStorage.setItem("useMatchmakingV2", checked.toString())

    toast({
      title: `Matchmaking ${checked ? "V2" : "V1"} ativado`,
      description: checked ? "Usando sistema escalável com PostGIS" : "Usando sistema original",
      duration: 3000,
    })
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Versão do Matchmaking</CardTitle>
        <CardDescription>Escolha qual versão do sistema de matchmaking usar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Switch id="matchmaking-version" checked={useV2} onCheckedChange={handleToggleVersion} />
          <Label htmlFor="matchmaking-version">{useV2 ? "Versão 2 (PostGIS)" : "Versão 1 (Original)"}</Label>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        <p className="text-sm text-muted-foreground">
          {useV2
            ? "Versão 2: Usa PostGIS para matchmaking geoespacial eficiente, buckets por idade e gênero, e métricas avançadas."
            : "Versão 1: Sistema original de matchmaking."}
        </p>
        {useV2 && (
          <p className="text-xs text-muted-foreground">
            Nota: A versão 2 está em fase de testes. Se encontrar problemas, volte para a versão 1.
          </p>
        )}
      </CardFooter>
    </Card>
  )
}
