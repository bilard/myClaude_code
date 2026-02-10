import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import designRoutes from './routes/designs.js';
import templateRoutes from './routes/templates.js';
import assetRoutes from './routes/assets.js';
import folderRoutes from './routes/folders.js';
import exportRoutes from './routes/exports.js';
import commentRoutes from './routes/comments.js';
import settingRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.APP_URL || 'http://127.0.0.1:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
});
app.use('/api', limiter);

// Routes
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

app.listen(PORT, () => {
  console.log(`✦ Canva Studio Pro API running on http://127.0.0.1:${PORT}`);
});
