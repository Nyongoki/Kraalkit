import React, { useState, useEffect } from 'react';
import { useSession } from '../store/sessionContext';
import {
  decodeStraw,
  aiDecodeStraw,
  submitInseminationEvent,
  fetchInseminationEvents,
  sendEventWhatsApp,
  updateEventStatus,
  recordCalvingOutcome,
} from '../lib/api';
import { ScreenTab } from '../components/Navigation';
import {
  Dna,
  Search,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Phone,
  ShieldCheck,
  Calendar,
  DollarSign,
  User,
  Clock,
  ArrowRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Baby,
  ClipboardList,
  AlertOctagon,
} from 'lucide-react';
import { StrawReceiptAuditTable } from '../components/StrawReceiptAuditTable';
import { InseminationRecordModal } from '../components/InseminationRecordModal';
import { ReproductiveForecastCard } from '../components/ReproductiveForecastCard';

interface StrawScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
  initialMode?: 'quick' | 'audit' | 'ledger';
}

export const StrawScreen: React.FC<StrawScreenProps> = ({ setCurrentTab, initialMode = 'quick' }) => {
  const { currentUser, authToken, openAuthModal, location } = useSession();

  const [activeMode, setActiveMode] = useState<'quick' | 'audit' | 'ledger'>(initialMode);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode);
    }
  }, [initialMode]);

  const [rawText, setRawText] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [aiDecoding, setAiDecoding] = useState(false);
  const [decodedResult, setDecodedResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Insemination Event Form (starts completely clean & empty)
  const [cowName, setCowName] = useState('');
  const [cowTag, setCowTag] = useState('');
  const [strawSex, setStrawSex] = useState<string>('SEXED_FEMALE');
  const [priceKsh, setPriceKsh] = useState<number | ''>('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savedEvent, setSavedEvent] = useState<any | null>(null);

  // Past Events History
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Real straw quick sample pills
  const sampleStraws = [
    { label: 'KAGRC Friesian (Kabete Champion 3)', code: '001 KA FR25691 KABETE CHAMPION 3 20261027 LOT24B KAGRC' },
    { label: 'KAGRC Friesian (Sirikwa)', code: 'KAGRC FR SIRIKWA B2024-09 CONV' },
    { label: 'ABS Sexcel Doorman (Sexed Female)', code: '29H0 ABS SEXCEL DOORMAN LOT-8812' },
    { label: 'WWS Goldwyn 4M (Sexed Ultra)', code: '7HO WWS GOLDWYN 4M SEXED 99201' },
    { label: 'KAGRC Sahiwal Beef Cross', code: 'KAGRC SA KILIMO 89201 BEEF' },
  ];

  // Check if initial deterministic decode missed key fields
  const isMissingKeyFields = (res: any) => {
    if (!res) return false;
    const isBreedMissing = !res.breed || res.breed.meaning === 'Not Recognized';
    const isBullMissing = !res.bull || res.bull.meaning === 'Not Recognized';
    const isSupplierMissing = !res.supplier || res.supplier.meaning === 'Not Recognized';
    const isBatchMissing = !res.batchOrSerial || res.batchOrSerial.value === 'N/A';
    const isTypeMissing = res.productType?.value === 'UNKNOWN' || res.productType?.meaning?.includes('Cannot tell');
    return isBreedMissing || isBullMissing || isSupplierMissing || isBatchMissing || isTypeMissing;
  };

  // Run AI LLM straw decoding enhancement
  const runAiEnhancement = async (text: string, current: any) => {
    setAiDecoding(true);
    try {
      const aiRes = await aiDecodeStraw(text, current, location.county, authToken || undefined);
      setDecodedResult(aiRes);
      if (priceKsh === '' && aiRes.priceBenchmark?.minKsh) {
        setPriceKsh(aiRes.priceBenchmark.minKsh);
      }
      if (aiRes.productType?.value) {
        setStrawSex(aiRes.productType.value);
      }
    } catch (err: any) {
      console.warn('AI straw enhancement error:', err);
    } finally {
      setAiDecoding(false);
    }
  };

  // Decode Action
  const handleDecode = async (textToDecode?: string) => {
    const text = textToDecode || rawText;
    if (!text.trim()) return;

    setDecoding(true);
    setError(null);
    setSavedEvent(null);

    try {
      const res = await decodeStraw(text.trim(), location.county, authToken || undefined);
      setDecodedResult(res);
      // Pre-fill benchmark price only if farmer hasn't already entered a price
      if (priceKsh === '' && res.priceBenchmark?.minKsh) {
        setPriceKsh(res.priceBenchmark.minKsh);
      }
      if (res.productType?.value) {
        setStrawSex(res.productType.value);
      }

      // If decoder missed data points, immediately activate AI to read full text & fill fields
      if (isMissingKeyFields(res)) {
        runAiEnhancement(text.trim(), res);
      }
    } catch (err: any) {
      setError(err.message || 'Error decoding straw text');
    } finally {
      setDecoding(false);
    }
  };

  // Save Event Action
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !currentUser) {
      openAuthModal('register');
      return;
    }
    if (!decodedResult) return;

    setSavingEvent(true);
    setError(null);

    try {
      const eventData = {
        rawText: decodedResult.rawText,
        decoded: decodedResult,
        confidence: decodedResult.overallConfidence,
        cowName: cowName.trim() || undefined,
        cowTag: cowTag.trim() || undefined,
        breedId: decodedResult.breed?.value?.id,
        supplierId: decodedResult.supplier?.value?.id,
        bullId: decodedResult.bull?.value?.id,
        productType: strawSex || decodedResult.productType?.value || 'UNKNOWN',
        priceKsh: Number(priceKsh) || undefined,
        eventDate,
        county: location.county,
      };

      const event = await submitInseminationEvent(eventData, authToken);
      setSavedEvent(event);
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Error saving insemination event');
    } finally {
      setSavingEvent(false);
    }
  };

  // Save Audit to Ledger
  const handleSaveAuditToLedger = async (decodedData: any, receiptData: any) => {
    if (!authToken || !currentUser) {
      openAuthModal('register');
      return;
    }
    setSavingEvent(true);
    try {
      const eventData = {
        rawText: decodedData.rawText,
        decoded: decodedData,
        confidence: decodedData.overallConfidence,
        cowName: receiptData.cowName,
        cowTag: receiptData.cowTag,
        breedId: decodedData.breed?.value?.id,
        supplierId: decodedData.supplier?.value?.id,
        bullId: decodedData.bull?.value?.id,
        productType: decodedData.productType?.value || 'UNKNOWN',
        priceKsh: Number(receiptData.pricePaidKsh) || undefined,
        eventDate: new Date().toISOString().split('T')[0],
        county: location.county,
      };
      const event = await submitInseminationEvent(eventData, authToken);
      setSavedEvent(event);
      loadHistory();
      alert(`Insemination event registered (${event.referenceNo}) for ${receiptData.cowName}!`);
    } catch (err: any) {
      alert(err.message || 'Error saving event to breeding ledger');
    } finally {
      setSavingEvent(false);
    }
  };

  // Dispatch WhatsApp Click-to-Chat
  const handleSendWhatsApp = async (eventId: number) => {
    if (!authToken) return;
    try {
      const res = await sendEventWhatsApp(eventId, authToken);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
      loadHistory();
    } catch (err: any) {
      alert(err.message || 'Could not generate WhatsApp link');
    }
  };

  // Update Status
  const handleStatusUpdate = async (eventId: number, status: string) => {
    if (!authToken) return;
    try {
      await updateEventStatus(eventId, status, authToken);
      loadHistory();
      if (savedEvent && savedEvent.id === eventId) {
        setSavedEvent((prev: any) => ({ ...prev, status }));
      }
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    }
  };

  // Record Calving Outcome
  const handleRecordOutcome = async (eventId: number, calfSex: 'FEMALE' | 'MALE') => {
    if (!authToken) return;
    try {
      await recordCalvingOutcome(
        eventId,
        { pregnancy: 'PREGNANT', calfSex, birthDate: new Date().toISOString() },
        authToken
      );
      loadHistory();
    } catch (err: any) {
      alert(err.message || 'Could not save outcome');
    }
  };

  // Load Insemination History
  const loadHistory = async () => {
    if (!authToken) return;
    setLoadingHistory(true);
    try {
      const events = await fetchInseminationEvents(authToken);
      setPastEvents(events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadHistory();
    }
  }, [authToken]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Lean Header */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-800/40 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <Dna className="w-4 h-4 text-emerald-400" />
            <span>AI Straw Verification & Breeding Ledger</span>
          </div>
          <p className="text-xs text-slate-300 font-medium max-w-xl">
            Free open decoder: Inspect sire pedigree, supplier, sex of straw, and purity markers. Sign in to save records to your farm herd ledger.
          </p>
        </div>

        {!currentUser ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-2xs active:scale-95 transition-all"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl border border-white/20 transition-all"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-xs">
            <span className="text-emerald-300 font-bold block">{currentUser.name}</span>
            <span className="text-[10px] text-slate-300">Breeding Ledger Active</span>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveMode('quick')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
            activeMode === 'quick'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Verify Straw (Empty Input)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
            activeMode === 'audit'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Straw vs. Receipt Audit Table</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              openAuthModal('register');
              return;
            }
            setActiveMode('ledger');
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
            activeMode === 'ledger'
              ? 'bg-emerald-800 text-white shadow-2xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>My Breeding Ledger</span>
          {pastEvents.length > 0 && (
            <span className="text-[10px] bg-emerald-500/30 text-emerald-100 px-1.5 py-0.5 rounded font-bold">
              {pastEvents.length}
            </span>
          )}
        </button>
      </div>

      {/* DEDICATED FULL-WIDTH BREEDING LEDGER VIEW */}
      {activeMode === 'ledger' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-700" />
                <span>My Insemination Ledger & Herd Breeding Records</span>
              </h3>
              <p className="text-xs text-slate-500">
                {currentUser ? `Active lifetime breeding records for ${currentUser.name}` : 'Sign in to access your farm herd ledger'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveMode('quick')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Verify & Log New Straw</span>
              </button>
              {currentUser && (
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-2 text-slate-400 hover:text-emerald-700 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
                  title="Refresh history"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {!currentUser ? (
            <div className="p-8 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Farmer account required to access herd breeding records</p>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl"
              >
                Create Account
              </button>
            </div>
          ) : pastEvents.length === 0 && !loadingHistory ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
                📦
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-slate-800">No Insemination Records Found</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  You haven&apos;t logged any inseminations yet. Verify a printed semen straw code to register your first cow and start tracking pregnancy cycles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMode('quick')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Verify First Semen Straw</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pastEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 text-xs space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-black text-slate-900 block text-xs">
                        {evt.referenceNo}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {evt.cow?.name || 'Cow'} {evt.cow?.tagNo ? `(${evt.cow.tagNo})` : ''} • {evt.bull?.name || 'Sire'}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                        evt.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evt.status === 'SENT'
                          ? 'bg-blue-100 text-blue-800'
                          : evt.status === 'NOT_RECOGNISED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5">
                    <span>Date: {evt.eventDate.split('T')[0]}</span>
                    <span>Price: KSh {Number(evt.priceKsh || 0).toLocaleString()}</span>
                  </div>

                  {/* Action buttons: WhatsApp & Status */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(evt.id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                      title="Send / Resend to Provider WhatsApp"
                    >
                      <Phone className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    {evt.status === 'SENT' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(evt.id, 'CONFIRMED')}
                          className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-emerald-200"
                        >
                          Confirmed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(evt.id, 'NOT_RECOGNISED')}
                          className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-rose-200"
                        >
                          Rejected
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedEvent(evt)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all shadow-2xs ml-auto"
                      title="Open full record, timeline & calving outcome"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-200" />
                      <span>Open Record &amp; Process →</span>
                    </button>

                    {/* Calving Outcome if Confirmed */}
                    {evt.status === 'CONFIRMED' && !evt.outcome?.calfSex && (
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleRecordOutcome(evt.id, 'FEMALE')}
                          className="bg-purple-100 text-purple-900 font-black text-[10px] px-2 py-1 rounded-lg hover:bg-purple-200"
                          title="Record Female Heifer Calf"
                        >
                          + Heifer Calf ♀
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRecordOutcome(evt.id, 'MALE')}
                          className="bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-slate-300"
                          title="Record Bull Calf"
                        >
                          + Bull Calf ♂
                        </button>
                      </div>
                    )}

                    {evt.outcome?.calfSex && (
                      <span className="ml-auto text-[10px] font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Baby className="w-3 h-3" />
                        <span>Born: {evt.outcome.calfSex}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        {activeMode === 'audit' ? (
          <div className="lg:col-span-8 space-y-4">
            <StrawReceiptAuditTable
              isLoggedIn={!!currentUser}
              onRequireAuth={() => openAuthModal('register')}
              onSaveToLedger={handleSaveAuditToLedger}
              userCounty={location.county}
            />
          </div>
        ) : (
          <div className="lg:col-span-7 space-y-3">
            {/* Straw Code Input Box */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Enter Semen Straw Text or Batch Code:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="e.g. 29H0 ABS SEXCEL DOORMAN LOT-8812 or KAGRC FR SIRIKWA..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleDecode()}
                  disabled={decoding || !rawText.trim()}
                  className="mt-2 sm:mt-0 sm:absolute sm:inset-y-1.5 sm:right-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3.5 py-1.5 sm:py-0 rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{decoding ? 'Decoding...' : 'Verify Straw'}</span>
                </button>
              </div>

              {/* Quick Sample Straw Pills */}
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 mr-0.5">Sample Straws:</span>
                {sampleStraws.map((samp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRawText(samp.code);
                      handleDecode(samp.code);
                    }}
                    className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all border border-slate-200"
                  >
                    {samp.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                {error}
              </div>
            )}

            {/* Empty state prompt before entering straw code */}
            {!decodedResult && (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Dna className="w-5 h-5" />
                </div>
                <h5 className="text-xs font-black text-slate-800">
                  Ready to Verify Semen Straw
                </h5>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Type the alphanumeric code printed along the thawed straw tube above and click &ldquo;Verify Straw&rdquo;, or select any sample straw to test.
                </p>
              </div>
            )}

            {/* Decoded Result Card */}
            {decodedResult && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 animate-fadeIn">
                <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">
                        Decoded Straw Analysis
                      </h3>
                      <span
                        className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                          decodedResult.overallConfidence === 'HIGH'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : decodedResult.overallConfidence === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {decodedResult.overallConfidence} Confidence
                      </span>

                      {decodedResult.isAiEnhanced && (
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Verified</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => runAiEnhancement(rawText, decodedResult)}
                        disabled={aiDecoding}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Decode complete text with AI language model"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{aiDecoding ? 'AI Decoding...' : 'AI Re-analyze'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Ref CodeKey: {decodedResult.codeKey}
                    </p>
                  </div>

                  {decodedResult.priceBenchmark && (
                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-700 block">
                        KSh {decodedResult.priceBenchmark.minKsh.toLocaleString()} - {decodedResult.priceBenchmark.maxKsh.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">
                        Typical Benchmark
                      </span>
                    </div>
                  )}
                </div>

                {/* AI In-Progress Loader Banner */}
                {aiDecoding && (
                  <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs animate-pulse">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold">
                      <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin" />
                      <span>AI Model reading full markings & resolving missing fields...</span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                      Processing
                    </span>
                  </div>
                )}

                {/* AI Explanation Banner */}
                {decodedResult.isAiEnhanced && (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-black text-emerald-950 block">AI-Assisted Genetic Decoding</span>
                      <span className="text-slate-600 text-[11px] leading-relaxed">
                        {decodedResult.aiExplanation || 'Full text markings interpreted and reconciled against pedigree records.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Critical Duplicate Fraud Alert */}
                {decodedResult.isDuplicateFraud && (
                  <div className="bg-rose-50 border-2 border-rose-500 p-3 rounded-xl text-xs font-bold text-rose-950 flex items-start gap-2.5 shadow-sm">
                    <AlertOctagon className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-rose-700 font-black">
                        🚨 Fraud Warning: Biological Straw Tube Already Recorded
                      </div>
                      <div className="text-xs leading-relaxed text-rose-900 font-bold">
                        {decodedResult.cautionMessage}
                      </div>
                    </div>
                  </div>
                )}

                {/* Same Farmer Prior Usage Notice */}
                {decodedResult.infoMessage && (
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-xs font-bold text-emerald-950 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{decodedResult.infoMessage}</span>
                  </div>
                )}

                {/* Duplicate Caution Warning if triggered */}
                {!decodedResult.isDuplicateFraud && decodedResult.cautionMessage && (
                  <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-xl text-xs font-bold text-amber-950 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{decodedResult.cautionMessage}</span>
                  </div>
                )}

                {/* Decoded Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Sex of Inseminated Straw */}
                  <div
                    className={`p-3 rounded-xl border sm:col-span-2 flex items-center justify-between shadow-2xs ${
                      decodedResult.productType?.value === 'SEXED_FEMALE'
                        ? 'bg-purple-50/80 border-purple-200 text-purple-950'
                        : decodedResult.productType?.value === 'SEXED_MALE'
                        ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider block opacity-75">
                        Sex of Inseminated Straw
                      </span>
                      <span className="font-black text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                        {decodedResult.productType?.value === 'SEXED_FEMALE' ? (
                          <>
                            <span className="text-purple-700 font-extrabold text-base">♀</span>
                            <span>Female (Sexed Heifer ~90% Probability)</span>
                          </>
                        ) : decodedResult.productType?.value === 'SEXED_MALE' ? (
                          <>
                            <span className="text-blue-700 font-extrabold text-base">♂</span>
                            <span>Male (Sexed Bull ~90% Probability)</span>
                          </>
                        ) : (
                          <>
                            <span className="text-emerald-700 font-extrabold text-base">⚥</span>
                            <span>Conventional 50/50 (Natural Heifer / Bull Split)</span>
                          </>
                        )}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        decodedResult.productType?.value === 'SEXED_FEMALE'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : decodedResult.productType?.value === 'SEXED_MALE'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      {decodedResult.productType?.value === 'SEXED_FEMALE'
                        ? 'Sex-Sorted Female'
                        : decodedResult.productType?.value === 'SEXED_MALE'
                        ? 'Sex-Sorted Male'
                        : 'Conventional Semen'}
                    </span>
                  </div>

                  {/* Breed */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Breed</span>
                    {aiDecoding && (!decodedResult.breed || decodedResult.breed?.meaning === 'Not Recognized') ? (
                      <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Resolving breed...</span>
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 text-xs truncate block">
                        {decodedResult.breed?.meaning || 'Not Recognized'}
                      </span>
                    )}
                  </div>

                  {/* Supplier */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Supplier</span>
                    {aiDecoding && (!decodedResult.supplier || decodedResult.supplier?.meaning === 'Not Recognized') ? (
                      <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Resolving supplier...</span>
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 text-xs truncate block">
                        {decodedResult.supplier?.meaning || 'Not Recognized'}
                      </span>
                    )}
                  </div>

                  {/* Sire / Bull */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Bull Pedigree</span>
                    {aiDecoding && (!decodedResult.bull || decodedResult.bull?.meaning === 'Not Recognized') ? (
                      <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Resolving sire pedigree...</span>
                      </span>
                    ) : (
                      <span className="font-black text-slate-900 text-xs truncate block">
                        {decodedResult.bull?.meaning || 'Not Recognized'}
                      </span>
                    )}
                  </div>

                  {/* Product Type / Sexed Marking */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Marked Type</span>
                    {aiDecoding && decodedResult.productType?.value === 'UNKNOWN' ? (
                      <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Checking marker...</span>
                      </span>
                    ) : (
                      <span
                        className={`font-black text-xs truncate block ${
                          decodedResult.productType?.value === 'SEXED_FEMALE'
                            ? 'text-purple-700'
                            : 'text-slate-900'
                        }`}
                      >
                        {decodedResult.productType?.meaning || 'Unverified'}
                      </span>
                    )}
                  </div>

                  {/* Batch / Serial */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Batch / Serial</span>
                      {decodedResult.productionDate && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          {decodedResult.productionDate.formatted}
                        </span>
                      )}
                    </div>
                    {aiDecoding && (!decodedResult.batchOrSerial || decodedResult.batchOrSerial?.value === 'N/A') ? (
                      <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Extracting batch...</span>
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {decodedResult.batchOrSerial?.value || 'N/A'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Save Trigger Form */}
                <div className="pt-2.5 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Log Insemination Event</span>
                  </h4>

                  <form onSubmit={handleSaveEvent} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Cow Name / Breed
                        </label>
                        <input
                          type="text"
                          required
                          value={cowName}
                          onChange={(e) => setCowName(e.target.value)}
                          placeholder="e.g. Chepkoech"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Ear Tag / Cow ID
                        </label>
                        <input
                          type="text"
                          value={cowTag}
                          onChange={(e) => setCowTag(e.target.value)}
                          placeholder="e.g. KE-COW-01"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Sex of Inseminated Straw
                        </label>
                        <select
                          value={strawSex}
                          onChange={(e) => setStrawSex(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        >
                          <option value="SEXED_FEMALE">Female ♀ (Sexed Heifer ~90% Probability)</option>
                          <option value="CONVENTIONAL">Conventional 50/50 (Natural Split)</option>
                          <option value="SEXED_MALE">Male ♂ (Sexed Bull ~90% Probability)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] font-bold text-slate-700 block">
                            Price Paid to AI Tech (KSh)
                          </label>
                          <span className="text-[9px] text-emerald-700 font-semibold">Your price</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={priceKsh}
                          onChange={(e) => setPriceKsh(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 4500"
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                        {decodedResult?.priceBenchmark && (
                          <div className="flex items-center justify-between mt-1 text-[10px]">
                            <span className="text-slate-400">
                              Guide: KSh {decodedResult.priceBenchmark.minKsh.toLocaleString()} – {decodedResult.priceBenchmark.maxKsh.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPriceKsh(decodedResult.priceBenchmark.minKsh)}
                              className="text-emerald-700 hover:text-emerald-800 underline font-semibold"
                            >
                              Fill KSh {decodedResult.priceBenchmark.minKsh.toLocaleString()}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          Date Inseminated
                        </label>
                        <input
                          type="date"
                          required
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingEvent}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs py-2.5 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 mt-1"
                    >
                      <span>{savingEvent ? 'Saving Insemination...' : 'Save Insemination Record'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

                {/* Just Saved Event Receipt & Reproductive Forecast */}
                {savedEvent && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                          <div>
                            <span className="text-xs font-black text-emerald-950 block">
                              Event Registered: {savedEvent.referenceNo}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-semibold">
                              Status: {savedEvent.status} • Saved to Farm Herd Ledger
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMode('ledger');
                            setSelectedEvent(savedEvent);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>View in Herd Ledger →</span>
                        </button>
                      </div>
                    </div>

                    {savedEvent.duplicateWarning && (
                      <div className="p-3 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-start gap-2 shadow-2xs">
                        <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                        <span>{savedEvent.duplicateWarning}</span>
                      </div>
                    )}

                    {/* Reproductive Forecast: Delivery Range & Return Heat Watch Dates */}
                    <ReproductiveForecastCard
                      eventDate={savedEvent.eventDate}
                      cowName={savedEvent.cow?.name || cowName}
                      cowTag={savedEvent.cow?.tagNo || cowTag}
                      referenceNo={savedEvent.referenceNo}
                      sireName={savedEvent.bull?.name || decodedResult?.bull?.meaning}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Insemination History & Provider WhatsApp Verification */}
        <div className={activeMode === 'audit' ? 'lg:col-span-4 space-y-3' : 'lg:col-span-5 space-y-3'}>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>My Insemination Ledger</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {currentUser ? `Saved events for ${currentUser.name}` : 'Sign in to access your farm herd ledger'}
                </p>
              </div>
              {currentUser && (
                <button
                  type="button"
                  onClick={loadHistory}
                  className="p-1 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Refresh history"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!currentUser ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-900">
                    Sign In to Access Your Herd Ledger
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Protect and tie your farm data to your account. Save insemination events, request supplier verification, and record calving outcomes.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-3.5 py-1.5 rounded-lg shadow-2xs active:scale-95 transition-all"
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            ) : pastEvents.length === 0 && !loadingHistory ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
                No insemination events recorded yet. Verify and save a straw on the left to start your herd ledger!
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {pastEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 text-xs space-y-2 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-black text-slate-900 block">
                          {evt.referenceNo}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">
                          {evt.cow?.name || 'Cow'} • {evt.bull?.name || 'Sire'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          evt.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800'
                            : evt.status === 'NOT_RECOGNISED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Date: {evt.eventDate.split('T')[0]}</span>
                      <span>Price: KSh {Number(evt.priceKsh || 0).toLocaleString()}</span>
                    </div>

                    {/* Action buttons: WhatsApp & Status */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(evt.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1"
                        title="Send / Resend to Provider WhatsApp"
                      >
                        <Phone className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEvent(evt)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-all shadow-2xs ml-auto"
                        title="Open full record, timeline & calving outcome"
                      >
                        <span>Open &amp; Process →</span>
                      </button>

                      {evt.status === 'SENT' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(evt.id, 'CONFIRMED')}
                            className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-emerald-200"
                          >
                            Confirmed
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(evt.id, 'NOT_RECOGNISED')}
                            className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-rose-200"
                          >
                            Rejected
                          </button>
                        </>
                      )}

                      {/* Calving Outcome if Confirmed */}
                      {evt.status === 'CONFIRMED' && !evt.outcome?.calfSex && (
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRecordOutcome(evt.id, 'FEMALE')}
                            className="bg-purple-100 text-purple-900 font-black text-[10px] px-2 py-1 rounded-lg hover:bg-purple-200"
                            title="Record Female Heifer Calf"
                          >
                            + Heifer Calf ♀
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRecordOutcome(evt.id, 'MALE')}
                            className="bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-1 rounded-lg hover:bg-slate-300"
                            title="Record Bull Calf"
                          >
                            + Bull Calf ♂
                          </button>
                        </div>
                      )}

                      {evt.outcome?.calfSex && (
                        <span className="ml-auto text-[10px] font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Baby className="w-3 h-3" />
                          <span>Born: {evt.outcome.calfSex}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Detail Record & Lifecycle Processing Modal */}
      {selectedEvent && authToken && (
        <InseminationRecordModal
          event={selectedEvent}
          authToken={authToken}
          onClose={() => setSelectedEvent(null)}
          onUpdated={() => {
            loadHistory();
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
};
