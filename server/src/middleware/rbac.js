const { ForbiddenError } = require('../utils/errors');

/**
 * Middleware for Role-Based Access Control
 * @param {string[]} allowedRoles Array of allowed roles (e.g. ['admin', 'owner'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Access denied: Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied: Requires one of [${allowedRoles.join(', ')}]`));
    }

    next();
  };
};

module.exports = requireRole;
