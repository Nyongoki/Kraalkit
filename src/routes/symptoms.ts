import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

/**
 * Normalize a query string: trim, lowercase, strip diacritics.
 */
function normalize(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// GET /api/symptoms – list all formal clinical symptoms
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const symptoms = await prisma.symptom.findMany({
      select: {
        id: true,
        key: true,
        nameEn: true,
        description: true,
        _count: { select: { terms: true } },
      },
      orderBy: { nameEn: 'asc' },
    });
    res.json(symptoms);
  } catch (err) {
    next(err);
  }
});

// POST /api/symptoms – create a new formal clinical symptom
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      nameEn: z.string().min(2),
      key: z.string().optional(),
      description: z.string().optional(),
    });

    const { nameEn, key, description } = schema.parse(req.body);
    const finalKey =
      key?.trim() ||
      nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const symptom = await prisma.symptom.upsert({
      where: { key: finalKey },
      update: {
        nameEn: nameEn.trim(),
        description: description?.trim() || undefined,
      },
      create: {
        key: finalKey,
        nameEn: nameEn.trim(),
        description: description?.trim() || null,
      },
    });

    res.status(201).json(symptom);
  } catch (err) {
    next(err);
  }
});

// GET /api/symptoms/search?q=&speciesId=&languageCode=
// Supports multi-symptom comma/and delimited queries (e.g. "homa, kukohoa", "fever and diarrhea")
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      q: z.string().min(1),
      speciesId: z.coerce.number().int().positive().optional(),
      languageCode: z.string().optional(),
    });

    const { q, speciesId, languageCode } = schema.parse(req.query);

    // Get the language id if a code was provided
    let languageId: number | undefined;
    if (languageCode) {
      const lang = await prisma.language.findUnique({ where: { code: languageCode } });
      languageId = lang?.id;
    }

    // Split multi-symptom query into sub-terms (handles commas, semicolons, "and", "na")
    const subTerms = q
      .split(/[,;\n]|(?:\s+na\s+)|(?:\s+and\s+)/i)
      .map((t) => normalize(t))
      .filter((t) => t.length > 0);

    const termsToSearch = subTerms.length > 0 ? subTerms : [normalize(q)];

    type TermRow = {
      id: number;
      text: string;
      status: string;
      symptomId: number;
      languageId: number;
    };

    const bySymptom = new Map<number, TermRow>();

    for (const term of termsToSearch) {
      let termRows: TermRow[] = [];

      if (term.length < 3) {
        termRows = await prisma.$queryRaw<TermRow[]>`
          SELECT id, text, status, symptomId, languageId
          FROM SymptomTerm
          WHERE (text LIKE ${term + '%'} OR text LIKE ${'%' + term + '%'})
            AND status != 'REJECTED'
          ORDER BY FIELD(status, 'CONFIRMED', 'PENDING') ASC
          LIMIT 50
        `;
      } else {
        // Try fulltext first
        const fulltextRows = await prisma.$queryRaw<TermRow[]>`
          SELECT id, text, status, symptomId, languageId
          FROM SymptomTerm
          WHERE MATCH(text) AGAINST (${term} IN BOOLEAN MODE)
            AND status != 'REJECTED'
          ORDER BY FIELD(status, 'CONFIRMED', 'PENDING') ASC
          LIMIT 50
        `;

        if (fulltextRows.length === 0) {
          termRows = await prisma.$queryRaw<TermRow[]>`
            SELECT id, text, status, symptomId, languageId
            FROM SymptomTerm
            WHERE text LIKE ${'%' + term + '%'}
              AND status != 'REJECTED'
            ORDER BY FIELD(status, 'CONFIRMED', 'PENDING') ASC
            LIMIT 50
          `;
        } else {
          termRows = fulltextRows;
        }
      }

      for (const row of termRows) {
        const existing = bySymptom.get(row.symptomId);
        if (!existing || (existing.status !== 'CONFIRMED' && row.status === 'CONFIRMED')) {
          bySymptom.set(row.symptomId, row);
        }
      }
    }

    // Filter by species if provided
    let symptomIds = [...bySymptom.keys()];
    if (speciesId) {
      const linked = await prisma.symptomSpecies.findMany({
        where: { speciesId, symptomId: { in: symptomIds } },
        select: { symptomId: true },
      });
      symptomIds = linked.map((l) => l.symptomId);
    }

    if (symptomIds.length === 0) {
      return res.json([]);
    }

    // Fetch full symptom data
    const symptoms = await prisma.symptom.findMany({
      where: { id: { in: symptomIds } },
      include: {
        terms: {
          where: {
            ...(languageId ? { languageId } : {}),
            status: 'CONFIRMED',
          },
          take: 1,
          select: { text: true, language: { select: { code: true } } },
        },
      },
    });

    const results = symptoms.map((sym) => {
      const matchedTerm = bySymptom.get(sym.id);
      return {
        id: sym.id,
        key: sym.key,
        nameEn: sym.nameEn,
        description: sym.description,
        matchedTerm: matchedTerm?.text ?? null,
        matchedTermStatus: matchedTerm?.status ?? null,
        localTerm: sym.terms[0]?.text ?? null,
        localTermLanguage: sym.terms[0]?.language?.code ?? null,
      };
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/symptoms/match
// Supports isHerd flag: if multiple animals are sick, infectious diseases are prioritized
router.post('/match', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      symptomIds: z.array(z.number().int().positive()).min(1),
      speciesId: z.number().int().positive(),
      isHerd: z.boolean().default(false),
      herdSize: z.number().int().positive().optional(),
    });

    const { symptomIds, speciesId, isHerd, herdSize } = schema.parse(req.body);

    // Get all diseases for this species
    const diseaseLinks = await prisma.diseaseSpecies.findMany({
      where: { speciesId },
      select: { diseaseId: true },
    });

    const diseaseIds = diseaseLinks.map((d) => d.diseaseId);
    if (diseaseIds.length === 0) {
      return res.json({ conditions: [], disclaimer: 'No diseases in database for this species. Always consult a vet.' });
    }

    // Get all symptom weights for these diseases
    const diseaseSymptoms = await prisma.diseaseSymptom.findMany({
      where: { diseaseId: { in: diseaseIds } },
    });

    // Load disease details
    const diseases = await prisma.disease.findMany({
      where: { id: { in: diseaseIds } },
    });

    // Highly contagious herd diseases in Kenya
    const contagiousSlugs = [
      'foot-and-mouth',
      'contagious-caprine-pleuropneumonia',
      'peste-des-petits-ruminants',
      'newcastle-disease',
      'lumpy-skin-disease',
      'anthrax',
      'blackleg',
    ];

    interface ScoredDisease {
      id: number;
      name: string;
      nameSw?: string | null;
      slug: string;
      urgency: string;
      notifiable: boolean;
      firstAid: string | null;
      firstAidSw?: string | null;
      reviewed?: boolean;
      reviewedBy?: string | null;
      score: number;
      matchedSymptoms: number;
      totalSymptoms: number;
      isContagious: boolean;
    }

    const scores: ScoredDisease[] = [];

    for (const disease of diseases) {
      const dsLinks = diseaseSymptoms.filter((ds) => ds.diseaseId === disease.id);
      if (dsLinks.length === 0) continue;

      const totalWeight = dsLinks.reduce((sum, ds) => sum + ds.weight, 0);
      const matchedLinks = dsLinks.filter((ds) => symptomIds.includes(ds.symptomId));
      const matchedWeight = matchedLinks.reduce((sum, ds) => sum + ds.weight, 0);

      // Require at least 2 matched symptoms
      if (matchedLinks.length < 2) continue;

      let score = matchedWeight / totalWeight;
      const isContagious = contagiousSlugs.includes(disease.slug) || disease.notifiable;

      // If multiple animals / herd is affected, boost infectious contagious diseases
      if (isHerd && isContagious) {
        score = Math.min(score * 1.25, 1.0); // 25% boost for herd outbreaks
      }

      scores.push({
        id: disease.id,
        name: disease.name,
        nameSw: disease.nameSw,
        slug: disease.slug,
        urgency: disease.urgency,
        notifiable: disease.notifiable,
        firstAid: disease.firstAid,
        firstAidSw: disease.firstAidSw,
        reviewed: disease.reviewed,
        reviewedBy: disease.reviewedBy,
        score,
        matchedSymptoms: matchedLinks.length,
        totalSymptoms: dsLinks.length,
        isContagious,
      });
    }

    // Rank diseases primarily by clinical match score descending, with urgency breaking close scores
    scores.sort((a, b) => {
      if (Math.abs(b.score - a.score) >= 0.05) {
        return b.score - a.score;
      }
      if (isHerd) {
        if (a.isContagious && !b.isContagious) return -1;
        if (b.isContagious && !a.isContagious) return 1;
      }
      if (a.urgency === 'EMERGENCY' && b.urgency !== 'EMERGENCY') return -1;
      if (b.urgency === 'EMERGENCY' && a.urgency !== 'EMERGENCY') return 1;
      if (a.notifiable && !b.notifiable) return -1;
      if (b.notifiable && !a.notifiable) return 1;
      return b.score - a.score;
    });

    const top4 = scores.slice(0, 4);

    res.json({
      isHerd,
      herdSize,
      conditions: top4.map((d) => ({
        id: d.id,
        name: d.name,
        nameSw: d.nameSw,
        urgency: d.urgency,
        notifiable: d.notifiable,
        firstAid: d.firstAid,
        firstAidSw: d.firstAidSw,
        reviewed: d.reviewed,
        reviewedBy: d.reviewedBy,
        score: Math.round(d.score * 100),
        matchedSymptoms: d.matchedSymptoms,
        totalSymptoms: d.totalSymptoms,
        callVetNow: d.urgency === 'EMERGENCY' || d.notifiable || (isHerd && d.isContagious),
        isContagious: d.isContagious,
      })),
      herdNotice: isHerd
        ? 'HERD / FLOCK SPREAD ALERT: Multiple animals affected indicates potential contagious transmission. Isolate sick animals immediately and enforce farm gate biosecurity.'
        : null,
      disclaimer:
        'These are possible conditions only — not a diagnosis. Always consult a qualified vet before treating your animals.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
