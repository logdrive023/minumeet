import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { roomName } = await request.json()

    if (!roomName) {
      return NextResponse.json({ error: "Nome da sala não fornecido" }, { status: 400 })
    }

    // Verificar se temos a chave de API do Daily
    if (!process.env.DAILY_API_KEY) {
      return NextResponse.json({ error: "Chave de API do Daily não configurada" }, { status: 500 })
    }

    // Chamar a API do Daily.co para encerrar a sala
    const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Erro ao encerrar sala ${roomName}:`, errorText)
      return NextResponse.json(
        { error: `Falha ao encerrar sala: ${response.status} ${errorText}` },
        { status: response.status },
      )
    }

    return NextResponse.json({ success: true, message: `Sala ${roomName} encerrada com sucesso` })
  } catch (error: any) {
    console.error("Erro ao processar solicitação de encerramento de sala:", error)
    return NextResponse.json({ error: error.message || "Erro desconhecido" }, { status: 500 })
  }
}
