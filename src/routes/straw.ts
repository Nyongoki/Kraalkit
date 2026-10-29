import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { decodeStrawText, reconcileWithReceipt } from '../lib/strawDecoder';
import { aiDecodeStrawText } from '../lib/strawAiDecoder';
import { requireAuth, requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth';
import {
  ProductType,
  Confidence,
  EventStatus,
  PregnancyResult,
  CalfSex,
  FlagType,
  Severity,
  RuleField,
  ProviderType,
} from '@prisma/client';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Helper to generate unique reference numbers: REF-YYYY-XXXX
function generateReferenceNo(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `REF-${year}-${random}${letter}`;
}

// Helper to safely parse string params in Express 5
function parseId(param: string | string[]): number {
  const str = Array.isArray(param) ? param[0] : param;
  return parseInt(str, 10);
}

// ==========================================
// 1. POST /api/decode & /api/straw/decode (Open to everyone, with optional authenticated farmer context)
// ==========================================
const decodeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      rawText: z.string().min(1, 'Straw text is required'),
      county: z.string().optional(),
    });

    const { rawText, county } = schema.parse(req.body);

    const result = await decodeStrawText(
      rawText,
      county || req.user?.county || null,
      req.farmer?.id || req.user?.id || null
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

router.post('/decode', optionalAuth, decodeHandler);
router.post('/straw/decode', optionalAuth, decodeHandler);

// ==========================================
// 1a. POST /api/straw/ai-decode & /api/ai-decode
// Intelligent LLM-assisted straw completion
// ==========================================
const aiDecodeHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      rawText: z.string().min(1, 'Straw text is required'),
      county: z.string().optional(),
      currentDecoded: z.any().optional(),
    });

    const { rawText, county, currentDecoded } = schema.parse(req.body);

    const result = await aiDecodeStrawText(
      rawText,
      currentDecoded,
      county || req.user?.county || null
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

router.post('/straw/ai-decode', optionalAuth, aiDecodeHandler);
router.post('/ai-decode', optionalAuth, aiDecodeHandler);

// ==========================================
// 1b. POST /api/straw/reconcile & /api/reconcile
// Post-Insemination Straw vs Receipt Audit (Open to all farmers)
// ==========================================
const reconcileHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      rawText: z.string().min(1, 'Straw text is required'),
      county: z.string().optional(),
      receipt: z.object({
        cowName: z.string().optional(),
        cowTag: z.string().optional(),
        receiptBreed: z.string().optional(),
        receiptBull: z.string().optional(),
        receiptProductType: z.string().optional(),
        receiptTechnician: z.string().optional(),
        pricePaidKsh: z.number().optional(),
      }),
    });

    const { rawText, county, receipt } = schema.parse(req.body);

    const decoded = await decodeStrawText(
      rawText,
      county || req.user?.county || null,
      req.farmer?.id || req.user?.id || null
    );

    const reconciliation = reconcileWithReceipt(decoded, receipt);

    res.json({
      decoded,
      reconciliation,
    });
  } catch (err) {
    next(err);
  }
};

router.post('/straw/reconcile', reconcileHandler);
router.post('/reconcile', reconcileHandler);

// ==========================================
// 2. FARMER AUTHENTICATION (Phone + PIN)
// ==========================================

// In-memory OTP store for demo / prototype SMS verification
const otpStore = new Map<string, { code: string; expires: number }>();

