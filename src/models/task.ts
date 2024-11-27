// src/models/task.ts
import { z } from "zod";

export const TaskClassificationSchema = z.object({
  id: z.string(),
  task_type: z.enum(["EXPENSE_MANAGEMENT", "EXPENSE_ANALYSIS", "UNKNOWN"]),
  tables: z.array(z.enum(["expense_record", "task_classify"])),
  action: z.enum([
    // Analysis Actions
    "get_by_day",
    "get_by_current_day",
    "get_by_yesterday",
    "get_by_date",

    "get_by_month",
    "get_by_year",
    "get_by_date_range",
    "get_by_category",
    "get_by_payment_method",
    "get_by_amount_range",

    // Management Actions
    "create_expense",
    "update_expense",
    "delete_expense",
    "get_expense_by_id",

    "unknown",
  ]),
  time_range: z.string(),
  parameters: z
    .object({
      // Common parameters
      id: z.string().optional(),
      category: z
        .enum([
          "Ăn uống",
          "Di chuyển",
          "Tiện ích",
          "Giải trí",
          "Mua sắm",
          "Sức khỏe",
          "Học tập",
          "Nhà cửa",
          "Khác",
        ])
        .optional(),
      payment_method: z
        .enum(["Tiền mặt", "Thẻ ngân hàng", "Ví điện tử", "Khác"])
        .optional(),
      amount: z.number().optional(),
      description: z.string().optional(),

      // Analysis parameters
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      specific_date: z.string().optional(),
      amount_min: z.number().optional(),
      amount_max: z.number().optional(),
    })
    .optional(),
  user_id: z.string(),
  created_at: z.date().default(() => new Date()),
});
