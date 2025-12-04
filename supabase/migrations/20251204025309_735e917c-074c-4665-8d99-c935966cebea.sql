-- Criar ENUM para tipos de transação
CREATE TYPE public.transaction_type AS ENUM (
  'COMPRA',
  'BONUS',
  'TRANSF_ENTRADA',
  'TRANSF_SAIDA',
  'VENDA',
  'USO',
  'EXPIROU'
);

-- Criar ENUM para status de parcela
CREATE TYPE public.installment_status AS ENUM (
  'pendente',
  'pago',
  'vencido'
);

-- Tabela: programs (Programas de fidelidade)
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: credit_cards (Cartões de crédito)
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: suppliers (Fornecedores)
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: clients (Clientes)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: accounts (Contas/CPFs para milhas)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: transactions (Transações de milhas - coração do sistema)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE RESTRICT NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  type public.transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  total_cost NUMERIC(12,2) DEFAULT 0,
  sale_price NUMERIC(12,2) DEFAULT 0,
  cost_per_thousand NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN quantity > 0 AND total_cost > 0 THEN (total_cost / quantity) * 1000
      ELSE 0
    END
  ) STORED,
  sale_per_thousand NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN quantity < 0 AND sale_price > 0 THEN (sale_price / ABS(quantity)) * 1000
      ELSE 0
    END
  ) STORED,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: payables (Contas a Pagar com parcelamento)
CREATE TABLE public.payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installments INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: payable_installments (Parcelas de contas a pagar)
CREATE TABLE public.payable_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id UUID REFERENCES public.payables(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status public.installment_status DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: receivables (Contas a Receber com parcelamento)
CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installments INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela: receivable_installments (Parcelas de contas a receber)
CREATE TABLE public.receivable_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receivable_id UUID REFERENCES public.receivables(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  received_date DATE,
  status public.installment_status DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar índices para performance
CREATE INDEX idx_transactions_program ON public.transactions(program_id);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transactions_expiration ON public.transactions(expiration_date);
CREATE INDEX idx_payable_installments_due ON public.payable_installments(due_date);
CREATE INDEX idx_receivable_installments_due ON public.receivable_installments(due_date);

-- Inserir programas iniciais
INSERT INTO public.programs (name, slug) VALUES
  ('Smiles', 'smiles'),
  ('LATAM Pass', 'latam-pass'),
  ('Livelo', 'livelo'),
  ('Esfera', 'esfera'),
  ('Azul Fidelidade', 'azul-fidelidade');

-- Inserir contas iniciais (CPFs)
INSERT INTO public.accounts (name, cpf) VALUES
  ('Gabriel Viana', ''),
  ('Ingrid Bittencourt', '');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payable_installments_updated_at BEFORE UPDATE ON public.payable_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_receivable_installments_updated_at BEFORE UPDATE ON public.receivable_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- View para calcular saldo de milhas por programa e conta
CREATE OR REPLACE VIEW public.miles_balance AS
SELECT 
  p.id as program_id,
  p.name as program_name,
  a.id as account_id,
  a.name as account_name,
  COALESCE(SUM(t.quantity), 0) as balance,
  COALESCE(SUM(CASE WHEN t.quantity > 0 THEN t.total_cost ELSE 0 END), 0) as total_invested,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END), 0) > 0 
    THEN (COALESCE(SUM(CASE WHEN t.quantity > 0 THEN t.total_cost ELSE 0 END), 0) / 
          COALESCE(SUM(CASE WHEN t.quantity > 0 THEN t.quantity ELSE 0 END), 1)) * 1000
    ELSE 0
  END as avg_cpm
FROM public.programs p
CROSS JOIN public.accounts a
LEFT JOIN public.transactions t ON t.program_id = p.id AND t.account_id = a.id
WHERE p.active = true AND a.active = true
GROUP BY p.id, p.name, a.id, a.name;

-- View para milhas próximas ao vencimento (30 dias)
CREATE OR REPLACE VIEW public.expiring_miles AS
SELECT 
  t.id,
  p.name as program_name,
  a.name as account_name,
  t.quantity,
  t.expiration_date,
  t.expiration_date - CURRENT_DATE as days_until_expiration
FROM public.transactions t
JOIN public.programs p ON t.program_id = p.id
JOIN public.accounts a ON t.account_id = a.id
WHERE t.expiration_date IS NOT NULL 
  AND t.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
  AND t.expiration_date >= CURRENT_DATE
  AND t.quantity > 0
ORDER BY t.expiration_date ASC;