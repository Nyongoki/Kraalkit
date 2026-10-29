import {
  buildAllowedNumbersSet,
  validateCopilotOutput,
} from './src/lib/copilotGuardrails';
import {
  generateCacheKey,
  getCachedExplanation,
  setCachedExplanation,
  getGoldenTupleMatch,
} from './src/lib/copilotCache';

async function runTests() {
  console.log('=== RUNNING VET CO-PILOT TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`  PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  FAIL: ${msg}`);
      failed++;
    }
  };

  // 1. Guardrail test: Allowed numbers set
  console.log('Test 1: Allowed Numbers Set');
  const allowed = buildAllowedNumbersSet({
    total: 25,
    sick: 4,
    dead: 0,
    symptomCounts: [4, 4, 3],
    matchedKeySigns: 3,
    totalKeySigns: 4,
  });
  assert(allowed.has(25), 'Allowed set contains total (25)');
  assert(allowed.has(4), 'Allowed set contains sick (4)');
  assert(allowed.has(0), 'Allowed set contains dead (0)');
  assert(allowed.has(3), 'Allowed set contains symptom count (3)');
  assert(allowed.has(21), 'Allowed set contains derived healthy count 25 - 4 = 21');
  assert(!allowed.has(88), 'Allowed set rejects unauthorized number (88)');
  assert(!allowed.has(99), 'Allowed set rejects unauthorized number (99)');

  // 2. Guardrail test: Valid output passes
  console.log('\nTest 2: Valid Output Schema and Rules');
  const validOutput = {
    whyRankedFirst: 'Three key signs match foot and mouth disease. 4 of 25 cattle are affected, which fits the pattern of herd transmission.',
    questionsForVet: [
      'Can you take a sample to evaluate the sick cattle?',
      'How should we isolate the 21 remaining cattle?',
      'What biosecurity precautions should we maintain for equipment?'
    ],
  };
  const validRes = validateCopilotOutput(validOutput, allowed);
  assert(validRes.isValid, 'Valid output passes guardrail check');

  // 3. Guardrail test: Unauthorized number rejected
  console.log('\nTest 3: Rejection of Unauthorized Numbers');
  const badNumberOutput = {
    whyRankedFirst: 'Three key signs match. Exactly 88 cattle have symptoms.',
    questionsForVet: ['Question 1?', 'Question 2?', 'Question 3?'],
  };
  const badNumRes = validateCopilotOutput(badNumberOutput, allowed);
  assert(!badNumRes.isValid && badNumRes.reason?.includes('Unauthorized digit'), 'Rejects unauthorized number 88');

  // 4. Guardrail test: Number words in English and Swahili
  console.log('\nTest 4: Number Words Filter');
  const badWordOutput = {
    whyRankedFirst: 'Seven cows have high fever.',
    questionsForVet: ['Can you examine the herd?', 'How to isolate the sick animals?', 'What precautions should we take?'],
  };
  const badWordRes = validateCopilotOutput(badWordOutput, allowed);
  assert(!badWordRes.isValid && badWordRes.reason?.includes('Unauthorized number word'), 'Rejects unauthorized English number word "seven"');

  const badSwWordOutput = {
    whyRankedFirst: 'Ng\'ombe saba wana homa kali.',
    questionsForVet: ['Je, unaweza kukagua mifugo?', 'Tufanye nini kuwatenga wagonjwa?', 'Ni tahadhari zipi tuchukue?'],
  };
  const badSwRes = validateCopilotOutput(badSwWordOutput, allowed);
  assert(!badSwRes.isValid && badSwRes.reason?.includes('Unauthorized number word'), 'Rejects unauthorized Swahili number word "saba"');

  // 5. Guardrail test: Dosage and unit rejection
  console.log('\nTest 5: Dosage and Unit Rejection');
  const dosageOutput = {
    whyRankedFirst: 'Give 500mg of oral solution immediately.',
    questionsForVet: ['Can you examine the cows?', 'How should we isolate them?', 'What precautions should we take?'],
  };
  const dosageRes = validateCopilotOutput(dosageOutput, allowed);
  assert(!dosageRes.isValid && dosageRes.reason?.includes('Dosage'), 'Rejects dosage unit "500mg"');

  const ccOutput = {
    whyRankedFirst: 'Administer 10 ml of liquid to the cattle.',
    questionsForVet: ['Can you examine the cows?', 'How should we isolate them?', 'What precautions should we take?'],
  };
  const ccRes = validateCopilotOutput(ccOutput, allowed);
  assert(!ccRes.isValid && ccRes.reason?.includes('Dosage'), 'Rejects measurement unit "10 ml"');

  // 6. Guardrail test: Percentage rejection
  console.log('\nTest 6: Percentage Rejection');
  const percentOutput = {
    whyRankedFirst: 'There is an 80% chance this is FMD.',
    questionsForVet: ['Can you examine the cows?', 'How should we isolate them?', 'What precautions should we take?'],
  };
  const percentRes = validateCopilotOutput(percentOutput, allowed);
  assert(!percentRes.isValid && percentRes.reason?.includes('Percentage'), 'Rejects percentage sign "%"');

  const asilimiaOutput = {
    whyRankedFirst: 'Kuna uwezekano wa asilimia hamsini kuwa huu ni ugonjwa wa kideri.',
    questionsForVet: ['Je, unaweza kukagua mifugo?', 'Tufanye nini kuwatenga wagonjwa?', 'Ni tahadhari zipi tuchukue?'],
  };
  const asilimiaRes = validateCopilotOutput(asilimiaOutput, allowed);
  assert(!asilimiaRes.isValid && asilimiaRes.reason?.includes('Percentage'), 'Rejects Swahili percentage word "asilimia"');

  // 7. Guardrail test: Drug and treatment term rejection
  console.log('\nTest 7: Drug and Treatment Term Rejection');
  const drugOutput = {
    whyRankedFirst: 'Start treatment with antibiotic immediately.',
    questionsForVet: ['Can you examine the cows?', 'How should we isolate them?', 'What precautions should we take?'],
  };
  const drugRes = validateCopilotOutput(drugOutput, allowed);
  assert(!drugRes.isValid && drugRes.reason?.includes('Banned drug'), 'Rejects drug term "antibiotic"');

  const swDrugOutput = {
    whyRankedFirst: 'Toa dawa na sindano za kuzuia maambukizi.',
    questionsForVet: ['Je, unaweza kukagua mifugo?', 'Tufanye nini kuwatenga wagonjwa?', 'Ni tahadhari zipi tuchukue?'],
  };
  const swDrugRes = validateCopilotOutput(swDrugOutput, allowed);
  assert(!swDrugRes.isValid && swDrugRes.reason?.includes('Banned drug'), 'Rejects Swahili drug term "dawa"');

  // 8. Guardrail test: Certainty phrases rejection
  console.log('\nTest 8: Certainty Phrases Rejection');
  const certaintyOutput = {
    whyRankedFirst: 'Your herd definitely has foot and mouth disease.',
    questionsForVet: ['Can you examine the cows?', 'How should we isolate them?', 'What precautions should we take?'],
  };
  const certRes = validateCopilotOutput(certaintyOutput, allowed);
  assert(!certRes.isValid && certRes.reason?.includes('certainty'), 'Rejects certainty phrase "definitely"');

  const swCertOutput = {
    whyRankedFirst: 'Bila shaka mifugo yako imeugua ugonjwa huu.',
    questionsForVet: ['Je, unaweza kukagua mifugo?', 'Tufanye nini kuwatenga wagonjwa?', 'Ni tahadhari zipi tuchukue?'],
  };
  const swCertRes = validateCopilotOutput(swCertOutput, allowed);
  assert(!swCertRes.isValid && swCertRes.reason?.includes('certainty'), 'Rejects Swahili certainty phrase "bila shaka"');

  // 9. Guardrail test: questionsForVet count must be exactly 3
  console.log('\nTest 9: Questions Count Rule');
  const twoQuestionsOutput = {
    whyRankedFirst: 'Signs are consistent with foot and mouth disease.',
    questionsForVet: ['Question 1?', 'Question 2?'],
  };
  const twoQRes = validateCopilotOutput(twoQuestionsOutput, allowed);
  assert(!twoQRes.isValid && twoQRes.reason?.includes('exactly 3'), 'Rejects questionsForVet with 2 questions');

  // 10. Cache test: Cache key hash and lookup
  console.log('\nTest 10: Cache Key Generation & Preload');
  const cacheKey = generateCacheKey({
    promptVersion: 'v1.0',
    modelName: 'rax-4.0',
    speciesId: 1,
    conditionId: 1,
    language: 'en',
    total: 25,
    sick: 4,
    dead: 0,
    symptomPairs: [{ symptomId: 1, count: 4 }, { symptomId: 2, count: 3 }],
    firstAidVersion: 1,
  });
  assert(typeof cacheKey === 'string' && cacheKey.length === 64, 'Generated 64-char SHA-256 cache key');

  // Test golden tuple lookup
  const goldenMatch = getGoldenTupleMatch({
    speciesId: 1,
    conditionId: 1,
    language: 'en',
    total: 25,
    sick: 4,
  });
  assert(Boolean(goldenMatch && goldenMatch.questionsForVet.length === 3), 'Golden demo tuple matched for FMD (25 total, 4 sick)');

  // 11. End-to-End Route Integration Tests via live Express instance
  console.log('\nTest 11: Route E2E Integration - Cattle FMD (Tier 1 Reviewed)');
  const express = require('express');
  const copilotRouter = require('./src/routes/copilot').default;
  const prisma = require('./src/lib/prisma').default;

  const app = express();
  app.use(express.json());
  app.use('/api/copilot', copilotRouter);

  const http = require('http');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(null)));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 11. Typical case: Cattle FMD
    const fmdDisease = await prisma.disease.findUnique({ where: { slug: 'foot-and-mouth' } });
    const fmdRes = await fetch(`${baseUrl}/api/copilot/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speciesId: 1,
        language: 'en',
        conditionId: fmdDisease.id,
        herd: { total: 25, sick: 4, dead: 0 },
        symptoms: [{ symptomId: 1, count: 4 }, { symptomId: 2, count: 4 }, { symptomId: 3, count: 3 }],
      }),
    });
    assert(fmdRes.status === 200, 'FMD Route returns HTTP 200');
    const fmdJson = await fmdRes.json();
    assert(fmdJson.hasVettedAdvice === true, 'FMD hasVettedAdvice is true');
    assert(fmdJson.reviewed === true, 'FMD reviewed is true');
    assert(Array.isArray(fmdJson.whatToDoNow) && fmdJson.whatToDoNow.length >= 3, 'FMD whatToDoNow contains vet-reviewed steps');
    assert(fmdJson.questionsForVet.length === 3, 'FMD questionsForVet has exactly 3 questions');
    assert(typeof fmdJson.reportNotice === 'string' && fmdJson.reportNotice.includes('notifiable'), 'FMD includes notifiable disease report notice');
    assert(typeof fmdJson.seeVetNotice === 'string', 'FMD includes seeVetNotice');
    assert(typeof fmdJson.disclaimer === 'string', 'FMD includes disclaimer');

    // 12. Anthrax Safety Rule Test (firstAid is null, reviewed is false)
    console.log('\nTest 12: Anthrax Safety Rule (Unreviewed, No First Aid)');
    const anthraxDisease = await prisma.disease.findUnique({ where: { slug: 'anthrax' } });
    if (anthraxDisease) {
      const anthraxRes = await fetch(`${baseUrl}/api/copilot/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speciesId: 1,
          language: 'en',
          conditionId: anthraxDisease.id,
          herd: { total: 20, sick: 2, dead: 1 },
          symptoms: [{ symptomId: 1, count: 2 }],
        }),
      });
      assert(anthraxRes.status === 200, 'Anthrax Route returns HTTP 200');
      const anthraxJson = await anthraxRes.json();
      assert(anthraxJson.hasVettedAdvice === false, 'Anthrax hasVettedAdvice is false');
      assert(anthraxJson.reviewed === false, 'Anthrax reviewed is false');
      assert(anthraxJson.whatToDoNow.length === 0, 'Anthrax whatToDoNow is EMPTY (strict safety rule)');
      assert(typeof anthraxJson.seeVetNotice === 'string', 'Anthrax see-a-vet notice is present');
    }

    // 13. Swahili Demo Case: Poultry Newcastle
    console.log('\nTest 13: Swahili Demo Case - Newcastle Poultry');
    const newcastleDisease = await prisma.disease.findUnique({ where: { slug: 'newcastle-disease' } });
    const poultrySpecies = await prisma.species.findUnique({ where: { slug: 'poultry' } });
    if (newcastleDisease && poultrySpecies) {
      const ncRes = await fetch(`${baseUrl}/api/copilot/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speciesId: poultrySpecies.id,
          language: 'sw',
          conditionId: newcastleDisease.id,
          herd: { total: 100, sick: 30, dead: 5 },
          symptoms: [{ symptomId: 1, count: 30 }],
        }),
      });
      assert(ncRes.status === 200, 'Newcastle SW Route returns HTTP 200');
      const ncJson = await ncRes.json();
      assert(ncJson.hasVettedAdvice === true, 'Newcastle hasVettedAdvice is true');
      assert(ncJson.questionsForVet.length === 3, 'Newcastle SW questionsForVet has 3 questions');
      assert(ncJson.seeVetNotice.includes('daktari wa mifugo'), 'Newcastle seeVetNotice is in Kiswahili');
      assert(ncJson.reportNotice && ncJson.reportNotice.includes('kuripotiwa'), 'Newcastle reportNotice is in Kiswahili');
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
