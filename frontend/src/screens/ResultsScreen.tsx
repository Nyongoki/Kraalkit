import React, { useEffect, useState } from 'react';
import { useSession } from '../store/sessionContext';
import { matchSymptoms, fetchNearestVets, fetchCopilotExplanation } from '../lib/api';
import { MatchedCondition, Vet, CopilotExplanationResponse } from '../types';
import { SafetyNotice } from '../components/SafetyNotice';
import { ConditionCard } from '../components/ConditionCard';
import { VetCopilotPanel } from '../components/VetCopilotPanel';
import { VetCard } from '../components/VetCard';
import { ScreenTab } from '../components/Navigation';
import {
  Stethoscope,
  MapPin,
  AlertCircle,
  FileText,
  Navigation,
  ArrowLeft,
  Users,
  PawPrint,
  Biohazard,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  Lock,
  UserPlus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ResultsScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ setCurrentTab }) => {
  const {
    t,
    interfaceLang,
    selectedSpecies,
    animalInfo,
    selectedSymptoms,
    location,
    useCurrentGps,
    isHerd,
    setIsHerd,
    herdSize,
    setHerdSize,
    affectedCount,
    currentUser,
    authToken,
    openAuthModal,
  } = useSession();

  const [conditions, setConditions] = useState<MatchedCondition[]>([]);
  const [herdNotice, setHerdNotice] = useState<string | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vet Co-Pilot State (Available across all matched conditions)
  const [activeCopilotConditionId, setActiveCopilotConditionId] = useState<number | null>(null);
  const [copilotDataMap, setCopilotDataMap] = useState<Record<number, CopilotExplanationResponse>>({});
  const [copilotLoadingId, setCopilotLoadingId] = useState<number | null>(null);
  const [copilotErrorMap, setCopilotErrorMap] = useState<Record<number, string>>({});

  // Stale Protection: Clear explanations immediately if symptoms, species or counts change
  useEffect(() => {
    setActiveCopilotConditionId(null);
    setCopilotDataMap({});
    setCopilotErrorMap({});
  }, [selectedSymptoms, selectedSpecies, herdSize, affectedCount, isHerd]);

  const fetchExplanationForCondition = async (condition: MatchedCondition) => {
    if (!selectedSpecies || copilotDataMap[condition.id]) return;

    setCopilotLoadingId(condition.id);
    try {
      const lang = interfaceLang === 'sw' ? 'sw' : 'en';
      const total = isHerd ? herdSize : Math.max(affectedCount, 1);
      const sick = Math.max(affectedCount, 1);
      const dead = 0;

      const symptomPayload = selectedSymptoms.map((s) => ({
        symptomId: s.id,
        count: sick,
      }));

      const res = await fetchCopilotExplanation(
        {
          speciesId: selectedSpecies.id,
          language: lang,
          conditionId: condition.id,
          herd: { total, sick, dead },
          symptoms: symptomPayload,
        },
        authToken || undefined
      );

      setCopilotDataMap((prev) => ({ ...prev, [condition.id]: res }));
    } catch (err: any) {
      console.warn('Copilot call error:', err);
      setCopilotErrorMap((prev) => ({
        ...prev,
        [condition.id]: err.message || 'Could not load AI explanation',
      }));
    } finally {
      setCopilotLoadingId(null);
    }
  };

  const handleToggleExplain = async (condition: MatchedCondition) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    if (activeCopilotConditionId === condition.id) {
      setActiveCopilotConditionId(null);
      return;
    }

    if (!selectedSpecies) return;

    setActiveCopilotConditionId(condition.id);
    await fetchExplanationForCondition(condition);
  };

  useEffect(() => {
    async function loadResults() {
      if (!selectedSpecies) return;

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch condition matches with herd scope flag
        if (selectedSymptoms.length >= 2) {
          const res = await matchSymptoms(
            selectedSymptoms.map((s) => s.id),
            selectedSpecies.id,
            isHerd,
            herdSize
          );
          setConditions(res.conditions);
          setHerdNotice(res.herdNotice || null);

          // Auto-expand Vet Co-Pilot for the top-matched condition ONLY if logged in
          if (res.conditions.length > 0 && currentUser) {
            const top = res.conditions[0];
            const isAnthraxOrBlackleg =
              top.name.toLowerCase().includes('anthrax') ||
              top.name.toLowerCase().includes('blackleg');
            if (
              !isAnthraxOrBlackleg &&
              top.firstAid &&
              top.firstAid.trim().length > 0 &&
              !top.firstAid.includes('[PLACEHOLDER')
            ) {
              setActiveCopilotConditionId(top.id);
              fetchExplanationForCondition(top);
            }
          }
        } else {
          setConditions([]);
          setHerdNotice(null);
        }

        // 2. Fetch nearest vets
        const vetList = await fetchNearestVets(
          location.latitude,
          location.longitude,
          selectedSpecies.id,
          6
        );
        setVets(vetList);
      } catch (err: any) {
        setError(err.message || 'Error loading clinical results');
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [selectedSymptoms, selectedSpecies, location, isHerd, herdSize]);

  return (
    <div className="space-y-6 pb-16">
      {/* Optional Login Banner if Guest (Non-blocking) */}
      {!currentUser && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span className="text-slate-700 font-semibold">
              Viewing as Guest. Sign in or register to save your animal history and farm case logs.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="text-emerald-800 font-bold hover:underline"
            >
              Sign In
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1 rounded-lg"
            >
              Register Free
            </button>
          </div>
        </div>
      )}

      {/* 1. Mandatory Safety Notice */}
      <SafetyNotice />

      {/* 2. Top Animal Patient & Scope Summary Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Identified Animal Patient Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-black flex-shrink-0">
              {selectedSpecies?.slug === 'dairy-cattle' ? '🐄' : selectedSpecies?.slug === 'goats' ? '🐐' : selectedSpecies?.slug === 'sheep' ? '🐑' : '🐔'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  {animalInfo?.nameOrTag || (isHerd ? 'Herd / Flock Outbreak' : `Examined ${selectedSpecies?.name}`)}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {selectedSpecies?.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Stage: <strong className="text-slate-700">{animalInfo?.stage}</strong>
                {animalInfo?.age ? ` • Age: ${animalInfo.age}` : ''}
                <span className="text-emerald-700 font-bold"> • {affectedCount} {affectedCount === 1 ? 'animal' : 'animals'} presenting signs</span>
                {isHerd ? ` • Total Group: ${herdSize} head` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('search')}
            className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1 w-fit"
          >
            <span>Change Animal or Signs →</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('search')}
              className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              title="Back to symptom selector"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Evaluated Signs ({selectedSymptoms.length})
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900">
                {selectedSymptoms.length > 0
                  ? selectedSymptoms.map((s) => s.matchedTerm || s.nameEn).join(', ')
                  : 'No signs selected'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('search')}
            className="text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors w-fit"
          >
            + Add / Change Signs
          </button>
        </div>

        {/* Live Scope Toggle */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Evaluation Scope:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setIsHerd(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isHerd
                    ? 'bg-white text-emerald-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PawPrint className="w-3.5 h-3.5 text-emerald-600" />
                <span>Single Animal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHerd(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isHerd
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-200" />
                <span>Herd Outbreak</span>
              </button>
            </div>
          </div>

          {isHerd && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              <span>Herd Size:</span>
              <input
                type="number"
                min="2"
                max="10000"
                value={herdSize}
                onChange={(e) => setHerdSize(parseInt(e.target.value, 10) || 10)}
                className="w-16 bg-white border border-purple-300 rounded-md px-1.5 py-0.5 text-xs font-black text-purple-950"
              />
              <span>animals</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Post-evaluation plain warning based on sick share and urgency */}
      {(() => {
        const topCondition = conditions[0];
        const isUrgent = topCondition?.urgency === 'EMERGENCY' || topCondition?.notifiable;
        const highShare = isHerd && herdSize > 0 && affectedCount / herdSize >= 0.15;
        const shouldWarn = isHerd || isUrgent;

        if (!shouldWarn) return null;

        return (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full">
                    {isUrgent ? 'Urgent condition alert' : 'Animal care notice'}
                  </span>
                  {isHerd && (
                    <span className="text-xs text-amber-900 font-semibold">
                      {affectedCount} of {herdSize} animals sick
                    </span>
                  )}
                </div>
                <p className="text-base font-bold text-slate-900 mt-1 leading-snug">
                  {isHerd
                    ? highShare
                      ? 'Several animals are sick. Separate them immediately and call a vet.'
                      : 'More than one animal is showing symptoms. Keep them apart and have a vet examine them.'
                    : 'This animal is showing serious symptoms. Please consult a qualified vet right away.'}
                </p>
                {isUrgent && (
                  <p className="text-sm text-red-700 font-semibold mt-1">
                    {topCondition?.name} is an urgent or notifiable condition in Kenya. Notify your local veterinary officer.
                  </p>
                )}
              </div>
            </div>

            {/* Plain Steps */}
            <div className="pt-2.5 border-t border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-800">
              <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Separate sick animals from the rest of the herd</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Clean feeding troughs and water buckets</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>Contact a local vet before moving or selling animals</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. Two-Column Diagnostic & Veterinary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Possible Conditions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
              <span>{t.possibleConditions}</span>
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              Weighted Clinical Algorithm
            </span>
          </div>

          {/* Dedicated Vet Co-Pilot Hero Card */}
          {!loading && conditions.length > 0 && (
            <div className={`text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 ${
              currentUser
                ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-emerald-500/40'
                : 'bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-amber-500/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner ${
                    currentUser
                      ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                      : 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                  }`}>
                    {currentUser ? (
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    ) : (
                      <Lock className="w-5 h-5 text-amber-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                        <span>Vet Co-Pilot Diagnostic Assistant</span>
                      </h4>
                      {currentUser ? (
                        <>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                            RAX-4.0 AI
                          </span>
                          <span className="text-[10px] font-bold text-emerald-200/80 bg-black/25 px-2 py-0.5 rounded-full">
                            KVB Vetted Rules Active
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Login Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 font-medium mt-1 leading-snug">
                      {currentUser
                        ? activeCopilotConditionId !== null
                          ? `Currently explaining clinical correlation and supportive actions for ${conditions.find((c) => c.id === activeCopilotConditionId)?.name || 'top condition'}.`
                          : 'AI explains vetted clinical patterns, animal counts, and key symptoms to generate farmer first-aid and questions for the visiting vet.'
                        : 'Sign in to your account to unlock RAX-4.0 AI clinical correlation, supportive actions, and interview questions for visiting veterinary officers.'}
                    </p>
                  </div>
                </div>

                {currentUser && conditions[0] ? (
                  <button
                    type="button"
                    onClick={() => handleToggleExplain(conditions[0])}
                    className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 flex-shrink-0"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-950" />
                    <span>
                      {activeCopilotConditionId === conditions[0].id
                        ? 'Collapse Co-Pilot Panel'
                        : `Explain Top Match (${conditions[0].name})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 flex-shrink-0"
                  >
                    <Lock className="w-4 h-4 text-slate-950" />
                    <span>Log In to Unlock Co-Pilot</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-black text-slate-700">
                Evaluating clinical weightings and contagion scores...
              </p>
            </div>
          )}

          {!loading && selectedSymptoms.length < 2 && (
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
              <h4 className="text-base font-black text-amber-950">
                At least 2 symptoms required
              </h4>
              <p className="text-xs text-amber-800 max-w-sm mx-auto">
                Veterinary differential diagnosis requires at least 2 distinct clinical signs for accurate probability calculation.
              </p>
              <button
                type="button"
                onClick={() => setCurrentTab('search')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-xs active:scale-95"
              >
                Select Signs Now
              </button>
            </div>
          )}

          {!loading && selectedSymptoms.length >= 2 && conditions.length === 0 && (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-2">
              <p className="text-base font-black text-slate-800">
                No matching disease reached threshold.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                The signs provided did not trigger high-confidence matches. Please call one of the registered veterinarians on the right for an on-farm examination.
              </p>
            </div>
          )}

          {!loading &&
            conditions.map((condition, index) => {
              const isTop = index === 0;
              const isAnthraxOrBlackleg =
                condition.name.toLowerCase().includes('anthrax') ||
                condition.name.toLowerCase().includes('blackleg');

              const canExplain = Boolean(
                !isAnthraxOrBlackleg &&
                condition.firstAid &&
                condition.firstAid.trim().length > 0 &&
                !condition.firstAid.includes('[PLACEHOLDER')
              );

              const isOpen = activeCopilotConditionId === condition.id;

              return (
                <div key={condition.id} className="space-y-2">
                  <ConditionCard
                    condition={condition}
                    isTopCard={isTop}
                    canExplain={canExplain}
                    isCopilotOpen={isOpen}
                    onExplainClick={() => handleToggleExplain(condition)}
                    language={interfaceLang === 'sw' ? 'sw' : 'en'}
                  />

                  {/* Vet Co-Pilot Explanation Panel */}
                  {isOpen && canExplain && (
                    <VetCopilotPanel
                      condition={condition}
                      speciesName={selectedSpecies?.name || 'Livestock'}
                      totalAnimals={isHerd ? herdSize : Math.max(affectedCount, 1)}
                      sickAnimals={Math.max(affectedCount, 1)}
                      deadAnimals={0}
                      copilotData={copilotDataMap[condition.id] || null}
                      loading={copilotLoadingId === condition.id}
                      error={copilotErrorMap[condition.id] || null}
                      countyVetPhone={vets[0]?.phone || null}
                      onGoToVets={() => setCurrentTab('vets')}
                    />
                  )}
                </div>
              );
            })}
        </div>

        {/* Right Column: Outbreak Escalation & Nearby Registered Vets */}
        <div className="lg:col-span-5 space-y-3">
          {/* Outbreak Escalation Shortcut */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-purple-950">
                  {isHerd ? 'Herd Outbreak Escalation' : 'Multiple Sick Animals?'}
                </p>
                <p className="text-[10px] text-purple-700 font-medium">
                  Submit official report to County Veterinary Officer
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('report')}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-2xs active:scale-95 flex-shrink-0 transition-all"
            >
              Log Case
            </button>
          </div>

          {/* Vets Directory with GPS Live Distance */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{t.nearbyVets}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('vets')}
                  className="text-xs font-black text-emerald-700 hover:underline"
                >
                  Full Directory →
                </button>
                <button
                  type="button"
                  onClick={useCurrentGps}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{location.county} (GPS)</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {vets.length === 0 && !loading && (
                <div className="text-center py-8 text-xs text-slate-400">
                  {t.noVetsFound}
                </div>
              )}

              {vets.map((vet) => (
                <VetCard key={vet.id} vet={vet} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
