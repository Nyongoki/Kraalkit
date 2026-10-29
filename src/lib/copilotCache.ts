import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CopilotModelOutput } from './copilotGuardrails';

export interface CopilotFullResponse {
  source: 'ai' | 'fallback';
  whyRankedFirst: string;
  whatToDoNow: string[];
  questionsForVet: string[];
  seeVetNotice: string;
  reportNotice: string | null;
  disclaimer: string;
}

const cache = new Map<string, CopilotModelOutput>();

// Key generator per blueprint:
// SHA-256 of: promptVersion + modelName + speciesId + conditionId + language + total + sick + dead + sortedSymptomPairs + firstAidVersion
export function generateCacheKey(params: {
  promptVersion: string;
  modelName: string;
  speciesId: number;
  conditionId: number;
  language: string;
  total: number;
  sick: number;
  dead: number;
  symptomPairs: { symptomId: number; count: number }[];
  firstAidVersion: number;
}): string {
  const sortedPairs = [...params.symptomPairs]
    .sort((a, b) => a.symptomId - b.symptomId)
    .map((p) => `${p.symptomId}:${p.count}`)
    .join(',');

  const rawKey = [
    params.promptVersion,
    params.modelName,
    params.speciesId,
    params.conditionId,
    params.language.toLowerCase(),
    params.total,
    params.sick,
    params.dead,
    sortedPairs,
    params.firstAidVersion,
  ].join('|');

  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function getCachedExplanation(key: string): CopilotModelOutput | undefined {
  return cache.get(key);
}

export function setCachedExplanation(key: string, value: CopilotModelOutput): void {
  cache.set(key, value);
}

// Fallback lookup by core tuple (species, condition, language, total, sick) for golden demo reliability
const goldenTuples = new Map<string, CopilotModelOutput>();

export function getGoldenTupleMatch(params: {
  speciesId: number;
  conditionId: number;
  language: string;
  total: number;
  sick: number;
}): CopilotModelOutput | undefined {
  const tupleKey = `${params.speciesId}_${params.conditionId}_${params.language.toLowerCase()}_${params.total}_${params.sick}`;
  return goldenTuples.get(tupleKey);
}

// Preload golden set from data/copilot-golden.json
export function loadGoldenSet(): void {
  try {
    const goldenPath = path.join(process.cwd(), 'data', 'copilot-golden.json');
    if (!fs.existsSync(goldenPath)) {
      return;
    }
    const raw = fs.readFileSync(goldenPath, 'utf8');
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return;

    for (const entry of entries) {
      const output: CopilotModelOutput = {
        whyRankedFirst: entry.whyRankedFirst,
        questionsForVet: entry.questionsForVet,
      };

      const tupleKey = `${entry.speciesId}_${entry.conditionId}_${entry.language.toLowerCase()}_${entry.total}_${entry.sick}`;
      goldenTuples.set(tupleKey, output);
    }
    console.log(`Loaded ${entries.length} golden Vet Co-Pilot entries into memory cache`);
  } catch (err) {
    console.warn('Could not load copilot golden set:', err);
  }
}

// Initialize on module load
loadGoldenSet();
