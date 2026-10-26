# Livestock Health Assistant: Backend Build Guide

Oct 25, 2026 · @Timo

## Goals and scope

The backend must power three demo flows in 2 days: multilingual symptom search, symptom-to-vet matching, and a ration advisor. Outbreak reporting is stored in the database but shown only on simulated data.

**In scope**

- Language and species tables that can grow without code changes
- Symptom dictionary with contributor submissions and vet verification
- Weighted disease matching from selected symptoms
- Nearest-vet lookup by farmer location
- Feed and nutrient tables with a ration calculator
- Report storage built for the outbreak map

**Out of scope for now**

- Real outbreak detection and movement tracing
- User accounts beyond a simple vet verifier login
- Voice input and offline sync

**Demo test:** a farmer types a symptom in Kiswahili or Kisii and gets possible conditions, the nearest vet, and a ration built from the feeds they list.

## Decisions locked in

Species, language handling and stack are settled; the other rows are defaults I proposed and still need your confirmation.

| Topic | Decision | Status |
| --- | --- | --- |
| Species | Dairy cattle, goats, sheep, poultry, stored as a table so more can be added | Confirmed |
| Languages | A table of languages, not an enum; new ones added as rows | Confirmed |
| Stack | Prisma with MySQL | Confirmed |
| Seed languages | Kiswahili, Kisii, plus a third still to be named | Open |
| Verification | Each term is pending or confirmed; only confirmed terms rank in search | Default |
| Vets | Type, verified flag, species served, lat/lng, contact | Default |
| Location | GPS or county picker | Default |
| Disease matching | Weighted symptom scoring, no AI; the LLM only explains results | Default |
| Reports | Table built now, loaded with simulated data | Default |
| Roles | Farmer (anonymous), contributor, vet verifier | Default |

## Data model

The model has 15 tables in six groups. Everything that can grow later (languages, species, symptoms) is a row, not an enum.

| Group | Models | Key idea |
| --- | --- | --- |
| Reference | Language, Species | Add a language or species by inserting a row |
| Symptoms | Symptom, SymptomSpecies, SymptomTerm | One English concept, many terms per language, each with a status |
| Diseases | Disease, DiseaseSpecies, DiseaseSymptom | Symptom links carry a weight from 1 to 5 |
| Vets | Vet, VetSpecies, VetUser | Type, verified flag, lat/lng; VetUser is the verifier login |
| Reports | Report, ReportSymptom | Species, location, animals affected, simulated flag |
| Nutrition | Feed, NutrientRequirement | Per-feed nutrient values, per-species and stage targets |

Starting Prisma schema, to be adjusted as you build:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum TermStatus {
  PENDING
  CONFIRMED
  REJECTED
}

enum Urgency {
  LOW
  MEDIUM
  HIGH
  EMERGENCY
}

enum VetType {
  REGISTERED_VET
  CLINIC
  ANIMAL_HEALTH_WORKER
}

model Language {
  id         Int           @id @default(autoincrement())
  code       String        @unique @db.VarChar(10)
  name       String
  nativeName String?
  isActive   Boolean       @default(true)
  terms      SymptomTerm[]
}

model Species {
  id       Int                   @id @default(autoincrement())
  slug     String                @unique
  name     String
  symptoms SymptomSpecies[]
  diseases DiseaseSpecies[]
  vets     VetSpecies[]
  reports  Report[]
  needs    NutrientRequirement[]
}

model Symptom {
  id          Int              @id @default(autoincrement())
  key         String           @unique
  nameEn      String
  description String?          @db.Text
  terms       SymptomTerm[]
  species     SymptomSpecies[]
  diseases    DiseaseSymptom[]
  reports     ReportSymptom[]
}

model SymptomSpecies {
  symptomId Int
  speciesId Int
  symptom   Symptom @relation(fields: [symptomId], references: [id])
  species   Species @relation(fields: [speciesId], references: [id])

  @@id([symptomId, speciesId])
}

