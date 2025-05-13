"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, MapPin, Heart, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function SettingsForm({ user }: { user: any }) {
  const [minAge, setMinAge] = useState(user?.min_age_preference || 18)
  const [maxAge, setMaxAge] = useState(user?.max_age_preference || 99)
  const [maxDistance, setMaxDistance] = useState(user?.max_distance_preference || 50)
  const [city, setCity] = useState(user?.city || "")
  const [state, setState] = useState(user?.state || "")
  const [latitude, setLatitude] = useState<number | null>(user?.latitude || null)
  const [longitude, setLongitude] = useState<number | null>(user?.longitude || null)
  const [genderPreference, setGenderPreference] = useState(user?.gender_preference || "all")
  const [relationshipGoal, setRelationshipGoal] = useState(user?.relationship_goal || "friendship")
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Garantir que os valores iniciais sejam carregados corretamente
  useEffect(() => {
    if (user) {
      setMinAge(user.min_age_preference || 18)
      setMaxAge(user.max_age_preference || 99)
      setMaxDistance(user.max_distance_preference || 50)
      setCity(user.city || "")
      setState(user.state || "")
      setLatitude(user.latitude || null)
      setLongitude(user.longitude || null)
      setGenderPreference(user.gender_preference || "all")
      setRelationshipGoal(user.relationship_goal || "friendship")
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Validar que min_age não é maior que max_age
      if (minAge > maxAge) {
        throw new Error("A idade mínima não pode ser maior que a idade máxima")
      }

      // Obter o ID do usuário atual
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error("Sessão não encontrada. Por favor, faça login novamente.")
      }

      const userId = sessionData.session.user.id

      const { error } = await supabase
        .from("users")
        .update({
          min_age_preference: minAge,
          max_age_preference: maxAge,
          max_distance_preference: maxDistance,
          city,
          state,
          latitude,
          longitude,
          gender_preference: genderPreference,
          relationship_goal: relationshipGoal,
        })
        .eq("id", userId)

      if (error) throw error

      setSuccess("Configurações atualizadas com sucesso")
      router.refresh()
    } catch (error: any) {
      setError(error.message || "Erro ao atualizar configurações")
    } finally {
      setLoading(false)
    }
  }

  const detectLocation = async () => {
    setLocationLoading(true)
    setError(null)

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocalização não é suportada pelo seu navegador")
      }

      // Obter a localização atual
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords
      setLatitude(latitude)
      setLongitude(longitude)

      // Tentar obter o nome da cidade e estado usando a API de Geocodificação Reversa
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        )
        const data = await response.json()

        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || ""
          const state = data.address.state || ""

          setCity(city)
          setState(state)
        }
      } catch (geocodeError) {
        console.error("Erro ao obter detalhes da localização:", geocodeError)
        // Continuar mesmo se não conseguir obter o nome da cidade/estado
      }

      setSuccess("Localização detectada com sucesso")
    } catch (error: any) {
      setError(error.message || "Erro ao detectar localização")
    } finally {
      setLocationLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Preferências de Matchmaking</CardTitle>
        <CardDescription>Configure suas preferências para encontrar matches</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="age" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="age">Idade</TabsTrigger>
            <TabsTrigger value="location">Localização</TabsTrigger>
            <TabsTrigger value="preferences">Preferências</TabsTrigger>
          </TabsList>

          <TabsContent value="age" className="pt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="age-range">Faixa Etária</Label>
                  <span className="text-sm text-gray-500">
                    {minAge} - {maxAge} anos
                  </span>
                </div>

                <div className="space-y-5 pt-2">
                  <div className="space-y-1">
                    <Label htmlFor="min-age" className="text-xs text-gray-500">
                      Idade Mínima: {minAge}
                    </Label>
                    <Slider
                      id="min-age"
                      min={18}
                      max={99}
                      step={1}
                      value={[minAge]}
                      onValueChange={(value) => setMinAge(value[0])}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="max-age" className="text-xs text-gray-500">
                      Idade Máxima: {maxAge}
                    </Label>
                    <Slider
                      id="max-age"
                      min={18}
                      max={99}
                      step={1}
                      value={[maxAge]}
                      onValueChange={(value) => setMaxAge(value[0])}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="pt-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="location">Sua Localização</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={detectLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-1"
                >
                  <MapPin className="h-4 w-4" />
                  {locationLoading ? "Detectando..." : "Detectar"}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sua cidade" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="Seu estado" />
                </div>
              </div>

              {latitude && longitude ? (
                <div className="text-xs text-gray-500 mt-1">
                  Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">
                  Coordenadas não detectadas. Clique em "Detectar" para usar sua localização atual.
                </div>
              )}

              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="max-distance">Distância Máxima</Label>
                  <span className="text-sm text-gray-500">{maxDistance} km</span>
                </div>
                <Slider
                  id="max-distance"
                  min={1}
                  max={500}
                  step={1}
                  value={[maxDistance]}
                  onValueChange={(value) => setMaxDistance(value[0])}
                />
                <p className="text-xs text-gray-500">
                  Mostrar apenas pessoas dentro de {maxDistance} km da sua localização.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="pt-4">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-500" />
                  <Label>Interesse em</Label>
                </div>
                <RadioGroup value={genderPreference} onValueChange={setGenderPreference} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">
                      Homens
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">
                      Mulheres
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">
                      Todos
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <Label>Desejo de relacionamento</Label>
                </div>
                <RadioGroup value={relationshipGoal} onValueChange={setRelationshipGoal} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="chat" id="chat" />
                    <Label htmlFor="chat" className="cursor-pointer">
                      💬 Apenas conversar
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="serious" id="serious" />
                    <Label htmlFor="serious" className="cursor-pointer">
                      💘 Relacionamento sério
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="friendship" id="friendship" />
                    <Label htmlFor="friendship" className="cursor-pointer">
                      👫 Fazer novas amizades
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button type="button" onClick={handleSubmit} className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  )
}
