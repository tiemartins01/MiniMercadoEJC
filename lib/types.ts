export type Role = "OPERADOR" | "ADMIN";
export type TipoPessoa = "ENCONTRISTA" | "SERVO";
export type CorEncontrista = "AZUL" | "AMARELO" | "VERDE" | "VERMELHO" | "LARANJA" | "ROXO" | "ROSA" | "BRANCO";

export type Pessoa = { id: number; nome: string; tipo: TipoPessoa; cor: string | null; ativo: boolean };
export type Produto = { id: number; nome: string; descricao: string; preco: number; estoque: number; ativo: boolean };
export type CartItem = Produto & { quantidade: number };
