import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { registrarLogAuth } from "@/lib/auth-log";
import {
  hashSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        sessionCookieName,
      )?.value;

    if (token) {
      const tokenHash =
        hashSessionToken(token);

      const db = getDb();

      const rows = await db`
        UPDATE sessoes
        SET revogado_em = NOW()
        WHERE token_hash = ${tokenHash}
          AND revogado_em IS NULL
        RETURNING usuario_id
      `;

      const sessao = rows[0];

      if (sessao) {
        await registrarLogAuth({
          evento: "LOGOUT",
          usuarioId: Number(
            sessao.usuario_id,
          ),
        });
      }
    }

    const res = NextResponse.json({
      ok: true,
    });

    res.cookies.set(
      sessionCookieName,
      "",
      {
        ...sessionCookieOptions,
        maxAge: 0,
        expires: new Date(0),
      },
    );

    return res;
  } catch (error) {
    console.error(
      "Erro ao realizar logout:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao realizar logout.",
      },
      {
        status: 500,
      },
    );
  }
}