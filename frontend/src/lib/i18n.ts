export interface KenyanLanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  counties: string;
}

export const KENYAN_LANGUAGES: KenyanLanguageMeta[] = [
  { code: 'sw', name: 'Kiswahili', nativeName: 'Kiswahili', region: 'National / Official', counties: 'All 47 Counties' },
  { code: 'en', name: 'English', nativeName: 'English', region: 'National / Official', counties: 'All 47 Counties' },
  { code: 'ki', name: 'Kikuyu', nativeName: 'Gĩkũyũ', region: 'Central / Mt Kenya', counties: 'Kiambu, Nyeri, Murang\'a, Kirinyaga, Nyandarua' },
  { code: 'luo', name: 'Luo', nativeName: 'Dholuo', region: 'Nyanza / Lake Victoria', counties: 'Kisumu, Siaya, Homa Bay, Migori' },
  { code: 'luy', name: 'Luhya', nativeName: 'Oluluhyia', region: 'Western Kenya', counties: 'Kakamega, Bungoma, Busia, Vihiga' },
  { code: 'kln', name: 'Kalenjin', nativeName: 'Kalenjin', region: 'Rift Valley Highlands', counties: 'Uasin Gishu, Nandi, Kericho, Bomet, Baringo, Elgeyo Marakwet' },
  { code: 'kam', name: 'Kamba', nativeName: 'Kikamba', region: 'Lower Eastern', counties: 'Machakos, Kitui, Makueni' },
  { code: 'guz', name: 'Kisii', nativeName: 'Ekegusii', region: 'South Nyanza Highlands', counties: 'Kisii, Nyamira' },
  { code: 'mer', name: 'Meru', nativeName: 'Kĩmĩrũ', region: 'Upper Eastern / Mt Kenya', counties: 'Meru, Tharaka-Nithi' },
  { code: 'mas', name: 'Maasai', nativeName: 'Maa (Kimaasai)', region: 'Rift Valley / Pastoralist ASAL', counties: 'Kajiado, Narok, Samburu, Laikipia' },
  { code: 'som', name: 'Somali', nativeName: 'Af-Soomaali', region: 'North Eastern / Pastoralist ASAL', counties: 'Garissa, Wajir, Mandera' },
  { code: 'tuv', name: 'Turkana', nativeName: 'Ng\'aturkana', region: 'North Western / Pastoralist ASAL', counties: 'Turkana' },
  { code: 'orm', name: 'Oromo / Borana', nativeName: 'Afaan Oromoo', region: 'Upper North / Pastoralist ASAL', counties: 'Marsabit, Isiolo, Moyale' },
];

export type InterfaceLang =
  | 'sw'
  | 'en'
  | 'ki'
  | 'luo'
  | 'luy'
  | 'kln'
  | 'kam'
  | 'guz'
  | 'mer'
  | 'mas'
  | 'som'
  | 'tuv'
  | 'orm';

export interface TranslationDictionary {
  appName: string;
  appSubtitle: string;
  selectAnimal: string;
  selectLanguage: string;
  quickTasks: string;
  checkSymptoms: string;
  checkSymptomsDesc: string;
  findVet: string;
  findVetDesc: string;
  feedRation: string;
  feedRationDesc: string;
  outbreakMap: string;
  outbreakMapDesc: string;
  
  // Search & Multi-symptom
  searchPlaceholder: string;
  selectedSymptoms: string;
  clearAll: string;
  viewConditions: string;
  noSymptomsFound: string;
  suggestWord: string;
  pendingLabel: string;
  confirmedLabel: string;
  multiSymptomHint: string;
  smartParseBtn: string;
  commonSignsHeader: string;
  
  // Herd vs Single Scope
  scopeSelectorTitle: string;
  scopeSingle: string;
  scopeHerd: string;
  scopeSingleDesc: string;
  scopeHerdDesc: string;
  herdSizeLabel: string;
  herdOutbreakAlert: string;
  biosecurityTitle: string;

  // Results
  possibleConditions: string;
  seeVetNotice: string;
  emergencyAlert: string;
  firstAidInstructions: string;
  nearbyVets: string;
  callNow: string;
  distance: string;
  noVetsFound: string;
  reportThisCase: string;

  // Ration
  rationTitle: string;
  selectStage: string;
  availableFeeds: string;
  addFeed: string;
  calculateMix: string;
  mixResults: string;
  nutrientTable: string;
  protein: string;
  energy: string;
  calcium: string;
  phosphorus: string;
  met: string;
  short: string;
  over: string;
  gapsTitle: string;
  llmAdviceTitle: string;

