export interface Programa {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  createdAt: Date;
}

export interface Conta {
  id: string;
  nome: string;
  cpf: string;
  ativo: boolean;
  createdAt: Date;
}

export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: Date;
}

export interface Fornecedor {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: Date;
}

export interface Compra {
  id: string;
  programaId: string;
  contaId: string;
  fornecedorId: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  dataCompra: Date;
  dataPagamento?: Date;
  status: 'pendente' | 'pago';
  observacoes?: string;
  createdAt: Date;
}

export interface Venda {
  id: string;
  programaId: string;
  contaId: string;
  clienteId: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  dataVenda: Date;
  dataRecebimento?: Date;
  status: 'pendente' | 'recebido';
  observacoes?: string;
  createdAt: Date;
}

export interface ContaPagar {
  id: string;
  compraId?: string;
  descricao: string;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  status: 'pendente' | 'pago' | 'vencido';
  observacoes?: string;
  createdAt: Date;
}

export interface ContaReceber {
  id: string;
  vendaId?: string;
  descricao: string;
  valor: number;
  dataVencimento: Date;
  dataRecebimento?: Date;
  status: 'pendente' | 'recebido' | 'vencido';
  observacoes?: string;
  createdAt: Date;
}

export interface DashboardStats {
  totalMilhasEstoque: number;
  totalCompras: number;
  totalVendas: number;
  lucroTotal: number;
  contasPagarPendentes: number;
  contasReceberPendentes: number;
  milhasPorPrograma: { programa: string; quantidade: number }[];
  milhasPorConta: { conta: string; quantidade: number }[];
}
