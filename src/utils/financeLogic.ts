import { addMonths, setDate, isAfter, startOfDay, addDays } from 'date-fns';

interface CreditCard {
  closing_day: number;
  due_day: number;
}

interface Installment {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
}

/**
 * Calculate the first due date based on purchase date and credit card billing cycle
 * Logic: 
 * - If purchaseDate is BEFORE closingDay, payment is in the same month (on dueDay)
 * - If purchaseDate is ON or AFTER closingDay, payment is pushed to next month
 * Example: Closes day 5, due day 10. Purchase on Jan 6 -> Due Feb 10
 */
export function calculateCardDates(
  purchaseDate: Date,
  closingDay: number | null,
  dueDay: number | null
): Date {
  const today = startOfDay(purchaseDate);
  
  // Fallback: if no card data, use current date + 30 days
  if (!closingDay || !dueDay) {
    return addDays(today, 30);
  }

  // Get the closing date for the current month
  let closingDate = setDate(today, closingDay);
  
  // If purchase is ON or AFTER the closing date, it goes to next month's bill
  if (today.getDate() >= closingDay) {
    closingDate = addMonths(closingDate, 1);
  }
  
  // The due date is in the month after the closing month
  // If dueDay is less than closingDay, payment is in the same month as closing
  // If dueDay is greater than closingDay, payment is in the next month
  let dueDate: Date;
  
  if (dueDay > closingDay) {
    // Due date is in the same month as closing
    dueDate = setDate(closingDate, dueDay);
  } else {
    // Due date is in the month after closing
    dueDate = setDate(addMonths(closingDate, 1), dueDay);
  }
  
  return dueDate;
}

/**
 * Generate installment schedule with calculated amounts and due dates
 * Each installment increments by 1 month from the first due date
 */
export function generateInstallments(
  totalValue: number,
  installmentCount: number,
  firstDueDate: Date
): Installment[] {
  const result: Installment[] = [];
  
  // Calculate base installment amount (rounded to 2 decimals)
  const baseAmount = Math.floor((totalValue / installmentCount) * 100) / 100;
  
  // Track remaining to handle rounding differences
  let remaining = totalValue;
  
  for (let i = 0; i < installmentCount; i++) {
    const isLast = i === installmentCount - 1;
    // Last installment gets the remainder to avoid rounding errors
    const amount = isLast 
      ? Math.round(remaining * 100) / 100 
      : baseAmount;
    
    remaining -= baseAmount;
    
    result.push({
      installmentNumber: i + 1,
      dueDate: addMonths(firstDueDate, i),
      amount,
    });
  }
  
  return result;
}

/**
 * Generate installments for receivables starting from a specific date
 */
export function generateReceivableInstallments(
  totalValue: number,
  installmentCount: number,
  firstReceiveDate: Date
): Installment[] {
  return generateInstallments(totalValue, installmentCount, firstReceiveDate);
}

/**
 * Format CPM (Cost Per Thousand Miles)
 */
export function formatCPM(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Calculate CPM from total cost and quantity
 */
export function calculateCPM(totalCost: number, quantity: number): number {
  if (quantity === 0) return 0;
  return (totalCost / quantity) * 1000;
}

/**
 * Calculate estimated profit from a sale
 */
export function calculateSaleProfit(
  saleValue: number,
  quantity: number,
  avgCostPerMile: number
): { profit: number; profitPerThousand: number; margin: number } {
  const totalCost = avgCostPerMile * quantity;
  const profit = saleValue - totalCost;
  const profitPerThousand = quantity > 0 ? (profit / quantity) * 1000 : 0;
  const margin = saleValue > 0 ? (profit / saleValue) * 100 : 0;
  
  return { profit, profitPerThousand, margin };
}

/**
 * Format number as Brazilian locale
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Format date to dd/MM/yyyy
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}