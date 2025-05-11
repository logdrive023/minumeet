export const createDailyRoom = async (expiryMinutes = 5) => {
  try {
    console.log("Creating Daily room with API key:", process.env.DAILY_API_KEY?.substring(0, 5) + "...")

    // Calculate expiration time in seconds from now
    const expirySeconds = Math.floor(Date.now() / 1000) + expiryMinutes * 60

    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          exp: expirySeconds, // Room will expire after specified minutes
          enable_chat: true,
          enable_screenshare: false,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true, // This will kick users out when the room expires
          //eject_after_elapsed: expiryMinutes * 60, // Alternative: kick users out after this many seconds
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("Daily.co API error:", errorText)
      throw new Error(`Failed to create Daily room: ${res.status} ${errorText}`)
    }

    const data = await res.json()
    console.log("Daily room created successfully:", data)
    return data.url // use to redirect both users
  } catch (error) {
    console.error("Error creating Daily room:", error)
    throw error
  }
}
