import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import routes from './routes/index.js';

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
// Allow cross-origin resource policy so inline file previews (images/PDF) work
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SyncUp API is running' });
});

app.use('/api', routes);

// ── Multer error handler (must come BEFORE generic errorHandler) ──────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 20 MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  // Non-multer errors with a message (e.g. unsupported file type from fileFilter)
  if (err && err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

app.use(errorHandler);

export { app };

