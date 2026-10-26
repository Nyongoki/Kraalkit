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
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  notifiable: boolean;
  firstAid: string | null;
  score: number;
  matchedSymptoms: number;
  totalSymptoms: number;
  callVetNow: boolean;
  isContagious?: boolean;
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

export interface OutbreakCluster {
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  reportCount: number;
  animalsAffected: number;
  animalsDead: number;
  species: Array<{ slug: string; name: string }>;
  symptoms: ClusterSymptom[];
  isSimulated: boolean;
}

export interface OutbreakClustersResponse {
  days: number;
  total: number;
  clusters: OutbreakCluster[];
}
