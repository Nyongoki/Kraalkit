# AI Straw Verification: Build Guide

Oct 26, 2026 · @Timo

## Goals and scope

The system turns the text a farmer types from a semen straw into a clean, checkable record, then sends that record to the provider for confirmation and keeps it for future checks. It protects smallholder farmers from being charged sexed-semen prices for conventional semen.

**What it can do**

- Decode a typed straw code into breed, supplier, bull, batch, and sexed marker, with a confidence level
- Save the insemination event with cow, technician, price, date, and location
- Send the decoded record to the provider over WhatsApp and track their answer
- Flag suspicious patterns: a code queried too often, a technician with complaints, a price far above the benchmark, a batch whose calves are not mostly female

**What it cannot do**

A typed code cannot prove what is inside the straw, because a valid code can be copied onto a fake straw. The system confirms that a code is well formed, known, and consistent with what was sold, and builds the history that exposes fraud over time.

**First version**

Decode (no account needed), then account sign-in, save, send to the provider, store, and the duplicate-code counter. Saving requires an account, which gives every record an owner and a reference. USSD and the WhatsApp Business API come later; the first channel is a mobile web app with a click-to-chat WhatsApp link.

## User flow

The farmer moves through five steps, and the record is saved only after the farmer confirms the decoded fields.

1. **Capture.** The farmer types exactly what is printed on the straw or tube, including any colour of the straw or plug. One text box, no required format.
2. **Decode.** The app shows each extracted field in plain words: breed, supplier, bull, batch or serial, and whether the straw is marked as sexed. Fields it could not read are shown as "not recognised" instead of guessed. The farmer can edit any field, which also fixes typing mistakes such as 0 for O. Decoding works without an account.
3. **Save the event.** Saving needs an account, so the farmer signs in, or creates one with a phone number if new, and then adds cow name or ID, insemination date, technician, price paid, and location, with optional photos of the straw and receipt. The record gets a reference number.
4. **Send to the provider.** The app builds a short WhatsApp message with the decoded fields and the reference number. The farmer taps send from their own WhatsApp.
5. **Store and track.** The record stays in the app with a status: draft, sent, confirmed, not recognised, or no reply. The farmer later adds the pregnancy result and the calf's sex.

**Branches**

- If the decoder finds nothing it recognises, the farmer can still save the record, and it is marked "unverified" with a prompt to send it to the provider.
- If the code has been queried many times, the farmer sees a caution message before saving; see Fraud checks.
- If the provider replies "not recognised", the farmer taps that status and the record is flagged for review.

## Decoding rules

The decoder runs as a pipeline of small steps, and every extracted field carries a confidence level so the farmer sees what the system is sure about.

1. **Clean.** Uppercase the text, replace line breaks and repeated spaces with one space, and remove stray punctuation except hyphens and slashes.
2. **Split into tokens.** Break the text on spaces, hyphens, and slashes, and also keep the whole cleaned string for patterns that span separators.
3. **Fix lookalikes by position.** Where a token must be letters (a breed code), turn 0 into O and 1 into I. Where it must be digits (a batch number), turn O into 0 and I into 1. Never change a token whose position is unknown.
4. **Match fields against reference tables.**
   - Breed code against the breed dictionary
   - Supplier prefix against the supplier table
   - Sexed marker against the label-format table
   - Bull name against known bull names, using fuzzy matching with a small edit distance (1 for short names, 2 for long ones)
5. **Score confidence.** Exact match is high, a match after a fix or fuzzy match is medium, no match is none. A record with no high-confidence field is marked unverified.
6. **Return the result.** For each field: value, plain-language meaning, confidence, and the raw token it came from.

**Rules that protect the farmer**

- Never invent a value. An unreadable field stays "not recognised".
- Do not label a straw "sexed" or "conventional" unless the label-format table has a rule for that supplier. Otherwise show "cannot tell from this text".
- Keep each field's rule in a table that can be edited without changing code, so new label formats can be added as you collect them.
- Store the raw typed text with the decoded result, so old records can be decoded again when the rules improve.

**Rule table shape**

| Field | Rule type | Example of what to store |
| --- | --- | --- |
| Breed | Exact code lookup | Code and full name |
| Supplier | Prefix lookup | Prefix, supplier name, country |
| Sexed marker | Per-supplier pattern | Supplier, pattern, meaning (sexed female, conventional) |
| Bull | Fuzzy name match | Bull name, ID, breed |
| Batch or serial | Pattern per supplier | Supplier, pattern, field name |

The actual codes and patterns must come from supplier and national genetic resource centre documents; see Reference data.

