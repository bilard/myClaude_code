import { Router, Response } from 'express';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, loadUser);

// ─── List templates ──────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, category, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = { userId: req.userId };
    if (category) where.category = category;
    if (search) where.name = { contains: search as string };

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { templateDesigns: true } } },
      }),
      prisma.template.count({ where }),
    ]);

    res.json({ templates, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Create template ──────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, tags, isPublic, datasetFields } = req.body;

    const template = await prisma.template.create({
      data: {
        name,
        description,
        category,
        tags: tags ? JSON.stringify(tags) : null,
        isPublic: isPublic || false,
        datasetFields: datasetFields ? JSON.stringify(datasetFields) : null,
        userId: req.userId!,
      },
    });

    res.status(201).json(template);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get template ──────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        templateDesigns: {
          include: { design: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) return res.status(404).json({ error: 'Template introuvable' });
    res.json(template);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update template ──────────────────────────────────────────

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, tags, isPublic, datasetFields } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (tags !== undefined) data.tags = JSON.stringify(tags);
    if (datasetFields !== undefined) data.datasetFields = JSON.stringify(datasetFields);

    const template = await prisma.template.update({
      where: { id: req.params.id, userId: req.userId },
      data,
    });

    res.json(template);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Delete template ──────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id, userId: req.userId } });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Sync brand templates from Canva ──────────────────────────────────────────

router.post('/sync-brand', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.accessToken) {
      return res.status(400).json({ error: 'Canva non connecté' });
    }

    const canva = new CanvaService(req.user.accessToken);
    const result = await canva.listBrandTemplates();

    let synced = 0;
    for (const item of result.items || []) {
      const existing = await prisma.template.findUnique({ where: { canvaTemplateId: item.id } });
      if (!existing) {
        let dataset = null;
        try {
          dataset = await canva.getBrandTemplateDataset(item.id);
        } catch { /* Not all templates have datasets */ }

        await prisma.template.create({
          data: {
            canvaTemplateId: item.id,
            name: item.title || item.name || 'Sans titre',
            thumbnailUrl: item.thumbnail?.url,
            category: 'brand',
            datasetFields: dataset ? JSON.stringify(dataset) : null,
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

// ─── Autofill template ──────────────────────────────────────────

router.post('/:id/autofill', async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!template || !template.canvaTemplateId) {
      return res.status(400).json({ error: 'Template Canva introuvable' });
    }

    if (!req.user?.accessToken) {
      return res.status(400).json({ error: 'Canva non connecté' });
    }

    const { title, data } = req.body;
    const canva = new CanvaService(req.user.accessToken);
    const job = await canva.createAutofillJob(template.canvaTemplateId, title, data);

    // Poll for completion
    let result = job;
    let attempts = 0;
    while (result.job?.status === 'in_progress' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await canva.getAutofillJob(result.job.id);
      attempts++;
    }

    if (result.job?.status === 'success' && result.result?.design) {
      const design = await prisma.design.create({
        data: {
          title: title || template.name,
          canvaDesignId: result.result.design.id,
          thumbnailUrl: result.result.design.thumbnail?.url,
          editUrl: result.result.design.urls?.edit_url,
          viewUrl: result.result.design.urls?.view_url,
          status: 'completed',
          userId: req.userId!,
        },
      });

      await prisma.templateDesign.create({
        data: {
          templateId: template.id,
          designId: design.id,
          autofillData: JSON.stringify(data),
        },
      });

      await prisma.template.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });

      return res.json({ design, job: result.job });
    }

    res.json({ job: result.job, error: result.error });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Get template categories ──────────────────────────────────────────

router.get('/meta/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.template.groupBy({
      by: ['category'],
      where: { userId: req.userId },
      _count: { category: true },
    });
    res.json(categories.filter(c => c.category).map(c => ({ name: c.category, count: c._count.category })));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
