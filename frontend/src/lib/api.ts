import {
  Language,
  Species,
  SymptomResult,
  MatchedCondition,
  MatchSymptomsResponse,
  Vet,
  RationResponse,
  OutbreakClustersResponse,
  UserProfile,
  UserRole,
} from '../types';

const API_BASE = '/api';

export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  county?: string;
  farmSize?: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid credentials' }));
    throw new Error(err.error || 'Invalid credentials');
  }
  return res.json();
}

export async function getMeProfile(token: string): Promise<{ user: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function fetchLanguages(): Promise<Language[]> {
  const res = await fetch(`${API_BASE}/languages`);
  if (!res.ok) throw new Error('Failed to fetch languages');
  return res.json();
}

export async function fetchSpecies(): Promise<Species[]> {
  const res = await fetch(`${API_BASE}/species`);
  if (!res.ok) throw new Error('Failed to fetch species');
  return res.json();
}

export async function searchSymptoms(
  q: string,
  speciesId?: number,
  languageCode?: string
): Promise<SymptomResult[]> {
  const params = new URLSearchParams({ q });
  if (speciesId) params.append('speciesId', speciesId.toString());
  if (languageCode) params.append('languageCode', languageCode);

  const res = await fetch(`${API_BASE}/symptoms/search?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search symptoms');
  return res.json();
}

export async function matchSymptoms(
  symptomIds: number[],
  speciesId: number,
  isHerd?: boolean,
  herdSize?: number
): Promise<MatchSymptomsResponse> {
  const res = await fetch(`${API_BASE}/symptoms/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptomIds, speciesId, isHerd, herdSize }),
  });
  if (!res.ok) throw new Error('Failed to match conditions');
  return res.json();
}

export async function fetchNearestVets(
  lat: number,
  lng: number,
  speciesId?: number,
  limit = 6,
  includeUnverified = false
): Promise<Vet[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    limit: limit.toString(),
    includeUnverified: includeUnverified.toString(),
  });
  if (speciesId) params.append('speciesId', speciesId.toString());

  const res = await fetch(`${API_BASE}/vets/nearest?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch nearest vets');
  return res.json();
}

export async function calculateRation(
  speciesId: number,
  stage: string,
  feeds: Array<{ name: string; kgAvailable: number }>,
  languageCode?: string
): Promise<RationResponse> {
  const res = await fetch(`${API_BASE}/ration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speciesId, stage, feeds, languageCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to calculate ration' }));
    throw new Error(error.error || 'Failed to calculate ration');
  }
  return res.json();
}

export async function submitTerm(data: {
  symptomId: number;
  languageCode: string;
  text: string;
  variant?: string;
  contributor?: string;
}): Promise<{ id: number; status: string; message: string }> {
  const res = await fetch(`${API_BASE}/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to submit term' }));
    throw new Error(err.error || 'Failed to submit term');
  }
  return res.json();
}

export async function confirmTerm(
  termId: number,
  token: string
): Promise<{ id: number; status: string; confirmedAt: string }> {
  const res = await fetch(`${API_BASE}/terms/${termId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to confirm term');
  return res.json();
}

export async function submitCaseReport(data: {
  speciesId: number;
  symptomIds: number[];
  county?: string;
  latitude?: number;
  longitude?: number;
  animalsAffected: number;
  animalsDead: number;
  isHerd?: boolean;
  herdSize?: number;
}): Promise<{ id: number; createdAt: string }> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
}

export async function fetchOutbreakClusters(
  days = 30,
  speciesId?: number
): Promise<OutbreakClustersResponse> {
  const params = new URLSearchParams({ days: days.toString() });
  if (speciesId) params.append('speciesId', speciesId.toString());

  const res = await fetch(`${API_BASE}/reports/clusters?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch outbreak clusters');
  return res.json();
}
