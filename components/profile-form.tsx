"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { uploadImage, deleteImage } from "@/lib/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Camera, MapPin, User, Heart, LogOut } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

export default function ProfileForm({ user }: { user: any }) {
  const [name, setName] = useState(user?.name || "")
  const [age, setAge] = useState(user?.age || "")
  const [interests, setInterests] = useState(user?.interests || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [city, setCity] = useState(user?.city || "")
  const [state, setState] = useState(user?.state || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Obter a sessão atual para acessar o email do usuário
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Carregar a sessão atual
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }

    loadSession()
    if (user) {
      setName(user.name || "")
      setAge(user.age || "")
      setInterests(user.interests || "")
      setBio(user.bio || "")
      setCity(user.city || "")
      setState(user.state || "")
      setAvatarUrl(user.avatar_url || "")
    }
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("A imagem deve ter no máximo 2MB")
        return
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"]
      if (!validTypes.includes(file.type)) {
        setError("Formato de imagem inválido. Use JPG, PNG ou GIF")
        return
      }

      setAvatarFile(file)

      // Create a preview URL
      const objectUrl = URL.createObjectURL(file)
      setAvatarUrl(objectUrl)

      // Clear any previous errors
      setError(null)
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

      // Tentar obter o nome da cidade e estado usando a API de Geocodificação Reversa
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10&addressdetails=1`,
        )
        const data = await response.json()

        if (data && data.address) {
          const city = data.address.city || data.address.town || data.address.village || ""
          const state = data.address.state || ""

          setCity(city)
          setState(state)
          setSuccess("Localização detectada com sucesso")
        }
      } catch (geocodeError) {
        console.error("Erro ao obter detalhes da localização:", geocodeError)
        setError("Não foi possível obter os detalhes da sua localização")
      }
    } catch (error: any) {
      setError(error.message || "Erro ao detectar localização")
    } finally {
      setLocationLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setUploadProgress(0)

    try {
      // Validate inputs
      if (!name.trim()) {
        throw new Error("Nome é obrigatório")
      }

      if (age && (isNaN(Number(age)) || Number(age) < 18 || Number(age) > 120)) {
        throw new Error("Idade deve ser um número entre 18 e 120")
      }

      // Upload avatar if changed
      let newAvatarUrl = user?.avatar_url

      if (avatarFile) {
        setIsUploading(true)

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return prev
            }
            return prev + 10
          })
        }, 300)

        newAvatarUrl = await uploadImage(avatarFile, user.id)

        clearInterval(progressInterval)
        setUploadProgress(100)

        if (!newAvatarUrl) {
          throw new Error("Falha ao fazer upload da imagem. Tente novamente.")
        }

        // If user had a previous avatar, delete it
        if (user.avatar_url && user.avatar_url !== newAvatarUrl) {
          try {
            await deleteImage(user.avatar_url)
          } catch (deleteError) {
            console.error("Error deleting old avatar:", deleteError)
            // Continue even if deletion fails
          }
        }

        setIsUploading(false)
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({
          name,
          age: age ? Number(age) : null,
          interests,
          bio,
          city,
          state,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      setSuccess("Perfil atualizado com sucesso")

      // Update the avatar URL state with the new URL from Supabase
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl)
      }

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setAvatarFile(null)

      router.refresh()
    } catch (error: any) {
      setError(error.message || "Erro ao atualizar perfil")
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (error: any) {
      setError(error.message || "Erro ao sair")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-pink-400 to-purple-500"></div>
        <div className="px-6 pb-6 relative">
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white">
                <AvatarImage src={avatarUrl || undefined} alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-4xl">
                  {name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <Camera className="h-5 w-5 text-pink-500" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>

          <div className="mt-20 text-center">
            <h2 className="text-2xl font-bold">{name || "Seu Nome"}</h2>
            <p className="text-gray-500">{age ? `${age} anos` : "Idade não informada"}</p>

            {(city || state) && (
              <div className="flex items-center justify-center gap-1 mt-1 text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>{[city, state].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-pink-500" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>Atualize suas informações de perfil</CardDescription>
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

              {isUploading && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Enviando imagem...</p>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Sua idade"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="location">Localização</Label>
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
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Sua cidade"
                      />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests" className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    Interesses
                  </Label>
                  <Input
                    id="interests"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="Música, Esportes, Viagens, etc. (separados por vírgula)"
                  />
                  <p className="text-xs text-gray-500">Separe seus interesses por vírgulas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Sobre Mim</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre você..."
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  disabled={loading || isUploading}
                >
                  {loading ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Informações da Conta</CardTitle>
              <CardDescription>Gerencie suas configurações de conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Email</Label>
                <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                  {user?.email || session?.user?.email || "Email não disponível"}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Data de Nascimento</Label>
                <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                  {user?.birth_date ? new Date(user.birth_date).toLocaleDateString() : "Não informada"}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-gray-500">Conta criada em</Label>
                <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Data não disponível"}
                </div>
              </div>

              <Separator />

              <div className="pt-2">
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