  // Contributor & Vet
  contributeTitle: string;
  vetPortal: string;
  login: string;
  pendingTermsQueue: string;
  approve: string;
  reject: string;

  // Reports & Map
  reportTitle: string;
  affectedCount: string;
  deadCount: string;
  county: string;
  submitReport: string;
  simulatedBanner: string;
  quarantineChecklist: string;
}

const baseEnglish: TranslationDictionary = {
  appName: 'Mifugo Health Kenya',
  appSubtitle: 'Livestock Care & Diagnostic Portal for Kenya',
  selectAnimal: 'Which animal needs attention?',
  selectLanguage: 'Choose Search Language',
  quickTasks: 'Clinical Tools & Actions',
  checkSymptoms: 'Check Symptoms',
  checkSymptomsDesc: 'Search multiple signs simultaneously in any Kenyan language',
  findVet: 'Find Nearest Vet',
  findVetDesc: 'Locate verified KVB veterinarians & animal health workers near you',
  feedRation: 'Feed Ration Balancer',
  feedRationDesc: 'Balance low-cost farm feeds & eliminate nutrient gaps',
  outbreakMap: 'Outbreak Intelligence',
  outbreakMapDesc: 'Live epidemiological surveillance across Kenya\'s 47 counties',

  // Search
  searchPlaceholder: 'Type symptoms (e.g. fever, coughing, diarrhea, homa, kukohoa)...',
  selectedSymptoms: 'Selected Symptoms',
  clearAll: 'Clear all',
  viewConditions: 'Evaluate Possible Conditions',
  noSymptomsFound: 'No symptoms found matching your query.',
  suggestWord: 'Suggest this indigenous word',
  pendingLabel: 'Pending vet verification',
  confirmedLabel: 'Verified term',
  multiSymptomHint: 'Enter multiple symptoms separated by comma, "na", or press Enter to add as chips',
  smartParseBtn: 'Parse Multi-Signs',
  commonSignsHeader: 'Browse Signs by Body System',

  // Herd vs Single Scope
  scopeSelectorTitle: 'Assessment Scope',
  scopeSingle: 'Individual Animal',
  scopeHerd: 'Herd / Flock Outbreak',
  scopeSingleDesc: 'Evaluating signs on a single animal',
  scopeHerdDesc: 'Contagious disease risk & biosecurity protocols for groups',
  herdSizeLabel: 'Total Herd / Flock Size',
  herdOutbreakAlert: 'CONTAGIOUS HERD OUTBREAK WARNING: High risk of rapid transmission. Quarantine affected animals immediately!',
  biosecurityTitle: 'Standard Field Biosecurity Protocol',

  // Results
  possibleConditions: 'Clinical Condition Match',
  seeVetNotice: 'These automated suggestions are clinical possibilities, not a definitive diagnosis. Please consult a registered veterinarian. Notifiable epizootic diseases must be reported to the Sub-County Veterinary Officer (SCVO).',
  emergencyAlert: 'EMERGENCY: Immediate veterinary attention required!',
  firstAidInstructions: 'First Aid & Farm Guidance',
  nearbyVets: 'Nearest Certified Veterinary Practitioners',
  callNow: 'Call Vet',
  distance: 'away',
  noVetsFound: 'No vets found in your immediate perimeter. Expanding county search...',
  reportThisCase: 'Log Outbreak Report to County Office',

  // Ration
  rationTitle: 'Feed Ration Balancer',
  selectStage: 'Production Stage',
  availableFeeds: 'Feeds on Your Farm',
  addFeed: 'Add Feed',
  calculateMix: 'Calculate Daily Mix',
  mixResults: 'Balanced Daily Mix per Animal',
  nutrientTable: 'Nutrient Evaluation',
  protein: 'Crude Protein',
  energy: 'Energy',
  calcium: 'Calcium',
  phosphorus: 'Phosphorus',
  met: 'MET',
  short: 'SHORT',
  over: 'SURPLUS',
  gapsTitle: 'Nutrient Deficiencies & Feed Recommendations',
  llmAdviceTitle: 'Advisor Summary in Plain Words',

  // Contributor & Vet
  contributeTitle: 'Suggest Indigenous Language Term',
  vetPortal: 'KVB Vet Verification Portal',
  login: 'Sign In',
  pendingTermsQueue: 'Community Native Terms Pending Approval',
  approve: 'Approve & Confirm',
  reject: 'Reject',

  // Reports & Map
  reportTitle: 'Report Disease Incidence / Outbreak',
  affectedCount: 'Number of Animals Sick',
  deadCount: 'Number of Animals Dead',
  county: 'County / Location',
  submitReport: 'Submit Surveillance Report',
  simulatedBanner: 'Surveillance Mode: Active monitoring clusters for epidemiological prevention.',
  quarantineChecklist: 'Outbreak Biosecurity Checklist',
};

