import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

type UserType = 'client' | 'expert'

function isValidUserType(value: string): value is UserType {
  return value === 'client' || value === 'expert'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const roomName = String(body.roomName || '').trim()
    const participantName = String(body.participantName || '').trim()
    const userType = String(body.userType || '').trim()

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required.' },
        { status: 400 }
      )
    }

    if (!participantName) {
      return NextResponse.json(
        { error: 'Participant name is required.' },
        { status: 400 }
      )
    }

    if (!isValidUserType(userType)) {
      return NextResponse.json(
        { error: 'Invalid user type.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitUrl = process.env.LIVEKIT_URL

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: 'LiveKit environment variables are missing.' },
        { status: 500 }
      )
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: `${userType}-${participantName}`,
      ttl: '2h',
      metadata: JSON.stringify({
        userType,
      }),
    })

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    })

    const jwt = await token.toJwt()

    return NextResponse.json({
      token: jwt,
      url: livekitUrl,
    })
  } catch (error) {
    console.error('LIVEKIT_TOKEN_ERROR', error)

    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}