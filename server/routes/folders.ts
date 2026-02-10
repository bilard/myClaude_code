import { Router, Response } from 'express';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, loadUser);

// ─── List folders ──────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { parentId } = req.query;
    const where: Record<string, unknown> = { userId: req.userId };
    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null;
    }

    const folders = await prisma.folder.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { children: true, designs: true, assets: true } },
      },
    });

    res.json(folders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Create folder ──────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, parentId, color, icon } = req.body;

    let canvaFolderId = null;
    if (req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const result = await canva.createFolder(name, parentId);
        canvaFolderId = result.folder?.id;
      } catch { /* Canva folder creation failed */ }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        canvaFolderId,
        color,
        icon,
        userId: req.userId!,
      },
    });

    res.status(201).json(folder);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get folder ──────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        children: { orderBy: { name: 'asc' } },
        designs: { orderBy: { updatedAt: 'desc' } },
        assets: { orderBy: { createdAt: 'desc' } },
        parent: true,
      },
    });

    if (!folder) return res.status(404).json({ error: 'Dossier introuvable' });
    res.json(folder);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update folder ──────────────────────────────────────────

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, icon } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;

    const folder = await prisma.folder.update({
      where: { id: req.params.id, userId: req.userId },
      data,
    });

    res.json(folder);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Delete folder ──────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!folder) return res.status(404).json({ error: 'Dossier introuvable' });

    if (folder.canvaFolderId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        await canva.deleteFolder(folder.canvaFolderId);
      } catch { /* silent */ }
    }

    await prisma.folder.delete({ where: { id: folder.id } });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get folder tree ──────────────────────────────────────────

router.get('/meta/tree', async (req: AuthRequest, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, parentId: true, color: true, icon: true },
    });
    res.json(folders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
