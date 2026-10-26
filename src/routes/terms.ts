import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Middleware: verify vet JWT
function requireVetAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { vetUserId: number };
    (req as Request & { vetUserId?: number }).vetUserId = payload.vetUserId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// POST /api/terms – suggest a new term (anyone can submit)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      symptomId: z.number().int().positive(),
      languageCode: z.string(),
      text: z.string().min(1).max(255),
      variant: z.string().optional(),
      contributor: z.string().optional(),
    });

    const { symptomId, languageCode, text, variant, contributor } = schema.parse(req.body);

    const language = await prisma.language.findUnique({ where: { code: languageCode } });
    if (!language) return res.status(404).json({ error: `Language "${languageCode}" not found` });

    const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });
    if (!symptom) return res.status(404).json({ error: `Symptom id ${symptomId} not found` });

    const term = await prisma.symptomTerm.create({
      data: { symptomId, languageId: language.id, text, variant, contributor, status: 'PENDING' },
    });

    res.status(201).json({ id: term.id, status: term.status, message: 'Term submitted and pending verification' });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'This exact term already exists for this symptom and language' });
    }
    next(err);
  }
});

// POST /api/terms/:id/confirm – vet confirms a term
router.post('/:id/confirm', requireVetAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const vetUserId = (req as Request & { vetUserId?: number }).vetUserId!;

    const term = await prisma.symptomTerm.findUnique({ where: { id } });
    if (!term) return res.status(404).json({ error: 'Term not found' });
    if (term.status === 'CONFIRMED') return res.json({ message: 'Term is already confirmed' });

    const updated = await prisma.symptomTerm.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedById: vetUserId, confirmedAt: new Date() },
    });

    res.json({ id: updated.id, status: updated.status, confirmedAt: updated.confirmedAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/terms/auth/login – vet login
router.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const { email, password } = schema.parse(req.body);
    const user = await prisma.vetUser.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ vetUserId: user.id }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
});

export default router;