const baseSwahili: TranslationDictionary = {
  ...baseEnglish,
  appName: 'Mifugo Health Kenya',
  appSubtitle: 'Huduma Bora ya Afya na Lishe ya Mifugo Kenya',
  selectAnimal: 'Ni mnyama gani ana shida?',
  selectLanguage: 'Chagua Lugha ya Kutafuta',
  quickTasks: 'Huduma Muhimu',
  checkSymptoms: 'Kagua Dalili',
  checkSymptomsDesc: 'Tafuta dalili nyingi kwa wakati mmoja katika lugha zote za Kenya',
  findVet: 'Tafuta Daktari wa Mifugo',
  findVetDesc: 'Pata madaktari waliosajiliwa na KVB na wataalamu walio karibu nawe',
  feedRation: 'Mshauri wa Lishe ya Mifugo',
  feedRationDesc: 'Sawazisha chakula cha bei nafuu na kurekebisha mapengo ya virutubisho',
  outbreakMap: 'Ramani ya Milipuko ya Magonjwa',
  outbreakMapDesc: 'Fuatilia hali ya milipuko ya magonjwa katika kaunti 47 za Kenya',

  // Search
  searchPlaceholder: 'Andika dalili moja au nyingi (mfano: Homa, kukohoa, kuharisha, vidonda)...',
  selectedSymptoms: 'Dalili Zilizochaguliwa',
  clearAll: 'Futa zote',
  viewConditions: 'Tathmini Magonjwa Yanayowezekana',
  noSymptomsFound: 'Hakuna dalili inayolingana na maneno uliyoandika.',
  suggestWord: 'Pendekeza neno hili la kienyeji',
  pendingLabel: 'Inasubiri uthibitisho wa daktari',
  confirmedLabel: 'Neno lililothibitishwa rasmi',
  multiSymptomHint: 'Unaweza kuandika dalili nyingi ukitenganisha kwa koma au "na", kisha bofya Enter',
  smartParseBtn: 'Changanua Dalili Zote',
  commonSignsHeader: 'Dalili za Kawaida Kulingana na Sehemu ya Mwili',

  // Herd vs Single Scope
  scopeSelectorTitle: 'Upeo wa Tathmini',
  scopeSingle: 'Mnyama Mmoja',
  scopeHerd: 'Kundi Zima / Mluko wa Mifugo',
  scopeSingleDesc: 'Kukagua dalili za mnyama mmoja pekee',
  scopeHerdDesc: 'Tathmini ya mlipuko wa kundi na hatua za kuzuia maambukizi',
  herdSizeLabel: 'Idadi ya Wanyama Kwenye Kundi',
  herdOutbreakAlert: 'TAHADHARI YA MLIPUKO WA KUNDI: Hatari ya maambukizi ya haraka kwa kundi zima. Tenga wanyama wagonjwa mara moja!',
  biosecurityTitle: 'Mwongozo wa Haraka wa Kuzuia Maambukizi',

  // Results
  possibleConditions: 'Magonjwa Yanayowezekana',
  seeVetNotice: 'Haya ni magonjwa yanayowezekana kulingana na dalili, si utambuzi rasmi. Tafadhali muone daktari wa mifugo mara moja. Magonjwa hatari yanapaswa kuripotiwa kwa afisa wa mifugo wa kaunti.',
  emergencyAlert: 'DHARURA YA HARAKA: Mnyama anahitaji matibabu ya daktari bila kuchelewa!',
  firstAidInstructions: 'Huduma ya Kwanza na Maagizo Shambani',
  nearbyVets: 'Madaktari wa Mifugo Walio Karibu Nawe',
  callNow: 'Piga Simu Mara Moja',
  distance: 'kutoka hapa',
  noVetsFound: 'Hakuna daktari aliyepatikana karibu mara moja. Tunapanua eneo la utafutaji...',
  reportThisCase: 'Ripoti Mluko Huu kwa Idara ya Mifugo',

  // Ration
  rationTitle: 'Mchanganyiko Sahihi wa Chakula cha Mifugo',
  selectStage: 'Kiwango cha Uzalishaji',
  availableFeeds: 'Vyakula Vilivyopo Shambani Kwako',
  addFeed: 'Ongeza Chakula',
  calculateMix: 'Piga Hesabu ya Lishe',
  mixResults: 'Kiasi Sahihi cha Kulisha kwa Siku',
  nutrientTable: 'Tathmini ya Virutubisho',
  protein: 'Protini (Crude Protein)',
  energy: 'Nishati (Energy)',
  calcium: 'Kalisi (Calcium)',
  phosphorus: 'Fosfasi (Phosphorus)',
  met: 'IMETOSHA',
  short: 'PUNGUFU',
  over: 'ZIADA',
  gapsTitle: 'Mapengo ya Lishe na Ushauri wa Vyakula',
  llmAdviceTitle: 'Ushauri Rahisi kwa Mkulima',

  // Contributor & Vet
  contributeTitle: 'Pendekeza Neno la Lugha ya Asili',
  vetPortal: 'Sehemu ya Madaktari wa Mifugo (KVB)',
  login: 'Ingia',
  pendingTermsQueue: 'Maneno ya Jamii Yanayosubiri Kuhakikiwa',
  approve: 'Thibitisha Neno',
  reject: 'Kataa Neno',

  // Reports & Map
  reportTitle: 'Ripoti Wanyama Wagonjwa au Vifo',
  affectedCount: 'Idadi ya Wanyama Wagonjwa',
  deadCount: 'Idadi ya Wanyama Waliokufa',
  county: 'Kaunti / Eneo',
  submitReport: 'Tuma Ripoti ya Mluko',
  simulatedBanner: 'Ufuatiliaji: Takwimu za milipuko zinasaidia kuzuia kuenea kwa magonjwa kote nchini.',
  quarantineChecklist: 'Orodha ya Hatua za Usalama wa Mifugo',
};

