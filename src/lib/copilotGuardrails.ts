/**
 * Vet Co-Pilot Guardrails
 * Principle: "Code computes, AI explains."
 * Enforces strict verification on all LLM outputs before returning to the user.
 */

// Banned drug and treatment terms (English and Swahili)
export const BANNED_DRUG_AND_TREATMENT_WORDS: string[] = [
  'antibiotic',
  'antibiotics',
  'oxytetracycline',
  'penicillin',
  'ivermectin',
  'steroid',
  'steroids',
  'injection',
  'injections',
  'dose',
  'doses',
  'dosage',
  'dosages',
  'treat',
  'treatment',
  'treatments',
  'dawa',
  'sindano',
  'tibu',
  'matibabu',
];

// Banned certainty phrases (English and Swahili)
export const BANNED_CERTAINTY_PHRASES: string[] = [
  // English
  'definitely',
  'certainly',
  'confirmed',
  'you have',
  'your animal has',
  'your herd has',
  'your flock has',
  'your cow has',
  'your cattle have',
  'your goat has',
  'your sheep has',
  'diagnosed',
  // Swahili starter list (flagged for review by Kiswahili speaker)
  'hakika',
  'bila shaka',
  'imethibitishwa',
  'umethibitishwa',
  'ana ugonjwa wa',
  'wana ugonjwa wa',
  'wameugua',
  'uchunguzi umeonyesha',
];

// Number words to integers mapping for English and Swahili
const NUMBER_WORD_MAP: Record<string, number> = {
  // English
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,

  // Swahili standard forms
  sifuri: 0,
  moja: 1,
  mbili: 2,
  tatu: 3,
  nne: 4,
  tano: 5,
  sita: 6,
  saba: 7,
  nane: 8,
  tisa: 9,
  kumi: 10,
  ishirini: 20,
  thelathini: 30,
  arobaini: 40,
  hamsini: 50,
  sitini: 60,
  sabini: 70,
  themanini: 80,
  tisini: 90,
  mia: 100,

  // Swahili agreement variants (wa-, vi-, mi-, etc.)
  mmoja: 1,
  kimoja: 1,
  wawili: 2,
  viwili: 2,
  watatu: 3,
  vitatu: 3,
  mitatu: 3,
  wanne: 4,
  vinne: 4,
  minne: 4,
  watano: 5,
  vitano: 5,
  mitano: 5,
};

export interface CopilotModelOutput {
  whyRankedFirst: string;
  questionsForVet: string[];
}

export interface GuardrailValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Builds the allowed numbers set from herd and symptom inputs.
 */
export function buildAllowedNumbersSet(params: {
  total: number;
  sick: number;
  dead: number;
  symptomCounts: number[];
  matchedKeySigns: number;
  totalKeySigns: number;
}): Set<number> {
  const allowed = new Set<number>();

  const add = (n: number | undefined | null) => {
    if (typeof n === 'number' && !isNaN(n) && n >= 0) {
      allowed.add(n);
    }
  };

  add(params.total);
  add(params.sick);
  add(params.dead);
  params.symptomCounts.forEach(add);
  add(params.matchedKeySigns);
  add(params.totalKeySigns);

  // Derived values
  if (params.total >= params.sick) add(params.total - params.sick);
  if (params.total >= params.dead) add(params.total - params.dead);
  if (params.total >= params.sick + params.dead) add(params.total - (params.sick + params.dead));

  // The number 3 is commonly allowed for questions count (e.g. "here are 3 questions")
  // but strictly speaking let's ensure numbers used in explanation match facts.
  // We include 3 if questionsForVet is 3
  allowed.add(3);

  return allowed;
}

/**
 * Validates the raw model output against all safety rules.
 * Fails fast and rejects on any single violation.
 */
export function validateCopilotOutput(
  output: unknown,
  allowedNumbers: Set<number>
): GuardrailValidationResult {
  if (!output || typeof output !== 'object') {
    return { isValid: false, reason: 'Output is not an object' };
  }

  const obj = output as Record<string, unknown>;

  // 1. Schema check
  if (typeof obj.whyRankedFirst !== 'string' || obj.whyRankedFirst.trim().length === 0) {
    return { isValid: false, reason: 'whyRankedFirst is missing or empty' };
  }

  if (
    !Array.isArray(obj.questionsForVet) ||
    obj.questionsForVet.length !== 3 ||
    obj.questionsForVet.some((q) => typeof q !== 'string' || q.trim().length === 0)
  ) {
    return { isValid: false, reason: 'questionsForVet must contain exactly 3 non-empty strings' };
  }

  // Combine all generated text for guardrail scanning
  const combinedText = [obj.whyRankedFirst, ...obj.questionsForVet].join(' ');
  const normalizedLower = combinedText.toLowerCase();

  // 2. Dosage unit check: reject any unit next to a number
  // e.g. 500mg, 10 ml, 2 cc, 50 kg, 3g, 2 litres, 100 iu
  const dosageUnitRegex = /\b\d+\s*(?:mg|ml|cc|kg|g|litres?|liters?|iu)\b/i;
  if (dosageUnitRegex.test(combinedText)) {
    return { isValid: false, reason: 'Dosage or measurement unit detected' };
  }

  // 3. Percentage check
  if (/[%]|(?:\bpercent\b)|(?:\basilimia\b)/i.test(combinedText)) {
    return { isValid: false, reason: 'Percentage reference detected' };
  }

  // 4. Banned drug and treatment words check
  for (const word of BANNED_DRUG_AND_TREATMENT_WORDS) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    if (wordRegex.test(combinedText)) {
      return { isValid: false, reason: `Banned drug or treatment term detected: "${word}"` };
    }
  }

  // 5. Banned certainty phrases check
  for (const phrase of BANNED_CERTAINTY_PHRASES) {
    const phraseRegex = new RegExp(`\\b${phrase}\\b`, 'i');
    if (phraseRegex.test(combinedText)) {
      return { isValid: false, reason: `Banned certainty phrase detected: "${phrase}"` };
    }
  }

  // 6. Number validation: digits check
  // Extract all digit sequences (\d+)
  const digitMatches = combinedText.match(/\d+/g) || [];
  for (const dStr of digitMatches) {
    const val = parseInt(dStr, 10);
    if (!allowedNumbers.has(val)) {
      return { isValid: false, reason: `Unauthorized digit detected: ${val}` };
    }
  }

  // 7. Number words check (English & Swahili)
  // Split words by non-alphanumeric chars
  const words = normalizedLower.split(/[^a-z0-9\-]+/).filter((w) => w.length > 0);
  for (const word of words) {
    if (Object.prototype.hasOwnProperty.call(NUMBER_WORD_MAP, word)) {
      const numVal = NUMBER_WORD_MAP[word];
      if (!allowedNumbers.has(numVal)) {
        return { isValid: false, reason: `Unauthorized number word detected: "${word}" (${numVal})` };
      }
    }
  }

  return { isValid: true };
}
