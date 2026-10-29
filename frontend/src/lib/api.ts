import {
  Language,
  Species,
  SymptomResult,
  SymptomSearchResult,
  MatchedCondition,
  MatchSymptomsResponse,
  Vet,
  RationResponse,
  OutbreakClustersResponse,
  UserProfile,
  UserRole,
  StrawDecodeResult,
  ReceiptComparisonInput,
  ReconcileResponse,
  CopilotExplanationResponse,
  DictionaryTermItem,
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

// ==========================================
// AI STRAW & FARMER PHONE AUTH API
// ==========================================

export async function requestFarmerCode(phone: string): Promise<{ success: boolean; message: string; demoCode?: string }> {
  const res = await fetch(`${API_BASE}/auth/farmer/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to request verification code' }));
    throw new Error(err.error || 'Failed to request verification code');
  }
  return res.json();
}

export async function verifyFarmerCode(data: {
  phone: string;
  code: string;
  pin: string;
  name?: string;
  county?: string;
}): Promise<{ token: string; farmer: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/farmer/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Verification failed' }));
    throw new Error(err.error || 'Verification failed');
  }
  return res.json();
}

export async function loginFarmer(phone: string, pin: string): Promise<{ token: string; farmer: UserProfile }> {
  const res = await fetch(`${API_BASE}/auth/farmer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid phone or PIN' }));
    throw new Error(err.error || 'Invalid phone or PIN');
  }
  return res.json();
}

export async function decodeStraw(rawText: string, county?: string, token?: string): Promise<StrawDecodeResult> {
  const authToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}/decode`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawText, county }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to decode straw' }));
    throw new Error(err.error || 'Failed to decode straw');
  }
  return res.json();
}

export async function aiDecodeStraw(
  rawText: string,
  currentDecoded?: any,
  county?: string,
  token?: string
): Promise<StrawDecodeResult> {
  const authToken = token || localStorage.getItem('token') || localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${API_BASE}/straw/ai-decode`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawText, currentDecoded, county }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to enhance straw with AI' }));
    throw new Error(err.error || 'Failed to enhance straw with AI');
  }
  return res.json();
}

export async function reconcileStrawWithReceipt(
  rawText: string,
  receipt: ReceiptComparisonInput,
  county?: string
): Promise<ReconcileResponse> {
  const res = await fetch(`${API_BASE}/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, county, receipt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to reconcile straw with receipt' }));
    throw new Error(err.error || 'Failed to reconcile straw with receipt');
  }
  return res.json();
}

export async function submitInseminationEvent(data: any, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to save insemination event' }));
    throw new Error(err.error || 'Failed to save event');
  }
  return res.json();
}

export async function fetchInseminationEvents(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function sendEventWhatsApp(eventId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to generate WhatsApp link');
  return res.json();
}

export async function updateEventStatus(
  eventId: number,
  status: string,
  token: string,
  notes?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error('Failed to update event status');
  return res.json();
}

export async function recordCalvingOutcome(
  eventId: number,
  data: { pregnancy: string; calfSex?: string; birthDate?: string },
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/outcome`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to record outcome');
  return res.json();
}

export async function fetchEventDetails(eventId: number, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch event details');
  return res.json();
}

export async function updateEventDetails(
  eventId: number,
  data: { cowName?: string; cowTag?: string; priceKsh?: number },
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update event details');
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
): Promise<SymptomSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (speciesId) params.append('speciesId', speciesId.toString());
  if (languageCode) params.append('languageCode', languageCode);

  const res = await fetch(`${API_BASE}/symptoms/search?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search symptoms');
  const data = await res.json();
  return data.map((sym: any) => ({
    symptomId: sym.id,
    matchedTerm: sym.matchedTerm || sym.localTerm || sym.nameEn,
    languageCode: sym.localTermLanguage || languageCode || 'en',
    englishName: sym.nameEn,
    status: (sym.matchedTermStatus as 'CONFIRMED' | 'PENDING' | 'REJECTED') || 'CONFIRMED',
  }));
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

export async function fetchTerms(filters?: {
  status?: string;
  languageCode?: string;
  symptomId?: number;
  q?: string;
}): Promise<{ total: number; terms: DictionaryTermItem[] }> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.languageCode) params.append('languageCode', filters.languageCode);
  if (filters?.symptomId) params.append('symptomId', filters.symptomId.toString());
  if (filters?.q) params.append('q', filters.q);

  const res = await fetch(`${API_BASE}/terms?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch dictionary terms');
  return res.json();
}

export async function fetchSymptomsList(): Promise<
  Array<{ id: number; key: string; nameEn: string; description?: string }>
> {
  const res = await fetch(`${API_BASE}/symptoms`);
  if (!res.ok) throw new Error('Failed to fetch clinical symptoms');
  return res.json();
}

export async function createClinicalSymptom(
  nameEn: string,
  description?: string
): Promise<{ id: number; key: string; nameEn: string; description?: string }> {
  const res = await fetch(`${API_BASE}/symptoms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nameEn, description }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create symptom' }));
    throw new Error(err.error || 'Failed to create clinical symptom');
  }
  return res.json();
}

export async function submitVetTerm(data: {
  symptomId?: number;
  newSymptomNameEn?: string;
  languageCode: string;
  text: string;
  variant?: string;
  clinicalContext?: string;
  vetName: string;
  vetCounty: string;
  kvbNumber?: string;
}): Promise<{ id: number; status: string; message: string }> {
  const res = await fetch(`${API_BASE}/terms/vet-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to certify vet term' }));
    throw new Error(err.error || 'Failed to submit certified vet term');
  }
  return res.json();
}

export async function deleteTerm(termId: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/terms/${termId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete term');
  return res.json();
}

export async function confirmTerm(
  termId: number,
  token?: string,
  reviewer?: { reviewerName?: string; reviewerCounty?: string }
): Promise<{ id: number; status: string; confirmedAt: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/terms/${termId}/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify(reviewer || {}),
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

export async function fetchCopilotExplanation(
  data: {
    speciesId: number;
    language: 'en' | 'sw';
    conditionId: number;
    herd: { total: number; sick: number; dead: number };
    symptoms: Array<{ symptomId: number; count?: number }>;
  },
  token?: string
): Promise<CopilotExplanationResponse> {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/copilot/explain`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to explain result' }));
    throw new Error(err.error || 'Failed to explain result');
  }
  return res.json();
}
