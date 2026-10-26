import { PrismaClient, ProductType, Confidence, RuleField } from '@prisma/client';
import prisma from './prisma';

export interface DecodedField<T = string> {
  value: T;
  meaning: string;
  confidence: Confidence;
  rawToken?: string;
}

export interface DecodeResult {
  rawText: string;
  cleanedText: string;
  tokens: string[];
  codeKey: string;
  overallConfidence: Confidence;
  breed?: DecodedField<{ id?: number; code: string; name: string }>;
  supplier?: DecodedField<{ id?: number; name: string; country?: string | null }>;
  bull?: DecodedField<{ id?: number; name: string; registrationId?: string | null }>;
  batchOrSerial?: DecodedField<string>;
  productType: DecodedField<ProductType>;
  priceBenchmark?: {
    productType: ProductType;
    minKsh: number;
    maxKsh: number;
    source: string;
  };
  queryCount: number;
  distinctCounties: number;
  cautionMessage?: string | null;
  unrecognizedTokens: string[];
}

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  return dp[m][n];
}

/**
 * 1. Clean the raw text
 */
export function cleanRawStrawText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9\s\-\/\.]/g, '')
    .trim();
}

/**
 * 2. Split into tokens
 */
export function splitTokens(cleaned: string): string[] {
  return cleaned
    .split(/[\s\-\/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Lookalike character fixes
 */
export function fixAlphaLookalikes(token: string): string {
  // If token is expected to be letters, convert 0->O, 1->I, 5->S, 8->B
  return token
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');
}

export function fixNumericLookalikes(token: string): string {
  // If token is expected to be digits, convert O->0, I->1, S->5, B->8
  return token
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/S/g, '5')
    .replace(/B/g, '8');
}

/**
 * Main Pure Decoding Pipeline
 */
export async function decodeStrawText(
  rawText: string,
  county?: string | null,
  farmerId?: number | null
): Promise<DecodeResult> {
  const cleaned = cleanRawStrawText(rawText);
  const tokens = splitTokens(cleaned);
  const usedTokens = new Set<string>();

  // Fetch reference dictionaries
  const [breeds, suppliers, prefixes, rules, bulls, benchmarks] = await Promise.all([
    prisma.breed.findMany(),
    prisma.supplier.findMany(),
    prisma.supplierPrefix.findMany({ include: { supplier: true } }),
    prisma.labelRule.findMany({ where: { isActive: true } }),
    prisma.bull.findMany({ include: { breed: true, supplier: true } }),
    prisma.priceBenchmark.findMany(),
  ]);

  let decodedBreed: DecodedField<{ id?: number; code: string; name: string }> | undefined;
  let decodedSupplier: DecodedField<{ id?: number; name: string; country?: string | null }> | undefined;
  let decodedBull: DecodedField<{ id?: number; name: string; registrationId?: string | null }> | undefined;
  let decodedBatchOrSerial: DecodedField<string> | undefined;
  let decodedProductType: DecodedField<ProductType> = {
    value: ProductType.UNKNOWN,
    meaning: 'Cannot tell from this text (Requires provider verification)',
    confidence: Confidence.NONE,
  };

  // 1. MATCH PRODUCT TYPE / SEXED MARKER (Regex rules against full cleaned text)
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(cleaned)) {
        const match = cleaned.match(regex);
        decodedProductType = {
          value: rule.productType || ProductType.UNKNOWN,
          meaning: rule.meaning,
          confidence: Confidence.HIGH,
          rawToken: match ? match[0] : undefined,
        };
        if (match && match[0]) {
          usedTokens.add(match[0].toUpperCase());
        }
        break;
      }
    } catch (e) {
      // Ignore invalid regex
    }
  }

  // 2. MATCH SUPPLIER PREFIX
  // Check tokens for exact prefix match or prefix at start of token (e.g. "KAGRC-09" or "29HO")
  for (const t of tokens) {
    if (decodedSupplier) break;
    const prefixMatch = prefixes.find(
      (p) => p.prefix === t || t.startsWith(p.prefix)
    );
    if (prefixMatch) {
      decodedSupplier = {
        value: {
          id: prefixMatch.supplier.id,
          name: prefixMatch.supplier.name,
          country: prefixMatch.supplier.country,
        },
        meaning: `Certified AI Supplier: ${prefixMatch.supplier.name} (${prefixMatch.supplier.country || 'Kenya'})`,
        confidence: Confidence.HIGH,
        rawToken: t,
      };
      usedTokens.add(t);
      break;
    }
  }

  // Check supplier full names in text
  if (!decodedSupplier) {
    for (const sup of suppliers) {
      const simpleName = sup.name.split('(')[0].trim().toUpperCase();
      if (cleaned.includes(simpleName)) {
        decodedSupplier = {
          value: { id: sup.id, name: sup.name, country: sup.country },
          meaning: `Certified AI Supplier: ${sup.name}`,
          confidence: Confidence.HIGH,
        };
        break;
      }
    }
  }

  // 3. MATCH BREED CODE
  for (const t of tokens) {
    if (decodedBreed) break;
    // Exact check
    let matchedBreed = breeds.find((b) => b.code === t);
    let confidence: Confidence = Confidence.HIGH;

    // Lookalike check if token is 2 characters (e.g. "H0" -> "HO")
    if (!matchedBreed && t.length <= 3) {
      const fixed = fixAlphaLookalikes(t);
      matchedBreed = breeds.find((b) => b.code === fixed);
      if (matchedBreed) {
        confidence = Confidence.MEDIUM;
      }
    }

    // NAAB code check: tokens like "29HO", "7HO", "29H0", "200JE", "14AY"
    if (!matchedBreed && /^[0-9]{1,4}[A-Z0-9]{2}$/i.test(t)) {
      const breedPart = fixAlphaLookalikes(t.slice(-2));
      matchedBreed = breeds.find((b) => b.code === breedPart);
      if (matchedBreed) {
        confidence = Confidence.HIGH;
      }
    }

    if (matchedBreed) {
      decodedBreed = {
        value: { id: matchedBreed.id, code: matchedBreed.code, name: matchedBreed.name },
        meaning: `${matchedBreed.name} (${matchedBreed.code})`,
        confidence,
        rawToken: t,
      };
      usedTokens.add(t);
      break;
    }
  }

  // Also check if breed code is embedded inside a code (e.g. "29HO014" or "KE-HO-0891")
  if (!decodedBreed) {
    for (const b of breeds) {
      const breedRegex = new RegExp(`(?:^|[0-9\\-_])${b.code}(?:$|[0-9\\-_])`, 'i');
      if (breedRegex.test(cleaned)) {
        decodedBreed = {
          value: { id: b.id, code: b.code, name: b.name },
          meaning: `${b.name} (${b.code})`,
          confidence: Confidence.MEDIUM,
        };
        break;
      }
    }
  }

  // 4. MATCH BULL NAME (Exact or Fuzzy with Levenshtein edit distance <= 2)
  for (const bull of bulls) {
    const bullUpper = bull.name.toUpperCase();
    // Check if full name is in cleaned text
    if (cleaned.includes(bullUpper)) {
      decodedBull = {
        value: { id: bull.id, name: bull.name, registrationId: bull.registrationId },
        meaning: `Pedigree Sire: ${bull.name} (Reg: ${bull.registrationId || 'N/A'})`,
        confidence: Confidence.HIGH,
        rawToken: bullUpper,
      };
      if (bull.breed && !decodedBreed) {
        decodedBreed = {
          value: { id: bull.breed.id, code: bull.breed.code, name: bull.breed.name },
          meaning: `${bull.breed.name} (${bull.breed.code})`,
          confidence: Confidence.HIGH,
        };
      }
      if (bull.supplier && !decodedSupplier) {
        decodedSupplier = {
          value: { id: bull.supplier.id, name: bull.supplier.name, country: bull.supplier.country },
          meaning: `Certified AI Supplier: ${bull.supplier.name}`,
          confidence: Confidence.HIGH,
        };
      }
      break;
    }
  }

  // Fuzzy bull name check if not found
  if (!decodedBull) {
    for (const bull of bulls) {
      const parts = bull.name.toUpperCase().split(' ');
      const keyName = parts[parts.length - 1]; // e.g. "SIRIKWA", "GOLDWYN", "DOORMAN"
      if (keyName.length >= 4) {
        for (const t of tokens) {
          const dist = levenshteinDistance(t, keyName);
          const maxAllowed = keyName.length <= 5 ? 1 : 2;
          if (dist <= maxAllowed) {
            decodedBull = {
              value: { id: bull.id, name: bull.name, registrationId: bull.registrationId },
              meaning: `Pedigree Sire: ${bull.name} (Reg: ${bull.registrationId || 'N/A'})`,
              confidence: dist === 0 ? Confidence.HIGH : Confidence.MEDIUM,
              rawToken: t,
            };
            usedTokens.add(t);
            break;
          }
        }
      }
      if (decodedBull) break;
    }
  }

  // 5. EXTRACT BATCH OR SERIAL NUMBER
  // A batch token typically contains digits or begins with B, LOT, NO, or 5+ digits
  for (const t of tokens) {
    if (usedTokens.has(t)) continue;
    if (
      /^(?:B|LOT|BATCH|NO)?[0-9]{3,10}[A-Z0-9]*$/i.test(t) ||
      /^[0-9]{4,12}$/.test(t)
    ) {
      decodedBatchOrSerial = {
        value: t,
        meaning: `Batch / Serial Number: ${t}`,
        confidence: Confidence.HIGH,
        rawToken: t,
      };
      usedTokens.add(t);
      break;
    }
  }

  // 6. BUILD NORMALIZED CODEKEY
  const supPrefix = decodedSupplier ? decodedSupplier.value.name.substring(0, 5) : 'GEN';
  const batchCode = decodedBatchOrSerial ? decodedBatchOrSerial.value : 'UNK';
  const bullSnippet = decodedBull ? decodedBull.value.name.replace(/\s+/g, '') : 'NOBULL';
  const codeKey = `${supPrefix}-${batchCode}-${bullSnippet}`.toUpperCase();

  // 7. RECORD STRAW QUERY & CHECK DUPLICATE FREQUENCY
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Log query
  await prisma.strawQuery.create({
    data: {
      farmerId: farmerId || null,
      rawText,
      codeKey,
      county: county || null,
    },
  });

  // Check recent queries for this codeKey
  const recentQueries = await prisma.strawQuery.findMany({
    where: {
      codeKey,
      createdAt: { gte: sevenDaysAgo },
    },
    select: { county: true },
  });

  const queryCount = recentQueries.length;
  const distinctCounties = new Set(
    recentQueries.map((q) => q.county).filter(Boolean)
  ).size;

  let cautionMessage: string | null = null;
  if (queryCount >= 50 || distinctCounties >= 3) {
    cautionMessage = `CAUTION: This straw code has been checked ${queryCount} times across ${distinctCounties || 1} counties in the last 7 days. Single straws cannot be reused; confirm with the provider before insemination.`;
  }

  // 8. PRICE BENCHMARK LOOKUP
  const benchmark = benchmarks.find((b) => b.productType === decodedProductType.value);
  const priceBenchmark = benchmark
    ? {
        productType: benchmark.productType,
        minKsh: Number(benchmark.minKsh),
        maxKsh: Number(benchmark.maxKsh),
        source: benchmark.source,
      }
    : undefined;

  // 9. OVERALL CONFIDENCE SCORING
  let overallConfidence: Confidence = Confidence.NONE;
  const highCount = [
    decodedBreed?.confidence === Confidence.HIGH,
    decodedSupplier?.confidence === Confidence.HIGH,
    decodedBull?.confidence === Confidence.HIGH,
    decodedProductType?.confidence === Confidence.HIGH,
  ].filter(Boolean).length;

  if (highCount >= 2) {
    overallConfidence = Confidence.HIGH;
  } else if (highCount >= 1 || decodedBreed || decodedSupplier || decodedBull) {
    overallConfidence = Confidence.MEDIUM;
  }

  const unrecognizedTokens = tokens.filter((t) => !usedTokens.has(t));

  return {
    rawText,
    cleanedText: cleaned,
    tokens,
    codeKey,
    overallConfidence,
    breed: decodedBreed,
    supplier: decodedSupplier,
    bull: decodedBull,
    batchOrSerial: decodedBatchOrSerial,
    productType: decodedProductType,
    priceBenchmark,
    queryCount,
    distinctCounties,
    cautionMessage,
    unrecognizedTokens,
  };
}
