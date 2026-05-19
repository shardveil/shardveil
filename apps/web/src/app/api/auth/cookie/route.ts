// POST: set httpOnly cookie
// DELETE: clear the cookie
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { jwt, expiresAt } = (await request.json()) as {
    jwt: string;
    expiresAt: number;
  };
  const cookieStore = await cookies();
  cookieStore.set("shardveil-auth-token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(expiresAt),
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("shardveil-auth-token");
  return NextResponse.json({ ok: true });
}
