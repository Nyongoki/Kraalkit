import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { decodeStraw, submitInseminationEvent } from '../lib/api';
import { ScreenTab } from '../components/Navigation';
import { ReproductiveForecastCard } from '../components/ReproductiveForecastCard';
import {
  Dna,
  Search,
  ShieldCheck,
  Sparkles,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Layers,
  Baby,
  AlertOctagon,
} from 'lucide-react';

interface HomeScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setCurrentTab }) => {
  const { currentUser, authToken, openAuthModal, location } = useSession();

  // Public Straw Decoder State
  const [strawText, setStrawText] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [decoded, setDecoded] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick save state
  const [cowName, setCowName] = useState('Cow #1');
  const [cowTag, setCowTag] = useState('');
  const [priceKsh, setPriceKsh] = useState<number | ''>(4500);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<any | null>(null);

  const sampleStraws = [
    { label: 'KAGRC Friesian (Conventional)', code: 'KAGRC FR SIRIKWA B2024-09 CONV' },
    { label: 'ABS Sexcel Doorman (Sexed Female)', code: '29H0 ABS SEXCEL DOORMAN LOT-8812' },
    { label: 'WWS Goldwyn 4M (Sexed Ultra)', code: '7HO WWS GOLDWYN 4M SEXED 99201' },
    { label: 'KAGRC Sahiwal Beef Cross', code: 'KAGRC SA KILIMO 89201 BEEF' },
  ];

  const handleDecode = async (codeToRun?: string) => {
    const text = codeToRun || strawText;
    if (!text.trim()) return;

    setDecoding(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const res = await decodeStraw(text.trim(), location.county, authToken || undefined);
      setDecoded(res);
      if (priceKsh === '' && res.priceBenchmark?.minKsh) {
        setPriceKsh(res.priceBenchmark.minKsh);
      }
    } catch (err: any) {
      setError(err.message || 'Error decoding straw text');
    } finally {
      setDecoding(false);
    }
  };