## Data model

The model has 14 tables in five groups, and the decoding rules live in tables so they can change without a code release.

| Group | Tables | Purpose |
| --- | --- | --- |
| Reference | Breed, Supplier, SupplierPrefix, LabelRule, Bull, Batch | What the decoder matches against; Batch can be blacklisted |
| People | Provider, Farmer, Cow | Provider covers supplier contacts, distributors, and technicians, each with a WhatsApp number |
| Activity | StrawQuery, InseminationEvent, Outcome | Every decode is logged; saved events carry status and later results |
| Signals | FraudFlag | Raised by the fraud checks, linked to an event, provider, or batch |
| Pricing | PriceBenchmark | Price ranges by product type, with source and date |

Two design choices matter. `StrawQuery` logs every decode, even ones never saved, so the duplicate-code counter sees all traffic. `InseminationEvent` has two links to `Provider`: the technician who inseminated, and the provider who receives the WhatsApp message and verifies the record.

Starting Prisma schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum ProductType {
  SEXED_FEMALE
  SEXED_MALE
  CONVENTIONAL
  BEEF
  UNKNOWN
}

enum Confidence {
  HIGH
  MEDIUM
  NONE
}

enum ProviderType {
  SUPPLIER
  DISTRIBUTOR
  TECHNICIAN
}

enum EventStatus {
  DRAFT
  SENT
  CONFIRMED
  NOT_RECOGNISED
  NO_REPLY
}

enum RuleField {
  BREED
  SUPPLIER
  SEXED_MARKER
  BATCH
  SERIAL
  BULL
}

enum PregnancyResult {
  PREGNANT
  NOT_PREGNANT
  UNKNOWN
}

enum CalfSex {
  FEMALE
  MALE
  UNKNOWN
}

enum FlagType {
  HIGH_QUERY_COUNT
  SEX_RATIO
  PRICE_HIGH
  PROVIDER_COMPLAINT
  NOT_RECOGNISED
}

enum Severity {
  LOW
  MEDIUM
  HIGH
}

model Breed {
  id     Int                  @id @default(autoincrement())
  code   String               @unique @db.VarChar(10)
  name   String
  bulls  Bull[]
  cows   Cow[]
  events InseminationEvent[]
}

model Supplier {
  id        Int                 @id @default(autoincrement())
  name      String              @unique
  country   String?
  prefixes  SupplierPrefix[]
  rules     LabelRule[]
  bulls     Bull[]
  batches   Batch[]
  providers Provider[]
  events    InseminationEvent[]
}

model SupplierPrefix {
  id         Int      @id @default(autoincrement())
  prefix     String   @unique @db.VarChar(20)
  supplierId Int
  supplier   Supplier @relation(fields: [supplierId], references: [id])
}

model LabelRule {
  id          Int          @id @default(autoincrement())
  supplierId  Int?
  field       RuleField
  pattern     String       @db.VarChar(255)
  meaning     String
  productType ProductType?
  notes       String?      @db.Text
  isActive    Boolean      @default(true)
  supplier    Supplier?    @relation(fields: [supplierId], references: [id])
}

model Bull {
  id             Int                 @id @default(autoincrement())
  name           String
  registrationId String?
  breedId        Int?
  supplierId     Int?
  breed          Breed?              @relation(fields: [breedId], references: [id])
  supplier       Supplier?           @relation(fields: [supplierId], references: [id])
  batches        Batch[]
  events         InseminationEvent[]

  @@index([name])
}

model Batch {
  id             Int                 @id @default(autoincrement())
  supplierId     Int
  batchCode      String              @db.VarChar(50)
  bullId         Int?
  productType    ProductType         @default(UNKNOWN)
  productionDate DateTime?
  blacklisted    Boolean             @default(false)
  supplier       Supplier            @relation(fields: [supplierId], references: [id])
  bull           Bull?               @relation(fields: [bullId], references: [id])
  events         InseminationEvent[]
  flags          FraudFlag[]

  @@unique([supplierId, batchCode])
}

model Provider {
  id             Int                 @id @default(autoincrement())
  name           String
  type           ProviderType
  whatsappNumber String?             @db.VarChar(20)
  county         String?
  registered     Boolean             @default(false)
  supplierId     Int?
  supplier       Supplier?           @relation(fields: [supplierId], references: [id])
  verifiedEvents InseminationEvent[] @relation("EventProvider")
  doneEvents     InseminationEvent[] @relation("EventTechnician")
  flags          FraudFlag[]
}

