import logger from "./logger.js";
import middleware from "./middleware.js";
import { findUser, findChat } from "./database.js";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import {
  startCommand,
  searchCommand,
  blockCommand,
  unblockCommand,
  endCommand,
  helpCommand,
  botCommand,
} from "./commands.js";

const handleIncomingMessage = async (ctx, messageType) => {
  const chat = await findChat(ctx.id);

  // Jika chat tidak ditemukan, berarti user belum memulai chat
  if (!chat) {
    await ctx.reply(
      `Kamu belum memulai chat!\n\nKetik /search untuk mencari kawan ngobrol.`
    );
    return;
  }

  // Jika chat ditemukan, temukan chat partner
  const foundUserId =
    chat.user.id == ctx.id ? chat.partner?.userId : chat.user.userId;
  const partnerChat = await findUser(foundUserId);

  // Kirim pesan ke chat partner
  switch (messageType) {
    case "text":
      // Check if message contains command
      const containsCommand = ctx.message.text.toString().match(/\/\S+/g);
      if (containsCommand) {
        logger.info(`👤 User [${ctx.userId}]: Sent command to another user.`);
        return;
      }

      // Handle text
      await ctx.telegram.sendMessage(
        partnerChat.userId,
        ctx.message.text.toString()
      );
      break;
    case "sticker":
      // Handle sticker
      const sticker = ctx.message.sticker.file_id;
      await ctx.telegram.sendSticker(partnerChat.userId, sticker);
      break;
    case "photo":
      // Handle photo
      const photo = ctx.message.photo[0].file_id;
      await ctx.telegram.sendPhoto(partnerChat.userId, photo);
      break;
    case "voice":
      // Handle voice
      const voice = ctx.message.voice.file_id;
      await ctx.telegram.sendVoice(partnerChat.userId, voice);
    default:
      // Log error
      logger.error(`👤 User [${ctx.userId}]: Message not supported!`);

      // Kirim pesan ke user jika terjadi error 400
      if (error.code == 400) {
        await ctx.reply("Message not supported!");
      }
      break;
  }
};

const callbackActions = {
  search: searchCommand,
  block: blockCommand,
  unblock: unblockCommand,
  end: endCommand,
  help: helpCommand,
};

// Inisialisasi bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Middleware
bot.use(middleware);

// Command handler
bot.command("start", startCommand);
bot.command("search", searchCommand);
bot.command("block", blockCommand);
bot.command("unblock", unblockCommand);
bot.command("end", endCommand);
bot.command("help", helpCommand);
bot.command("bot", botCommand);

// Text handler
bot.on(message("text"), async (ctx) => {
  await handleIncomingMessage(ctx, "text");
});

// Sticker handler
bot.on(message("sticker"), async (ctx) => {
  await handleIncomingMessage(ctx, "sticker");
});

// Photo handler
bot.on(message("photo"), async (ctx) => {
  await handleIncomingMessage(ctx, "photo");
});

// Voice handler
bot.on(message("voice"), async (ctx) => {
  await handleIncomingMessage(ctx, "voice");
});

// Callback query handler
bot.on("callback_query", async (ctx) => {
  try {
    // Find action
    const action = callbackActions[ctx.callbackQuery.data];
    if (!action) {
      throw new Error("Action not found!");
    }

    // Handle action and remove inline keyboard
    await Promise.all([
      action(ctx),
      ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        null
      ),
    ]);
  } catch (error) {
    logger.error(`👤 User [${ctx.callbackQuery.from.id}]: ${error.message}`);
  }
});

// Export bot
export { bot };
