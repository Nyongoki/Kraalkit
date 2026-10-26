import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/languages – list all active languages
router.get('/', async (_req, res, next) => {
  try {
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, nativeName: true },
      orderBy: { name: 'asc' },
    });
    res.json(languages);
  } catch (err) {
    next(err);
  }
});

export default router;
