import { Transaction, PieChartData } from '@/types/transaction.types';

export function sortTransactionsByDate(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function calculateChartData(
  transactions: Transaction[],
  categories: { id: string; name: string; color: string; icon: string }[]
): PieChartData[] {
  return categories
    .map(cat => {
      const categoryTransactions = transactions.filter(t => t.categoryId === cat.id);
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        name: cat.name,
        amount: total,
        color: cat.color,
        icon: cat.icon,
        count: categoryTransactions.length,
      };
    })
    .filter(item => item.amount > 0);
}

export function calculateTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}
