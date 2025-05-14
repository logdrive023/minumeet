"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = "Carregando..." }: PageLoadingProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prevProgress) => {
        // Aumenta o progresso gradualmente, mas desacelera perto do final
        // para simular o carregamento de recursos
        if (prevProgress >= 90) {
          return prevProgress + (100 - prevProgress) * 0.05
        }
        return prevProgress + (5 - prevProgress * 0.05)
      })
    }, 100)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm">
      <div className="w-full max-w-md px-4">
        {/* Logo animado */}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-white"
          >
            One
            <motion.span
              animate={{
                color: ["#8b5cf6", "#ec4899", "#8b5cf6"],
              }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="text-purple-500"
            >
              Minute
            </motion.span>
          </motion.div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-2 bg-gray-700 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
            style={{ width: `${progress}%` }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Mensagem de carregamento */}
        <div className="text-center">
          <p className="text-gray-300">{message}</p>
        </div>

        {/* Elementos decorativos animados */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-purple-500/30"
              initial={{
                x: Math.random() * 100 - 50 + "%",
                y: Math.random() * 100 - 50 + "%",
                opacity: 0.3,
                scale: 0.5,
              }}
              animate={{
                x: Math.random() * 100 - 50 + "%",
                y: Math.random() * 100 - 50 + "%",
                opacity: [0.3, 0.8, 0.3],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 3 + i,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PageLoading