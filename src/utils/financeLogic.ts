import { addMonths, setDate, isAfter, startOfDay, isEqual, parseISO } from 'date-fns';

// --- CÁLCULO DE DATAS DE CARTÃO (COM PROTEÇÃO DE FUSO HORÁRIO) ---
export const calculateCardDates = (transactionDate: Date | string, closingDay: number, dueDay: number) => {
  // TRUQUE DO MEIO-DIA: Garante que não volta 1 dia por causa de fuso (GMT-3)
  // Se vier string "2025-11-27", vira "2025-11-27T12:00:00"
  const dateString = typeof transactionDate === 'string' 
    ? transactionDate.split('T')[0] 
    : transactionDate.toISOString().split('T')[0];
    
  const purchaseDate = new Date(`${dateString}T12:00:00`);
  
  // 1. Determina a data de fechamento NO MÊS DA COMPRA
  const closingDateThisMonth = setDate(new Date(purchaseDate), closingDay);

  // 2. Define o "Mês de Competência da Fatura"
  let referenceDate = purchaseDate;

  // REGRA: Se a compra for NO DIA do fechamento ou DEPOIS, pula para a próxima fatura
  if (isAfter(purchaseDate, closingDateThisMonth) || isEqual(purchaseDate, closingDateThisMonth)) {
    referenceDate = addMonths(purchaseDate, 1);
  }

  // 3. Define a Data de Pagamento (Vencimento)
  let finalDueDate = setDate(referenceDate, dueDay);

  // REGRA DE PAGAMENTO CRUZADO:
  // Se o dia do pagamento (ex: 06) for menor que o dia do fechamento (ex: 30),
  // significa que a fatura fecha num mês e paga no outro.
  if (dueDay < closingDay) {
    finalDueDate = addMonths(finalDueDate, 1);
  }

  return finalDueDate;
};

// --- GERAÇÃO DE PARCELAS ---
export const generateInstallments = (totalValue: number, count: number, firstDueDate: Date) => {
  const installmentValue = totalValue / count;
  const installments = [];

  // Garante hora fixa para evitar flutuação
  const baseDate = new Date(firstDueDate);
  baseDate.setHours(12, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const dueDate = addMonths(baseDate, i);
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
  if (!date) return '-';
  // Força interpretação local para exibição
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); 
  // O banco salva UTC. Ao ler, forçamos UTC na string pt-BR para bater o dia.
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
