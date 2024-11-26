// src/services/llm-classifier.ts
import { openRouterClient } from "../utils/openrouter";
import { ExpenseSchema } from "../models/expense";
import { randomUUID } from "crypto";

export async function classifyExpense(
  expenseText: string,
  userId: string,
  currentTime: Date
) {
  const response = await openRouterClient.chat.completions.create({
    model: "nousresearch/hermes-3-llama-3.1-405b:free",
    response_format: { type: "json_object" },
    temperature: 0.3, // Lower temperature for more deterministic results (Focus on the rules)
    messages: [
      {
        role: "system",
        content: `
          You are an expense classification AI that processes Vietnamese expense entries.
          Given an expense description, extract and classify the information into a structured format.
          
          Rules:
          - Amount should be extracted from numeric values in the text
          - If payment method is not specified, default to "Tiền mặt"
          - If multiple categories could apply, choose the most relevant one
          - Preserve the original text in the description field
          
          Categories (choose one):
          - Ăn uống (Food & Beverages)
          - Di chuyển (Transportation)
          - Tiện ích (Utilities)
          - Giải trí (Entertainment)
          - Mua sắm (Shopping)
          - Sức khỏe (Health)
          - Học tập (Education)
          - Nhà cửa (Housing)
          - Khác (Others)
          
          Payment Methods:
          - Tiền mặt (Cash)
          - Thẻ ngân hàng (Bank Card)
          - Ví điện tử (E-wallet)
          - Khác (Others)
          
          Return a JSON object with these fields:
          - id: generated UUID string
          - amount: positive number
          - category: one of the predefined categories
          - description: original input text
          - date: current timestamp
          - paymentMethod: one of the predefined payment methods
          - user_id: provided user ID
        `,
      },
      {
        role: "user",
        content: expenseText,
      },
    ],
  });

  const classification = JSON.parse(
    response.choices[0].message.content || "{}"
  );

  // Add required fields
  classification.id = randomUUID();
  classification.date = currentTime;
  classification.user_id = userId;

  return ExpenseSchema.parse(classification);
}
