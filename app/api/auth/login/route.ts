import argon2 from "argon2";
import { NextResponse } from "next/server";
import { z } from "zod";

import { registrarLogAuth } from "@/lib/auth-log";
import { getDb } from "@/lib/db";
import {
  limparTentativasLogin,
  registrarFalhaLogin,
  verificarBloqueio,
} from "@/lib/login-rate-limit";
import { limparSessoesAntigas } from "@/lib/sessions";

import {
  createSessionToken,
  hashSessionToken,
  sessionCookieName,
  sessionCookieOptions,
  sessionMaxAgeSeconds,
} from "@/lib/auth";

const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(3)
    .max(100),

  senha: z
    .string()
    .min(8)
    .max(200),
});

export async function POST(req: Request) {
  try {
    // 1. Recebe os dados enviados pela página de login
    const body = await req.json();

    // 2. Valida login e senha com Zod
    const resultado = loginSchema.safeParse(body);

    if (!resultado.success) {
      return NextResponse.json(
        {
          error: "Usuário ou senha inválidos.",
        },
        {
          status: 400,
        },
      );
    }

    const { login, senha } = resultado.data;

    // 3. Descobre o IP da requisição
    const forwardedFor = req.headers.get("x-forwarded-for");

    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "desconhecido";

    // 4. Verifica se IP + login estão bloqueados
    const bloqueio = await verificarBloqueio(ip, login);

    if (bloqueio.bloqueado) {
      await registrarLogAuth({
        evento: "LOGIN_BLOQUEADO",
        ip,
        login,
      });

      return NextResponse.json(
        {
          error:
            "Muitas tentativas de login. Tente novamente mais tarde.",
        },
        {
          status: 429,
        },
      );
    }

    // 5. Conecta ao Neon
    const db = getDb();

    // 6. Procura o usuário
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

    // 7. Usuário inexistente ou desativado
    if (!usuario || !usuario.ativo) {
      await registrarFalhaLogin(ip, login);

      await registrarLogAuth({
        evento: "LOGIN_FALHA",
        ip,
        login,
      });

      return NextResponse.json(
        {
          error: "Usuário ou senha inválidos.",
        },
        {
          status: 401,
        },
      );
    }

    // 8. Confere a senha usando Argon2
    const senhaCorreta = await argon2.verify(
      usuario.senha_hash,
      senha,
    );

    // 9. Senha incorreta
    if (!senhaCorreta) {
      await registrarFalhaLogin(ip, login);

      await registrarLogAuth({
        evento: "LOGIN_FALHA",
        usuarioId: Number(usuario.id),
        ip,
        login,
      });

      return NextResponse.json(
        {
          error: "Usuário ou senha inválidos.",
        },
        {
          status: 401,
        },
      );
    }

    // 10. Login correto: limpa tentativas erradas
    await limparTentativasLogin(ip, login);

    // 11. Remove sessões antigas/expiradas
    await limparSessoesAntigas();

    // 12. Gera novo token de sessão
    const token = createSessionToken();

    // 13. Salva apenas o hash do token no banco
    const tokenHash = hashSessionToken(token);

    // 14. Define o tempo de expiração da sessão
    const expiraEm = new Date(
      Date.now() + sessionMaxAgeSeconds * 1000,
    );

    // 15. Registra a nova sessão no Neon
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

    // 16. Registra o login bem-sucedido
    await registrarLogAuth({
      evento: "LOGIN_SUCESSO",
      usuarioId: Number(usuario.id),
      ip,
      login,
    });

    // 17. Prepara resposta
    const res = NextResponse.json({
  ok: true,
  role: usuario.role,
});

res.cookies.set(
  sessionCookieName,
  token,
  {
    ...sessionCookieOptions,
    maxAge: sessionMaxAgeSeconds,
    expires: expiraEm,
  },
);

return res;

  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return NextResponse.json(
      {
        error: "Erro interno ao realizar login.",
      },
      {
        status: 500,
      },
    );
  }
}