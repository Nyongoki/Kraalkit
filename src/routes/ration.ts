import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

/**
 * Simple greedy LP-style ration balancer.
 * For each target nutrient, checks if current mix meets it.
 * Returns the proportional mix, totals, and any gaps.
 */
interface FeedInput {
  name: string;
  kgAvailable: number;
}

interface NutrientTotals {
  proteinPct: number;
  energyMjPerKg: number;
  calciumPct: number;
  phosphorusPct: number;
}

interface RationMix {
  feedName: string;
  kgUsed: number;
  proportion: number;
}

function computeRation(
  feeds: Array<{ name: string; kgAvailable: number; protein: number; energy: number; calcium: number; phosphorus: number; pricePerKg: number | null }>,
  targets: NutrientTotals
): {
  mix: RationMix[];
  totals: NutrientTotals;
  gaps: string[];
  totalCost: number | null;
} {
  const totalKg = feeds.reduce((s, f) => s + f.kgAvailable, 0);
  if (totalKg === 0) {
    return { mix: [], totals: { proteinPct: 0, energyMjPerKg: 0, calciumPct: 0, phosphorusPct: 0 }, gaps: ['No feeds provided'], totalCost: null };
  }

  const mix: RationMix[] = feeds
    .filter((f) => f.kgAvailable > 0)
    .map((f) => ({ feedName: f.name, kgUsed: f.kgAvailable, proportion: f.kgAvailable / totalKg }));

  // Weighted average nutrients
  const totals: NutrientTotals = { proteinPct: 0, energyMjPerKg: 0, calciumPct: 0, phosphorusPct: 0 };
  for (const m of mix) {
    const feed = feeds.find((f) => f.name === m.feedName)!;
    totals.proteinPct += feed.protein * m.proportion;
    totals.energyMjPerKg += feed.energy * m.proportion;
    totals.calciumPct += feed.calcium * m.proportion;
    totals.phosphorusPct += feed.phosphorus * m.proportion;
  }

  // Identify gaps
  const gaps: string[] = [];
  if (totals.proteinPct < targets.proteinPct) {
    gaps.push(`Protein ${(targets.proteinPct - totals.proteinPct).toFixed(1)} points short — consider adding soybean meal, sunflower cake or a legume forage`);
  }
  if (totals.energyMjPerKg < targets.energyMjPerKg) {
    gaps.push(`Energy ${(targets.energyMjPerKg - totals.energyMjPerKg).toFixed(1)} MJ/kg short — consider adding maize grain or molasses`);
  }
  if (totals.calciumPct < targets.calciumPct) {
    gaps.push(`Calcium ${(targets.calciumPct - totals.calciumPct).toFixed(3)} % short — consider adding limestone or bone meal`);
  }
  if (totals.phosphorusPct < targets.phosphorusPct) {
    gaps.push(`Phosphorus ${(targets.phosphorusPct - totals.phosphorusPct).toFixed(3)} % short — consider adding dicalcium phosphate`);
  }

  // Ca:P ratio check (ideal 1.5:1 to 2:1)
  if (totals.phosphorusPct > 0) {
    const caP = totals.calciumPct / totals.phosphorusPct;
    if (caP < 1.2) gaps.push(`Calcium-to-phosphorus ratio is ${caP.toFixed(2)}:1 (below 1.2:1 minimum) — increase calcium`);
    if (caP > 2.5) gaps.push(`Calcium-to-phosphorus ratio is ${caP.toFixed(2)}:1 (above 2.5:1 maximum) — increase phosphorus or reduce calcium`);
  }

  // Estimate cost
  let totalCost: number | null = 0;
  for (const m of mix) {
    const feed = feeds.find((f) => f.name === m.feedName)!;
    if (feed.pricePerKg === null) { totalCost = null; break; }
    totalCost = (totalCost ?? 0) + m.kgUsed * feed.pricePerKg;
  }

  return { mix, totals, gaps, totalCost };
}

