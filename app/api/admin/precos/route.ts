import { NextResponse } from "next/server";

import { currentRole } from "@/lib/auth";
import {
  connectionString,
  getDb,
  setup,
} from "@/lib/db";

export async function POST(req: Request) {
  if ((await currentRole()) !== "ADMIN") {
    return NextResponse.json(
      {
        error: "Acesso restrito",
      },
      {
        status: 403,
      },
    );
  }

  if (!connectionString()) {
    return NextResponse.json(
      {
        error: "Banco não configurado",
      },
      {
        status: 503,
      },
    );
  }

  const b = await req.json();
  const novo = Number(b.preco);
  const sql = getDb();

  try {
    await setup(sql);

    await sql.begin(async (tx) => {
      const [p] = await tx`
        SELECT preco::float
        FROM venda_produtos
        WHERE id = ${Number(b.produtoId)}
        FOR UPDATE
      `;

      if (!p || novo < 0) {
        throw new Error("Preço inválido");
      }

      await tx`
        INSERT INTO venda_precos_historico (
          produto_id,
          preco_anterior,
          preco_novo
        )
        VALUES (
          ${Number(b.produtoId)},
          ${p.preco},
          ${novo}
        )
      `;

      await tx`
        UPDATE venda_produtos
        SET
          preco = ${novo},
          atualizado_em = NOW()
        WHERE id = ${Number(b.produtoId)}
      `;
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error
          ? e.message
          : "Falha",
      },
      {
        status: 400,
      },
    );
  } finally {
    await sql.end();
  }
}