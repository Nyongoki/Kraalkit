import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { submitCaseReport } from '../lib/api';
import { ScreenTab } from '../components/Navigation';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Send,
  Users,
  PawPrint,
  ShieldCheck,
} from 'lucide-react';

interface ReportCaseScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const ReportCaseScreen: React.FC<ReportCaseScreenProps> = ({ setCurrentTab }) => {
  const {
    t,
    selectedSpecies,
    selectedSymptoms,
    location,
    isHerd: sessionIsHerd,
    herdSize: sessionHerdSize,
  } = useSession();

  const [isHerd, setIsHerd] = useState(sessionIsHerd);
  const [herdSize, setHerdSize] = useState(sessionHerdSize || 30);
  const [affected, setAffected] = useState(isHerd ? 5 : 1);
  const [dead, setDead] = useState(0);
  const [county, setCounty] = useState(location.county || 'Kisii');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{ id: number; createdAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kenyanCounties = [
    'Kisii', 'Nyamira', 'Migori', 'Homa Bay', 'Kisumu', 'Siaya',
    'Kericho', 'Bomet', 'Narok', 'Kajiado', 'Nakuru', 'Uasin Gishu',
    'Nandi', 'Baringo', 'Turkana', 'West Pokot', 'Marsabit', 'Isiolo',
    'Garissa', 'Wajir', 'Mandera', 'Kiambu', 'Murang\'a', 'Nyeri',
    'Kirinyaga', 'Nyandarua', 'Meru', 'Tharaka-Nithi', 'Machakos',
    'Kitui', 'Makueni', 'Kakamega', 'Bungoma', 'Busia', 'Vihiga'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecies) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await submitCaseReport({
        speciesId: selectedSpecies.id,
        symptomIds: selectedSymptoms.length > 0 ? selectedSymptoms.map((s) => s.id) : [1],
        county,
        latitude: location.latitude,
        longitude: location.longitude,
        animalsAffected: affected,
        animalsDead: dead,
        isHerd,
        herdSize: isHerd ? herdSize : 1,
      });
      setReceipt(res);
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCurrentTab('results')}
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span>{t.reportTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Log active clinical cases into Kenya's national epizootic surveillance database
          </p>
        </div>
      </div>

      {receipt ? (
        <div className="bg-white p-8 rounded-3xl border border-purple-200 text-center shadow-md animate-fadeIn space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Case Surveillance Log #{receipt.id} Registered
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Your incidence report for <strong>{selectedSpecies?.name}</strong> in{' '}
            <strong>{county} County</strong> ({isHerd ? `Herd Outbreak of ${affected} head` : 'Individual Animal'}) has been securely logged with the Sub-County Veterinary Office and mapped into regional disease clusters.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setCurrentTab('map')}
              className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-black px-5 py-3 rounded-xl shadow-xs active:scale-95 transition-all"
            >
              View on Outbreak Map
            </button>
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                setAffected(1);
                setDead(0);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-3 rounded-xl transition-colors"
            >
              Report Another Case
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          {/* Pre-filled Clinical Context Summary */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-black text-purple-950 uppercase tracking-wider">
                Clinical Context
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-purple-900">
              <div>
                Species: <strong className="font-black text-purple-950">{selectedSpecies?.name}</strong>
              </div>
              <div>
                Report Location: <strong className="font-black text-purple-950">{county} County</strong>
              </div>
            </div>
            <p className="text-xs text-purple-800 mt-1.5">
              Signs:{' '}
              <span className="font-semibold">
                {selectedSymptoms.length > 0
                  ? selectedSymptoms.map((s) => s.matchedTerm || s.nameEn).join(', ')
                  : 'Fever / General clinical signs'}
              </span>
            </p>
          </div>

          {/* Scope Selection: Individual Animal vs Herd Outbreak */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
              Select Case Scope *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => {
                  setIsHerd(false);
                  if (affected > 1) setAffected(1);
                }}
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
                    <p className="text-xs font-black">Single Animal</p>
                    <p className="text-[11px] text-slate-500">1 individual animal affected</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  setIsHerd(true);
                  if (affected < 2) setAffected(3);
                }}
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
                    <p className="text-xs font-black">Multiple Animals / Herd Outbreak</p>
                    <p className="text-[11px] text-purple-700">Cluster or boma-wide transmission</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Herd Size (Only if Herd selected) */}
          {isHerd && (
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 animate-fadeIn">
              <label className="text-xs font-black text-purple-950 block mb-1.5">
                Total Animals in the Herd / Flock *
              </label>
              <input
                type="number"
                min="2"
                max="5000"
                required
                value={herdSize}
                onChange={(e) => setHerdSize(parseInt(e.target.value, 10) || 10)}
                placeholder="e.g. 35"
                className="w-full bg-white border border-purple-300 rounded-xl p-3 text-sm font-black text-purple-950 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Counts: Affected & Dead */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1.5">
                {t.affectedCount} *
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                required
                value={affected}
                onChange={(e) => setAffected(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 block mb-1.5">
                {t.deadCount} (if any)
              </label>
              <input
                type="number"
                min="0"
                max="5000"
                value={dead}
                onChange={(e) => setDead(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* County / Location */}
          <div>
            <label className="text-xs font-black text-slate-700 block mb-1.5">
              {t.county} *
            </label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500"
            >
              {kenyanCounties.map((c) => (
                <option key={c} value={c}>
                  {c} County
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white text-xs sm:text-sm font-black py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Transmitting report...' : t.submitReport}</span>
          </button>
        </form>
      )}
    </div>
  );
};
