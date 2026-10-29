import React, { useState, useEffect } from 'react';
import {
  Dna,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Save,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  StrawDecodeResult,
  AuditReconciliationResult,
  ReceiptComparisonInput,
  AuditItem,
} from '../types';
import { reconcileStrawWithReceipt } from '../lib/api';

interface StrawReceiptAuditTableProps {
  onSaveToLedger?: (decoded: StrawDecodeResult, receipt: ReceiptComparisonInput) => void;
  isLoggedIn: boolean;
  onRequireAuth: () => void;
  userCounty?: string | null;
}

export const StrawReceiptAuditTable: React.FC<StrawReceiptAuditTableProps> = ({
  onSaveToLedger,
  isLoggedIn,
  onRequireAuth,
  userCounty,
}) => {
  // Straw Text State
  const [strawText, setStrawText] = useState('');
  
  // Technician Paper Receipt State
  const [cowName, setCowName] = useState('');
  const [cowTag, setCowTag] = useState('');
  const [receiptBull, setReceiptBull] = useState('');
  const [receiptBreed, setReceiptBreed] = useState('');
  const [receiptProductType, setReceiptProductType] = useState('Sexed Female');
  const [pricePaidKsh, setPricePaidKsh] = useState<number | ''>('');
  const [receiptTechnician, setReceiptTechnician] = useState('');

  // Loading & Results
  const [loading, setLoading] = useState(false);
  const [decoded, setDecoded] = useState<StrawDecodeResult | null>(null);
  const [reconciliation, setReconciliation] = useState<AuditReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Anatomy & Color guide accordion
  const [showAnatomyGuide, setShowAnatomyGuide] = useState(false);

  // Pre-configured Test Cases for rapid farmer demonstration
  const auditScenarios = [
    {
      label: 'Verified Sexed Female (Genuine Match)',
      straw: '29H0 ABS SEXCEL DOORMAN LOT-8812 24089 CSS',
      receipt: {
        cowName: 'Chepkoech',
        cowTag: 'KE-COW-042',
        receiptBull: 'DOORMAN',
        receiptBreed: 'Holstein Friesian',
        receiptProductType: 'Sexed Female',
        pricePaidKsh: 6500,
        receiptTechnician: 'Dr. Kiprono AI Services',
      },
    },
    {
      label: '🚨 Fraud Alert: Billed Sexed, Straw is Conv',
      straw: 'KAGRC FR SIRIKWA B2024-09 CONV 24102 KEBS',
      receipt: {
        cowName: 'Baraka',
        cowTag: 'KE-COW-108',
        receiptBull: 'SIRIKWA',
        receiptBreed: 'Holstein Friesian',
        receiptProductType: 'Sexed Female (Claimed on Paper)',
        pricePaidKsh: 7000,
        receiptTechnician: 'Private AI Tech A',
      },
    },
    {
      label: 'Standard KAGRC Friesian (Genuine Fair Price)',
      straw: 'KAGRC FR SIRIKWA B2024-09 CONV 24050 KEBS',
      receipt: {
        cowName: 'Moraa',
        cowTag: 'KE-COW-015',
        receiptBull: 'SIRIKWA',
        receiptBreed: 'Holstein Friesian',
        receiptProductType: 'Conventional',
        pricePaidKsh: 2500,
        receiptTechnician: 'County Sub-County Vet Officer',
      },
    },
  ];

  // Perform Reconciliation
  const handleAudit = async (customStraw?: string, customReceipt?: ReceiptComparisonInput) => {
    const text = (customStraw !== undefined ? customStraw : strawText).trim();
    if (!text) {
      setError('Please enter the text stamped on the spent straw tube.');
      return;
    }

    const currentReceipt: ReceiptComparisonInput = customReceipt || {
      cowName,
      cowTag,
      receiptBull,
      receiptBreed,
      receiptProductType,
      pricePaidKsh: Number(pricePaidKsh) || 0,
      receiptTechnician,
    };

    setLoading(true);
    setError(null);

    try {
      const res = await reconcileStrawWithReceipt(text, currentReceipt, userCounty || undefined);
      setDecoded(res.decoded);
      setReconciliation(res.reconciliation);
    } catch (err: any) {
      setError(err.message || 'Audit check failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyScenario = (scenario: typeof auditScenarios[0]) => {
    setStrawText(scenario.straw);
    setCowName(scenario.receipt.cowName);
    setCowTag(scenario.receipt.cowTag);
    setReceiptBull(scenario.receipt.receiptBull);
    setReceiptBreed(scenario.receipt.receiptBreed);
    setReceiptProductType(scenario.receipt.receiptProductType);
    setPricePaidKsh(scenario.receipt.pricePaidKsh);
    setReceiptTechnician(scenario.receipt.receiptTechnician);
    handleAudit(scenario.straw, scenario.receipt);
  };

  const handleOpenWhatsApp = () => {
    if (!reconciliation) return;
    const phone = '254700000000'; // Default support / depot phone
    const text = encodeURIComponent(reconciliation.suggestedWhatsAppText);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* 1. Micro-copy Instruction Banner */}
      <div className="bg-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-800/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
              <Dna className="w-4 h-4 text-emerald-400" />
              <span>Post-Insemination Straw vs. Receipt Audit</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
              Inspect your spent, thawed AI straw after the technician finishes inseminating your cow. Type the text printed along the plastic tube and compare it side-by-side with your paper receipt to confirm genuine sire genetics, sexed heifer sorting, and fair pricing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAnatomyGuide(!showAnatomyGuide)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-900/60 hover:bg-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-700/50 transition-colors self-start flex-shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showAnatomyGuide ? 'Hide Straw Anatomy Guide' : 'Straw Anatomy & Color Guide'}</span>
            {showAnatomyGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Straw Spacing Micro-Copy Callout */}
        <div className="mt-3 bg-emerald-900/50 border border-emerald-700/50 rounded-xl p-2.5 text-xs text-emerald-100 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">Farmer Input Tip: </span>
            Type words and numbers with spaces just as printed on the tube (e.g., <code className="bg-emerald-950 px-1 py-0.5 rounded font-mono text-emerald-200">29HO18240 DOORMAN SEXCEL LOT-8812</code>). You do this after insemination when the straw is warm and the frost is gone. Don&apos;t worry about uppercase letters — we capitalize and format them automatically!
          </div>
        </div>

        {/* Collapsible Physical Straw Anatomy & Color Reference Guide */}
        {showAnatomyGuide && (
          <div className="mt-4 pt-4 border-t border-emerald-800/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-200 animate-fadeIn">
            <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-800/50 space-y-1.5">
              <h5 className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Physical Straw Characteristics</span>
              </h5>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                <li><strong className="text-white">Capacity:</strong> French straws come in 0.25 mL (thin) or 0.5 mL (standard). Measures ~133 mm length.</li>
                <li><strong className="text-white">Cotton Plug (Piston):</strong> Loaded first into the AI gun. Acts as a piston to smoothly push extended semen into the cow&apos;s cervix.</li>
                <li><strong className="text-white">Sealed Crimp:</strong> The tip snipped at a right angle (90°) right before insemination.</li>
                <li><strong className="text-white">Cryogenic Storage:</strong> Frozen at -196°C in liquid nitrogen to preserve sperm motility indefinitely.</li>
              </ul>
            </div>

            <div className="bg-emerald-900/30 p-3 rounded-xl border border-emerald-800/50 space-y-1.5">
              <h5 className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Regional Straw Color Codes</span>
              </h5>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 border border-white/40 flex-shrink-0" />
                  <span><strong>Pink:</strong> Holstein-Friesian</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-white/40 flex-shrink-0" />
                  <span><strong>Yellow:</strong> Jersey</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white/40 flex-shrink-0" />
                  <span><strong>Green:</strong> Brown Swiss / Cross</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-white/40 flex-shrink-0" />
                  <span><strong>Orange:</strong> Sahiwal / Indigenous</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white/40 flex-shrink-0" />
                  <span><strong>Red:</strong> Fleckvieh / Simmental</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-white/40 flex-shrink-0" />
                  <span><strong>Grey/Clear:</strong> Holstein / Buffalo</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive Input Panel: Straw vs Paper Receipt */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 6 cols: Spent Physical Straw Input */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Dna className="w-4 h-4 text-emerald-600" />
              <span>1. Text Stamped on Physical Straw</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              From Spent Plastic Tube
            </span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Laser/Thermal Printed Alphanumeric Text:
            </label>
            <input
              type="text"
              value={strawText}
              onChange={(e) => setStrawText(e.target.value)}
              placeholder="e.g. 29HO18240 DOORMAN SEXCEL LOT-8812 24089 CSS"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Quick Scenario Pills */}
          <div className="pt-1 space-y-1">
            <span className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">
              Try Common Real-World Scenarios:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {auditScenarios.map((scen, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyScenario(scen)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 text-slate-700 transition-all text-left"
                >
                  {scen.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 6 cols: Technician Paper Receipt Input */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>2. Paper Receipt Given by Technician</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Technician AI Form
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cow Name / Breed</label>
              <input
                type="text"
                value={cowName}
                onChange={(e) => setCowName(e.target.value)}
                placeholder="Chepkoech"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Ear Tag / Cow ID</label>
              <input
                type="text"
                value={cowTag}
                onChange={(e) => setCowTag(e.target.value)}
                placeholder="KE-COW-042"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Sire / Bull Claimed</label>
              <input
                type="text"
                value={receiptBull}
                onChange={(e) => setReceiptBull(e.target.value)}
                placeholder="e.g. DOORMAN"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Breed Claimed</label>
              <input
                type="text"
                value={receiptBreed}
                onChange={(e) => setReceiptBreed(e.target.value)}
                placeholder="e.g. Holstein Friesian"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Promised Semen Type</label>
              <select
                value={receiptProductType}
                onChange={(e) => setReceiptProductType(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              >
                <option value="Sexed Female">Sexed Female (~90% Heifer)</option>
                <option value="Conventional">Conventional (50/50 Split)</option>
                <option value="Sexed Male">Sexed Male (Beef Bull Calf)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-bold text-slate-600 block">Total Paid (KSh)</label>
                <span className="text-[9px] text-emerald-700 font-semibold">Your receipt price</span>
              </div>
              <input
                type="number"
                min="0"
                step="100"
                value={pricePaidKsh}
                onChange={(e) => setPricePaidKsh(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 6500"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleAudit()}
              disabled={loading || !strawText.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs py-2.5 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Auditing Straw vs Receipt...' : 'Run Side-by-Side Audit'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Decoded Straw Breakdown & Farmer Interpretation */}
      {decoded && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Decoded Spent Straw Breakdown
                </h4>
                <span
                  className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md ${
                    decoded.overallConfidence === 'HIGH'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : decoded.overallConfidence === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {decoded.overallConfidence} Confidence
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Batch Traceability Key: <span className="font-bold text-slate-700">{decoded.codeKey}</span>
              </p>
            </div>

            {decoded.priceBenchmark && (
              <div className="text-right">
                <span className="text-xs font-black text-emerald-700 block">
                  KSh {decoded.priceBenchmark.minKsh.toLocaleString()} – {decoded.priceBenchmark.maxKsh.toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold">
                  Official Market Benchmark
                </span>
              </div>
            )}
          </div>

          {/* Straw Printed Tokens Interpretation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {/* Stud / Collection Center */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Stud / Collection Center</span>
              <span className="font-black text-slate-900 text-xs block truncate">
                {decoded.supplier?.value?.name || 'Standard Center'}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {decoded.supplier?.meaning || 'Official AI supplier'}
              </span>
            </div>

            {/* Sire / Bull */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Sire Bull Pedigree</span>
              <span className="font-black text-slate-900 text-xs block truncate">
                {decoded.bull?.value?.name || 'Unlisted Bull'}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {decoded.bull?.meaning || 'Pedigree sire registered'}
              </span>
            </div>

            {/* Semen Technology (Sexed vs Conv) */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Semen Technology</span>
              <span
                className={`font-black text-xs block truncate ${
                  decoded.productType?.value === 'SEXED_FEMALE'
                    ? 'text-purple-700'
                    : 'text-slate-900'
                }`}
              >
                {decoded.productType?.value === 'SEXED_FEMALE' ? '✨ Sexed Female (90% Heifer)' : 'Conventional (50/50)'}
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                {decoded.productType?.meaning || 'Semen sorting status'}
              </span>
            </div>

            {/* Production Date (Julian) & Quality Seal */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Cryo Date & Quality Seal</span>
              <span className="font-black text-slate-900 text-xs block truncate">
                {decoded.productionDate?.formatted || 'Standard Cryo Batch'}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold block leading-tight">
                {decoded.qualitySeal?.name || 'CSS / KEBS Compliant'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Side-by-Side Post-Insemination Audit Table */}
      {reconciliation && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          {/* Overall Verdict Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              reconciliation.verdictColor === 'rose'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : reconciliation.verdictColor === 'amber'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {reconciliation.verdictColor === 'rose' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              ) : reconciliation.verdictColor === 'amber' ? (
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              <div>
                <span className="text-xs font-black block">
                  {reconciliation.overallVerdict}
                </span>
                <span className="text-[11px] opacity-80 font-medium">
                  Audited for Cow: <strong>{cowName || 'Cow'}</strong> {cowTag ? `(${cowTag})` : ''} • Price: KSh {Number(pricePaidKsh || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Supplier Depot</span>
              <span className="sm:hidden">WhatsApp</span>
            </button>
          </div>

          {/* Audit Comparison Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Check Item</th>
                  <th className="p-3">Physical Straw Reads</th>
                  <th className="p-3">Paper Receipt Claim</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 min-w-[220px]">Farmer Interpretation & Advice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliation.auditItems.map((item: AuditItem, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      {item.property}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 bg-slate-50/50">
                      {item.strawDecoded}
                    </td>
                    <td className="p-3 text-slate-700">
                      {item.receiptClaim}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          item.status === 'MATCH'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.status === 'MISMATCH'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status === 'MATCH' && '✓ MATCH'}
                        {item.status === 'MISMATCH' && '✕ MISMATCH'}
                        {item.status === 'WARNING' && '⚠ OVERCHARGE'}
                        {item.status === 'INFO' && 'ℹ RECORDED'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] leading-relaxed">
                      {item.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Footer: Save to Ledger or Authenticate */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              {isLoggedIn
                ? 'Logged in as verified farmer. You can save this audit directly to your herd ledger.'
                : 'Saving this verified breeding event to your cow record requires a farmer account.'}
            </span>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  if (onSaveToLedger && decoded) {
                    onSaveToLedger(decoded, {
                      cowName,
                      cowTag,
                      receiptBull,
                      receiptBreed,
                      receiptProductType,
                      pricePaidKsh: Number(pricePaidKsh || 0),
                      receiptTechnician,
                    });
                  }
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to Cow&apos;s Lifetime Ledger</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequireAuth}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sign In / Register to Save Event</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
