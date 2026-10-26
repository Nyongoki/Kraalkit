import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

// GET /api/vets/nearest?lat=&lng=&speciesId=&limit=&includeUnverified=
router.get('/nearest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      speciesId: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(20).default(5),
      includeUnverified: z.enum(['true', 'false']).default('false'),
    });

    const { lat, lng, speciesId, limit, includeUnverified } = schema.parse(req.query);
    const onlyVerified = includeUnverified !== 'true';

    // Get vet ids that serve this species
    let vetIdFilter: number[] | undefined;
    if (speciesId) {
      const links = await prisma.vetSpecies.findMany({
        where: { speciesId },
        select: { vetId: true },
      });
      vetIdFilter = links.map((l) => l.vetId);
      if (vetIdFilter.length === 0) {
        return res.json([]);
      }
    }

    // Use ST_Distance_Sphere for distance calculation (MySQL 5.7+)
    // Returns distance in meters, convert to km
    type VetRow = {
      id: number;
      name: string;
      type: string;
      verified: number;
      phone: string | null;
      county: string | null;
      latitude: number;
      longitude: number;
      distanceKm: number;
    };

    let rows: VetRow[];

    if (vetIdFilter !== undefined) {
      const verifiedCondition = onlyVerified ? Prisma.sql`AND v.verified = 1` : Prisma.empty;
      rows = await prisma.$queryRaw<VetRow[]>`
        SELECT
          v.id, v.name, v.type, v.verified, v.phone, v.county,
          CAST(v.latitude AS DOUBLE) as latitude,
          CAST(v.longitude AS DOUBLE) as longitude,
          ST_Distance_Sphere(POINT(v.longitude, v.latitude), POINT(${lng}, ${lat})) / 1000 as distanceKm
        FROM Vet v
        WHERE v.id IN (${Prisma.join(vetIdFilter)})
          ${verifiedCondition}
        ORDER BY distanceKm ASC
        LIMIT ${limit}
      `;
    } else {
      const whereClause = onlyVerified ? Prisma.sql`WHERE v.verified = 1` : Prisma.empty;
      rows = await prisma.$queryRaw<VetRow[]>`
        SELECT
          v.id, v.name, v.type, v.verified, v.phone, v.county,
          CAST(v.latitude AS DOUBLE) as latitude,
          CAST(v.longitude AS DOUBLE) as longitude,
          ST_Distance_Sphere(POINT(v.longitude, v.latitude), POINT(${lng}, ${lat})) / 1000 as distanceKm
        FROM Vet v
        ${whereClause}
        ORDER BY distanceKm ASC
        LIMIT ${limit}
      `;
    }

    // Load species served for each vet
    const vetIds = rows.map((r) => r.id);
    const speciesLinks = await prisma.vetSpecies.findMany({
      where: { vetId: { in: vetIds } },
      include: { species: { select: { slug: true, name: true } } },
    });

    const speciesByVet = new Map<number, { slug: string; name: string }[]>();
    for (const link of speciesLinks) {
      const arr = speciesByVet.get(link.vetId) ?? [];
      arr.push(link.species);
      speciesByVet.set(link.vetId, arr);
    }

    const result = rows.map((v) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      verified: Boolean(v.verified),
      phone: v.phone,
      county: v.county,
      latitude: v.latitude,
      longitude: v.longitude,
      distanceKm: Math.round(v.distanceKm * 10) / 10,
      speciesServed: speciesByVet.get(v.id) ?? [],
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
