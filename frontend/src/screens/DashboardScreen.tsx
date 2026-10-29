import React, { useState, useEffect } from 'react';
import { useSession } from '../store/sessionContext';
import { fetchInseminationEvents, sendEventWhatsApp, decodeStraw, submitVetTerm, submitInseminationEvent } from '../lib/api';
import { ScreenTab } from '../components/Navigation';
import {
  Dna,
  Search,
  Wheat,
  Map,
  ShieldCheck,
  Calendar,
  Sparkles,
  Phone,
  ArrowRight,
  Plus,
  PackageOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Bookmark,
  BookOpen,
  Globe,
  FileText,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';

interface DashboardScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ setCurrentTab }) => {
  const { currentUser, authToken, location } = useSession();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick straw verify widget on dashboard
  const [quickStraw, setQuickStraw] = useState('');
  const [quickDecoding, setQuickDecoding] = useState(false);
  const [quickDecoded, setQuickDecoded] = useState<any | null>(null);

  // Quick ledger entry state
  const [quickCowName, setQuickCowName] = useState('Cow #1');
  const [quickCowTag, setQuickCowTag] = useState('');
  const [quickPriceKsh, setQuickPriceKsh] = useState<number | ''>('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState<any | null>(null);
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!authToken) return;
      setLoading(true);
      try {
        const data = await fetchInseminationEvents(authToken);
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [authToken]);

  const handleQuickDecode = async () => {
    if (!quickStraw.trim()) return;
    setQuickDecoding(true);
    setQuickSaveSuccess(null);
    setQuickSaveError(null);
    try {
      const res = await decodeStraw(quickStraw.trim(), location.county, authToken || undefined);
      setQuickDecoded(res);
      if (res.priceBenchmark?.minKsh) {
        setQuickPriceKsh(res.priceBenchmark.minKsh);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuickDecoding(false);
    }
  };

  const handleQuickSaveToLedger = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!authToken || !currentUser) {
      alert('Please log in to save to your breeding ledger');
      return;
    }
    if (!quickDecoded) return;
    if (!quickCowName.trim()) {
      setQuickSaveError('Please enter Cow Name or Breed');
      return;
    }
    if (!quickCowTag.trim()) {
      setQuickSaveError('Please enter Cow Ear Tag / ID');
      return;
    }

    setQuickSaving(true);
    setQuickSaveError(null);
    try {
      const eventData = {
        rawText: quickDecoded.rawText || quickStraw,
        decoded: quickDecoded,
        confidence: quickDecoded.overallConfidence || 'HIGH',
        cowName: quickCowName.trim(),
        cowTag: quickCowTag.trim(),
        breedId: quickDecoded.breed?.value?.id,
        supplierId: quickDecoded.supplier?.value?.id,
        bullId: quickDecoded.bull?.value?.id,
        productType: quickDecoded.productType?.value || 'UNKNOWN',
        priceKsh: quickPriceKsh !== '' ? Number(quickPriceKsh) : undefined,
        eventDate: new Date().toISOString().split('T')[0],
        county: location.county,
      };

      const event = await submitInseminationEvent(eventData, authToken);
      setQuickSaveSuccess(event);
      // Reload events to update dashboard table immediately
      const updated = await fetchInseminationEvents(authToken);
      setEvents(updated);
    } catch (err: any) {
      setQuickSaveError(err.message || 'Error saving insemination record');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSendWhatsApp = async (eventId: number) => {
    if (!authToken) return;
    try {
      const res = await sendEventWhatsApp(eventId, authToken);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Could not open WhatsApp');
    }
  };

  // Metrics calculations
  const totalSpend = events.reduce((acc, curr) => acc + (Number(curr.priceKsh) || 0), 0);
  const confirmedCount = events.filter((e) => e.status === 'CONFIRMED').length;
  const femaleBirths = events.filter((e) => e.outcome?.calfSex === 'FEMALE').length;
  const totalOutcomes = events.filter((e) => e.outcome?.calfSex).length;
  const heiferRatio = totalOutcomes > 0 ? Math.round((femaleBirths / totalOutcomes) * 100) : 85;

  const isVet = currentUser?.role === 'VET';

  // Quick Vet Lexicon Contribution State
  const [quickTerm, setQuickTerm] = useState('');
  const [quickLang, setQuickLang] = useState('guz');
  const [quickSymptomId, setQuickSymptomId] = useState(1);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickSuccess, setQuickSuccess] = useState(false);

