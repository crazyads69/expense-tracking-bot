import { SetupTelegramBot } from "./services/telegram_bot";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to database");

    const bot = SetupTelegramBot();
    bot.launch();

    console.log("Telegram bot is running");
  } catch (error) {
    console.error("Error starting the application:", error);
  }
}

main();
