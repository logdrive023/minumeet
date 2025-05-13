import { redirect } from "next/navigation"

export default function ChatRedirect() {
  // Redirecionar para a página principal de chat
  redirect("/chat")
}
