import { createServerClient } from "@/lib/supabase/server"
import { createDailyRoom } from "@/lib/daily"
import { NextResponse } from "next/server"

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

    // Get users in waiting queue, excluding the current user
    const { data: waitingUsers, error: waitingError } = await supabase
      .from("waiting_users")
      .select("user_id")
      .neq("user_id", userId)
      .order("timestamp", { ascending: true })
      .limit(1)

    if (waitingError) {
      console.error("Error getting waiting users:", waitingError)
      return NextResponse.json({ error: "Failed to get waiting users" }, { status: 500 })
    }

    // If no other users are waiting, add this user to the queue and return
    if (!waitingUsers || waitingUsers.length === 0) {
      console.log(`No waiting users found for ${userId}, adding to queue`)

      // Add user to waiting queue if not already there
      const { error: joinError } = await supabase.from("waiting_users").upsert({ user_id: userId }).select()

      if (joinError) {
        console.error("Error adding user to waiting queue:", joinError)
        return NextResponse.json({ error: "Failed to join waiting queue" }, { status: 500 })
      }

      return NextResponse.json({ status: "waiting", message: "No match found yet" })
    }

    const matchedUserId = waitingUsers[0].user_id
    console.log(`Found match for ${userId}: ${matchedUserId}`)

    // CRITICAL: Check if the matched user already has an active call
    const { data: matchedUserCall } = await supabase
      .from("calls")
      .select("id, room_url")
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

    // Create a Daily.co room
    let roomUrl
    try {
      roomUrl = await createDailyRoom()
      console.log(`Created new Daily room: ${roomUrl}`)
    } catch (error) {
      console.error("Error creating Daily room:", error)
      // Fallback to a demo room URL if we can't create one
      roomUrl = "https://v0.daily.co/hello"
      console.log("Using fallback demo room:", roomUrl)
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
    const { data: authUsers } = await supabase.auth.admin.listUsers({
      filters: {
        id: {
          in: [userId, matchedUserId].join(","),
        },
      },
    })

    const realUserIds = authUsers?.users.map((user) => user.id) || []
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
