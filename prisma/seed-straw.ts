import { PrismaClient, ProductType, RuleField, ProviderType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedStrawReferenceData() {
  console.log('🧬 Seeding AI Straw Verification Reference Data...');

  // 1. Breeds
  const breedsData = [
    { code: 'HO', name: 'Holstein Friesian' },
    { code: 'FR', name: 'Friesian' },
    { code: 'AY', name: 'Ayrshire' },
    { code: 'JE', name: 'Jersey' },
    { code: 'GU', name: 'Guernsey' },
    { code: 'BR', name: 'Boran' },
    { code: 'SA', name: 'Sahiwal' },
    { code: 'SI', name: 'Simmental' },
    { code: 'BS', name: 'Brown Swiss' },
  ];

  for (const b of breedsData) {
    await prisma.breed.upsert({
      where: { code: b.code },
      update: { name: b.name },
      create: b,
    });
  }
  console.log(`✓ Seeded ${breedsData.length} cattle breeds`);

  // 2. Suppliers
  const kagrc = await prisma.supplier.upsert({
    where: { name: 'Kenya Animal Genetic Resources Centre (KAGRC / CAIS)' },
    update: { country: 'Kenya' },
    create: {
      name: 'Kenya Animal Genetic Resources Centre (KAGRC / CAIS)',
      country: 'Kenya',
    },
  });

  const abs = await prisma.supplier.upsert({
    where: { name: 'ABS Global / Genus (Sexcel)' },
    update: { country: 'United States' },
    create: {
      name: 'ABS Global / Genus (Sexcel)',
      country: 'United States',
    },
  });

  const wws = await prisma.supplier.upsert({
    where: { name: 'World Wide Sires / Select Sires' },
    update: { country: 'United States' },
    create: {
      name: 'World Wide Sires / Select Sires',
      country: 'United States',
    },
  });

  const semex = await prisma.supplier.upsert({
    where: { name: 'Semex Genetics' },
    update: { country: 'Canada' },
    create: {
      name: 'Semex Genetics',
      country: 'Canada',
    },
  });

  console.log('✓ Seeded 4 major semen suppliers');

  // 3. Supplier Prefixes
  const prefixes = [
    { prefix: 'KAGRC', supplierId: kagrc.id },
    { prefix: 'CAIS', supplierId: kagrc.id },
    { prefix: 'KE', supplierId: kagrc.id },
    { prefix: 'ABS', supplierId: abs.id },
    { prefix: '29HO', supplierId: abs.id },
    { prefix: '29JE', supplierId: abs.id },
    { prefix: 'SEXCEL', supplierId: abs.id },
    { prefix: 'WWS', supplierId: wws.id },
    { prefix: '7HO', supplierId: wws.id },
    { prefix: '7JE', supplierId: wws.id },
    { prefix: '14HO', supplierId: wws.id },
    { prefix: 'SEMEX', supplierId: semex.id },
    { prefix: '200HO', supplierId: semex.id },
    { prefix: '200JE', supplierId: semex.id },
  ];

  for (const p of prefixes) {
    await prisma.supplierPrefix.upsert({
      where: { prefix: p.prefix },
      update: { supplierId: p.supplierId },
      create: p,
    });
  }
  console.log(`✓ Seeded ${prefixes.length} supplier prefixes`);

  // 4. Label Rules (Sexed markers, Conventional, Beef)
  const rules = [
    {
      field: RuleField.SEXED_MARKER,
      pattern: '\\bSEXED\\b|\\bSEXED\\s*ULTRA\\b|\\b4M\\b|\\bULTRA4M\\b',
      meaning: 'Sexed Female Semen (STgenetics / Global Standard >90% Female Purity)',
      productType: ProductType.SEXED_FEMALE,
      notes: 'Common on imported and private Kenyan straws',
    },
    {
      field: RuleField.SEXED_MARKER,
      pattern: '\\bSEXCEL\\b',
      supplierId: abs.id,
      meaning: 'ABS Sexcel Genus 21st Century Sexed Female Semen',
      productType: ProductType.SEXED_FEMALE,
      notes: 'Proprietary non-laser sexing technology by ABS Global',
    },
    {
      field: RuleField.SEXED_MARKER,
      pattern: '\\bGENDER\\s*SELECTED\\b|\\bFEMALE\\b',
      meaning: 'Gender Selected Female Semen',
      productType: ProductType.SEXED_FEMALE,
      notes: 'Used across European and North American imported straws',
    },
    {
      field: RuleField.SEXED_MARKER,
      pattern: '\\bCONV\\b|\\bCONVENTIONAL\\b',
      meaning: 'Conventional Semen (~50% Female / 50% Male probability)',
      productType: ProductType.CONVENTIONAL,
      notes: 'Standard artificial insemination straw',
    },
    {
      field: RuleField.SEXED_MARKER,
      pattern: '\\bBEEF\\b|\\bBORAN\\b|\\bSAHIWAL\\b|\\bCHAROLAIS\\b|\\bANGUS\\b',
      meaning: 'Beef Terminal Cross Semen',
      productType: ProductType.BEEF,
      notes: 'Used for crossbreeding beef vigor',
    },
  ];

  await prisma.labelRule.deleteMany({});
  for (const r of rules) {
    await prisma.labelRule.create({ data: r });
  }
  console.log(`✓ Seeded ${rules.length} decoding label rules`);

  // 5. Bulls
  const ho = await prisma.breed.findUnique({ where: { code: 'HO' } });
  const ay = await prisma.breed.findUnique({ where: { code: 'AY' } });
  const je = await prisma.breed.findUnique({ where: { code: 'JE' } });
  const sa = await prisma.breed.findUnique({ where: { code: 'SA' } });
  const br = await prisma.breed.findUnique({ where: { code: 'BR' } });

  const bullsData = [
    { name: 'KAGRC SIRIKWA', registrationId: 'KE-HO-0891', breedId: ho?.id, supplierId: kagrc.id },
    { name: 'KAGRC SIMBA', registrationId: 'KE-AY-1042', breedId: ay?.id, supplierId: kagrc.id },
    { name: 'KAGRC BARAKA', registrationId: 'KE-JE-0341', breedId: je?.id, supplierId: kagrc.id },
    { name: 'KAGRC KILIMO', registrationId: 'KE-SA-0512', breedId: sa?.id, supplierId: kagrc.id },
    { name: 'KAGRC BORAN WARRIOR', registrationId: 'KE-BR-0199', breedId: br?.id, supplierId: kagrc.id },
    { name: 'BRAEDALE GOLDWYN', registrationId: 'CANM10705608', breedId: ho?.id, supplierId: semex.id },
    { name: 'PICSTON SHOTTLE', registrationId: 'GBRM598172', breedId: ho?.id, supplierId: wws.id },
    { name: 'VAL-BISSON DOORMAN', registrationId: 'CANM107281711', breedId: ho?.id, supplierId: semex.id },
    { name: 'DE-SU 11236 BALISTO', registrationId: 'USAM70625988', breedId: ho?.id, supplierId: abs.id },
    { name: 'FOREST GLEN ACTION', registrationId: 'USAM111111', breedId: je?.id, supplierId: wws.id },
  ];

  for (const b of bullsData) {
    const existing = await prisma.bull.findFirst({ where: { name: b.name } });
    if (!existing) {
      await prisma.bull.create({ data: b });
    }
  }
  console.log(`✓ Seeded ${bullsData.length} reference pedigree bulls`);

  // 6. Providers (Suppliers & Technicians with WhatsApp click-to-chat numbers)
  const providersData = [
    {
      name: 'KAGRC Central Depo (Lower Kabete)',
      type: ProviderType.SUPPLIER,
      whatsappNumber: '254711223344',
      county: 'Nairobi',
      registered: true,
      supplierId: kagrc.id,
    },
    {
      name: 'ABS Kenya Regional Technical Office',
      type: ProviderType.SUPPLIER,
      whatsappNumber: '254722334455',
      county: 'Nakuru',
      registered: true,
      supplierId: abs.id,
    },
    {
      name: 'Dr. Peter Kamau (KVB Registered AI Tech #1042)',
      type: ProviderType.TECHNICIAN,
      whatsappNumber: '254720123456',
      county: 'Kiambu',
      registered: true,
    },
    {
      name: 'Agnes Chebet (Rift AI Cooperative #88)',
      type: ProviderType.TECHNICIAN,
      whatsappNumber: '254721654321',
      county: 'Uasin Gishu',
      registered: true,
    },
    {
      name: 'Moses Otieno (Highlands Dairy AI Service #401)',
      type: ProviderType.TECHNICIAN,
      whatsappNumber: '254733456789',
      county: 'Kisii',
      registered: true,
    },
  ];

  for (const prov of providersData) {
    const existing = await prisma.provider.findFirst({ where: { name: prov.name } });
    if (!existing) {
      await prisma.provider.create({ data: prov });
    }
  }
  console.log(`✓ Seeded ${providersData.length} verified suppliers & AI technicians`);

  // 7. Price Benchmarks
  const benchmarks = [
    {
      productType: ProductType.CONVENTIONAL,
      minKsh: 800,
      maxKsh: 2000,
      county: 'National',
      source: 'KAGRC & KVB Official Gazette 2026',
      asOf: new Date(),
    },
    {
      productType: ProductType.SEXED_FEMALE,
      minKsh: 3500,
      maxKsh: 8500,
      county: 'National',
      source: 'Kenya Livestock Genetics Board 2026',
      asOf: new Date(),
    },
    {
      productType: ProductType.BEEF,
      minKsh: 600,
      maxKsh: 1500,
      county: 'National',
      source: 'National Beef Breeding Directorate 2026',
      asOf: new Date(),
    },
  ];

  await prisma.priceBenchmark.deleteMany({});
  for (const bm of benchmarks) {
    await prisma.priceBenchmark.create({ data: bm });
  }
  console.log(`✓ Seeded ${benchmarks.length} price benchmarks`);
  console.log('✅ AI Straw Verification Reference Seeding Completed.');
}

if (require.main === module) {
  seedStrawReferenceData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
