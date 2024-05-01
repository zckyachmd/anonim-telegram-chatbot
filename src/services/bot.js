import dotenv from "dotenv";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import contextModify from "../middlewares/contextMod.js";
import userLogs from "../middlewares/userLogs.js";
import messageLogs from "../middlewares/messageLogs.js";
import detectUsername from "../middlewares/detectUsername.js";
import filterCommands from "../middlewares/filterCommands.js";
import handleIncomingMessage from "../services/reply.js";
import * as commands from "../services/commands.js";
import { logger } from "../utils.js";

// Load environment variables
dotenv.config();

// Inisialisasi bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Inisialisasi middleware
bot.use(contextModify, userLogs, messageLogs, detectUsername, filterCommands);

// Command handler
try {
  bot.command(
    ["start", "cancel", "end", "search", "help", "ping"],
    async (ctx) => {
      const command = ctx.message.text.split(" ")[0].substring(1);
      if (commands[command]) {
        await commands[command](ctx);
      }
    }
  );
} catch (error) {
  logger.error("Error while handling command:", error);
}

// Message handlers
const messageTypes = [
  "text",
  "photo",
  "voice",
  "sticker",
  "video",
  "video_note",
  "dice",
  "animation",
];
messageTypes.forEach((type) => {
  bot.on(message(type), async (ctx) => {
    await handleIncomingMessage(ctx, type);
  });
});

// Callback query handler
bot.on("callback_query", async (ctx) => {
  const action = commands[ctx.callbackQuery.data];
  try {
    if (action) {
      await Promise.all([
        action(ctx),
        ctx.telegram.editMessageReplyMarkup(
          ctx.chat.id,
          ctx.callbackQuery.message.message_id,
          null
        ),
      ]);
    } else {
      throw new Error("Action not found!");
    }
  } catch (error) {
    logger.error("Error handling callback query:", error);
  }
});

// Error handler
bot.catch((error) => {
  logger.error("Error in bot catch:", error.stack);
});

// Export bot instance
export default bot;
