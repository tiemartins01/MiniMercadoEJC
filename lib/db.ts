import postgres from "postgres";

export const connectionString = () =>
  process.env.DATABASE_URL ||
  process.env.STORAGE_DATABASE_URL;

export const getDb = () =>
  postgres(connectionString()!, {
    ssl: "require",
    max: 1,
  });

export async function setup(
  sql: ReturnType<typeof postgres>
) {
  // =========================================================
  // PESSOAS
  // =========================================================

  await sql`
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

  // Remove a constraint antiga antes de migrar os dados.
  await sql`
    ALTER TABLE venda_pessoas
    DROP CONSTRAINT IF EXISTS venda_pessoas_tipo_check
  `;

  // Migra registros antigos de SERVO para SERVO_SALA.
  await sql`
    UPDATE venda_pessoas
    SET tipo = 'SERVO_SALA'
    WHERE tipo = 'SERVO'
  `;

  // Cria novamente a constraint com os novos tipos.
  await sql`
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

  // =========================================================
  // PRODUTOS
  // =========================================================

  await sql`
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

  await sql`
    CREATE TABLE IF NOT EXISTS venda_comandas (
      id BIGSERIAL PRIMARY KEY,

      pessoa_id BIGINT NOT NULL
        REFERENCES venda_pessoas(id),

      nome TEXT NOT NULL,

      tipo TEXT NOT NULL CHECK (
        tipo IN (
          'ENCONTRISTA',
          'SERVO_SALA'
        )
      ),

      cor TEXT NULL,

      status TEXT NOT NULL DEFAULT 'ABERTA'
        CHECK (
          status IN (
            'ABERTA',
            'PAGA'
          )
        ),

      valor_total NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

      pago_em TIMESTAMPTZ NULL
    )
  `;

  // =========================================================
  // PEDIDOS
  // =========================================================

  await sql`
    CREATE TABLE IF NOT EXISTS venda_pedidos (
      id BIGSERIAL PRIMARY KEY,

      pessoa_id BIGINT NULL
        REFERENCES venda_pessoas(id),

      comprador_nome TEXT NULL,

      tipo_comprador TEXT NOT NULL CHECK (
        tipo_comprador IN (
          'ENCONTRISTA',
          'SERVO_SALA',
          'SERVO_PADRAO'
        )
      ),

      cor TEXT NULL,

      valor_bruto NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      valor_retornado NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      valor_liquido NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      forma_pagamento TEXT
        NOT NULL DEFAULT 'PAGO'
        CHECK (
          forma_pagamento IN (
            'PAGO',
            'COMANDA'
          )
        ),

      pago_em TIMESTAMPTZ NULL,

      comanda_id BIGINT NULL
        REFERENCES venda_comandas(id),

      status TEXT
        NOT NULL DEFAULT 'FINALIZADO',

      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `;

  // Remove a constraint antiga antes da migração dos pedidos.
  await sql`
    ALTER TABLE venda_pedidos
    DROP CONSTRAINT IF EXISTS venda_pedidos_tipo_comprador_check
  `;

  // Migra pedidos antigos de SERVO para SERVO_PADRAO.
  await sql`
    UPDATE venda_pedidos
    SET tipo_comprador = 'SERVO_PADRAO'
    WHERE tipo_comprador = 'SERVO'
  `;

  // Cria novamente a constraint com os tipos atuais.
  await sql`
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

  // =========================================================
  // COLUNAS NOVAS EM VENDA_PEDIDOS
  // =========================================================

  await sql`
    ALTER TABLE venda_pedidos
    ADD COLUMN IF NOT EXISTS forma_pagamento TEXT
    NOT NULL DEFAULT 'PAGO'
  `;

  await sql`
    ALTER TABLE venda_pedidos
    ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ NULL
  `;

  await sql`
    ALTER TABLE venda_pedidos
    ADD COLUMN IF NOT EXISTS comanda_id BIGINT NULL
  `;

  // =========================================================
  // CONSTRAINT FORMA DE PAGAMENTO
  // =========================================================

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'venda_pedidos_forma_pagamento_check'
      ) THEN
        ALTER TABLE venda_pedidos
        ADD CONSTRAINT venda_pedidos_forma_pagamento_check
        CHECK (
          forma_pagamento IN (
            'PAGO',
            'COMANDA'
          )
        );
      END IF;
    END
    $$
  `;

  // =========================================================
  // FOREIGN KEY DA COMANDA
  // =========================================================

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'venda_pedidos_comanda_id_fkey'
      ) THEN
        ALTER TABLE venda_pedidos
        ADD CONSTRAINT venda_pedidos_comanda_id_fkey
        FOREIGN KEY (comanda_id)
        REFERENCES venda_comandas(id);
      END IF;
    END
    $$
  `;

  // =========================================================
  // ITENS DO PEDIDO
  // =========================================================

  await sql`
    CREATE TABLE IF NOT EXISTS venda_pedido_itens (
      id BIGSERIAL PRIMARY KEY,

      pedido_id BIGINT NOT NULL
        REFERENCES venda_pedidos(id),

      produto_id BIGINT NOT NULL
        REFERENCES venda_produtos(id),

      produto_nome TEXT NOT NULL,

      quantidade INTEGER NOT NULL
        CHECK (quantidade > 0),

      preco_unitario NUMERIC(12,2)
        NOT NULL,

      valor_total NUMERIC(12,2)
        NOT NULL
    )
  `;

  // =========================================================
  // MOVIMENTAÇÕES
  // =========================================================

  await sql`
    CREATE TABLE IF NOT EXISTS venda_movimentacoes (
      id BIGSERIAL PRIMARY KEY,

      produto_id BIGINT NOT NULL
        REFERENCES venda_produtos(id),

      pedido_id BIGINT NULL
        REFERENCES venda_pedidos(id),

      tipo TEXT NOT NULL CHECK (
        tipo IN (
          'VENDA',
          'RETORNO',
          'REPOSICAO',
          'NOVO_ITEM'
        )
      ),

      quantidade INTEGER NOT NULL,

      valor NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      observacao TEXT NULL,

      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `;

  // =========================================================
  // HISTÓRICO DE PREÇOS
  // =========================================================

  await sql`
    CREATE TABLE IF NOT EXISTS venda_precos_historico (
      id BIGSERIAL PRIMARY KEY,

      produto_id BIGINT NOT NULL
        REFERENCES venda_produtos(id),

      preco_anterior NUMERIC(12,2)
        NOT NULL,

      preco_novo NUMERIC(12,2)
        NOT NULL,

      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `;
  }