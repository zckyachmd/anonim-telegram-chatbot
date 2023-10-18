import logger from "./logger.js";
import { getSystemStatus, setSystemStatus } from "./status.js";
import { isAdmin, formatUptime, generateInlineKeyboard } from "./helper.js";
import {
  prisma,
  findUser,
  findWaitingChat,
  findUserInChatorWaiting,
  findIsUserHasChatWithPartner,
  findChat,
  findActiveChat,
  findBlockedUser,
  countBlockedUser,
  deleteBlockedUser,
} from "./database.js";

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
        callback_data: "end",
      },
    ],
  ],
  end: [
    [
      {
        text: "❌ Akhiri obrolan",
        callback_data: "end",
      },
      {
        text: "🚫 Block",
        callback_data: "block",
      },
    ],
  ],
  help: [
    [
      {
        text: "🗑️ Hapus semua daftar blokir",
        callback_data: "unblock",
      },
    ],
  ],
};

/**
 * Start command handler
 */
export const startCommand = async (ctx) => {
  try {
    await ctx.reply(
      `Hai @${ctx.message.from.username}! Selamat datang di ${ctx.botInfo.first_name}!`,
      generateInlineKeyboard(inlineKeyboards.start)
    );
  } catch (error) {
    logger.error("Error handling start command:", error);
  }
};

/**
 * Search command handler
 */
export const searchCommand = async (ctx) => {
  try {
    // Temukan apakah user sedang aktif dalam chat atau menunggu
    const chatUser = await findUserInChatorWaiting(ctx.userData.id);

    // Jika user sedang aktif dalam chat atau menunggu, kirim pesan ke pengguna
    if (chatUser) {
      await ctx.reply(
        chatUser.status == "waiting"
          ? "Menunggu kawan ngobrol..."
          : "Kamu sedang aktif dalam ngobrol!",
        chatUser.status == "waiting"
          ? generateInlineKeyboard(inlineKeyboards.cancel)
          : generateInlineKeyboard(inlineKeyboards.end)
      );
      return;
    }

    // Temukan chat yang masih menunggu dan tidak memiliki partnerId
    const waitingChats = await findWaitingChat(ctx.userData.id);

    for (
      let retryCount = 0;
      retryCount < Math.min(3, waitingChats.length);
      retryCount++
    ) {
      // Temukan chat yang menunggu secara acak
      const randomIndex = Math.floor(Math.random() * waitingChats.length);
      const findChat = waitingChats[randomIndex];
      const { isSamePartner, isBlockedUser } = await prisma.$transaction(
        async (findChat) => {
          // Mengecek apakah user memiliki chat dengan partner yang sama
          const checkSamePartner = await findIsUserHasChatWithPartner(
            ctx.userData.id,
            findChat.user.id
          );

          // Mengecek apakah user telah memblokir partner
          const checkBlockUserResult = await findBlockedUser(
            ctx.userData.id,
            findChat.user.id
          );

          // Mengembalikan hasil
          return {
            isSamePartner: checkSamePartner,
            isBlockedUser: checkBlockUserResult,
          };
        }
      );

      // Jika pasangan obrolan sama, lanjutkan ke iterasi berikutnya
      if (isSamePartner || isBlockedUser) {
        console.info(
          `👤 User [${ctx.userData.userId}]: Same or blocked partner with ${findChat.user.userId}`
        );

        continue;
      }

      const chatId = findChat.id;
      const response = "Kawan ngobrol ditemukan!";
      await prisma.$transaction(async (prismaClient) => {
        // Memulai transaksi
        const transactionPrisma = prismaClient;

        // Memperbarui chat yang menunggu ke status "active" dan menambahkan partnerId
        await transactionPrisma.chat.update({
          where: {
            id: chatId,
          },
          data: {
            partnerId: ctx.userData.id,
            status: "active",
          },
        });

        // Kirim pesan ke pengguna
        await ctx.reply(response, generateInlineKeyboard(inlineKeyboards.end));

        // Temukan userId dari partner chat
        const foundUserId =
          findChat.user.id == ctx.userData.id
            ? findChat.partner?.userId
            : findChat.user.userId;

        // Kirim pesan ke partner chat
        if (foundUserId) {
          const partnerChat = await findUser(foundUserId);
          await ctx.telegram.sendMessage(
            partnerChat.userId,
            response,
            generateInlineKeyboard(inlineKeyboards.end)
          );
        }
      });

      // Transaksi berhasil, keluar dari fungsi atau kirim respons sukses
      return; // Selesaikan proses pencarian
    }

    // Membuat chat baru dengan status "waiting"
    await prisma.chat.create({
      data: {
        userId: ctx.userData.id,
        status: "waiting",
      },
    });

    // Kirim pesan ke pengguna, dengan inline keyboard
    await ctx.reply(
      "Mencari kawan ngobrol...",
      generateInlineKeyboard(inlineKeyboards.cancel)
    );
  } catch (error) {
    // Tangani kesalahan dengan mencetak pesan kesalahan
    logger.error("Error handling search command:", error);
  }
};

