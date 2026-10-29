export type UserRole = 'FARMER' | 'VET' | 'CONTRIBUTOR' | 'ADMIN';

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  county?: string | null;
  farmSize?: string | null;
}

export interface Language {
  id: number;
  code: string;
  name: string;
  nativeName?: string | null;
  region?: string;
  flag?: string;
}

export interface Species {
  id: number;
  slug: string;
  name: string;
}

export interface SymptomSearchResult {
  symptomId: number;
  matchedTerm: string;
  languageCode?: string;
  englishName: string;
  status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
}

export interface SymptomCountItem {
  symptomId: number;
  symptomKey?: string;
  nameEn: string;
  matchedTerm?: string | null;
  count: number;
}

export interface AnimalTriageGroup {
  id: string;
  speciesId: number;
  speciesSlug: string;
  speciesName: string;
  herdSize: number;
  sick: number;
  dead: number;
  symptoms: SymptomCountItem[];
}

export interface TriagePayload {
  groups: Array<{
    speciesId: number;
    herdSize: number;
    sick: number;
    dead: number;
    symptoms: Array<{ symptomId: number; count: number }>;
  }>;
  location: { lat: number; lng: number; county: string };
}

export interface DictionaryTermItem {
  id: number;
  symptomId: number;
  languageId: number;
  text: string;
  variant?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  contributor?: string | null;
  votes: number;
  confirmedAt?: string | null;
  createdAt: string;
  language: {
    id: number;
    code: string;
    name: string;
    nativeName?: string | null;
  };
  symptom: {
    id: number;
    key: string;
    nameEn: string;
  };
  confirmedBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface SymptomResult {
  id: number;
  key: string;
  nameEn: string;
  description?: string | null;
  matchedTerm?: string | null;
  matchedTermStatus?: 'CONFIRMED' | 'PENDING' | 'REJECTED' | null;
  localTerm?: string | null;
  localTermLanguage?: string | null;
}

export interface MatchedCondition {
  id: number;
  name: string;
  nameSw?: string | null;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  notifiable: boolean;
  firstAid: string | null;
  firstAidSw?: string | null;
  reviewed?: boolean;
  reviewedBy?: string | null;
  score: number;
  matchedSymptoms: number;
  totalSymptoms: number;
  callVetNow: boolean;
  isContagious?: boolean;
}

export interface CopilotExplanationResponse {
  source: 'ai' | 'fallback';
  whyRankedFirst: string;
  whatToDoNow: string[];
  questionsForVet: string[];
  seeVetNotice: string;
  reportNotice: string | null;
  disclaimer: string;
  hasVettedAdvice: boolean;
  reviewed: boolean;
  reviewedBy?: string | null;
}

export interface MatchSymptomsResponse {
  conditions: MatchedCondition[];
  disclaimer: string;
  isHerd?: boolean;
  herdNotice?: string | null;
}

export interface Vet {
  id: number;
  name: string;
  type: 'REGISTERED_VET' | 'CLINIC' | 'ANIMAL_HEALTH_WORKER';
  verified: boolean;
  phone: string | null;
  county: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  speciesServed: Array<{ slug: string; name: string }>;
}

export interface RationMixItem {
  feedName: string;
  kgUsed: number;
  proportion: number;
}

export interface RationTotals {
  proteinPct: number;
  energyMjPerKg: number;
  calciumPct: number;
  phosphorusPct: number;
}

export interface RationResponse {
  mix: RationMixItem[];
  totals: RationTotals;
  targets: RationTotals;
  gaps: string[];
  totalCost: number | null;
  explanation: string | null;
  disclaimer: string;
}

export interface ClusterSymptom {
  key: string;
  nameEn: string;
  count: number;
}

export interface ClusterSpeciesItem {
  slug: string;
  name: string;
  affected?: number;
  dead?: number;
}

export interface OutbreakCluster {
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  reportCount: number;
  animalsAffected: number;
  animalsDead: number;
  species: ClusterSpeciesItem[];
  symptoms: ClusterSymptom[];
  isSimulated: boolean;
}

export interface OutbreakClustersResponse {
  days: number;
  total: number;
  clusters: OutbreakCluster[];
}

// ==========================================
// AI SEMEN STRAW & RECEIPT AUDIT TYPES
// ==========================================

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

export interface DecodedField<T = string> {
  value: T;
  meaning: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  rawToken?: string;
}

export interface PriorStrawUsage {
  isOwner: boolean;
  cowName?: string | null;
  cowTag?: string | null;
  eventDate: string;
  county?: string | null;
  referenceNo?: string | null;
}

export interface StrawDecodeResult {
  rawText: string;
  cleanedText: string;
  tokens: string[];
  codeKey: string;
  overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  breed?: DecodedField<{ id?: number; code: string; name: string }>;
  supplier?: DecodedField<{ id?: number; name: string; country?: string | null }>;
  bull?: DecodedField<{ id?: number; name: string; registrationId?: string | null }>;
  batchOrSerial?: DecodedField<string>;
  productionDate?: DecodedProductionDate;
  qualitySeal?: DecodedQualitySeal;
  productType: DecodedField<string>;
  priceBenchmark?: {
    productType: string;
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

export interface ReconcileResponse {
  decoded: StrawDecodeResult;
  reconciliation: AuditReconciliationResult;
}
