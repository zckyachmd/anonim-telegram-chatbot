import logger from "./logger.js";
import middleware from "./middleware.js";
import { findUser, findUserAndChat } from "./model.js";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import {
  startCommand,
  searchCommand,
  endCommand,
  helpCommand,
  botCommand,
} from "./commands.js";

const handleIncomingMessage = async (ctx, messageType) => {
  const { user, chat } = await findUserAndChat(ctx.message.from.id.toString());

  // Jika chat tidak ditemukan, berarti user belum memulai chat
  if (!chat) {
    await ctx.reply(
      `Kamu belum memulai chat!\n\nKetik /search untuk mencari kawan ngobrol.`
    );
    return;
  }

  // Jika chat ditemukan, temukan chat partner
  const foundUserId =
    chat.user.id == user.id ? chat.partner?.userId : chat.user.userId;
  const partnerChat = await findUser(foundUserId);

  // Kirim pesan ke chat partner
  switch (messageType) {
    case "text":
      if (ctx.message.text) {
        await ctx.telegram.sendMessage(
          partnerChat.userId,
          ctx.message.text.toString()
        );
      }
      break;
    case "sticker":
      // Handle sticker
      if (ctx.message.sticker) {
        const sticker = ctx.message.sticker.file_id;
        await ctx.telegram.sendSticker(partnerChat.userId, sticker);
      }
      break;
    case "photo":
      // Handle photo
      if (ctx.message.photo) {
        const photo = ctx.message.photo[0].file_id;
        await ctx.telegram.sendPhoto(partnerChat.userId, photo);
      }
      break;
    case "voice":
      // Handle voice
      if (ctx.message.voice) {
        const voice = ctx.message.voice.file_id;
        await ctx.telegram.sendVoice(partnerChat.userId, voice);
      }
    default:
      // Log error
      logger.error("Error handling message:", error);

      // Kirim pesan ke user jika terjadi error 400
      if (error.code == 400) {
        await ctx.reply("Message not supported!");
      }
      break;
  }
};

// Inisialisasi bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Middleware
bot.use(middleware);

// Command handler
bot.command("start", startCommand);
bot.command("search", searchCommand);
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

// Export bot
export { bot };
