const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { AppError, validationError } = require('../utils/errors');
const { validateRegistration, validateLogin } = require('../utils/validation');

const SALT_ROUNDS = 10;
const UNIQUE_VIOLATION = '23505';

const toUser = (row) => ({ id: row.id, name: row.name, email: row.email });

function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

const emailTaken = () =>
  new AppError(409, 'An account with this email already exists.', {
    email: 'An account with this email already exists.',
  });

async function register(input = {}) {
  const errors = validateRegistration(input);
  if (errors) throw validationError(errors);

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw emailTaken();

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  try {
    const { rows } = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    const user = toUser(rows[0]);
    return { user, token: signToken(user) };
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) throw emailTaken();
    throw err;
  }
}

async function login(input = {}) {
  const errors = validateLogin(input);
  if (errors) throw validationError(errors);

  const email = input.email.trim().toLowerCase();
  const { rows } = await db.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email]);
  const row = rows[0];

  // Same message for unknown email and wrong password, so accounts can't be discovered.
  const ok = row && (await bcrypt.compare(input.password, row.password_hash));
  if (!ok) throw new AppError(401, 'Invalid email or password.');

  const user = toUser(row);
  return { user, token: signToken(user) };
}

async function getUserById(id) {
  const { rows } = await db.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

module.exports = { register, login, getUserById, SALT_ROUNDS };
