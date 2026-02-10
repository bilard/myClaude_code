import { Router, Response } from 'express';
import prisma from '../db.js';
import { CanvaService } from '../services/canva.js';
import { authMiddleware, loadUser, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware, loadUser);

// ─── List comments for a design ──────────────────────────────────────────

router.get('/design/:designId', async (req: AuthRequest, res: Response) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { designId: req.params.designId, parentId: null },
      include: {
        user: { select: { displayName: true, avatar: true } },
        replies: {
          include: { user: { select: { displayName: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Create comment ──────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { designId, message, positionX, positionY, pageNumber } = req.body;

    const design = await prisma.design.findFirst({
      where: { id: designId, userId: req.userId },
    });

    if (!design) return res.status(404).json({ error: 'Design introuvable' });

    let canvaThreadId = null;
    if (design.canvaDesignId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        const thread = await canva.createThread(design.canvaDesignId, message, positionX, positionY, pageNumber);
        canvaThreadId = thread.thread?.id || thread.id;
      } catch { /* Canva comment sync failed */ }
    }

    const comment = await prisma.comment.create({
      data: {
        designId,
        userId: req.userId!,
        message,
        positionX,
        positionY,
        pageNumber,
        canvaThreadId,
      },
      include: {
        user: { select: { displayName: true, avatar: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Reply to comment ──────────────────────────────────────────

router.post('/:id/reply', async (req: AuthRequest, res: Response) => {
  try {
    const parentComment = await prisma.comment.findFirst({
      where: { id: req.params.id },
      include: { design: true },
    });

    if (!parentComment) return res.status(404).json({ error: 'Commentaire introuvable' });

    const { message } = req.body;

    if (parentComment.canvaThreadId && parentComment.design.canvaDesignId && req.user?.accessToken) {
      try {
        const canva = new CanvaService(req.user.accessToken);
        await canva.createReply(parentComment.design.canvaDesignId!, parentComment.canvaThreadId, message);
      } catch { /* Canva reply sync failed */ }
    }

    const reply = await prisma.comment.create({
      data: {
        designId: parentComment.designId,
        userId: req.userId!,
        message,
        parentId: parentComment.id,
      },
      include: {
        user: { select: { displayName: true, avatar: true } },
      },
    });

    res.status(201).json(reply);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Update comment ──────────────────────────────────────────

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { message, status } = req.body;
    const data: Record<string, unknown> = {};
    if (message !== undefined) data.message = message;
    if (status !== undefined) data.status = status;

    const comment = await prisma.comment.update({
      where: { id: req.params.id, userId: req.userId },
      data,
    });

    res.json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

// ─── Delete comment ──────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.id, userId: req.userId } });
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
});

export default router;
