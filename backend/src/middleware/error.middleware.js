import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (!statusCode) statusCode = 500;

  res.status(statusCode).json({
    success: false,
    message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
