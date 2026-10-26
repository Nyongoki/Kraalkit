import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// POST /api/reports – submit a case report
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      speciesId: z.number().int().positive(),
      symptomIds: z.array(z.number().int().positive()).min(1),
      county: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      animalsAffected: z.number().int().min(1).default(1),
      animalsDead: z.number().int().min(0).default(0),
      isHerd: z.boolean().default(false),
      herdSize: z.number().int().min(1).optional(),
    });

    const {
      speciesId,
      symptomIds,
      county,
      latitude,
      longitude,
      animalsAffected,
      animalsDead,
      isHerd,
      herdSize,
    } = schema.parse(req.body);

    const report = await prisma.report.create({
      data: {
        speciesId,
        county,
        latitude,
        longitude,
        animalsAffected,
        animalsDead,
        isHerd,
        herdSize,
        isSimulated: false,
        symptoms: {
          create: symptomIds.map((sid) => ({ symptomId: sid })),
        },
      },
    });

    res.status(201).json({ id: report.id, createdAt: report.createdAt });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/clusters?days=&speciesId=
router.get('/clusters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      days: z.coerce.number().int().min(1).max(365).default(30),
      speciesId: z.coerce.number().int().positive().optional(),
    });

    const { days, speciesId } = schema.parse(req.query);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const reports = await prisma.report.findMany({
      where: {
        createdAt: { gte: since },
        ...(speciesId ? { speciesId } : {}),
      },
      include: {
        species: { select: { slug: true, name: true } },
        symptoms: {
          include: { symptom: { select: { nameEn: true, key: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by county (or round lat/lng to ~10km grid for map clusters)
    const clusterMap = new Map<
      string,
      {
        county: string | null;
        latitude: number | null;
        longitude: number | null;
        reportCount: number;
        animalsAffected: number;
        animalsDead: number;
        species: { slug: string; name: string }[];
        symptoms: { key: string; nameEn: string; count: number }[];
        isSimulated: boolean;
      }
    >();

    for (const report of reports) {
      // Cluster key: county name OR rounded coordinates
      let clusterKey: string;
      let lat: number | null = null;
      let lng: number | null = null;

      if (report.county) {
        clusterKey = report.county.toLowerCase();
      } else if (report.latitude && report.longitude) {
        const rLat = Math.round(report.latitude.toNumber() / 0.1) * 0.1;
        const rLng = Math.round(report.longitude.toNumber() / 0.1) * 0.1;
        lat = rLat;
        lng = rLng;
        clusterKey = `${rLat},${rLng}`;
      } else {
        clusterKey = 'unknown';
      }

      const existing = clusterMap.get(clusterKey);

      if (!existing) {
        clusterMap.set(clusterKey, {
          county: report.county,
          latitude: lat ?? (report.latitude ? report.latitude.toNumber() : null),
          longitude: lng ?? (report.longitude ? report.longitude.toNumber() : null),
          reportCount: 1,
          animalsAffected: report.animalsAffected,
          animalsDead: report.animalsDead,
          species: [report.species],
          symptoms: report.symptoms.map((rs) => ({ key: rs.symptom.key, nameEn: rs.symptom.nameEn, count: 1 })),
          isSimulated: report.isSimulated,
        });
      } else {
        existing.reportCount++;
        existing.animalsAffected += report.animalsAffected;
        existing.animalsDead += report.animalsDead;

        // Merge species
        if (!existing.species.find((s) => s.slug === report.species.slug)) {
          existing.species.push(report.species);
        }

        // Merge symptoms with counts
        for (const rs of report.symptoms) {
          const sym = existing.symptoms.find((s) => s.key === rs.symptom.key);
          if (sym) sym.count++;
          else existing.symptoms.push({ key: rs.symptom.key, nameEn: rs.symptom.nameEn, count: 1 });
        }

        // Mark as mixed if any real reports are in a simulated cluster
        if (!report.isSimulated) existing.isSimulated = false;
      }
    }

    const clusters = [...clusterMap.values()].map((c) => ({
      ...c,
      symptoms: c.symptoms.sort((a, b) => b.count - a.count),
    }));

    res.json({ days, total: reports.length, clusters });
  } catch (err) {
    next(err);
  }
});

export default router;
