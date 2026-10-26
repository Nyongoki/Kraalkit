import React, { useState, useEffect, KeyboardEvent } from 'react';
import { useSession } from '../store/sessionContext';
import { searchSymptoms } from '../lib/api';
import { SymptomResult } from '../types';
import { ScreenTab } from '../components/Navigation';
import { KENYAN_LANGUAGES } from '../lib/i18n';
import {
  Search,
  X,
  Check,
  Plus,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Trash2,
  Users,
  PawPrint,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface SearchScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

interface BodySystemCategory {
  id: string;
  name: string;
  icon: string;
  signs: Array<{ key: string; label: string }>;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ setCurrentTab }) => {
  const {
    t,
    selectedSpecies,
    searchLanguage,
    setSearchLanguage,
    selectedSymptoms,
    addSymptom,
    removeSymptom,
    clearSymptoms,
    isHerd,
    setIsHerd,
    herdSize,
    setHerdSize,
  } = useSession();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymptomResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [multiInputText, setMultiInputText] = useState('');
  const [showMultiBox, setShowMultiBox] = useState(false);

  // Categorized Body Systems for rapid clinical exploration
  const bodySystems: BodySystemCategory[] = [
    {
      id: 'respiratory',
      name: 'Respiratory & Lungs',
      icon: '🫁',
      signs: [
        { key: 'coughing', label: 'Coughing / Kukohoa' },
        { key: 'nasal-discharge', label: 'Nasal Discharge / Mafua' },
        { key: 'fast-breathing', label: 'Rapid Breathing / Kupumua kwa haraka' },
        { key: 'grunting', label: 'Chest Pain Grunting / Kulia' },
      ],
    },
    {
      id: 'digestive',
      name: 'Digestive & Stomach',
      icon: '🧪',
      signs: [
        { key: 'diarrhea', label: 'Diarrhea / Kuharisha' },
        { key: 'bloat', label: 'Bloat (Tympany) / Kuvimba tumbo' },
        { key: 'anorexia', label: 'Loss of Appetite / Kutokula' },
        { key: 'salivation', label: 'Heavy Salivation / Udenda mwingi' },
      ],
    },
    {
      id: 'mouth-hooves',
      name: 'Mouth & Hooves',
      icon: '🐾',
      signs: [
        { key: 'mouth-lesions', label: 'Mouth Ulcers & Blisters' },
        { key: 'foot-lesions', label: 'Foot & Hoof Wounds / Vidonda miguuni' },
        { key: 'lameness', label: 'Severe Limping / Kutechemea' },
      ],
    },
    {
      id: 'systemic',
      name: 'Systemic & Fever',
      icon: '🌡️',
      signs: [
        { key: 'fever', label: 'High Fever / Homa kali' },
        { key: 'weakness', label: 'Weakness & Lying Down' },
        { key: 'shivering', label: 'Shivering / Kutetemeka' },
        { key: 'sudden-death', label: 'Sudden Death / Kifo cha ghafla' },
      ],
    },
    {
      id: 'udder-production',
      name: 'Production & Udder',
      icon: '🥛',
      signs: [
        { key: 'milk-drop', label: 'Sudden Drop in Milk Yield' },
        { key: 'mastitis', label: 'Swollen / Hard Teats (Mastitis)' },
        { key: 'weight-loss', label: 'Rapid Weight Loss / Kukonda' },
      ],
    },
    {
      id: 'skin-eyes',
      name: 'Skin, Eyes & External',
      icon: '🪰',
      signs: [
        { key: 'skin-nodules', label: 'Lumps & Skin Nodules' },
        { key: 'eye-discharge', label: 'Watery / Swollen Eyes' },
        { key: 'tick-infestation', label: 'High Tick Infestation' },
      ],
    },
  ];

  // Debounced search supporting multi-symptom input string (e.g. "fever, coughing, diarrhea")
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const hits = await searchSymptoms(
          query.trim(),
          selectedSpecies?.id,
          searchLanguage
        );
        setResults(hits);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, selectedSpecies, searchLanguage]);

  // Audio pronunciation helper
  const speakTerm = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = searchLanguage === 'sw' ? 'sw-KE' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Keyboard handler: if user presses comma or Enter, parse and add top result if available
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (results.length > 0) {
        // Add the top hit if not already added
        const topHit = results[0];
        if (!selectedSymptoms.some((s) => s.id === topHit.id)) {
          addSymptom(topHit);
        }
        setQuery('');
      }
    }
  };

  // Smart multi-symptom batch parser (e.g. farmer pastes "Homa, kukohoa, kuharisha na kupungua maziwa")
  const handleBatchParse = async () => {
    const rawText = multiInputText.trim();
    if (!rawText) return;

    setIsSearching(true);
    try {
      const hits = await searchSymptoms(rawText, selectedSpecies?.id, searchLanguage);
      hits.forEach((hit) => {
        if (!selectedSymptoms.some((s) => s.id === hit.id)) {
          addSymptom(hit);
        }
      });
      setMultiInputText('');
      setShowMultiBox(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Quick category search trigger
  const handleQuickSignClick = async (signKey: string) => {
    try {
      const hits = await searchSymptoms(signKey, selectedSpecies?.id, searchLanguage);
      if (hits.length > 0) {
        const hit = hits[0];
        if (!selectedSymptoms.some((s) => s.id === hit.id)) {
          addSymptom(hit);
        }
      } else {
        setQuery(signKey);
      }
    } catch (err) {
      setQuery(signKey);
    }
  };

  const currentLang = KENYAN_LANGUAGES.find((k) => k.code === searchLanguage) || KENYAN_LANGUAGES[0];

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header with Scope Selector (Single Animal vs Herd Outbreak) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <span>Symptom Triage & Multi-Sign Diagnostic Intake</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Enter one or multiple clinical signs simultaneously in any Kenyan language
            </p>
          </div>

          {/* Active Dialect Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold w-fit">
            <span>Dictionary:</span>
            <span className="font-extrabold text-emerald-700">{currentLang.nativeName} ({currentLang.name})</span>
          </div>
        </div>

        {/* Scope Mode Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => setIsHerd(false)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              !isHerd
                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${!isHerd ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <PawPrint className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black">{t.scopeSingle}</p>
                <p className="text-[11px] text-slate-500">Checking isolated signs for 1 animal</p>
              </div>
            </div>
            {!isHerd && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
          </div>

          <div
            onClick={() => setIsHerd(true)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              isHerd
                ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-200 text-purple-950 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isHerd ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black">{t.scopeHerd}</p>
                <p className="text-[11px] text-purple-700 font-semibold">Herd outbreak contagion algorithms active</p>
              </div>
            </div>
            {isHerd && <Check className="w-4 h-4 text-purple-600 stroke-[3]" />}
          </div>
        </div>

        {/* Herd Size Parameter when Herd mode is active */}
        {isHerd && (
          <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-purple-950">
                  {t.herdOutbreakAlert}
                </p>
                <p className="text-[11px] text-purple-800 mt-0.5">
                  High-contagion epizootics (FMD, CCPP, PPR, Anthrax) will receive diagnostic weight escalation.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-xs font-bold text-purple-950">
                {t.herdSizeLabel}:
              </label>
              <input
                type="number"
                min="2"
                max="10000"
                value={herdSize}
                onChange={(e) => setHerdSize(parseInt(e.target.value, 10) || 10)}
                className="w-20 bg-white border border-purple-300 rounded-xl px-2.5 py-1.5 text-xs font-black text-purple-950 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Search & Results Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multi-Symptom Input, Quick Systems, Search Results */}
        <div className="lg:col-span-8 space-y-5">
          {/* Main Search Input Card */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-emerald-600" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.searchPlaceholder}
                className="w-full pl-11 pr-24 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowMultiBox(!showMultiBox)}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-extrabold px-2.5 py-1.5 rounded-xl transition-colors"
                  title="Paste multiple symptoms at once"
                >
                  Paste Multiple
                </button>
              </div>
            </div>

            {/* Multi-symptom hint */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
              <span>{t.multiSymptomHint}</span>
              <span className="hidden sm:inline text-emerald-700 font-bold">Press Enter or Comma to add</span>
            </div>

            {/* Smart Multi-symptom Paste Box Drawer */}
            {showMultiBox && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-fadeIn">
                <label className="text-xs font-bold text-slate-700 block">
                  Paste or type multiple signs separated by commas, "na", or "and":
                </label>
                <textarea
                  rows={2}
                  value={multiInputText}
                  onChange={(e) => setMultiInputText(e.target.value)}
                  placeholder="e.g. Homa kali, kukohoa, kuharisha na vidonda miguuni..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMultiBox(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchParse}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.smartParseBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Body Systems Categorized Signs Exploration */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>{t.commonSignsHeader}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Click any sign to add</span>
            </div>

            {/* Body Systems Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Systems
              </button>
              {bodySystems.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    activeCategory === cat.id
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Category Quick Signs Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {bodySystems
                .filter((cat) => activeCategory === 'all' || cat.id === activeCategory)
                .flatMap((cat) => cat.signs)
                .map((sign) => (
                  <button
                    key={sign.key}
                    type="button"
                    onClick={() => handleQuickSignClick(sign.key)}
                    className="bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{sign.label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Search Hits List */}
          <div className="space-y-3">
            {isSearching && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
                <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Querying multi-symptom linguistic engine across Kenyan indigenous dictionaries...
              </div>
            )}

            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-xs">
                <p className="text-slate-600 text-sm font-bold mb-2">
                  {t.noSymptomsFound}
                </p>
                <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                  Is "{query}" an indigenous sign in your local dialect? Contribute it to our national veterinary dictionary!
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('contribute')}
                  className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black px-4 py-2.5 rounded-xl active:scale-95 hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t.suggestWord} "{query}"
                </button>
              </div>
            )}

            {results.map((sym) => {
              const isSelected = selectedSymptoms.some((s) => s.id === sym.id);
              const isPending = sym.matchedTermStatus === 'PENDING';

              return (
                <div
                  key={sym.id}
                  onClick={() => (isSelected ? removeSymptom(sym.id) : addSymptom(sym))}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-200 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-slate-900 leading-tight">
                        {sym.matchedTerm || sym.nameEn}
                      </span>

                      {/* Audio Voice Helper */}
                      {sym.matchedTerm && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakTerm(sym.matchedTerm!);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-700 transition-colors"
                          title="Listen to native pronunciation"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Status Badge */}
                      {isPending ? (
                        <span className="inline-flex items-center text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          {t.pendingLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {t.confirmedLabel}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Clinical Concept: <strong className="text-slate-800">{sym.nameEn}</strong>
                      {sym.description && ` — ${sym.description}`}
                    </p>
                  </div>

                  {/* Add / Added Action Button */}
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-300'
                    }`}
                  >
                    {isSelected ? <Check className="w-5 h-5 stroke-[3]" /> : <Plus className="w-5 h-5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Signs Cart & Diagnostic Trigger */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs sticky top-22 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  {t.selectedSymptoms}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {selectedSymptoms.length} clinical signs chosen
                </p>
              </div>
              {selectedSymptoms.length > 0 && (
                <button
                  type="button"
                  onClick={clearSymptoms}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.clearAll}</span>
                </button>
              )}
            </div>

            {/* Scope Summary Badge */}
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between ${
              isHerd ? 'bg-purple-50 text-purple-950 border border-purple-200' : 'bg-slate-50 text-slate-700 border border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                {isHerd ? <Users className="w-4 h-4 text-purple-600" /> : <PawPrint className="w-4 h-4 text-emerald-600" />}
                <span>Scope: {isHerd ? `Herd Outbreak (${herdSize} head)` : 'Single Animal'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHerd(!isHerd)}
                className="text-[11px] font-extrabold underline hover:opacity-80"
              >
                Switch
              </button>
            </div>

            {/* Selected Signs Chips List */}
            {selectedSymptoms.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">
                  No signs chosen yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Type in the search bar or tap body system pills on the left to select signs.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {selectedSymptoms.map((sym) => (
                  <div
                    key={sym.id}
                    className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-3 text-xs shadow-2xs"
                  >
                    <div>
                      <span className="font-black text-emerald-950 block">
                        {sym.matchedTerm || sym.nameEn}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">
                        {sym.nameEn}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSymptom(sym.id)}
                      className="text-emerald-700 hover:text-rose-600 p-1.5 transition-colors"
                      title="Remove sign"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Evaluate Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={selectedSymptoms.length < 2}
                onClick={() => setCurrentTab('results')}
                className={`w-full py-4 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                  selectedSymptoms.length >= 2
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.viewConditions}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {selectedSymptoms.length < 2 && selectedSymptoms.length > 0 && (
                <p className="text-[11px] text-amber-700 text-center font-bold mt-2">
                  Please pick at least 2 signs for clinical condition matching.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
