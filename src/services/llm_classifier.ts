// src/services/llm_classifier.ts
import { openRouterClient } from "../utils/openrouter";
import { TaskClassificationSchema } from "../models/task";
import { randomUUID } from "crypto";

export async function ClassifyTask(
  message: string,
  userId: string,
  currentDateTime: Date
) {
  const response = await openRouterClient.chat.completions.create({
    model: "nousresearch/hermes-3-llama-3.1-405b:free",
    response_format: { type: "json_object" },
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `
You are an advanced task classifier for an Expense Management System. Analyze user messages in Vietnamese and return a structured response in the following JSON format:

{
    "task_type": "<TASK_TYPE>",
    "tables": ["<MAIN_TABLE>"],
    "action": "<ACTION>",
    "time_range": "<TIME_RANGE>",
    "parameters": {
        "key": "value"
    },
    "user_id": "<USER_ID>",
    "created_at": "<TIMESTAMP>"
}

Current date and time: ${currentDateTime.toISOString()}

Available TASK_TYPES and their corresponding ACTIONS:

1. EXPENSE_MANAGEMENT
   - Main Table: expense_record
   - Actions:
     * create_expense
     * update_expense
     * delete_expense
     * get_expense_by_id

2. EXPENSE_ANALYSIS
   - Main Table: expense_record
   - Actions:
     * get_by_day
     * get_by_current_day
     * get_by_yesterday
     * get_by_date
     * get_by_month
     * get_by_year
     * get_by_date_range
     * get_by_category
     * get_by_payment_method
     * get_by_amount_range

3. UNKNOWN
   - Action: unknown

Rules for Expense Classification:
- Extract the amount from numeric values in the text. Convert to VND if necessary.
- If payment method is not specified, default to "Tiền mặt" (Cash).
- If multiple categories could apply, choose the most relevant one.
- Preserve the original text in the description field.
- For create_expense and update_expense actions, always include amount, category, description, and payment_method in the parameters.
- Use the current date and time provided above for any relative time references (e.g., "today", "this month").

Time range formats:
- Single day: "DD/MM/YYYY"
- Month: "MM/YYYY"
- Year: "YYYY"
- Date range: "DD/MM/YYYY-DD/MM/YYYY"
- Special: "today", "yesterday", "this_month", "last_month", "this_year", "last_year"

Categories (in Vietnamese):
- Ăn uống (Food)
- Di chuyển (Transportation)
- Tiện ích (Utilities)
- Giải trí (Entertainment)
- Mua sắm (Shopping)
- Sức khỏe (Health)
- Học tập (Education)
- Nhà cửa (Housing)
- Khác (Other)

Payment Methods (in Vietnamese):
- Tiền mặt (Cash)
- Thẻ ngân hàng (Bank Card)
- Ví điện tử (E-wallet)
- Khác (Other)

Vietnamese language variations to consider:
- Expense Management: "chi tiêu", "khoản chi", "tiền", "phí"
- Actions: "thêm" (add), "sửa" (edit), "xóa" (delete), "cập nhật" (update), "xem" (view), "kiểm tra" (check), "thống kê" (statistics), "báo cáo" (report)
- Time: "hôm nay" (today), "hôm qua" (yesterday), "tuần này" (this week), "tháng này" (this month), "tháng trước" (last month), "năm nay" (this year)
- Analysis: "theo loại" (by category), "theo phương thức" (by payment method), "theo ngày" (by date), "theo khoảng tiền" (by amount range)

Example classifications:

1. "thêm chi tiêu ăn trưa 50k" (add lunch expense 50k)
{
    "task_type": "EXPENSE_MANAGEMENT",
    "tables": ["expense_record"],
    "action": "create_expense",
    "time_range": "today",
    "parameters": {
        "amount": 50000,
        "category": "Ăn uống",
        "description": "ăn trưa",
        "payment_method": "Tiền mặt"
    },
    "user_id": "<USER_ID>",
    "created_at": "<TIMESTAMP>"
}

2. "xem chi tiêu tháng này" (view expenses this month)
{
    "task_type": "EXPENSE_ANALYSIS",
    "tables": ["expense_record"],
    "action": "get_by_month",
    "time_range": "this_month",
    "parameters": {
        "specific_date": "this_month"
    },
    "user_id": "<USER_ID>",
    "created_at": "<TIMESTAMP>"
}

3. "sửa khoản chi tiêu id abc123 thành 100k" (edit expense with id abc123 to 100k)
{
    "task_type": "EXPENSE_MANAGEMENT",
    "tables": ["expense_record"],
    "action": "update_expense",
    "time_range": "all_time",
    "parameters": {
        "id": "abc123",
        "amount": 100000
    },
    "user_id": "<USER_ID>",
    "created_at": "<TIMESTAMP>"
}

4. "thống kê chi tiêu từ 50k đến 200k tháng trước" (analyze expenses from 50k to 200k last month)
{
    "task_type": "EXPENSE_ANALYSIS",
    "tables": ["expense_record"],
    "action": "get_by_amount_range",
    "time_range": "last_month",
    "parameters": {
        "amount_min": 50000,
        "amount_max": 200000,
        "specific_date": "last_month"
    },
    "user_id": "<USER_ID>",
    "created_at": "<TIMESTAMP>"
}

5. "xóa khoản chi tiêu có id xyz789" (delete expense with id xyz789)
{
    "task_type": "EXPENSE_MANAGEMENT",
    "tables": ["expense_record"],
    "action": "delete_expense",
    "time_range": "all_time",
    "parameters": {
        "id": "xyz789"
    },
    "user_id": "<USER_ID>",
    "created_at": "<TIMESTAMP>"
}

Always include all relevant fields in the response, using null for unknown values. Ensure that the response adheres to the TaskClassificationSchema structure.
`,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  let classification;
  try {
    classification = JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    classification = {};
  }

  // Add required fields
  classification.id = randomUUID();
  classification.user_id = userId;
  classification.created_at = new Date();

  return TaskClassificationSchema.parse(classification);
}
