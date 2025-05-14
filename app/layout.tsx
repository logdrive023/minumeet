import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import LoadingProvider from "@/components/loading-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "oneminute",
  description: "Conheça novas pessoas em chamadas de vídeo de 1 minuto",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body className={`${inter.className} light`} style={{ colorScheme: "light" }}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LoadingProvider>
          {children}
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
