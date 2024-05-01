/**
 * Context modify middleware function
 *
 * @param {Object} ctx - Context object
 * @param {Function} next - Next middleware function
 * @returns {Function} Next middleware function
 */
const contextModify = (ctx, next) => {
  // Modify context object
  ctx.messageData = ctx.message ?? ctx.callbackQuery;

  // Continue to the next middleware
  return next();
};

// Export the middleware
export default contextModify;
