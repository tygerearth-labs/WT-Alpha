import { TargetMetrics } from '@/lib/targetLogic';

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
  targetId?: string;
  allocationPercentage?: string;
}

export interface CategoryFormData {
  name: string;
  color: string;
  icon: string;
}

export interface SavingsTarget {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  initialInvestment: number;
  monthlyContribution: number;
  allocationPercentage: number;
  isAllocated: boolean;
  createdAt?: string;
  updatedAt?: string;
  allocations?: any[];
  currentMonthlyAllocation?: number;
  monthlyAchievement?: number;
  metrics?: TargetMetrics;
}

export interface PieChartData {
  name: string;
  amount: number;
  color: string;
  icon: string;
  count: number;
}
