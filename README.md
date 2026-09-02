# EJC Vendas & Estoque

Novo projeto derivado visualmente do EJC Talentos, focado no mini mercado do encontro.

## Funcionalidades
- Login operacional e login admin por perfil.
- Painel com barra de itens vendidos / total movimentado.
- Venda para Encontrista (com filtro por cor e pessoa) ou Servo genérico.
- Carrinho com quantidade, preço unitário e total.
- Encerramento da venda em transação no PostgreSQL, com proteção de estoque concorrente.
- Retorno de itens, reposição e cadastro de novo item.
- Histórico de movimentações e de alterações de preço.
- Admin com total líquido, produtos e relatórios de sábado/domingo.
- Preço do item congelado na venda para preservar relatórios históricos.

## Configuração
1. Copie `.env.example` para `.env.local`.
2. Configure `DATABASE_URL` (PostgreSQL/Neon/Vercel Postgres).
3. Troque `SESSION_SECRET` e as credenciais antes de publicar.
4. Rode `npm install` e `npm run dev`.

As tabelas são criadas automaticamente no primeiro acesso ao banco. Três produtos de exemplo são inseridos quando a tabela de produtos está vazia.

## Pessoas / Encontristas
A tabela `venda_pessoas` possui `nome`, `tipo` (`ENCONTRISTA` ou `SERVO`) e `cor`. O filtro da tela de venda consulta essas colunas diretamente.

Exemplo SQL:
```sql
INSERT INTO venda_pessoas (nome, tipo, cor) VALUES
('Encontrista Exemplo', 'ENCONTRISTA', 'AZUL');
```

## Credenciais locais padrão
Somente para desenvolvimento, quando as variáveis não existem:
- Operador: `operador` / `ejc2026`
- Admin: `admin` / `admin2026`

Não publique usando as senhas padrão.
