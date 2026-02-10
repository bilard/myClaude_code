import { Router, Response } from 'express';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, loadUser);

// ─── List designs ──────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, folderId, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = { userId: req.userId };
    if (status) where.status = status;
    if (folderId) where.folderId = folderId;
    if (search) where.title = { contains: search as string };

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: { folder: true, _count: { select: { comments: true, exports: true } } },
      }),
      prisma.design.count({ where }),
    ]);

    res.json({ designs, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Create design ──────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, designType = 'custom', width, height, description, folderId, tags } = req.body;

    let canvaDesign = null;
    if (req.user?.accessToken) {
      const canva = new CanvaService(req.user.accessToken);
      canvaDesign = await canva.createDesign(designType, { width, height, title });
    }

    const design = await prisma.design.create({
      data: {
        title,
        description,
        designType,
        width: width || 1920,
        height: height || 1080,
        canvaDesignId: canvaDesign?.design?.id,
        editUrl: canvaDesign?.design?.urls?.edit_url,
        viewUrl: canvaDesign?.design?.urls?.view_url,
        thumbnailUrl: canvaDesign?.design?.thumbnail?.url,
        status: 'draft',
        tags: tags ? JSON.stringify(tags) : null,
        userId: req.userId!,
        folderId,
      },
    });

    res.status(201).json(design);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get design ──────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const design = await prisma.design.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        folder: true,
        pages: { orderBy: { pageNumber: 'asc' } },
        comments: { include: { user: { select: { displayName: true } } }, orderBy: { createdAt: 'desc' } },
        exports: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    if (!design) {
      return res.status(404).json({ error: 'Design introuvable' });
    }

    // Sync with Canva if connected
    if (design.canvaDesignId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const canvaData = await canva.getDesign(design.canvaDesignId);
        await prisma.design.update({
          where: { id: design.id },
          data: {
            thumbnailUrl: canvaData.design?.thumbnail?.url || design.thumbnailUrl,
            title: canvaData.design?.title || design.title,
          },
        });
      } catch { /* Canva sync failed silently */ }
    }

    res.json(design);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update design ──────────────────────────────────────────

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, status, folderId, tags } = req.body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (folderId !== undefined) data.folderId = folderId;
    if (tags !== undefined) data.tags = JSON.stringify(tags);

    const design = await prisma.design.update({
      where: { id: req.params.id, userId: req.userId },
      data,
    });

    res.json(design);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Delete design ──────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.design.delete({ where: { id: req.params.id, userId: req.userId } });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Sync designs from Canva ──────────────────────────────────────────

router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.accessToken) {
      return res.status(400).json({ error: 'Canva non connecté' });
    }

    const canva = new CanvaService(req.user.accessToken);
    const result = await canva.listDesigns();

    let synced = 0;
    for (const item of result.items || []) {
      const existing = await prisma.design.findUnique({ where: { canvaDesignId: item.id } });
      if (!existing) {
        await prisma.design.create({
          data: {
            canvaDesignId: item.id,
            title: item.title || 'Sans titre',
            thumbnailUrl: item.thumbnail?.url,
            editUrl: item.urls?.edit_url,
            viewUrl: item.urls?.view_url,
            status: 'synced',
            userId: req.userId!,
          },
        });
        synced++;
      }
    }

    res.json({ synced, total: result.items?.length || 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Open in Canva editor ──────────────────────────────────────────

router.get('/:id/edit-url', async (req: AuthRequest, res: Response) => {
  try {
    const design = await prisma.design.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!design) return res.status(404).json({ error: 'Design introuvable' });

    if (design.editUrl) {
      return res.json({ editUrl: design.editUrl });
    }

    if (design.canvaDesignId && req.user?.accessToken) {
      const canva = new CanvaService(req.user.accessToken);
      const canvaData = await canva.getDesign(design.canvaDesignId);
      const editUrl = canvaData.design?.urls?.edit_url;
      if (editUrl) {
        await prisma.design.update({ where: { id: design.id }, data: { editUrl } });
        return res.json({ editUrl });
      }
    }

    res.status(404).json({ error: 'URL d\'édition non disponible' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
