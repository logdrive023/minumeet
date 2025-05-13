import { getMatchmakingStats } from "@/lib/matchmaking-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function MatchmakingStatsPage() {
  const stats = await getMatchmakingStats()

  // Formatar dados para os gráficos
  const ageData = stats.ageDistribution.map((item: any) => ({
    name: item.age_group || "Não definido",
    count: Number.parseInt(item.count) || 0,
  }))

  const genderData = stats.genderDistribution.map((item: any) => ({
    name:
      item.gender_group === "male" ? "Homem" : item.gender_group === "female" ? "Mulher" : item.gender_group || "Outro",
    count: Number.parseInt(item.count) || 0,
  }))

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Estatísticas de Matchmaking</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Usuários na Fila</CardTitle>
            <CardDescription>Total de usuários aguardando match</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.queueSize}</p>
            {stats.queueSize > 10000 && <p className="text-red-500 mt-2">Alerta: Fila acima do limite!</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Tempo Médio de Espera</CardTitle>
            <CardDescription>Tempo médio até encontrar um match</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {typeof stats.avgWaitTimeMinutes === "number" ? stats.avgWaitTimeMinutes.toFixed(1) : "0.0"} min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Eficiência do Sistema</CardTitle>
            <CardDescription>Baseado no tempo de resposta</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {stats.avgWaitTimeMinutes < 1
                ? "Excelente"
                : stats.avgWaitTimeMinutes < 3
                  ? "Bom"
                  : stats.avgWaitTimeMinutes < 5
                    ? "Regular"
                    : "Lento"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="age">
        <TabsList>
          <TabsTrigger value="age">Distribuição por Idade</TabsTrigger>
          <TabsTrigger value="gender">Distribuição por Gênero</TabsTrigger>
        </TabsList>

        <TabsContent value="age" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Grupo de Idade</CardTitle>
              <CardDescription>Usuários na fila agrupados por idade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <pre className="text-sm overflow-auto">{JSON.stringify(ageData, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gender" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Gênero</CardTitle>
              <CardDescription>Usuários na fila agrupados por gênero</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <pre className="text-sm overflow-auto">{JSON.stringify(genderData, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
