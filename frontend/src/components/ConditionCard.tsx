import React, { useState } from 'react';
import { MatchedCondition } from '../types';
import { AlertCircle, ChevronDown, ChevronUp, ShieldAlert, Sparkles, Biohazard, HeartPulse, Lock } from 'lucide-react';
import { useSession } from '../store/sessionContext';

interface ConditionCardProps {
  condition: MatchedCondition;
  isTopCard?: boolean;
  onExplainClick?: () => void;
  isCopilotOpen?: boolean;
  canExplain?: boolean;
  language?: 'en' | 'sw';
}

export const ConditionCard: React.FC<ConditionCardProps> = ({
  condition,
  isTopCard = false,
  onExplainClick,
  isCopilotOpen = false,
  canExplain = false,
  language = 'en',
}) => {
  const [showFirstAid, setShowFirstAid] = useState(false);
  const { t, currentUser } = useSession();

  const isSwahili = language === 'sw';

  const getUrgencyBadge = () => {
    switch (condition.urgency) {
      case 'EMERGENCY':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-600',
          text: 'EMERGENCY — Immediate Vet Care',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-600',
          text: 'HIGH URGENCY — Inspect Today',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          dot: 'bg-yellow-600',
          text: 'MEDIUM — Veterinary Check',
        };
      default:
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-600',
          text: 'LOW — Monitor Symptoms',
        };
    }
  };

  const urgencyStyle = getUrgencyBadge();

  return (
    <div
      className={`bg-white rounded-2xl shadow-2xs border transition-all p-4 sm:p-5 ${
        condition.callVetNow
          ? 'border-rose-400 ring-1 ring-rose-200'
          : condition.isContagious
          ? 'border-purple-300 ring-1 ring-purple-100'
          : 'border-slate-200/90'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {condition.name}
            </h3>
            {condition.isContagious && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                <Biohazard className="w-3 h-3 text-purple-700" />
                Contagious
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Clinical correlation: {condition.matchedSymptoms} of {condition.totalSymptoms} key symptom markers
          </p>
        </div>

        <div className="text-right flex-shrink-0 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
          <span className="text-lg sm:text-xl font-black text-emerald-700">
            {condition.score}%
          </span>
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Match</p>
        </div>
      </div>

      {/* Progress Match Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${
            condition.urgency === 'EMERGENCY'
              ? 'bg-rose-500'
              : condition.urgency === 'HIGH'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(condition.score, 100)}%` }}
        />
      </div>

      {/* Badges & Urgency Tag */}
      <div className="flex flex-wrap items-center gap-2 mb-3.5">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${urgencyStyle.bg}`}>
          <span className={`w-2 h-2 mr-1.5 rounded-full animate-ping ${urgencyStyle.dot}`} />
          {urgencyStyle.text}
        </span>

        {condition.notifiable && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-purple-700" />
            Reportable to County SCVO
          </span>
        )}
      </div>

      {/* Emergency Callout */}
      {condition.callVetNow && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 mb-3.5 flex items-center text-rose-950 text-xs font-bold gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{t.emergencyAlert}</span>
        </div>
      )}

      {/* Explain this result CTA button */}
      {canExplain && onExplainClick && (
        <div className="pt-3.5 mt-2 border-t border-slate-100 space-y-1.5">
          <button
            type="button"
            onClick={onExplainClick}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] ${
              !currentUser
                ? 'bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-400/40'
                : isCopilotOpen
                ? 'bg-emerald-950 text-white ring-2 ring-emerald-500 shadow-inner'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-md'
            }`}
          >
            {!currentUser ? (
              <>
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Log In to Explain with Vet Co-Pilot</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>
                  {isCopilotOpen ? 'Hide Co-Pilot Explanation' : 'Explain this result (Vet Co-Pilot)'}
                </span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center font-medium">
            {!currentUser
              ? 'Vet Co-Pilot requires account login to view clinical correlation & questions'
              : 'Explanation generated and checked against vet-reviewed clinical text'}
          </p>
        </div>
      )}

      {/* First Aid & Farm Actions Accordion */}
      {condition.firstAid && !isCopilotOpen && (
        <div className="border-t border-slate-100 pt-3 mt-1">
          <button
            type="button"
            onClick={() => setShowFirstAid(!showFirstAid)}
            className="flex items-center justify-between w-full text-xs font-black text-slate-800 hover:text-emerald-800 py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-emerald-600" />
              <span>{t.firstAidInstructions}</span>
            </span>
            {showFirstAid ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showFirstAid && (
            <div className="mt-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 leading-relaxed space-y-1.5 animate-fadeIn">
              <div className="font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
                <span>On-Farm Action Steps:</span>
              </div>
              <p>{condition.firstAid}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
