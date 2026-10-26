import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useSession } from '../store/sessionContext';

export const SafetyNotice: React.FC = () => {
  const { t } = useSession();

  return (
    <div className="bg-amber-50/80 border border-amber-200/90 p-4 sm:p-5 rounded-3xl shadow-2xs mb-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block mb-0.5">
            Clinical Triage Disclaimer & Official Advisory
          </span>
          <p className="text-xs sm:text-sm font-semibold text-amber-950 leading-relaxed">
            {t.seeVetNotice}
          </p>
        </div>
      </div>
    </div>
  );
};
