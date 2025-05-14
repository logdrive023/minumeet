"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "./ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
    const supabase = createClientComponentClient()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleLogout = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signOut()
        setLoading(false)

        if (!error) {
            window.location.href = "/"
        } else {
            console.error(error.message)
        }
    }

    return (
        <div className="absolute top-0 right-0">
            <Button type="button" onClick={handleLogout} disabled={loading} variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <LogOut className="h-5 w-5" />
            </Button>
        </div>
    )
}