/**
 * Block command handler
 */
export const blockCommand = async (ctx) => {
  try {
    await prisma.$transaction(async (prisma) => {
      const chat = await findActiveChat(ctx.userData.id);

      if (!chat) {
        await ctx.reply(
          "Kamu tidak sedang chat dengan siapapun.",
          generateInlineKeyboard(inlineKeyboards.search)
        );
        return;
      }

      // Temukan userId dari partner chat
      const foundUserId =
        chat.user.id == ctx.userData.id ? chat.partner?.id : chat.user.id;

      if (foundUserId) {
        await Promise.all([
          // Tambahan blok ke database
          prisma.block.create({
            data: {
              userId: ctx.userData.id,
              blockedId: foundUserId,
            },
          }),
          // Memperbarui chat yang aktif dan chat partner yang aktif ke status "ended" dalam satu transaksi
          endCommand(ctx, true),
        ]);
      }
    });
  } catch (error) {
    logger.error("Error handling block command:", error);
  }
};

/**
 * Unblock command handler
 */
export const unblockCommand = async (ctx) => {
  try {
    await prisma.$transaction(async () => {
      if ((await countBlockedUser(ctx.userData.id)) <= 0) {
        await ctx.reply(
          "Kamu tidak memiliki daftar blokir.",
          generateInlineKeyboard(inlineKeyboards.start)
        );
        return;
      }

      await Promise.all([
        deleteBlockedUser(ctx.userData.id),
        ctx.reply(
          "Semua daftar blokir telah dihapus.",
          generateInlineKeyboard(inlineKeyboards.start)
        ),
      ]);
    });
  } catch (error) {
    console.error("Error in unblock command:", error);
  }
};

/**
 * End command handler
 */
export const endCommand = async (ctx, block = false) => {
  try {
    // Temukan chat partner yang aktif dalam satu query
    await prisma.$transaction(async (prisma) => {
      const chat = await findChat(ctx.userData.id, true);

      if (!chat) {
        await ctx.reply(
          "Kamu tidak sedang chat dengan siapapun.",
          generateInlineKeyboard(inlineKeyboards.search)
        );
        return;
      }

      // Memperbarui chat yang aktif dan chat partner yang aktif ke status "ended" dalam satu transaksi
      await prisma.chat.update({
        where: {
          id: chat.id,
        },
        data: {
          status: "ended",
        },
      });

      // Menggunakan mengirim pesan ke pengguna
      await ctx.reply(
        block == true
          ? "Kamu telah memblokir kawan ngobrol."
          : chat.status == "waiting" || !chat.partnerId
          ? "Kamu telah membatalkan pencarian."
          : "Kamu telah mengakhiri chat.",
        generateInlineKeyboard(inlineKeyboards.search)
      );

      // Temukan userId dari partner chat
      const foundUserId =
        chat.user.id == ctx.userData.id
          ? chat.partner?.userId
          : chat.user.userId;

      if (foundUserId) {
        // Temukan chat partner yang aktif dalam satu query
        const partnerChat = await findUser(foundUserId);

        // Mengirim pesan ke partner chat
        await ctx.telegram.sendMessage(
          partnerChat.userId,
          "Kawan ngobrol telah mengakhiri chat.",
          generateInlineKeyboard(inlineKeyboards.search)
        );
      }
    });
  } catch (error) {
    logger.error("Error handling end command:", error);
  }
};

