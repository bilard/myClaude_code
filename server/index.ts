import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import designRoutes from './routes/designs.js';
import templateRoutes from './routes/templates.js';
import assetRoutes from './routes/assets.js';
import folderRoutes from './routes/folders.js';
import exportRoutes from './routes/exports.js';
import commentRoutes from './routes/comments.js';
import settingRoutes from './routes/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: process.env.APP_URL || 'http://127.0.0.1:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy (behind Nginx)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
});
app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/settings', settingRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`✦ Canva Studio Pro running on port ${PORT} [${isProduction ? 'production' : 'development'}]`);
});
