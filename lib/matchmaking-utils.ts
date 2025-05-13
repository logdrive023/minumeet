import { createServerClient } from "@/lib/supabase/server"

// Interface para os resultados do matchmaking
export interface MatchResult {
  matched_user_id: string
  distance_km: number
  age_match_score: number
  gender_match_score: number
  goal_match_score: number
  total_score: number
}

// Função para verificar o tamanho da fila de espera
export async function checkWaitingQueueSize() {
  const supabase = createServerClient()

  const { count, error } = await supabase.from("waiting_users").select("*", { count: "exact", head: true })

  if (error) {
    console.error("Erro ao verificar tamanho da fila:", error)
    return 0
  }

  return count || 0
}

// Função para obter estatísticas de matchmaking
export async function getMatchmakingStats() {
  const supabase = createServerClient()

  // Total de usuários na fila
  const { count: queueSize } = await supabase.from("waiting_users").select("*", { count: "exact", head: true })

  // Distribuição por grupo de idade
  const { data: ageDistribution, error: ageError } = await supabase
    .from("waiting_users")
    .select("age_group, count:count(*)") // Define um alias para count
    .order("count", { ascending: false })
    .returns<any[]>(); // opcional, para evitar TS error


  if (ageError) {
    console.error("Erro ao obter distribuição por idade:", ageError)
  }

  // Distribuição por gênero
  const { data: genderDistribution, error: genderError } = await supabase
    .from("waiting_users")
    .select("gender_group, count:count(*)")


  if (genderError) {
    console.error("Erro ao obter distribuição por gênero:", genderError)
  }

  // Tempo médio de espera (em minutos) - usando uma consulta SQL direta
  const { data: avgWaitTime, error: waitTimeError } = await supabase.rpc("calculate_average_wait_time", {})

  if (waitTimeError) {
    console.error("Erro ao calcular tempo médio de espera:", waitTimeError)
  }

  return {
    queueSize: queueSize || 0,
    ageDistribution: ageDistribution || [],
    genderDistribution: genderDistribution || [],
    avgWaitTimeMinutes: avgWaitTime?.[0]?.avg_wait_time || 0,
  }
}

// Função para calcular a compatibilidade entre dois usuários
export function calculateCompatibilityScore(user1: any, user2: any): number {
  // Pontuação de idade (0-3)
  const ageScore =
    user1.age >= user2.min_age_preference &&
      user1.age <= user2.max_age_preference &&
      user2.age >= user1.min_age_preference &&
      user2.age <= user1.max_age_preference
      ? 3
      : (user1.age >= user2.min_age_preference && user1.age <= user2.max_age_preference) ||
        (user2.age >= user1.min_age_preference && user2.age <= user1.max_age_preference)
        ? 1
        : 0

  // Pontuação de gênero (0-3)
  const genderScore =
    (user1.gender_preference === "all" || user1.gender_preference === user2.gender) &&
      (user2.gender_preference === "all" || user2.gender_preference === user1.gender)
      ? 3
      : user1.gender_preference === "all" || user2.gender_preference === "all"
        ? 1
        : 0

  // Pontuação de objetivo (0-3)
  const goalScore =
    user1.relationship_goal === user2.relationship_goal
      ? 3
      : user1.relationship_goal === "friendship" || user2.relationship_goal === "friendship"
        ? 1
        : 0

  // Calcular distância (se disponível)
  let distanceScore = 3
  if (user1.location && user2.location) {
    // Aqui usaríamos ST_Distance no banco de dados
    // Para simplificar, assumimos uma pontuação padrão
    distanceScore = 2
  }

  // Pontuação total (0-10)
  const totalScore = (ageScore + genderScore + goalScore + distanceScore) / 1.2

  return Math.min(Math.round(totalScore * 10) / 10, 10)
}
