import { logger } from "../utils.js";

/**
 * Filter commands middleware
 *
 * @param {Object} ctx - Context object
 * @param {Function} next - Next middleware function
 * @returns {Function} Next middleware function
 */
const filterCommands = async (ctx, next) => {
  const messageText = ctx.messageData.text ?? ctx.messageData.caption;
  const commandRegex = /^\/\w+/;

  if (commandRegex.test(messageText) && !isDefinedCommand(messageText)) {
    logger.log(`🛑 Command detection: ${messageText}`);
    return;
  }

  await next();
};

const isDefinedCommand = (text) => {
  const definedCommands = [
    "/start",
    "/cancel",
    "/end",
    "/search",
    "/help",
    "/ping",
  ];

  return definedCommands.includes(text.split(" ")[0]);
};

export default filterCommands;