// POST /api/auth/farmer/request-code
router.post('/auth/farmer/request-code', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      phone: z.string().min(9, 'Valid phone number required'),
    });

    const { phone } = schema.parse(req.body);
    const normalizedPhone = phone.replace(/\s+/g, '');

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(normalizedPhone, {
      code,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // In production, send via Africa's Talking / Twilio SMS gateway
    console.log(`📱 SMS OTP for ${normalizedPhone}: ${code}`);

    res.json({
      success: true,
      message: `Verification code sent to ${normalizedPhone}`,
      demoCode: code, // Provided for smooth testing
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/farmer/verify (Sign up or Reset PIN)
router.post('/auth/farmer/verify', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      phone: z.string().min(9),
      code: z.string().min(4),
      pin: z.string().min(4, 'PIN must be at least 4 digits'),
      name: z.string().optional(),
      county: z.string().optional(),
    });

    const { phone, code, pin, name, county } = schema.parse(req.body);
    const normalizedPhone = phone.replace(/\s+/g, '');

    const record = otpStore.get(normalizedPhone);
    if (!record || record.code !== code || record.expires < Date.now()) {
      // Allow fallback demo code '123456' for ease of testing
      if (code !== '123456') {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }
    }

    const pinHash = await bcrypt.hash(pin, 10);

    const farmer = await prisma.farmer.upsert({
      where: { phone: normalizedPhone },
      update: {
        pinHash,
        phoneVerified: true,
        lastLoginAt: new Date(),
        name: name || undefined,
        county: county || undefined,
      },
      create: {
        phone: normalizedPhone,
        name: name || 'Smallholder Farmer',
        pinHash,
        phoneVerified: true,
        county: county || 'Kiambu',
        lastLoginAt: new Date(),
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { farmerId: farmer.id, phone: farmer.phone, role: farmer.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      farmer: {
        id: farmer.id,
        phone: farmer.phone,
        name: farmer.name,
        county: farmer.county,
        role: farmer.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/farmer/login
router.post('/auth/farmer/login', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      phone: z.string().min(9),
      pin: z.string().min(4),
    });

    const { phone, pin } = schema.parse(req.body);
    const normalizedPhone = phone.replace(/\s+/g, '');

    const farmer = await prisma.farmer.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!farmer || !farmer.pinHash) {
      return res.status(401).json({ error: 'Account not found. Please request an SMS code to register.' });
    }

    const match = await bcrypt.compare(pin, farmer.pinHash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    await prisma.farmer.update({
      where: { id: farmer.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { farmerId: farmer.id, phone: farmer.phone, role: farmer.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      farmer: {
        id: farmer.id,
        phone: farmer.phone,
        name: farmer.name,
        county: farmer.county,
        role: farmer.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. INSEMINATION EVENTS (Signed-in Farmers)
// ==========================================

// POST /api/events (Save Insemination Event)
router.post('/events', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      rawText: z.string().min(1),
      decoded: z.any(),
      confidence: z.nativeEnum(Confidence).default(Confidence.NONE),
      cowName: z.string().nullish(),
      cowTag: z.string().nullish(),
      breedId: z.number().int().nullish(),
      supplierId: z.number().int().nullish(),
      bullId: z.number().int().nullish(),
      batchId: z.number().int().nullish(),
      productType: z.nativeEnum(ProductType).default(ProductType.UNKNOWN),
      technicianId: z.number().int().nullish(),
      providerId: z.number().int().nullish(),
      priceKsh: z.number().nullish(),
      eventDate: z.string().nullish(),
      county: z.string().nullish(),
      latitude: z.number().nullish(),
      longitude: z.number().nullish(),
    });

    const data = schema.parse(req.body);
    const farmerId = req.farmer?.id;
    if (!farmerId) {
      return res.status(401).json({ error: 'Farmer profile not found for this account' });
    }

    // Attach or create Cow if name or tag is provided
    let cowId: number | undefined;
    if (data.cowName || data.cowTag) {
      const cow = await prisma.cow.create({
        data: {
          farmerId,
          name: data.cowName || 'Milking Cow',
          tagNo: data.cowTag || undefined,
          breedId: data.breedId || undefined,
        },
      });
      cowId = cow.id;
    }

    const referenceNo = generateReferenceNo();

    // Create Insemination Event
    const event = await prisma.inseminationEvent.create({
      data: {
        referenceNo,
        farmerId,
        cowId,
        rawText: data.rawText,
        decoded: data.decoded,
        confidence: data.confidence,
        breedId: data.breedId || undefined,
        supplierId: data.supplierId || undefined,
        bullId: data.bullId || undefined,
        batchId: data.batchId || undefined,
        productType: data.productType,
        technicianId: data.technicianId || undefined,
        providerId: data.providerId || undefined,
        priceKsh: data.priceKsh !== null && data.priceKsh !== undefined ? data.priceKsh : null,
        eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
        county: data.county || req.farmer?.county || null,
        latitude: data.latitude !== null && data.latitude !== undefined ? data.latitude : null,
        longitude: data.longitude !== null && data.longitude !== undefined ? data.longitude : null,
        status: EventStatus.DRAFT,
      },
      include: {
        cow: true,
        breed: true,
        supplier: true,
        bull: true,
        technician: true,
        provider: true,
      },
    });

    // Automated Fraud Check 1: Price Above Benchmark
    if (data.priceKsh && data.productType !== ProductType.UNKNOWN) {
      const benchmark = await prisma.priceBenchmark.findFirst({
        where: { productType: data.productType },
      });
      if (benchmark && Number(data.priceKsh) > Number(benchmark.maxKsh)) {
        await prisma.fraudFlag.create({
          data: {
            type: FlagType.PRICE_HIGH,
            severity: Severity.MEDIUM,
            eventId: event.id,
            providerId: data.technicianId || data.providerId || null,
            details: `Price paid of KSh ${data.priceKsh} exceeds top benchmark of KSh ${benchmark.maxKsh} for ${data.productType}. Source: ${benchmark.source}`,
          },
        });
      }
    }

    // Automated Fraud Check 2: Duplicate Straw Registered Across Other Farms
    const cleanedRaw = data.rawText.trim();
    const otherEvents = await prisma.inseminationEvent.findMany({
      where: {
        farmerId: { not: farmerId },
      },
      include: {
        cow: true,
        farmer: { select: { county: true } },
      },
    });

    const existingOtherEvent = otherEvents.find(
      (evt) => evt.rawText && evt.rawText.trim().toLowerCase() === cleanedRaw.toLowerCase()
    );

    let duplicateWarning: string | null = null;
    if (existingOtherEvent) {
      const priorDate = existingOtherEvent.eventDate
        ? new Date(existingOtherEvent.eventDate).toISOString().split('T')[0]
        : 'earlier';
      const priorCow = existingOtherEvent.cow?.name ? `cow "${existingOtherEvent.cow.name}"` : 'a cow';
      const priorTag = existingOtherEvent.cow?.tagNo ? ` (Ear Tag: ${existingOtherEvent.cow.tagNo})` : '';
      const priorCounty = existingOtherEvent.county || existingOtherEvent.farmer?.county || 'Kenya';

      duplicateWarning = `⚠️ Duplicate Straw Flagged: This physical straw tube was previously recorded by another farm on ${priorCow}${priorTag} in ${priorCounty} on ${priorDate}. A fraud flag has been filed for KVB inspection.`;

      await prisma.fraudFlag.create({
        data: {
          type: FlagType.HIGH_QUERY_COUNT,
          severity: Severity.HIGH,
          eventId: event.id,
          providerId: data.technicianId || data.providerId || null,
          details: `Duplicate straw registered: Tube previously registered under reference ${existingOtherEvent.referenceNo} for ${priorCow}${priorTag} in ${priorCounty} on ${priorDate}. Single straws cannot be reused.`,
        },
      });
    }

    res.status(201).json({
      ...event,
      duplicateWarning,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/events (List Farmer's own records)
router.get('/events', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const farmerId = req.farmer?.id;
    if (!farmerId) {
      return res.json([]);
    }
    const events = await prisma.inseminationEvent.findMany({
      where: { farmerId },
      include: {
        cow: true,
        breed: true,
        supplier: true,
        bull: true,
        technician: true,
        provider: true,
        outcome: true,
        flags: {
          where: { resolved: false },
          select: { id: true, type: true, severity: true, details: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(events);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id (Single Event Details)
router.get('/events/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const event = await prisma.inseminationEvent.findUnique({
      where: { id },
      include: {
        cow: true,
        breed: true,
        supplier: true,
        bull: true,
        technician: true,
        provider: true,
        outcome: true,
        flags: true,
      },
    });

    if (!event) return res.status(404).json({ error: 'Insemination event not found' });

    // Check ownership or admin
    if (event.farmerId !== req.farmer?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(event);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/events/:id (Update cow or price details)
router.patch('/events/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const schema = z.object({
      cowName: z.string().optional(),
      cowTag: z.string().optional(),
      priceKsh: z.number().optional(),
    });

    const data = schema.parse(req.body);

    const event = await prisma.inseminationEvent.findUnique({
      where: { id },
      include: { cow: true },
    });

    if (!event) return res.status(404).json({ error: 'Insemination event not found' });
    if (event.farmerId !== req.farmer?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (event.cowId && (data.cowName || data.cowTag)) {
      await prisma.cow.update({
        where: { id: event.cowId },
        data: {
          name: data.cowName || undefined,
          tagNo: data.cowTag || undefined,
        },
      });
    }

    const updated = await prisma.inseminationEvent.update({
      where: { id },
      data: {
        priceKsh: data.priceKsh !== undefined ? data.priceKsh : undefined,
      },
      include: {
        cow: true,
        breed: true,
        supplier: true,
        bull: true,
        technician: true,
        provider: true,
        outcome: true,
        flags: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. WHATSAPP CLICK-TO-CHAT DISPATCH
// ==========================================

// POST /api/events/:id/send (Prepare WhatsApp Message & URL)
router.post('/events/:id/send', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const event = await prisma.inseminationEvent.findUnique({
      where: { id },
      include: {
        breed: true,
        supplier: true,
        bull: true,
        technician: true,
        provider: true,
      },
    });

    if (!event) return res.status(404).json({ error: 'Insemination event not found' });
    if (event.farmerId !== req.farmer?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine target provider for verification
    let targetProvider = event.provider || event.technician;
    if (!targetProvider && event.supplierId) {
      targetProvider = await prisma.provider.findFirst({
        where: { supplierId: event.supplierId, whatsappNumber: { not: null } },
      });
    }

    // Default national helpline provider if none found
    const targetWhatsapp = targetProvider?.whatsappNumber || '254711223344';
    const cleanDigits = targetWhatsapp.replace(/[^0-9]/g, '');

    // Decoded fields summary
    const decodedAny = event.decoded as any;
    const batchText = decodedAny?.batchOrSerial?.value || 'N/A';
    const breedText = event.breed?.name || decodedAny?.breed?.meaning || 'Unknown Breed';
    const supplierText = event.supplier?.name || decodedAny?.supplier?.meaning || 'Unknown Supplier';
    const bullText = event.bull?.name || decodedAny?.bull?.meaning || 'Unknown Bull';
    const productTypeText = event.productType || decodedAny?.productType?.meaning || 'Unverified';
    const eventDateText = event.eventDate.toISOString().split('T')[0];
    const priceText = event.priceKsh ? Number(event.priceKsh).toLocaleString() : 'Not recorded';

    // Format message according to Section "Message template" in Guide:
    const messageLines = [
      `Straw check, ref ${event.referenceNo}`,
      `Breed: ${breedText}`,
      `Supplier: ${supplierText}`,
      `Bull: ${bullText}`,
      `Batch/serial: ${batchText}`,
      `Marked as: ${productTypeText}`,
      `Date: ${eventDateText}`,
      `Price paid: KSh ${priceText}`,
      `Typed text: ${event.rawText}`,
      `Please confirm if this matches your records.`,
    ];

    const messageText = messageLines.join('\n');
    const whatsappUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageText)}`;

    // Update status to SENT
    const updated = await prisma.inseminationEvent.update({
      where: { id: event.id },
      data: {
        status: EventStatus.SENT,
        sentAt: new Date(),
        providerId: targetProvider?.id || event.providerId,
      },
      include: { provider: true, technician: true },
    });

    res.json({
      whatsappUrl,
      messageText,
      targetPhone: cleanDigits,
      event: updated,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/events/:id/status (Record provider's reply)
router.patch('/events/:id/status', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const schema = z.object({
      status: z.nativeEnum(EventStatus),
      notes: z.string().optional(),
    });

    const { status, notes } = schema.parse(req.body);

    const event = await prisma.inseminationEvent.findUnique({
      where: { id },
      include: { technician: true, batch: true },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.farmerId !== req.farmer?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.inseminationEvent.update({
      where: { id },
      data: {
        status,
        respondedAt: new Date(),
      },
    });

    // Automated Fraud Check 2: Provider Replies NOT_RECOGNISED
    if (status === EventStatus.NOT_RECOGNISED) {
      await prisma.fraudFlag.create({
        data: {
          type: FlagType.NOT_RECOGNISED,
          severity: Severity.HIGH,
          eventId: event.id,
          providerId: event.technicianId || null,
          batchId: event.batchId || null,
          details: `Provider officially rejected straw reference ${event.referenceNo} as NOT RECOGNISED. Possible counterfeit straw or unregistered technician batch. Notes: ${notes || 'No extra notes'}`,
        },
      });

      // Automated Fraud Check 4: Check if technician has >= 3 complaints in 90 days
      if (event.technicianId) {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const technicianComplaints = await prisma.fraudFlag.count({
          where: {
            providerId: event.technicianId,
            createdAt: { gte: ninetyDaysAgo },
          },
        });

        if (technicianComplaints >= 3) {
          await prisma.fraudFlag.create({
            data: {
              type: FlagType.PROVIDER_COMPLAINT,
              severity: Severity.HIGH,
              providerId: event.technicianId,
              details: `Technician #${event.technicianId} has accrued ${technicianComplaints} fraud/rejection flags in the last 90 days. Flagged for internal veterinary board review.`,
            },
          });
        }
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. CALVING OUTCOME & SEX-RATIO AUDIT
// ==========================================

// POST /api/events/:id/outcome (Record pregnancy & calf sex)
router.post('/events/:id/outcome', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const schema = z.object({
      pregnancy: z.nativeEnum(PregnancyResult).default(PregnancyResult.UNKNOWN),
      checkedAt: z.string().optional(),
      calfSex: z.nativeEnum(CalfSex).optional(),
      birthDate: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const event = await prisma.inseminationEvent.findUnique({
      where: { id },
      include: { outcome: true, batch: true },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.farmerId !== req.farmer?.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const outcome = await prisma.outcome.upsert({
      where: { eventId: id },
      update: {
        pregnancy: data.pregnancy,
        checkedAt: data.checkedAt ? new Date(data.checkedAt) : undefined,
        calfSex: data.calfSex,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
      create: {
        eventId: id,
        pregnancy: data.pregnancy,
        checkedAt: data.checkedAt ? new Date(data.checkedAt) : new Date(),
        calfSex: data.calfSex,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });

    // Automated Fraud Check 5: Sex-Ratio Audit
    // If this was marked as sexed female, check overall sex ratio for this batch or technician
    if (data.calfSex && event.productType === ProductType.SEXED_FEMALE && event.technicianId) {
      const recordedCalvings = await prisma.inseminationEvent.findMany({
        where: {
          technicianId: event.technicianId,
          productType: ProductType.SEXED_FEMALE,
          outcome: { calfSex: { in: [CalfSex.FEMALE, CalfSex.MALE] } },
        },
        include: { outcome: true },
      });

      if (recordedCalvings.length >= 20) {
        const femaleCount = recordedCalvings.filter(
          (c) => c.outcome?.calfSex === CalfSex.FEMALE
        ).length;
        const femaleRatio = femaleCount / recordedCalvings.length;

        // If female calf share is below 75% for sexed semen (expected >90%)
        if (femaleRatio < 0.75) {
          await prisma.fraudFlag.create({
            data: {
              type: FlagType.SEX_RATIO,
              severity: Severity.HIGH,
              providerId: event.technicianId,
              details: `Sex-ratio anomaly: Technician #${event.technicianId} has recorded only ${(femaleRatio * 100).toFixed(1)}% female calves (${femaleCount}/${recordedCalvings.length}) from purported SEXED FEMALE semen. Sub-threshold indicates conventional semen substitution.`,
            },
          });
        }
      }
    }

    res.json(outcome);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. PROVIDERS & BENCHMARKS DIRECTORY
// ==========================================

// GET /api/providers (List verified suppliers & AI technicians)
router.get('/providers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { supplierId, county, type } = req.query;

    const where: any = {};
    if (supplierId) where.supplierId = parseInt(supplierId as string, 10);
    if (county) where.county = county as string;
    if (type) where.type = type as ProviderType;

    const providers = await prisma.provider.findMany({
      where,
      include: { supplier: true },
      orderBy: { registered: 'desc' },
    });

    res.json(providers);
  } catch (err) {
    next(err);
  }
});

// GET /api/benchmarks (Official Price Benchmarks)
router.get('/benchmarks', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const benchmarks = await prisma.priceBenchmark.findMany({
      orderBy: { productType: 'asc' },
    });
    res.json(benchmarks);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. ADMIN FRAUD FLAGS & DECODING RULES
// ==========================================

// GET /api/admin/flags (Review fraud flags)
router.get('/admin/flags', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flags = await prisma.fraudFlag.findMany({
      include: {
        event: {
          include: { cow: true, breed: true, supplier: true, bull: true },
        },
        provider: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(flags);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/flags/:id (Resolve fraud flag)
router.patch('/admin/flags/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    const schema = z.object({
      resolved: z.boolean(),
      note: z.string().optional(),
    });

    const { resolved, note } = schema.parse(req.body);

    const flag = await prisma.fraudFlag.update({
      where: { id },
      data: {
        resolved,
        details: note ? { set: undefined } : undefined, // keep existing details
      },
    });

    res.json(flag);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rules (Add/edit decoding label rule)
router.post('/admin/rules', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      field: z.nativeEnum(RuleField),
      pattern: z.string().min(1),
      meaning: z.string().min(1),
      productType: z.nativeEnum(ProductType).optional(),
      supplierId: z.number().int().optional(),
      notes: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const rule = await prisma.labelRule.create({ data });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

export default router;
