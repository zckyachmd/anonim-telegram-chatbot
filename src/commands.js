import logger from "./logger.js";
import { getSystemStatus, setSystemStatus } from "./status.js";
import { isAdmin, formatUptime } from "./helper.js";
import {
  prisma,
  findUser,
  findWaitingChat,
  findUserInChatorWaiting,
  findIsUserHasChatWithPartner,
  findChat,
} from "./database.js";

/**
 * Start command handler
 *
 * @param {import("telegraf").Context} ctx
 */
export const startCommand = async (ctx) => {
  try {
    await ctx.reply(
      `Hai @${ctx.message.from.username}! Selamat datang di ${ctx.botInfo.first_name}!\n\nKetik /search untuk mencari kawan ngobrol.`
    );
  } catch (error) {
    logger.error("Error handling start command:", error);
  }
};

/**
 * Search command handler
 *
 * @param {import("telegraf").Context} ctx
 */
export const searchCommand = async (ctx) => {
  try {
    // Temukan apakah user sedang aktif dalam chat atau menunggu
    const chatUser = await findUserInChatorWaiting(ctx.userId);

    // Jika user sedang aktif dalam chat atau menunggu, kirim pesan ke pengguna
    if (chatUser) {
      const response =
        chatUser.status == "waiting"
          ? "Menunggu kawan ngobrol... \n\nKetik /end untuk membatalkan pencarian."
          : "Kamu sedang aktif dalam chat atau menunggu kawan ngobrol. \n\nKetik /end untuk mengakhiri chat.";

      await ctx.reply(response);
      return;
    }

    // Temukan chat yang masih menunggu dan tidak memiliki partnerId
    const waitingChats = await findWaitingChat(ctx.userId);

    for (
      let retryCount = 0;
      retryCount < Math.min(3, waitingChats.length);
      retryCount++
    ) {
      // Temukan chat yang menunggu secara acak
      const randomIndex = Math.floor(Math.random() * waitingChats.length);
      const findChat = waitingChats[randomIndex];

      // Memastikan pasangan obrolan yang ditemukan tidak sama dengan pasangan obrolan sebelumnya
      const isSamePartner = await findIsUserHasChatWithPartner(
        ctx.userId,
        findChat.user.id
      );

      // Jika pasangan obrolan sama, lanjutkan ke iterasi berikutnya
      if (isSamePartner) {
        console.info(
          `👤 User [${ctx.userId}]: Same partner with ${findChat.user.userId}`
        );
        continue;
      }

      const chatId = findChat.id;
      const response = `Kawan ngobrol ditemukan!\n\nKetik /end untuk mengakhiri chat.`;
      await prisma.$transaction(async (prismaClient) => {
        // Memulai transaksi
        const transactionPrisma = prismaClient;

        // Memperbarui chat yang menunggu ke status "active" dan menambahkan partnerId
        await transactionPrisma.chat.update({
          where: {
            id: chatId,
          },
          data: {
            partnerId: ctx.userId,
            status: "active",
          },
        });

        // Kirim pesan ke pengguna
        await ctx.reply(response);

        // Temukan userId dari partner chat
        const foundUserId =
          findChat.user.id == ctx.userId
            ? findChat.partner?.userId
            : findChat.user.userId;

        // Kirim pesan ke partner chat
        if (foundUserId) {
          const partnerChat = await findUser(foundUserId);
          await ctx.telegram.sendMessage(partnerChat.userId, response);
        }
      });

      // Transaksi berhasil, keluar dari fungsi atau kirim respons sukses
      return; // Selesaikan proses pencarian
    }

    // Membuat chat baru dengan status "waiting"
    await prisma.chat.create({
      data: {
        userId: ctx.userId,
        status: "waiting",
      },
    });

    // Pesan yang akan dikirim ke pengguna
    await ctx.reply(
      `Mencari kawan ngobrol...\n\nKetik /end untuk membatalkan pencarian.`
    );
  } catch (error) {
    // Tangani kesalahan dengan mencetak pesan kesalahan
    logger.error("Error handling search command:", error);
  }
};

/**
 * End command handler
 *
 * @param {import("telegraf").Context} ctx
 */
export const endCommand = async (ctx) => {
  // Pesan untuk mencari kawan ngobrol baru
  const newPartnerMessage = `\n\nKetik /search untuk mencari kawan ngobrol.`;

  try {
    // Temukan chat partner yang aktif dalam satu query
    await prisma.$transaction(async (prisma) => {
      const chat = await findChat(ctx.userId, true);

      if (!chat) {
        await ctx.reply(
          `Kamu tidak sedang chat dengan siapapun.` + newPartnerMessage
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
      await ctx.reply(`Kamu telah mengakhiri chat.` + newPartnerMessage);

      // Temukan userId dari partner chat
      const foundUserId =
        chat.user.id == ctx.userId ? chat.partner?.userId : chat.user.userId;

      if (foundUserId) {
        // Temukan chat partner yang aktif dalam satu query
        const partnerChat = await findUser(foundUserId);

        // Mengirim pesan ke partner chat
        await ctx.telegram.sendMessage(
          partnerChat.userId,
          `Kawan ngobrol telah mengakhiri chat.` + newPartnerMessage
        );
      }
    });
  } catch (error) {
    logger.error("Error handling end command:", error);
  }
};

/**
 * Help command handler
 *
 * @param {import("telegraf").Context} ctx
 */
export const helpCommand = async (ctx) => {
  try {
    await ctx.reply(
      "TemuKawanBot diciptakan untuk mempertemukanmu dengan teman ngobrol acak dan anonim di Telegram. Nikmati obrolan seru tanpa batasan!\n\n" +
        "Perintah:\n" +
        "/start - Mulai bot\n" +
        "/search - Cari kawan ngobrol\n" +
        "/end - Akhiri chat dengan kawan ngobrol\n" +
        "/help - Tampilkan bantuan dan daftar perintah\n\n" +
        "---\n\n" +
        "Made with hands in earth with love by @zckyachmd. Contact for support or feedback!"
    );
  } catch (error) {
    logger.error("Error handling help command:", error);
  }
};

/**
 * Bot command handler with argument
 *
 * @param {import("telegraf").Context} ctx
 */
export const botCommand = async (ctx) => {
  // Check if user is admin
  if (!isAdmin(ctx.message.from.id.toString())) {
    logger.info(`👤 User [${ctx.message.from.id}]: Not admin`);
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
