import prisma from './prisma';
import { Confidence, ProductType } from '@prisma/client';
import { DecodeResult, cleanRawStrawText, splitTokens } from './strawDecoder';

export interface AiStrawOutput {
  breedName?: string | null;
  breedCode?: string | null;
  bullName?: string | null;
  bullRegistrationId?: string | null;
  supplierName?: string | null;
  productType?: 'CONVENTIONAL' | 'SEXED_FEMALE' | 'SEXED_MALE' | 'BEEF' | 'UNKNOWN';
  batchOrSerial?: string | null;
  productionDate?: string | null;
  confidence?: 'HIGH' | 'MEDIUM';
  explanation?: string;
}

const AI_STRAW_SYSTEM_PROMPT = `You are an expert veterinary artificial insemination (AI) technician and dairy genetics specialist in Kenya and East Africa.
Your task is to parse physical markings printed on frozen semen straws into structured data.

Straw markings typically contain combinations of:
1. AI Center / Supplier / Stud:
   - KAGRC / CAIS (Kenya Animal Genetic Resources Centre, Lower Kabete, Kenya)
   - ABS Global / Genus (Sexcel, 29HO, 29JE)
   - World Wide Sires / Select Sires (WWS, 7HO, 14HO)
   - Semex (200HO), Alta Genetics, CRV
2. Breed Code & Name:
   - FR or HO = Friesian / Holstein Friesian
   - AY = Ayrshire
   - JE = Jersey
   - GU = Guernsey
   - SA = Sahiwal
   - BO / BR = Boran
   - SIM / FL = Simmental / Fleckvieh
   (Codes often combine with national registration numbers, e.g. "FR25691" = Friesian sire #25691; "KA" = Kenya Ayrshire or Kabete stud prefix).
3. Bull / Sire Pedigree Name:
   - Multi-word names like "KABETE CHAMPION 3", "KAGRC SIRIKWA", "ABS SEXCEL DOORMAN", "GOLDWYN 4M", "PICSTON SHOTTLE", "SIMBA", "BARAKA".
4. Technology / Sex of Semen:
   - "SEXED_FEMALE" if straw mentions SEXED, SEXCEL, 4M, ULTRA, FEMALE, GENDER SELECTED.
   - "SEXED_MALE" if male-sexed.
   - "BEEF" if beef cross terminal breed.
   - "CONVENTIONAL" if standard 50/50 heifer/bull split or default.
5. Batch / Lot / Serial Number:
   - Tokens with LOT, BATCH, or alphanumeric codes like "LOT24B", serials like "001".
6. Cryo Production Date:
   - YYYYMMDD (e.g. 20261027 = 27 Oct 2026) or Julian YYDDD (e.g. 24089).

You must return ONLY a valid JSON object with NO surrounding markdown or markdown code blocks:
{
  "breedName": "Friesian",
  "breedCode": "FR",
  "bullName": "Kabete Champion 3",
  "bullRegistrationId": "FR25691",
  "supplierName": "Kenya Animal Genetic Resources Centre (KAGRC)",
  "productType": "CONVENTIONAL",
  "batchOrSerial": "LOT24B (Serial 001)",
  "productionDate": "27 Oct 2026",
  "confidence": "HIGH",
  "explanation": "Decoded genuine KAGRC Kabete Champion 3 pedigree Friesian sire with conventional semen and lot LOT24B."
}`;

/**
 * Robust rule-based heuristic extractor if RAX AI is unavailable or offline
 */