// POST /api/ration
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedSchema = z.object({ name: z.string(), kgAvailable: z.number().positive() });
    const schema = z.object({
      speciesId: z.number().int().positive(),
      stage: z.string(),
      feeds: z.array(feedSchema).min(1),
      languageCode: z.string().optional(),
    });

    const { speciesId, stage, feeds, languageCode } = schema.parse(req.body);

    // Load target requirements
    const requirement = await prisma.nutrientRequirement.findUnique({
      where: { speciesId_stage: { speciesId, stage } },
    });

    if (!requirement) {
      return res.status(404).json({ error: `No nutrient requirements found for speciesId=${speciesId} and stage="${stage}"` });
    }

    // Load feed data from DB
    const feedNames = feeds.map((f) => f.name);
    const dbFeeds = await prisma.feed.findMany({ where: { name: { in: feedNames } } });

    if (dbFeeds.length === 0) {
      return res.status(404).json({ error: 'None of the provided feed names were found in the database' });
    }

    const feedsWithData = dbFeeds.map((dbf) => {
      const inputFeed = feeds.find((f) => f.name === dbf.name)!;
      return {
        name: dbf.name,
        kgAvailable: inputFeed.kgAvailable,
        protein: dbf.crudeProteinPct.toNumber(),
        energy: dbf.energyMjPerKg.toNumber(),
        calcium: dbf.calciumPct.toNumber(),
        phosphorus: dbf.phosphorusPct.toNumber(),
        pricePerKg: dbf.pricePerKg ? dbf.pricePerKg.toNumber() : null,
      };
    });

    const targets: NutrientTotals = {
      proteinPct: requirement.proteinPct.toNumber(),
      energyMjPerKg: requirement.energyMjPerKg.toNumber(),
      calciumPct: requirement.calciumPct.toNumber(),
      phosphorusPct: requirement.phosphorusPct.toNumber(),
    };

    const { mix, totals, gaps, totalCost } = computeRation(feedsWithData, targets);

    // LLM explanation (optional — only if GEMINI_API_KEY is set)
    let explanation: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        explanation = await getLlmExplanation({ mix, totals, gaps, targets, stage, languageCode });
      } catch (llmErr) {
        console.error('LLM explanation failed (non-fatal):', llmErr);
      }
    }

    res.json({
      mix,
      totals: {
        proteinPct: Math.round(totals.proteinPct * 10) / 10,
        energyMjPerKg: Math.round(totals.energyMjPerKg * 10) / 10,
        calciumPct: Math.round(totals.calciumPct * 1000) / 1000,
        phosphorusPct: Math.round(totals.phosphorusPct * 1000) / 1000,
      },
      targets: {
        proteinPct: targets.proteinPct,
        energyMjPerKg: targets.energyMjPerKg,
        calciumPct: targets.calciumPct,
        phosphorusPct: targets.phosphorusPct,
      },
      gaps,
      totalCost,
      explanation,
      disclaimer: 'Check all feed values against a published livestock nutrition reference before feeding.',
    });
  } catch (err) {
    next(err);
  }
});

async function getLlmExplanation(data: {
  mix: RationMix[];
  totals: NutrientTotals;
  gaps: string[];
  targets: NutrientTotals;
  stage: string;
  languageCode?: string;
}): Promise<string> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const langInstruction = data.languageCode && data.languageCode !== 'en'
    ? `Respond in the language with code "${data.languageCode}".`
    : 'Respond in English.';

  const prompt = `You are a livestock nutrition advisor explaining a feed ration result to a farmer in simple, clear language.

Here are the exact calculated results (do NOT change these numbers):
- Feeds in the mix: ${data.mix.map((m) => `${m.feedName} (${m.kgUsed} kg, ${(m.proportion * 100).toFixed(0)}%)`).join(', ')}
- Nutrient totals: Protein ${data.totals.proteinPct}%, Energy ${data.totals.energyMjPerKg} MJ/kg, Calcium ${data.totals.calciumPct}%, Phosphorus ${data.totals.phosphorusPct}%
- Targets: Protein ${data.targets.proteinPct}%, Energy ${data.targets.energyMjPerKg} MJ/kg
- Gaps: ${data.gaps.length > 0 ? data.gaps.join('; ') : 'None — all targets met'}
- Stage: ${data.stage}

Write 2-4 short sentences explaining this ration to the farmer. Use the numbers above exactly. Do not diagnose or give medical advice.
${langInstruction}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return response.text ?? '';
}

export default router;
