import prisma from "./database.js";
import logger from "./logger.js";
import { findUser } from "./model.js";
import { getSystemStatus, setSystemStatus } from "./status.js";
import { isAdmin, formatUptime } from "./helper.js";

/**
 * Start command handler
 *
 * @param {import("telegraf").Context} ctx
 */
const startCommand = async (ctx) => {
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
const searchCommand = async (ctx) => {
  try {
    // Temukan user berdasarkan userId (Telegram user ID)
    const user = await findUser(ctx.message.from.id.toString());

    // Temukan apakah user sedang aktif dalam chat atau menunggu
    const chat = await prisma.chat.findFirst({
      where: {
        AND: [
          {
            OR: [{ userId: user.id }, { partnerId: user.id }],
          },
          {
            status: {
              in: ["active", "waiting"],
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Jika user sedang aktif dalam chat atau menunggu, kirim pesan ke pengguna
    if (chat) {
      const response =
        chat.status == "waiting"
          ? "Menunggu kawan ngobrol... \n\nKetik /end untuk membatalkan pencarian."
          : "Kamu sedang aktif dalam chat atau menunggu kawan ngobrol. \n\nKetik /end untuk mengakhiri chat.";

      await ctx.reply(response);
      return;
    }

    // Temukan chat yang masih menunggu dan tidak memiliki partnerId
    const waitingChats = await prisma.chat.findMany({
      where: {
        userId: { not: user.id },
        partnerId: null,
        status: "waiting",
      },
      include: {
        user: true,
        partner: true,
      },
    });

    let retryCount = 0;
    let findChat;
    let randomIndex;

    while (!findChat && retryCount < 3) {
      // Jika tidak ada chat yang menunggu, keluar dari loop
      if (waitingChats.length <= 0) {
        break;
      }

      // Temukan chat yang menunggu secara acak
      randomIndex = Math.floor(Math.random() * waitingChats.length);
      findChat = waitingChats[randomIndex];

      // Memastikan pasangan obrolan yang ditemukan tidak sama dengan pasangan obrolan sebelumnya
      const isSamePartner = await prisma.chat.findFirst({
        where: {
          OR: [
            { userId: user.id, partnerId: findChat.user.id },
            { userId: findChat.user.id, partnerId: user.id },
          ],
          status: "ended",
          createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
        },
      });

      // Jika pasangan obrolan yang ditemukan sama dengan pasangan obrolan sebelumnya, lanjutkan ke iterasi berikutnya
      if (!isSamePartner) {
        // Memperbarui chat yang menunggu ke status "active" dan menambahkan partnerId
        await prisma.chat.update({
          where: {
            id: findChat.id,
          },
          data: {
            partnerId: user.id,
            status: "active",
          },
        });

        // Pesan yang akan dikirim ke pengguna
        const response = `Kawan ngobrol ditemukan!\n\nKetik /end untuk mengakhiri chat.`;

        // Menggunakan mengirim pesan ke pengguna
        await ctx.reply(response);

        // Temukan userId dari partner chat
        const foundUserId =
          findChat.user.id == user.id
            ? findChat.partner?.userId
            : findChat.user.userId;

        if (foundUserId) {
          // Temukan chat partner yang aktif dalam satu query
          const partnerChat = await findUser(foundUserId);

          // Mengirim pesan ke partner chat
          await ctx.telegram.sendMessage(partnerChat.userId, response);
        }

        // Keluar dari loop
        return;
      }

      // Log jika pasangan obrolan yang ditemukan sama dengan pasangan obrolan sebelumnya
      logger.info(
        `👤 User [${user.userId}]: Same partner with ${findChat.user.userId}`
      );

      // Mengatur ulang findChat agar mencari ulang dalam loop
      findChat = null;
      retryCount++;
    }

    // Membuat chat baru dengan status "waiting"
    await prisma.chat.create({
      data: {
        userId: user.id,
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
const endCommand = async (ctx) => {
  // Pesan untuk mencari kawan ngobrol baru
  const newPartnerMessage = `\n\nKetik /search untuk mencari kawan ngobrol.`;

  try {
    // Temukan chat partner yang aktif dalam satu query
    await prisma.$transaction(async (prisma) => {
      // Temukan user berdasarkan userId (Telegram user ID)
      const user = await findUser(ctx.message.from.id.toString());

      // Temukan chat yang aktif dalam satu query
      const chat = await prisma.chat.findFirst({
        where: {
          AND: [
            {
              OR: [{ userId: user.id }, { partnerId: user.id }],
            },
            { status: { in: ["active", "waiting"] } },
          ],
        },
        include: {
          user: true,
          partner: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!chat) {
        // Jika tidak ada chat yang aktif, kirim pesan ke pengguna
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
        chat.user.id == user.id ? chat.partner?.userId : chat.user.userId;

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
const helpCommand = async (ctx) => {
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
const botCommand = async (ctx) => {
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
          `Uptime: ${uptime}\nTotal user: ${totalUser}\nTotal chat: ${totalChat}\nTotal active chat: ${totalActiveChat}\nTotal waiting chat: ${totalWaitingChat}\nBot status: ${getSystemStatus()}`
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

// Export all command handlers
export { startCommand, searchCommand, endCommand, helpCommand, botCommand };
