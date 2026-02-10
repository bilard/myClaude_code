import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── Login local ──────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        canvaConnected: !!user.accessToken,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Register ──────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, displayName },
    });

    // Create default folders for the new user
    const folders = ['Mes Designs', 'Templates', 'Assets', 'Exports'];
    for (const name of folders) {
      await prisma.folder.create({ data: { name, userId: user.id } });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        canvaConnected: false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get current user ──────────────────────────────────────────

router.get('/me', authMiddleware, loadUser, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatar: true,
      canvaUserId: true,
      isActive: true,
      createdAt: true,
    },
  });
  const canvaConnected = !!(await prisma.user.findUnique({
    where: { id: req.userId },
    select: { accessToken: true },
  }))?.accessToken;

  res.json({ ...user, canvaConnected });
});

// ─── Update profile ──────────────────────────────────────────

router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, email, currentPassword, newPassword } = req.body;
    const data: Record<string, unknown> = {};

    if (displayName) data.displayName = displayName;
    if (email) data.email = email;

    if (newPassword && currentPassword) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
      }
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, displayName: true, avatar: true },
    });

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Canva OAuth ──────────────────────────────────────────

const codeVerifiers = new Map<string, string>();

router.get('/canva/connect', authMiddleware, (req: AuthRequest, res: Response) => {
  const clientId = process.env.CANVA_CLIENT_ID;
  const redirectUri = process.env.CANVA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Configuration Canva manquante. Veuillez configurer CANVA_CLIENT_ID et CANVA_REDIRECT_URI.' });
  }

  const state = `${req.userId}:${crypto.randomBytes(16).toString('hex')}`;
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  codeVerifiers.set(state, codeVerifier);
  setTimeout(() => codeVerifiers.delete(state), 10 * 60 * 1000);

  const authUrl = CanvaService.getAuthorizationUrl(clientId, redirectUri, state, codeChallenge);
  res.json({ authUrl });
});

router.get('/canva/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${process.env.APP_URL}/settings?error=canva_auth_failed`);
    }

    const stateStr = state as string;
    const codeVerifier = codeVerifiers.get(stateStr);
    if (!codeVerifier) {
      return res.redirect(`${process.env.APP_URL}/settings?error=invalid_state`);
    }

    const userId = stateStr.split(':')[0];
    codeVerifiers.delete(stateStr);

    const tokenData = await CanvaService.exchangeToken(
      code as string,
      process.env.CANVA_CLIENT_ID!,
      process.env.CANVA_CLIENT_SECRET!,
      process.env.CANVA_REDIRECT_URI!,
      codeVerifier
    );

    const canva = new CanvaService(tokenData.access_token);
    const userInfo = await canva.getUserInfo();

    await prisma.user.update({
      where: { id: userId },
      data: {
        canvaUserId: userInfo.user_id || userInfo.id,
        canvaTeamId: userInfo.team_id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    res.redirect(`${process.env.APP_URL}/settings?canva=connected`);
  } catch (error: unknown) {
    console.error('Canva OAuth error:', error);
    res.redirect(`${process.env.APP_URL}/settings?error=canva_auth_error`);
  }
});

router.post('/canva/disconnect', authMiddleware, async (req: AuthRequest, res: Response) => {
  await prisma.user.update({
    where: { id: req.userId },
    data: {
      canvaUserId: null,
      canvaTeamId: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
    },
  });
  res.json({ success: true });
});

export default router;
