import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Download,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface ReproductiveForecastProps {
  eventDate: string | Date;
  cowName?: string;
  cowTag?: string;
  referenceNo?: string;
  sireName?: string;
  isCompact?: boolean;
}

export function calculateReproductiveDates(dateInput: string | Date) {
  const base = new Date(dateInput);
  // Normalize date to local midnight
  const eventDate = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  const addDays = (days: number) => {
    const d = new Date(eventDate);
    d.setDate(d.getDate() + days);
    return d;
  };

  return {
    eventDate,
    // Repeat Heat Window 1 (21-day cycle)
    heatCycle1Start: addDays(18),
    heatCycle1Peak: addDays(21),
    heatCycle1End: addDays(24),
    // Repeat Heat Window 2 (42-day cycle)
    heatCycle2Start: addDays(39),
    heatCycle2Peak: addDays(42),
    heatCycle2End: addDays(45),
    // Vet Pregnancy Check (PD)
    pdStartDate: addDays(60),
    pdEndDate: addDays(90),
    // Calving / Delivery window (bovine gestation ~283 days)
    calvingEarliest: addDays(278),
    calvingPeak: addDays(283),
    calvingLatest: addDays(288),
    maternityPenDate: addDays(265),
  };
}

export const ReproductiveForecastCard: React.FC<ReproductiveForecastProps> = ({
  eventDate,
  cowName = 'Inseminated Cow',
  cowTag,
  referenceNo,
  sireName,
  isCompact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSigns, setShowSigns] = useState(false);

  const dates = calculateReproductiveDates(eventDate);
  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = todayNormalized.getTime() - dates.eventDate.getTime();
  const daysSinceAI = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const daysUntilDue = Math.floor(
    (dates.calvingPeak.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24)
  );

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatShort = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });

  // Check heat cycle status
  const isHeatActive =
    todayNormalized >= dates.heatCycle1Start && todayNormalized <= dates.heatCycle1End;
  const isHeatUpcoming = todayNormalized < dates.heatCycle1Start;
  const isHeatPast = todayNormalized > dates.heatCycle1End;

  const daysToHeatStart = Math.ceil(
    (dates.heatCycle1Start.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Copy text summary
  const handleCopySummary = () => {
    const summary = [
      `🐄 AI REPRODUCTIVE FORECAST: ${cowName} ${cowTag ? `(${cowTag})` : ''}`,
      `🗓️ Inseminated Date: ${formatDate(dates.eventDate)}${referenceNo ? ` • Ref: ${referenceNo}` : ''}`,
      sireName ? `🧬 Sire / Bull: ${sireName}` : '',
      `------------------------------------------------`,
      `🚨 DATES TO WATCH FOR HEAT (If AI did not work):`,
      `• Primary Watch Window (Cycle 1): ${formatDate(dates.heatCycle1Start)} – ${formatDate(dates.heatCycle1End)}`,
      `  (Peak 21-day heat day: ${formatDate(dates.heatCycle1Peak)})`,
      `• Action: Watch twice daily (morning & evening) for standing heat, clear vulva mucus discharge, or milk drop. If seen, call AI technician immediately!`,
      `• Secondary Watch (Cycle 2): ${formatDate(dates.heatCycle2Start)} – ${formatDate(dates.heatCycle2End)}`,
      ``,
      `🩺 VET PREGNANCY DIAGNOSIS (PD CHECK):`,
      `• Window: ${formatDate(dates.pdStartDate)} – ${formatDate(dates.pdEndDate)} (Days 60–90)`,
      `• Action: Schedule vet for manual rectal palpation or ultrasound confirmation.`,
      ``,
      `🍼 PREDICTED CALVING / DELIVERY DATE RANGE:`,
      `• Expected Peak Due Date: ${formatDate(dates.calvingPeak)} (Day 283)`,
      `• Normal Calving Window: ${formatDate(dates.calvingEarliest)} – ${formatDate(dates.calvingLatest)} (Days 278 to 288)`,
      `• Action: Move to maternity pen by ${formatDate(dates.maternityPenDate)} (~Day 265).`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Download .ics Calendar File
  const handleDownloadICS = () => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatICSDate = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    const ref = referenceNo || `AI-${Date.now()}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Livestock Health Kenya//AI Breeding Tracker//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',

      // Heat Watch 1
      'BEGIN:VEVENT',
      `UID:heat1-${ref}@livestockhealth.ke`,
      `DTSTART;VALUE=DATE:${formatICSDate(dates.heatCycle1Start)}`,
      `DTEND;VALUE=DATE:${formatICSDate(new Date(dates.heatCycle1End.getTime() + 86400000))}`,
      `SUMMARY:🚨 Heat Watch Window: ${cowName} (AI Check)`,
      `DESCRIPTION:Check ${cowName} twice daily for return-to-heat signs (standing heat\\, clear stringy mucus\\, drop in milk). If seen\\, AI did not hold — call technician for repeat service. Ref: ${ref}`,
      'END:VEVENT',

      // PD Check
      'BEGIN:VEVENT',
      `UID:pd-${ref}@livestockhealth.ke`,
      `DTSTART;VALUE=DATE:${formatICSDate(dates.pdStartDate)}`,
      `DTEND;VALUE=DATE:${formatICSDate(new Date(dates.pdStartDate.getTime() + 86400000))}`,
      `SUMMARY:🩺 Vet Pregnancy Check (PD): ${cowName}`,
      `DESCRIPTION:Book vet/AI tech for rectal palpation or ultrasound to officially verify pregnancy for ${cowName}. Ref: ${ref}`,
      'END:VEVENT',

      // Calving Window
      'BEGIN:VEVENT',
      `UID:calving-${ref}@livestockhealth.ke`,
      `DTSTART;VALUE=DATE:${formatICSDate(dates.calvingEarliest)}`,
      `DTEND;VALUE=DATE:${formatICSDate(new Date(dates.calvingLatest.getTime() + 86400000))}`,
      `SUMMARY:🐄 Calving Delivery Window: ${cowName}`,
      `DESCRIPTION:Expected calving delivery window (Peak Due: ${formatDate(dates.calvingPeak)}). Prepare clean maternity stall and monitor labor. Ref: ${ref}`,
      'END:VEVENT',

      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reproductive-forecast-${cowName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'cow'}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden text-xs space-y-3 p-4 sm:p-5 animate-fadeIn">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">
              AI Reproductive Forecast &amp; Calendar
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Day {daysSinceAI} of 283
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Predictions for <strong className="text-slate-800">{cowName}</strong>
            {cowTag && ` (${cowTag})`} • Inseminated on {formatDate(dates.eventDate)}
          </p>
        </div>

        {/* Action Buttons: Calendar & Copy */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownloadICS}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
            title="Download calendar file with reminders for heat watch, vet PD, and calving"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Add to Calendar (.ics)</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
            title="Copy date predictions to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copy Dates</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Side-by-Side Key Forecast Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Module A: 🚨 DATES TO WATCH OUT FOR HEAT (IN CASE AI DIDN'T WORK) */}
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-1 pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-black text-amber-950 block text-xs">
                  Watch for Return Heat
                </span>
                <span className="text-[10px] text-amber-800 font-medium">
                  In case the AI did not hold (21-Day Cycle)
                </span>
              </div>
            </div>

            {/* Dynamic Status Badge */}
            {isHeatActive ? (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                🚨 Watch Now!
              </span>
            ) : isHeatUpcoming ? (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                In {daysToHeatStart} days
              </span>
            ) : (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Cycle 1 passed
              </span>
            )}
          </div>

          {/* Primary Cycle 1 Watch Window */}
          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                1st Repeat Heat Window
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                Peak: {formatShort(dates.heatCycle1Peak)} (Day 21)
              </span>
            </div>
            <div className="text-sm font-black text-slate-900 mt-1">
              {formatDate(dates.heatCycle1Start)} – {formatDate(dates.heatCycle1End)}
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              If the cow did not conceive, she will come back on heat during these days. Check her closely at dawn and dusk.
            </p>
          </div>

          {/* Secondary Cycle 2 Watch Window */}
          <div className="bg-white/80 p-2 rounded-lg border border-amber-100 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                2nd Heat Cycle Watch (Day 42)
              </span>
              <span className="font-bold text-slate-800">
                {formatDate(dates.heatCycle2Start)} – {formatDate(dates.heatCycle2End)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Backup check</span>
          </div>

          {/* Collapsible Signs of Heat Guide */}
          <div>
            <button
              type="button"
              onClick={() => setShowSigns(!showSigns)}
              className="text-[11px] font-bold text-amber-900 hover:text-amber-950 flex items-center gap-1 underline"
            >
              <Eye className="w-3.5 h-3.5 text-amber-700" />
              <span>{showSigns ? 'Hide heat symptoms' : 'What signs to look for on-farm?'}</span>
              {showSigns ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSigns && (
              <div className="mt-2 p-2.5 bg-amber-100/70 border border-amber-300/80 rounded-lg space-y-1 text-[11px] text-amber-950 animate-fadeIn">
                <div className="font-bold flex items-center gap-1">
                  <span>🚨 If you see ANY of these signs, call your AI technician immediately:</span>
                </div>
                <ul className="space-y-1 pl-3.5 list-disc font-medium text-slate-800">
                  <li><strong>Standing to be mounted:</strong> Allows other cows to mount her without moving away.</li>
                  <li><strong>Clear vaginal discharge:</strong> Long, transparent, egg-white mucus hanging from vulva.</li>
                  <li><strong>Behavioral changes:</strong> Frequent bellowing, restless pacing, tail cocking.</li>
                  <li><strong>Milk drop:</strong> Sudden unexplained reduction in morning or evening milk yield.</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Module B: 🍼 PREDICTED DELIVERY DATE RANGES (CALVING FORECAST) */}
        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-1 pb-2 border-b border-emerald-200/60">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <div>
                  <span className="font-black text-emerald-950 block text-xs">
                    Predicted Calving / Delivery
                  </span>
                  <span className="text-[10px] text-emerald-800 font-medium">
                    Bovine Gestation: ~283 Days
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-black text-emerald-900 bg-emerald-200/90 px-2 py-0.5 rounded-full">
                {daysUntilDue > 0 ? `${daysUntilDue} days to go` : 'Due now'}
              </span>
            </div>

            {/* Peak Expected Due Date */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                  Expected Peak Due Date
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Day 283
                </span>
              </div>
              <div className="text-base font-black text-emerald-950 mt-1">
                {formatDate(dates.calvingPeak)}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Normal Delivery Range: <strong className="text-slate-900">{formatShort(dates.calvingEarliest)} – {formatDate(dates.calvingLatest)}</strong> (Days 278 to 288)
              </div>
            </div>

            {/* Veterinary Pregnancy Diagnosis (PD Check) Milestone */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vet Pregnancy Diagnosis (PD)</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500">Day 60 – 90</span>
              </div>
              <div className="font-bold text-slate-900 text-xs">
                {formatDate(dates.pdStartDate)} – {formatDate(dates.pdEndDate)}
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                If no heat was observed, call your vet for rectal palpation or ultrasound to officially verify pregnancy.
              </p>
            </div>
          </div>

          {/* Calving Preparation Advisory */}
          <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-950 font-medium">
            💡 <strong>Maternity Stall Setup:</strong> Move {cowName} to a clean, disinfected calving stall by{' '}
            <strong className="text-emerald-900">{formatDate(dates.maternityPenDate)}</strong> (~Day 265) and begin pre-calving transition minerals.
          </div>
        </div>
      </div>
    </div>
  );
};