model Farmer {
  id      Int                 @id @default(autoincrement())
  name    String?
  phone   String              @unique @db.VarChar(20)
  county  String?
  cows    Cow[]
  events  InseminationEvent[]
  queries StrawQuery[]
}

model Cow {
  id       Int                 @id @default(autoincrement())
  farmerId Int
  name     String
  tagNo    String?
  breedId  Int?
  farmer   Farmer              @relation(fields: [farmerId], references: [id])
  breed    Breed?              @relation(fields: [breedId], references: [id])
  events   InseminationEvent[]
}

model StrawQuery {
  id        Int      @id @default(autoincrement())
  farmerId  Int?
  rawText   String   @db.Text
  codeKey   String   @db.VarChar(100)
  county    String?
  createdAt DateTime @default(now())
  farmer    Farmer?  @relation(fields: [farmerId], references: [id])

  @@index([codeKey, createdAt])
}

model InseminationEvent {
  id           Int         @id @default(autoincrement())
  referenceNo  String      @unique @db.VarChar(20)
  farmerId     Int
  cowId        Int?
  rawText      String      @db.Text
  decoded      Json
  confidence   Confidence  @default(NONE)
  breedId      Int?
  supplierId   Int?
  bullId       Int?
  batchId      Int?
  productType  ProductType @default(UNKNOWN)
  technicianId Int?
  providerId   Int?
  priceKsh     Decimal?    @db.Decimal(10, 2)
  eventDate    DateTime
  county       String?
  latitude     Decimal?    @db.Decimal(9, 6)
  longitude    Decimal?    @db.Decimal(9, 6)
  status       EventStatus @default(DRAFT)
  sentAt       DateTime?
  respondedAt  DateTime?
  photoUrls    Json?
  createdAt    DateTime    @default(now())
  farmer       Farmer      @relation(fields: [farmerId], references: [id])
  cow          Cow?        @relation(fields: [cowId], references: [id])
  breed        Breed?      @relation(fields: [breedId], references: [id])
  supplier     Supplier?   @relation(fields: [supplierId], references: [id])
  bull         Bull?       @relation(fields: [bullId], references: [id])
  batch        Batch?      @relation(fields: [batchId], references: [id])
  technician   Provider?   @relation("EventTechnician", fields: [technicianId], references: [id])
  provider     Provider?   @relation("EventProvider", fields: [providerId], references: [id])
  outcome      Outcome?
  flags        FraudFlag[]

  @@index([status])
  @@index([technicianId])
  @@index([batchId])
}

model Outcome {
  id        Int             @id @default(autoincrement())
  eventId   Int             @unique
  pregnancy PregnancyResult @default(UNKNOWN)
  checkedAt DateTime?
  calfSex   CalfSex?
  birthDate DateTime?
  event     InseminationEvent @relation(fields: [eventId], references: [id])
}

model FraudFlag {
  id         Int       @id @default(autoincrement())
  type       FlagType
  severity   Severity  @default(MEDIUM)
  details    String    @db.Text
  eventId    Int?
  providerId Int?
  batchId    Int?
  resolved   Boolean   @default(false)
  createdAt  DateTime  @default(now())
  event      InseminationEvent? @relation(fields: [eventId], references: [id])
  provider   Provider? @relation(fields: [providerId], references: [id])
  batch      Batch?    @relation(fields: [batchId], references: [id])
}