model SymptomTerm {
  id            Int        @id @default(autoincrement())
  symptomId     Int
  languageId    Int
  text          String     @db.VarChar(255)
  variant       String?
  status        TermStatus @default(PENDING)
  contributor   String?
  votes         Int        @default(0)
  confirmedById Int?
  confirmedAt   DateTime?
  createdAt     DateTime   @default(now())
  symptom       Symptom    @relation(fields: [symptomId], references: [id])
  language      Language   @relation(fields: [languageId], references: [id])
  confirmedBy   VetUser?   @relation(fields: [confirmedById], references: [id])

  @@unique([symptomId, languageId, text])
  @@index([languageId, status])
  @@fulltext([text])
}

model Disease {
  id        Int              @id @default(autoincrement())
  slug      String           @unique
  name      String
  urgency   Urgency
  notifiable Boolean         @default(false)
  firstAid  String?          @db.Text
  species   DiseaseSpecies[]
  symptoms  DiseaseSymptom[]
}

model DiseaseSpecies {
  diseaseId Int
  speciesId Int
  disease   Disease @relation(fields: [diseaseId], references: [id])
  species   Species @relation(fields: [speciesId], references: [id])

  @@id([diseaseId, speciesId])
}

model DiseaseSymptom {
  diseaseId Int
  symptomId Int
  weight    Int     @default(1)
  disease   Disease @relation(fields: [diseaseId], references: [id])
  symptom   Symptom @relation(fields: [symptomId], references: [id])

  @@id([diseaseId, symptomId])
}

model Vet {
  id        Int          @id @default(autoincrement())
  name      String
  type      VetType
  verified  Boolean      @default(false)
  phone     String?
  county    String?
  latitude  Decimal      @db.Decimal(9, 6)
  longitude Decimal      @db.Decimal(9, 6)
  species   VetSpecies[]
}

model VetSpecies {
  vetId     Int
  speciesId Int
  vet       Vet     @relation(fields: [vetId], references: [id])
  species   Species @relation(fields: [speciesId], references: [id])

  @@id([vetId, speciesId])
}

model VetUser {
  id           Int           @id @default(autoincrement())
  name         String
  email        String        @unique
  passwordHash String
  confirmed    SymptomTerm[]
}

model Report {
  id              Int             @id @default(autoincrement())
  speciesId       Int
  county          String?
  latitude        Decimal?        @db.Decimal(9, 6)
  longitude       Decimal?        @db.Decimal(9, 6)
  animalsAffected Int             @default(1)
  animalsDead     Int             @default(0)
  isSimulated     Boolean         @default(false)
  createdAt       DateTime        @default(now())
  species         Species         @relation(fields: [speciesId], references: [id])
  symptoms        ReportSymptom[]

  @@index([createdAt])
}

model ReportSymptom {
  reportId  Int
  symptomId Int
  report    Report  @relation(fields: [reportId], references: [id])
  symptom   Symptom @relation(fields: [symptomId], references: [id])

  @@id([reportId, symptomId])
}

model Feed {
  id             Int     @id @default(autoincrement())
  name           String  @unique
  category       String
  dryMatterPct   Decimal @db.Decimal(5, 2)
  crudeProteinPct Decimal @db.Decimal(5, 2)
  energyMjPerKg  Decimal @db.Decimal(5, 2)
  calciumPct     Decimal @db.Decimal(5, 3)
  phosphorusPct  Decimal @db.Decimal(5, 3)
  pricePerKg     Decimal? @db.Decimal(8, 2)
}

