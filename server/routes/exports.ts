import { Router, Response } from 'express';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, loadUser);

// ─── List exports ──────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { designId, format, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = { userId: req.userId };
    if (designId) where.designId = designId;
    if (format) where.format = format;

    const [exports, total] = await Promise.all([
      prisma.export.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { design: { select: { title: true, thumbnailUrl: true } } },
      }),
      prisma.export.count({ where }),
    ]);

    res.json({ exports, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Create export ──────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { designId, format, quality } = req.body;

    const design = await prisma.design.findFirst({
      where: { id: designId, userId: req.userId },
    });

    if (!design) return res.status(404).json({ error: 'Design introuvable' });

    let canvaExportId = null;
    let downloadUrl = null;
    let status = 'pending';

    if (design.canvaDesignId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const exportJob = await canva.createExportJob(design.canvaDesignId, format, { quality });

        let result = exportJob;
        let attempts = 0;
        while (result.job?.status === 'in_progress' && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await canva.getExportJob(result.job.id);
          attempts++;
        }

        canvaExportId = result.job?.id;

        if (result.job?.status === 'success' && result.urls?.length > 0) {
          downloadUrl = result.urls[0];
          status = 'completed';
        } else if (result.job?.status === 'failed') {
          status = 'failed';
        }
      } catch {
        status = 'failed';
      }
    } else {
      status = 'no_canva';
    }

    const exportRecord = await prisma.export.create({
      data: {
        designId: design.id,
        userId: req.userId!,
        format,
        quality,
        status,
        canvaExportId,
        downloadUrl,
        expiresAt: downloadUrl ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      },
    });

    res.status(201).json(exportRecord);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Check export status ──────────────────────────────────────────

router.get('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const exportRecord = await prisma.export.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!exportRecord) return res.status(404).json({ error: 'Export introuvable' });

    if (exportRecord.status === 'pending' && exportRecord.canvaExportId && req.user?.accessToken) {
      const canva = new CanvaService(req.user.accessToken);
      const result = await canva.getExportJob(exportRecord.canvaExportId);

      if (result.job?.status === 'success') {
        const updated = await prisma.export.update({
          where: { id: exportRecord.id },
          data: {
            status: 'completed',
            downloadUrl: result.urls?.[0],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        return res.json(updated);
      } else if (result.job?.status === 'failed') {
        const updated = await prisma.export.update({
          where: { id: exportRecord.id },
          data: { status: 'failed', errorMessage: result.error?.message },
        });
        return res.json(updated);
      }
    }

    res.json(exportRecord);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Delete export ──────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.export.delete({ where: { id: req.params.id, userId: req.userId } });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get available formats for a design ──────────────────────────────────────────

router.get('/formats/:designId', async (req: AuthRequest, res: Response) => {
  try {
    const design = await prisma.design.findFirst({
      where: { id: req.params.designId, userId: req.userId },
    });

    if (!design) return res.status(404).json({ error: 'Design introuvable' });

    if (design.canvaDesignId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const formats = await canva.getDesignExportFormats(design.canvaDesignId);
        return res.json(formats);
      } catch { /* fallback */ }
    }

    // Default formats
    res.json({ export_formats: ['pdf', 'jpg', 'png', 'gif', 'pptx', 'mp4'] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
