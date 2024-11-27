// src/models/expense.ts
import { z } from "zod";

export const ExpenseSchema = z.object({
  id: z.string(),
  amount: z.number().positive(),
  category: z.enum([
    "Ăn uống",
    "Di chuyển",
    "Tiện ích",
    "Giải trí",
    "Mua sắm",
    "Sức khỏe",
    "Học tập",
    "Nhà cửa",
    "Khác",
  ]),
  description: z.string(),
  date: z.date().default(() => new Date()),
  paymentMethod: z
    .enum(["Tiền mặt", "Thẻ ngân hàng", "Ví điện tử", "Khác"])
    .default("Tiền mặt"),
  user_id: z.string(),
});

export type Expense = z.infer<typeof ExpenseSchema>;
