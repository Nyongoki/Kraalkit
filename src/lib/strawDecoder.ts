import { PrismaClient, ProductType, Confidence, RuleField } from '@prisma/client';
import prisma from './prisma';

export interface DecodedField<T = string> {
  value: T;
  meaning: string;
  confidence: Confidence;
  rawToken?: string;
}

export interface DecodedProductionDate {
  rawToken: string;
  formatted: string;
  year?: number;
  dayOfYear?: number;
}

export interface DecodedQualitySeal {
  rawToken: string;
  name: string;
  meaning: string;
}

export interface AuditItem {
  property: string;
  strawDecoded: string;
  receiptClaim: string;
  status: 'MATCH' | 'MISMATCH' | 'WARNING' | 'INFO';
  notes: string;
}

export interface ReceiptComparisonInput {
  cowName?: string;
  cowTag?: string;
  receiptBreed?: string;
  receiptBull?: string;
  receiptProductType?: string;
  receiptTechnician?: string;
  pricePaidKsh?: number;
}

export interface AuditReconciliationResult {
  isFullyMatched: boolean;
  hasCriticalMismatch: boolean;
  overallVerdict: string;
  verdictColor: 'green' | 'amber' | 'rose';
  auditItems: AuditItem[];
  suggestedWhatsAppText: string;
}

