# Livestock Health Assistant: Frontend Build Guide

Oct 25, 2026 · @Timo

## Goals and scope

The frontend must let a farmer on a phone complete four tasks in under a minute each: find a symptom in their language, see possible conditions and the nearest vet, balance a ration, and report a case. The outbreak map is shown on simulated data.

**In scope**

- Mobile-first web app that works on a low-end Android phone
- Language picker driven by the API, so new languages appear without code changes
- Symptom search with suggestions, results, and a see-a-vet message
- Vet list with distance, call button, and map link
- Ration form with results, gaps, and a plain-language explanation
- Term suggestion form and a simple vet verifier screen
- Outbreak map with a visible "simulated data" label

**Out of scope for now**

- Full accounts and profiles
- Voice input and offline sync (design for them, build later)
- Native mobile apps

**Demo test:** someone who has never seen the app finds a symptom, reaches a vet, and gets a ration without help.

## Decisions

None of these are confirmed yet; each row is my default for a 2-day build and is easy to swap.

| Topic | Default | Why |
| --- | --- | --- |
| Framework | Next.js (App Router) with TypeScript, UI and API in one project | One repo, one deploy, and Prisma runs in the same codebase |
| Styling | Tailwind CSS | Fast mobile-first layout without writing custom CSS |
| Components | shadcn/ui or plain Tailwind components | Accessible forms, dialogs, and tabs out of the box |
| Data fetching | TanStack Query | Loading, error, and retry states with little code |
| Forms | React Hook Form with Zod | Validation shared with the API |
| Map | Leaflet with OpenStreetMap tiles | Free, no API key, works for clusters and vet pins |
| Interface text | A small translation dictionary (en, sw) for buttons and labels | Symptom terms come from the API, not from this file |
| Installable app | PWA manifest and cached shell | Adds to home screen; offline can come later |
| Hosting for the demo | Run locally or on a free host | Keep a local fallback in case venue Wi-Fi fails |

Open question: do you want the frontend as a separate app that calls the API, or inside the same project? I assumed one project.

## Screens

Eight screens cover the whole demo; the first four are the critical path and should be finished first.

| # | Screen | Purpose | API calls | What the farmer sees |
| --- | --- | --- | --- | --- |
| 1 | Home | Pick language and animal, then choose a task | GET /api/languages, GET /api/species | Language chips, animal icons, four big task buttons |
| 2 | Symptom search | Find symptoms in any language | GET /api/symptoms/search | Search box, suggestions with the matched term, a pending label where unconfirmed, tick to add |
| 3 | Results | Show possible conditions and where to go | POST /api/symptoms/match, GET /api/vets/nearest | Condition cards with urgency colour and first aid, see-a-vet message, vet list with distance and call button |
| 4 | Ration advisor | Balance feeds the farmer has | POST /api/ration | Animal stage picker, feed list with kg, result mix, nutrient totals, gaps, plain explanation |
| 5 | Add a term | Suggest a symptom word in a local language | POST /api/terms | Symptom picker, language picker, word, optional spelling variant, thank-you message |
| 6 | Verify terms | Vet confirms or rejects pending terms | POST /api/terms/:id/confirm | Login, queue of pending terms, confirm and reject buttons |
| 7 | Report a case | Record sick animals in a place | POST /api/reports | Animal, symptoms, number affected, location, submit |
| 8 | Outbreak map | Show clusters of reports | GET /api/reports/clusters | Map with pins sized by cases, filters for animal and days, a simulated-data label |

Flow: Home leads to Symptom search, then Results. Report a case can start from Results, using the same symptoms and location.

## Project structure

Keep pages thin and put reusable pieces in `components`, so one teammate can build screens while another builds shared parts.

```text
src/
  app/
    page.tsx                 Home
    search/page.tsx          Symptom search
    results/page.tsx         Conditions and vets
    ration/page.tsx          Ration advisor
    terms/new/page.tsx       Add a term
    terms/verify/page.tsx    Vet verification
    report/page.tsx          Report a case
    map/page.tsx             Outbreak map
    api/...                  Backend routes
  components/
    LanguagePicker.tsx
    SpeciesPicker.tsx
    SymptomSearchBox.tsx
    SymptomChip.tsx          Term with pending or confirmed label
    ConditionCard.tsx        Name, score, urgency colour, first aid
    VetCard.tsx              Distance, call button, map link
    FeedRow.tsx
    NutrientTable.tsx
    SafetyNotice.tsx         The see-a-vet message
    OutbreakMap.tsx
  lib/
    api.ts                   Typed fetch helpers
    i18n.ts                  Interface text by language
    location.ts              GPS and county fallback
  store/
    session.ts               Chosen language, animal, symptoms, location
```

Keep the chosen language, animal, selected symptoms, and location in one small store (Zustand or React context), so Search, Results, and Report share them without re-entering anything.

## Languages and contributions

The language list comes from the API, so adding a language to the database makes it appear in the app with no code change.

**Two separate language settings**

- **Interface language:** buttons and labels, kept in a small dictionary. Ship English and Kiswahili first; fall back to English for any missing label.
- **Symptom language:** which language the farmer types in and sees terms in. Searching always covers every language, so this only decides which term is shown first.

**Search behaviour**

1. Search as the farmer types, after a short pause (about 300 ms), once there are 2 or more characters.
2. Show each hit as the matched term, with the English name below it, so the farmer can confirm the meaning.
3. Show a small label on pending terms, for example "not yet confirmed", and rank confirmed terms first.
4. If nothing matches, show an "Add this word" button that opens the contribution form with the typed text filled in.

