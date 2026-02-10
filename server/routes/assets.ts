import { Router, Response } from 'express';
import multer from 'multer';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(authMiddleware, loadUser);

// ─── List assets ──────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, type, folderId, page = '1', limit = '30' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = { userId: req.userId };
    if (type) where.type = type;
    if (folderId) where.folderId = folderId;
    if (search) where.name = { contains: search as string };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where }),
    ]);

    res.json({ assets, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Upload asset ──────────────────────────────────────────

router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { name, tags, folderId } = req.body;
    const fileName = name || req.file.originalname;
    const fileType = req.file.mimetype.split('/')[0]; // image, video, etc.

    let canvaAsset = null;
    let uploadStatus = 'completed';

    if (req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const uploadResult = await canva.createAssetUpload(req.file.buffer, {
          name: fileName,
          tags: tags ? JSON.parse(tags) : undefined,
        });

        // Poll for completion
        let result = uploadResult;
        let attempts = 0;
        while (result.job?.status === 'in_progress' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await canva.getAssetUploadJob(result.job.id);
          attempts++;
        }

        if (result.job?.status === 'success') {
          canvaAsset = result.asset;
        } else {
          uploadStatus = 'canva_pending';
        }
      } catch (e) {
        uploadStatus = 'local_only';
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name: fileName,
        type: fileType,
        mimeType: req.file.mimetype,
        size: req.file.size,
        canvaAssetId: canvaAsset?.id,
        thumbnailUrl: canvaAsset?.thumbnail?.url,
        tags: tags || null,
        folderId: folderId || null,
        userId: req.userId!,
        uploadStatus,
      },
    });

    res.status(201).json(asset);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Upload asset from URL ──────────────────────────────────────────

router.post('/upload-url', async (req: AuthRequest, res: Response) => {
  try {
    const { url, name, tags, folderId } = req.body;

    let canvaAsset = null;
    let uploadStatus = 'completed';

    if (req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const uploadResult = await canva.createUrlAssetUpload(url, name, tags);

        let result = uploadResult;
        let attempts = 0;
        while (result.job?.status === 'in_progress' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await canva.getUrlAssetUploadJob(result.job.id);
          attempts++;
        }

        if (result.job?.status === 'success') {
          canvaAsset = result.asset;
        }
      } catch {
        uploadStatus = 'local_only';
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        type: 'image',
        url,
        canvaAssetId: canvaAsset?.id,
        thumbnailUrl: canvaAsset?.thumbnail?.url || url,
        tags: tags ? JSON.stringify(tags) : null,
        folderId: folderId || null,
        userId: req.userId!,
        uploadStatus,
      },
    });

    res.status(201).json(asset);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get asset ──────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!asset) return res.status(404).json({ error: 'Asset introuvable' });
    res.json(asset);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update asset ──────────────────────────────────────────

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, tags, folderId } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    if (folderId !== undefined) data.folderId = folderId;

    const asset = await prisma.asset.update({
      where: { id: req.params.id, userId: req.userId },
      data,
    });

    // Sync to Canva
    if (asset.canvaAssetId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        await canva.updateAsset(asset.canvaAssetId, name, tags);
      } catch { /* Canva sync failed silently */ }
    }

    res.json(asset);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Delete asset ──────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!asset) return res.status(404).json({ error: 'Asset introuvable' });

    // Delete from Canva
    if (asset.canvaAssetId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        await canva.deleteAsset(asset.canvaAssetId);
      } catch { /* Canva delete failed silently */ }
    }

    await prisma.asset.delete({ where: { id: asset.id } });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get asset stats ──────────────────────────────────────────

router.get('/meta/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await prisma.asset.groupBy({
      by: ['type'],
      where: { userId: req.userId },
      _count: { type: true },
      _sum: { size: true },
    });
    const total = await prisma.asset.count({ where: { userId: req.userId } });
    res.json({ types: stats, total });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
