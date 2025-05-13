import { createServerClient } from "@/lib/supabase/server"
import { createDailyRoom } from "@/lib/daily"
import { NextResponse } from "next/server"
import { areUsersWithinPreferredDistance } from "@/lib/geo-utils"

type UserPreferences = {
  age: number
  min_age_preference: number
  max_age_preference: number
  latitude: number
  longitude: number
  max_distance_preference: number
  gender_preference: string
  relationship_goal: string
  gender: string
}

type WaitingUser = {
  user_id: string
  users: UserPreferences
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    const supabase = createServerClient()

    console.log(`Matchmaking request for user: ${userId}`)

    // Check if tables exist and create them if they don't
    try {
      await supabase.rpc("create_tables_if_not_exist")
    } catch (error) {
      console.error("Error creating tables:", error)
    }

    // First, check if this user is already in an active call
    const { data: userActiveCall } = await supabase
      .from("calls")
      .select("id, room_url")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userActiveCall) {
      console.log(`User ${userId} is already in active call: ${userActiveCall.id}`)
      return NextResponse.json({
        status: "matched",
        callId: userActiveCall.id,
        roomUrl: userActiveCall.room_url,
      })
    }

    // Get current user's preferences and location
    const { data: currentUser } = await supabase
      .from("users")
      .select(
        "age, min_age_preference, max_age_preference, latitude, longitude, max_distance_preference, gender_preference, relationship_goal, gender",
      )
      .eq("id", userId)
      .single()

    // Get users in waiting queue, excluding the current user and filtering by age preferences
    let query = supabase
      .from("waiting_users")
      .select(
        "user_id, users!inner(age, min_age_preference, max_age_preference, latitude, longitude, max_distance_preference, gender_preference, relationship_goal,gender)",
      )
      .neq("user_id", userId)
      .order("timestamp", { ascending: true })

    // Apply age filtering if preferences are available
    if (currentUser) {
      query = query.filter("users.age", "gte", currentUser.min_age_preference || 18)
      query = query.filter("users.age", "lte", currentUser.max_age_preference || 99)
    }

    const { data: waitingUsers, error: waitingError } = await query.limit(50)

    if (waitingError) {
      console.error("Error getting waiting users:", waitingError)
      return NextResponse.json({ error: "Failed to get waiting users" }, { status: 500 })
    }

    // Obter lista de usuários rejeitados pelo usuário atual que ainda não expiraram
    const { data: rejections } = await supabase
      .from("rejections")
      .select("rejected_user_id")
      .eq("user_id", userId)
      .gte("expires_at", new Date().toISOString())

    // Criar um conjunto de IDs de usuários rejeitados para busca rápida
    const rejectedUserIds = new Set(rejections?.map((r) => r.rejected_user_id) || [])

    // Obter lista de usuários que já deram match mútuo com o usuário atual
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq("mutual", true)

    // Criar um conjunto de IDs de usuários que já deram match para busca rápida
    const matchedUserIds = new Set<string>()
    existingMatches?.forEach((match) => {
      if (match.user1_id === userId) {
        matchedUserIds.add(match.user2_id)
      } else {
        matchedUserIds.add(match.user1_id)
      }
    })

    // Filter users who also match the current user's age with their preferences
    // and are within the preferred distance
    let compatibleUsers: typeof waitingUsers = []
    if (waitingUsers && waitingUsers.length > 0 && currentUser) {
      compatibleUsers = waitingUsers.filter((waitingUser) => {
        // Verificar se este usuário foi rejeitado recentemente
        if (rejectedUserIds.has(waitingUser.user_id)) {
          return false
        }

        // Verificar se já existe um match mútuo com este usuário
        if (matchedUserIds.has(waitingUser.user_id)) {
          return false
        }

        const userPrefs = Array.isArray(waitingUser.users) ? waitingUser.users[0] : waitingUser.users

        // Verificar compatibilidade de idade
        const ageCompatible =
          currentUser.age >= (userPrefs.min_age_preference ?? 18) &&
          currentUser.age <= (userPrefs.max_age_preference ?? 99)

        // Verificar compatibilidade de distância
        const distanceCompatible = areUsersWithinPreferredDistance(currentUser, userPrefs)
        // Verificar compatibilidade de gênero
        const genderCompatible =
          (currentUser.gender_preference === "all" || currentUser.gender_preference === userPrefs.gender) &&
          (userPrefs.gender_preference === "all" || userPrefs.gender_preference === currentUser.gender)

        // Verificar compatibilidade de objetivo de relacionamento
        const bothWantFriendship =
          currentUser.relationship_goal === "friendship" || userPrefs.relationship_goal === "friendship"

        const relationshipCompatible =
          currentUser.relationship_goal === userPrefs.relationship_goal || bothWantFriendship

        return ageCompatible && distanceCompatible && genderCompatible && relationshipCompatible
      })
    }

    // If no compatible users are waiting, add this user to the queue and return
    if (!compatibleUsers || compatibleUsers.length === 0) {
      console.log(`No compatible waiting users found for ${userId}, adding to queue`)

      // Add user to waiting queue if not already there
      const { error: joinError } = await supabase.from("waiting_users").upsert({ user_id: userId }).select()

      if (joinError) {
        console.error("Error adding user to waiting queue:", joinError)
        return NextResponse.json({ error: "Failed to join waiting queue" }, { status: 500 })
      }

      return NextResponse.json({ status: "waiting", message: "No match found yet" })
    }

    // Get the first compatible user
    const matchedUser = compatibleUsers[0]
    const matchedUserId = matchedUser.user_id
    console.log(`Found match for ${userId}: ${matchedUserId}`)

    // Tentar travar o usuário para impedir race conditions
    const { data: lockedUser, error: lockError } = await supabase
      .from("waiting_users")
      .update({ locked_by: userId })
      .eq("user_id", matchedUserId)
      .is("locked_by", null)
      .select("user_id")
      .maybeSingle()

    if (!lockedUser) {
      console.log("⚠️ Matched user was already locked, aborting")
      return NextResponse.json({ status: "waiting", message: "Matched user is busy" })
    }


    // CRITICAL: Check if the matched user already has an active call
    const { data: matchedUserCall } = await supabase
      .from("calls")
      .select("id, room_url, user1_id, user2_id")
      .or(`user1_id.eq.${matchedUserId},user2_id.eq.${matchedUserId}`)
      .is("end_time", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (matchedUserCall) {
      console.log(`Matched user ${matchedUserId} already has an active call: ${matchedUserCall.id}`)

      // Remove both users from waiting queue
      await supabase.from("waiting_users").delete().in("user_id", [userId, matchedUserId])

      // Update the existing call to include this user if needed
      if (matchedUserCall.user1_id !== userId && matchedUserCall.user2_id !== userId) {
        await supabase.from("calls").update({ user2_id: userId }).eq("id", matchedUserCall.id).is("user2_id", null)
      }

      return NextResponse.json({
        status: "matched",
        callId: matchedUserCall.id,
        roomUrl: matchedUserCall.room_url,
      })
    }

    // Create a Daily.co room with 3 minute expiration (adjust as needed)
    let roomUrl
    try {
      // Create a room that expires after 3 minutes
      roomUrl = await createDailyRoom(3)
      console.log(`Created new Daily room: ${roomUrl}`)
    } catch (error) {
      console.error("Error creating Daily room:", error)
      // Fallback to a demo room URL if we can't create one
      roomUrl = "https://v0.daily.co/hello"
      console.log("Using fallback demo room:", roomUrl)
    }

    // Verifica se já existe uma call entre os dois
    const { data: existingCall } = await supabase
      .from("calls")
      .select("id, room_url")
      .or(
        `(user1_id.eq.${userId},user2_id.eq.${matchedUserId}),(user1_id.eq.${matchedUserId},user2_id.eq.${userId})`
      )
      .is("end_time", null)
      .maybeSingle()

    if (existingCall) {
      console.log("Já existe uma call ativa entre os dois usuários:", existingCall.id)
      return NextResponse.json({
        status: "matched",
        callId: existingCall.id,
        roomUrl: existingCall.room_url,
      })
    }


    // Create a call record
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        room_url: roomUrl,
        user1_id: userId,
        user2_id: matchedUserId,
      })
      .select()
      .single()

    if (callError) {
      console.error("Error creating call:", callError)
      return NextResponse.json({ error: "Failed to create call record" }, { status: 500 })
    }

    console.log(`Created call record: ${call.id} with room: ${roomUrl}`)

    // Remove both users from the waiting queue
    await supabase.from("waiting_users").delete().in("user_id", [userId, matchedUserId])

    // Update user availability
    await supabase.from("users").update({ is_available: false }).in("id", [userId, matchedUserId])

    // For test users, automatically create a match
    // Check if either user is a test user by checking if they have an auth record
    // Fetch both users and check which ones exist in auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const realUserIds =
      authUsers?.users.filter((user) => [userId, matchedUserId].includes(user.id)).map((user) => user.id) || []
    const isTestMatch = realUserIds.length < 2

    if (isTestMatch) {
      // For test users, automatically create a match
      await supabase.from("matches").insert({
        user1_id: userId,
        user2_id: matchedUserId,
        mutual: true,
      })
    }

    return NextResponse.json({
      status: "matched",
      callId: call.id,
      roomUrl,
      isTestMatch,
    })
  } catch (error: any) {
    console.error("Matchmaking error:", error)
    return NextResponse.json({ error: error.message || "Failed to process matchmaking" }, { status: 500 })
  }
}
