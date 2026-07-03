const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const env = require('../config/env');
const { BadRequestError, UnauthorizedError } = require('../utils/errors');

class AuthService {
  async register(email, password, name) {
    // Check if user exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      throw new BadRequestError('User already exists', 'USER_EXISTS');
    }

    const password_hash = await bcrypt.hash(password, 12);
    
    const [user] = await db('users').insert({
      email,
      password_hash,
      name,
    }).returning(['id', 'email', 'name', 'role']);

    return this.generateTokens(user);
  }

  async login(email, password) {
    const user = await db('users').where({ email }).first();
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY }
    );

    return { user, accessToken, refreshToken };
  }
}

module.exports = new AuthService();
