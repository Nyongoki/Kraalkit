import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  buildAllowedNumbersSet,
  validateCopilotOutput,
  CopilotModelOutput,
} from '../lib/copilotGuardrails';
import {
  generateCacheKey,
  getCachedExplanation,
  setCachedExplanation,
  getGoldenTupleMatch,
  CopilotFullResponse,
} from '../lib/copilotCache';

const router = Router();

// IP Rate Limiter (Max 20 requests per minute per IP)
const ipRateLimits = new Map<string, { count: number; resetTime: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRateLimits.get(ip);
  if (!record || now > record.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + 60_000 });
    return false;
  }
  if (record.count >= 20) {
    return true;
  }
  record.count++;
  return false;
}

const explainSchema = z.object({
  speciesId: z.number().int().positive(),
  language: z.enum(['en', 'sw']).default('en'),
  conditionId: z.number().int().positive(),
  herd: z.object({
    total: z.number().int().min(1),
    sick: z.number().int().min(1),
    dead: z.number().int().min(0).default(0),
  }),
  symptoms: z
    .array(
      z.object({
        symptomId: z.number().int().positive(),
        count: z.number().int().min(1).optional(),
      })
    )
    .min(1)
    .max(25),
});

const SYSTEM_PROMPT = `You help smallholder livestock farmers in Kenya understand a symptom check result.
You are not a veterinarian and you must not diagnose.

Write the answer in the language requested ("sw" = Kiswahili, "en" = English) using short, simple sentences.

Return ONLY valid JSON with exactly two keys:
- "whyRankedFirst": 2 to 3 sentences explaining which reported symptoms match the top condition and how many animals are affected.
- "questionsForVet": an array of exactly 3 short questions the farmer can ask the vet.

Rules:
1. The "whyRankedFirst" explanation may only refer to the reported symptoms, how many of the key signs match, and the animal counts. Do not claim the cause is infectious or non-infectious, and do not compare against injury or other causes.
2. Never say the animal has the disease. Use wording like "the signs are consistent with" or "the pattern fits".
3. Never give a probability or percentage.
4. Never recommend any treatment, drug, medicine, or dose.
5. Add no numbers, distances, or times that are not in the input.`;