model PriceBenchmark {
  id          Int         @id @default(autoincrement())
  productType ProductType
  minKsh      Decimal     @db.Decimal(10, 2)
  maxKsh      Decimal     @db.Decimal(10, 2)
  county      String?
  source      String
  asOf        DateTime
}
```

Run `npx prisma format` to fix alignment, then `npx prisma migrate dev`. Use `codeKey` as the normalized supplier prefix plus batch or serial, so the same straw typed slightly differently counts as one code.

**Accounts.** Saving a record requires an account, which gives each event an owner and a reference number the farmer can return to. Decoding stays open to everyone and is logged in `StrawQuery` without an owner. The `Farmer` table doubles as the account: a verified phone number plus a PIN, with a one-time SMS code to sign up or reset the PIN. Store only a hash of the PIN, never the PIN itself, and add the account fields below to `Farmer`:

- `pinHash` (string), `phoneVerified` (boolean, default false), `lastLoginAt` (date), `createdAt` (date)

Providers and verifiers (vets, supplier staff) use the same login with a `role` field (`FARMER`, `PROVIDER`, `ADMIN`), so the review screens for flags are not open to farmers.

## Fraud checks

Five checks raise a `FraudFlag`; each one warns and records, and none blocks the farmer or accuses anyone.

| Check | Trigger (starting values) | Data used | Farmer sees |
| --- | --- | --- | --- |
| High query count | Same `codeKey` queried 50 or more times in 7 days, or in 3 or more counties | StrawQuery | "This code has been checked many times. Ask the provider to confirm it." |
| Not recognised | Provider marks the record not recognised | InseminationEvent status | Record flagged; batch raised for review |
| Price above benchmark | Price paid above the top of the range for that product | PriceBenchmark, event price | Typical price range and a note to ask the technician to explain |
| Provider complaints | 3 or more flagged events for one technician in 90 days | FraudFlag, events | Internal review only, not shown to farmers at first |
| Sex ratio | For a batch or technician with at least 20 recorded sexed-semen calvings, the share of female calves is below an agreed level | Outcome, event product type | Internal review only |

**Notes on each check**

- Treat the thresholds as starting guesses and tune them with real data; begin with a manual review of every flag.
- Count a query once per farmer per day, so a farmer retyping the same code does not trigger the check.
- The sex-ratio check needs outcomes, which arrive months later. Use a published expected share of females for sexed semen from the supplier or a reputable reference, and agree the cut-off with a vet or animal breeding specialist before using it.
- Do not publish technician names or flags to other farmers until a person has reviewed them. A wrong public accusation can harm an honest technician and expose you to legal risk.
- Run the checks as a scheduled job (hourly for query counts, daily for the rest), and also run the query-count check when a code is decoded.

## Provider verification over WhatsApp

Sharing on WhatsApp is free for the farmer. The first version uses a click-to-chat link, so there is no WhatsApp Business API approval or message fee, and the message goes from the farmer's own number.

**How it works**

1. After saving, the app builds a message from the record and URL-encodes it.
2. The app opens `https://wa.me/<provider number, digits only>?text=<encoded message>`, which opens WhatsApp with the message ready to send.
3. The farmer taps send. The app sets the status to `SENT` and stores `sentAt`.
4. When the provider replies, the farmer returns to the record and taps one of: Confirmed, Not recognised, or No reply. The app stores `respondedAt` and the status.

