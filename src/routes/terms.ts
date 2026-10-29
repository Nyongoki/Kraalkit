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

// GET /api/terms – list terms with optional filters (status, languageCode, symptomId, q)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'PENDING' | 'CONFIRMED' | 'REJECTED' | undefined;
    const languageCode = req.query.languageCode as string | undefined;
    const symptomId = req.query.symptomId ? parseInt(req.query.symptomId as string, 10) : undefined;
    const q = req.query.q as string | undefined;

    let languageId: number | undefined;
    if (languageCode) {
      const lang = await prisma.language.findUnique({ where: { code: languageCode } });
      if (lang) languageId = lang.id;
    }

    const where: any = {};
    if (status) where.status = status;
    if (languageId) where.languageId = languageId;
    if (symptomId) where.symptomId = symptomId;
    if (q) {
      where.OR = [
        { text: { contains: q } },
        { variant: { contains: q } },
        { contributor: { contains: q } },
      ];
    }

    const terms = await prisma.symptomTerm.findMany({
      where,
      include: {
        language: { select: { id: true, code: true, name: true, nativeName: true } },
        symptom: { select: { id: true, key: true, nameEn: true } },
        confirmedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ total: terms.length, terms });
  } catch (err) {
    next(err);
  }
});

// POST /api/terms/vet-submit – Direct field contribution by licensed Veterinarian
// Vets directly interact with pastoralists and farmers in native languages,
// so their field submissions are certified and fast-tracked into the dictionary.
router.post('/vet-submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      symptomId: z.number().int().positive().optional(),
      newSymptomNameEn: z.string().min(2).optional(),
      languageCode: z.string(),
      text: z.string().min(1).max(255),
      variant: z.string().optional(),
      clinicalContext: z.string().optional(),
      vetName: z.string().min(2),
      vetCounty: z.string().min(2),
      kvbNumber: z.string().optional(),
    });

    const {
      symptomId,
      newSymptomNameEn,
      languageCode,
      text,
      variant,
      clinicalContext,
      vetName,
      vetCounty,
      kvbNumber,
    } = schema.parse(req.body);

    const language = await prisma.language.findUnique({ where: { code: languageCode } });
    if (!language) return res.status(404).json({ error: `Language "${languageCode}" not found` });

    let finalSymptomId = symptomId;
    if (!finalSymptomId && newSymptomNameEn) {
      const key = newSymptomNameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const createdSym = await prisma.symptom.upsert({
        where: { key },
        update: { nameEn: newSymptomNameEn.trim() },
        create: { key, nameEn: newSymptomNameEn.trim() },
      });
      finalSymptomId = createdSym.id;
    }

    if (!finalSymptomId) {
      return res.status(400).json({ error: 'Either symptomId or newSymptomNameEn is required' });
    }

    const symptom = await prisma.symptom.findUnique({ where: { id: finalSymptomId } });
    if (!symptom) return res.status(404).json({ error: `Symptom id ${finalSymptomId} not found` });

    // Build rich contributor attribution and clinical variant description
    const credentialTag = kvbNumber?.trim() ? `KVB: ${kvbNumber.trim()}, ` : 'Licensed Vet, ';
    const contributorString = `${vetName.trim()} (${credentialTag}${vetCounty.trim()} County)`;
    
    let variantString = variant?.trim() || '';
    if (clinicalContext?.trim()) {
      variantString = variantString
        ? `${variantString} • Context: ${clinicalContext.trim()}`
        : `Context: ${clinicalContext.trim()}`;
    }

    // Default system vet user or first vet user for confirmedById reference
    const defaultVetUser = await prisma.vetUser.findFirst();

    const term = await prisma.symptomTerm.upsert({
      where: {
        symptomId_languageId_text: {
          symptomId: finalSymptomId,
          languageId: language.id,
          text: text.trim(),
        },
      },
      update: {
        variant: variantString || undefined,
        contributor: contributorString,
        status: 'CONFIRMED',
        confirmedById: defaultVetUser?.id || null,
        confirmedAt: new Date(),
      },
      create: {
        symptomId: finalSymptomId,
        languageId: language.id,
        text: text.trim(),
        variant: variantString || undefined,
        contributor: contributorString,
        status: 'CONFIRMED',
        confirmedById: defaultVetUser?.id || null,
        confirmedAt: new Date(),
      },
    });

    res.status(201).json({
      id: term.id,
      text: term.text,
      language: language.name,
      status: term.status,
      contributor: term.contributor,
      message: 'Term certified and confirmed into the national livestock dictionary',
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'This exact term already exists for this symptom and language' });
    }
    next(err);
  }
});

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
router.post('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const { reviewerName, reviewerCounty } = req.body || {};

    const term = await prisma.symptomTerm.findUnique({ where: { id } });
    if (!term) return res.status(404).json({ error: 'Term not found' });
    if (term.status === 'CONFIRMED') return res.json({ message: 'Term is already confirmed' });

    const defaultVetUser = await prisma.vetUser.findFirst();
    const reviewerString = reviewerName
      ? `${reviewerName} (${reviewerCounty ? reviewerCounty + ', ' : ''}KVB Vet)`
      : 'KVB Field Veterinarian';

    const updated = await prisma.symptomTerm.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedById: defaultVetUser?.id || null,
        confirmedAt: new Date(),
        contributor: term.contributor
          ? `${term.contributor} [Verified by ${reviewerString}]`
          : `Verified by ${reviewerString}`,
      },
    });

    res.json({ id: updated.id, status: updated.status, confirmedAt: updated.confirmedAt });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/terms/:id – vet rejects / removes a term
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await prisma.symptomTerm.delete({ where: { id } });
    res.json({ success: true, message: 'Term removed from lexicon' });
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
