// src/services/expense_service.ts
import { PrismaClient, Expense } from "@prisma/client";

const prisma = new PrismaClient().$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      const result = await query(args);
      return result;
    },
  },
});

// Helper function to convert a date to GMT+7
const toGMT7 = (date: Date): Date => {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
};

// Helper function to get the start and end of a day in GMT+7
const getDayBounds = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  end.setUTCHours(23, 59, 59, 999);
  return { start: toGMT7(start), end: toGMT7(end) };
};

export const ExpenseService = {
  createExpense: async (data: Omit<Expense, "id">) => {
    return prisma.expense.create({
      data: { ...data, date: toGMT7(data.date) },
    });
  },
  updateExpense: async (id: string, data: Partial<Omit<Expense, "id">>) => {
    if (data.date) {
      data.date = toGMT7(data.date);
    }
    return prisma.expense.update({ where: { id }, data });
  },
  deleteExpense: async (id: string) => {
    return prisma.expense.delete({ where: { id } });
  },
  getExpenseById: async (id: string) => {
    return prisma.expense.findUnique({ where: { id } });
  },
  getExpensesByDateRange: async (
    userId: string,
    startDate: Date,
    endDate: Date
  ) => {
    return prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: toGMT7(startDate),
          lte: toGMT7(endDate),
        },
      },
    });
  },
  getExpensesByCategory: async (userId: string, category: string) => {
    return prisma.expense.findMany({
      where: {
        userId,
        category,
      },
    });
  },
  getExpensesByPaymentMethod: async (userId: string, paymentMethod: string) => {
    return prisma.expense.findMany({
      where: {
        userId,
        paymentMethod,
      },
    });
  },
  getExpensesByAmountRange: async (
    userId: string,
    minAmount: number,
    maxAmount: number
  ) => {
    return prisma.expense.findMany({
      where: {
        userId,
        amount: {
          gte: minAmount,
          lte: maxAmount,
        },
      },
    });
  },
  getByDay: async (userId: string, date: Date) => {
    const { start, end } = getDayBounds(date);
    return prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });
  },
  getByCurrentDay: async (userId: string) => {
    const now = new Date();
    const { start, end } = getDayBounds(now);
    return prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });
  },
  getByYesterday: async (userId: string) => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const { start, end } = getDayBounds(now);
    return prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });
  },
  getByMonth: async (userId: string, month: number, year: number) => {
    const start = toGMT7(new Date(year, month - 1, 1));
    const end = toGMT7(new Date(year, month, 0, 23, 59, 59, 999));
    return prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });
  },
  getByYear: async (userId: string, year: number) => {
    const start = toGMT7(new Date(year, 0, 1));
    const end = toGMT7(new Date(year, 11, 31, 23, 59, 59, 999));
    return prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });
  },
};
