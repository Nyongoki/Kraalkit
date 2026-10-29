import React, { useState } from 'react';
import {
  X,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Baby,
  Dna,
  Save,
  Clock,
  ShieldCheck,
  Tag,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  updateEventStatus,
  recordCalvingOutcome,
  updateEventDetails,
  sendEventWhatsApp,
} from '../lib/api';
import { ReproductiveForecastCard } from './ReproductiveForecastCard';

interface InseminationRecordModalProps {
  event: any;
  onClose: () => void;
  onUpdated: () => void;
  authToken: string;
}

export const InseminationRecordModal: React.FC<InseminationRecordModalProps> = ({
  event,
  onClose,
  onUpdated,
  authToken,
}) => {
  // Editing state for Cow & Price
  const [cowName, setCowName] = useState(event.cow?.name || '');
  const [cowTag, setCowTag] = useState(event.cow?.tagNo || '');
  const [priceKsh, setPriceKsh] = useState<number | ''>(event.priceKsh ? Number(event.priceKsh) : '');
  const [isEditing, setIsEditing] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Pregnancy & Calving State
  const [pregnancyStatus, setPregnancyStatus] = useState<string>(
    event.outcome?.pregnancy || 'UNKNOWN'
  );
  const [calfSex, setCalfSex] = useState<'FEMALE' | 'MALE'>(
    event.outcome?.calfSex || 'FEMALE'
  );
  const [birthDate, setBirthDate] = useState<string>(
    event.outcome?.birthDate
      ? event.outcome.birthDate.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [savingOutcome, setSavingOutcome] = useState(false);

  // WhatsApp & Status Action
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Gestation Calculations (Cattle gestation = 283 days)
  const eventDateObj = new Date(event.eventDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - eventDateObj.getTime());
  const daysSinceAI = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const dueDateObj = new Date(eventDateObj);
  dueDateObj.setDate(dueDateObj.getDate() + 283);
  const formattedDueDate = dueDateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const pdStartDate = new Date(eventDateObj);
  pdStartDate.setDate(pdStartDate.getDate() + 60);
  const pdEndDate = new Date(eventDateObj);
  pdEndDate.setDate(pdEndDate.getDate() + 90);

  // Decoded Straw payload
  const decoded = event.decoded as any;

  // Copy reference number
  const handleCopyRef = () => {
    navigator.clipboard.writeText(event.referenceNo);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // WhatsApp Dispatch
  const handleWhatsApp = async () => {
    setActionLoading(true);
    try {
      const res = await sendEventWhatsApp(event.id, authToken);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Could not generate WhatsApp dispatch');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Change (Confirmed / Rejected)
  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await updateEventStatus(event.id, newStatus, authToken);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Could not update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Cow / Price Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      await updateEventDetails(
        event.id,
        {
          cowName: cowName.trim() || undefined,
          cowTag: cowTag.trim() || undefined,
          priceKsh: priceKsh === '' ? undefined : Number(priceKsh),
        },
        authToken
      );
      setIsEditing(false);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Could not update details');
    } finally {
      setSavingDetails(false);
    }
  };

  // Save Pregnancy / Calving Outcome
  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOutcome(true);
    try {
      await recordCalvingOutcome(
        event.id,
        {
          pregnancy: pregnancyStatus,
          calfSex: pregnancyStatus === 'PREGNANT' ? calfSex : undefined,
          birthDate: pregnancyStatus === 'PREGNANT' ? birthDate : undefined,
        },
        authToken
      );
      onUpdated();
      alert('Pregnancy & calving outcome recorded successfully!');
    } catch (err: any) {
      alert(err.message || 'Could not save calving outcome');
    } finally {
      setSavingOutcome(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-fadeIn">
        {/* 1. Modal Header Bar */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-emerald-300">
                {event.referenceNo}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-1 hover:bg-white/10 rounded-md text-slate-300 hover:text-white transition-colors"
                title="Copy reference code"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span
                className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                  event.status === 'CONFIRMED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : event.status === 'SENT'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                    : event.status === 'NOT_RECOGNISED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                    : 'bg-white/10 text-slate-300 border border-white/20'
                }`}
              >
                {event.status}
              </span>
            </div>
            <h3 className="text-base font-black text-white">
              {event.cow?.name || 'Milking Cow'}{' '}
              <span className="text-xs font-semibold text-emerald-200">
                {event.cow?.tagNo ? `(${event.cow.tagNo})` : ''}
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Modal Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Comprehensive Reproductive Forecast & Delivery Range */}
          <ReproductiveForecastCard
            eventDate={event.eventDate}
            cowName={event.cow?.name}
            cowTag={event.cow?.tagNo}
            referenceNo={event.referenceNo}
            sireName={event.bull?.name || decoded?.bull?.meaning}
          />

          {/* Genetic Straw Certificate Specs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Dna className="w-4 h-4 text-emerald-600" />
                <span>Verified Semen Straw Specs</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {event.confidence} Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Sire / Bull</span>
                <span className="font-black text-slate-900 block truncate">
                  {event.bull?.name || decoded?.bull?.meaning || 'Pedigree Bull'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Breed</span>
                <span className="font-black text-slate-900 block truncate">
                  {event.breed?.name || decoded?.breed?.meaning || 'Friesian'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Semen Technology</span>
                <span
                  className={`font-black block truncate ${
                    event.productType === 'SEXED_FEMALE' ? 'text-purple-700' : 'text-slate-900'
                  }`}
                >
                  {event.productType === 'SEXED_FEMALE' ? '✨ Sexed Female (90%)' : 'Conventional (50/50)'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Supplier / Stud</span>
                <span className="font-black text-slate-900 block truncate">
                  {event.supplier?.name || decoded?.supplier?.meaning || 'Accredited Stud'}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Price Charged</span>
                <span className="font-black text-slate-900 block">
                  KSh {Number(event.priceKsh || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Raw Straw Text</span>
                <span className="font-mono font-bold text-slate-700 block truncate" title={event.rawText}>
                  {event.rawText}
                </span>
              </div>
            </div>
          </div>

          {/* Lifecycle Action 1: Supplier WhatsApp Verification */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Step 1: Supplier Verification Audit</span>
              <span className="text-[10px] text-slate-400 font-normal">Official Supplier Depot Link</span>
            </h4>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleWhatsApp}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Send to Provider WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('CONFIRMED')}
                disabled={actionLoading || event.status === 'CONFIRMED'}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs px-3 py-2 rounded-xl border border-emerald-300 transition-all active:scale-95 disabled:opacity-50"
              >
                ✓ Mark Confirmed by Provider
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('NOT_RECOGNISED')}
                disabled={actionLoading || event.status === 'NOT_RECOGNISED'}
                className="bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs px-3 py-2 rounded-xl border border-rose-300 transition-all active:scale-95 disabled:opacity-50"
              >
                ✕ Mark Rejected (Counterfeit Flag)
              </button>
            </div>
          </div>

          {/* Lifecycle Action 2: Pregnancy & Calving Outcome */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Step 2: Pregnancy & Calving Outcome</span>
              {event.outcome?.calfSex && (
                <span className="text-[10px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded font-black">
                  Calf Born: {event.outcome.calfSex}
                </span>
              )}
            </h4>

            <form onSubmit={handleSaveOutcome} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Pregnancy Diagnosis (PD)
                  </label>
                  <select
                    value={pregnancyStatus}
                    onChange={(e) => setPregnancyStatus(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                  >
                    <option value="UNKNOWN">Pending Check (Unknown)</option>
                    <option value="PREGNANT">Confirmed Pregnant ✓</option>
                    <option value="NOT_PREGNANT">Not Pregnant / Open ✕</option>
                  </select>
                </div>

                {pregnancyStatus === 'PREGNANT' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Calf Sex
                      </label>
                      <select
                        value={calfSex}
                        onChange={(e) => setCalfSex(e.target.value as 'FEMALE' | 'MALE')}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      >
                        <option value="FEMALE">Heifer Calf ♀ (Female)</option>
                        <option value="MALE">Bull Calf ♂ (Male)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Birth / Calving Date
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={savingOutcome}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingOutcome ? 'Saving Outcome...' : 'Save Pregnancy & Calving Outcome'}</span>
              </button>
            </form>
          </div>

          {/* Edit Cow Info & Price Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-600" />
                <span>Cow Tag & Cost Record</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                {isEditing ? 'Cancel' : 'Edit Cow & Price'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveDetails} className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cow Name</label>
                    <input
                      type="text"
                      value={cowName}
                      onChange={(e) => setCowName(e.target.value)}
                      placeholder="e.g. Chepkoech"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Ear Tag / ID</label>
                    <input
                      type="text"
                      value={cowTag}
                      onChange={(e) => setCowTag(e.target.value)}
                      placeholder="e.g. KE-COW-01"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Price Paid (KSh)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={priceKsh}
                      onChange={(e) => setPriceKsh(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 4500"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingDetails}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {savingDetails ? 'Saving...' : 'Update Record'}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Cow: <strong>{event.cow?.name || 'Unnamed'}</strong> ({event.cow?.tagNo || 'No Tag'})</span>
                <span>Cost: <strong>KSh {Number(event.priceKsh || 0).toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Kraalkit Herdbook • Lifetime Breeding Ledger
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
