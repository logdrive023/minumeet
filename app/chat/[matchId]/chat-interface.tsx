"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ImageIcon, Smile, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import EmojiPicker from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"

interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
  image_url?: string
}

interface ChatInterfaceProps {
  matchId: string
  currentUserId: string
  otherUserId: string
  currentUserName: string
  otherUserName: string
  otherUserAvatar?: string
}
// O sidebar não esta atualizando sozinho como deveria
// A data da mensagem não esta aparecendo corretamente
export default function ChatInterface({
  matchId,
  currentUserId,
  otherUserId,
  currentUserName,
  otherUserName,
  otherUserAvatar,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseClient()
  const router = useRouter()

  // Create messages table if it doesn't exist
  useEffect(() => {
    const createMessagesTable = async () => {
      try {
        // Check if table exists
        const { error: checkError } = await supabase.from("messages").select("id").limit(1)

        if (checkError && checkError.code === "PGRST116") {
          // Table doesn't exist, create it
          const { error } = await supabase.rpc("create_messages_table")
          if (error) console.error("Erro ao criar tabela de mensagens:", error)
        }
      } catch (error) {
        console.error("Erro ao verificar/criar tabela de mensagens:", error)
      }
    }

    createMessagesTable()
  }, [supabase])

  useEffect(() => {
    const matchIdStr = String(matchId) // Garante consistência

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("match_id", matchIdStr)
          .order("created_at", { ascending: true })

        if (error) throw error
        if (data) {
          console.log("📥 Mensagens carregadas:", data)
          setMessages(data)
        }
      } catch (error) {
        console.error("❌ Erro ao carregar mensagens:", error)
      }
    }

    loadMessages()

    console.log("📡 Subscribing to realtime on channel:", `messages_${matchIdStr}`)

    const channel = supabase
      .channel(`messages_${matchIdStr}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchIdStr}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          console.log("🟢 Mensagem realtime recebida:", newMsg)

          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          )
        }
      )
      .subscribe((status) => {
        console.log("✅ Status do canal:", status)
      })

    return () => {
      supabase.removeChannel(channel)
      console.log("❌ Canal removido:", `messages_${matchIdStr}`)
    }
  }, [matchId])


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Simular digitação quando o outro usuário recebe uma mensagem
  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].sender_id === currentUserId) {
      // Simular o outro usuário digitando após receber uma mensagem
      setIsTyping(true)
      const typingTimeout = setTimeout(() => {
        setIsTyping(false)
      }, 3000)

      return () => clearTimeout(typingTimeout)
    }
  }, [messages, currentUserId])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    try {
      // Criar um ID único para a mensagem
      const messageId = uuidv4()

      // Adicionar a mensagem localmente primeiro para feedback imediato
      const newMessageObj: Message = {
        id: messageId,
        match_id: matchId,
        sender_id: currentUserId,
        content: newMessage,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, newMessageObj])

      // Enviar para o banco de dados
      const { error } = await supabase.from("messages").insert({
        id: messageId,
        match_id: matchId,
        sender_id: currentUserId,
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

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
        match_id: matchId,
        sender_id: currentUserId,
        content: "📷 Imagem",
        image_url: publicUrl,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, newMessageObj])

      // Enviar mensagem com a URL da imagem
      const { error } = await supabase.from("messages").insert({
        id: messageId,
        match_id: matchId,
        sender_id: currentUserId,
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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="bg-white shadow-sm p-3 flex items-center">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="font-semibold">{otherUserName}</h1>
          <p className="text-xs text-gray-500">Conversa com seu match</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                >
                  {message.sender_id !== currentUserId && (
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                      <AvatarImage src={otherUserAvatar || undefined} alt={otherUserName} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                        {otherUserName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${message.sender_id === currentUserId
                      ? "bg-pink-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                  >
                    {message.image_url ? (
                      <div className="mb-2">
                        <img
                          src={message.image_url || "/placeholder.svg"}
                          alt="Imagem compartilhada"
                          className="rounded-md max-w-full max-h-60 object-contain cursor-pointer"
                          onClick={() => window.open(message.image_url, "_blank")}
                        />
                      </div>
                    ) : null}
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
              <AvatarImage src={otherUserAvatar || undefined} alt={otherUserName} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-xs">
                {otherUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-pink-500"
          onClick={handleImageClick}
        >
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
    </div>
  )
}
