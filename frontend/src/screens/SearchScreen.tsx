import React, { useState, useEffect } from 'react';
import { useSession } from '../store/sessionContext';
import { fetchSpecies, submitCaseReport } from '../lib/api';
import { Species, SymptomSearchResult, AnimalTriageGroup, SymptomCountItem } from '../types';
import { ScreenTab } from '../components/Navigation';
import { SymptomSearchBar } from '../components/SymptomSearchBar';
import {
  Layers,
  Wind,
  Activity,
  Footprints,
  Thermometer,
  Milk,
  Egg,
  Eye,
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Layers3,
  HelpCircle,
  X,
  MapPin,
  Navigation,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { KENYAN_COUNTIES_LIST, getCountyCoordinates } from '../lib/kenyaCounties';

interface SearchScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

interface QuickSignDef {
  id: number;
  key: string;
  nameEn: string;
  nameSw: string;
  category: 'respiratory' | 'digestive' | 'mouth-feet' | 'production' | 'systemic' | 'eyes-skin';
  applicableSpeciesSlugs: string[];
  isCommonFor: string[];
}

const ALL_SIGNS_CATALOG: QuickSignDef[] = [
  // Common multi-species signs
  { id: 1, key: 'fever', nameEn: 'Fever', nameSw: 'Homa kali', category: 'systemic', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['dairy-cattle', 'goats', 'sheep'] },
  { id: 2, key: 'nasal-discharge', nameEn: 'Nasal discharge', nameSw: 'Makamasi', category: 'respiratory', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['dairy-cattle', 'goats', 'sheep'] },
  { id: 3, key: 'coughing', nameEn: 'Coughing', nameSw: 'Kukohoa', category: 'respiratory', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['dairy-cattle', 'goats', 'sheep', 'poultry'] },
  { id: 4, key: 'diarrhea', nameEn: 'Diarrhea', nameSw: 'Kuharisha', category: 'digestive', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['dairy-cattle', 'goats', 'sheep'] },
  { id: 5, key: 'loss-of-appetite', nameEn: 'Loss of appetite', nameSw: 'Kukosa hamu ya kula', category: 'digestive', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['dairy-cattle', 'goats', 'sheep', 'poultry'] },
  { id: 6, key: 'lameness', nameEn: 'Lameness', nameSw: 'Kutechemea', category: 'mouth-feet', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: ['dairy-cattle', 'goats', 'sheep'] },
  { id: 9, key: 'mouth-lesions', nameEn: 'Mouth sores', nameSw: 'Vidonda kinywani', category: 'mouth-feet', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: ['dairy-cattle', 'goats', 'sheep'] },
  { id: 10, key: 'foot-lesions', nameEn: 'Foot sores', nameSw: 'Vidonda miguuni', category: 'mouth-feet', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: ['dairy-cattle', 'goats', 'sheep'] },
  
  // Ruminant specific (Cattle, Goats, Sheep)
  { id: 7, key: 'milk-drop', nameEn: 'Drop in milk yield', nameSw: 'Kupungua kwa maziwa', category: 'production', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: [] },
  { id: 8, key: 'bloat', nameEn: 'Bloat', nameSw: 'Kuvimba tumbo', category: 'digestive', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: [] },
  { id: 19, key: 'swollen-teats', nameEn: 'Swollen or hard teats', nameSw: 'Kuvimba chuchu', category: 'production', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: [] },
  { id: 13, key: 'abortions', nameEn: 'Abortions', nameSw: 'Kutoa mimba', category: 'production', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep'], isCommonFor: [] },
  
  // Poultry specific (Strictly no milk/teats)
  { id: 20, key: 'egg-drop', nameEn: 'Drop in egg production', nameSw: 'Kupungua kwa mayai', category: 'production', applicableSpeciesSlugs: ['poultry'], isCommonFor: ['poultry'] },
  { id: 21, key: 'watery-droppings', nameEn: 'Watery droppings', nameSw: 'Kinyesi chenye majimaji', category: 'digestive', applicableSpeciesSlugs: ['poultry'], isCommonFor: ['poultry'] },
  { id: 22, key: 'swollen-head', nameEn: 'Swollen head and eyes', nameSw: 'Kuvimba kichwa na macho', category: 'eyes-skin', applicableSpeciesSlugs: ['poultry'], isCommonFor: ['poultry'] },
  { id: 23, key: 'paralysis', nameEn: 'Leg or wing paralysis', nameSw: 'Kupooza miguu au mabawa', category: 'mouth-feet', applicableSpeciesSlugs: ['poultry'], isCommonFor: ['poultry'] },
  
  // General health signs
  { id: 11, key: 'skin-lesions', nameEn: 'Skin sores or lumps', nameSw: 'Vidonda au vipele ngozini', category: 'eyes-skin', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: [] },
  { id: 12, key: 'weight-loss', nameEn: 'Weight loss', nameSw: 'Kupoteza uzito', category: 'systemic', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: [] },
  { id: 14, key: 'eye-discharge', nameEn: 'Eye discharge', nameSw: 'Kutoka machozi', category: 'eyes-skin', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: [] },
  { id: 15, key: 'depression', nameEn: 'Dullness and weakness', nameSw: 'Kujikunyata na udhaifu', category: 'systemic', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['poultry'] },
  { id: 16, key: 'difficulty-breathing', nameEn: 'Difficulty breathing', nameSw: 'Kupumua kwa shida', category: 'respiratory', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: [] },
  { id: 17, key: 'sudden-death', nameEn: 'Sudden death', nameSw: 'Kifo cha ghafla', category: 'systemic', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: ['poultry'] },
  { id: 18, key: 'staggering', nameEn: 'Staggering', nameSw: 'Kutetemeka na kuyumba', category: 'systemic', applicableSpeciesSlugs: ['dairy-cattle', 'goats', 'sheep', 'poultry'], isCommonFor: [] },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({ setCurrentTab }) => {
  const {
    t,
    interfaceLang,
    selectedSpecies,
    setSelectedSpecies,
    selectedSymptoms,
    addSymptom,
    removeSymptom,
    clearSymptoms,
    setIsHerd,
    setHerdSize,
    setAffectedCount,
    location,
    setLocation,
    useCurrentGps,
    setTriagePayload,
    setTriageGroups,
    clearStaleResults,
  } = useSession();

  // Load species dynamically from API
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(true);

  // Groups state
  const [groups, setLocalGroups] = useState<AnimalTriageGroup[]>([
    {
      id: 'grp-1',
      speciesId: selectedSpecies?.id || 1,
      speciesSlug: selectedSpecies?.slug || 'dairy-cattle',
      speciesName: selectedSpecies?.name || 'Dairy Cattle',
      herdSize: 20,
      sick: 1,
      dead: 0,
      symptoms: [],
    },
  ]);
  const [activeGroupId, setActiveGroupId] = useState<string>('grp-1');

  // Filter & Category state for active group
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAllSigns, setShowAllSigns] = useState<boolean>(false);

  // GPS Feedback & Location State
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDetectGps = async () => {
    setLocatingGps(true);
    setGpsFeedback(null);
    try {
      const result = await useCurrentGps();
      if (result.success) {
        setGpsFeedback({
          type: 'success',
          message: `GPS location acquired: ${result.latitude?.toFixed(4)}°, ${result.longitude?.toFixed(4)}° (${result.county} County).`,
        });
      } else {
        setGpsFeedback({
          type: 'error',
          message: result.error || 'GPS unavailable. Please select your farm county from the dropdown.',
        });
      }
    } catch (e: any) {
      setGpsFeedback({
        type: 'error',
        message: 'Could not access device location. Please pick your county from the list.',
      });
    } finally {
      setLocatingGps(false);
    }
  };

  const handleCountyChange = (newCounty: string) => {
    const coords = getCountyCoordinates(newCounty);
    setLocation({
      county: newCounty,
      latitude: coords.lat,
      longitude: coords.lng,
      isGps: false,
    });
    setGpsFeedback({
      type: 'success',
      message: `Updated to ${newCounty} County center (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°).`,
    });
  };

  // Fetch species from database/API on load
  useEffect(() => {
    let mounted = true;
    fetchSpecies()
      .then((data) => {
        if (mounted && data.length > 0) {
          setSpeciesList(data);
          // Set initial species in group 1 if needed
          setLocalGroups((prev) =>
            prev.map((g, idx) => {
              if (idx === 0 && !selectedSpecies) {
                const sp = data[0];
                return {
                  ...g,
                  speciesId: sp.id,
                  speciesSlug: sp.slug,
                  speciesName: sp.name,
                };
              }
              return g;
            })
          );
        }
      })
      .catch((err) => console.error('Failed to load species list', err))
      .finally(() => {
        if (mounted) setSpeciesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  // Helper to update active group fields
  const updateActiveGroup = (updates: Partial<AnimalTriageGroup>) => {
    clearStaleResults();
    setLocalGroups((prev) =>
      prev.map((g) => {
        if (g.id === activeGroupId) {
          const next = { ...g, ...updates };

          // If sick number changed, adjust symptom counts
          if (updates.sick !== undefined) {
            const newSick = Math.max(1, updates.sick);
            next.symptoms = next.symptoms.map((s) => ({
              ...s,
              count: Math.min(s.count, newSick),
            }));
          }

          return next;
        }
        return g;
      })
    );
  };

  // Change species for active group
  const handleSelectSpecies = (sp: Species) => {
    clearStaleResults();
    setSelectedSpecies(sp);
    updateActiveGroup({
      speciesId: sp.id,
      speciesSlug: sp.slug,
      speciesName: sp.name,
      // Filter out symptoms that don't apply to the new species (e.g. remove milk/teat from poultry)
      symptoms: activeGroup.symptoms.filter((sym) => {
        const def = ALL_SIGNS_CATALOG.find((d) => d.id === sym.symptomId);
        return def ? def.applicableSpeciesSlugs.includes(sp.slug) : true;
      }),
    });
    // Reset category filter
    setActiveCategory('all');
    setShowAllSigns(false);
  };

  // Add another animal group
  const handleAddAnotherGroup = () => {
    clearStaleResults();
    const nextId = `grp-${Date.now()}`;
    // Pick next species not already in groups, or first
    const usedSpeciesIds = groups.map((g) => g.speciesId);
    const unusedSpecies = speciesList.find((sp) => !usedSpeciesIds.includes(sp.id)) || speciesList[0] || {
      id: 2,
      slug: 'goats',
      name: 'Goats',
    };

    const newGroup: AnimalTriageGroup = {
      id: nextId,
      speciesId: unusedSpecies.id,
      speciesSlug: unusedSpecies.slug,
      speciesName: unusedSpecies.name,
      herdSize: 20,
      sick: 1,
      dead: 0,
      symptoms: [],
    };

    setLocalGroups((prev) => [...prev, newGroup]);
    setActiveGroupId(nextId);
  };

  // Remove an animal group
  const handleRemoveGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    clearStaleResults();
    const remaining = groups.filter((g) => g.id !== groupId);
    setLocalGroups(remaining);
    if (activeGroupId === groupId) {
      setActiveGroupId(remaining[0].id);
    }
  };

  // Add symptom to active group
  const handleAddSymptomToActiveGroup = (sym: {
    symptomId: number;
    nameEn: string;
    matchedTerm?: string | null;
    key?: string;
  }) => {
    clearStaleResults();
    if (activeGroup.symptoms.some((s) => s.symptomId === sym.symptomId)) {
      return;
    }
    const newItem: SymptomCountItem = {
      symptomId: sym.symptomId,
      symptomKey: sym.key || 'symptom',
      nameEn: sym.nameEn,
      matchedTerm: sym.matchedTerm || sym.nameEn,
      count: Math.max(1, activeGroup.sick),
    };

    updateActiveGroup({
      symptoms: [...activeGroup.symptoms, newItem],
    });
  };

  // Remove symptom from active group
  const handleRemoveSymptomFromActiveGroup = (symptomId: number) => {
    clearStaleResults();
    updateActiveGroup({
      symptoms: activeGroup.symptoms.filter((s) => s.symptomId !== symptomId),
    });
  };

  // Update count for a specific symptom with stepper
  const handleUpdateSymptomCount = (symptomId: number, delta: number) => {
    clearStaleResults();
    updateActiveGroup({
      symptoms: activeGroup.symptoms.map((s) => {
        if (s.symptomId === symptomId) {
          const nextCount = Math.max(1, Math.min(s.count + delta, activeGroup.sick));
          return { ...s, count: nextCount };
        }
        return s;
      }),
    });
  };

  // Symptoms catalog filtered for current group's species
  const speciesCatalog = ALL_SIGNS_CATALOG.filter((sign) =>
    sign.applicableSpeciesSlugs.includes(activeGroup.speciesSlug)
  );

  // Common vs All
  const displayedCatalog = speciesCatalog.filter((sign) => {
    // Category match
    if (activeCategory !== 'all' && sign.category !== activeCategory) {
      return false;
    }
    // If not showing all signs, restrict to the 8 common signs for this species
    if (!showAllSigns && activeCategory === 'all') {
      return sign.isCommonFor.includes(activeGroup.speciesSlug);
    }
    return true;
  });

  // Category definitions with Lucide icons (one consistent icon set, size w-5 h-5 stroke-[2])
  const isPoultry = activeGroup.speciesSlug === 'poultry';
  const categories = [
    { id: 'all', name: 'All signs', icon: Layers },
    { id: 'respiratory', name: 'Breathing & chest', icon: Wind },
    { id: 'digestive', name: 'Digestive & droppings', icon: Activity },
    { id: 'mouth-feet', name: isPoultry ? 'Legs & wings' : 'Mouth & feet', icon: Footprints },
    { id: 'systemic', name: 'Fever & whole body', icon: Thermometer },
    {
      id: 'production',
      name: isPoultry ? 'Egg laying' : 'Milk & teats',
      icon: isPoultry ? Egg : Milk,
    },
    { id: 'eyes-skin', name: 'Eyes & skin', icon: Eye },
  ];

  // Validation across groups
  const validationErrors: string[] = [];
  groups.forEach((g, idx) => {
    const label = groups.length > 1 ? `${g.speciesName} (${t.groupLabel} ${idx + 1}): ` : '';
    if (g.sick > g.herdSize) {
      validationErrors.push(`${label}${t.errorSickExceedsHerd} (${g.sick} sick > ${g.herdSize} total).`);
    }
    if (g.dead > g.herdSize) {
      validationErrors.push(`${label}${t.errorDeadExceedsHerd} (${g.dead} dead > ${g.herdSize} total).`);
    }
  });

  const totalSignsSelected = groups.reduce((acc, g) => acc + g.symptoms.length, 0);
  const isValid = validationErrors.length === 0 && totalSignsSelected >= 2;

  const [submittingReport, setSubmittingReport] = useState(false);

  // Submit, save to database, and navigate to results
  const handleSubmitTriage = async () => {
    if (!isValid || submittingReport) return;

    setSubmittingReport(true);

    // Build required payload:
    // { groups: [ { speciesId, herdSize, sick, dead, symptoms: [ { symptomId, count } ] } ], location: { lat, lng, county } }
    const payload = {
      groups: groups.map((g) => ({
        speciesId: g.speciesId,
        herdSize: g.herdSize,
        sick: g.sick,
        dead: g.dead,
        symptoms: g.symptoms.map((s) => ({
          symptomId: s.symptomId,
          count: s.count,
        })),
      })),
      location: {
        lat: location.latitude,
        lng: location.longitude,
        county: location.county,
      },
    };

    // Store in session context
    setTriagePayload(payload);
    setTriageGroups(groups);

    // Save every logged symptom group into database so no logged symptom is lost
    try {
      for (const grp of groups) {
        if (grp.symptoms.length > 0) {
          await submitCaseReport({
            speciesId: grp.speciesId,
            symptomIds: grp.symptoms.map((s) => s.symptomId),
            county: location.county,
            latitude: location.latitude,
            longitude: location.longitude,
            animalsAffected: grp.sick,
            animalsDead: grp.dead,
            isHerd: grp.sick > 1,
            herdSize: grp.herdSize,
          });
        }
      }
    } catch (saveErr) {
      console.warn('Auto-save case report error:', saveErr);
    }

    // Sync primary group into legacy store fields for downstream screen compatibility
    const primary = groups[0];
    const primarySpecies = speciesList.find((s) => s.id === primary.speciesId) || {
      id: primary.speciesId,
      slug: primary.speciesSlug,
      name: primary.speciesName,
    };
    setSelectedSpecies(primarySpecies);
    setHerdSize(primary.herdSize);
    setIsHerd(primary.sick > 1);
    setAffectedCount(primary.sick);

    // Populate primary symptoms list
    clearSymptoms();
    primary.symptoms.forEach((s) => {
      addSymptom({
        id: s.symptomId,
        key: s.symptomKey || 'symptom',
        nameEn: s.nameEn,
        matchedTerm: s.matchedTerm || s.nameEn,
      });
    });

    setSubmittingReport(false);
    setCurrentTab('results');
  };

  const speciesIcons: Record<string, string> = {
    'dairy-cattle': '🐄',
    'goats': '🐐',
    'sheep': '🐑',
    'poultry': '🐔',
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-6xl mx-auto">
      {/* Group Switcher Tabs (If multiple groups exist) */}
      {groups.length > 1 && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800">
              Reporting multiple animal groups on this farm:
            </span>
            <button
              type="button"
              onClick={handleAddAnotherGroup}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addAnotherGroup}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {groups.map((grp, index) => {
              const isCurrent = grp.id === activeGroupId;
              return (
                <div
                  key={grp.id}
                  onClick={() => setActiveGroupId(grp.id)}
                  className={`px-3.5 py-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 min-h-[44px] ${
                    isCurrent
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  <span className="text-lg">{speciesIcons[grp.speciesSlug] || '🐾'}</span>
                  <div>
                    <span className="text-sm font-bold block leading-tight">
                      {grp.speciesName}
                    </span>
                    <span
                      className={`text-xs block ${
                        isCurrent ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {grp.symptoms.length} signs • {grp.sick} {t.sickCountLabel}
                    </span>
                  </div>

                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveGroup(grp.id);
                      }}
                      className={`p-1 rounded-lg hover:bg-white/20 transition-colors ml-1 ${
                        isCurrent ? 'text-emerald-100 hover:text-white' : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title={t.removeGroup}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* STEP 1: CHOOSE ANIMAL */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {t.step1Title}
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Select which animal type has health issues. The symptoms and questions below adapt to your choice.
                </p>
              </div>
            </div>

            {speciesLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {speciesList.map((sp) => {
                  const isChosen = activeGroup.speciesId === sp.id;
                  const icon = speciesIcons[sp.slug] || '🐾';
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => handleSelectSpecies(sp)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[72px] ${
                        isChosen
                          ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/20 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl">{icon}</span>
                        {isChosen && (
                          <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <span className="text-base font-bold mt-2 block text-slate-900">
                        {sp.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* STEP 2: ADD SYMPTOMS (Search Box + Filtered Quick Chips) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {t.step2Title}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Type symptoms in English, Kiswahili or local languages, or tap common signs below.
              </p>
            </div>

            {/* Dedicated Search Component (Clean plug-in point for symptom dictionary) */}
            <SymptomSearchBar
              speciesId={activeGroup.speciesId}
              onSelectSymptom={(sym) =>
                handleAddSymptomToActiveGroup({
                  symptomId: sym.symptomId,
                  nameEn: sym.englishName,
                  matchedTerm: sym.matchedTerm,
                })
              }
              selectedSymptomIds={activeGroup.symptoms.map((s) => s.symptomId)}
            />

            {/* Body-System Scrollable Category Tabs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">
                  {t.commonSignsHeader}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllSigns(!showAllSigns)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline min-h-[36px] flex items-center px-1"
                >
                  {showAllSigns ? t.showFewerSigns : t.showAllSigns}
                </button>
              </div>

              {/* Scrollable category bar with visible cue and no broken icons */}
              <div className="relative">
                <div className="overflow-x-auto scrollbar-none flex items-center gap-2 pb-1 pr-8">
                  {categories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 min-h-[44px] flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 stroke-[2] ${isActive ? 'text-white' : 'text-slate-600'}`} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Visual scroll gradient cue on mobile */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-white to-transparent" />
              </div>

              {/* Quick Symptom Chips Grid (min 44px touch targets, bilingual labels, no diseases) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {displayedCatalog.map((sign) => {
                  const isSelected = activeGroup.symptoms.some((s) => s.symptomId === sign.id);
                  return (
                    <button
                      key={sign.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          handleRemoveSymptomFromActiveGroup(sign.id);
                        } else {
                          handleAddSymptomToActiveGroup({
                            symptomId: sign.id,
                            nameEn: sign.nameEn,
                            matchedTerm: sign.nameSw,
                            key: sign.key,
                          });
                        }
                      }}
                      className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-500 font-bold text-emerald-950 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-base font-bold block text-slate-900 leading-snug">
                          {sign.nameEn}
                        </span>
                        <span className="text-sm font-medium text-slate-500 block">
                          {sign.nameSw}
                        </span>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white border border-slate-300 text-slate-400'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* STEP 3: ANIMAL COUNTS (Total, Sick, Dead, and Per-Symptom Counts) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {t.step3Title}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Specify the number of animals on your farm and how many present each sign.
              </p>
            </div>

            {/* Total, Sick, Dead Counts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total in Herd/Flock */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <label className="text-sm font-bold text-slate-800 block">
                  {t.totalInHerd} *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={activeGroup.herdSize}
                  onChange={(e) =>
                    updateActiveGroup({
                      herdSize: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px]"
                />
                <span className="text-xs text-slate-500 block">Total animals in boma/flock</span>
              </div>

              {/* How Many Sick */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <label className="text-sm font-bold text-slate-800 block">
                  {t.howManySick} *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={activeGroup.sick}
                  onChange={(e) =>
                    updateActiveGroup({
                      sick: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px]"
                />
                <span className="text-xs text-slate-500 block">
                  {activeGroup.sick === 1 ? 'Individual animal case' : 'Group / herd outbreak case'}
                </span>
              </div>

              {/* How Many Dead */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <label className="text-sm font-bold text-slate-800 block">
                  {t.howManyDead}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={activeGroup.dead}
                  onChange={(e) =>
                    updateActiveGroup({
                      dead: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px]"
                />
                <span className="text-xs text-slate-500 block">Losses in last 14 days</span>
              </div>
            </div>

            {/* Validation Errors for Counts */}
            {activeGroup.sick > activeGroup.herdSize && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{t.errorSickExceedsHerd}</span>
              </div>
            )}
            {activeGroup.dead > activeGroup.herdSize && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{t.errorDeadExceedsHerd}</span>
              </div>
            )}

            {/* Per-Symptom Counts Stepper */}
            <div className="pt-2 space-y-2.5">
              <span className="text-sm font-bold text-slate-900 block">
                How many animals show each chosen symptom?
              </span>

              {activeGroup.symptoms.length === 0 ? (
                <div className="py-5 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-sm font-semibold text-slate-600">
                    No symptoms added for this group yet
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select symptoms in Step 2 above to adjust counts.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeGroup.symptoms.map((sym) => (
                    <div
                      key={sym.symptomId}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 min-h-[44px]"
                    >
                      <div className="min-w-0">
                        <span className="text-base font-bold text-slate-900 block leading-tight">
                          {sym.nameEn}
                        </span>
                        {sym.matchedTerm && sym.matchedTerm !== sym.nameEn && (
                          <span className="text-xs text-slate-500 font-medium block">
                            Local term: {sym.matchedTerm}
                          </span>
                        )}
                      </div>

                      {/* Stepper (Minus, Count, Plus) + Remove */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateSymptomCount(sym.symptomId, -1)}
                            disabled={sym.count <= 1}
                            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                            title="Decrease count"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center text-base font-bold text-slate-900">
                            {sym.count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateSymptomCount(sym.symptomId, 1)}
                            disabled={sym.count >= activeGroup.sick}
                            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                            title="Increase count"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSymptomFromActiveGroup(sym.symptomId)}
                          className="w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Remove sign"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location & Farm Area Capture Section */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600" />
                  <span>Farm Location & County</span>
                </span>
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={locatingGps}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-2xs ${
                    locatingGps
                      ? 'bg-slate-100 text-slate-500 border border-slate-300 cursor-wait'
                      : location.isGps
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                  }`}
                >
                  {locatingGps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-700 animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : location.isGps ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>GPS Active (Update)</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Detect GPS Location</span>
                    </>
                  )}
                </button>
              </div>

              {/* Real-time GPS feedback notice */}
              {gpsFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                    gpsFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-amber-50 text-amber-950 border border-amber-300'
                  }`}
                >
                  {gpsFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  )}
                  <span>{gpsFeedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Farm County (Kenya)
                  </label>
                  <select
                    value={location.county}
                    onChange={(e) => handleCountyChange(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[44px]"
                  >
                    {KENYAN_COUNTIES_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c} County
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Coordinates (for Outbreak Map & Vet Distance)
                  </label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 flex items-center justify-between min-h-[44px]">
                    <span>
                      {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        location.isGps
                          ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                          : 'text-slate-600 bg-slate-200/80 border-slate-300'
                      }`}
                    >
                      {location.isGps ? 'GPS Detected' : 'County Center'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Location data is recorded to map outbreak disease clusters and match nearest veterinary officers.
              </p>
            </div>
          </section>

          {/* Add Another Animal Group Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleAddAnotherGroup}
              className="w-full py-3.5 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 font-bold text-base rounded-2xl flex items-center justify-center gap-2 transition-all min-h-[44px]"
            >
              <Plus className="w-5 h-5 text-emerald-700" />
              <span>{t.addAnotherGroup}</span>
            </button>
          </div>

          {/* Animal & Symptoms Summary Card — Positioned at the bottom of the form */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600/80 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-emerald-700" />
                <span>{t.summaryTitle}</span>
              </h3>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {groups.length} {groups.length === 1 ? 'animal group' : 'groups'}
              </span>
            </div>

            {/* List of groups and signs */}
            <div className="space-y-3">
              {groups.map((grp) => (
                <div key={grp.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-xl">{speciesIcons[grp.speciesSlug] || '🐾'}</span>
                      <span>{grp.speciesName}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {grp.sick} of {grp.herdSize} {t.sickCountLabel}
                    </span>
                  </div>

                  {grp.symptoms.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No symptoms chosen</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {grp.symptoms.map((s) => (
                        <div key={s.symptomId} className="flex items-center justify-between text-xs font-medium text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs">
                          <span className="truncate max-w-[200px] font-bold">• {s.nameEn}</span>
                          <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{s.count} sick</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Minimum Signs & Validation Status */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Status:</span>
                <span
                  className={`font-bold ${
                    isValid ? 'text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {totalSignsSelected >= 2
                    ? `${totalSignsSelected} signs selected`
                    : `${totalSignsSelected} of 2 signs added`}
                </span>
              </div>

              {!isValid && validationErrors.length > 0 && (
                <p className="text-sm font-semibold text-red-600 leading-snug">
                  {validationErrors[0]}
                </p>
              )}

              {totalSignsSelected < 2 && validationErrors.length === 0 && (
                <p className="text-sm text-slate-500 font-medium">
                  {t.minSignsHint}
                </p>
              )}

              <button
                type="button"
                disabled={!isValid || submittingReport}
                onClick={handleSubmitTriage}
                className={`w-full py-3.5 px-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px] ${
                  isValid && !submittingReport
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-98 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-5 h-5 text-emerald-200" />
                <span>{submittingReport ? 'Saving symptoms & checking...' : t.checkSymptomsButton}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      {/* Sticky Bottom Bar (Always reachable on both laptop & mobile without scrolling) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
          <div className="min-w-0">
            <span className="text-sm font-bold text-slate-900 block truncate">
              {totalSignsSelected >= 2
                ? `${totalSignsSelected} signs selected`
                : `${totalSignsSelected} of 2 signs added`}
            </span>
            <span className="text-xs text-slate-500 block truncate">
              {validationErrors.length > 0
                ? 'Fix count error above'
                : totalSignsSelected >= 2
                ? t.readyHint
                : t.minSignsHint}
            </span>
          </div>

          <button
            type="button"
            disabled={!isValid || submittingReport}
            onClick={handleSubmitTriage}
            className={`py-2.5 px-5 rounded-xl text-sm font-bold flex items-center gap-2 flex-shrink-0 min-h-[44px] shadow-sm transition-all ${
              isValid && !submittingReport
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-95 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>{submittingReport ? 'Saving...' : t.checkSymptomsButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
