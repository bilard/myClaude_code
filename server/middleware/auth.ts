import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    displayName: string;
    accessToken?: string | null;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export async function loadUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Utilisateur non identifié' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, displayName: true, accessToken: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  req.user = user;
  next();
}
