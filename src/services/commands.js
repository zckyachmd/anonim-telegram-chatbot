import { PrismaClient } from "@prisma/client";
import { generateInlineKeyboard, isAdmin, logger } from "../utils.js";
import * as model from "../model.js";

// Create a shared Prisma client instance
const prisma = new PrismaClient();

/**
 * Inline keyboards configuration
 */
const inlineKeyboards = {
  start: [
    [
      {
        text: "🔍 Cari kawan",
        callback_data: "search",
      },
      {
        text: "❓ Bantuan",
        callback_data: "help",
      },
    ],
  ],
  search: [
    [
      {
        text: "🔍 Cari kawan",
        callback_data: "search",
      },
    ],
  ],
  cancel: [
    [
      {
        text: "❌ Batalkan pencarian",
        callback_data: "cancel",
      },
    ],
  ],
  end: [
    [
      {
        text: "❌ Akhiri obrolan",
        callback_data: "end",
      },
    ],
  ],
};

/**
 * Start command handler
 *
 * @param {TelegrafContext} ctx - Telegraf context object
 * @returns {Promise<void>}
 */
export const start = async (ctx) => {
  await ctx.reply(
    `Hai @${ctx.messageData.from.username}! Selamat datang di ${ctx.botInfo.first_name}!`,
    generateInlineKeyboard(inlineKeyboards.start)
  );
};

/**
 * Search command handler
 *
 * @param {TelegrafContext} ctx - Telegraf context object
 * @returns {Promise<void>}
 */
