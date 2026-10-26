# Kraalkit

Smart Livestock Healthcare & Nutrition Platform for Kenya. Multilingual symptom triage across 13 Kenyan indigenous languages, epizootic herd outbreak surveillance, KVB veterinarian locator, and local feed ration balancing.

**Stack:** TypeScript · Node.js · Express · Prisma · MySQL · React · Tailwind CSS · Vite

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- MySQL 5.7+ running locally (or remote)

### 2. Setup

```bash
# Copy environment file and fill in your MySQL credentials
cp .env.example .env

# Install dependencies (already done if you followed the build guide)
npm install

# Generate Prisma client
npm run db:generate

# Create the database first in MySQL:
# CREATE DATABASE livestock_health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Run migrations (creates all 15 tables)
npm run db:migrate

# Seed with all data (languages, species, symptoms, diseases, vets, feeds, reports)
npm run db:seed

# Start dev server
npm run dev
```

### 3. Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `PORT` | API port (default: 3000) |
| `JWT_SECRET` | Secret for vet verifier JWTs |
| `GEMINI_API_KEY` | (Optional) For LLM ration explanations |

---

## API Reference

### `GET /api/languages`
Returns all active languages.

### `GET /api/species`
Returns all species.

### `GET /api/symptoms/search?q=homa&speciesId=1&languageCode=sw`
Full-text + LIKE search across all symptom terms in any language.
- `q` — search query (required)
- `speciesId` — filter to symptoms relevant to a species (optional)
- `languageCode` — return local term in this language (optional)

### `POST /api/symptoms/match`
Rank possible diseases from selected symptoms.
```json
{ "symptomIds": [1, 3, 5], "speciesId": 1 }
```

### `GET /api/vets/nearest?lat=-0.68&lng=34.77&speciesId=1&limit=5`
Find closest vets. Optionally filter by species and add `includeUnverified=true`.

### `POST /api/ration`
Balance a feed ration.
```json
{
  "speciesId": 1,
  "stage": "early-lactation",
  "feeds": [
    { "name": "Napier Grass", "kgAvailable": 20 },
    { "name": "Dairy Meal (Commercial)", "kgAvailable": 3 }
  ],
  "languageCode": "sw"
}
```

### `POST /api/terms`
Submit a new local-language symptom term (anyone).
```json
{ "symptomId": 1, "languageCode": "sw", "text": "Homa kali", "contributor": "Farmer name" }
```

### `POST /api/terms/auth/login`
Vet verifier login. Returns a JWT.
```json
{ "email": "vet@livestock.local", "password": "vet123456" }
```

### `POST /api/terms/:id/confirm`
Confirm a pending term (requires JWT in `Authorization: Bearer <token>` header).

### `POST /api/reports`
Submit a case report.
```json
{ "speciesId": 1, "symptomIds": [1, 3], "county": "Kisii", "animalsAffected": 3 }
```

### `GET /api/reports/clusters?days=30&speciesId=1`
Outbreak map data grouped by county / location cluster.

---

## Default Vet Verifier Login
- **Email:** `vet@livestock.local`
- **Password:** `vet123456`

> ⚠️ Change this before any public deployment.

---

## Seed Data Summary
- 3 languages: English, Kiswahili, Kisii
- 4 species: Dairy Cattle, Goats, Sheep, Poultry
- 30 symptom concepts with Kiswahili + Kisii translations (all CONFIRMED)
- 15 diseases with urgency levels, notifiable flags, and first-aid instructions
- 85 weighted disease–symptom links
- 15 vets in Kisii/Nyamira/Migori region with coordinates
- 20 feeds with nutrient values
- 17 nutrient requirement profiles across species and stages
- 65 simulated reports in 3 geographic clusters

