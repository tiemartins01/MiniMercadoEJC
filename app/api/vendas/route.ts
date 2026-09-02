import { NextResponse } from "next/server";
import { currentRole } from "@/lib/auth";
import { connectionString, getDb, setup } from "@/lib/db";
import type { TipoPagamento, TipoPessoa } from "@/lib/types";

type VendaBody = {
  tipoComprador: TipoPessoa;
  pessoaId?: number | null;
  compradorNome?: string | null;
  cor?: string | null;
  formaPagamento?: TipoPagamento;
  itens?: Array<{
    produtoId: number;
    quantidade: number;
  }>;
};

export async function POST(req: Request) {
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
        error: "Banco não configurado",
      },
      {
        status: 503,
      },
    );
  }

  const body = (await req.json()) as VendaBody;

  const tiposPermitidos: TipoPessoa[] = [
    "ENCONTRISTA",
    "SERVO_SALA",
    "SERVO_PADRAO",
  ];

  if (
    !tiposPermitidos.includes(body.tipoComprador) ||
    !Array.isArray(body.itens) ||
    !body.itens.length
  ) {
    return NextResponse.json(
      {
        error: "Venda inválida",
      },
      {
        status: 400,
      },
    );
  }

  // Regra atual de pagamento:
  // - Servo padrão paga no momento da venda.
  // - Encontrista e Servo Sala entram sempre em comanda.
  const formaPagamento: TipoPagamento =
    body.tipoComprador === "SERVO_PADRAO" ? "PAGO" : "COMANDA";

  if (body.tipoComprador !== "SERVO_PADRAO" && !body.pessoaId) {
    return NextResponse.json(
      {
        error: "Selecione a pessoa que está realizando a compra.",
      },
      {
        status: 400,
      },
    );
  }

  if (body.tipoComprador === "ENCONTRISTA" && !body.cor) {
    return NextResponse.json(
      {
        error: "A cor do Encontrista é obrigatória.",
      },
      {
        status: 400,
      },
    );
  }

  const sql = getDb();

  try {
    await setup(sql);

    const result = await sql.begin(async (tx) => {
      let compradorNome =
        body.tipoComprador === "SERVO_PADRAO"
          ? "Servo padrão"
          : body.compradorNome || null;

      let pessoaId: number | null = null;
      let cor: string | null =
        body.tipoComprador === "ENCONTRISTA" ? body.cor || null : null;

      if (body.tipoComprador !== "SERVO_PADRAO") {
        const [pessoa] = await tx`
          SELECT
            id,
            nome,
            tipo,
            cor,
            ativo
          FROM venda_pessoas
          WHERE id = ${Number(body.pessoaId)}
          FOR UPDATE
        `;

        if (!pessoa || !pessoa.ativo) {
          throw new Error("Pessoa não encontrada ou inativa.");
        }

        if (pessoa.tipo !== body.tipoComprador) {
          throw new Error("O tipo da pessoa selecionada não corresponde à venda.");
        }

        if (
          body.tipoComprador === "ENCONTRISTA" &&
          pessoa.cor !== body.cor
        ) {
          throw new Error("A cor selecionada não corresponde ao Encontrista.");
        }

        pessoaId = Number(pessoa.id);
        compradorNome = String(pessoa.nome);
        cor = body.tipoComprador === "ENCONTRISTA" ? pessoa.cor : null;
      }

      let total = 0;

      const normalized: Array<{
        id: number;
        nome: string;
        qtd: number;
        preco: number;
      }> = [];

      for (const item of body.itens!) {
        const [produto] = await tx`
          SELECT
            id,
            nome,
            preco::float,
            estoque,
            ativo
          FROM venda_produtos
          WHERE id = ${Number(item.produtoId)}
          FOR UPDATE
        `;

        const quantidade = Number(item.quantidade);

        if (
          !produto ||
          !produto.ativo ||
          !Number.isInteger(quantidade) ||
          quantidade <= 0 ||
          produto.estoque < quantidade
        ) {
          throw new Error(
            `Estoque insuficiente para ${produto?.nome || "produto"}.`,
          );
        }

        const preco = Number(produto.preco);
        const valor = preco * quantidade;

        total += valor;

        normalized.push({
          id: Number(produto.id),
          nome: String(produto.nome),
          qtd: quantidade,
          preco,
        });
      }

      let comandaId: number | null = null;

      if (formaPagamento === "COMANDA") {
        if (!pessoaId || !compradorNome) {
          throw new Error("Pessoa obrigatória para utilizar comanda.");
        }

        // A pessoa já foi bloqueada com FOR UPDATE acima. Isso evita duas
        // requisições criarem duas comandas abertas para a mesma pessoa.
        const [existente] = await tx`
          SELECT id
          FROM venda_comandas
          WHERE pessoa_id = ${pessoaId}
            AND status = 'ABERTA'
          ORDER BY criado_em DESC
          LIMIT 1
          FOR UPDATE
        `;

        if (existente) {
          comandaId = Number(existente.id);
        } else {
          const [nova] = await tx`
            INSERT INTO venda_comandas (
              pessoa_id,
              nome,
              tipo,
              cor,
              status
            )
            VALUES (
              ${pessoaId},
              ${compradorNome},
              ${body.tipoComprador},
              ${cor},
              'ABERTA'
            )
            RETURNING id
          `;

          comandaId = Number(nova.id);
        }
      }

      const [pedido] = await tx`
        INSERT INTO venda_pedidos (
          pessoa_id,
          comprador_nome,
          tipo_comprador,
          cor,
          valor_bruto,
          valor_liquido,
          forma_pagamento,
          pago_em,
          comanda_id
        )
        VALUES (
          ${pessoaId},
          ${compradorNome},
          ${body.tipoComprador},
          ${cor},
          ${total},
          ${total},
          ${formaPagamento},
          ${formaPagamento === "PAGO" ? new Date() : null},
          ${comandaId}
        )
        RETURNING
          id,
          criado_em
      `;

      for (const item of normalized) {
        await tx`
          INSERT INTO venda_pedido_itens (
            pedido_id,
            produto_id,
            produto_nome,
            quantidade,
            preco_unitario,
            valor_total
          )
          VALUES (
            ${pedido.id},
            ${item.id},
            ${item.nome},
            ${item.qtd},
            ${item.preco},
            ${item.preco * item.qtd}
          )
        `;

        await tx`
          UPDATE venda_produtos
          SET
            estoque = estoque - ${item.qtd},
            atualizado_em = NOW()
          WHERE id = ${item.id}
        `;

        await tx`
          INSERT INTO venda_movimentacoes (
            produto_id,
            pedido_id,
            tipo,
            quantidade,
            valor
          )
          VALUES (
            ${item.id},
            ${pedido.id},
            'VENDA',
            ${-item.qtd},
            ${item.preco * item.qtd}
          )
        `;
      }

      if (comandaId) {
        await tx`
          UPDATE venda_comandas
          SET valor_total = (
            SELECT COALESCE(SUM(valor_liquido), 0)
            FROM venda_pedidos
            WHERE comanda_id = ${comandaId}
              AND status = 'FINALIZADO'
          )
          WHERE id = ${comandaId}
        `;
      }

      return {
        pedidoId: Number(pedido.id),
        total,
        criadoEm: pedido.criado_em,
        comandaId,
        formaPagamento,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao finalizar venda",
      },
      {
        status: 409,
      },
    );
  } finally {
    await sql.end();
  }
}
