import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const dataDir = path.join(__dirname, 'seed-data');

function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n').map((l) => l.replace(/\r$/, ''));
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    // Simple CSV parse: handle quoted fields
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
      if (ch === '"' && inQuotes) { inQuotes = false; continue; }
      if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue; }
      current += ch;
    }
    values.push(current);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] ?? '').trim(); });
    return obj;
  });
}

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Languages
  const languages = readCsv('languages.csv');
  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name, nativeName: lang.nativeName || null },
      create: { code: lang.code, name: lang.name, nativeName: lang.nativeName || null },
    });
  }
  console.log(`  ✔ ${languages.length} languages`);

  // 2. Species
  const speciesData = readCsv('species.csv');
  for (const s of speciesData) {
    await prisma.species.upsert({
      where: { slug: s.slug },
      update: { name: s.name },
      create: { slug: s.slug, name: s.name },
    });
  }
  console.log(`  ✔ ${speciesData.length} species`);

  // 3. Symptoms + SymptomSpecies links
  const symptomsData = readCsv('symptoms.csv');
  const allSpecies = await prisma.species.findMany();
  const speciesBySlug = new Map(allSpecies.map((s) => [s.slug, s]));

  for (const sym of symptomsData) {
    const symptom = await prisma.symptom.upsert({
      where: { key: sym.key },
      update: { nameEn: sym.nameEn, description: sym.description || null },
      create: { key: sym.key, nameEn: sym.nameEn, description: sym.description || null },
    });

    const slugs = sym.species.split('|').map((s) => s.trim());
    for (const slug of slugs) {
      const sp = speciesBySlug.get(slug);
      if (!sp) { console.warn(`    ⚠ species "${slug}" not found for symptom "${sym.key}"`); continue; }
      await prisma.symptomSpecies.upsert({
        where: { symptomId_speciesId: { symptomId: symptom.id, speciesId: sp.id } },
        update: {},
        create: { symptomId: symptom.id, speciesId: sp.id },
      });
    }
  }
  console.log(`  ✔ ${symptomsData.length} symptoms`);

  // 4. SymptomTerms
  const termsData = readCsv('symptom_terms.csv');
  const allSymptoms = await prisma.symptom.findMany();
  const symptomsByKey = new Map(allSymptoms.map((s) => [s.key, s]));
  const allLanguages = await prisma.language.findMany();
  const languagesByCode = new Map(allLanguages.map((l) => [l.code, l]));

  let termsCreated = 0;
  for (const term of termsData) {
    const symptom = symptomsByKey.get(term.symptomKey);
    const language = languagesByCode.get(term.languageCode);
    if (!symptom) { console.warn(`    ⚠ symptom "${term.symptomKey}" not found`); continue; }
    if (!language) { console.warn(`    ⚠ language "${term.languageCode}" not found`); continue; }

    await prisma.symptomTerm.upsert({
      where: { symptomId_languageId_text: { symptomId: symptom.id, languageId: language.id, text: term.text } },
      update: { status: term.status as 'PENDING' | 'CONFIRMED' | 'REJECTED' },
      create: {
        symptomId: symptom.id,
        languageId: language.id,
        text: term.text,
        status: term.status as 'PENDING' | 'CONFIRMED' | 'REJECTED',
      },
    });
    termsCreated++;
  }
  console.log(`  ✔ ${termsCreated} symptom terms`);

  // 5. Diseases + DiseaseSpecies
  const diseasesData = readCsv('diseases.csv');
  for (const d of diseasesData) {
    const disease = await prisma.disease.upsert({
      where: { slug: d.slug },
      update: {
        name: d.name,
        urgency: d.urgency as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY',
        notifiable: d.notifiable === 'true',
        firstAid: d.firstAid || null,
      },
      create: {
        slug: d.slug,
        name: d.name,
        urgency: d.urgency as 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY',
        notifiable: d.notifiable === 'true',
        firstAid: d.firstAid || null,
      },
    });

    const slugs = d.species.split('|').map((s) => s.trim());
    for (const slug of slugs) {
      const sp = speciesBySlug.get(slug);
      if (!sp) continue;
      await prisma.diseaseSpecies.upsert({
        where: { diseaseId_speciesId: { diseaseId: disease.id, speciesId: sp.id } },
        update: {},
        create: { diseaseId: disease.id, speciesId: sp.id },
      });
    }
  }
  console.log(`  ✔ ${diseasesData.length} diseases`);

  // 6. DiseaseSymptoms (weighted links)
  const dsData = readCsv('disease_symptoms.csv');
  const allDiseases = await prisma.disease.findMany();
  const diseasesBySlug = new Map(allDiseases.map((d) => [d.slug, d]));

  let dsCreated = 0;
  for (const ds of dsData) {
    const disease = diseasesBySlug.get(ds.diseaseSlug);
    const symptom = symptomsByKey.get(ds.symptomKey);
    if (!disease) { console.warn(`    ⚠ disease "${ds.diseaseSlug}" not found`); continue; }
    if (!symptom) { console.warn(`    ⚠ symptom "${ds.symptomKey}" not found`); continue; }
    await prisma.diseaseSymptom.upsert({
      where: { diseaseId_symptomId: { diseaseId: disease.id, symptomId: symptom.id } },
      update: { weight: parseInt(ds.weight, 10) },
      create: { diseaseId: disease.id, symptomId: symptom.id, weight: parseInt(ds.weight, 10) },
    });
    dsCreated++;
  }
  console.log(`  ✔ ${dsCreated} disease-symptom links`);

  // 7. Vets + VetSpecies
  const vetsData = readCsv('vets.csv');
  for (const v of vetsData) {
    const vet = await prisma.vet.upsert({
      where: { id: (await prisma.vet.findFirst({ where: { name: v.name } }))?.id ?? 0 },
      update: {},
      create: {
        name: v.name,
        type: v.type as 'REGISTERED_VET' | 'CLINIC' | 'ANIMAL_HEALTH_WORKER',
        verified: v.verified === 'true',
        phone: v.phone || null,
        county: v.county || null,
        latitude: parseFloat(v.latitude),
        longitude: parseFloat(v.longitude),
      },
    }).catch(async () => {
      return prisma.vet.create({
        data: {
          name: v.name,
          type: v.type as 'REGISTERED_VET' | 'CLINIC' | 'ANIMAL_HEALTH_WORKER',
          verified: v.verified === 'true',
          phone: v.phone || null,
          county: v.county || null,
          latitude: parseFloat(v.latitude),
          longitude: parseFloat(v.longitude),
        },
      });
    });

    const slugs = v.species.split('|').map((s) => s.trim());
    for (const slug of slugs) {
      const sp = speciesBySlug.get(slug);
      if (!sp) continue;
      await prisma.vetSpecies.upsert({
        where: { vetId_speciesId: { vetId: vet.id, speciesId: sp.id } },
        update: {},
        create: { vetId: vet.id, speciesId: sp.id },
      }).catch(() => {});
    }
  }
  console.log(`  ✔ ${vetsData.length} vets`);

  // 8. Feeds
  const feedsData = readCsv('feeds.csv');
  for (const f of feedsData) {
    await prisma.feed.upsert({
      where: { name: f.name },
      update: {},
      create: {
        name: f.name,
        category: f.category,
        dryMatterPct: parseFloat(f.dryMatterPct),
        crudeProteinPct: parseFloat(f.crudeProteinPct),
        energyMjPerKg: parseFloat(f.energyMjPerKg),
        calciumPct: parseFloat(f.calciumPct),
        phosphorusPct: parseFloat(f.phosphorusPct),
        pricePerKg: f.pricePerKg ? parseFloat(f.pricePerKg) : null,
      },
    });
  }
  console.log(`  ✔ ${feedsData.length} feeds`);

  // 9. Nutrient Requirements
  const reqData = readCsv('requirements.csv');
  const allSpeciesDb = await prisma.species.findMany();
  const speciesBySlugDb = new Map(allSpeciesDb.map((s) => [s.slug, s]));

  for (const r of reqData) {
    const sp = speciesBySlugDb.get(r.speciesSlug);
    if (!sp) { console.warn(`    ⚠ species "${r.speciesSlug}" not found`); continue; }
    await prisma.nutrientRequirement.upsert({
      where: { speciesId_stage: { speciesId: sp.id, stage: r.stage } },
      update: {},
      create: {
        speciesId: sp.id,
        stage: r.stage,
        proteinPct: parseFloat(r.proteinPct),
        energyMjPerKg: parseFloat(r.energyMjPerKg),
        calciumPct: parseFloat(r.calciumPct),
        phosphorusPct: parseFloat(r.phosphorusPct),
      },
    });
  }
  console.log(`  ✔ ${reqData.length} nutrient requirements`);

  // 10. Default vet verifier account
  const existingUser = await prisma.vetUser.findUnique({ where: { email: 'vet@livestock.local' } });
  if (!existingUser) {
    const hash = await bcrypt.hash('vet123456', 10);
    await prisma.vetUser.create({
      data: { name: 'Demo Vet Verifier', email: 'vet@livestock.local', passwordHash: hash },
    });
    console.log('  ✔ Created default vet user: vet@livestock.local / vet123456');
  }

  // 11. Simulated reports (60 reports across Kisii region)
  const existingReports = await prisma.report.count({ where: { isSimulated: true } });
  if (existingReports === 0) {
    const symptomList = await prisma.symptom.findMany({ take: 15 });
    const speciesList = await prisma.species.findMany();

    // Cluster 1: Kisii – FMD cluster (cattle)
    const kisiiCattle = speciesList.find((s) => s.slug === 'dairy-cattle')!;
    const fmdSymptoms = ['mouth-lesions', 'foot-lesions', 'fever', 'lameness', 'milk-drop'];
    const fmdSymptomObjs = symptomList.filter((s) => fmdSymptoms.includes(s.key));

    for (let i = 0; i < 22; i++) {
      const daysAgo = Math.floor(Math.random() * 18);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      await prisma.report.create({
        data: {
          speciesId: kisiiCattle.id,
          county: 'Kisii',
          latitude: -0.68 + (Math.random() - 0.5) * 0.15,
          longitude: 34.77 + (Math.random() - 0.5) * 0.15,
          animalsAffected: Math.floor(Math.random() * 5) + 1,
          animalsDead: Math.floor(Math.random() * 2),
          isSimulated: true,
          createdAt: d,
          symptoms: { create: fmdSymptomObjs.slice(0, 3 + Math.floor(Math.random() * 3)).map((s) => ({ symptomId: s.id })) },
        },
      });
    }

    // Cluster 2: Nyamira – PPR cluster (goats)
    const nyamiraGoats = speciesList.find((s) => s.slug === 'goats')!;
    const pprSymptoms = ['fever', 'nasal-discharge', 'mouth-lesions', 'diarrhea', 'coughing'];
    const pprSymptomObjs = symptomList.filter((s) => pprSymptoms.includes(s.key));

    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 14);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      await prisma.report.create({
        data: {
          speciesId: nyamiraGoats.id,
          county: 'Nyamira',
          latitude: -0.57 + (Math.random() - 0.5) * 0.12,
          longitude: 34.93 + (Math.random() - 0.5) * 0.12,
          animalsAffected: Math.floor(Math.random() * 8) + 2,
          animalsDead: Math.floor(Math.random() * 3),
          isSimulated: true,
          createdAt: d,
          symptoms: { create: pprSymptomObjs.slice(0, 3 + Math.floor(Math.random() * 3)).map((s) => ({ symptomId: s.id })) },
        },
      });
    }

    // Cluster 3: Migori – Newcastle Disease (poultry)
    const migoriPoultry = speciesList.find((s) => s.slug === 'poultry')!;
    const ndSymptoms = ['sudden-death', 'drop-in-egg-production', 'watery-droppings', 'difficulty-breathing', 'depression'];
    const ndSymptomObjs = symptomList.filter((s) => ndSymptoms.includes(s.key));

    for (let i = 0; i < 18; i++) {
      const daysAgo = Math.floor(Math.random() * 10);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      await prisma.report.create({
        data: {
          speciesId: migoriPoultry.id,
          county: 'Migori',
          latitude: -1.06 + (Math.random() - 0.5) * 0.12,
          longitude: 34.47 + (Math.random() - 0.5) * 0.12,
          animalsAffected: Math.floor(Math.random() * 30) + 10,
          animalsDead: Math.floor(Math.random() * 10) + 2,
          isSimulated: true,
          createdAt: d,
          symptoms: { create: ndSymptomObjs.slice(0, 3 + Math.floor(Math.random() * 3)).map((s) => ({ symptomId: s.id })) },
        },
      });
    }

    console.log('  ✔ 65 simulated reports across Kisii, Nyamira, and Migori');
  } else {
    console.log(`  ℹ skipped simulated reports (${existingReports} already exist)`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
