import { addMonths, setDate, isAfter, startOfDay, isEqual } from 'date-fns';

// --- CÁLCULO DE DATAS DE CARTÃO (Lógica Confirmada) ---
export const calculateCardDates = (transactionDate: Date, closingDay: number, dueDay: number) => {
  const purchaseDate = startOfDay(new Date(transactionDate));
  
  // 1. Determina a data de fechamento NO MÊS DA COMPRA
  const closingDateThisMonth = setDate(new Date(purchaseDate), closingDay);

  // 2. Define o "Mês de Competência da Fatura"
  let referenceDate = purchaseDate;

  // REGRA: Se a compra for NO DIA do fechamento ou DEPOIS, pula para a próxima fatura
  // Ex: Fechamento dia 30. Compra dia 30 -> Próxima Fatura.
  if (isAfter(purchaseDate, closingDateThisMonth) || isEqual(purchaseDate, closingDateThisMonth)) {
    referenceDate = addMonths(purchaseDate, 1);
  }

  // 3. Define a Data de Pagamento (Vencimento)
  let finalDueDate = setDate(referenceDate, dueDay);

  // REGRA DE PAGAMENTO CRUZADO:
  // Se o dia do pagamento (ex: 06) for menor que o dia do fechamento (ex: 30),
  // significa que a fatura fecha num mês e paga no outro.
  // Ex: Fatura de Outubro (Fecha 30/10) -> Paga 06/11.
  if (dueDay < closingDay) {
    finalDueDate = addMonths(finalDueDate, 1);
  }

  return finalDueDate;
};

// --- GERAÇÃO DE PARCELAS ---
export const generateInstallments = (totalValue: number, count: number, firstDueDate: Date) => {
  const installmentValue = totalValue / count;
  const installments = [];

  for (let i = 0; i < count; i++) {
    const dueDate = addMonths(new Date(firstDueDate), i);
    installments.push({
      installmentNumber: i + 1,
      amount: installmentValue,
      dueDate: dueDate,
    });
  }

  return installments;
};

// --- FORMATAÇÃO DE MOEDA (R$) ---
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// --- FORMATAÇÃO DE NÚMEROS (Milhas) ---
export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

// --- FORMATAÇÃO DE CPM (Custo por Milheiro) ---
export const formatCPM = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// --- FORMATAÇÃO DE DATA ---
export const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

// --- CÁLCULO DE LUCRO DE VENDA ---
export const calculateSaleProfit = (totalSaleValue: number, quantity: number, currentAvgCpm: number) => {
  const costOfSoldMiles = (quantity / 1000) * currentAvgCpm;
  const profit = totalSaleValue - costOfSoldMiles;
  const profitPerThousand = quantity > 0 ? (profit / quantity) * 1000 : 0;
  const margin = costOfSoldMiles > 0 ? (profit / costOfSoldMiles) * 100 : 100;

  return {
    profit,
    profitPerThousand,
    margin
  };
};