  const handleSaveToLedger = async () => {
    if (!currentUser || !authToken) {
      openAuthModal('register');
      return;
    }
    if (!decoded) return;

    setSaving(true);
    setError(null);

    try {
      const event = await submitInseminationEvent(
        {
          rawText: decoded.rawText,
          decoded,
          confidence: decoded.overallConfidence,
          cowName: cowName.trim() || undefined,
          cowTag: cowTag.trim() || undefined,
          breedId: decoded.breed?.value?.id,
          supplierId: decoded.supplier?.value?.id,
          bullId: decoded.bull?.value?.id,
          productType: decoded.productType?.value || 'UNKNOWN',
          priceKsh: Number(priceKsh) || undefined,
          eventDate: new Date().toISOString(),
          county: location.county,
        },
        authToken
      );
      setSaveSuccess(event);
    } catch (err: any) {
      setError(err.message || 'Error saving to ledger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. Lean Hero Header */}
      <section className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-5 sm:p-6 border border-emerald-800/40 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>National Dairy Genetics & Fraud Protection • Kenya</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Verify ARTIFICIAL INSEMINATION STRAWS & Protect Your Farm Records
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Verify sire pedigree, certified supplier, and sexed female markers instantly without logging in. Create a secure account to save your herd's breeding ledger and track pregnancies.
            </p>
          </div>

          {!currentUser ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/20 transition-all"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-xs">
              <span className="text-emerald-300 font-bold block">Logged in as {currentUser.name}</span>
              <span className="text-[11px] text-slate-300">{currentUser.county || 'Kenya'} • Cloud Backup Active</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. INSTANT AI STRAW PEDIGREE & SEXED VERIFICATION (PUBLIC - NO LOGIN NEEDED) */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Dna className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">
                ARTIFICIAL INSEMINATION STRAW Pedigree & Sexed Verification
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Free open tool: Type printed code to decode sire, supplier, sexed purity & price benchmark
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[10px] uppercase font-black bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
            Open Access
          </span>
        </div>

        {/* Post-Insemination Straw vs Receipt Audit Shortcut */}
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span className="text-slate-800 font-medium">
              Holding a spent straw after insemination? <strong className="text-emerald-900">Compare physical spent straw vs technician receipt</strong> in a side-by-side audit table.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('straw')}
            className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] px-3 py-1.5 rounded-lg shadow-2xs whitespace-nowrap active:scale-95 transition-all self-start sm:self-auto flex-shrink-0"
          >
            <span>Run Receipt Audit Table</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={strawText}
            onChange={(e) => setStrawText(e.target.value)}
            placeholder="Type code printed on straw (e.g. 29H0 ABS SEXCEL DOORMAN LOT-8812)"
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => handleDecode()}
            disabled={decoding || !strawText.trim()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{decoding ? 'Decoding...' : 'Verify Code'}</span>
          </button>
        </div>

        {/* Compact Sample Code Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-bold text-slate-400">Quick Test:</span>
          {sampleStraws.map((samp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setStrawText(samp.code);
                handleDecode(samp.code);
              }}
              className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 transition-colors"
            >
              {samp.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {/* LEAN DECODED RESULTS (Shows immediately without login) */}
        {decoded && (
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-3 animate-fadeIn mt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900">Decoded Pedigree:</span>
                <span
                  className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                    decoded.overallConfidence === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {decoded.overallConfidence} Confidence
                </span>
              </div>
              {decoded.priceBenchmark && (
                <span className="font-bold text-emerald-800 text-[11px]">
                  Market Benchmark: KSh {decoded.priceBenchmark.minKsh.toLocaleString()} - {decoded.priceBenchmark.maxKsh.toLocaleString()}
                </span>
              )}
            </div>

            {/* Critical Duplicate Fraud Alert */}
            {decoded.isDuplicateFraud && (
              <div className="bg-rose-50 border-2 border-rose-500 p-3 rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2.5 shadow-sm">
                <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-rose-700 font-black">
                    🚨 Fraud Warning: Biological Straw Tube Already Recorded
                  </div>
                  <div className="text-xs leading-relaxed text-rose-900 font-bold">
                    {decoded.cautionMessage}
                  </div>
                </div>
              </div>
            )}

            {/* Same Farmer Prior Usage Notice */}
            {decoded.infoMessage && (
              <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-xs font-bold text-emerald-950 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{decoded.infoMessage}</span>
              </div>
            )}

            {/* Caution if heavily queried */}
            {!decoded.isDuplicateFraud && decoded.cautionMessage && (
              <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-lg text-xs font-bold text-amber-950 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{decoded.cautionMessage}</span>
              </div>
            )}

            {/* Lean 5-block Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Sire / Bull</span>
                <span className="font-black text-slate-900 truncate block">
                  {decoded.bull?.meaning || 'Not Recognized'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Breed</span>
                <span className="font-black text-slate-900 truncate block">
                  {decoded.breed?.meaning || 'Not Recognized'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Supplier</span>
                <span className="font-black text-slate-900 truncate block">
                  {decoded.supplier?.meaning ? decoded.supplier.meaning.split(':')[1]?.trim() || decoded.supplier.meaning : 'Not Recognized'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Product Marking</span>
                <span
                  className={`font-black truncate block ${
                    decoded.productType?.value === 'SEXED_FEMALE' ? 'text-purple-700' : 'text-slate-900'
                  }`}
                >
                  {decoded.productType?.meaning || 'Unverified'}
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Sex of Straw</span>
                <span
                  className={`font-black truncate block ${
                    decoded.productType?.value === 'SEXED_FEMALE'
                      ? 'text-purple-700'
                      : decoded.productType?.value === 'SEXED_MALE'
                      ? 'text-blue-700'
                      : 'text-emerald-800'
                  }`}
                >
                  {decoded.productType?.value === 'SEXED_FEMALE'
                    ? 'Female ♀ (~90%)'
                    : decoded.productType?.value === 'SEXED_MALE'
                    ? 'Male ♂ (~90%)'
                    : 'Conventional 50/50'}
                </span>
              </div>
            </div>

            {/* Cryo Date & Quality Seal badges if present */}
            {(decoded.productionDate || decoded.qualitySeal) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                {decoded.productionDate && (
                  <span className="bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-md font-mono">
                    📅 Cryo Date: {decoded.productionDate.formatted}
                  </span>
                )}
                {decoded.qualitySeal && (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    🛡️ {decoded.qualitySeal.name}
                  </span>
                )}
              </div>
            )}

            {/* AUTHENTICATION GATE TO SAVE */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {!currentUser ? (
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 font-medium">
                    To record this straw under your cow and save to your herd ledger, sign in to your account.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs text-slate-700 font-bold">
                    Link to cow:
                  </span>
                  <input
                    type="text"
                    value={cowName}
                    onChange={(e) => setCowName(e.target.value)}
                    placeholder="Cow Name"
                    className="p-1 px-2 bg-white border border-slate-300 rounded-md text-xs font-bold w-24"
                  />
                  <input
                    type="text"
                    value={cowTag}
                    onChange={(e) => setCowTag(e.target.value)}
                    placeholder="Ear Tag (ID)"
                    className="p-1 px-2 bg-white border border-slate-300 rounded-md text-xs font-bold w-24"
                  />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={priceKsh}
                    onChange={(e) => setPriceKsh(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Price KSh"
                    className="p-1 px-2 bg-white border border-slate-300 rounded-md text-xs font-bold w-20"
                  />
                </div>
              )}

              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Create Account to Save</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveToLedger}
                  disabled={saving}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                  <span>{saving ? 'Saving...' : 'Save to My Ledger'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Saved Success Strip & Reproductive Forecast */}
            {saveSuccess && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="bg-emerald-100/80 border border-emerald-300 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-black text-emerald-950">
                    ✓ Saved Ref: {saveSuccess.referenceNo} for {saveSuccess.cow?.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('straw')}
                    className="text-emerald-800 underline font-bold"
                  >
                    View in Breeding Ledger →
                  </button>
                </div>

                {saveSuccess.duplicateWarning && (
                  <div className="p-2.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span>{saveSuccess.duplicateWarning}</span>
                  </div>
                )}

                <ReproductiveForecastCard
                  eventDate={saveSuccess.eventDate}
                  cowName={saveSuccess.cow?.name || cowName}
                  referenceNo={saveSuccess.referenceNo}
                  sireName={saveSuccess.bull?.name || decoded?.bull?.meaning}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Lean 3-Pillar Value Strip (No big oversized containers) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Pillar 1 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wide">
            1. Artificial Insemination Straw Fraud Protection
          </h3>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Protect against conventional straws sold at sexed prices. Verify official markings (Sexcel, Ultra4M, KAGRC) before insemination.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold mb-2">
            <Phone className="w-4 h-4" />
          </div>
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wide">
            2. WhatsApp Depo Verification
          </h3>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Generate 1-click WhatsApp messages with batch details and reference numbers directly to certified suppliers and KVB technicians.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold mb-2">
            <Baby className="w-4 h-4" />
          </div>
          <h3 className="font-black text-xs text-slate-900 uppercase tracking-wide">
            3. Calving Outcome Auditing
          </h3>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Record pregnancy outcomes and calf sex. Our system tracks heifer birth rates to audit sexed batches and flag sub-standard supplies.
          </p>
        </div>
      </section>

      {/* 4. Other Platform Services (Compact 3-Item Row) */}
      <section className="bg-slate-100/70 p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 px-1">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            Additional Platform Services:
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Available across Kenya's 47 counties</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                openAuthModal('register');
              } else {
                setCurrentTab('search');
              }
            }}
            className="p-3 bg-white hover:bg-emerald-50 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
          >
            <div>
              <span className="font-black text-xs text-slate-900 block flex items-center gap-1.5">
                <span>Symptom Triage</span>
                {!currentUser && (
                  <span className="text-[9px] uppercase font-black bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                    Account Required
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400">Multi-symptom pattern check</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                openAuthModal('login');
              } else {
                setCurrentTab('copilot');
              }
            }}
            className="p-3 bg-white hover:bg-emerald-50 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
          >
            <div>
              <span className="font-black text-xs text-slate-900 block flex items-center gap-1.5">
                <span>Vet Co-Pilot</span>
                {!currentUser && (
                  <span className="text-[9px] uppercase font-black bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Login Required
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400">RAX-4.0 AI clinical assistant</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('ration')}
            className="p-3 bg-white hover:bg-amber-50 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
          >
            <div>
              <span className="font-black text-xs text-slate-900 block">Feed Balancer</span>
              <span className="text-[10px] text-slate-400">Napier grass & farm meals</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('map')}
            className="p-3 bg-white hover:bg-purple-50 rounded-xl border border-slate-200 text-left transition-colors flex items-center justify-between"
          >
            <div>
              <span className="font-black text-xs text-slate-900 block">Outbreak Map</span>
              <span className="text-[10px] text-slate-400">Active epizootic surveillance</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-purple-700" />
          </button>
        </div>
      </section>
    </div>
  );
};