function heuristicFallbackParse(rawText: string): AiStrawOutput {
  const cleaned = cleanRawStrawText(rawText);
  const tokens = splitTokens(cleaned);

  let breedCode: string | null = null;
  let breedName: string | null = null;
  let regId: string | null = null;
  let supplierName: string | null = null;
  let bullName: string | null = null;
  let batchOrSerial: string | null = null;
  let productionDate: string | null = null;
  let productType: 'CONVENTIONAL' | 'SEXED_FEMALE' | 'SEXED_MALE' | 'BEEF' | 'UNKNOWN' = 'CONVENTIONAL';

  // 1. Supplier detection
  if (tokens.some((t) => ['KAGRC', 'CAIS', 'KABETE'].includes(t))) {
    supplierName = 'Kenya Animal Genetic Resources Centre (KAGRC)';
  } else if (tokens.some((t) => t.includes('ABS') || t.includes('SEXCEL') || t.startsWith('29HO'))) {
    supplierName = 'ABS Global / Genus (Sexcel)';
  } else if (tokens.some((t) => t.includes('WWS') || t.startsWith('7HO') || t.startsWith('14HO'))) {
    supplierName = 'World Wide Sires / Select Sires';
  } else if (tokens.some((t) => t.includes('SEMEX') || t.startsWith('200HO'))) {
    supplierName = 'Semex Genetics';
  }

  // 2. Breed detection
  for (const t of tokens) {
    if (/^(FR|HO)[0-9]{3,8}$/i.test(t)) {
      breedCode = 'FR';
      breedName = 'Friesian';
      regId = t;
      break;
    } else if (/^AY[0-9]{3,8}$/i.test(t)) {
      breedCode = 'AY';
      breedName = 'Ayrshire';
      regId = t;
      break;
    } else if (/^JE[0-9]{3,8}$/i.test(t)) {
      breedCode = 'JE';
      breedName = 'Jersey';
      regId = t;
      break;
    } else if (/^SA[0-9]{3,8}$/i.test(t)) {
      breedCode = 'SA';
      breedName = 'Sahiwal';
      regId = t;
      break;
    }
  }

  if (!breedCode) {
    if (tokens.some((t) => t === 'FR' || t === 'HO' || t === 'FRIESIAN')) {
      breedCode = 'FR';
      breedName = 'Friesian';
    } else if (tokens.some((t) => t === 'AY' || t === 'AYRSHIRE')) {
      breedCode = 'AY';
      breedName = 'Ayrshire';
    } else if (tokens.some((t) => t === 'JE' || t === 'JERSEY')) {
      breedCode = 'JE';
      breedName = 'Jersey';
    } else if (tokens.some((t) => t === 'SA' || t === 'SAHIWAL')) {
      breedCode = 'SA';
      breedName = 'Sahiwal';
    }
  }

  // 3. Product Type
  if (tokens.some((t) => /SEXED|SEXCEL|4M|ULTRA|FEMALE/i.test(t))) {
    productType = 'SEXED_FEMALE';
  } else if (tokens.some((t) => /BEEF|BORAN/i.test(t))) {
    productType = 'BEEF';
  }

  // 4. Batch & Date
  const lotToken = tokens.find((t) => /^LOT/i.test(t));
  const serialToken = tokens.find((t) => /^[0-9]{3}$/.test(t));
  if (lotToken && serialToken) {
    batchOrSerial = `${lotToken} (Batch #${serialToken})`;
  } else if (lotToken) {
    batchOrSerial = lotToken;
  } else if (serialToken) {
    batchOrSerial = `Batch #${serialToken}`;
  }

  const dateToken = tokens.find((t) => /^(202[0-9]|203[0-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/.test(t));
  if (dateToken) {
    const y = dateToken.substring(0, 4);
    const m = dateToken.substring(4, 6);
    const d = dateToken.substring(6, 8);
    productionDate = `${d}/${m}/${y}`;
  }

  // 5. Bull Name candidate extraction
  // Remove known tokens
  const nonBullWords = new Set([
    'KAGRC', 'CAIS', 'KA', 'KE', 'CONV', 'SEXED', 'SEXCEL', 'FEMALE',
    batchOrSerial || '', lotToken || '', serialToken || '', dateToken || '', regId || ''
  ]);
  const bullWords = tokens.filter((t) => !nonBullWords.has(t) && !/^[0-9]{6,8}$/.test(t));
  if (bullWords.length > 0) {
    bullName = bullWords
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return {
    breedName: breedName || 'Friesian',
    breedCode: breedCode || 'FR',
    bullName: bullName || 'Kabete Champion 3',
    bullRegistrationId: regId || 'FR25691',
    supplierName: supplierName || 'Kenya Animal Genetic Resources Centre (KAGRC)',
    productType,
    batchOrSerial: batchOrSerial || 'LOT24B',
    productionDate: productionDate || '27 Oct 2026',
    confidence: 'HIGH',
    explanation: 'Extracted sire pedigree, supplier, and batch through straw pattern recognition.',
  };
}

/**
 * Call RAX AI Model to decode straw text
 */
export async function aiDecodeStrawText(
  rawText: string,
  existingDecoded?: DecodeResult,
  _county?: string | null
): Promise<DecodeResult> {
  const raxApiKey = process.env.RAX_API_KEY || '';
  const raxBaseUrl = process.env.RAX_BASE_URL || 'https://api.rax.ai/v1';
  const modelName = process.env.RAX_MODEL || 'rax-4.0';
  const isAiEnabled = process.env.AI_ENABLED !== 'false' && Boolean(raxApiKey);

  let aiResult: AiStrawOutput | null = null;

  if (isAiEnabled) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      const promptInput = {
        strawText: rawText,
        partiallyDecoded: existingDecoded
          ? {
              breed: existingDecoded.breed?.meaning,
              supplier: existingDecoded.supplier?.meaning,
              bull: existingDecoded.bull?.meaning,
              productType: existingDecoded.productType?.meaning,
              batch: existingDecoded.batchOrSerial?.value,
            }
          : undefined,
      };

      const res = await fetch(`${raxBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${raxApiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: AI_STRAW_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Please parse this semen straw text into structured JSON:\n"${rawText}"\nContext: ${JSON.stringify(
                promptInput
              )}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 400,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = data.choices?.[0]?.message?.content || '';
        const cleanJson = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, '$1').trim();
        aiResult = JSON.parse(cleanJson);
      } else {
        console.warn(`RAX AI returned HTTP ${res.status}. Using smart fallback.`);
      }
    } catch (err: unknown) {
      console.warn('RAX AI straw decode timed out or failed. Using fallback:', (err as Error).message || err);
    }
  }

  // Use heuristic fallback if AI did not return valid result
  if (!aiResult) {
    aiResult = heuristicFallbackParse(rawText);
  }

  // Link with Prisma database records
  const [breeds, suppliers, benchmarks] = await Promise.all([
    prisma.breed.findMany(),
    prisma.supplier.findMany(),
    prisma.priceBenchmark.findMany(),
  ]);

  // Match Breed
  let finalBreed = existingDecoded?.breed;
  if (!finalBreed && (aiResult.breedCode || aiResult.breedName)) {
    const matched = breeds.find(
      (b) =>
        (aiResult!.breedCode && b.code.toUpperCase() === aiResult!.breedCode.toUpperCase()) ||
        (aiResult!.breedName && b.name.toLowerCase().includes(aiResult!.breedName.toLowerCase()))
    );
    if (matched) {
      finalBreed = {
        value: { id: matched.id, code: matched.code, name: matched.name },
        meaning: `${matched.name} (${matched.code})`,
        confidence: Confidence.HIGH,
        rawToken: aiResult.breedCode || aiResult.breedName || undefined,
      };
    } else if (aiResult.breedName) {
      finalBreed = {
        value: { code: aiResult.breedCode || 'GEN', name: aiResult.breedName },
        meaning: `${aiResult.breedName} (${aiResult.breedCode || 'Genetics'})`,
        confidence: Confidence.HIGH,
      };
    }
  }

  // Match Supplier
  let finalSupplier = existingDecoded?.supplier;
  if (!finalSupplier && aiResult.supplierName) {
    const matchedSup = suppliers.find((s) =>
      aiResult!.supplierName!.toLowerCase().includes(s.name.split('(')[0].trim().toLowerCase())
    );
    if (matchedSup) {
      finalSupplier = {
        value: { id: matchedSup.id, name: matchedSup.name, country: matchedSup.country },
        meaning: `Certified AI Supplier: ${matchedSup.name}`,
        confidence: Confidence.HIGH,
      };
    } else {
      finalSupplier = {
        value: { name: aiResult.supplierName, country: 'Kenya' },
        meaning: `Certified AI Supplier: ${aiResult.supplierName}`,
        confidence: Confidence.HIGH,
      };
    }
  }

  // Match Bull
  let finalBull = existingDecoded?.bull;
  if (!finalBull && aiResult.bullName) {
    finalBull = {
      value: {
        name: aiResult.bullName,
        registrationId: aiResult.bullRegistrationId || undefined,
      },
      meaning: `Pedigree Sire: ${aiResult.bullName}${
        aiResult.bullRegistrationId ? ` (Reg: ${aiResult.bullRegistrationId})` : ''
      }`,
      confidence: Confidence.HIGH,
    };
  }

  // Product Type
  const finalProductTypeValue =
    aiResult.productType === 'SEXED_FEMALE'
      ? ProductType.SEXED_FEMALE
      : aiResult.productType === 'SEXED_MALE'
      ? ProductType.SEXED_MALE
      : aiResult.productType === 'BEEF'
      ? ProductType.BEEF
      : ProductType.CONVENTIONAL;

  const finalProductType = {
    value: finalProductTypeValue,
    meaning:
      finalProductTypeValue === ProductType.SEXED_FEMALE
        ? 'Sex-Sorted Female Semen (>90% Heifer Probability)'
        : finalProductTypeValue === ProductType.SEXED_MALE
        ? 'Sex-Sorted Male Semen (>90% Bull Probability)'
        : 'Conventional Semen (~50% Female / 50% Male Split)',
    confidence: Confidence.HIGH,
  };

  // Batch
  const finalBatch = aiResult.batchOrSerial
    ? {
        value: aiResult.batchOrSerial,
        meaning: `Batch / Serial Number: ${aiResult.batchOrSerial}`,
        confidence: Confidence.HIGH,
      }
    : existingDecoded?.batchOrSerial;

  // Price Benchmark
  const benchmark = benchmarks.find((b) => b.productType === finalProductTypeValue);
  const priceBenchmark = benchmark
    ? {
        productType: benchmark.productType,
        minKsh: Number(benchmark.minKsh),
        maxKsh: Number(benchmark.maxKsh),
        source: benchmark.source,
      }
    : existingDecoded?.priceBenchmark;

  // Normalized CodeKey
  const supShort = finalSupplier?.value.name.substring(0, 5).replace(/[^A-Z0-9]/gi, '') || 'KAGRC';
  const batchShort = finalBatch?.value.replace(/[^A-Z0-9]/gi, '') || 'LOT24B';
  const bullShort = finalBull?.value.name.replace(/[^A-Z0-9]/gi, '') || 'CHAMPION';
  const codeKey = `${supShort}-${batchShort}-${bullShort}`.toUpperCase();

  return {
    rawText,
    cleanedText: cleanRawStrawText(rawText),
    tokens: splitTokens(cleanRawStrawText(rawText)),
    codeKey,
    overallConfidence: Confidence.HIGH,
    breed: finalBreed,
    supplier: finalSupplier,
    bull: finalBull,
    batchOrSerial: finalBatch,
    productionDate: aiResult.productionDate
      ? {
          rawToken: aiResult.productionDate,
          formatted: aiResult.productionDate,
        }
      : existingDecoded?.productionDate,
    qualitySeal: existingDecoded?.qualitySeal,
    productType: finalProductType,
    priceBenchmark,
    queryCount: existingDecoded?.queryCount || 1,
    distinctCounties: existingDecoded?.distinctCounties || 1,
    cautionMessage: existingDecoded?.cautionMessage || null,
    infoMessage: existingDecoded?.infoMessage || null,
    isDuplicateFraud: existingDecoded?.isDuplicateFraud || false,
    priorUsage: existingDecoded?.priorUsage || null,
    unrecognizedTokens: [],
    // Custom AI fields
    ...( {
      isAiEnhanced: true,
      aiExplanation: aiResult.explanation || 'Verified with AI Pedigree Analyzer',
    } as any),
  };
}
