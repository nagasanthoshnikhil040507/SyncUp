/**
 * ⚠️  ORPHANED FILE — DO NOT USE
 *
 * This file is NOT the application entry point and is never imported
 * by server.js or any other active module.
 *
 * The real Express app lives at:  src/app.js
 * The server entry point is:      server.js  (package.json "main")
 *
 * Keeping this file can cause confusion. Consider deleting it.
 */

import express from 'express';
import cors from 'cors';
import healthRoutes from './src/routes/health.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

export default app;
