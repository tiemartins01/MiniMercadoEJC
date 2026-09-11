import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

import {
  hashSessionToken,
  sessionCookieName,
} from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get(
      sessionCookieName,
    )?.value;

  if (token) {
    const tokenHash =
      hashSessionToken(token);

    const db = getDb();

    await db`
      UPDATE sessoes
      SET revogado_em = NOW()
      WHERE token_hash = ${tokenHash}
        AND revogado_em IS NULL
    `;
  }

  const res = NextResponse.json({
    ok: true,
  });

  res.cookies.set(
    sessionCookieName,
    "",
    {
      httpOnly: true,
      sameSite: "strict",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 0,
    },
  );

  return res;
}