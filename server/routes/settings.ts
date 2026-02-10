import { Router, Response } from 'express';
import prisma from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// ─── Get user settings ──────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { userId: req.userId },
    });

    const grouped: Record<string, Record<string, string>> = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = s.value;
    }

    res.json(grouped);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update user settings ──────────────────────────────────────────

router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body as Record<string, Record<string, string>>;

    for (const [group, values] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(values)) {
        await prisma.setting.upsert({
          where: { userId_key: { userId: req.userId!, key } },
          update: { value, group },
          create: { userId: req.userId!, key, value, group },
        });
      }
    }

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get app config (public) ──────────────────────────────────────────

router.get('/app', async (_req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.appConfig.findMany();
    const grouped: Record<string, Record<string, string>> = {};
    for (const c of configs) {
      if (!grouped[c.group]) grouped[c.group] = {};
      grouped[c.group][c.key] = c.value;
    }
    res.json(grouped);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update app config ──────────────────────────────────────────

router.put('/app', async (req: AuthRequest, res: Response) => {
  try {
    const configs = req.body as Record<string, Record<string, string>>;

    for (const [group, values] of Object.entries(configs)) {
      for (const [key, value] of Object.entries(values)) {
        await prisma.appConfig.upsert({
          where: { key },
          update: { value, group },
          create: { key, value, group },
        });
      }
    }

    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get dashboard stats ──────────────────────────────────────────

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [designs, templates, assets, exports, comments, folders] = await Promise.all([
      prisma.design.count({ where: { userId: req.userId } }),
      prisma.template.count({ where: { userId: req.userId } }),
      prisma.asset.count({ where: { userId: req.userId } }),
      prisma.export.count({ where: { userId: req.userId } }),
      prisma.comment.count({ where: { userId: req.userId } }),
      prisma.folder.count({ where: { userId: req.userId } }),
    ]);

    const recentDesigns = await prisma.design.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, thumbnailUrl: true, status: true, updatedAt: true },
    });

    const recentExports = await prisma.export.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { design: { select: { title: true } } },
    });

    res.json({
      counts: { designs, templates, assets, exports, comments, folders },
      recentDesigns,
      recentExports,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
