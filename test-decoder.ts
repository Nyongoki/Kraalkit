import { decodeStrawText } from './src/lib/strawDecoder';

async function runTests() {
  console.log('🧪 Testing AI Straw Decoder Engine...\n');

  const testCases = [
    {
      title: 'Real KAGRC Friesian Conventional Straw',
      text: 'KAGRC FR SIRIKWA B2024-09 CONV',
      county: 'Kiambu',
    },
    {
      title: 'ABS Sexcel Sexed Female Straw with lookalike 0 for O',
      text: '29H0 ABS SEXCEL DOORMAN LOT-8812',
      county: 'Nakuru',
    },
    {
      title: 'WWS Select Sires High Purity 4M Ultra Straw',
      text: '7HO WWS GOLDWYN 4M SEXED 99201',
      county: 'Uasin Gishu',
    },
    {
      title: 'KAGRC Sahiwal Beef Cross Straw',
      text: 'KAGRC SA KILIMO 89201 BEEF',
      county: 'Machakos',
    },
    {
      title: 'Fuzzy Bull Name Match with Typo',
      text: 'SEMEX HO D00RMAN BATCH-4401',
      county: 'Kisii',
    },
  ];

  for (const tc of testCases) {
    console.log(`--- [TEST: ${tc.title}] ---`);
    console.log(`Input: "${tc.text}"`);
    const res = await decodeStrawText(tc.text, tc.county);
    console.log(`Cleaned: "${res.cleanedText}"`);
    console.log(`Overall Confidence: ${res.overallConfidence}`);
    console.log(`Breed:`, res.breed?.meaning || 'NOT RECOGNIZED');
    console.log(`Supplier:`, res.supplier?.meaning || 'NOT RECOGNIZED');
    console.log(`Bull:`, res.bull?.meaning || 'NOT RECOGNIZED');
    console.log(`Product Type:`, res.productType.meaning);
    console.log(`Batch:`, res.batchOrSerial?.value || 'NOT RECOGNIZED');
    console.log(`Price Benchmark:`, res.priceBenchmark ? `KSh ${res.priceBenchmark.minKsh} - ${res.priceBenchmark.maxKsh}` : 'N/A');
    if (res.cautionMessage) {
      console.log(`⚠️ Alert:`, res.cautionMessage);
    }
    console.log('\n');
  }
}

runTests()
  .catch((e) => console.error(e))
  .finally(() => process.exit(0));
