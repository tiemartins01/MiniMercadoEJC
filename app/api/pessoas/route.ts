import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { connectionString, getDb, setup } from "@/lib/db";

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
    return NextResponse.json({
      pessoas: [],
    });
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const cor = url.searchParams.get("cor");

  const sql = getDb();

  try {
    await setup(sql);

    const rows = await sql`
      SELECT
        id,
        nome,
        tipo,
        cor,
        ativo
      FROM venda_pessoas
      WHERE ativo = TRUE
        AND (${tipo}::text IS NULL OR tipo = ${tipo})
        AND (${cor}::text IS NULL OR cor = ${cor})
      ORDER BY nome
    `;

    return NextResponse.json({
      pessoas: rows,
    });
  } finally {
    await sql.end();
  }
}
