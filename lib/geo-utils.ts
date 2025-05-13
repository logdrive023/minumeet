/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1 em graus decimais
 * @param lon1 Longitude do ponto 1 em graus decimais
 * @param lat2 Latitude do ponto 2 em graus decimais
 * @param lon2 Longitude do ponto 2 em graus decimais
 * @returns Distância em quilômetros
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Se alguma das coordenadas for nula, retorna uma distância infinita
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return Number.POSITIVE_INFINITY
  }

  const R = 6371 // Raio da Terra em km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distância em km
  return distance
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Verifica se dois usuários estão dentro da distância máxima preferida um do outro
 * @param user1 Usuário 1 com latitude, longitude e max_distance_preference
 * @param user2 Usuário 2 com latitude, longitude e max_distance_preference
 * @returns true se ambos estiverem dentro da distância preferida um do outro
 */
export function areUsersWithinPreferredDistance(
  user1: { latitude: number | null; longitude: number | null; max_distance_preference: number | null },
  user2: { latitude: number | null; longitude: number | null; max_distance_preference: number | null },
): boolean {
  // Se algum usuário não tiver coordenadas, consideramos que estão fora de alcance
  if (!user1.latitude || !user1.longitude || !user2.latitude || !user2.longitude) {
    return false
  }

  // Calcular a distância entre os usuários
  const distance = calculateDistance(user1.latitude, user1.longitude, user2.latitude, user2.longitude)

  // Verificar se a distância está dentro da preferência de ambos os usuários
  const user1MaxDistance = user1.max_distance_preference || 50 // Valor padrão de 50km
  const user2MaxDistance = user2.max_distance_preference || 50 // Valor padrão de 50km

  return distance <= user1MaxDistance && distance <= user2MaxDistance
}
