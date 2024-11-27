// src/services/telegram_bot.ts
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { ClassifyTask } from "./llm_classifier";
import { ExpenseService } from "./expense_service";
import { Expense } from "@prisma/client";

export function SetupTelegramBot() {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

  bot.start((ctx) => ctx.reply("Chào mừng đến với Bot Quản lý Chi tiêu!"));

  bot.on(message("text"), async (ctx) => {
    const userId = ctx.from.id.toString();
    const userMessage = ctx.message.text;

    console.log(`[INPUT] User ${userId}: ${userMessage}`);

    try {
      const currentDayTime = new Date();
      currentDayTime.setHours(currentDayTime.getHours() + 7); // Convert to Vietnam timezone (UTC+7)
      const classification = await ClassifyTask(
        userMessage,
        userId,
        currentDayTime
      );

      console.log(
        `[CLASSIFICATION] ${JSON.stringify(classification, null, 2)}`
      );

      let response = "";

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(amount);
      };

      const handleExpenseAnalysis = async (expenses: Expense[]) => {
        const categorySum = expenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {} as Record<string, number>);

        const totalSum = Object.values(categorySum).reduce(
          (sum, amount) => sum + amount,
          0
        );

        const categorySumString = Object.entries(categorySum)
          .map(([category, sum]) => `• ${category}: ${formatCurrency(sum)}`)
          .join("\n");

        return `Báo cáo chi tiêu:

${categorySumString}

Tổng cộng: ${formatCurrency(totalSum)}`;
      };

      switch (classification.action) {
        case "create_expense":
        case "update_expense":
          {
            const { amount, category, description, payment_method, id } =
              classification.parameters || {};
            if (amount && category && description) {
              const expenseData = {
                amount: amount as number,
                category: category as string,
                description: description as string,
                paymentMethod: (payment_method as string) || "Tiền mặt",
                userId: userId,
                date: new Date(),
              };

              const expense =
                classification.action === "create_expense"
                  ? await ExpenseService.createExpense(expenseData)
                  : await ExpenseService.updateExpense(
                      id as string,
                      expenseData
                    );

              response = `Đã ${
                classification.action === "create_expense" ? "thêm" : "cập nhật"
              } khoản chi tiêu thành công:
• Số tiền: ${formatCurrency(expense.amount)}
• Danh mục: ${expense.category}
• Mô tả: ${expense.description}
• Phương thức thanh toán: ${expense.paymentMethod}`;
            } else {
              response = `Xin lỗi, tôi cần thêm thông tin để ${
                classification.action === "create_expense" ? "tạo" : "cập nhật"
              } khoản chi tiêu. Vui lòng cung cấp số tiền, danh mục và mô tả.`;
            }
          }
          break;

        case "delete_expense":
          if (classification.parameters?.id) {
            await ExpenseService.deleteExpense(
              classification.parameters.id as string
            );
            response = "Khoản chi tiêu đã được xóa thành công.";
          } else {
            response =
              "Xin lỗi, tôi cần ID của khoản chi tiêu để xóa. Vui lòng cung cấp ID.";
          }
          break;

        case "get_expense_by_id":
          if (classification.parameters?.id) {
            const expense = await ExpenseService.getExpenseById(
              classification.parameters.id as string
            );
            response = expense
              ? `Chi tiết khoản chi tiêu:
• Số tiền: ${formatCurrency(expense.amount)}
• Danh mục: ${expense.category}
• Mô tả: ${expense.description}
• Phương thức thanh toán: ${expense.paymentMethod}
• Ngày: ${expense.date.toLocaleDateString("vi-VN")}`
              : "Xin lỗi, không tìm thấy khoản chi tiêu với ID đã cung cấp.";
          } else {
            response =
              "Xin lỗi, tôi cần ID của khoản chi tiêu để xem. Vui lòng cung cấp ID.";
          }
          break;

        case "get_by_date_range":
        case "get_by_category":
        case "get_by_payment_method":
        case "get_by_amount_range":
        case "get_by_day":
        case "get_by_date":
        case "get_by_current_day":
        case "get_by_yesterday":
        case "get_by_month":
        case "get_by_year":
          {
            let expenses: Expense[] = [];
            const {
              start_date,
              end_date,
              category,
              payment_method,
              amount_min,
              amount_max,
              specific_date,
            } = classification.parameters || {};

            switch (classification.action) {
              case "get_by_date_range":
                if (start_date && end_date) {
                  expenses = await ExpenseService.getExpensesByDateRange(
                    userId,
                    new Date(start_date as string),
                    new Date(end_date as string)
                  );
                }
                break;
              case "get_by_category":
                if (category) {
                  expenses = await ExpenseService.getExpensesByCategory(
                    userId,
                    category as string
                  );
                }
                break;
              case "get_by_payment_method":
                if (payment_method) {
                  expenses = await ExpenseService.getExpensesByPaymentMethod(
                    userId,
                    payment_method as string
                  );
                }
                break;
              case "get_by_amount_range":
                if (amount_min !== undefined && amount_max !== undefined) {
                  expenses = await ExpenseService.getExpensesByAmountRange(
                    userId,
                    amount_min as number,
                    amount_max as number
                  );
                }
                break;
              case "get_by_day":
                if (
                  classification.time_range &&
                  classification.parameters?.specific_date
                ) {
                  expenses = await ExpenseService.getByDay(
                    userId,
                    new Date(classification.parameters.specific_date as string)
                  );
                }
                break;
              case "get_by_date":
                if (classification.parameters?.specific_date) {
                  // Parse the date string
                  const [day, month, year] =
                    classification.parameters.specific_date.split("/");
                  const dateObject = new Date(+year, +month - 1, +day); // month is 0-indexed in JS Date

                  // Check if the date is valid
                  if (isNaN(dateObject.getTime())) {
                    throw new Error("Invalid date provided");
                  }
                }
                break;
              case "get_by_current_day":
                expenses = await ExpenseService.getByCurrentDay(userId);
                break;
              case "get_by_yesterday":
                expenses = await ExpenseService.getByYesterday(userId);
                break;
              case "get_by_month":
              case "get_by_year":
                {
                  let date = new Date();
                  if (
                    specific_date === "this_month" ||
                    specific_date === "this_year"
                  ) {
                    date = new Date();
                  } else if (
                    specific_date === "last_month" ||
                    specific_date === "last_year"
                  ) {
                    date = new Date(
                      date.setMonth(
                        date.getMonth() -
                          (classification.action === "get_by_month" ? 1 : 12)
                      )
                    );
                  } else if (specific_date) {
                    const [month, year] = specific_date.split("/").map(Number);
                    date = new Date(year, month - 1);
                  }
                  expenses =
                    classification.action === "get_by_month"
                      ? await ExpenseService.getByMonth(
                          userId,
                          date.getMonth() + 1,
                          date.getFullYear()
                        )
                      : await ExpenseService.getByYear(
                          userId,
                          date.getFullYear()
                        );
                }
                break;
            }

            if (expenses.length > 0) {
              response = await handleExpenseAnalysis(expenses);
            } else {
              response =
                "Không tìm thấy khoản chi tiêu nào trong khoảng thời gian này.";
            }
            console.log(
              `[ACTION] Retrieved expenses for ${classification.action}. Count: ${expenses.length}`
            );
          }
          break;

        default:
          response =
            "Xin lỗi, tôi không hiểu yêu cầu của bạn. Vui lòng thử lại với câu lệnh khác.";
          console.log(`[ACTION] Unknown action: ${classification.action}`);
      }
      console.log(`[RESPONSE] ${response}`);
      await ctx.reply(response);
    } catch (error) {
      console.error("Error processing message:", error);
      await ctx.reply(
        "Có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau."
      );
    }
  });

  return bot;
}
