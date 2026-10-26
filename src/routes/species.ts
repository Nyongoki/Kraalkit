import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/species – list all species
router.get('/', async (_req, res, next) => {
  try {
    const species = await prisma.species.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(species);
  } catch (err) {
    next(err);
  }
});

export default router;