/**
 * Help command handler
 */
export const helpCommand = async (ctx) => {
  try {
    await ctx.reply(
      "TemuKawanBot diciptakan untuk mempertemukanmu dengan teman ngobrol acak dan anonim di Telegram. Nikmati obrolan seru tanpa batasan!\n\n" +
        "Perintah:\n" +
        "/start - Mulai bot\n" +
        "/search - Cari kawan ngobrol\n" +
        "/block - Blokir kawan ngobrol saat ini\n" +
        "/unblock - Hapus semua daftar kawan ngobrol yang diblokir\n" +
        "/end - Akhiri chat dengan kawan ngobrol\n" +
        "/help - Tampilkan bantuan dan daftar perintah\n\n" +
        "---\n\n" +
        "Made with hands in earth with love by @zckyachmd. Contact for support or feedback!",
      generateInlineKeyboard(inlineKeyboards.help)
    );
  } catch (error) {
    logger.error("Error handling help command:", error);
  }
};

/**
 * Bot command handler with argument
 */
export const botCommand = async (ctx) => {
  // Check if user is admin
  if (!isAdmin(ctx.userData.userId.toString())) {
    logger.info(`👤 User [${ctx.userData.userId}]: Not admin`);
    return;
  }

  // Get argument
  const args = ctx.message.text.split(" ");
  const command = args[1];
  const argument = args[2];

  // Check if argument is not provided
  if (!command) {
    await ctx.reply("Please provide argument!");
    return;
  }

  // Handle command
  try {
    switch (command) {
      case "start":
        // Set system status to "on"
        setSystemStatus(true);

        // Send message to user
        if (getSystemStatus()) {
          await ctx.reply("Bot status is on!");
        }
        break;
      case "stop":
        // Set system status to "off"
        setSystemStatus(false);

        // Send message to user
        if (!getSystemStatus()) {
          await ctx.reply("Bot status is off!");
        }
        break;
      case "monitor":
        const systemStatus = getSystemStatus() ? "on" : "off";
        const uptime = formatUptime(process.uptime());
        const totalUser = await prisma.user.count();
        const totalChat = await prisma.chat.count();
        const totalActiveChat = await prisma.chat.count({
          where: { status: "active" },
        });
        const totalWaitingChat = await prisma.chat.count({
          where: { status: "waiting" },
        });

        // Send message to user
        await ctx.reply(
          `Bot status: ${systemStatus}\n` +
            `Uptime: ${uptime}\n` +
            `Total user: ${totalUser}\n` +
            `Total chat: ${totalChat}\n` +
            `Total active chat: ${totalActiveChat}\n` +
            `Total waiting chat: ${totalWaitingChat}\n`
        );
        break;
      default:
        await ctx.reply("Command not found!");
        break;
    }
  } catch (error) {
    // Log error
    logger.error("Error handling bot command:", error);
  }
};

/**
 * Ping command handler
 */
export const pingCommand = async (ctx) => {
  try {
    const startTs = new Date().getTime();
    const message = await ctx.reply("Pong!");
    const endTs = new Date().getTime();
    const responseTime = endTs - startTs;
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      message.message_id,
      undefined,
      `Pong! (${responseTime} ms)`
    );
  } catch (error) {
    logger.error("Error handling ping command:", error);
  }
};
