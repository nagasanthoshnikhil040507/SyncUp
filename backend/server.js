import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import { env } from './src/config/env.js';
import { initSocket } from './src/services/socketManager.js';

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();

    // Create an explicit http.Server so Socket.IO can share the same port
    const httpServer = http.createServer(app);

    // Attach Socket.IO
    initSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