**Contribution form**

1. Pick the symptom from a searchable list (English names with their local terms).
2. Pick the language, or add a new one if the list does not have it.
3. Type the word and an optional spelling variant.
4. Submit, then show a thank-you note that says the word will appear once a vet or second contributor confirms it.

**Verifier screen**

A vet signs in, sees pending terms grouped by language with the English symptom beside each, and taps confirm or reject. Show the contributor's note if there is one.

Check that the font used renders ĩ, ũ, ŋ and similar characters correctly on a low-end phone.

## Design for farmers

Design for a farmer using one hand, in sunlight, on a low-end phone with a weak connection.

| Principle | What to do |
| --- | --- |
| Mobile first | Design at 360 px wide first; one column; bottom navigation with 4 items |
| Big targets | Buttons at least 48 px tall, with spacing between them |
| Less reading | Animal and task icons with short labels; one question per screen |
| Contrast | Dark text on light background; urgency shown by colour and a word, never colour alone |
| Light pages | No large images; keep the first load small; lazy-load the map screen |
| Weak network | Show loading and retry states; cache the language, species, and symptom lists after first load |
| Plain words | Short sentences; "Possible conditions", never "Diagnosis" |
| Location | Ask for GPS only when needed, with a county picker as the fallback |

**Urgency colours on condition cards**

- Emergency: red, label "Call a vet now"
- High: orange, label "See a vet today"
- Medium: yellow, label "See a vet soon"
- Low: green, label "Monitor and ask a vet if it continues"

**Safety notice (on every Results screen)**

"These are possible conditions, not a diagnosis. Please see a veterinarian. Some diseases must be reported to the authorities." Show it above the condition cards, in the farmer's interface language.

## Ration and outbreak map screens

These are the two screens judges remember, so they need clear results more than extra controls.

**Ration advisor**

1. Choose the animal and its stage (for example lactating cow or laying hen).
2. Add feeds from a searchable list, with the kilograms available for each. Let the farmer add a feed that is not in the list as a note for later.
3. Submit, then show a result card with the suggested mix in kilograms per animal per day.
4. Show a nutrient table with target, supplied, and a status mark (met, short, over) for protein, energy, calcium, and phosphorus.
5. List each gap in plain words, with a suggested feed that would close it.
6. Show the LLM's short explanation at the bottom, in the farmer's language, under a label such as "Advice in simple words".

**Report a case**

Pre-fill animal, symptoms, and location from the session store. Ask only for the number of animals affected and the number that died, then submit.

**Outbreak map**

- Leaflet map centred on the demo area, with circle markers sized by number of cases and coloured by the most common symptom.
- Filters for animal and time range (7, 14, or 21 days).
- Tap a marker to see report count, main symptoms, and date range.
- A banner on the map that says "Demo data: simulated reports", visible at all times, so no one mistakes it for a real outbreak.
- A highlighted alert on any area that crosses the cluster threshold, with a short quarantine checklist (isolate sick animals, restrict movement, call the vet, avoid sharing equipment). Label the checklist as general guidance to be confirmed by a vet.

## Build order

Build the critical path first, so a working demo exists by the end of event day 1. The backend guide's build order runs alongside this one.

**Today (before the event)**

1. Set up the project with Tailwind, TanStack Query, and a shared layout with bottom navigation.
2. Build the session store and the typed fetch helpers in `lib/api.ts`.
3. Build Home with the language and animal pickers, reading from the API.
4. Build Symptom search against `GET /api/symptoms/search`. Checkpoint: a typed local-language term shows its English name.
5. Sketch the Results and Ration screens on paper or in a quick wireframe, so the event days are only building.

**Event day 1**

1. Build Results with condition cards, the safety notice, and vet cards with a call button.
2. Add GPS with the county fallback.
3. Build Add a term and the vet verifier screen.
4. Test the full path from Home to a vet on a real phone.

**Event day 2**

1. Morning: build the Ration advisor with the result card, nutrient table, and gaps.
2. Midday: build Report a case and the Outbreak map with the simulated-data banner.
3. Afternoon: polish, fix bugs, check the app on a low-end phone, and add the PWA manifest if time allows.
4. Final hour: rehearse the demo path and record a backup video. No new features.

## Risks and demo checklist

The demo is most likely to fail on venue Wi-Fi, slow phones, or a screen nobody finished, so plan fallbacks for each.

| Risk | Fallback |
| --- | --- |
| Venue Wi-Fi is slow or down | Run the app and database locally; keep a recorded video of the full demo |
| GPS is denied or inaccurate | County picker as a visible alternative |
| Local characters render badly | Test fonts on a real phone on day 1 |
| The map screen is not finished | Show a static screenshot of the map and explain it as the vision |
| Search returns nothing in a live demo | Rehearse with terms you have confirmed in the data; keep 3 reliable examples ready |
| Too many screens, too little time | Finish screens 1 to 4 first; drop Verify terms to a seeded example if needed |
| LLM is slow or fails | Show the calculated ration first and load the explanation after; keep a cached example |

**Demo checklist**

- [ ] Phone charged, with the app open on the Home screen
- [ ] Three rehearsed symptom searches in different languages
- [ ] One condition result with a nearby vet
- [ ] One ration using feeds the audience will recognise
- [ ] Outbreak map loaded with the simulated-data banner visible
- [ ] Backup video ready on the laptop
- [ ] Pitch says clearly what is real, what is seeded, and what is simulated
