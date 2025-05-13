"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Send, ImageIcon, Smile } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import EmojiPicker from "emoji-picker-react"
import { v4 as uuidv4 } from "uuid"

interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
  image_url?: string
}

interface Match {
  id: string
  user: {
    id: string
    name: string
    avatar_url?: string
  }
  created_at: string
  last_message?: {
    content: string
    created_at: string
  }
}

interface ChatLayoutProps {
  userId: string
  matches: Match[]
}

export default function ChatLayout({ userId, matches: initialMatches }: ChatLayoutProps) {
  const [matches, setMatches] = useState<Match[]>(initialMatches)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = getSupabaseClient()
  const messageChannelRef = useRef<any>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768)
    }

    checkMobile() // Verifica ao montar

    window.addEventListener("resize", checkMobile) // Atualiza se redimensionar

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const fetchLastMessages = async () => {
      const updated = await Promise.all(
        matches.map(async (match) => {
          const { data } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          return {
            ...match,
            last_message: data || undefined,
          }
        })
      )
      // Elimina matches duplicados com base na combinação única dos usuários envolvidos
      const uniqueMatches = new Map()
      updated.forEach((match) => {
        const key = [userId, match.user.id].sort().join("-")
        if (!uniqueMatches.has(key)) {
          uniqueMatches.set(key, match)
        }
      })

      const deduplicatedMatches = Array.from(uniqueMatches.values())

      setMatches(deduplicatedMatches)
    }

    fetchLastMessages()

    const channels = matches.map((match) =>
      supabase
        .channel(`match_${match.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${match.id}`,
          },
          () => {
            console.log(`🟣 Atualizando última mensagem de match ${match.id}`)
            fetchLastMessages()
          }
        )
        .subscribe()
    )

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel))
    }
  }, [matches.length])


  useEffect(() => {
    if (!selectedMatch) return
    const matchId = selectedMatch.id

    loadMessages(matchId)

    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
      messageChannelRef.current = null
    }

    messageChannelRef.current = supabase
      .channel(`messages_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          console.log("🟢 Nova mensagem recebida:", newMsg)

          setMessages((prev) =>
            prev.some((msg) => msg.id === newMsg.id) ? prev : [...prev, newMsg]
          )
        }
      )
      .subscribe()

    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
      }
    }
  }, [selectedMatch?.id])


  // Configurar canal de mensagens para o match selecionado
  useEffect(() => {
    if (!selectedMatch) return

    // Carregar mensagens iniciais
    loadMessages(selectedMatch.id)

    // Inscrever-se para atualizações de mensagens para o match selecionado
    const setupMessageChannel = () => {
      // Limpar canal anterior se existir
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
      }

      console.log(`Configurando canal de mensagens para o match ${selectedMatch.id}`)

      // Criar novo canal
      messageChannelRef.current = supabase
        .channel(`messages_${selectedMatch.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${selectedMatch.id}`,
          },
          (payload) => {
            console.log("Nova mensagem recebida:", payload)
            const newMessage = payload.new as Message

            // Verificar se a mensagem já existe para evitar duplicatas
            setMessages((currentMessages) => {
              if (currentMessages.some((msg) => msg.id === newMessage.id)) {
                return currentMessages
              }
              return [...currentMessages, newMessage]
            })
          },
        )
        .subscribe()
    }

    setupMessageChannel()

    return () => {
      // Limpar canal ao desmontar ou mudar de match
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current)
      }
    }
  }, [supabase, selectedMatch])

  // Carregar mensagens quando um match é selecionado
  const loadMessages = async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })

      if (error) throw error
      if (data) {
        console.log("Mensagens carregadas:", data)
        setMessages(data)
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error)
    }
  }

  // Selecionar um match
  const handleMatchSelect = async (match: Match) => {
    setSelectedMatch(match)
    if (isMobileView) {
      setShowSidebar(false)
    }
  }

  // Enviar mensagem
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedMatch) return

    setLoading(true)
    try {
      // Criar um ID único para a mensagem
      const messageId = uuidv4()

      // Adicionar a mensagem localmente primeiro para feedback imediato
      const newMessageObj: Message = {
        id: messageId,
        match_id: selectedMatch.id,
        sender_id: userId,
        content: newMessage,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, newMessageObj])

      // Enviar para o banco de dados
      const { error } = await supabase.from("messages").insert({
        id: messageId,
        match_id: selectedMatch.id,
        sender_id: userId,
        content: newMessage,
      })

      if (error) throw error
      setNewMessage("")
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    } finally {
      setLoading(false)
    }
  }

  // Scroll para o final quando as mensagens mudam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Simular digitação quando o outro usuário recebe uma mensagem
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender_id === userId) {
      // Simular o outro usuário digitando após receber uma mensagem
      setIsTyping(true)
      const typingTimeout = setTimeout(() => {
        setIsTyping(false)
      }, 3000)

      return () => clearTimeout(typingTimeout)
    }
  }, [messages, userId])

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedMatch) return

    setLoading(true)
    try {
      // Criar um nome único para o arquivo
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      // Fazer upload da imagem para o bucket do Supabase
      const { error: uploadError } = await supabase.storage.from("images").upload(filePath, file)

      if (uploadError) throw uploadError

      // Obter a URL pública da imagem
      const {
        data: { publicUrl },
      } = supabase.storage.from("images").getPublicUrl(filePath)

      // Criar um ID único para a mensagem
      const messageId = uuidv4()

      // Adicionar a mensagem localmente primeiro para feedback imediato
      const newMessageObj: Message = {
        id: messageId,
        match_id: selectedMatch.id,
        sender_id: userId,
        content: "📷 Imagem",
        image_url: publicUrl,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, newMessageObj])

      // Enviar mensagem com a URL da imagem
      const { error } = await supabase.from("messages").insert({
        id: messageId,
        match_id: selectedMatch.id,
        sender_id: userId,
        content: "📷 Imagem",
        image_url: publicUrl,
      })

      if (error) throw error

      // Limpar o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Erro ao enviar imagem:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickMessage = (message: string) => {
    setNewMessage(message)
    // Focar no input após definir a mensagem
    document.getElementById("message-input")?.focus()
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  const filteredMatches = matches.filter((match) => match.user.name.toLowerCase().includes(searchTerm.toLowerCase()))

  // Agrupar mensagens por data
  const groupedMessages: { [date: string]: Message[] } = {}
  messages.forEach((message) => {
    const date = new Date(message.created_at).toLocaleDateString("pt-BR")
    if (!groupedMessages[date]) {
      groupedMessages[date] = []
    }
    groupedMessages[date].push(message)
  })



  return (
    <main className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar fixa ou mobile (somente se showSidebar for true) */}
      {(showSidebar || !isMobileView) && (
        <div className={`bg-white ${isMobileView ? "w-full" : "w-80"} border-r border-gray-200 flex flex-col h-full`}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Link href="/matches">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-lg">Conversas</h1>
            <div className="w-9" />
          </div>

          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredMatches.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "Nenhum resultado encontrado" : "Nenhuma conversa ainda"}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMatch?.id === match.id ? "bg-pink-50" : ""
                      }`}
                    onClick={() => {
                      handleMatchSelect(match)
                      if (isMobileView) toggleSidebar()
                    }}
                  >
                    <Avatar className="h-12 w-12 border border-gray-200">
                      <AvatarImage src={match.user.avatar_url || undefined} alt={match.user.name} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                        {match.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium truncate">{match.user.name}</h3>
                        {match.last_message && (
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(match.last_message.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {match.last_message ? match.last_message.content : "Nenhuma mensagem ainda. Diga olá!"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Área do Chat (no mobile, somente se showSidebar for false) */}
      {(!isMobileView || !showSidebar) && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {selectedMatch ? (
            <>
              {/* Cabeçalho do chat */}
              <div className="bg-white shadow-sm p-3 flex items-center">
                {isMobileView && (
                  <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={selectedMatch.user.avatar_url || undefined} alt={selectedMatch.user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                    {selectedMatch.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">{selectedMatch.user.name}</h1>
                  <p className="text-xs text-gray-500">Conversa com seu match</p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-scroll-container">
                {Object.keys(groupedMessages).length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <p className="mb-2">Nenhuma mensagem ainda. Diga olá!</p>
                      <Button variant="outline" size="sm" onClick={() => handleQuickMessage("Olá! Como vai?")}>
                        Enviar "Olá! Como vai?"
                      </Button>
                    </div>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex justify-center">
                        <div className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {(() => {
                            try {
                              const parsed = new Date(date)
                              return isNaN(parsed.getTime())
                                ? format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
                                : format(parsed, "EEEE, d 'de' MMMM", { locale: ptBR })
                            } catch {
                              return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
                            }
                          })()}
                        </div>
                      </div>
                      {dateMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}
                        >
                          {message.sender_id !== userId && (
                            <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                              <AvatarImage src={selectedMatch.user.avatar_url || undefined} alt={selectedMatch.user.name} />
                              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                                {selectedMatch.user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${message.sender_id === userId
                              ? "bg-pink-500 text-white rounded-br-none"
                              : "bg-gray-200 text-gray-800 rounded-bl-none"
                              }`}
                          >
                            {message.image_url && (
                              <div className="mb-2">
                                <img
                                  src={message.image_url || "/placeholder.svg"}
                                  alt="Imagem compartilhada"
                                  className="rounded-md max-w-full max-h-60 object-contain cursor-pointer"
                                  onClick={() => window.open(message.image_url, "_blank")}
                                />
                              </div>
                            )}
                            <p className="break-words">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1 text-right">
                              {format(new Date(message.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="flex justify-start">
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                      <AvatarImage src={selectedMatch.user.avatar_url || undefined} alt={selectedMatch.user.name} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                        {selectedMatch.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Campo de mensagem */}
              <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <Button type="button" variant="ghost" size="icon" className="text-gray-500 hover:text-pink-500" onClick={handleImageClick}>
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="text-gray-500 hover:text-pink-500">
                      <Smile className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 border-none" align="start" side="top">
                    <EmojiPicker onEmojiClick={handleEmojiClick} width="100%" height={350} />
                  </PopoverContent>
                </Popover>
                <Input
                  id="message-input"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-gray-500">
              <div className="max-w-md">
                <h2 className="text-xl font-semibold mb-2">Selecione uma conversa</h2>
                <p>Escolha um match na lista para iniciar ou continuar uma conversa.</p>
                {isMobileView && !showSidebar && (
                  <Button onClick={toggleSidebar} className="mt-4">
                    Ver conversas
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )


}
