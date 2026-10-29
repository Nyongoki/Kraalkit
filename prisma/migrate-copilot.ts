import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Migrating Database for Vet Co-Pilot ---');

  // Check columns on Disease table and add missing ones
  const columns: Array<{ Field: string }> = await prisma.$queryRawUnsafe('DESCRIBE Disease');
  const fieldNames = new Set(columns.map((c) => c.Field));
  console.log('Existing columns on Disease:', Array.from(fieldNames));

  const addColumnIfNotExists = async (colName: string, colDef: string) => {
    if (!fieldNames.has(colName)) {
      console.log(`Adding column ${colName}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE Disease ADD COLUMN ${colName} ${colDef}`);
      console.log(`Column ${colName} added.`);
    } else {
      console.log(`Column ${colName} already exists.`);
    }
  };

  await addColumnIfNotExists('nameSw', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('firstAidSw', 'TEXT NULL');
  await addColumnIfNotExists('fallbackAdvice', 'TEXT NULL');
  await addColumnIfNotExists('fallbackAdviceSw', 'TEXT NULL');
  await addColumnIfNotExists('reviewed', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await addColumnIfNotExists('reviewedBy', 'VARCHAR(255) NULL');
  await addColumnIfNotExists('firstAidVersion', 'INT NOT NULL DEFAULT 1');

  // Ensure 'mastitis' exists in Disease table
  const mastitisExisting = await prisma.disease.findUnique({ where: { slug: 'mastitis' } });
  if (!mastitisExisting) {
    console.log('Creating mastitis disease record...');
    const mastitis = await prisma.disease.create({
      data: {
        slug: 'mastitis',
        name: 'Mastitis',
        nameSw: 'Kuvimba kwa kiwele na chuchu',
        urgency: 'MEDIUM',
        notifiable: false,
        firstAid:
          'Milk the affected quarter last and discard the abnormal milk safely. Apply a clean warm compress to the swollen quarter to reduce discomfort. Disinfect teat ends with an approved post-milking dip. Call your veterinarian to examine the udder and prescribe proper intramammary care.',
        firstAidSw:
          'Kama kiwele kimevimba, kamua sehemu iliyoathirika mwisho na umwage maziwa hayo kwa usalama. Kanda kiwele kwa kitambaa safi chenye maji ya vuguvugu kupunguza maumivu. Chovya ncha za chuchu kwenye dawa ya kuua viini baada ya kukamua. Wasiliana na daktari wa mifugo akague kiwele na kuagiza matibabu sahihi.',
        reviewed: true,
        reviewedBy: 'KVB Registered Vet Advisory Panel',
        firstAidVersion: 1,
      },
    });

    // Link mastitis to cattle, goats, sheep
    const species = await prisma.species.findMany({
      where: { slug: { in: ['dairy-cattle', 'goats', 'sheep'] } },
    });
    for (const sp of species) {
      await prisma.diseaseSpecies.upsert({
        where: { diseaseId_speciesId: { diseaseId: mastitis.id, speciesId: sp.id } },
        create: { diseaseId: mastitis.id, speciesId: sp.id },
        update: {},
      });
    }

    // Link mastitis to symptoms: swollen-teats (or milk-drop, fever)
    const syms = await prisma.symptom.findMany({
      where: { key: { in: ['milk-drop', 'fever'] } },
    });
    for (const sym of syms) {
      await prisma.diseaseSymptom.upsert({
        where: { diseaseId_symptomId: { diseaseId: mastitis.id, symptomId: sym.id } },
        create: { diseaseId: mastitis.id, symptomId: sym.id, weight: 3 },
        update: {},
      });
    }
  }

  // Ensure 'gumboro' exists in Disease table
  const gumboroExisting = await prisma.disease.findUnique({ where: { slug: 'gumboro' } });
  if (!gumboroExisting) {
    console.log('Creating gumboro disease record...');
    const gumboro = await prisma.disease.create({
      data: {
        slug: 'gumboro',
        name: 'Gumboro (Infectious Bursal Disease)',
        nameSw: 'Ugonjwa wa Gumboro',
        urgency: 'HIGH',
        notifiable: false,
        firstAid:
          'Isolate affected birds and provide clean water with multivitamins and electrolytes to fight dehydration. Clean and sanitize drinking equipment daily to prevent secondary contamination. Maintain a warm, draft-free brooder environment for recovering chicks. Contact a veterinarian for flock mortality assessment and future vaccination planning.',
        firstAidSw:
          'Tenga ndege walioathirika na uwape maji safi yenye vitamini na chumvichumvi ili kupunguza upungufu wa maji mwilini. Safisha vyombo vya kunywea maji kila siku kuzuia maambukizi zaidi. Weka banda katika hali ya joto bila upepo mkali kwa vifaranga vinavyopona. Wasiliana na daktari wa mifugo kwa tathmini ya vifo na mpango wa chanjo ya siku zijazo.',
        reviewed: true,
        reviewedBy: 'KVB Registered Vet Advisory Panel',
        firstAidVersion: 1,
      },
    });

    const poultrySp = await prisma.species.findUnique({ where: { slug: 'poultry' } });
    if (poultrySp) {
      await prisma.diseaseSpecies.upsert({
        where: { diseaseId_speciesId: { diseaseId: gumboro.id, speciesId: poultrySp.id } },
        create: { diseaseId: gumboro.id, speciesId: poultrySp.id },
        update: {},
      });
    }
  }

  // Seed Tier 1: FMD, ECF, Newcastle
  await prisma.disease.updateMany({
    where: { slug: 'foot-and-mouth' },
    data: {
      nameSw: 'Ugonjwa wa Miguu na Midomo',
      firstAid:
        'Separate sick animals from the herd immediately. Do not move animals or milk off the farm. Wash hands and boots before leaving the sick area. Contact your local veterinarian for supportive care.',
      firstAidSw:
        'Tenga wanyama wagonjwa kutoka kwa kundi mara moja. Usisafirishe wanyama wala maziwa kutoka shambani. Osha mikono na viatu kabla ya kutoka eneo la wagonjwa. Wasiliana na daktari wa mifugo mara moja.',
      reviewed: true,
      reviewedBy: 'KVB Registered Vet Advisory Panel',
      firstAidVersion: 1,
      notifiable: true,
    },
  });

  await prisma.disease.updateMany({
    where: { slug: 'east-coast-fever' },
    data: {
      nameSw: 'Homa ya Kukauka (Ndigana Kali)',
      firstAid:
        'Call your veterinarian immediately because this condition can be fatal without prompt care. Keep the sick animal in a shaded, sheltered pen with clean water. Restrict animal movement to prevent tick dispersal on pasture. Do not administer unprescribed home remedies.',
      firstAidSw:
        'Piga simu kwa daktari wa mifugo haraka sana kwani ugonjwa huu huua bila huduma ya mapema. Weka mnyama mgonjwa kivulini penye hewa safi na maji safi. Zuia mwendo wa mifugo ili kuzuia kuenea kwa kupe machungani. Usitumie dawa za kienyeji zisizothibitishwa.',
      reviewed: true,
      reviewedBy: 'KVB Registered Vet Advisory Panel',
      firstAidVersion: 1,
      notifiable: true,
    },
  });

  await prisma.disease.updateMany({
    where: { slug: 'newcastle-disease' },
    data: {
      nameSw: 'Kideri (Mdondo)',
      firstAid:
        'Isolate all sick birds in a separate quarantine coop away from the healthy flock. Strictly restrict visitors and disinfect footwear before entering poultry pens. Dispose of dead birds immediately by deep burial or burning. Notify the local veterinary officer and vaccinate unaffected birds if advised.',
      firstAidSw:
        'Tenga ndege wote wagonjwa kwenye banda tofauti mbali na kuku wazima. Zuia wageni kuingia na safisha viatu kabla ya kuingia bandani. Zika mzoga wa kuku waliokufa ardhini kwa kina kirefu au choma moto mara moja. Toa taarifa kwa afisa mifugo na chanja kuku ambao hawajaathirika kama itashauriwa.',
      reviewed: true,
      reviewedBy: 'KVB Registered Vet Advisory Panel',
      firstAidVersion: 1,
      notifiable: true,
    },
  });

  // Seed Tier 2: CCPP, PPR
  await prisma.disease.updateMany({
    where: { slug: 'contagious-caprine-pleuropneumonia' },
    data: {
      nameSw: 'Homa ya Mapafu ya Mbuzi (CCPP)',
      firstAid:
        'Isolate coughing goats in a dry, well-ventilated shelter immediately. Prevent communal watering and grazing with neighboring goat herds. Contact your veterinarian promptly as early intervention is essential. Report the suspected outbreak to your sub-county livestock office.',
      firstAidSw:
        'Tenga mbuzi wanaokohoa kwenye banda kavu lenye hewa ya kutosha mara moja. Zuia mbuzi kunywa maji au kuchunga pamoja na mbuzi wa majirani. Wasiliana na daktari wa mifugo mara moja kwani huduma ya mapema ni muhimu. Ripoti mlipuko huu kwa afisa wa mifugo wa kaunti ndogo.',
      reviewed: true,
      reviewedBy: 'KVB Registered Vet Advisory Panel',
      firstAidVersion: 1,
      notifiable: true,
    },
  });

  await prisma.disease.updateMany({
    where: { slug: 'peste-des-petits-ruminants' },
    data: {
      nameSw: 'Tauni ya Mbuzi na Kondoo (PPR)',
      firstAid:
        'Isolate all affected goats and sheep in an enclosed quarantine area. Provide clean fresh drinking water and soft, palatable forage. Disinfect feed troughs and footwear daily to curb viral transmission. Report immediately to the sub-county veterinary director.',
      firstAidSw:
        'Tenga mbuzi na kondoo wote walioathirika kwenye eneo maalum la karantini. Wape maji safi ya kunywa na nyasi laini zinazovutia kula. Safisha vyombo vya chakula na viatu kila siku kuzuia kuenea kwa virusi. Toa taarifa mara moja kwa mkurugenzi wa mifugo wa kaunti ndogo.',
      reviewed: true,
      reviewedBy: 'KVB Registered Vet Advisory Panel',
      firstAidVersion: 1,
      notifiable: true,
    },
  });

  // Strict Rule: Do NOT seed anthrax or blackleg advice unless vet provides text.
  // Set firstAid to null, reviewed to false.
  await prisma.disease.updateMany({
    where: { slug: { in: ['anthrax', 'blackleg'] } },
    data: {
      firstAid: null,
      firstAidSw: null,
      fallbackAdvice: null,
      fallbackAdviceSw: null,
      reviewed: false,
      reviewedBy: null,
    },
  });

  // Mark all remaining unreviewed diseases with clearly marked placeholder text
  await prisma.disease.updateMany({
    where: {
      slug: {
        notIn: [
          'foot-and-mouth',
          'east-coast-fever',
          'mastitis',
          'newcastle-disease',
          'contagious-caprine-pleuropneumonia',
          'peste-des-petits-ruminants',
          'gumboro',
          'anthrax',
          'blackleg',
        ],
      },
    },
    data: {
      reviewed: false,
      firstAid:
        '[PLACEHOLDER - Pending review by KVB registered veterinarian. Please consult a qualified vet immediately for professional clinical guidance.]',
      firstAidSw:
        '[MAELEZO YA MUDA - Inasubiri uthibitisho wa daktari wa mifugo wa KVB. Tafadhali muone daktari wa mifugo mara moja kupata ushauri sahihi.]',
    },
  });

  console.log('--- Migration and Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