model NutrientRequirement {
  id          Int     @id @default(autoincrement())
  speciesId   Int
  stage       String
  proteinPct  Decimal @db.Decimal(5, 2)
  energyMjPerKg Decimal @db.Decimal(5, 2)
  calciumPct  Decimal @db.Decimal(5, 3)
  phosphorusPct Decimal @db.Decimal(5, 3)
  species     Species @relation(fields: [speciesId], references: [id])

  @@unique([speciesId, stage])
}
```

Run `npx prisma format` after pasting to fix column alignment, then `npx prisma migrate dev`.

## MySQL and Prisma setup notes

Four MySQL details decide whether local-language search and nearest-vet queries work correctly.

1. **Character set.** Create the database with `utf8mb4` and a case- and accent-insensitive collation such as `utf8mb4_unicode_ci`, so characters like ĩ, ũ and ŋ match whether or not users type the diacritics.
2. **Search.** The `@@fulltext([text])` index on `SymptomTerm` supports MySQL `MATCH ... AGAINST`. Short words can fall below MySQL's minimum token size (default 3 for InnoDB), so also keep a `LIKE 'term%'` fallback for short terms.
3. **Distance.** Use a raw query for nearest vet, with `ST_Distance_Sphere(POINT(lng, lat), POINT(?, ?))` on MySQL 5.7 and later, or the Haversine formula in `$queryRaw`. With 10 to 15 vets, no spatial index is needed.
4. **Numbers.** Keep nutrient and coordinate fields as `Decimal`. Prisma returns them as `Decimal` objects, so convert with `.toNumber()` before calculations.

Other notes:

- Use `prisma db seed` with a `prisma/seed.ts` that reads your CSV files, so the data can be reloaded in one command.
- Keep `DATABASE_URL` in `.env` and out of version control.
- Check your Prisma version supports `@@fulltext` for MySQL; if not, drop the index and use the raw query.

## API endpoints

Ten routes cover every demo flow; the first six are the critical path.

| Route | Purpose | Input | Output |
| --- | --- | --- | --- |
| GET /api/languages | List active languages | none | code, name, nativeName |
| GET /api/species | List species | none | id, slug, name |
| GET /api/symptoms/search | Find symptoms in any language | q, speciesId?, languageCode? | matching symptoms with the matched term and its status |
| POST /api/symptoms/match | Rank possible conditions | symptomIds, speciesId | diseases with score, urgency, first aid |
| GET /api/vets/nearest | Find nearest vets | lat, lng, speciesId, limit | vets with distance in km |
| POST /api/ration | Balance a ration | speciesId, stage, feeds with kg available | mix, nutrient totals, gaps, LLM explanation |
| POST /api/terms | Suggest a term | symptomId, languageCode, text, variant? | term saved as pending |
| POST /api/terms/:id/confirm | Verify a term | vet login | status set to confirmed |
| POST /api/reports | Submit a case report | speciesId, symptomIds, location, count | report id |
| GET /api/reports/clusters | Data for the outbreak map | days, speciesId? | grouped reports by area and symptom |

Return matched condition names as "possible conditions" and include a `disclaimer` field in `/api/symptoms/match` so the frontend always shows the see-a-vet message.

## Core logic

All four pieces run on plain code and SQL; the LLM only explains results, so the numbers stay checkable.

**1. Symptom search across languages**

1. Normalize the query: trim, lowercase, and also build a version with diacritics stripped (`str.normalize('NFD')` then remove combining marks).
2. Query `SymptomTerm` with `MATCH ... AGAINST` over all languages, falling back to `LIKE 'q%'` for short input.
3. Group hits by `symptomId`, rank confirmed terms above pending ones, and return the English name plus the term in the user's language when one exists.
4. Searching English finds local terms the same way, since every term hangs off one canonical symptom.

**2. Condition matching**

For each disease linked to the chosen species, score the share of its symptom weight that the farmer reported:

```latex
score = \frac{\sum_{s \in matched} weight_s}{\sum_{s \in disease} weight_s}
```

Return the top three with score, urgency and first aid. Require at least two matched symptoms, and put any `EMERGENCY` or notifiable disease first with a "call a vet now" flag.

**3. Nearest vet**

Filter vets by species served and by the verified flag (with a toggle to include unverified), then sort by `ST_Distance_Sphere`. If the farmer has no GPS, use the centre of the county they pick.

**4. Ration balancer**

1. Load the farmer's feeds and the species and stage targets for protein, energy, calcium and phosphorus.
2. Solve for feed proportions that meet the targets at the lowest cost, with a maximum share per feed (for example, cap protein supplements) and a calcium to phosphorus ratio inside a set range. A small solver such as `javascript-lp-solver` handles this.
3. If no mix meets a target, return the closest mix and list each gap, for example "protein 2 points short; add sunflower cake or a legume".
4. Send the mix, totals and gaps to the LLM and ask for a short plain-language explanation in the farmer's language. The LLM must not change the numbers.

Check every requirement and feed value against a published livestock nutrition reference before the demo; the starter numbers are placeholders.

## Seed data plan

Seed data is the biggest time risk, so collect it as CSV files before the event and load them with `prisma db seed`.

| File | Target size | Source | Who verifies |
| --- | --- | --- | --- |
| languages.csv | 3 to 4 rows | Your choice | You |
| species.csv | 4 rows | Cattle, goats, sheep, poultry | You |
| symptoms.csv | 30 to 50 concepts, each tagged with species | Standard livestock disease references | A vet or animal health student |
| symptom\_terms.csv | 15 to 20 terms per local language | Native speakers | A second native speaker, then a vet for meaning |
| diseases.csv | 6 to 8 per species with urgency, notifiable flag, first aid | Standard veterinary references | A vet |
| disease\_symptoms.csv | 4 to 8 weighted links per disease | Same references | A vet |
| vets.csv | 10 to 15 clinics with lat/lng, species served, type | Google Maps and county veterinary office listings | Call or check each |
| feeds.csv | 15 to 20 common local feeds with nutrient values | Livestock feed composition tables | Cross-check two sources |
| requirements.csv | One row per species and stage you demo | Published nutrient requirement tables | Cross-check two sources |
| reports\_simulated.csv | 60 to 100 reports clustered in 2 or 3 areas over 3 weeks, `isSimulated = true` | Generated by a script | Not needed; label it as simulated in the demo |

**Rules for the data**

- Mark every local-language term `PENDING` until a second person confirms it. For the demo, confirm only the ones you have verified, and show the pending label for the rest.
- Never guess a translation. A blank cell is better than a wrong one in a health tool.
- Record the source for each disease and feed value in a notes column, so you can answer a judge who asks where it came from.

## Build order

Build in dependency order and test each step with a real request before moving on.

**Today (before the event)**

1. Create the project, install Prisma, and set up the MySQL database with `utf8mb4`.
2. Paste the schema, run the first migration, and confirm all 15 tables exist.
3. Write the seed script and load languages, species, and a first batch of symptoms and terms.
4. Build `GET /api/languages`, `GET /api/species`, and `GET /api/symptoms/search`. Checkpoint: searching a Kiswahili term returns its English symptom.
5. Collect the remaining CSV files in parallel with a teammate or friends.

**Event day 1**

1. Load diseases, links, and vets.
2. Build `POST /api/symptoms/match` and `GET /api/vets/nearest`. Checkpoint: symptoms in, conditions and nearest vet out.
3. Build `POST /api/terms` and the confirm route with the vet login.
4. Connect the frontend to the search and match flow.

**Event day 2**

1. Morning: load feeds and requirements, build `POST /api/ration`, and add the LLM explanation.
2. Midday: load simulated reports, build `/api/reports` and the clusters route, and connect the map.
3. Afternoon: freeze features, fix bugs, and rehearse the demo path end to end.
4. Final hour: pitch only, no new code.

## Risks and safety notes

The main risks are wrong health information and running out of time on data, so protect against those first.

| Risk | Why it matters | Fallback |
| --- | --- | --- |
| Wrong local-language translation | A mistranslated symptom can point to the wrong condition | Pending label, two-person confirmation, and blanks instead of guesses |
| Output read as a diagnosis | Farmers may skip the vet | Say "possible conditions" everywhere and always show the see-a-vet message |
| Unverified feed or disease data | Bad ration or advice in front of judges | Cite a source per value and cross-check two references |
| Data collection runs long | The demo needs content more than features | Cut to one species and two languages, then expand if time allows |
| Pre-existing code rules | Some events require work to be built during the event | Check the rules today and declare reused code in the pitch |
| LLM changes the numbers | The explanation could contradict the calculation | Compute in code, pass results to the LLM, and instruct it to explain only |
| No network at the venue | A live demo can fail | Run the database locally and keep a recorded backup of the demo |

Two things to confirm before the event: the hackathon's rule on pre-existing code, and who your vet or animal health contact is for checking diseases and terms.
