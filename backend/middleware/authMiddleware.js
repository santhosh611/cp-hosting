// contract/backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      if (!process.env.JWT_SECRET) {
        console.error("CRITICAL ERROR: JWT_SECRET environment variable is not set in backend!");
        res.status(500);
        throw new Error("Server misconfiguration: JWT_SECRET is not set.");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const DEV_ADMIN_ID = '60d5ec49f5e2a3001c8f1f8a';
      const DEV_SUPERVISOR_ID = '60d5ec49f5e2a3001c8f1f8b';
      
      if (decoded.id === DEV_ADMIN_ID) {
        req.user = { _id: DEV_ADMIN_ID, role: 'admin', name: 'Dev Admin' };
      } else if (decoded.id === DEV_SUPERVISOR_ID) {
        req.user = { _id: DEV_SUPERVISOR_ID, role: 'supervisor', name: 'Dev Supervisor', assignedSites: [] };
      } else {
        req.user = await User.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user in token not found');
      }

      next();

    } catch (error) {
      console.error("Authentication Error (Middleware):", error.name, error.message);
      res.status(401);
      throw new Error('Not authorized, token failed verification');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
});

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`);
    }
    next();
  };
};

module.exports = { protect, authorizeRoles };