// Dialect translations customized with native greetings and labels, falling back cleanly
export const translations: Record<InterfaceLang, TranslationDictionary> = {
  en: baseEnglish,
  sw: baseSwahili,
  ki: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Gĩkũyũ)',
    selectAnimal: 'Nĩ nyamũ ĩrĩkũ ĩrĩ na thĩĩna?',
    checkSymptoms: 'Caria Mathĩĩna ma Nyamũ',
    checkSymptomsDesc: 'Caria ndwari na rũthiomi rwa Gĩkũyũ kana Gĩthũngũ',
    findVet: 'Caria Dagitari wa Nyamũ Hakuhĩ',
    scopeSingle: 'Nyamũ Ĩmwe',
    scopeHerd: 'Kĩrĩndĩ Gĩothe / Rũũru',
    searchPlaceholder: 'Andĩka mathĩĩna ta Homa, Gũkorora, Kũharũka...',
  },
  luo: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Dholuo)',
    selectAnimal: 'En jamni mane man-gi tuo?',
    checkSymptoms: 'Rang Ranyisi mag Tuo',
    checkSymptomsDesc: 'Many tuoche gi Dholuo, Kiswahili kata Dhowasungu',
    findVet: 'Many Laktar mar Jamni Machiegni',
    scopeSingle: 'Le Achiel Kende',
    scopeHerd: 'Kwand Jamni / Rombe Duto',
    searchPlaceholder: 'Ndiko ranyisi kaka Liet mar del, Ahoya, Diep...',
  },
  luy: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Oluluhyia)',
    selectAnimal: 'Etsing\'ombe sino silwasi shina?',
    checkSymptoms: 'Lola Eshilolelo shio Bulwale',
    checkSymptomsDesc: 'Yanza amalwale mu Luluhyia, Kiswahili no Mundere',
    findVet: 'Reba Omusawo wa Tsinyasi',
    scopeSingle: 'Inyasi Ndala',
    scopeHerd: 'Lirima Liosi elie Tsinyasi',
    searchPlaceholder: 'Handika eshilolelo shio bulwale...',
  },
  kln: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Kalenjin)',
    selectAnimal: 'Nee tiony ne mnyo?',
    checkSymptoms: 'Cheeng Mionwekab Tuga',
    checkSymptomsDesc: 'Cheeng mionwek eng kutityo nebo Kalenjin',
    findVet: 'Cheeng Daktariit nebo Tuga',
    scopeSingle: 'Tiony Agenge',
    scopeHerd: 'Tuga Tugul / Kwondo',
    searchPlaceholder: 'Sir mionwekguk...',
  },
  kam: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Kikamba)',
    selectAnimal: 'Nĩ ndĩthya yĩva yĩ na ũwau?',
    checkSymptoms: 'Mantha Mawau ma Ndĩthya',
    checkSymptomsDesc: 'Mantha mawau kwa Kĩkamba, Kĩswahili na Kĩthũngũ',
    findVet: 'Mantha Ndakĩtalĩ wa Ndĩthya',
    scopeSingle: 'Ĩthĩyĩ Yĩmwe',
    scopeHerd: 'Mbĩĩ Ya Ndĩthya Syonthe',
    searchPlaceholder: 'Andĩka mawanzo ta Mũrimũ wa mwĩĩ, Kũkua kwoo...',
  },
  guz: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Ekegusii)',
    selectAnimal: 'Neng\'ondi ekiere kiare morwire?',
    checkSymptoms: 'Rora Amanyweno yo Oborwaire',
    checkSymptomsDesc: 'Rora oborwaire ase Ekegusii, Kiswahili na Kiingereza',
    findVet: 'Ronda Daktari Omonene bwe\'Chiombe',
    scopeSingle: 'Enyama eyemo',
    scopeHerd: 'Echombe Chionsi ase Oboriro',
    searchPlaceholder: 'Andika amanyweno kaka Omoremo, Mokororo, Ogosasarara...',
  },
  mer: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Kĩmĩrũ)',
    selectAnimal: 'Nĩ nyamũ ĩrĩkũ ĩrwĩte?',
    checkSymptoms: 'Caria Morĩmũ wa Nyamũ',
    checkSymptomsDesc: 'Caria morĩmũ na Kĩmĩrũ na rũthiomi rwa Nyomba',
    findVet: 'Caria Ndagitari wa Nyamũ',
    scopeSingle: 'Nyamũ Ĩmwe',
    scopeHerd: 'Kĩrĩndĩ kĩa Nyamũ',
    searchPlaceholder: 'Andĩka mathĩna ta Rũhoho, Kũkorora...',
  },
  mas: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Maa)',
    selectAnimal: 'Kaji nkishu naata emueyian?',
    checkSymptoms: 'Ing\'or Ilmueyiaritin loo nkishu',
    checkSymptomsDesc: 'Ing\'or ilmueyiaritin te kutuk e Maa',
    findVet: 'Ing\'oru Daktari le nkishu',
    scopeSingle: 'Enkine / Enkiteng Nabo',
    scopeHerd: 'Nkera Pookin / Enkalo o nkishu',
    searchPlaceholder: 'Sir ilmueyiaritin...',
  },
  som: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Af-Soomaali)',
    selectAnimal: 'Xoolaha kee baa xanuunsanaya?',
    checkSymptoms: 'Baar Calaamadaha Xanuunka',
    checkSymptomsDesc: 'Ka raadi calaamadaha Af-Soomaali, Kiswahili iyo Ingiriis',
    findVet: 'Raadi Dhakhtarka Xoolaha ee ugu dhow',
    scopeSingle: 'Hal Neef oo kaliya',
    scopeHerd: 'Xoolaha oo dhan / Qoyska Xoolaha',
    searchPlaceholder: 'Qor calaamadaha sida qandho, qufac, shuban...',
  },
  tuv: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Ng\'aturkana)',
    selectAnimal: 'Ng\'ibaren ng\'aani edyakaete?',
    checkSymptoms: 'Enyam ng\'idekesyet ng\'una eka ng\'ibaren',
    checkSymptomsDesc: 'Kimat ng\'idekesyet to Ng\'aturkana',
    findVet: 'Kimat Daktari lo eka ng\'ibaren',
    scopeSingle: 'Ebarit epeyi',
    scopeHerd: 'Ng\'ibaren ng\'ulu alalak pooki',
    searchPlaceholder: 'Gir ng\'idekesyet ng\'una...',
  },
  orm: {
    ...baseSwahili,
    appName: 'Mifugo Health Kenya (Afaan Oromoo / Borana)',
    selectAnimal: 'Beeyladoota kamtu dhukkubsate?',
    checkSymptoms: 'Mallattoolee Dhukkubaa Barbaadi',
    checkSymptomsDesc: 'Afaan Oromootiin dhukkuba beeyladaa qoradhaa',
    findVet: 'Dooktoora Beeyladaa Barbaadi',
    scopeSingle: 'Beeylada Tokko Qofa',
    scopeHerd: 'Horii Hundaa / Karra Horii',
    searchPlaceholder: 'Mallattoo barreessi akka qaama gubaa, qufaa, garaa kaasaa...',
  },
};
