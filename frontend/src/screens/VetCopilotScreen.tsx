import React from 'react';
import { useSession } from '../store/sessionContext';
import { ScreenTab } from '../components/Navigation';
import {
  Sparkles,
  Stethoscope,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  PawPrint,
  Users,
  Search,
  CheckCircle2,
  Biohazard,
  FileText,
  Activity,
  HeartPulse,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface VetCopilotScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const VetCopilotScreen: React.FC<VetCopilotScreenProps> = ({ setCurrentTab }) => {
  const {
    currentUser,
    openAuthModal,
    selectedSpecies,
    setSelectedSpecies,
    selectedSymptoms,
    clearSymptoms,
    addSymptom,
    isHerd,
    setIsHerd,
    setHerdSize,
    setAffectedCount,
    setAnimalInfo,
  } = useSession();

  // Benchmark Clinical Presets for instant AI testing
  const benchmarkCases = [
    {
      id: 'ecf-pneumonia',
      title: 'Dairy Cattle: High Fever & Respiratory Signs',
      species: { id: 1, slug: 'dairy-cattle', name: 'Dairy Cattle' },
      animalTag: 'Cow #04 (Lactating)',
      isHerd: false,
      herdTotal: 1,
      sickCount: 1,
      signs: [
        { id: 1, key: 'fever', nameEn: 'Fever', matchedTerm: 'Homa kali' },
        { id: 2, key: 'nasal-discharge', nameEn: 'Nasal Discharge', matchedTerm: 'Makamasi' },
        { id: 3, key: 'coughing', nameEn: 'Coughing', matchedTerm: 'Kukohoa' },
        { id: 6, key: 'lameness', nameEn: 'Lameness', matchedTerm: 'Kutechemea' },
      ],
      differentialHint: 'Top matches: Pneumonia & East Coast Fever',
      urgency: 'HIGH',
      badge: 'Common Dairy Scenario',
    },
    {
      id: 'fmd-vesicular',
      title: 'Dairy Cattle: Blisters, Salivation & Lameness',
      species: { id: 1, slug: 'dairy-cattle', name: 'Dairy Cattle' },
      animalTag: 'Herd Pen B',
      isHerd: true,
      herdTotal: 18,
      sickCount: 4,
      signs: [
        { id: 9, key: 'mouth-lesions', nameEn: 'Mouth Lesions', matchedTerm: 'Vidonda kinywani' },
        { id: 10, key: 'foot-lesions', nameEn: 'Foot Lesions', matchedTerm: 'Vidonda miguuni' },
        { id: 1, key: 'fever', nameEn: 'Fever', matchedTerm: 'Homa kali' },
        { id: 6, key: 'lameness', nameEn: 'Lameness', matchedTerm: 'Kutechemea' },
      ],
      differentialHint: 'Top match: Foot and Mouth Disease (FMD)',
      urgency: 'EMERGENCY',
      badge: 'Notifiable Epizootic',
    },
    {
      id: 'ccpp-goats',
      title: 'Goats: Coughing & Severe Labored Breathing',
      species: { id: 2, slug: 'goats', name: 'Goats' },
      animalTag: 'Flock Doe #12',
      isHerd: true,
      herdTotal: 30,
      sickCount: 6,
      signs: [
        { id: 18, key: 'difficulty-breathing', nameEn: 'Difficulty Breathing', matchedTerm: 'Kupumua kwa shida' },
        { id: 3, key: 'coughing', nameEn: 'Coughing', matchedTerm: 'Kukohoa' },
        { id: 1, key: 'fever', nameEn: 'Fever', matchedTerm: 'Homa kali' },
      ],
      differentialHint: 'Top match: CCPP (Contagious Caprine Pleuropneumonia)',
      urgency: 'HIGH',
      badge: 'Small Ruminant Urgent',
    },
    {
      id: 'poultry-newcastle',
      title: 'Poultry: Sudden Paralysis & Watery Droppings',
      species: { id: 4, slug: 'poultry', name: 'Poultry' },
      animalTag: 'Layer Flock #2',
      isHerd: true,
      herdTotal: 120,
      sickCount: 15,
      signs: [
        { id: 30, key: 'paralysis', nameEn: 'Paralysis', matchedTerm: 'Kupooza' },
        { id: 28, key: 'watery-droppings', nameEn: 'Watery Droppings', matchedTerm: 'Kinyesi chenye maji' },
        { id: 15, key: 'depression', nameEn: 'Depression', matchedTerm: 'Udhaifu' },
      ],
      differentialHint: 'Top match: Newcastle Disease',
      urgency: 'EMERGENCY',
      badge: 'High Mortality Risk',
    },
  ];

  const handleRunPreset = (preset: typeof benchmarkCases[0]) => {
    setSelectedSpecies(preset.species);
    setAnimalInfo({
      nameOrTag: preset.animalTag,
      stage: preset.species.slug === 'poultry' ? 'Layer (Adult)' : 'Adult',
      age: 'Adult',
    });
    setIsHerd(preset.isHerd);
    setHerdSize(preset.herdTotal);
    setAffectedCount(preset.sickCount);

    clearSymptoms();
    preset.signs.forEach((s) => {
      addSymptom(s);
    });

    setCurrentTab('results');
  };

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Hero Lock Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-500/30 relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Authentication Required • KVB Clinical AI</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Vet Co-Pilot Diagnostic Assistant
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              AI-powered livestock differential diagnostics, vetted on-farm supportive first-aid, and targeted clinical consult interview questions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4 text-emerald-950" />
                <span>Sign In to Access Vet Co-Pilot</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center gap-2 border border-white/20 transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-emerald-300" />
                <span>Create Free Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Why Authentication is Required Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Why is Vet Co-Pilot restricted to logged-in users?
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                In adherence to Kenya Veterinary Board (KVB) regulations and responsible clinical AI standards:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-black">Clinical Traceability & Accountability</strong>
                <span>Links patient triage sessions to specific farmer profiles and registered county locations for epidemiological monitoring.</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-black">Zero Unprescribed Drug Abuse</strong>
                <span>Ensures clinical AI outputs remain informational and supportive rather than misused for unauthorized antibiotic administration.</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <Users className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-black">Practitioner Verification</strong>
                <span>Allows verified KVB field veterinarians to review community submissions and provide professional oversight.</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-black">Encrypted Case Records</strong>
                <span>Saves clinical differential histories and herd mortality data securely under your encrypted farm ledger.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Locked Preview of Clinical Benchmarks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Clinical Diagnostic Capabilities (Preview)</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Log in to test these benchmark clinical scenarios with the RAX-4.0 AI model.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>Sign in to unlock all cases →</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {benchmarkCases.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 relative opacity-90 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {b.species.slug === 'dairy-cattle' ? '🐄' : b.species.slug === 'goats' ? '🐐' : '🐔'}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug">{b.title}</h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        {b.animalTag} • {b.isHerd ? `Herd (${b.herdTotal} total, ${b.sickCount} sick)` : 'Single Animal'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {b.signs.map((s) => (
                    <span key={s.id} className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/70">
                      {s.matchedTerm} ({s.nameEn})
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">{b.differentialHint}</span>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="text-xs font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
                  >
                    <Lock className="w-3 h-3 text-emerald-700" />
                    <span>Log In to Run Case</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* 1. Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-500/30 relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
            <span>RAX-4.0 AI Clinical Model Connected</span>
            <span className="text-emerald-400">•</span>
            <span>KVB Biosecurity Rules Active</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Kraalkit Vet Co-Pilot
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
            AI-powered livestock differential diagnostics, vetted on-farm supportive first-aid, and targeted clinical questions for registered veterinary officers.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentTab('search')}
              className="px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Search className="w-4 h-4 text-emerald-950" />
              <span>Start New Symptom Triage</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {selectedSymptoms.length >= 2 && (
              <button
                type="button"
                onClick={() => setCurrentTab('results')}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm flex items-center gap-2 border border-white/20 transition-all active:scale-95"
              >
                <Stethoscope className="w-4 h-4 text-emerald-300" />
                <span>Explain Active Patient ({selectedSymptoms.length} signs) →</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Active Patient In-Progress Alert (if symptoms already selected) */}
      {selectedSymptoms.length >= 2 && (
        <div className="bg-white rounded-2xl border-2 border-emerald-600/80 p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-black">
                {selectedSpecies?.slug === 'dairy-cattle' ? '🐄' : selectedSpecies?.slug === 'goats' ? '🐐' : selectedSpecies?.slug === 'sheep' ? '🐑' : '🐔'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">
                    Active Patient In Triage: {selectedSpecies?.name}
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {selectedSymptoms.length} Signs Selected
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Signs: {selectedSymptoms.map((s) => s.matchedTerm || s.nameEn).join(', ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentTab('results')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Open Results & AI Explanation →</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. 1-Click Clinical Benchmark Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Instant AI Case Scenarios (1-Click Diagnostics)</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Click any verified benchmark case below to instantly run the clinical algorithm and see the Vet Co-Pilot explanation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benchmarkCases.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {item.species.slug === 'dairy-cattle' ? '🐄' : item.species.slug === 'goats' ? '🐐' : '🐔'}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {item.species.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      item.urgency === 'EMERGENCY'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 leading-snug">
                  {item.title}
                </h3>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Evaluated Symptoms ({item.signs.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.signs.map((s) => (
                      <span
                        key={s.id}
                        className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200"
                      >
                        {s.matchedTerm} ({s.nameEn})
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                  🎯 {item.differentialHint}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleRunPreset(item)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-98 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Load & Explain Case with Vet Co-Pilot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Veterinary Safety Architecture & Principles */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Vet Co-Pilot Safety Principles & KVB Architecture
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-700">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-black text-slate-900 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>1. Code Computes, AI Explains</span>
            </span>
            <p className="text-slate-500 font-medium leading-relaxed">
              Matching algorithms deterministically score diseases from vetted symptoms. The AI only explains vetted data.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-black text-slate-900 block flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>2. Vetted First-Aid</span>
            </span>
            <p className="text-slate-500 font-medium leading-relaxed">
              Farmer action steps come directly from Kenya Veterinary Board protocols, never generated or rewritten by the LLM.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-black text-slate-900 block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>3. Confidence & Limits</span>
            </span>
            <p className="text-slate-500 font-medium leading-relaxed">
              Scores reflect statistical marker correlation. Explanations state that pattern matching is not a definitive diagnosis.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="font-black text-slate-900 block flex items-center gap-1.5">
              <Biohazard className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span>4. Sub-County SCVO Alert</span>
            </span>
            <p className="text-slate-500 font-medium leading-relaxed">
              Notifiable epizootic diseases trigger automatic reporting advisories to contact the County Veterinary Officer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
