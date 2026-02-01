export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  _count?: {
    transactions: number;
  };
}

export interface TransactionFormData {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId: string;
  date: string;
}

export interface CategoryFormData {
  name: string;
  color: string;
  icon: string;
}

export interface PieChartData {
  name: string;
  amount: number;
  color: string;
  icon: string;
  count: number;
}