**Message template (English; translate to the farmer's language)**

```text
Straw check, ref {referenceNo}
Breed: {breed}
Supplier: {supplier}
Bull: {bull}
Batch/serial: {batch}
Marked as: {productType}
Date: {eventDate}
Price paid: KSh {price}
Typed text: {rawText}
Please confirm if this matches your records.
```

**Rules**

- Always include the reference number and the raw typed text, so the provider can answer even when decoding was wrong.
- Leave out the farmer's name and cow details unless the farmer chooses to include them.
- Choose the provider from the record: the supplier contact for the decoded supplier, otherwise a distributor or the technician. Let the farmer change the choice.
- If the provider has no WhatsApp number, show a fallback: copy the message, or send by SMS.

**Later upgrade**

The WhatsApp Business API can send the message automatically and read the reply, which removes the manual status tap. The `status`, `sentAt`, and `respondedAt` fields stay the same, so the schema does not change.

## API endpoints

Decoding is open to everyone; every route that saves or reads records needs a signed-in user.

| Route | Access | Purpose | Input | Output |
| --- | --- | --- | --- | --- |
| POST /api/decode | Open | Decode typed straw text | rawText, county? | fields with meaning and confidence, price range, caution message if the code is heavily queried |
| POST /api/auth/request-code | Open | Send a one-time SMS code | phone | sent confirmation |
| POST /api/auth/verify | Open | Create account or reset PIN | phone, code, pin | session token |
| POST /api/auth/login | Open | Sign in | phone, pin | session token |
| POST /api/events | Signed in | Save an insemination event | rawText, corrected fields, cow, date, technician, price, location | event with referenceNo, status DRAFT |
| GET /api/events | Signed in | List the farmer's own records | status?, page | events |
| GET /api/events/:id | Signed in, owner | One record | none | event with outcome and flags the farmer may see |
| POST /api/events/:id/send | Signed in, owner | Prepare WhatsApp sharing | providerId? | wa.me link and message text; status set to SENT |
| PATCH /api/events/:id/status | Signed in, owner | Record the provider's answer | status | updated event |
| POST /api/events/:id/outcome | Signed in, owner | Add pregnancy result and calf sex | pregnancy, calfSex, dates | outcome |
| GET /api/providers | Signed in | Contacts to choose from | supplierId?, county? | providers with WhatsApp numbers |
| GET /api/admin/flags | Admin | Review fraud flags | resolved?, type? | flags with linked record |
| PATCH /api/admin/flags/:id | Admin | Resolve or escalate a flag | resolved, note | updated flag |
| POST /api/admin/rules | Admin | Add or edit decoding rules and reference data | rule fields | saved rule |

**Notes**

- Rate-limit `/api/decode` and the SMS code route by phone and IP, since both are open and cost money or load.
- Only the owner can read or change an event; admin routes check the `role` field.
- Events saved before the farmer has chosen a provider stay in DRAFT until `/send` is called.

## Reference data to collect

The decoder is only as good as these lists, so collect each from an official source and have a second person check it before it goes live.

| Data | What to collect | Best source | Check |
| --- | --- | --- | --- |
| Breed codes | Code and full name for the breeds sold locally, including local and tropical breeds | Supplier catalogues, the national genetic resources centre | Compare two sources; mark any code that differs |
| Supplier prefixes | Code prefix, company name, country | Supplier documents, bull catalogues | Confirm with the supplier |
| Label formats | How each supplier prints bull name, batch or serial, and sexed marking; photos of real straws | Suppliers, distributors, vets who hold straws | Collect at least 3 real examples per supplier |
| Sexed-semen markers | Per supplier: the wording or code that means sexed female | Supplier product sheets | Never assume X and Y apply to every supplier |
| Bulls | Name, registration ID, breed, supplier | Catalogues | Spot-check against the catalogue |
| Providers | Name, type, WhatsApp number, county, registration status | Veterinary board and county lists, supplier contacts | Call or message each number |
| Price benchmarks | Price range by product type, with date and source | Supplier price lists, distributors, farmer reports | Show as a range and date every entry |
| Expected female share for sexed semen | A published figure from the supplier or a reputable reference | Supplier product sheets, animal breeding literature | Agree the cut-off with a breeding specialist |

Start with 2 suppliers and 5 breeds. A system that decodes a few suppliers correctly is more useful than one that guesses at many.

## Build order

Build decoding first, since it works without accounts and is what a first demo shows; add accounts and saving next.

1. **Set up.** Create the project, set up MySQL with `utf8mb4`, paste the schema, and run the first migration.
2. **Seed the reference tables** with 2 suppliers, 5 breeds, and a first set of label rules and bulls from real straws.
3. **Build the decoder** as a pure function with tests: cleaning, lookalike fixes, field matching, confidence. Checkpoint: 10 real or realistic straw texts decode as expected, including ones with typos.
4. **Build `POST /api/decode` and the decode screen**, with `StrawQuery` logging. Checkpoint: a typed code shows plain-language fields.
5. **Add accounts.** SMS code, PIN, sessions, and the role field. Checkpoint: a new farmer can sign up and sign in.
6. **Build saving.** `POST /api/events`, the form with the other details, reference number, and the records list.
7. **Build WhatsApp sharing.** The message template, the `wa.me` link, and the status buttons.
8. **Add the fraud checks**, starting with the query counter, then the price check. Add the admin flag screen.
9. **Add outcomes and the sex-ratio check** once there is data to test with.
10. **Later:** USSD, the WhatsApp Business API for automatic sending and replies, and the PIN reset flow polish.

## Risks and open questions

The biggest risks are wrong reference data and a verification that sounds stronger than it is.

| Risk | Why it matters | What to do |
| --- | --- | --- |
| Wrong code or marker lists | A wrong breed or sexed label gives a farmer false comfort or a false alarm | Use official sources only, show confidence, and say "cannot tell" when no rule exists |
| Copied valid codes | A fake straw can carry a real code | Say the check confirms the code, not the contents; rely on provider confirmation, the query counter, and outcome data |
| Provider does not reply | Records stay unconfirmed | Show "no reply" clearly; ask the supplier to nominate a contact who answers |
| Honest technician flagged | Reputation and legal risk | Keep flags internal and human-reviewed; no public naming at first |
| Unreliable thresholds | Too many false alarms, or fraud missed | Start with manual review and tune with real data |
| Accounts and personal data | Phone numbers, locations, and prices are personal data | Collect only what is needed, hash PINs, and check Kenya's data protection requirements before launch |
| SMS cost and abuse | One-time codes cost money and can be abused | Rate-limit by phone and IP |
| Scope too wide | Many suppliers and channels at once | Start with 2 suppliers, the web app, and click-to-chat |

**Open questions**

- Who is the first provider contact that will answer verification messages: a supplier, a distributor, or a technician group?
- Which 2 suppliers and which breeds will the first version cover?
- Will a regulator or the national genetic resources centre take part, or is this independent at first?
- Who owns the flag review: you, a vet partner, or a cooperative?
- Should farmers be able to see how many other farmers checked the same code, or only a caution message?
