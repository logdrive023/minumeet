"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  created_at: string
}

interface ChatInterfaceProps {
  matchId: string
  currentUserId: string
  otherUserId: string
  currentUserName: string
  otherUserName: string
}

export default function ChatInterface({
  matchId,
  currentUserId,
  otherUserId,
  currentUserName,
  otherUserName,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()

  // Create messages table if it doesn't exist
  useEffect(() => {
    const createMessagesTable = async () => {
      try {
        // Check if table exists
        const { error: checkError } = await supabase.from("messages").select("id").limit(1)

        if (checkError && checkError.code === "PGRST116") {
          // Table doesn't exist, create it
          const { error } = await supabase.rpc("create_messages_table")
          if (error) console.error("Error creating messages table:", error)
        }
      } catch (error) {
        console.error("Error checking/creating messages table:", error)
      }
    }

    createMessagesTable()
  }, [supabase])

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true })

        if (error) throw error
        if (data) setMessages(data)
      } catch (error) {
        console.error("Error loading messages:", error)
      }
    }

    loadMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`match_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, supabase])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: currentUserId,
        content: newMessage,
      })

      if (error) throw error
      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender_id === currentUserId
                    ? "bg-pink-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                <p>{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
