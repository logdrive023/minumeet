import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("Creating Daily room with API key:", process.env.DAILY_API_KEY?.substring(0, 5) + "...")

    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
          enable_chat: true,
          enable_screenshare: false,
          start_video_off: false,
          start_audio_off: false,
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
    return NextResponse.json({ url: data.url })
  } catch (error: any) {
    console.error("Error creating Daily room:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