  const handleQuickVetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTerm.trim()) return;
    setQuickSubmitting(true);
    setQuickSuccess(false);
    try {
      await submitVetTerm({
        symptomId: quickSymptomId,
        languageCode: quickLang,
        text: quickTerm.trim(),
        clinicalContext: `Contributed by attending field vet in ${currentUser?.county || 'Kisii'}`,
        vetName: currentUser?.name || 'Dr. Timothy M.',
        vetCounty: currentUser?.county || 'Kisii',
        kvbNumber: 'KVB/AHT-2940',
      });
      setQuickSuccess(true);
      setQuickTerm('');
      setTimeout(() => setQuickSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Could not submit term to dictionary');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Farmer';

  // DEDICATED VETERINARY CLINICAL & LEXICON COMMAND CENTER
  if (isVet) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-fadeIn">
        {/* Breadcrumb / Top Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Veterinary Clinical & Indigenous Lexicon Command Center</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Registered Practitioner: <strong className="text-slate-800">{currentUser?.name}</strong> • KVB Operations: <strong className="text-emerald-800">{currentUser?.county || 'Kisii'} County</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> KVB Certified Field Clinician
            </span>
          </div>
        </div>

        {/* 1. HERO CARD: Indigenous Dialect Lexicon Contribution */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm border border-emerald-500/40 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Indigenous Dialect Diagnostic Dictionary • KVB Practitioner Hub</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                Welcome Dr. {firstName} — Certify Local Livestock Dialect Terms
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                As a field veterinarian, you interact on-farm with smallholders and pastoralists in their mother tongues. When a farmer describes illness with local vernacular (<em>Omwiko, Chebwekwek, Loolo, Kuhara damu, Kuvimba matiti</em>), contribute and certify the term directly into Kenya's national diagnostic dictionary with your KVB stamp.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setCurrentTab('dictionary')}
                className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-950" />
                <span>Open Full Dictionary Contributor Hub →</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab('dictionary')}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4 text-emerald-300" />
                <span>Browse 13 Languages (210+ Terms)</span>
              </button>
            </div>
          </div>

          {/* Quick On-Dashboard Contribution Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Quick Field Term Contribution (Instant KVB Field Certification)</span>
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                Attribution: Dr. {currentUser?.name} • {currentUser?.county || 'Kisii'}
              </span>
            </div>

            {quickSuccess && (
              <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-200 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>Term successfully certified and published to Kenya's national symptom dictionary!</span>
              </div>
            )}

            <form onSubmit={handleQuickVetSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={quickTerm}
                  onChange={(e) => setQuickTerm(e.target.value)}
                  placeholder="Local dialect term (e.g. Omwiko, Chebwekwek)..."
                  required
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={quickLang}
                  onChange={(e) => setQuickLang(e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="guz">Ekegusii (Kisii / Nyamira)</option>
                  <option value="kik">Gĩkũyũ (Central Kenya)</option>
                  <option value="kln">Kalenjin (Rift Valley)</option>
                  <option value="luo">Dholuo (Nyanza)</option>
                  <option value="luy">Oluluhyia (Western)</option>
                  <option value="mas">Maa / Samburu (Pastoralist)</option>
                  <option value="kam">Kikamba (Eastern)</option>
                  <option value="som">Af-Soomaali (North-Eastern)</option>
                  <option value="tur">Ng'aturkana (Turkana)</option>
                  <option value="orm">Boran / Oromo (Northern)</option>
                  <option value="mer">Kĩmĩrũ (Meru / Tharaka)</option>
                  <option value="sw">Kiswahili (National)</option>
                  <option value="en">English (Clinical)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={quickSymptomId}
                  onChange={(e) => setQuickSymptomId(Number(e.target.value))}
                  className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value={1}>Fever (High body temp)</option>
                  <option value={2}>Nasal Discharge (Mucus)</option>
                  <option value={3}>Coughing (Chest wheezing)</option>
                  <option value={4}>Diarrhea (Watery/bloody)</option>
                  <option value={5}>Loss of Appetite (Off feed)</option>
                  <option value={6}>Lameness (Limping)</option>
                  <option value={7}>Milk Drop (Drop in yield)</option>
                  <option value={8}>Bloat (Swollen rumen)</option>
                  <option value={9}>Mouth Lesions (Blisters)</option>
                  <option value={10}>Foot Lesions (Interdigital)</option>
                  <option value={11}>Skin Lesions (Lumps/nodules)</option>
                  <option value={18}>Difficulty Breathing</option>
                  <option value={19}>Sudden Death</option>
                  <option value={20}>Blood in Urine (Red water)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={quickSubmitting || !quickTerm.trim()}
                  className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs py-2 px-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-950" />
                  <span>{quickSubmitting ? 'Adding...' : 'Certify & Add'}</span>
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
              <span>Missing a formal English symptom?</span>
              <button
                type="button"
                onClick={() => setCurrentTab('dictionary')}
                className="text-emerald-300 hover:text-white font-bold underline flex items-center gap-1"
              >
                <span>Search & Add New English Clinical Signs in Contributor Hub →</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. VETERINARY CLINICAL WORKFLOWS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card A: Dictionary Contribution */}
          <div
            onClick={() => setCurrentTab('dictionary')}
            className="bg-white p-4 rounded-2xl border-2 border-emerald-500/60 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2 relative"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Dictionary Contribution
                </h3>
                <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                  KVB Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                Certify indigenous language symptoms in Ekegusii, Kalenjin, Dholuo, Maa, and Swahili.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-700">
              <span>Open Lexicon Hub</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card B: Clinical Symptom Triage */}
          <div
            onClick={() => setCurrentTab('search')}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                  Clinical Triage
                </h3>
                <span className="text-[9px] font-black uppercase bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                  4 Species
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                Differential diagnosis engine for Dairy Cattle, Goats, Sheep, and Poultry.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-teal-700">
              <span>Start Clinical Exam</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card C: Vet Co-Pilot AI */}
          <div
            onClick={() => setCurrentTab('copilot')}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                  Vet Co-Pilot
                </h3>
                <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                  RAX-4.0 AI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                Explain clinical disease correlations, contagion scores, and tailored consult questions.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-purple-700">
              <span>Launch Co-Pilot</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card D: Outbreak Surveillance */}
          <div
            onClick={() => setCurrentTab('map')}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-2"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                  Outbreak Map
                </h3>
                <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                  GIS Hotspots
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                Real-time epizootic clusters with species casualty breakdowns (Cattle, Poultry, Goats).
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-rose-700">
              <span>View Heatmaps</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* 3. ADDITIONAL VET UTILITIES ROW (Straw Verification & Epizootic Reporting) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Dna className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Semen Straw AI Verifier & Pedigree Audit
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Audit cryogenic straw markings, confirm stud provenance, and spot conventional sold at sexed rates.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={quickStraw}
                onChange={(e) => setQuickStraw(e.target.value)}
                placeholder="Type straw code (e.g. 29H0 ABS SEXCEL DOORMAN or KAGRC FR SIRIKWA)..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleQuickDecode}
                disabled={quickDecoding || !quickStraw.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{quickDecoding ? 'Decoding...' : 'Verify'}</span>
              </button>
            </div>

            {quickDecoded && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs space-y-2 animate-fadeIn">
                {quickDecoded.isDuplicateFraud && (
                  <div className="bg-rose-50 border-2 border-rose-500 p-2.5 rounded-lg text-xs font-bold text-rose-950 flex items-start gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-rose-700 font-black block">🚨 Reused Straw Fraud Warning</span>
                      <span>{quickDecoded.cautionMessage}</span>
                    </div>
                  </div>
                )}
                {quickDecoded.infoMessage && (
                  <div className="bg-emerald-100 border border-emerald-300 p-2 rounded-lg text-xs font-bold text-emerald-950 flex items-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{quickDecoded.infoMessage}</span>
                  </div>
                )}
                {!quickDecoded.isDuplicateFraud && quickDecoded.cautionMessage && (
                  <div className="bg-amber-50 border border-amber-300 p-2 rounded-lg text-xs font-bold text-amber-950 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{quickDecoded.cautionMessage}</span>
                  </div>
                )}
                <div>
                  <span className="font-black text-emerald-950 block">
                    {quickDecoded.bull?.meaning || 'Pedigree Sire'} • {quickDecoded.breed?.meaning || 'Breed'}
                  </span>
                  <span className="text-[11px] text-emerald-800 font-bold block">
                    Supplier: {quickDecoded.supplier?.meaning || 'Certified Supplier'} • Type: {quickDecoded.productType?.meaning || 'Conventional'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Official Notifiable Epizootic Reporting
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                  Are you observing an active outbreak on-farm (e.g., FMD, ECF, CCPP, Newcastle)? Escalate case data directly to the Sub-County Veterinary Officer (SCVO) for county quarantine cordons.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-purple-700 font-bold">KVB Biosecurity Compliance</span>
              <button
                type="button"
                onClick={() => setCurrentTab('report')}
                className="bg-purple-700 hover:bg-purple-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>Report Epizootic to SCVO →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Breadcrumb / Section Title */}
      <div className="flex items-center justify-between pb-1">
        <h1 className="text-sm font-black text-slate-800 tracking-tight uppercase">
          Dashboard Overview
        </h1>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <button
            type="button"
            onClick={() => setCurrentTab('straw')}
            className="text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Breeding Ledger
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setCurrentTab('straw')}
            className="text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            View Statements
          </button>
        </div>
      </div>

      {/* Main Grid matching the user's reference layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Welcome Banner & Registered Units Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Card 1: Welcome Back Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Welcome back, {firstName}
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                We're delighted to have you. Need to verify a semen straw, check cow pregnancies, or balance dairy feeds? Track your herd records below.
              </p>
            </div>

            {/* Mascot / Avatar Illustration */}
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-4xl shadow-2xs">
                🐄
              </div>
            </div>
          </div>

          {/* Quick Straw Verification Bar (Dashboard utility) */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                <Dna className="w-3.5 h-3.5 text-emerald-700" />
                <span>Instant ARTIFICIAL INSEMINATION STRAW Pedigree Decoder</span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentTab('straw')}
                className="text-[10px] text-emerald-850 font-bold bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md transition-colors border border-emerald-200"
              >
                Post-Insemination Straw vs Receipt Audit →
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={quickStraw}
                onChange={(e) => setQuickStraw(e.target.value)}
                placeholder="Type straw code (e.g. 7HO BRAEDALE GOLDWYN or 29H0 ABS SEXCEL DOORMAN)..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleQuickDecode}
                disabled={quickDecoding || !quickStraw.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{quickDecoding ? 'Decoding...' : 'Verify'}</span>
              </button>
            </div>

            {quickDecoded && (
              <div className="bg-white rounded-2xl border border-emerald-300 p-4 text-xs space-y-3 animate-fadeIn shadow-xs">
                {/* Critical Duplicate Fraud Alert */}
                {quickDecoded.isDuplicateFraud && (
                  <div className="bg-rose-50 border-2 border-rose-500 p-3 rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2.5 shadow-sm">
                    <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-rose-700 font-black">
                        🚨 Fraud Warning: Biological Straw Tube Already Recorded
                      </div>
                      <div className="text-xs leading-relaxed text-rose-900 font-bold">
                        {quickDecoded.cautionMessage}
                      </div>
                    </div>
                  </div>
                )}

                {/* Same Farmer Prior Usage Notice */}
                {quickDecoded.infoMessage && (
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-xs font-bold text-emerald-950 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{quickDecoded.infoMessage}</span>
                  </div>
                )}

                {/* Multiple Inquiries Caution */}
                {!quickDecoded.isDuplicateFraud && quickDecoded.cautionMessage && (
                  <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl text-xs font-bold text-amber-950 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{quickDecoded.cautionMessage}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="font-black text-slate-900 text-xs sm:text-sm block">
                      Pedigree Sire: {quickDecoded.bull?.meaning || 'Pedigree Sire'} • {quickDecoded.breed?.meaning || 'Breed'}
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Supplier: {quickDecoded.supplier?.meaning || 'Certified Supplier'} • Marking: {quickDecoded.productType?.meaning || 'Sexed'}
                    </span>
                  </div>
                  {quickDecoded.priceBenchmark && (
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      Market Benchmark: KSh {quickDecoded.priceBenchmark.minKsh.toLocaleString()} - {quickDecoded.priceBenchmark.maxKsh.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Inline Ledger Form to fill Price, Cow Name, and Cow Tag */}
                <form onSubmit={handleQuickSaveToLedger} className="pt-1 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fill Cow Details to Save to Herd Ledger</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('straw')}
                      className="text-[10px] text-emerald-700 font-bold hover:underline"
                    >
                      Open Full Ledger Screen →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        Cow Name / Breed *
                      </label>
                      <input
                        type="text"
                        required
                        value={quickCowName}
                        onChange={(e) => setQuickCowName(e.target.value)}
                        placeholder="e.g. Chepkoech"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        Cow Ear Tag / ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={quickCowTag}
                        onChange={(e) => setQuickCowTag(e.target.value)}
                        placeholder="e.g. KE-COW-001"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-bold text-slate-700 block">
                          Price Paid to Tech (KSh)
                        </label>
                        {quickDecoded.priceBenchmark && (
                          <button
                            type="button"
                            onClick={() => setQuickPriceKsh(quickDecoded.priceBenchmark.minKsh)}
                            className="text-[9px] text-emerald-700 hover:text-emerald-800 underline font-semibold"
                          >
                            Fill KSh {quickDecoded.priceBenchmark.minKsh}
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={quickPriceKsh}
                        onChange={(e) => setQuickPriceKsh(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 4500"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {quickSaveError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
                      {quickSaveError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Logs insemination date today • Automatically tracks pregnancy and heat cycles
                    </span>
                    <button
                      type="submit"
                      disabled={quickSaving || !quickCowName.trim() || !quickCowTag.trim()}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{quickSaving ? 'Saving to Ledger...' : 'Save to Breeding Ledger'}</span>
                    </button>
                  </div>
                </form>

                {quickSaveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-xs font-bold text-emerald-950 space-y-2 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          ✓ Saved Ref {quickSaveSuccess.referenceNo} for {quickSaveSuccess.cow?.name || quickCowName} (Tag: {quickSaveSuccess.cow?.tag || quickCowTag})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentTab('ledger')}
                        className="text-emerald-800 underline font-black text-[11px]"
                      >
                        View in Breeding Ledger →
                      </button>
                    </div>

                    {quickSaveSuccess.duplicateWarning && (
                      <div className="p-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <span>{quickSaveSuccess.duplicateWarning}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 4: Current Registered Units / Cattle Inseminations Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Current Cattle Records & Inseminations
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Active breeding entries in {currentUser?.county || 'Kenya'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentTab('ledger')}
                className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table or Empty State */}
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading herd breeding ledger...
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                {/* Illustrated Empty Box matching user reference image */}
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                  📦
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-800">
                    No Insemination Records Found
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Verify a printed semen straw code above to register your first cow and start tracking pregnancy cycles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('straw')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record First Breeding</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Cow Name / Tag</th>
                      <th className="px-4 py-3">Sire / Bull</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {events.slice(0, 5).map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-black text-slate-900 block">{evt.cow?.name || 'Cow'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{evt.cow?.tag || evt.referenceNo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">{evt.bull?.name || 'Sire Pedigree'}</span>
                          <span className="text-[10px] text-slate-500">{evt.supplier?.name || 'Certified Supplier'}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {evt.eventDate.split('T')[0]}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                              evt.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : evt.status === 'SENT'
                                ? 'bg-blue-100 text-blue-800'
                                : evt.status === 'NOT_RECOGNISED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(evt.id)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 active:scale-95 transition-all"
                            title="Verify via WhatsApp"
                          >
                            <Phone className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Status Card & Progress Metric Card */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 2: Vibrant Status Action Card (Top Right) */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white text-2xl shadow-xs">
                🧬
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Active Ledger
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-wide">
                Breeding Investment
              </p>
              <h3 className="text-2xl font-black tracking-tight text-white mt-0.5">
                KES {totalSpend.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                {events.length} cattle inseminations • {confirmedCount} verified
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCurrentTab('straw')}
              className="w-full bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record New Insemination</span>
            </button>
          </div>

          {/* Card 3: Deep Progress Card (Bottom Right) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-5 rounded-2xl border border-emerald-800/40 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Calving Season 2026/2027
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Target: 90%</span>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Sexed Heifer Ratio & Conception
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Audited against ABS Sexcel, KAGRC, and WWS benchmarks for {currentUser?.county || 'Kenya'}.
              </p>
            </div>

            {/* Progress Bar matching user reference layout */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-emerald-400">Heifer Female Births</span>
                <span className="text-white">{heiferRatio}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${heiferRatio}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center text-xs">
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold block">Pregnancies</span>
                <span className="font-black text-white">{confirmedCount} Active</span>
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 font-bold block">Heifers Born</span>
                <span className="font-black text-emerald-400">{femaleBirths} Female ♀</span>
              </div>
            </div>
          </div>

          {/* Quick Platform Services List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              Quick Shortcuts
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setCurrentTab('search')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Symptom Triage Intake</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('ration')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wheat className="w-3.5 h-3.5 text-amber-700" />
                  <span>Feed Balancer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('map')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 hover:text-purple-900 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Map className="w-3.5 h-3.5 text-purple-700" />
                  <span>Disease Outbreak Surveillance</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab('dictionary')}
                className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Indigenous Lexicon (Vet Contributor)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