export const search = async (ctx) => {
  const activeRoomChat = await prisma.user.findUnique({
    where: {
      userId: String(ctx.messageData.from.id),
    },
    include: {
      chatsStarted: {
        where: {
          OR: [{ status: "active" }, { status: "searching" }],
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      chatsReceived: {
        where: {
          OR: [{ status: "active" }, { status: "searching" }],
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  const { chatsStarted, chatsReceived } = activeRoomChat;

  if (chatsStarted.length > 0 || chatsReceived.length > 0) {
    const searchingMessage =
      chatsStarted.length > 0
        ? chatsStarted[0].status
        : chatsReceived[0].status;
    await ctx.reply(
      searchingMessage == "searching"
        ? "Menunggu kawan ngobrol..."
        : "Kamu sedang aktif dalam ngobrol!",
      searchingMessage == "searching"
        ? generateInlineKeyboard(inlineKeyboards.cancel)
        : generateInlineKeyboard(inlineKeyboards.end)
    );
    return;
  }

  const roomchatWaiting = await prisma.chat.findMany({
    where: {
      partnerId: null,
      status: "searching",
      userId: { not: activeRoomChat.id },
    },
    include: {
      user: {
        select: {
          userId: true,
        },
      },
      partner: {
        select: {
          userId: true,
        },
      },
    },
    take: 10,
  });

  if (roomchatWaiting.length === 0) {
    // Create new chat room
    await prisma.chat.create({
      data: {
        userId: activeRoomChat.id,
        status: "searching",
      },
    });

    // Reply to user with searching status
    await ctx.reply(
      "Mencari kawan ngobrol...",
      generateInlineKeyboard(inlineKeyboards.cancel)
    );
    return;
  }

  // Find random roomchatWaiting
  const randomIndex = Math.floor(Math.random() * roomchatWaiting.length);
  const selectedRoomchatWaiting = roomchatWaiting[randomIndex];

  // Update chat status to "active" and add partnerId
  await prisma.chat.update({
    where: { id: selectedRoomchatWaiting.id },
    data: { partnerId: activeRoomChat.id, status: "active" },
  });

  // Set response message
  const response = "Kawan ngobrol ditemukan!";

  // Find userId from partner chat
  const partnerUserId =
    roomchatWaiting.user.userId == activeRoomChat.id
      ? roomchatWaiting.partner.userId
      : roomchatWaiting.user.userId;

  // Send message
  await Promise.all([
    ctx.reply(response, generateInlineKeyboard(inlineKeyboards.end)),
    ctx.telegram.sendMessage(
      partnerUserId,
      response,
      generateInlineKeyboard(inlineKeyboards.end)
    ),
  ]);
};

/**
 * Cancel command handler
 *
 * @param {TelegrafContext} ctx - Telegraf context object
 * @returns {Promise<void>}
 */
export const cancel = async (ctx) => {
  const roomChatUser = await prisma.user.findUnique({
    where: {
      userId: String(ctx.messageData.from.id),
    },
    include: {
      chatsStarted: {
        where: {
          status: "searching",
        },
        orderBy: {
          status: "desc",
        },
        take: 1,
      },
    },
  });

  if (roomChatUser.chatsStarted.length === 0) {
    await ctx.reply(
      "Tidak ada pencarian kawan ngobrol yang sedang berlangsung.",
      generateInlineKeyboard(inlineKeyboards.search)
    );
    return;
  }

  const updateRoomChat = prisma.chat.update({
    where: { id: roomChatUser.chatsStarted[0].id },
    data: { status: "inactive" },
  });

  const replyToUser = ctx.reply(
    "Pencarian kawan ngobrol dibatalkan.",
    generateInlineKeyboard(inlineKeyboards.search)
  );

  await Promise.all([updateRoomChat, replyToUser]);
};

/**
 * End command handler
 *
 * @param {TelegrafContext} ctx - Telegraf context object
 * @returns {Promise<void>}
 */
export const end = async (ctx) => {
  const userChat = await model.getUserWithActiveChats(ctx.messageData.from.id);
  const { chatsStarted, chatsReceived } = userChat;

  // Room chat not found
  if (chatsStarted.length === 0 && chatsReceived.length === 0) {
    await ctx.reply(
      `Kamu belum memulai chat!\n\nKetik /search untuk mencari kawan ngobrol.`,
      generateInlineKeyboard(inlineKeyboards.search)
    );
    return;
  }

  // Find the room chat
  const roomChat = chatsStarted.length > 0 ? chatsStarted[0] : chatsReceived[0];

  // Update room chat status to "inactive" asynchronously
  const updateRoomChat = prisma.chat.update({
    where: { id: roomChat.id },
    data: { status: "inactive" },
  });

  // Reply to the user and the partner asynchronously
  const replyToUser = ctx.reply(
    "Kamu telah mengakhiri chat.",
    generateInlineKeyboard(inlineKeyboards.search)
  );

  const replyToPartner = ctx.telegram.sendMessage(
    userChat.partner.userId,
    "Kawan ngobrol telah mengakhiri chat.",
    generateInlineKeyboard(inlineKeyboards.search)
  );

  // Wait for all asynchronous operations to complete
  await Promise.all([updateRoomChat, replyToUser, replyToPartner]);
};

/**
 * Help command handler
 *
 * @param {TelegrafContext} ctx - Telegraf context object
 * @returns {Promise<void>}
 */
export const help = async (ctx) => {
  await ctx.reply(
    "TemuKawanBot diciptakan untuk mempertemukanmu dengan teman ngobrol acak dan anonim di Telegram. Nikmati obrolan seru tanpa batasan!\n\n" +
      "Perintah:\n" +
      "/start - Mulai bot\n" +
      "/search - Cari kawan ngobrol\n" +
      "/cancel - Batalkan pencarian kawan ngobrol\n" +
      "/end - Akhiri chat dengan kawan ngobrol\n" +
      "/help - Tampilkan bantuan dan daftar perintah\n\n" +
      "---\n\n" +
      "Made with hands in earth with love by @zckyachmd. Contact for support or feedback!"
  );
};

/**
 * Ping command handler
 *
 * @param {TelegrafContext} ctx - Telegraf context object
 * @returns {Promise<void>}
 */
export const ping = async (ctx) => {
  // Check if the requestor is admin
  if (!isAdmin(ctx.messageData.from.id)) {
    logger.log(
      `🛑 Unauthorized access to the ping command! from: ${ctx.messageData.from.id}`
    );
    return;
  }

  // Calculate the response time
  const startTs = new Date().getTime();
  const message = await ctx.reply("Pong!");
  const endTs = new Date().getTime();
  const responseTime = endTs - startTs;

  // Edit the message with the response time
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    message.message_id,
    undefined,
    `Pong! (${responseTime} ms)`
  );
};
