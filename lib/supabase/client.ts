"use client"

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs"

let supabaseClient = createBrowserSupabaseClient()

export const getSupabaseClient = () => supabaseClient
