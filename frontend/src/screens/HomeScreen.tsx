import React, { useEffect, useState } from 'react';
import { useSession } from '../store/sessionContext';
import { fetchLanguages, fetchSpecies } from '../lib/api';
import { Language, Species } from '../types';
import { ScreenTab } from '../components/Navigation';
import { KENYAN_LANGUAGES, InterfaceLang } from '../lib/i18n';
import {
  Search,
  MapPin,
  Wheat,
  Map,
  PlusCircle,
  Stethoscope,
  PhoneCall,
  Check,
  Shield,
  Activity,
  Globe2,
  Users,
  PawPrint,
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface HomeScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setCurrentTab }) => {
  const {
    t,
    selectedSpecies,
    setSelectedSpecies,
    searchLanguage,
    setSearchLanguage,
    interfaceLang,
    setInterfaceLang,
    isHerd,
    setIsHerd,
    currentUser,
    setAuthModalOpen,
  } = useSession();

  const [languages, setLanguages] = useState<Language[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [langs, specs] = await Promise.all([
          fetchLanguages().catch(() =>
            KENYAN_LANGUAGES.map((kl, idx) => ({
              id: idx + 1,
              code: kl.code,
              name: kl.name,
              nativeName: kl.nativeName,
            }))
          ),
          fetchSpecies().catch(() => [
            { id: 1, slug: 'dairy-cattle', name: 'Dairy Cattle' },
            { id: 2, slug: 'goats', name: 'Goats' },
            { id: 3, slug: 'sheep', name: 'Sheep' },
            { id: 4, slug: 'poultry', name: 'Poultry' },
          ]),
        ]);
        setLanguages(langs);
        setSpeciesList(specs);
        if (!selectedSpecies && specs.length > 0) {
          setSelectedSpecies(specs[0]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const getSpeciesEmoji = (slug: string) => {
    switch (slug) {
      case 'dairy-cattle':
        return '🐄';
      case 'goats':
        return '🐐';
      case 'sheep':
        return '🐑';
      case 'poultry':
        return '🐔';
      default:
        return '🐾';
    }
  };

  const handleSelectDialect = (code: string) => {
    setSearchLanguage(code);
    setInterfaceLang(code as InterfaceLang);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* 1. Hero Banner */}
      <section className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden border border-emerald-700/50">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-200 mb-4 border border-emerald-400/20">
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            <span>National Livestock Epizootic Intelligence & Community Health Portal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-3">
            Kenya Livestock Health & Feed Optimization
          </h1>
          <p className="text-sm sm:text-base text-emerald-100 font-medium leading-relaxed max-w-2xl mb-8">
            Diagnostic condition triage across all 13 Kenyan indigenous languages, immediate contagious herd outbreak response, KVB veterinarian locator, and local feed ration balancing.
          </p>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setCurrentTab('search')}
              className="bg-white hover:bg-emerald-50 text-emerald-950 font-black text-sm px-6 py-3.5 rounded-2xl shadow-md active:scale-95 transition-all flex items-center gap-2.5"
            >
              <Search className="w-4 h-4 text-emerald-700" />
              <span>{t.checkSymptoms}</span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('ration')}
              className="bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-500/40 font-bold text-sm px-5 py-3.5 rounded-2xl active:scale-95 transition-all flex items-center gap-2"
            >
              <Wheat className="w-4 h-4 text-amber-300" />
              <span>{t.feedRation}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('map')}
              className="bg-teal-950/60 hover:bg-teal-900 text-white border border-teal-600/40 font-bold text-sm px-5 py-3.5 rounded-2xl active:scale-95 transition-all flex items-center gap-2"
            >
              <Map className="w-4 h-4 text-teal-300" />
              <span>{t.outbreakMap}</span>
            </button>
          </div>
        </div>

        {/* Ambient Decorative Cattle Graphic */}
        <div className="absolute right-4 bottom-0 text-9xl sm:text-[14rem] opacity-10 select-none pointer-events-none transform translate-y-6">
          🐄
        </div>
      </section>

      {/* 2. Top Dual Controls: Target Animal & Single vs Herd Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Livestock Species Picker */}
        <section className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>{t.selectAnimal}</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Target species affects disease weighting and nutritional benchmarks
              </p>
            </div>
            <span className="text-xs text-slate-500 font-bold hidden sm:inline">
              Selected: <strong className="text-emerald-700">{selectedSpecies?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {speciesList.map((sp) => {
              const isSelected = selectedSpecies?.slug === sp.slug;
              return (
                <button
                  key={sp.slug}
                  type="button"
                  onClick={() => setSelectedSpecies(sp)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 text-center ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                  }`}
                >
                  <span className="text-3xl mb-2">{getSpeciesEmoji(sp.slug)}</span>
                  <span className={`text-xs font-black ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                    {sp.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Scope Selector: Single Animal vs Herd Outbreak */}
        <section className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{t.scopeSelectorTitle}</span>
              </label>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-4">
              Is this clinical check for one animal or a potential group outbreak?
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Single Animal Option */}
            <button
              type="button"
              onClick={() => setIsHerd(false)}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                !isHerd
                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-200 text-emerald-950 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${!isHerd ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <PawPrint className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black">{t.scopeSingle}</p>
                  <p className="text-[10px] text-slate-400">{t.scopeSingleDesc}</p>
                </div>
              </div>
              {!isHerd && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
            </button>

            {/* Herd / Flock Outbreak Option */}
            <button
              type="button"
              onClick={() => setIsHerd(true)}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                isHerd
                  ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-200 text-purple-950 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isHerd ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black">{t.scopeHerd}</p>
                  <p className="text-[10px] text-purple-700 font-semibold">Priority Contagion Boost (+25%)</p>
                </div>
              </div>
              {isHerd && <Check className="w-4 h-4 text-purple-600 stroke-[3]" />}
            </button>
          </div>
        </section>
      </div>

      {/* 3. 13 Kenyan Languages Showcase */}
      <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-600" />
              <span>All 13 Kenyan Languages Supported</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Click a language to immediately search indigenous terms (e.g. Gĩkũyũ, Dholuo, Oluluhyia, Kalenjin, Maa, Af-Soomaali, Ng'aturkana)
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 w-fit">
            Current: {KENYAN_LANGUAGES.find((k) => k.code === searchLanguage)?.nativeName || 'Kiswahili'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {KENYAN_LANGUAGES.map((lang) => {
            const isSelected = searchLanguage === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectDialect(lang.code)}
                className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs block truncate">{lang.nativeName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-white stroke-[3] flex-shrink-0" />}
                </div>
                <span className={`text-[10px] block truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {lang.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Four Core Feature Cards */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
            {t.quickTasks}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Check Symptoms */}
          <div
            onClick={() => setCurrentTab('search')}
            className="bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-300 p-6 rounded-3xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-slate-900 group-hover:text-emerald-800 transition-colors">
                {t.checkSymptoms}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {t.checkSymptomsDesc}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-between text-emerald-700 text-xs font-black group-hover:translate-x-1 transition-transform">
              <span>Launch Multi-Symptom Search</span>
              <span>→</span>
            </div>
          </div>

          {/* Card 2: Find Nearest Vet */}
          <div
            onClick={() => setCurrentTab('results')}
            className="bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-blue-300 p-6 rounded-3xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-slate-900 group-hover:text-blue-800 transition-colors">
                {t.findVet}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {t.findVetDesc}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-between text-blue-700 text-xs font-black group-hover:translate-x-1 transition-transform">
              <span>View Registered Vets</span>
              <span>→</span>
            </div>
          </div>

          {/* Card 3: Ration Balancer */}
          <div
            onClick={() => setCurrentTab('ration')}
            className="bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 p-6 rounded-3xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Wheat className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-slate-900 group-hover:text-amber-800 transition-colors">
                {t.feedRation}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {t.feedRationDesc}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-between text-amber-700 text-xs font-black group-hover:translate-x-1 transition-transform">
              <span>Balance Daily Ration</span>
              <span>→</span>
            </div>
          </div>

          {/* Card 4: Outbreak Surveillance */}
          <div
            onClick={() => setCurrentTab('map')}
            className="bg-white hover:bg-purple-50/40 border border-slate-200/90 hover:border-purple-300 p-6 rounded-3xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base text-slate-900 group-hover:text-purple-800 transition-colors">
                {t.outbreakMap}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {t.outbreakMapDesc}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-between text-purple-700 text-xs font-black group-hover:translate-x-1 transition-transform">
              <span>Inspect County Clusters</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Emergency Hotline & Community Portals */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Emergency Call Box */}
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 animate-pulse">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-950">24/7 National Veterinary Hotline</p>
              <p className="text-[11px] text-rose-700 font-medium">Toll-free emergency dispatch</p>
            </div>
          </div>
          <a
            href="tel:0800720021"
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all flex-shrink-0"
          >
            Call 0800
          </a>
        </div>

        {/* Suggest Local Term Shortcut */}
        <div
          onClick={() => setCurrentTab('contribute')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-3xl flex items-center gap-3.5 cursor-pointer shadow-xs transition-all hover:bg-slate-50/50"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">{t.contributeTitle}</h4>
            <p className="text-[11px] text-slate-500 font-medium">Contribute indigenous terminology</p>
          </div>
        </div>

        {/* Vet Portal Shortcut */}
        <div
          onClick={() => setCurrentTab('verify')}
          className="bg-white border border-slate-200 hover:border-slate-300 p-5 rounded-3xl flex items-center gap-3.5 cursor-pointer shadow-xs transition-all hover:bg-slate-50/50"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">{t.vetPortal}</h4>
            <p className="text-[11px] text-slate-500 font-medium">KVB certified practitioner review</p>
          </div>
        </div>
      </section>
    </div>
  );
};
