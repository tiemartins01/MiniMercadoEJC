import postgres from "postgres";

export const connectionString = () => process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
export const getDb = () => postgres(connectionString()!, { ssl: "require", max: 1 });

export async function setup(sql: ReturnType<typeof postgres>) {
  await sql`CREATE TABLE IF NOT EXISTS venda_pessoas (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENCONTRISTA','SERVO')),
    cor TEXT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
  )`;
  await sql`CREATE TABLE IF NOT EXISTS venda_produtos (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    preco NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS venda_pedidos (
    id BIGSERIAL PRIMARY KEY,
    pessoa_id BIGINT NULL REFERENCES venda_pessoas(id),
    comprador_nome TEXT NULL,
    tipo_comprador TEXT NOT NULL CHECK (tipo_comprador IN ('ENCONTRISTA','SERVO')),
    cor TEXT NULL,
    valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_retornado NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_liquido NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'FINALIZADO',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS venda_pedido_itens (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT NOT NULL REFERENCES venda_pedidos(id),
    produto_id BIGINT NOT NULL REFERENCES venda_produtos(id),
    produto_nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS venda_movimentacoes (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL REFERENCES venda_produtos(id),
    pedido_id BIGINT NULL REFERENCES venda_pedidos(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('VENDA','RETORNO','REPOSICAO','NOVO_ITEM')),
    quantidade INTEGER NOT NULL,
    valor NUMERIC(12,2) NOT NULL DEFAULT 0,
    observacao TEXT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS venda_precos_historico (
    id BIGSERIAL PRIMARY KEY,
    produto_id BIGINT NOT NULL REFERENCES venda_produtos(id),
    preco_anterior NUMERIC(12,2) NOT NULL,
    preco_novo NUMERIC(12,2) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  const [{ count }] = await sql`SELECT COUNT(*)::int count FROM venda_produtos`;
  if (!count) {
    await sql`INSERT INTO venda_produtos (nome, descricao, preco, estoque) VALUES
      ('Camiseta EJC','Camiseta oficial do encontro',35,80),
      ('Caneca EJC','Caneca personalizada',20,50),
      ('Terço','Terço do encontro',15,70)`;
  }
}
