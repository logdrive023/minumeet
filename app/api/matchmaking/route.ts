import { createServerClient } from "@/lib/supabase/server"
import { createDailyRoom } from "@/lib/daily"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { areUsersWithinPreferredDistance } from "@/lib/geo-utils"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    const cookieStore = cookies()
    const supabase = createServerClient()

    console.log(`Matchmaking request for user: ${userId}`)

    // Check call limits before proceeding
    const limitCheckResponse = await fetch(new URL("/api/call-limits/log", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStore.toString(),
      },
    })

    const limitCheckData = await limitCheckResponse.json()

    if (!limitCheckResponse.ok || !limitCheckData.allowed) {
      return NextResponse.json(
        {
          status: "limit_reached",
          message: limitCheckData.message || "Limite diário de chamadas atingido",
          plan: limitCheckData.plan || "free",
          max: limitCheckData.max || 10,
        },
        { status: 403 },
      )
    }

    // Ensure required tables exist
    await supabase.rpc("create_tables_if_not_exist")

    // Check if this user is already in an active call
    const { data: userActiveCall } = await supabase
      .from("calls")
      .select("id, room_url")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userActiveCall) {
      return NextResponse.json({
        status: "matched",
        callId: userActiveCall.id,
        roomUrl: userActiveCall.room_url,
      })
    }

    // Get current user preferences
    const { data: currentUser } = await supabase
      .from("users")
      .select("age, min_age_preference, max_age_preference, latitude, longitude, max_distance_preference, gender_preference, relationship_goal, gender")
      .eq("id", userId)
      .single()

    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 400 })

    // Get waiting users
    const { data: waitingUsersRaw } = await supabase
      .from("waiting_users")
      .select("user_id, locked_by, users!inner(age, min_age_preference, max_age_preference, latitude, longitude, max_distance_preference, gender_preference, relationship_goal, gender)")
      .neq("user_id", userId)
      .order("timestamp", { ascending: true })

    // Get rejections and mutual matches
    const { data: rejections } = await supabase
      .from("rejections")
      .select("rejected_user_id")
      .eq("user_id", userId)
      .gte("expires_at", new Date().toISOString())

    const { data: matches } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq("mutual", true)

    const rejectedUserIds = new Set(rejections?.map(r => r.rejected_user_id) || [])
    const matchedUserIds = new Set(matches?.flatMap(m => [m.user1_id, m.user2_id]).filter(id => id !== userId))

    const compatibleUsers = (waitingUsersRaw || []).filter(u => {
      if (rejectedUserIds.has(u.user_id) || matchedUserIds.has(u.user_id) || u.locked_by) return false
      const prefs = Array.isArray(u.users) ? u.users[0] : u.users

      const ageOk = currentUser.age >= prefs.min_age_preference && currentUser.age <= prefs.max_age_preference
      const distanceOk = areUsersWithinPreferredDistance(currentUser, prefs)
      const genderOk = (currentUser.gender_preference === "all" || currentUser.gender_preference === prefs.gender) &&
        (prefs.gender_preference === "all" || prefs.gender_preference === currentUser.gender)
      const goalOk = currentUser.relationship_goal === prefs.relationship_goal ||
        currentUser.relationship_goal === "friendship" || prefs.relationship_goal === "friendship"

      return ageOk && distanceOk && genderOk && goalOk
    })

    if (compatibleUsers.length === 0) {
      await supabase.from("waiting_users").upsert({ user_id: userId })
      return NextResponse.json({ status: "waiting" })
    }

    const matchedUser = compatibleUsers[0]
    const matchedUserId = matchedUser.user_id

    // Try to lock matched user
    const { data: lockedUser } = await supabase
      .from("waiting_users")
      .update({ locked_by: userId })
      .eq("user_id", matchedUserId)
      .is("locked_by", null)
      .select()
      .maybeSingle()

    if (!lockedUser) {
      return NextResponse.json({ status: "waiting", message: "User already locked" })
    }

    // Check if matched user already has a call
    const { data: matchedCall } = await supabase
      .from("calls")
      .select("id, room_url, user1_id, user2_id")
      .or(`user1_id.eq.${matchedUserId},user2_id.eq.${matchedUserId}`)
      .is("end_time", null)
      .limit(1)
      .maybeSingle()

    if (matchedCall) {
      await supabase.from("waiting_users").delete().in("user_id", [userId, matchedUserId])
      if (matchedCall.user1_id !== userId && matchedCall.user2_id !== userId) {
        await supabase.from("calls").update({ user2_id: userId }).eq("id", matchedCall.id).is("user2_id", null)
      }
      return NextResponse.json({ status: "matched", callId: matchedCall.id, roomUrl: matchedCall.room_url })
    }

    // Check if a call already exists between both
    const { data: existingCall } = await supabase
      .from("calls")
      .select("id, room_url")
      .or(`(user1_id.eq.${userId},user2_id.eq.${matchedUserId}),(user1_id.eq.${matchedUserId},user2_id.eq.${userId})`)
      .is("end_time", null)
      .maybeSingle()

    if (existingCall) {
      return NextResponse.json({ status: "matched", callId: existingCall.id, roomUrl: existingCall.room_url })
    }

    // Create new Daily.co room and call
    let roomUrl = ""
    try {
      roomUrl = await createDailyRoom(10)
    } catch (error) {
      console.error("Daily room creation failed:", error)
      roomUrl = "https://v0.daily.co/fallback"
    }

    const { data: call } = await supabase
      .from("calls")
      .insert({ room_url: roomUrl, user1_id: userId, user2_id: matchedUserId })
      .select()
      .single()

    await supabase.from("waiting_users").delete().in("user_id", [userId, matchedUserId])
    await supabase.from("users").update({ is_available: false }).in("id", [userId, matchedUserId])

    return NextResponse.json({ status: "matched", callId: call.id, roomUrl })
  } catch (err: any) {
    console.error("Matchmaking error:", err)
    return NextResponse.json({ error: err.message || "Internal matchmaking error" }, { status: 500 })
  }
}