export interface PriorStrawUsage {
  isOwner: boolean;
  cowName?: string | null;
  cowTag?: string | null;
  eventDate: string;
  county?: string | null;
  referenceNo?: string | null;
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
  productionDate?: DecodedProductionDate;
  qualitySeal?: DecodedQualitySeal;
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
  infoMessage?: string | null;
  isDuplicateFraud?: boolean;
  priorUsage?: PriorStrawUsage | null;
  unrecognizedTokens: string[];
  isAiEnhanced?: boolean;
  aiExplanation?: string;
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
 * Detect Julian Date (YYDDD) or Standard Calendar Date (YYYYMMDD)
 */
export function parseJulianDate(tokens: string[]): DecodedProductionDate | undefined {
  for (const t of tokens) {
    if (/^[1-3][0-9](?:00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|36[0-6])$/.test(t)) {
      const year = 2000 + parseInt(t.substring(0, 2), 10);
      const dayOfYear = parseInt(t.substring(2), 10);
      const date = new Date(year, 0, dayOfYear);
      const formatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return {
        rawToken: t,
        formatted: `${formatted} (Julian Day ${dayOfYear}, ${year})`,
        year,
        dayOfYear,
      };
    }
    // Standard YYYYMMDD (e.g. 20261027 -> 27 Oct 2026)
    if (/^(202[0-9]|203[0-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/.test(t)) {
      const year = parseInt(t.substring(0, 4), 10);
      const month = parseInt(t.substring(4, 6), 10) - 1;
      const day = parseInt(t.substring(6, 8), 10);
      const date = new Date(year, month, day);
      const formatted = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return {
        rawToken: t,
        formatted: `${formatted} (Mfg: ${t})`,
        year,
        dayOfYear: Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / 86400000),
      };
    }
  }
  return undefined;
}

/**
 * Detect Quality Certification Seals (CSS, KEBS, KVB, ICAR)
 */
export function detectQualitySeal(tokens: string[]): DecodedQualitySeal | undefined {
  for (const t of tokens) {
    if (t === 'CSS') {
      return {
        rawToken: 'CSS',
        name: 'Certified Semen Services (CSS)',
        meaning: 'Official health certification confirming sire was disease and pathogen-free at collection.',
      };
    }
    if (t === 'KEBS' || t === 'KVB') {
      return {
        rawToken: t,
        name: `${t} Certified`,
        meaning: `Certified compliant with Kenyan ${t} veterinary livestock standards.`,
      };
    }
    if (t === 'ICAR') {
      return {
        rawToken: 'ICAR',
        name: 'ICAR Certified',
        meaning: 'International Committee for Animal Recording pedigree certification standard.',
      };
    }
  }
  return undefined;
}

/**
 * Reconcile Physical Straw with Technician Paper Receipt
 */
export function reconcileWithReceipt(
  decoded: DecodeResult,
  receipt: ReceiptComparisonInput
): AuditReconciliationResult {
  const auditItems: AuditItem[] = [];
  let isFullyMatched = true;
  let hasCriticalMismatch = false;

  // 1. Sire / Bull Check
  const decodedSire = decoded.bull?.value.name || 'Not Identified on Straw';
  const claimedSire = receipt.receiptBull?.trim();
  if (claimedSire) {
    const isSireMatch = decoded.bull
      ? claimedSire.toUpperCase().includes(decoded.bull.value.name.toUpperCase()) ||
        decoded.bull.value.name.toUpperCase().includes(claimedSire.toUpperCase()) ||
        levenshteinDistance(claimedSire.toUpperCase(), decoded.bull.value.name.toUpperCase()) <= 2
      : false;

    if (isSireMatch) {
      auditItems.push({
        property: 'Sire Pedigree',
        strawDecoded: decodedSire,
        receiptClaim: claimedSire,
        status: 'MATCH',
        notes: 'Genuine pedigree sire match. Calf will inherit verified sire milk and fertility genetics.',
      });
    } else {
      isFullyMatched = false;
      auditItems.push({
        property: 'Sire Pedigree',
        strawDecoded: decodedSire,
        receiptClaim: claimedSire,
        status: 'MISMATCH',
        notes: `Receipt states "${claimedSire}", but physical straw identifies "${decodedSire}". Calf will inherit traits of ${decodedSire}.`,
      });
    }
  } else {
    auditItems.push({
      property: 'Sire Pedigree',
      strawDecoded: decodedSire,
      receiptClaim: 'Not Specified on Receipt',
      status: 'INFO',
      notes: decoded.bull ? `Identified on straw: ${decoded.bull.meaning}` : 'No pedigree bull detected.',
    });
  }

  // 2. Breed Purity Check
  const decodedBreed = decoded.breed?.value.name || 'Not Identified on Straw';
  const claimedBreed = receipt.receiptBreed?.trim();
  if (claimedBreed) {
    const isBreedMatch = decoded.breed
      ? claimedBreed.toUpperCase().includes(decoded.breed.value.name.toUpperCase()) ||
        decoded.breed.value.name.toUpperCase().includes(claimedBreed.toUpperCase()) ||
        claimedBreed.toUpperCase().includes(decoded.breed.value.code.toUpperCase())
      : false;

    if (isBreedMatch) {
      auditItems.push({
        property: 'Breed Purity',
        strawDecoded: decodedBreed,
        receiptClaim: claimedBreed,
        status: 'MATCH',
        notes: '100% breed alignment. Calf will be true to expected breed characteristics.',
      });
    } else {
      isFullyMatched = false;
      auditItems.push({
        property: 'Breed Purity',
        strawDecoded: decodedBreed,
        receiptClaim: claimedBreed,
        status: 'MISMATCH',
        notes: `Receipt states "${claimedBreed}", but straw indicates "${decodedBreed}". Resulting calf will be a cross.`,
      });
    }
  }

  // 3. Product Type (Sexed Female vs Conventional) - CRITICAL FRAUD CHECK
  const isStrawSexed = decoded.productType.value === ProductType.SEXED_FEMALE;
  const isStrawConv = decoded.productType.value === ProductType.CONVENTIONAL;
  const claimedType = receipt.receiptProductType?.trim() || 'Conventional';

  const claimsSexed = /sexed|sexcel|female|heifer|ultra/i.test(claimedType);

  if (claimsSexed && !isStrawSexed) {
    isFullyMatched = false;
    hasCriticalMismatch = true;
    auditItems.push({
      property: 'Semen Technology (Sexed vs Conv)',
      strawDecoded: isStrawConv ? 'Conventional (50/50 Chance)' : 'Unverified Conventional',
      receiptClaim: 'Sexed Female (~90% Heifer)',
      status: 'MISMATCH',
      notes: '🚨 CRITICAL OVERCHARGE ALERT: Receipt promises Sexed Female Semen, but physical straw lacks certified sexed markers. You have only a 50/50 split, not 90%.',
    });
  } else if (claimsSexed && isStrawSexed) {
    auditItems.push({
      property: 'Semen Technology (Sexed vs Conv)',
      strawDecoded: decoded.productType.meaning,
      receiptClaim: claimedType,
      status: 'MATCH',
      notes: 'Certified Sex-Sorted technology verified (~90% probability of female heifer calf).',
    });
  } else {
    auditItems.push({
      property: 'Semen Technology (Sexed vs Conv)',
      strawDecoded: decoded.productType.meaning,
      receiptClaim: claimedType,
      status: 'MATCH',
      notes: 'Conventional semen verified. Standard 50% heifer / 50% bull natural probability.',
    });
  }

  // 4. Supplier / Certified Source
  const decodedSup = decoded.supplier?.value.name || 'Accredited Center';
  auditItems.push({
    property: 'AI Stud / Supplier',
    strawDecoded: decodedSup,
    receiptClaim: receipt.receiptTechnician || 'Licensed Technician',
    status: 'INFO',
    notes: decoded.supplier ? `Certified by ${decoded.supplier.meaning}` : 'Standard AI distribution.',
  });

  // 5. Price Paid vs Official Market Benchmark
  if (receipt.pricePaidKsh && decoded.priceBenchmark) {
    const price = Number(receipt.pricePaidKsh);
    const min = decoded.priceBenchmark.minKsh;
    const max = decoded.priceBenchmark.maxKsh;

    if (price > max * 1.25) {
      isFullyMatched = false;
      auditItems.push({
        property: 'Price Audit',
        strawDecoded: `Benchmark: KSh ${min.toLocaleString()} - ${max.toLocaleString()}`,
        receiptClaim: `Charged: KSh ${price.toLocaleString()}`,
        status: 'WARNING',
        notes: `You paid KSh ${price.toLocaleString()}, which exceeds typical county market price (KSh ${min.toLocaleString()} - ${max.toLocaleString()}) for this product type.`,
      });
    } else {
      auditItems.push({
        property: 'Price Audit',
        strawDecoded: `Benchmark: KSh ${min.toLocaleString()} - ${max.toLocaleString()}`,
        receiptClaim: `Charged: KSh ${price.toLocaleString()}`,
        status: 'MATCH',
        notes: `Paid KSh ${price.toLocaleString()}, which is within standard fair market benchmark range.`,
      });
    }
  }

  // 6. Traceability Batch
  if (decoded.batchOrSerial) {
    auditItems.push({
      property: 'Batch & Traceability',
      strawDecoded: decoded.batchOrSerial.value,
      receiptClaim: 'Recorded on Ledger',
      status: 'MATCH',
      notes: 'Straw batch logged. Traceable for pregnancy rate auditing and supplier warranty follow-up.',
    });
  }

  // 7. Sanitary & Quality Certification (CSS, KEBS, KVB)
  if (decoded.qualitySeal) {
    auditItems.push({
      property: 'Sanitary Quality Seal',
      strawDecoded: decoded.qualitySeal.name,
      receiptClaim: 'Veterinary Certified',
      status: 'MATCH',
      notes: decoded.qualitySeal.meaning,
    });
  }

  // 8. Cryo Production Date
  if (decoded.productionDate) {
    auditItems.push({
      property: 'Cryo Processing Date',
      strawDecoded: decoded.productionDate.formatted,
      receiptClaim: 'Thawed On-Farm',
      status: 'MATCH',
      notes: 'Cryogenically preserved in liquid nitrogen at -196°C. High sperm motility when properly thawed.',
    });
  }

  // Overall verdict
  let overallVerdict = 'VERIFIED: All physical straw markings match technician receipt';
  let verdictColor: 'green' | 'amber' | 'rose' = 'green';

  if (hasCriticalMismatch) {
    overallVerdict = 'CRITICAL MISMATCH: Receipt claims sexed genetics but straw is conventional!';
    verdictColor = 'rose';
  } else if (!isFullyMatched) {
    overallVerdict = 'DISCREPANCIES DETECTED: Check breed or sire details with technician';
    verdictColor = 'amber';
  }

  const suggestedWhatsAppText = `Hello, I am farmer ${receipt.cowName ? `(Cow: ${receipt.cowName})` : ''}. Today I was inseminated using spent straw: ${decoded.codeKey}. The technician receipt states ${receipt.receiptBull || ''} ${receipt.receiptProductType || ''} charged KSh ${receipt.pricePaidKsh || 0}. Audit indicates ${overallVerdict}. Please confirm official batch validity.`;

  return {
    isFullyMatched,
    hasCriticalMismatch,
    overallVerdict,
    verdictColor,
    auditItems,
    suggestedWhatsAppText,
  };
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

    // Kenyan & Global Sire Code with Breed Prefix: e.g. "FR25691", "AY1042", "JE0341"
    if (!matchedBreed && /^[A-Z]{2}[0-9]{3,8}$/i.test(t)) {
      const prefix = t.substring(0, 2).toUpperCase();
      matchedBreed = breeds.find((b) => b.code === prefix);
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
  // Check for explicit LOT or BATCH tokens first (e.g. "LOT24B")
  const explicitLot = tokens.find((t) => !usedTokens.has(t) && /^(?:LOT|BATCH)[\-_]?[0-9A-Z]+$/i.test(t));
  if (explicitLot) {
    decodedBatchOrSerial = {
      value: explicitLot,
      meaning: `Batch / Serial Number: ${explicitLot}`,
      confidence: Confidence.HIGH,
      rawToken: explicitLot,
    };
    usedTokens.add(explicitLot);
  } else {
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
  }

  // 5b. DETECT JULIAN PRODUCTION DATE (YYDDD format) OR CALENDAR DATE (YYYYMMDD)
  const decodedProductionDate = parseJulianDate(tokens);
  if (decodedProductionDate) {
    usedTokens.add(decodedProductionDate.rawToken);
  }

  // 5c. DETECT QUALITY CERTIFICATION SEAL (CSS, KEBS, KVB, ICAR)
  const decodedQualitySeal = detectQualitySeal(tokens);
  if (decodedQualitySeal) {
    usedTokens.add(decodedQualitySeal.rawToken);
  }

  // 5d. EXTRACT SIRE PEDIGREE FROM UNCLAIMED TOKENS (If bull not in database)
  if (!decodedBull) {
    const candidateTokens = tokens.filter(
      (t) =>
        !usedTokens.has(t) &&
        !['KA', 'KE', 'KAGRC', 'CAIS', 'CONV', 'SEXED', 'FEMALE', 'BEEF'].includes(t) &&
        !/^[0-9]{1,4}$/.test(t) &&
        !/^[0-9]{8}$/.test(t) &&
        !/^(?:FR|AY|JE|GU|HO|SA|BO|BR)[0-9]{3,8}$/i.test(t)
    );
    if (candidateTokens.length >= 1) {
      const candidateName = candidateTokens.join(' ');
      const regToken = tokens.find((t) => /^[A-Z]{2}[0-9]{3,8}$/i.test(t));
      decodedBull = {
        value: {
          name: candidateName,
          registrationId: regToken || undefined,
        },
        meaning: `Pedigree Sire: ${candidateName}${regToken ? ` (Reg: ${regToken})` : ''}`,
        confidence: Confidence.MEDIUM,
      };
      candidateTokens.forEach((t) => usedTokens.add(t));
    }
  }

  // 6. BUILD NORMALIZED CODEKEY
  const supPrefix = decodedSupplier ? decodedSupplier.value.name.substring(0, 5) : 'GEN';
  const batchCode = decodedBatchOrSerial ? decodedBatchOrSerial.value : 'UNK';
  const bullSnippet = decodedBull ? decodedBull.value.name.replace(/\s+/g, '') : 'NOBULL';
  const codeKey = `${supPrefix}-${batchCode}-${bullSnippet}`.toUpperCase();

  // 7. RECORD STRAW QUERY & CHECK DUPLICATE FREQUENCY (Continuous national audit trail, unauthenticated or authenticated)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Always log query into StrawQuery
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

  // 7b. CHECK INSEMINATION EVENTS (LEDGER) FOR PRIOR USAGE
  const cleanedRaw = rawText.trim();
  const allEvents = await prisma.inseminationEvent.findMany({
    include: {
      cow: true,
      farmer: {
        select: { id: true, name: true, county: true },
      },
    },
    orderBy: { eventDate: 'desc' },
  });

  const priorEvent = allEvents.find((evt) => {
    const rawMatches = evt.rawText && evt.rawText.trim().toLowerCase() === cleanedRaw.toLowerCase();
    const refMatches = evt.referenceNo && evt.referenceNo.toUpperCase() === codeKey.toUpperCase();
    return rawMatches || refMatches;
  });

  let priorUsage: PriorStrawUsage | null = null;
  let isDuplicateFraud = false;
  let cautionMessage: string | null = null;
  let infoMessage: string | null = null;

  if (priorEvent) {
    const formattedDate = priorEvent.eventDate
      ? new Date(priorEvent.eventDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'recently';
    const cowDesc = priorEvent.cow?.name ? `cow "${priorEvent.cow.name}"` : 'a cow';
    const tagDesc = priorEvent.cow?.tagNo ? ` (Ear Tag: ${priorEvent.cow.tagNo})` : '';
    const eventCounty = priorEvent.county || priorEvent.farmer?.county || 'Kenya';

    if (farmerId && priorEvent.farmerId === farmerId) {
      // SCENARIO 1: Same authenticated farmer's account - friendly notification
      priorUsage = {
        isOwner: true,
        cowName: priorEvent.cow?.name || null,
        cowTag: priorEvent.cow?.tagNo || null,
        eventDate: priorEvent.eventDate.toISOString().split('T')[0],
        county: eventCounty,
        referenceNo: priorEvent.referenceNo,
      };
      infoMessage = `ℹ️ Already in Your Herd Ledger: You previously recorded this straw for ${cowDesc}${tagDesc} on ${formattedDate}.`;
    } else {
      // SCENARIO 2: Unauthenticated OR different farmer's account - CRITICAL FRAUD ALERT
      isDuplicateFraud = true;
      priorUsage = {
        isOwner: false,
        cowName: priorEvent.cow?.name || null,
        cowTag: priorEvent.cow?.tagNo || null,
        eventDate: priorEvent.eventDate.toISOString().split('T')[0],
        county: eventCounty,
        referenceNo: priorEvent.referenceNo,
      };
      cautionMessage = `🚨 CRITICAL FRAUD WARNING: This physical straw tube was already recorded as inseminated on another farm (${cowDesc}${tagDesc} in ${eventCounty} on ${formattedDate}). Artificial insemination straws are single-use biological doses; reuse indicates a counterfeit tube or fraud.`;
    }
  } else if (queryCount >= 2) {
    // SCENARIO 3: Not yet registered in ledger, but queried multiple times
    cautionMessage = `⚠️ Multiple Inquiries Detected: This straw code has been checked ${queryCount} times across ${distinctCounties || 1} area(s). Verify that your technician unseals a genuine thawed straw in your presence.`;
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
    productionDate: decodedProductionDate,
    qualitySeal: decodedQualitySeal,
    productType: decodedProductType,
    priceBenchmark,
    queryCount,
    distinctCounties,
    cautionMessage,
    infoMessage,
    isDuplicateFraud,
    priorUsage,
    unrecognizedTokens,
  };
}
