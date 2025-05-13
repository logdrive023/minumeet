"use client"

import { useState, useEffect } from "react"

interface DynamicTextProps {
  titleOptions: string[]
  subtitleOptions: string[]
  displayDuration?: number // Tempo em ms que cada frase fica visível
  transitionDuration?: number // Tempo em ms para a transição
}

export function DynamicDatingText({
  titleOptions,
  subtitleOptions,
  displayDuration = 8000, // Aumentado para 8 segundos por padrão
  transitionDuration = 800, // Transição mais lenta (800ms)
}: DynamicTextProps) {
  const [titleIndex, setTitleIndex] = useState(0)
  const [subtitleIndex, setSubtitleIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Animation timing - fade out, change text, fade in
    const timer = setInterval(() => {
      // Fade out
      setIsVisible(false)

      // Change text after fade out
      setTimeout(() => {
        setTitleIndex((prev) => (prev + 1) % titleOptions.length)
        setSubtitleIndex((prev) => (prev + 1) % subtitleOptions.length)

        // Fade in with new text
        setIsVisible(true)
      }, transitionDuration) // Usar a duração da transição para o timeout
    }, displayDuration + transitionDuration) // Ciclo completo = tempo de exibição + tempo de transição

    return () => clearInterval(timer)
  }, [titleOptions, subtitleOptions, displayDuration, transitionDuration])

  return (
    <div className="space-y-1">
      <h2
        className={`text-xl font-bold flex items-center gap-2 transition-all duration-${transitionDuration} ${
          isVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform -translate-y-2"
        }`}
        style={{ transitionDuration: `${transitionDuration}ms` }}
      >
        <span className="text-pink-500">📹</span> {titleOptions[titleIndex]}
      </h2>
      <p
        className={`text-gray-600 dark:text-gray-300 transition-all duration-${transitionDuration} ${
          isVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-2"
        }`}
        style={{ transitionDuration: `${transitionDuration}ms` }}
      >
        {subtitleOptions[subtitleIndex]}
      </p>
    </div>
  )
}
