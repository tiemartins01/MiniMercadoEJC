import postgres from "postgres";

export const connectionString = () =>
  process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;

export const getDb = () =>
  postgres(connectionString()!, {
    ssl: "require",
    max: 1,
  });

const SCHEMA_LOCK_ID = 82736491;

export async function setup(sql: ReturnType<typeof postgres>) {
  await sql.begin(async (tx) => {
    // Impede duas instâncias da aplicação de executarem a migração ao mesmo tempo.
    await tx`SELECT pg_advisory_xact_lock(${SCHEMA_LOCK_ID})`;

    // =========================================================
    // PESSOAS
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_pessoas (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (
          tipo IN (
            'ENCONTRISTA',
            'SERVO_SALA',
            'SERVO_PADRAO'
          )
        ),
        cor TEXT NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE
      )
    `;

    const [pessoasTipoConstraint] = await tx`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'venda_pessoas'::regclass
        AND conname = 'venda_pessoas_tipo_check'
      LIMIT 1
    `;

    const pessoasTipoDefinition = String(
      pessoasTipoConstraint?.definition || "",
    );

    const precisaMigrarTipoPessoa =
      !pessoasTipoDefinition.includes("SERVO_SALA") ||
      !pessoasTipoDefinition.includes("SERVO_PADRAO");

    if (precisaMigrarTipoPessoa) {
      await tx`
        ALTER TABLE venda_pessoas
        DROP CONSTRAINT IF EXISTS venda_pessoas_tipo_check
      `;

      await tx`
        UPDATE venda_pessoas
        SET tipo = 'SERVO_SALA'
        WHERE tipo = 'SERVO'
      `;

      await tx`
        ALTER TABLE venda_pessoas
        ADD CONSTRAINT venda_pessoas_tipo_check
        CHECK (
          tipo IN (
            'ENCONTRISTA',
            'SERVO_SALA',
            'SERVO_PADRAO'
          )
        )
      `;
    }

    // =========================================================
    // PRODUTOS
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_produtos (
        id BIGSERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        preco NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
        estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // =========================================================
    // COMANDAS
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_comandas (
        id BIGSERIAL PRIMARY KEY,
        pessoa_id BIGINT NOT NULL REFERENCES venda_pessoas(id),
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK (
          tipo IN (
            'ENCONTRISTA',
            'SERVO_SALA'
          )
        ),
        cor TEXT NULL,
        status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (
          status IN (
            'ABERTA',
            'PAGA'
          )
        ),
        valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pago_em TIMESTAMPTZ NULL
      )
    `;

    // =========================================================
    // PEDIDOS
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_pedidos (
        id BIGSERIAL PRIMARY KEY,
        pessoa_id BIGINT NULL REFERENCES venda_pessoas(id),
        comprador_nome TEXT NULL,
        tipo_comprador TEXT NOT NULL CHECK (
          tipo_comprador IN (
            'ENCONTRISTA',
            'SERVO_SALA',
            'SERVO_PADRAO'
          )
        ),
        cor TEXT NULL,
        valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
        valor_retornado NUMERIC(12,2) NOT NULL DEFAULT 0,
        valor_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
        forma_pagamento TEXT NOT NULL DEFAULT 'PAGO' CHECK (
          forma_pagamento IN (
            'PAGO',
            'COMANDA'
          )
        ),
        pago_em TIMESTAMPTZ NULL,
        comanda_id BIGINT NULL REFERENCES venda_comandas(id),
        status TEXT NOT NULL DEFAULT 'FINALIZADO',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const [pedidosTipoConstraint] = await tx`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'venda_pedidos'::regclass
        AND conname = 'venda_pedidos_tipo_comprador_check'
      LIMIT 1
    `;

    const pedidosTipoDefinition = String(
      pedidosTipoConstraint?.definition || "",
    );

    const precisaMigrarTipoPedido =
      !pedidosTipoDefinition.includes("SERVO_SALA") ||
      !pedidosTipoDefinition.includes("SERVO_PADRAO");

    if (precisaMigrarTipoPedido) {
      await tx`
        ALTER TABLE venda_pedidos
        DROP CONSTRAINT IF EXISTS venda_pedidos_tipo_comprador_check
      `;

      await tx`
        UPDATE venda_pedidos
        SET tipo_comprador = 'SERVO_PADRAO'
        WHERE tipo_comprador = 'SERVO'
      `;

      await tx`
        ALTER TABLE venda_pedidos
        ADD CONSTRAINT venda_pedidos_tipo_comprador_check
        CHECK (
          tipo_comprador IN (
            'ENCONTRISTA',
            'SERVO_SALA',
            'SERVO_PADRAO'
          )
        )
      `;
    }

    await tx`
      ALTER TABLE venda_pedidos
      ADD COLUMN IF NOT EXISTS forma_pagamento TEXT NOT NULL DEFAULT 'PAGO'
    `;

    await tx`
      ALTER TABLE venda_pedidos
      ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ NULL
    `;

    await tx`
      ALTER TABLE venda_pedidos
      ADD COLUMN IF NOT EXISTS comanda_id BIGINT NULL
    `;

    const [pagamentoConstraint] = await tx`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'venda_pedidos'::regclass
        AND conname = 'venda_pedidos_forma_pagamento_check'
      LIMIT 1
    `;

    const pagamentoDefinition = String(
      pagamentoConstraint?.definition || "",
    );

    if (
      !pagamentoDefinition.includes("PAGO") ||
      !pagamentoDefinition.includes("COMANDA")
    ) {
      await tx`
        ALTER TABLE venda_pedidos
        DROP CONSTRAINT IF EXISTS venda_pedidos_forma_pagamento_check
      `;

      await tx`
        ALTER TABLE venda_pedidos
        ADD CONSTRAINT venda_pedidos_forma_pagamento_check
        CHECK (forma_pagamento IN ('PAGO', 'COMANDA'))
      `;
    }

    const [comandaForeignKey] = await tx`
      SELECT 1 AS existe
      FROM pg_constraint
      WHERE conrelid = 'venda_pedidos'::regclass
        AND conname = 'venda_pedidos_comanda_id_fkey'
      LIMIT 1
    `;

    if (!comandaForeignKey) {
      await tx`
        ALTER TABLE venda_pedidos
        ADD CONSTRAINT venda_pedidos_comanda_id_fkey
        FOREIGN KEY (comanda_id)
        REFERENCES venda_comandas(id)
      `;
    }

    // =========================================================
    // ITENS DO PEDIDO
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_pedido_itens (
        id BIGSERIAL PRIMARY KEY,
        pedido_id BIGINT NOT NULL REFERENCES venda_pedidos(id),
        produto_id BIGINT NOT NULL REFERENCES venda_produtos(id),
        produto_nome TEXT NOT NULL,
        quantidade INTEGER NOT NULL CHECK (quantidade > 0),
        preco_unitario NUMERIC(12,2) NOT NULL,
        valor_total NUMERIC(12,2) NOT NULL
      )
    `;

    // =========================================================
    // MOVIMENTAÇÕES
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_movimentacoes (
        id BIGSERIAL PRIMARY KEY,
        produto_id BIGINT NOT NULL REFERENCES venda_produtos(id),
        pedido_id BIGINT NULL REFERENCES venda_pedidos(id),
        tipo TEXT NOT NULL CHECK (
          tipo IN (
            'VENDA',
            'RETORNO',
            'REPOSICAO',
            'NOVO_ITEM'
          )
        ),
        quantidade INTEGER NOT NULL,
        valor NUMERIC(12,2) NOT NULL DEFAULT 0,
        observacao TEXT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // =========================================================
    // HISTÓRICO DE PREÇOS
    // =========================================================

    await tx`
      CREATE TABLE IF NOT EXISTS venda_precos_historico (
        id BIGSERIAL PRIMARY KEY,
        produto_id BIGINT NOT NULL REFERENCES venda_produtos(id),
        preco_anterior NUMERIC(12,2) NOT NULL,
        preco_novo NUMERIC(12,2) NOT NULL,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Mantém os produtos iniciais somente quando a tabela estiver vazia.
    const [{ count }] = await tx`
      SELECT COUNT(*)::int AS count
      FROM venda_produtos
    `;

    if (!Number(count)) {
      await tx`
        INSERT INTO venda_produtos (
          nome,
          descricao,
          preco,
          estoque
        )
        VALUES
          (
            'Camiseta EJC',
            'Camiseta oficial do encontro',
            35,
            80
          ),
          (
            'Caneca EJC',
            'Caneca personalizada',
            20,
            50
          ),
          (
            'Terço',
            'Terço do encontro',
            15,
            70
          )
      `;
    }
  });
}
