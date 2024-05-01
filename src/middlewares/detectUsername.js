import { isAdmin, logger } from "../utils.js";

/**
 * Username detection middleware
 *
 * @param {Object} ctx - Context object
 * @param {Function} next - Next middleware function
 * @returns {Function} Next middleware function
 */
const detectUsername = async (ctx, next) => {
  const messageText = ctx.messageData.text ?? ctx.messageData.caption;
  const usernameRegex = /@([A-Za-z0-9_]{4,32})/;

  if (usernameRegex.test(messageText) || !isAdmin(ctx.messageData.from.id)) {
    const username = messageText.match(usernameRegex)[1];
    logger.log(`🛑 Detection username: ${username}`);

    await ctx.reply(
      `Hargai privasi anda atau orang lain dengan tidak menyebutkan username disini!`
    );
    return;
  }

  await next();
};

export default detectUsername;
