// pages/api/verify-room.js
import { NextResponse } from "next/server";

interface VerifyRoomResponse {
    exists?: boolean;
    error?: string;
}

export async function GET(request: Request): Promise<NextResponse<VerifyRoomResponse>> {
    const { searchParams } = new URL(request.url);
    const roomName: string | null = searchParams.get("name");

    if (!roomName) {
        return NextResponse.json({ error: "Nome da sala não fornecido." }, { status: 400 });
    }

    try {
        const res: Response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
                "Content-Type": "application/json",
            },
        });

        if (res.status === 200) {
            return NextResponse.json({ exists: true });
        } else if (res.status === 404) {
            return NextResponse.json({ exists: false });
        } else {
            const errorText: string = await res.text();
            return NextResponse.json({ error: errorText }, { status: res.status });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
