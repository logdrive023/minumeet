"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

export default function WaitingAnimation() {
  const [dots, setDots] = useState(".")


  // Array com 10 frases diferentes para mostrar enquanto espera
  const waitingPhrases = [
    "Procurando alguém especial para você",
    "Buscando sua próxima conexão",
    "Encontrando seu próximo match",
    "Preparando uma conversa interessante",
    "Procurando alguém compatível",
    "Buscando a pessoa ideal para conversar",
    "Encontrando seu par perfeito",
    "Conectando você com alguém legal",
    "Procurando alguém para um bom papo",
    "Encontrando sua próxima história",
    "Girando a roleta do destino...",
    "Alguém incrível pode aparecer a qualquer momento",
    "Esquentando os motores do flerte",
    "Só mais um segundinho, o amor não tem pressa",
    "Talvez seja a sua alma gêmea dessa vez 👀",
    "Seu próximo crush está quase aqui",
    "O cupido está mirando com calma...",
    "Emparelhando corações compatíveis",
    "Fazendo as conexões certas acontecerem",
    "Conectando dois mundos em um só papo",
    "Quase lá... segure a ansiedade 😄",
    "Será que é hoje que você se apaixona?",
    "Seu par perfeito está se aproximando",
    "Liberando o charme da outra pessoa...",
    "Aquecendo o clima para o encontro",
    "Alguém especial está prestes a aparecer",
    "Conectando mentes e corações",
    "Montando o encontro ideal",
    "Checando compatibilidade de vibes",
    "Afinando os astros para o encontro",
    "É agora que a mágica acontece",
    "Fazendo aquele match que você vai amar",
    "Um bom papo está a caminho",
    "Só mais alguns segundos para o encanto",
    "Descobrindo sua próxima boa surpresa",
    "Trazendo alguém que vale o play",
    "Você merece algo especial... já vem aí",
    "Se preparando para algo inesperado",
    "Hoje pode ser o início de algo novo",
    "Deixando o destino trabalhar um pouquinho"
  ];

  // Seleciona uma frase aleatória quando o componente é montado
  const [currentPhrase] = useState(() => {
    const randomIndex = Math.floor(Math.random() * waitingPhrases.length)
    return waitingPhrases[randomIndex]
  })


  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "."
        return prev + "."
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])


  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 mb-4 rounded-full border-4 border-t-pink-500 border-r-pink-500 border-b-transparent border-l-transparent animate-spin"></div>
        <h2 className="text-2xl font-bold mb-2">Procurando um match</h2>
        <p className="text-gray-500">
          {currentPhrase}
          {dots}
        </p>
      </CardContent>
    </Card>
  )
}
