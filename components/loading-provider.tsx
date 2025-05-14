"use client"

// Vamos fazer uma correção mais robusta para resolver o problema do loop infinito
// especialmente quando voltamos para a página inicial

import { createContext, useContext, useState, useEffect, useRef, type ReactNode, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import PageLoading from "./page-loading"

interface LoadingContextType {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}

interface LoadingProviderProps {
  children: ReactNode
}

function LoadingProviderContent({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previousPathRef = useRef(pathname)
  const previousSearchParamsRef = useRef(searchParams)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialRenderRef = useRef(true)
  const navigationInProgressRef = useRef(false)

  // Função para limpar o estado de loading com segurança
  const safelyStopLoading = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    setIsLoading(false)
    navigationInProgressRef.current = false
  }

  // Detectar mudanças de rota para mostrar/esconder o loading
  useEffect(() => {
    // Ignorar o primeiro render para evitar mostrar o loading na carga inicial
    if (initialRenderRef.current) {
      initialRenderRef.current = false
      return
    }

    // Verificar se realmente houve mudança de rota
    const pathChanged = previousPathRef.current !== pathname
    const searchParamsChanged = previousSearchParamsRef.current?.toString() !== searchParams?.toString()

    // Atualizar as referências
    previousPathRef.current = pathname
    previousSearchParamsRef.current = searchParams

    // Só mostrar loading se houve mudança real de rota e não estamos já em uma navegação
    if ((pathChanged || searchParamsChanged) && !navigationInProgressRef.current) {
      navigationInProgressRef.current = true
      setIsLoading(true)

      // Limpar timeout anterior se existir
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }

      // Definir um tempo máximo para o loading (para evitar que fique preso)
      loadingTimeoutRef.current = setTimeout(() => {
        safelyStopLoading()
      }, 1500) // Tempo máximo reduzido para 1.5 segundos
    }

    // Se já estamos em uma navegação e a rota mudou, significa que a navegação terminou
    else if ((pathChanged || searchParamsChanged) && navigationInProgressRef.current) {
      // Dar um pequeno tempo para garantir que a página carregou completamente
      setTimeout(() => {
        safelyStopLoading()
      }, 100)
    }
  }, [pathname, searchParams])

  // Função para iniciar o loading manualmente
  const startLoading = () => {
    // Evitar iniciar loading se já estamos em uma navegação
    if (navigationInProgressRef.current) return

    navigationInProgressRef.current = true
    setIsLoading(true)

    // Limpar timeout anterior se existir
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    // Definir um tempo máximo para o loading
    loadingTimeoutRef.current = setTimeout(() => {
      safelyStopLoading()
    }, 1500)
  }

  // Função para parar o loading manualmente
  const stopLoading = () => {
    safelyStopLoading()
  }

  // Limpar timeout ao desmontar o componente
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {isLoading && <PageLoading />}
      {children}
    </LoadingContext.Provider>
  )
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <LoadingProviderContent>{children}</LoadingProviderContent>
    </Suspense>
  )
}

export default LoadingProvider