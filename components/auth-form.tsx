"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, MapPin, ArrowLeft, ArrowRight, Heart, MessageCircle, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { differenceInYears, parse } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { getStateAbbreviation } from "@/lib/utils"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [gender, setGender] = useState("")
  const [otherGender, setOtherGender] = useState("")
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
  const [currentStep, setCurrentStep] = useState(1)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [cityStateInput, setCityStateInput] = useState("")

  // Validação de idade
  const validateAge = (date: string): boolean => {
    try {
      const parsedDate = parse(date, "yyyy-MM-dd", new Date())
      const age = differenceInYears(new Date(), parsedDate)
      if (age < 18) {
        setAgeError("Você deve ter pelo menos 18 anos para se cadastrar")
        return false
      }
      setAgeError(null)
      return true
    } catch (error) {
      setAgeError("Data de nascimento inválida")
      return false
    }
  }

  

  // Detectar localização
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

        console.log("Dados de geocodificação:", data)
        console.log("Latitude:", latitude)
        console.log("Longitude:", longitude)
        

        if (data && data.address) {
          const city = data.address.municipality || data.address.town || data.address.village || ""
          const state = getStateAbbreviation(data.address.state) || ""
    
          setCity(city)
          setState(state)
          setCityStateInput(`${city}, ${state}`)
        }
      } catch (geocodeError) {
        console.error("Erro ao obter detalhes da localização:", geocodeError)
      }
    } catch (error: any) {
      console.error("Erro ao detectar localização:", error)
    } finally {
      setLocationLoading(false)
    }
  }

  // Processar mudança no campo de cidade/estado
  const handleCityStateChange = (value: string) => {
    setCityStateInput(value)
    const parts = value.split(",").map((part) => part.trim())
    if (parts.length >= 2) {
      setCity(parts[0])
      setState(parts[1])
    } else if (parts.length === 1) {
      setCity(parts[0])
    }
  }

  // Navegar para o próximo passo
  const goToNextStep = () => {
    let canProceed = true

    // Validações específicas para cada etapa
    if (currentStep === 1) {
      if (!name.trim()) {
        setError("Nome é obrigatório")
        canProceed = false
      } else if (!birthDate) {
        setError("Data de nascimento é obrigatória")
        canProceed = false
      } else if (!validateAge(birthDate)) {
        canProceed = false
      } else {
        setError(null)
      }
    } else if (currentStep === 2) {
      if (!gender) {
        setError("Seu gênero é obrigatório")
        canProceed = false
      } else if (gender === "other" && !otherGender.trim()) {
        setError("Por favor, especifique seu gênero")
        canProceed = false
      } else if (!genderPreference) {
        setError("Preferência de gênero é obrigatória")
        canProceed = false
      } else {
        setError(null)
      }
    } else if (currentStep === 3) {
      if (!city.trim() || !state.trim()) {
        setError("Cidade e estado são obrigatórios")
        canProceed = false
      } else {
        setError(null)
      }
    } else if (currentStep === 4) {
      if (!relationshipGoal) {
        setError("Selecione um desejo de relacionamento")
        canProceed = false
      } else {
        setError(null)
      }
    } else if (currentStep === 5) {
      if (!email.trim()) {
        setError("Email é obrigatório")
        canProceed = false
      } else if (!password.trim()) {
        setError("Senha é obrigatória")
        canProceed = false
      } else if (!termsAccepted) {
        setError("Você deve aceitar os termos de uso e política de privacidade")
        canProceed = false
      } else {
        setError(null)
      }
    }

    if (canProceed && currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Voltar para o passo anterior
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  // Login
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

      setSuccess("Login successful! Redirecting...")

      // Force a hard navigation to /home
      window.location.href = "/home"
    } catch (error: any) {
      setError(error.message || "Error signing in")
    } finally {
      setLoading(false)
    }
  }

  // Cadastro
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validações finais
    if (
      !name.trim() ||
      !birthDate ||
      !gender ||
      !genderPreference ||
      !city.trim() ||
      !state.trim() ||
      !relationshipGoal ||
      !email.trim() ||
      !password.trim() ||
      !termsAccepted
    ) {
      setError("Por favor, preencha todos os campos obrigatórios")
      setLoading(false)
      return
    }

    if (!validateAge(birthDate)) {
      setLoading(false)
      return
    }

    try {
      // 1. Sign up the user with Supabase Auth
      const finalGender = gender === "other" ? otherGender : gender

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            birth_date: birthDate,
            gender: finalGender,
            gender_preference: genderPreference,
            relationship_goal: relationshipGoal,
            terms_accepted: termsAccepted,
            city,
            state,
            latitude: latitude,
            longitude: longitude,
            subscription_plan: "free",
          },
        },
      })

      console.log("Auth data:", authData)
      console.log("Auth error:", authError)
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
          gender: finalGender,
          gender_preference: genderPreference,
          relationship_goal: relationshipGoal,
          terms_accepted: termsAccepted,
          city: city,
          state: state,
          latitude: latitude,
          longitude: longitude,
          created_at: new Date().toISOString(),
          subscription_plan: "free",
        })

        if (profileError) {
          console.error("Error creating user profile:", profileError)
        }
      }

      setSuccess("Conta criada! Verifique seu email para confirmar o cadastro")

      // Mudar para a tab de login após um pequeno delay
      setTimeout(() => {
        setActiveTab("signin")
        setCurrentStep(1)
      }, 1500)
    } catch (error: any) {
      setError(error.message || "Erro ao criar conta")
    } finally {
      setLoading(false)
    }
  }



  // Renderizar o conteúdo do passo atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold">Dados Básicos</h2>

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
                onChange={(e) => {
                  setBirthDate(e.target.value)
                  validateAge(e.target.value)
                }}
                required
              />
              {ageError && <p className="text-sm text-red-500">{ageError}</p>}
              <p className="text-xs text-gray-500">Você deve ter pelo menos 18 anos para se cadastrar.</p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold">Gênero & Preferências</h2>

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

              {gender === "other" && (
                <div className="mt-2">
                  <Input
                    placeholder="Especifique seu gênero"
                    value={otherGender}
                    onChange={(e) => setOtherGender(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 mt-4">
              <Label>Gênero de Interesse</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant={genderPreference === "male" ? "default" : "outline"}
                  className={`rounded-full ${genderPreference === "male" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : ""}`}
                  onClick={() => setGenderPreference("male")}
                >
                  Homem
                </Button>
                <Button
                  type="button"
                  variant={genderPreference === "female" ? "default" : "outline"}
                  className={`rounded-full ${genderPreference === "female" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : ""}`}
                  onClick={() => setGenderPreference("female")}
                >
                  Mulher
                </Button>
                <Button
                  type="button"
                  variant={genderPreference === "all" ? "default" : "outline"}
                  className={`rounded-full ${genderPreference === "all" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : ""}`}
                  onClick={() => setGenderPreference("all")}
                >
                  Todos
                </Button>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold">Localização</h2>

            <div className="space-y-2">
              <Label htmlFor="city-state">Cidade, Estado</Label>
              <div className="relative">
                <Input
                  id="city-state"
                  placeholder="Ex: São Paulo, SP"
                  value={cityStateInput}
                  onChange={(e) => handleCityStateChange(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={detectLocation}
                  disabled={locationLoading}
                >
                  <MapPin className={`h-5 w-5 ${locationLoading ? "animate-pulse text-gray-400" : "text-pink-500"}`} />
                </Button>
              </div>
              <p className="text-xs text-gray-500">Clique no pin para usar sua localização atual</p>

              {latitude && longitude ? (
                <div className="text-xs text-green-600 mt-1">Localização detectada com sucesso!</div>
              ) : null}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold">Desejo de Relacionamento</h2>

            <div className="grid grid-cols-1 gap-3 mt-2">
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${relationshipGoal === "chat"
                  ? "border-pink-500 bg-pink-50 shadow-md"
                  : "border-gray-200 hover:border-pink-300"
                  }`}
                onClick={() => setRelationshipGoal("chat")}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${relationshipGoal === "chat" ? "bg-pink-100" : "bg-gray-100"}`}>
                    <MessageCircle
                      className={`h-5 w-5 ${relationshipGoal === "chat" ? "text-pink-500" : "text-gray-500"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">💬 Apenas conversar</h3>
                    <p className="text-sm text-gray-500">Conhecer pessoas sem compromisso</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${relationshipGoal === "serious"
                  ? "border-pink-500 bg-pink-50 shadow-md"
                  : "border-gray-200 hover:border-pink-300"
                  }`}
                onClick={() => setRelationshipGoal("serious")}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${relationshipGoal === "serious" ? "bg-pink-100" : "bg-gray-100"}`}>
                    <Heart
                      className={`h-5 w-5 ${relationshipGoal === "serious" ? "text-pink-500" : "text-gray-500"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">💘 Relacionamento sério</h3>
                    <p className="text-sm text-gray-500">Buscar um relacionamento duradouro</p>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all ${relationshipGoal === "friendship"
                  ? "border-pink-500 bg-pink-50 shadow-md"
                  : "border-gray-200 hover:border-pink-300"
                  }`}
                onClick={() => setRelationshipGoal("friendship")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${relationshipGoal === "friendship" ? "bg-pink-100" : "bg-gray-100"}`}
                  >
                    <Users
                      className={`h-5 w-5 ${relationshipGoal === "friendship" ? "text-pink-500" : "text-gray-500"}`}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">👫 Fazer novas amizades</h3>
                    <p className="text-sm text-gray-500">Expandir seu círculo social</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold">Credenciais & Termos</h2>

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
              <p className="text-xs text-gray-500">Use pelo menos 8 caracteres com letras e números.</p>
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
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Bem-vindo ao Video Dating</CardTitle>
        <CardDescription>Entre para começar a conhecer novas pessoas</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
            setCurrentStep(1)
            setError(null)
          }}
        >
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
                <div className="text-right">
                  <Link href="#" className="text-sm text-pink-600 hover:underline">
                    Esqueci minha senha
                  </Link>
                </div>
              </div>
              <Button type="submit" className="w-full bg-black hover:bg-gray-800" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Passo {currentStep} de 5</span>
                <span>{Math.round((currentStep / 5) * 100)}%</span>
              </div>
              <Progress value={(currentStep / 5) * 100} className="h-2 bg-gray-100" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (currentStep === 5) {
                  handleSignUp(e)
                } else {
                  goToNextStep()
                }
              }}
            >
              {renderStepContent()}

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={currentStep === 1 || loading}
                  className="flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>

                {currentStep < 5 ? (
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-1"
                  >
                    Avançar <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Cadastrando..." : "Finalizar Cadastro"}
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
      </CardFooter>
    </Card>
  )
}
