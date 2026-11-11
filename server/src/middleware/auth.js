const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');
const { getUserById } = require('../services/authService');

/** Requires a valid "Authorization: Bearer <token>" header and sets req.user. */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Please log in to continue.');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError(401, 'Your session has expired. Please log in again.');
  }

  const user = await getUserById(payload.sub);
  if (!user) throw new AppError(401, 'Please log in to continue.');

  req.user = user;
  next();
}

module.exports = { requireAuth };
