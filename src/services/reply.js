import { PrismaClient } from "@prisma/client";
import * as model from "../model.js";
import { logger } from "../utils.js";

// Create a shared Prisma client instance
const prisma = new PrismaClient();

/**
 * Handle incoming message
 *
 * @param {object} ctx
 * @param {string} messageType
 * @returns {Promise<void>}
 */
const handleIncomingMessage = async (ctx, messageType) => {
  const userChat = await model.getUserWithActiveChats(ctx.message.from.id);
  if (
    userChat.length === 0 ||
    !userChat.partner ||
    userChat.partner.length === 0
  ) {
    await ctx.reply(
      `Kamu belum memulai chat!\n\nKetik /search untuk mencari kawan ngobrol.`
    );
    return;
  }

  const messageParams = {
    chat_id: userChat.partner.userId,
    options: {
      protect_content: true,
    },
  };

  const isReply = ctx.message.reply_to_message;
  if (isReply) {
    const message = await prisma.message.findFirst({
      where: {
        userId: userChat.partner.id,
        responseId: isReply.message_id,
      },
      select: {
        messageId: true,
      },
    });

    if (message) {
      messageParams.options.reply_to_message_id = message.messageId;
    }
  }

  let replyResponse = null;

  switch (messageType) {
    case "text":
      replyResponse = await ctx.telegram.sendMessage(
        messageParams.chat_id,
        ctx.message.text,
        messageParams.options
      );
      break;
    case "photo":
      replyResponse = await ctx.telegram.sendPhoto(
        messageParams.chat_id,
        ctx.message.photo[0].file_id,
        messageParams.options
      );
      break;
    case "voice":
      replyResponse = await ctx.telegram.sendVoice(
        messageParams.chat_id,
        ctx.message.voice.file_id,
        messageParams.options
      );
      break;
    case "video":
      replyResponse = await ctx.telegram.sendVideo(
        messageParams.chat_id,
        ctx.message.video.file_id,
        messageParams.options
      );
      break;
    case "sticker":
      replyResponse = await ctx.telegram.sendSticker(
        messageParams.chat_id,
        ctx.message.sticker.file_id,
        messageParams.options
      );
      break;
    case "video_note":
      replyResponse = await ctx.telegram.sendVideoNote(
        messageParams.chat_id,
        ctx.message.video_note.file_id,
        messageParams.options
      );
      break;
    case "dice":
      replyResponse = await ctx.telegram.sendDice(
        messageParams.chat_id,
        ctx.message.dice.emoji,
        messageParams.options
      );
      break;
    case "animation":
      replyResponse = await ctx.telegram.sendAnimation(
        messageParams.chat_id,
        ctx.message.animation.file_id,
        messageParams.options
      );
      break;
    default:
      logger.error(
        `👤 User [${ctx.messageData.from.id}]: Message not supported!`
      );
      return;
  }

  await prisma.message.update({
    where: {
      messageId: ctx.messageData.message_id,
    },
    data: { responseId: replyResponse.message_id },
  });
};

// Export handleIncomingMessage instance
export default handleIncomingMessage;
