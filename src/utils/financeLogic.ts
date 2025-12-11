import { addMonths, setDate, isAfter, startOfDay } from 'date-fns';

// --- CÁLCULO DE DATAS DE CARTÃO (CORRIGIDO) ---
export const calculateCardDates = (transactionDate: Date, closingDay: number, dueDay: number) => {
  const purchaseDate = startOfDay(new Date(transactionDate));
  
  // Data de fechamento no mês da compra
  const closingDateThisMonth = setDate(new Date(purchaseDate), closingDay);

  // Data base para o vencimento
  let targetMonthDate = purchaseDate;

  // Se comprou DEPOIS do fechamento, a fatura é a do próximo mês
  // Ex: Compra 15/11, Fechamento 14/11 -> Vai para fatura de Dezembro
  if (isAfter(purchaseDate, closingDateThisMonth)) {
    targetMonthDate = addMonths(purchaseDate, 1);
  }

  // Define o dia do vencimento no mês alvo
  let finalDueDate = setDate(targetMonthDate, dueDay);

  // Ajuste para cartões onde o vencimento vira o mês em relação ao fechamento
  // Ex: Fecha dia 25, Vence dia 05.
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
  // Custo das milhas vendidas baseado no CPM médio do estoque
  const costOfSoldMiles = (quantity / 1000) * currentAvgCpm;
  
  const profit = totalSaleValue - costOfSoldMiles;
  const profitPerThousand = (profit / quantity) * 1000;
  
  // Margem de lucro (%)
  const margin = costOfSoldMiles > 0 ? (profit / costOfSoldMiles) * 100 : 100;

  return {
    profit,
    profitPerThousand,
    margin
  };
};
