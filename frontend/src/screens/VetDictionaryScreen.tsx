import React, { useState, useEffect } from 'react';
import { useSession } from '../store/sessionContext';
import { ScreenTab } from '../components/Navigation';
import {
  fetchTerms,
  submitVetTerm,
  confirmTerm,
  deleteTerm,
  fetchSymptomsList,
  createClinicalSymptom,
} from '../lib/api';
import { DictionaryTermItem } from '../types';
import { KENYAN_LANGUAGES } from '../lib/i18n';
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  Search,
  ShieldCheck,
  Globe,
  Filter,
  Sparkles,
  ArrowRight,
  UserCheck,
  Stethoscope,
  Trash2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Info,
  MapPin,
  Plus,
  ChevronDown,
} from 'lucide-react';

interface VetDictionaryScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

const COMMON_SYMPTOMS_LIST = [
  { id: 1, key: 'fever', nameEn: 'Fever (High body temperature)' },
  { id: 2, key: 'nasal-discharge', nameEn: 'Nasal Discharge (Mucus from nose)' },
  { id: 3, key: 'coughing', nameEn: 'Coughing (Chest congestion / wheezing)' },
  { id: 4, key: 'diarrhea', nameEn: 'Diarrhea (Watery or bloody droppings)' },
  { id: 5, key: 'loss-of-appetite', nameEn: 'Loss of Appetite (Off feed)' },
  { id: 6, key: 'lameness', nameEn: 'Lameness (Limping / cannot stand)' },
  { id: 7, key: 'milk-drop', nameEn: 'Milk Drop (Sudden drop in yield)' },
  { id: 8, key: 'bloat', nameEn: 'Bloat (Swollen left flank rumen)' },
  { id: 9, key: 'mouth-lesions', nameEn: 'Mouth Lesions (Sores, erosions, blisters)' },
  { id: 10, key: 'foot-lesions', nameEn: 'Foot Lesions (Cracks, interdigital sores)' },
  { id: 11, key: 'skin-lesions', nameEn: 'Skin Lesions (Nodules, scabs, lumps)' },
  { id: 16, key: 'pale-mucous', nameEn: 'Pale Mucous Membranes (White eye rims)' },
  { id: 17, key: 'swollen-lymph-nodes', nameEn: 'Swollen Lymph Nodes (Parotid/prescapular)' },
  { id: 18, key: 'difficulty-breathing', nameEn: 'Difficulty Breathing (Labored respiration)' },
  { id: 19, key: 'sudden-death', nameEn: 'Sudden Death (Rapid mortality)' },
  { id: 20, key: 'blood-in-urine', nameEn: 'Blood in Urine (Red water)' },
  { id: 27, key: 'drop-in-egg-production', nameEn: 'Drop in Egg Production (Poultry)' },
  { id: 28, key: 'watery-droppings', nameEn: 'Watery Droppings (Greenish/white diarrhea)' },
  { id: 30, key: 'paralysis', nameEn: 'Paralysis (Wing/leg drop)' },
];

