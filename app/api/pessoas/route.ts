import { NextResponse } from "next/server";

import { currentRole } from "@/lib/auth";

import {
  connectionString,
  getDb,
  setup,
} from "@/lib/db";

type PessoaRow = {
  id: number;
  nome: string;
  tipo: string;
  cor: string | null;
  ativo: boolean;
};

type DebugBancoRow = {
  banco: string;
  total: number;
  encontristas: number;
  servos_sala: number;
};

export async function GET(req: Request) {
  if (!(await currentRole())) {
    return NextResponse.json(
      {
        error: "Não autorizado",
      },
      {
        status: 401,
      },
    );
  }

  if (!connectionString()) {
    return NextResponse.json(
      {
        error: "DATABASE_URL não configurada.",
        pessoas: [],
      },
      {
        status: 500,
      },
    );
  }

  const url = new URL(req.url);

  const tipo = url.searchParams.get("tipo");
  const cor = url.searchParams.get("cor");

  const sql = getDb();

  try {
    await setup(sql);

    // =====================================================
    // DEBUG TEMPORÁRIO
    // Verifica qual banco a Vercel está consultando
    // e quantas pessoas existem nele.
    // =====================================================

    const debugBanco = await sql<DebugBancoRow[]>`
      SELECT
        current_database() AS banco,

        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE tipo = 'ENCONTRISTA'
          AND ativo = TRUE
        )::int AS encontristas,

        COUNT(*) FILTER (
          WHERE tipo = 'SERVO_SALA'
          AND ativo = TRUE
        )::int AS servos_sala

      FROM venda_pessoas
    `;

    console.log("DEBUG BANCO VERCEL:", debugBanco);

    console.log("FILTRO RECEBIDO:", {
      tipo,
      cor,
    });

    // =====================================================
    // BUSCA DAS PESSOAS
    // =====================================================

    let rows: PessoaRow[] = [];

    if (tipo === "ENCONTRISTA" && cor) {
      rows = await sql<PessoaRow[]>`
        SELECT
          id,
          nome,
          tipo,
          cor,
          ativo
        FROM venda_pessoas
        WHERE ativo = TRUE
          AND tipo = 'ENCONTRISTA'
          AND cor = ${cor}
        ORDER BY nome
      `;
    } else if (tipo === "ENCONTRISTA") {
      rows = await sql<PessoaRow[]>`
        SELECT
          id,
          nome,
          tipo,
          cor,
          ativo
        FROM venda_pessoas
        WHERE ativo = TRUE
          AND tipo = 'ENCONTRISTA'
        ORDER BY nome
      `;
    } else if (tipo === "SERVO_SALA") {
      rows = await sql<PessoaRow[]>`
        SELECT
          id,
          nome,
          tipo,
          cor,
          ativo
        FROM venda_pessoas
        WHERE ativo = TRUE
          AND tipo = 'SERVO_SALA'
        ORDER BY nome
      `;
    } else if (tipo === "SERVO_PADRAO") {
      rows = [];
    } else {
      rows = await sql<PessoaRow[]>`
        SELECT
          id,
          nome,
          tipo,
          cor,
          ativo
        FROM venda_pessoas
        WHERE ativo = TRUE
        ORDER BY nome
      `;
    }

    console.log("PESSOAS ENCONTRADAS:", rows.length);

    // =====================================================
    // RETORNO TEMPORÁRIO COM DEBUG
    // Depois que descobrirmos o problema,
    // podemos remover debug e filtro da resposta.
    // =====================================================

    return NextResponse.json({
      debug: debugBanco,
      filtro: {
        tipo,
        cor,
      },
      pessoas: rows,
    });
  } catch (error) {
    console.error(
      "ERRO AO BUSCAR PESSOAS:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar pessoas.",

        pessoas: [],
      },
      {
        status: 500,
      },
    );
  } finally {
    await sql.end();
  }
}