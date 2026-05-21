import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface JwtPayload {
  sub?: string;
  exp?: number;
  jti?: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("shardveil-auth-token");

  if (!tokenCookie?.value) {
    return NextResponse.json({ authenticated: false });
  }

  const token = tokenCookie.value;

  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as JwtPayload;

    if (!payload.sub || !payload.exp) {
      return NextResponse.json({ authenticated: false });
    }

    const expiresAt = payload.exp * 1000;

    if (expiresAt < Date.now()) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      token,
      address: payload.sub,
      expiresAt,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