export const VetDictionaryScreen: React.FC<VetDictionaryScreenProps> = ({ setCurrentTab }) => {
  const { currentUser } = useSession();
  const isVet = currentUser?.role === 'VET';

  const [activeTab, setActiveTab] = useState<'contribute' | 'browse' | 'queue'>(
    isVet ? 'contribute' : 'browse'
  );

  // Browse state
  const [terms, setTerms] = useState<DictionaryTermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('CONFIRMED');

  // Dynamic Clinical Symptoms State (Searchable & Extendable)
  const [symptomsList, setSymptomsList] = useState<
    Array<{ id: number; key: string; nameEn: string; description?: string }>
  >(COMMON_SYMPTOMS_LIST);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [isSymptomDropdownOpen, setIsSymptomDropdownOpen] = useState(false);
  const [isAddingNewSymptom, setIsAddingNewSymptom] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [newSymptomDesc, setNewSymptomDesc] = useState('');
  const [creatingSymptom, setCreatingSymptom] = useState(false);

  // Load live symptoms list from database
  useEffect(() => {
    fetchSymptomsList()
      .then((data) => {
        if (data && data.length > 0) {
          setSymptomsList(data);
        }
      })
      .catch((err) => console.warn('Could not load live symptoms:', err));
  }, []);

  const handleCreateNewSymptom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newSymptomName.trim() || symptomSearch.trim();
    if (!name) return;

    setCreatingSymptom(true);
    try {
      const created = await createClinicalSymptom(name, newSymptomDesc.trim() || undefined);
      setSymptomsList((prev) => {
        const exists = prev.find((s) => s.id === created.id || s.key === created.key);
        if (exists) return prev;
        return [created, ...prev];
      });
      setSymptomId(created.id);
      setIsAddingNewSymptom(false);
      setNewSymptomName('');
      setNewSymptomDesc('');
      setSymptomSearch('');
      setIsSymptomDropdownOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create symptom');
    } finally {
      setCreatingSymptom(false);
    }
  };

  // Contribution Form State
  const [symptomId, setSymptomId] = useState<number>(1);
  const [languageCode, setLanguageCode] = useState<string>('sw');
  const [termText, setTermText] = useState('');
  const [dialectVariant, setDialectVariant] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [vetName, setVetName] = useState(currentUser?.name || 'Dr. Timothy M.');
  const [vetCounty, setVetCounty] = useState(currentUser?.county || 'Kisii');
  const [kvbNumber, setKvbNumber] = useState('KVB/AHT-2940');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Review Queue State
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const loadDictionary = async () => {
    setLoading(true);
    try {
      const res = await fetchTerms({
        status: filterStatus === 'all' ? undefined : filterStatus,
        languageCode: filterLanguage === 'all' ? undefined : filterLanguage,
        q: searchQuery.trim() || undefined,
      });
      setTerms(res.terms || []);
    } catch (err) {
      console.error('Failed to load terms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDictionary();
  }, [filterLanguage, filterStatus, searchQuery]);

  const handleVetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termText.trim() || !vetName.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitVetTerm({
        symptomId,
        languageCode,
        text: termText.trim(),
        variant: dialectVariant.trim() || undefined,
        clinicalContext: clinicalContext.trim() || undefined,
        vetName: vetName.trim(),
        vetCounty: vetCounty.trim(),
        kvbNumber: kvbNumber.trim() || undefined,
      });

      setSubmitSuccess(true);
      setTermText('');
      setDialectVariant('');
      setClinicalContext('');
      loadDictionary();
    } catch (err: any) {
      setSubmitError(err.message || 'Error submitting vet term');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmFarmerTerm = async (termId: number) => {
    setVerifyingId(termId);
    try {
      await confirmTerm(termId, undefined, {
        reviewerName: currentUser?.name || 'Dr. Timothy (KVB Vet)',
        reviewerCounty: currentUser?.county || 'Kenya',
      });
      await loadDictionary();
    } catch (err: any) {
      alert(`Could not confirm term: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRejectTerm = async (termId: number) => {
    if (!window.confirm('Are you sure you want to remove this term from the lexicon?')) return;
    try {
      await deleteTerm(termId);
      await loadDictionary();
    } catch (err: any) {
      alert(`Could not delete term: ${err.message}`);
    }
  };

  const confirmedTermsCount = terms.filter((t) => t.status === 'CONFIRMED').length;
  const pendingTermsCount = terms.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-500/30 relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>KVB Registered Veterinarians & Animal Health Network</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Indigenous Veterinary Lexicon Hub
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
            Field veterinarians interact directly with pastoralists and smallholders across Kenya in their mother tongues. You are the natural contributors to Kenya’s 13-language livestock dictionary—translating colloquial words heard in the boma into confirmed clinical symptom entities.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-emerald-200">
            <span className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>13 Kenyan Indigenous Languages</span>
            </span>
            <span className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant KVB Field Certification</span>
            </span>
            <span className="flex items-center gap-1.5 bg-black/25 px-3 py-1 rounded-xl border border-white/10">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Attributed to Field Practitioners</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'browse'
                ? 'bg-emerald-700 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore 13-Language Lexicon</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contribute')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'contribute'
                ? 'bg-emerald-700 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Contribute Native Term (Vet Field Submission)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('queue');
              setFilterStatus('PENDING');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'queue'
                ? 'bg-purple-800 text-white shadow-xs font-black'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Verify Farmer Submissions</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('search')}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5"
        >
          <span>Test in Symptom Triage</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. TAB A: CONTRIBUTE NATIVE TERM (VET FIELD SUBMISSION) */}
      {activeTab === 'contribute' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-700" />
                <span>Field Veterinarian Lexicon Contribution</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Record local words heard from farmers during field clinical work. Your submission will be certified and immediately searchable by farmers across Kenya.
              </p>
            </div>
            <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Instant KVB Certification
            </span>
          </div>

          {submitSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                <span>
                  Asante Daktari! Term successfully certified and published to the national symptom dictionary.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSubmitSuccess(false)}
                className="text-emerald-800 underline font-black ml-4"
              >
                Add Another
              </button>
            </div>
          )}

          {submitError && (
            <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleVetSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Symptom Selection with Live Search & "+ Add New English Symptom" */}
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>1. Clinical Veterinary Symptom</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewSymptom(!isAddingNewSymptom);
                      if (!isAddingNewSymptom && symptomSearch.trim()) {
                        setNewSymptomName(symptomSearch.trim());
                      }
                    }}
                    className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-emerald-700" />
                    <span>{isAddingNewSymptom ? 'Close' : '+ Add New English Symptom'}</span>
                  </button>
                </div>

                {/* If User Clicked "+ Add New English Symptom", Show New Symptom Creation Box */}
                {isAddingNewSymptom ? (
                  <div className="p-3.5 bg-emerald-50/80 border-2 border-emerald-400 rounded-2xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Add Missing Formal English Symptom</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewSymptom(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Formal English Clinical Sign Name *
                        </label>
                        <input
                          type="text"
                          value={newSymptomName}
                          onChange={(e) => setNewSymptomName(e.target.value)}
                          placeholder="e.g. Swollen Udder / Mastitis, Corneal Opacity, Salivation..."
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Clinical Definition / Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={newSymptomDesc}
                          onChange={(e) => setNewSymptomDesc(e.target.value)}
                          placeholder="e.g. Inflammation, heat, and firmness of mammary quarter..."
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCreateNewSymptom()}
                          disabled={creatingSymptom || !newSymptomName.trim()}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{creatingSymptom ? 'Creating...' : 'Create & Select Symptom'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingNewSymptom(false)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Searchable Dropdown / Selector */
                  <div className="space-y-1">
                    {/* Active Selected Card / Bar */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-300 rounded-xl hover:bg-slate-100/80 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black flex-shrink-0">
                          ✓
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-black text-slate-900 block truncate">
                            {(symptomsList.find((s) => s.id === symptomId) || symptomsList[0])?.nameEn || 'Select Symptom'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Clinical Key: {(symptomsList.find((s) => s.id === symptomId) || symptomsList[0])?.key}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsSymptomDropdownOpen(!isSymptomDropdownOpen)}
                        className="text-xs font-black text-emerald-700 hover:text-emerald-850 bg-white hover:bg-emerald-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 flex-shrink-0 shadow-2xs"
                      >
                        <Search className="w-3 h-3 text-emerald-600" />
                        <span>{isSymptomDropdownOpen ? 'Done' : 'Search / Change'}</span>
                      </button>
                    </div>

                    {/* Search & List Dropdown Menu */}
                    {isSymptomDropdownOpen && (
                      <div className="p-2.5 bg-white border border-slate-300 rounded-2xl shadow-lg space-y-2 z-20 animate-fadeIn">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={symptomSearch}
                            onChange={(e) => setSymptomSearch(e.target.value)}
                            placeholder="Type to filter symptoms (e.g. fever, cough, udder, eye, bloat)..."
                            autoFocus
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>

                        {/* Filtered Symptom Options */}
                        <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                          {symptomsList
                            .filter((s) => {
                              if (!symptomSearch.trim()) return true;
                              const q = symptomSearch.toLowerCase();
                              return s.nameEn.toLowerCase().includes(q) || s.key.toLowerCase().includes(q);
                            })
                            .map((s) => {
                              const isSelected = s.id === symptomId;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setSymptomId(s.id);
                                    setIsSymptomDropdownOpen(false);
                                    setSymptomSearch('');
                                  }}
                                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-700 text-white font-black'
                                      : 'text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="truncate">{s.nameEn}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-200" />}
                                </button>
                              );
                            })}

                          {symptomsList.filter((s) => {
                            if (!symptomSearch.trim()) return true;
                            const q = symptomSearch.toLowerCase();
                            return s.nameEn.toLowerCase().includes(q) || s.key.toLowerCase().includes(q);
                          }).length === 0 && (
                            <div className="p-3 text-center space-y-1.5">
                              <p className="text-xs text-slate-500 font-medium">
                                No symptom found matching "{symptomSearch}".
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewSymptomName(symptomSearch.trim());
                                  setIsAddingNewSymptom(true);
                                  setIsSymptomDropdownOpen(false);
                                }}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1 mx-auto"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add "{symptomSearch.trim()}" as New Clinical Sign</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[10px] text-slate-500 font-medium block">
                  The formal veterinary clinical sign this native word corresponds to. Search, select, or add a missing English symptom.
                </span>
              </div>

              {/* Language Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  2. Kenyan Indigenous Language <span className="text-red-500">*</span>
                </label>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                >
                  {KENYAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} — {l.nativeName} ({l.code})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-medium block">
                  Select the indigenous mother tongue spoken by the pastoralist / farmer.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Native Term Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  3. Indigenous Term / Vernacular Word <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Omwiko, Loolo, Chebwekwek, Kuvimba matiti"
                  value={termText}
                  onChange={(e) => setTermText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
                <span className="text-[10px] text-slate-500 font-medium block">
                  The exact word or phrase the farmer uses when describing the animal's condition.
                </span>
              </div>

              {/* Dialect Variant / Sub-Region */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  4. Dialect Sub-Region / Clan Variant (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nandi / Kericho dialect, South Nyanza Dholuo, Narok Maa"
                  value={dialectVariant}
                  onChange={(e) => setDialectVariant(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
                />
                <span className="text-[10px] text-slate-500 font-medium block">
                  Geographic location or sub-dialect variation within the language group.
                </span>
              </div>
            </div>

            {/* Clinical Field Context Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                5. Clinical Field Context & Farmer Interaction Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Commonly used by dairy farmers in Bomet when describing rapid drop in milk accompanied by swollen, hot quarters during acute clinical mastitis."
                value={clinicalContext}
                onChange={(e) => setClinicalContext(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              />
              <span className="text-[10px] text-slate-500 font-medium block">
                Helps other veterinarians and researchers understand the clinical nuances of the word.
              </span>
            </div>

            {/* Practitioner Attribution */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>6. Veterinarian Contributor Attribution</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Your Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={vetName}
                    onChange={(e) => setVetName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Practice County
                  </label>
                  <input
                    type="text"
                    required
                    value={vetCounty}
                    onChange={(e) => setVetCounty(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    KVB No. / Practice Registration
                  </label>
                  <input
                    type="text"
                    value={kvbNumber}
                    onChange={(e) => setKvbNumber(e.target.value)}
                    placeholder="e.g. KVB/AHT-2940"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !termText.trim()}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all ${
                !submitting && termText.trim()
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{submitting ? 'Certifying Term...' : 'Publish Verified Indigenous Term to National Lexicon'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* 4. TAB B: EXPLORE 13-LANGUAGE LEXICON */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search indigenous words, symptoms or contributors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="all">All 13 Languages</option>
                  {KENYAN_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="all">All Statuses</option>
                  <option value="CONFIRMED">Confirmed Terms Only</option>
                  <option value="PENDING">Pending Review</option>
                </select>
              </div>
            </div>

            {/* Quick Language Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
                Dialect Filter:
              </span>
              <button
                type="button"
                onClick={() => setFilterLanguage('all')}
                className={`px-2.5 py-1 rounded-lg font-bold flex-shrink-0 transition-all ${
                  filterLanguage === 'all'
                    ? 'bg-emerald-700 text-white font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Languages ({terms.length})
              </button>
              {KENYAN_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setFilterLanguage(l.code)}
                  className={`px-2.5 py-1 rounded-lg font-bold flex-shrink-0 transition-all ${
                    filterLanguage === l.code
                      ? 'bg-emerald-700 text-white font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Terms Grid */}
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Loading indigenous lexicon...</p>
            </div>
          ) : terms.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-800">No terms match your search filters.</p>
              <button
                type="button"
                onClick={() => setActiveTab('contribute')}
                className="text-xs font-bold text-emerald-700 hover:underline inline-block mt-1"
              >
                + Be the first veterinarian to contribute a term for this dialect!
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {terms.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {t.language.name} ({t.language.code})
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.status === 'CONFIRMED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {t.status === 'CONFIRMED' ? 'KVB Verified' : 'Pending Review'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">
                        "{t.text}"
                      </h3>
                      <p className="text-xs font-bold text-emerald-800 mt-0.5">
                        Clinical Sign: {t.symptom.nameEn}
                      </p>
                    </div>

                    {t.variant && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                        {t.variant}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[200px]" title={t.contributor || 'Community submission'}>
                      👤 {t.contributor || 'Anonymous farmer'}
                    </span>
                    {t.status === 'CONFIRMED' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB C: FARMER SUBMISSIONS REVIEW QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black">
                ⚖️
              </div>
              <div>
                <h3 className="text-sm font-black text-purple-950">
                  Veterinary Peer Verification Queue
                </h3>
                <p className="text-xs text-purple-800 font-medium">
                  Review terms submitted by livestock farmers in the field. Confirm accurate translations so they become searchable in clinical triage.
                </p>
              </div>
            </div>
          </div>

          {terms.filter((t) => t.status === 'PENDING').length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">Queue is Clear!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All community-submitted vernacular terms have been reviewed and verified by the veterinary board.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {terms
                .filter((t) => t.status === 'PENDING')
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full">
                          {item.language.name} ({item.language.code})
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          Submitted by {item.contributor || 'Farmer'}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900">
                        "{item.text}"
                      </h4>

                      <p className="text-xs font-bold text-emerald-800">
                        Mapped to Sign: <strong>{item.symptom.nameEn}</strong>
                      </p>

                      {item.variant && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          Note: {item.variant}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={verifyingId === item.id}
                        onClick={() => handleConfirmFarmerTerm(item.id)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>{verifyingId === item.id ? 'Confirming...' : 'Confirm Term'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectTerm(item.id)}
                        className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
