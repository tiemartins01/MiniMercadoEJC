export type Role = "OPERADOR" | "ADMIN";

export type TipoPessoa =
  | "ENCONTRISTA"
  | "SERVO_SALA"
  | "SERVO_PADRAO";

export type TipoPagamento = "PAGO" | "COMANDA";

export type CorEncontrista =
  | "AZUL"
  | "AMARELO"
  | "VERDE"
  | "VERMELHO"
  | "LARANJA"
  | "ROSA";

export type Pessoa = {
  id: number;
  nome: string;
  tipo: TipoPessoa;
  cor: string | null;
  ativo: boolean;
};

export type Produto = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  ativo: boolean;
};

export type CartItem = Produto & {
  quantidade: number;
};

export type CompradorVenda = {
  tipoComprador: TipoPessoa;
  cor: string | null;
  pessoaId: number | null;
  compradorNome: string | null;
  formaPagamento: TipoPagamento;
};

export type Comanda = {
  id: number;
  pessoa_id: number;
  nome: string;
  tipo: "ENCONTRISTA" | "SERVO_SALA";
  cor: string | null;
  status: "ABERTA" | "PAGA";
  valor_total: number;
  criado_em: string;
  pago_em: string | null;
  quantidade_pedidos?: number;
};
