"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, MapPin } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { differenceInYears, parse } from "date-fns"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState("") // Novo estado para o sexo/gênero do usuário
  const [genderPreference, setGenderPreference] = useState("")
  const [relationshipGoal, setRelationshipGoal] = useState("friendship")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = getSupabaseClient()
  const [activeTab, setActiveTab] = useState("signin")


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
    } catch (error: any) {
      console.error("Erro ao detectar localização:", error)
      // Não exibir erro para o usuário, apenas log
    } finally {
      setLocationLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setSuccess("Login efetuado com sucesso! Redirecionando...")

      // Force a hard navigation to /home
      window.location.href = "/home"
    } catch (error: any) {
      setError(error.message || "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validações
    if (!name.trim()) {
      setError("Nome é obrigatório")
      setLoading(false)
      return
    }

    if (!birthDate) {
      setError("Data de nascimento é obrigatória")
      setLoading(false)
      return
    }

    // Validar idade mínima de 18 anos
    try {
      const parsedDate = parse(birthDate, "yyyy-MM-dd", new Date())
      const age = differenceInYears(new Date(), parsedDate)

      if (age < 18) {
        setError("Você deve ter pelo menos 18 anos para se cadastrar")
        setLoading(false)
        return
      }
    } catch (error) {
      setError("Data de nascimento inválida")
      setLoading(false)
      return
    }

    if (!gender) {
      setError("Seu gênero é obrigatório")
      setLoading(false)
      return
    }

    if (!genderPreference) {
      setError("Preferência de gênero é obrigatória")
      setLoading(false)
      return
    }

    if (!termsAccepted) {
      setError("Você deve aceitar os termos de uso e política de privacidade")
      setLoading(false)
      return
    }

    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            birth_date: birthDate,
            gender,
            gender_preference: genderPreference,
            relationship_goal: relationshipGoal,
            terms_accepted: termsAccepted,
            city,
            state,
            latitude,
            longitude,
          },
        },
      })

      if (authError) throw authError

      // 2. Create or update user record in the users table
      if (authData.user) {
        // Calcular idade a partir da data de nascimento
        const parsedDate = parse(birthDate, "yyyy-MM-dd", new Date())
        const age = differenceInYears(new Date(), parsedDate)

        const { error: profileError } = await supabase.from("users").upsert({
          id: authData.user.id,
          name: name,
          email: email,
          birth_date: birthDate,
          age: age,
          gender,
          gender_preference: genderPreference,
          relationship_goal: relationshipGoal,
          terms_accepted: termsAccepted,
          city: city,
          state: state,
          latitude: latitude,
          longitude: longitude,
          created_at: new Date().toISOString(),
        })

        if (profileError) {
          console.error("Error creating user profile:", profileError)
          // Continue anyway as the auth was successful
        }
      }

      setSuccess("Conta criada! Verifique seu email para confirmar o cadastro")

      // Mudar para a tab de login após um pequeno delay
      setTimeout(() => {
        setActiveTab("signin")
      }, 1500)
    } catch (error: any) {
      setError(error.message || "Erro ao criar conta")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || "Error signing in with Google")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Bem-vindo ao Video Dating</CardTitle>
        <CardDescription>Entre para começar a conhecer novas pessoas</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

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

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth-date">Data de Nascimento</Label>
                <Input
                  id="birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Você deve ter pelo menos 18 anos para se cadastrar.</p>
              </div>

              <div className="space-y-2">
                <Label>Seu Gênero</Label>
                <RadioGroup value={gender} onValueChange={setGender} className="pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male" className="cursor-pointer">
                      Homem
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female" className="cursor-pointer">
                      Mulher
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="gender-other" />
                    <Label htmlFor="gender-other" className="cursor-pointer">
                      Outro
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
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
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Seu estado"
                    />
                  </div>
                </div>

                {latitude && longitude ? (
                  <div className="text-xs text-gray-500 mt-1">Localização detectada com sucesso!</div>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">
                    Clique em "Detectar" para usar sua localização atual.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Preferência de Gênero</Label>
                <RadioGroup value={genderPreference} onValueChange={setGenderPreference} className="pt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">
                      Homem
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">
                      Mulher
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

              <div className="space-y-2">
                <Label>Desejo de Relacionamento</Label>
                <RadioGroup value={relationshipGoal} onValueChange={setRelationshipGoal} className="pt-2">
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

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Aceito os{" "}
                    <Link href="/terms" target="_blank" className="text-pink-600 hover:underline">
                      Termos de Uso e Política de Privacidade
                    </Link>
                  </Label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        {/*<Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
          Continuar com Google
        </Button>*/}
      </CardFooter>
    </Card>
  )
}
