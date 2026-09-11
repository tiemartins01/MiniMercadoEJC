import { NextResponse } from "next/server";

import { makeSession,
  sessionCookieName,
  sessionMaxAgeSeconds,
} from "@/lib/auth";

export async function POST(req: Request) {
  const { login, senha } = await req.json();

  // PEGA INFORMAÇÕES REGISTRADAS NO VERCEL
  const opLogin = process.env.OPERADOR_LOGIN;
  const opSenha = process.env.OPERADOR_SENHA;
  const adLogin = process.env.ADMIN_LOGIN;
  const adSenha = process.env.ADMIN_SENHA;

  if (!opLogin || !opSenha || !adLogin || !adSenha) {
    return NextResponse.json(
      { error: "Credenciais do sistema não configuradas." },
      { status: 500 },
    );
  }

  const role =
    login === adLogin && senha === adSenha
      ? "ADMIN"
      : login === opLogin && senha === opSenha
        ? "OPERADOR"
        : null;

  if (!role) {
    return NextResponse.json(
      { error: "Credenciais inválidas!" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true, role });

  res.cookies.set(sessionCookieName, makeSession(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
    expires: new Date(Date.now() + sessionMaxAgeSeconds * 1000),
  });

  return res;
}
