import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Read Authorization header & 2. Expect format: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 5. Return 401 for missing token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token missing',
      });
    }

    // 3. Verify token using JWT_SECRET
    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // 4. Attach decoded payload to req.user
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    // 5. Return 401 for invalid or expired token
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid or expired',
    });
  }
};
