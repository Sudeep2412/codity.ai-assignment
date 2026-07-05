const authService = require('../services/auth.service');
const db = require('../config/database');
const { NotFoundError } = require('../utils/errors');

exports.register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.register(email, password, name);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: { message: 'Refresh token is required' } });
    }
    
    const result = await authService.refresh(refreshToken);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    // Fetch full user record from DB using the JWT-decoded id
    const user = await db('users')
      .where({ id: req.user.id })
      .select('id', 'email', 'name', 'role', 'created_at')
      .first();
    
    if (!user) throw new NotFoundError('User not found');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
