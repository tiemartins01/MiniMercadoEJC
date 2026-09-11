import argon2 from "argon2";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

import {
  createSessionToken,
  hashSessionToken,
  sessionCookieName,
  sessionMaxAgeSeconds,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const login =
      typeof body.login === "string"
        ? body.login.trim()
        : "";

    const senha =
      typeof body.senha === "string"
        ? body.senha
        : "";

    if (!login || !senha) {
      return NextResponse.json(
        {
          error: "Usuário ou senha inválidos.",
        },
        {
          status: 401,
        },
      );
    }

    const db = getDb();

    const usuarios = await db`
      SELECT
        id,
        nome,
        login,
        senha_hash,
        role,
        ativo
      FROM usuarios
      WHERE login = ${login}
      LIMIT 1
    `;

    const usuario = usuarios[0];

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        {
          error: "Usuário ou senha inválidos.",
        },
        {
          status: 401,
        },
      );
    }

    const senhaCorreta = await argon2.verify(
      usuario.senha_hash,
      senha,
    );

    if (!senhaCorreta) {
      return NextResponse.json(
        {
          error: "Usuário ou senha inválidos.",
        },
        {
          status: 401,
        },
      );
    }

    const token = createSessionToken();

    const tokenHash =
      hashSessionToken(token);

    const expiraEm = new Date(
      Date.now() +
        sessionMaxAgeSeconds * 1000,
    );

    await db`
      INSERT INTO sessoes (
        usuario_id,
        token_hash,
        expira_em
      )
      VALUES (
        ${usuario.id},
        ${tokenHash},
        ${expiraEm}
      )
    `;

    const res = NextResponse.json({
      ok: true,
      role: usuario.role,
    });

    res.cookies.set(
      sessionCookieName,
      token,
      {
        httpOnly: true,
        sameSite: "strict",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge: sessionMaxAgeSeconds,
        expires: expiraEm,
      },
    );

    return res;
  } catch (error) {
    console.error(
      "Erro ao realizar login:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao realizar login.",
      },
      {
        status: 500,
      },
    );
  }
}