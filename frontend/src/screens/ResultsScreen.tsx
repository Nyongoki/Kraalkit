import React, { useEffect, useState } from 'react';
import { useSession } from '../store/sessionContext';
import { matchSymptoms, fetchNearestVets } from '../lib/api';
import { MatchedCondition, Vet } from '../types';
import { SafetyNotice } from '../components/SafetyNotice';
import { ConditionCard } from '../components/ConditionCard';
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
} from 'lucide-react';

interface ResultsScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ setCurrentTab }) => {
  const {
    t,
    selectedSpecies,
    selectedSymptoms,
    location,
    useCurrentGps,
    isHerd,
    setIsHerd,
    herdSize,
    setHerdSize,
  } = useSession();

  const [conditions, setConditions] = useState<MatchedCondition[]>([]);
  const [herdNotice, setHerdNotice] = useState<string | null>(null);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      {/* 1. Mandatory Safety Notice */}
      <SafetyNotice />

      {/* 2. Top Scope Switcher & Summary Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('search')}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100"
              title="Back to symptom selector"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Evaluated Signs ({selectedSymptoms.length})
              </span>
              <p className="text-sm font-extrabold text-slate-900">
                {selectedSymptoms.length > 0
                  ? selectedSymptoms.map((s) => s.matchedTerm || s.nameEn).join(', ')
                  : 'No signs selected'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentTab('search')}
            className="text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors w-fit"
          >
            + Add / Change Signs
          </button>
        </div>

        {/* Live Scope Toggle */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Evaluation Scope:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setIsHerd(false)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isHerd
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PawPrint className="w-3.5 h-3.5 text-emerald-600" />
                <span>Single Animal</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHerd(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isHerd
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-200" />
                <span>Herd Outbreak</span>
              </button>
            </div>
          </div>

          {isHerd && (
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              <span>Herd Size:</span>
              <input
                type="number"
                min="2"
                max="10000"
                value={herdSize}
                onChange={(e) => setHerdSize(parseInt(e.target.value, 10) || 10)}
                className="w-16 bg-white border border-purple-300 rounded-lg px-2 py-0.5 text-xs font-black text-purple-950"
              />
              <span>animals</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Herd Contagion Alert Notice (If Herd mode is active and notice received) */}
      {isHerd && herdNotice && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 sm:p-6 rounded-3xl shadow-md border border-purple-700 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-800/80 text-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Biohazard className="w-6 h-6 text-amber-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Epizootic Risk Warning
                </span>
                <span className="text-xs text-purple-200 font-semibold">
                  Herd Outbreak Model
                </span>
              </div>
              <p className="text-sm font-bold text-white mt-1.5 leading-relaxed">
                {herdNotice}
              </p>
            </div>
          </div>

          {/* Quick Biosecurity Quarantine Checklist */}
          <div className="pt-3 border-t border-purple-800/70 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-purple-100">
            <div className="flex items-center gap-2 bg-purple-950/50 p-2.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>1. Isolate sick stock in a separate boma/stall</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-950/50 p-2.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>2. Disinfect water troughs and boots with Virkon/bleach</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-950/50 p-2.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>3. Halt animal sales or communal grazing immediately</span>
            </div>
          </div>
        </div>
      )}

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
            conditions.map((condition) => (
              <ConditionCard key={condition.id} condition={condition} />
            ))}
        </div>

        {/* Right Column: Outbreak Escalation & Nearby Registered Vets */}
        <div className="lg:col-span-5 space-y-4">
          {/* Outbreak Escalation Shortcut */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-purple-950">
                  {isHerd ? 'Herd Outbreak Escalation' : 'Multiple Sick Animals?'}
                </p>
                <p className="text-[11px] text-purple-700 font-medium">
                  Submit official report to County Veterinary Officer
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('report')}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-xs active:scale-95 flex-shrink-0 transition-all"
            >
              Log Case
            </button>
          </div>

          {/* Vets Directory with GPS Live Distance */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{t.nearbyVets}</span>
              </h3>
              <button
                type="button"
                onClick={useCurrentGps}
                className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{location.county} (GPS)</span>
              </button>
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
