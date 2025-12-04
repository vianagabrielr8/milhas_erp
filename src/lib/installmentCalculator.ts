import { addMonths, setDate, isAfter, startOfDay } from 'date-fns';

interface CreditCard {
  closing_day: number;
  due_day: number;
}

/**
 * Calculate installment due dates based on credit card closing/due days
 */
export function calculateInstallmentDates(
  totalAmount: number,
  installments: number,
  purchaseDate: Date,
  creditCard: CreditCard
): { dueDate: Date; amount: number; installmentNumber: number }[] {
  const result: { dueDate: Date; amount: number; installmentNumber: number }[] = [];
  const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
  
  // Determine the first billing cycle
  const today = startOfDay(purchaseDate);
  let closingDate = setDate(today, creditCard.closing_day);
  
  // If purchase is after the closing date, it goes to next month's bill
  if (isAfter(today, closingDate) || today.getDate() === creditCard.closing_day) {
    closingDate = addMonths(closingDate, 1);
  }
  
  // First due date is in the month after the closing date
  let firstDueDate = setDate(addMonths(closingDate, 1), creditCard.due_day);
  
  // Handle adjustment for rounding
  let remaining = totalAmount;
  
  for (let i = 0; i < installments; i++) {
    const isLast = i === installments - 1;
    const amount = isLast ? Math.round(remaining * 100) / 100 : installmentAmount;
    remaining -= installmentAmount;
    
    result.push({
      installmentNumber: i + 1,
      dueDate: addMonths(firstDueDate, i),
      amount,
    });
  }
  
  return result;
}

/**
 * Calculate installment dates for receivables (without credit card)
 */
export function calculateReceivableInstallmentDates(
  totalAmount: number,
  installments: number,
  startDate: Date
): { dueDate: Date; amount: number; installmentNumber: number }[] {
  const result: { dueDate: Date; amount: number; installmentNumber: number }[] = [];
  const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
  
  let remaining = totalAmount;
  
  for (let i = 0; i < installments; i++) {
    const isLast = i === installments - 1;
    const amount = isLast ? Math.round(remaining * 100) / 100 : installmentAmount;
    remaining -= installmentAmount;
    
    result.push({
      installmentNumber: i + 1,
      dueDate: addMonths(startDate, i),
      amount,
    });
  }
  
  return result;
}

/**
 * Format CPM (Cost Per Thousand Miles)
 */
export function formatCPM(value: number | null): string {
  if (value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Calculate CPM from total cost and quantity
 */
export function calculateCPM(totalCost: number, quantity: number): number {
  if (quantity === 0) return 0;
  return (totalCost / quantity) * 1000;
}
