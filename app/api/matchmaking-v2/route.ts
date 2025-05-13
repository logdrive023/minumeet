import { createServerClient } from "@/lib/supabase/server"
import { createDailyRoom } from "@/lib/daily"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    const supabase = createServerClient()

    console.log(`Matchmaking V2 request for user: ${userId}`)

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
      .select(
        "id, age, min_age_preference, max_age_preference, location, max_distance_preference, gender_preference, relationship_goal, gender",
      )
      .eq("id", userId)
      .single()

    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 400 })

    // Use the new PostGIS function to find compatible matches
    const { data: compatibleUsers, error: matchError } = await supabase.rpc("find_matches_postgis", {
      p_user_id: userId,
      p_max_results: 10,
    })

    if (matchError) {
      console.error("Error finding matches with PostGIS:", matchError)

      // Fallback to the old method if there's an error with the new one
      return NextResponse.json({ status: "waiting", message: "Using fallback matchmaking" })
    }

    if (!compatibleUsers || compatibleUsers.length === 0) {
      // Update waiting_users with age_group and gender_group
      const { data: currentUserData } = await supabase.from("users").select("age, gender").eq("id", userId).single()

      if (currentUserData) {
        // Calculate age group
        let ageGroup = "18-24"
        if (currentUserData.age >= 25 && currentUserData.age < 35) ageGroup = "25-34"
        else if (currentUserData.age >= 35 && currentUserData.age < 45) ageGroup = "35-44"
        else if (currentUserData.age >= 45 && currentUserData.age < 55) ageGroup = "45-54"
        else if (currentUserData.age >= 55) ageGroup = "55+"

        await supabase.from("waiting_users").upsert({
          user_id: userId,
          age_group: ageGroup,
          gender_group: currentUserData.gender,
        })
      } else {
        await supabase.from("waiting_users").upsert({ user_id: userId })
      }

      return NextResponse.json({ status: "waiting" })
    }

    const matchedUser = compatibleUsers[0]
    const matchedUserId = matchedUser.matched_user_id

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

    // Log match quality metrics
    await supabase.from("match_metrics").insert({
      call_id: call.id,
      user1_id: userId,
      user2_id: matchedUserId,
      distance_km: matchedUser.distance_km,
      age_match_score: matchedUser.age_match_score,
      gender_match_score: matchedUser.gender_match_score,
      goal_match_score: matchedUser.goal_match_score,
      total_score: matchedUser.total_score,
    })

    return NextResponse.json({
      status: "matched",
      callId: call.id,
      roomUrl,
      matchQuality: {
        score: matchedUser.total_score,
        distance: matchedUser.distance_km,
      },
    })
  } catch (err: any) {
    console.error("Matchmaking V2 error:", err)
    return NextResponse.json({ error: err.message || "Internal matchmaking error" }, { status: 500 })
  }
}
