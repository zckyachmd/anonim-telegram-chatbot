import prisma from "./database.js";

const findUser = async (userId) => {
  return await prisma.user.findUnique({
    where: { userId: userId },
  });
};

// Fungsi untuk mencari user dan chat
const findUserAndChat = async (userId) => {
  const user = await findUser(userId);
  const chat = await prisma.chat.findFirst({
    where: {
      OR: [{ userId: user.id }, { partnerId: user.id }],
      status: "active",
    },
    include: {
      user: true,
      partner: true,
    },
  });
  return { user, chat };
};

export { findUser, findUserAndChat };