// POST /api/copilot/explain (Restricted to authenticated users)
router.post('/explain', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  let cacheKeyHash = '';
  let source: 'ai' | 'fallback' = 'fallback';

  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    const parseResult = explainSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input parameters', details: parseResult.error.format() });
    }

    const { speciesId, language, conditionId, herd, symptoms } = parseResult.data;

    // Validate counts logic
    if (herd.sick > herd.total || herd.dead > herd.total) {
      return res.status(400).json({ error: 'Sick and dead counts cannot exceed herd total.' });
    }

    // 1. Rebuild vetted input on the server from the database
    const [species, topCondition, dsLinks, allSymptoms] = await Promise.all([
      prisma.species.findUnique({ where: { id: speciesId } }),
      prisma.disease.findUnique({ where: { id: conditionId } }),
      prisma.diseaseSymptom.findMany({ where: { diseaseId: conditionId } }),
      prisma.symptom.findMany({
        where: { id: { in: symptoms.map((s) => s.symptomId) } },
        include: { terms: { where: { status: 'CONFIRMED' } } },
      }),
    ]);

    if (!species || !topCondition) {
      return res.status(404).json({ error: 'Species or condition not found.' });
    }

    // Special safety rule: Anthrax and Blackleg have firstAid === null or reviewed === false
    // If condition has no reviewed first-aid or firstAid is null, return see-a-vet only
    const hasVettedFirstAid = Boolean(topCondition.firstAid && topCondition.firstAid.trim().length > 0 && topCondition.reviewed);

    const conditionName = language === 'sw' && topCondition.nameSw ? topCondition.nameSw : topCondition.name;
    const totalKeySigns = dsLinks.length;
    const keySymptomIds = new Set(dsLinks.map((ds) => ds.symptomId));
    const matchedKeySigns = symptoms.filter((s) => keySymptomIds.has(s.symptomId)).length;

    // Build symptom names and affected counts
    const reportedSymptoms = symptoms.map((s) => {
      const sym = allSymptoms.find((item) => item.id === s.symptomId);
      const name = sym ? sym.nameEn : `Sign #${s.symptomId}`;
      const animalsAffected = s.count !== undefined ? s.count : herd.sick;
      return { symptomId: s.symptomId, name, animalsAffected };
    });

    // Check other conditions for context
    const otherDiseaseLinks = await prisma.diseaseSpecies.findMany({
      where: { speciesId, diseaseId: { not: conditionId } },
      take: 2,
    });
    const otherDiseaseIds = otherDiseaseLinks.map((od) => od.diseaseId);
    const otherDiseases = await prisma.disease.findMany({
      where: { id: { in: otherDiseaseIds } },
    });
    const otherDsLinks = await prisma.diseaseSymptom.findMany({
      where: { diseaseId: { in: otherDiseaseIds } },
    });

    const otherConditions = otherDiseases.map((od) => {
      const odKeyIds = new Set(otherDsLinks.filter((l) => l.diseaseId === od.id).map((l) => l.symptomId));
      const matched = symptoms.filter((s) => odKeyIds.has(s.symptomId)).length;
      return {
        name: language === 'sw' && od.nameSw ? od.nameSw : od.name,
        matchedKeySigns: matched,
        totalKeySigns: odKeyIds.size,
      };
    });

    // 2. Allowed numbers set for guardrail check
    const allowedNumbers = buildAllowedNumbersSet({
      total: herd.total,
      sick: herd.sick,
      dead: herd.dead,
      symptomCounts: reportedSymptoms.map((rs) => rs.animalsAffected),
      matchedKeySigns,
      totalKeySigns,
    });

    // 3. Cache key computation
    const promptVersion = 'v1.0';
    const modelName = process.env.RAX_MODEL || 'rax-4.0';
    const firstAidVersion = topCondition.firstAidVersion || 1;

    cacheKeyHash = generateCacheKey({
      promptVersion,
      modelName,
      speciesId,
      conditionId,
      language,
      total: herd.total,
      sick: herd.sick,
      dead: herd.dead,
      symptomPairs: reportedSymptoms.map((rs) => ({ symptomId: rs.symptomId, count: rs.animalsAffected })),
      firstAidVersion,
    });

    // Check memory cache
    let modelOutput: CopilotModelOutput | undefined = getCachedExplanation(cacheKeyHash);
    if (modelOutput) {
      source = 'ai';
    }

    // Check golden tuple cache if exact hash missed
    if (!modelOutput) {
      const golden = getGoldenTupleMatch({
        speciesId,
        conditionId,
        language,
        total: herd.total,
        sick: herd.sick,
      });
      if (golden) {
        modelOutput = golden;
        source = 'ai';
      }
    }

    // 4. Call Model if AI_ENABLED and not cached
    const isAiEnabled = process.env.AI_ENABLED !== 'false' && Boolean(process.env.RAX_API_KEY);

    if (!modelOutput && isAiEnabled) {
      try {
        const inputPayload = {
          language,
          species: species.name,
          herd: {
            total: herd.total,
            sick: herd.sick,
            dead: herd.dead,
          },
          reportedSymptoms: reportedSymptoms.map((rs) => ({
            name: rs.name,
            animalsAffected: rs.animalsAffected,
          })),
          topCondition: {
            name: conditionName,
            matchedKeySigns,
            totalKeySigns,
            urgency: topCondition.urgency,
            notifiable: topCondition.notifiable,
          },
          otherConditions,
        };

        const raxApiKey = process.env.RAX_API_KEY || '';
        const raxBaseUrl = process.env.RAX_BASE_URL || 'https://api.rax.ai/v1';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second strict timeout

        const response = await fetch(`${raxBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${raxApiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(inputPayload) },
            ],
            temperature: 0.2,
            max_tokens: 450,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const rawContent = data.choices?.[0]?.message?.content || '';

          // Clean markdown code blocks if any
          const cleanJsonStr = rawContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, '$1').trim();
          const parsed = JSON.parse(cleanJsonStr);

          // 5. Strict Guardrail Verification
          const guardrailResult = validateCopilotOutput(parsed, allowedNumbers);
          if (guardrailResult.isValid) {
            modelOutput = parsed as CopilotModelOutput;
            source = 'ai';
            setCachedExplanation(cacheKeyHash, modelOutput);
          } else {
            console.warn(`[Guardrail Rejection]: ${guardrailResult.reason}. Using fallback.`);
          }
        } else {
          console.warn(`RAX AI returned HTTP ${response.status}`);
        }
      } catch (callErr: unknown) {
        console.warn('[Copilot Model Error / Timeout]:', (callErr as Error).message || callErr);
      }
    }

    // 6. Assemble Fallback if model output is not available
    if (!modelOutput) {
      source = 'fallback';
      if (language === 'sw') {
        modelOutput = {
          whyRankedFirst: `Kulingana na dalili zilizoripotiwa, dalili ${matchedKeySigns} kati ya ${totalKeySigns} zinalingana na ${conditionName}. Wanyama ${herd.sick} kati ya ${herd.total} wameathirika.`,
          questionsForVet: [
            `Je, unaweza kuwakagua wanyama ${herd.sick} walioathirika ili kuthibitisha kama huu ni ${conditionName}?`,
            `Ni hatua gani tuchukue kuwatenga wagonjwa na kuwalinda wanyama ${Math.max(herd.total - herd.sick, 0)} waliobaki?`,
            'Ni tahadhari zipi za haraka za usafi wa banda na vifaa tunazopaswa kufuata mara moja?',
          ],
        };
      } else {
        modelOutput = {
          whyRankedFirst: `Based on the reported symptoms, ${matchedKeySigns} of ${totalKeySigns} key signs match ${topCondition.name}. ${herd.sick} of ${herd.total} animals are affected.`,
          questionsForVet: [
            `Can you examine the ${herd.sick} affected animals to evaluate if this fits ${topCondition.name}?`,
            `How should we isolate the sick animals and protect the remaining ${Math.max(herd.total - herd.sick, 0)} healthy animals?`,
            'What biosecurity precautions should we maintain for equipment and farm movement while awaiting full examination?',
          ],
        };
      }
    }

    // 7. Assemble "What to do now" (strictly verbatim from database firstAid)
    let whatToDoNow: string[] = [];
    if (hasVettedFirstAid && topCondition.firstAid) {
      const dbFirstAidText = language === 'sw' && topCondition.firstAidSw ? topCondition.firstAidSw : topCondition.firstAid;
      // Split into sentence steps
      whatToDoNow = dbFirstAidText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    // 8. Fixed fields added in code
    const seeVetNotice =
      language === 'sw'
        ? 'Tafadhali mwone daktari wa mifugo aliyehitimu akague wanyama wako haraka iwezekanavyo.'
        : 'Please have a qualified veterinarian examine your animals promptly.';

    const disclaimer =
      language === 'sw'
        ? 'Hali inayowezekana, si uchunguzi wa mwisho. Muone daktari wa mifugo kabla ya kutoa matibabu yoyote.'
        : 'Possible condition, not a diagnosis. Always consult a qualified veterinarian before administering treatments.';

    let reportNotice: string | null = null;
    if (topCondition.notifiable) {
      reportNotice =
        language === 'sw'
          ? 'Huu ni ugonjwa unaopaswa kuripotiwa kisheria. Toa taarifa kwa Afisa wa Mifugo wa Kaunti Ndogo mara moja.'
          : 'This is a notifiable disease under national regulations. Report this suspected case to your Sub-County Veterinary Officer immediately.';
    }

    const durationMs = Date.now() - startTime;
    // Log required metrics: ONLY cacheKeyHash, source, and response time (ms). No phone numbers or locations!
    console.log(`[Copilot Log] hash=${cacheKeyHash.slice(0, 12)} source=${source} duration=${durationMs}ms`);

    const resultPayload: CopilotFullResponse = {
      source,
      whyRankedFirst: modelOutput.whyRankedFirst,
      whatToDoNow,
      questionsForVet: modelOutput.questionsForVet,
      seeVetNotice,
      reportNotice,
      disclaimer,
    };

    return res.json({
      ...resultPayload,
      hasVettedAdvice: hasVettedFirstAid,
      reviewed: topCondition.reviewed,
      reviewedBy: topCondition.reviewedBy,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[Copilot Error] hash=${cacheKeyHash.slice(0, 12)} duration=${durationMs}ms:`, err);
    return next(err);
  }
});

export default router;
