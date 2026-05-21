import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { jwt, expiresAt } = body as {
      jwt: string;
      expiresAt: number;
    };

    if (!jwt || typeof expiresAt !== "number") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set("shardveil-auth-token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(expiresAt),
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Bad request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();

  cookieStore.set("shardveil-auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  return NextResponse.json({ ok: true });
}