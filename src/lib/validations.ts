import { z } from 'zod';

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const urlRegex = /^https?:\/\/.+\..+/i;

export const registerSchema = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1),
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive().max(999_999_999),
  description: z.string().max(500).optional(),
  categoryId: z.string().optional(),
  date: z.string().optional(),
  targetId: z.string().optional(),
  allocationPercentage: z.number().min(0).max(100).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
  color: z.string().optional(),
  icon: z.string().max(100).optional(),
});

export const savingsTargetSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive().max(999_999_999),
  targetDate: z.string().min(1),
  initialInvestment: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  allocationPercentage: z.number().min(0).max(100).optional(),
  isAllocated: z.boolean().optional(),
});

export const profileSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).max(128).optional(),
  image: z.string().max(500).optional(),
  locale: z.enum(['id', 'en']).optional(),
  currency: z.string().max(3).optional(),
});
