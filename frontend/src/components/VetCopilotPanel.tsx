import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Share2,
  ShieldAlert,
  Stethoscope,
  Info,
  AlertTriangle,
  HeartPulse,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { MatchedCondition, CopilotExplanationResponse } from '../types';

interface VetCopilotPanelProps {
  condition: MatchedCondition;
  speciesName: string;
  totalAnimals: number;
  sickAnimals: number;
  deadAnimals: number;
  language?: 'en' | 'sw';
  copilotData: CopilotExplanationResponse | null;
  loading: boolean;
  error: string | null;
  countyVetPhone?: string | null;
  onGoToVets?: () => void;
}

export const VetCopilotPanel: React.FC<VetCopilotPanelProps> = ({
  condition,
  speciesName,
  totalAnimals,
  sickAnimals,
  deadAnimals,
  copilotData,
  loading,
  error,
  countyVetPhone,
  onGoToVets,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Immediate "What to do now" from database
  const immediateText = condition.firstAid || '';

  const immediateSteps = immediateText
    ? immediateText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const displaySteps =
    copilotData?.whatToDoNow && copilotData.whatToDoNow.length > 0
      ? copilotData.whatToDoNow
      : immediateSteps;

  const isReviewed = copilotData?.reviewed ?? condition.reviewed ?? false;

  const handleCopyQuestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = (questions: string[]) => {
    const text = questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // WhatsApp share generator
  const getWhatsAppShareUrl = () => {
    const refId = `KVB-${condition.id}-${Date.now().toString(36).toUpperCase()}`;

    const whyText = copilotData?.whyRankedFirst || '';
    const stepsText = displaySteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    const questionsText = (copilotData?.questionsForVet || [])
      .map((q, idx) => `• ${q}`)
      .join('\n');

    const shareBody = `*Livestock Health Assessment Summary*
Ref ID: ${refId}
Animal Species: ${speciesName}
Affected Animals: ${sickAnimals} of ${totalAnimals} sick${deadAnimals > 0 ? `, ${deadAnimals} dead` : ''}
Primary Suspected Pattern: ${condition.name} (${condition.score}% correlation)

*Why this result:*
${whyText}

*What to do on-farm now:*
${stepsText}

*Questions for visiting Veterinarian:*
${questionsText}

*Notice:* Preliminary AI correlation, not a definitive diagnosis. Please inspect animals on-farm.`;

    const encoded = encodeURIComponent(shareBody);

    if (countyVetPhone) {
      const cleanPhone = countyVetPhone.replace(/[^0-9]/g, '');
      return `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
  };

  return (
    <div className="mt-4 bg-gradient-to-b from-slate-50 to-white rounded-2xl border-2 border-emerald-600/90 p-4 sm:p-6 shadow-md space-y-6 animate-fadeIn">
      {/* 1. Header bar with source badge & Confidence Rating */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Vet Co-Pilot Explanation
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Checked against vetted veterinary biosecurity guidelines
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Prominent Confidence Rating Badge */}
          <div className="bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
            <span className="text-xs text-slate-600 font-semibold">AI Confidence:</span>
            <span className="text-sm font-black text-emerald-800">{condition.score}%</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
              {condition.score >= 70 ? 'High Match' : condition.score >= 40 ? 'Moderate Match' : 'Weak Match'}
            </span>
          </div>

          {copilotData?.source === 'ai' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              AI Explanation
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
              <Info className="w-3.5 h-3.5 text-slate-600" />
              Standard Advice
            </span>
          )}
        </div>
      </div>

      {/* 2. Explicit Inaccuracy Recognition Callout */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl space-y-1">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Preliminary Pattern Match — Not Guaranteed Accurate</span>
        </div>
        <p className="text-xs text-amber-950 font-medium leading-relaxed pl-6">
          This <strong>{condition.score}% confidence score</strong> is a statistical symptom pattern correlation and is <strong>not necessarily accurate</strong>. Clinical manifestations vary widely among animals, and signs frequently overlap across diverse infectious and non-infectious conditions.
        </p>
      </div>

      {/* 3. Part 1: What to do now (Rendered IMMEDIATELY from DB, no loading wait) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h5 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <HeartPulse className="w-4 h-4 text-emerald-700" />
            <span>What to Do Now</span>
          </h5>
          <span
            className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
              isReviewed
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            {isReviewed ? 'Vet-Reviewed Advice' : 'Standard Advice'}
          </span>
        </div>

        {displaySteps.length > 0 ? (
          <div className="space-y-2.5">
            {displaySteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-base font-semibold text-slate-900 leading-snug">{step}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-amber-900 text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <span>
              This condition requires urgent professional veterinary attendance. Do not administer unprescribed treatments.
            </span>
          </div>
        )}
      </div>

      {/* 4. Part 2: Why this result */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <h5 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
          <Stethoscope className="w-4 h-4 text-emerald-700" />
          <span>Why This Result</span>
        </h5>

        {loading ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>Preparing explanation...</span>
            </div>
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
            <div className="h-4 bg-slate-200 rounded w-4/6" />
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-base text-slate-800 font-medium leading-relaxed">
              {copilotData?.whyRankedFirst ||
                `Reported symptoms are consistent with ${condition.name}. ${sickAnimals} of ${totalAnimals} animals are affected.`}
            </p>
          </div>
        )}
      </div>

      {/* 5. Part 3: Questions for the visiting Vet */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h5 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Ask the Vet</span>
          </h5>

          {!loading && copilotData?.questionsForVet && copilotData.questionsForVet.length > 0 && (
            <button
              type="button"
              onClick={() => handleCopyAll(copilotData.questionsForVet)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg transition-all active:scale-95"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'Copied all!' : 'Copy All Questions'}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-slate-200 rounded-xl" />
            <div className="h-10 bg-slate-200 rounded-xl" />
            <div className="h-10 bg-slate-200 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-2">
            {(copilotData?.questionsForVet || [
              `Can you examine the ${sickAnimals} affected animals to evaluate if this fits ${condition.name}?`,
              `How should we isolate and protect the remaining ${Math.max(totalAnimals - sickAnimals, 0)} healthy animals?`,
              'What biosecurity precautions should we maintain while awaiting full examination?',
            ]).map((q, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-700 font-black text-sm mt-0.5">•</span>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{q}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyQuestion(q, idx)}
                  className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0"
                  title="Copy question"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Strong Recommendation to visit Vet Section */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <UserCheck className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="flex-1 space-y-1">
            <h6 className="text-sm font-black text-emerald-950">
              Recommended Next Step: Contact a Field Veterinarian
            </h6>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Because symptoms can mislead, we strongly recommend going to the <strong>Veterinary Directory</strong> to find certified veterinary officers in your county who can conduct clinical diagnostic tests and prescribe treatment.
            </p>
          </div>
        </div>

        {onGoToVets && (
          <button
            type="button"
            onClick={onGoToVets}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Search Veterinary Officers in Directory</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 7. Mandatory Notices added in code */}
      <div className="pt-2 border-t border-slate-200 space-y-3">
        {/* Notifiable Disease Notice */}
        {condition.notifiable && (
          <div className="bg-rose-50 border-2 border-rose-400 p-4 rounded-xl text-rose-950 flex items-start gap-3 shadow-2xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-rose-800">
                Mandatory Notifiable Condition
              </p>
              <p className="text-sm font-bold mt-0.5">
                {copilotData?.reportNotice ||
                  'Reportable condition under national regulations. Notify your Sub-County Veterinary Officer immediately.'}
              </p>
            </div>
          </div>
        )}

        {/* See-a-Vet Notice */}
        <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl text-emerald-950 flex items-center gap-3">
          <Stethoscope className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <p className="text-sm font-bold">
            {copilotData?.seeVetNotice ||
              'Please have a qualified veterinarian examine your animals promptly.'}
          </p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 text-center italic">
          {copilotData?.disclaimer ||
            'Possible condition, not a diagnosis. Always consult a qualified veterinarian before administering treatments.'}
        </p>

        {/* WhatsApp Share Button */}
        <div className="pt-2 flex justify-center">
          <a
            href={getWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm px-6 py-3 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Clinical Summary with Vet (WhatsApp)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
