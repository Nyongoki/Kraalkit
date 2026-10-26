import React from 'react';
import { RationTotals } from '../types';
import { useSession } from '../store/sessionContext';
import { CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

interface NutrientTableProps {
  totals: RationTotals;
  targets: RationTotals;
}

export const NutrientTable: React.FC<NutrientTableProps> = ({ totals, targets }) => {
  const { t } = useSession();

  const nutrients = [
    {
      name: t.protein,
      unit: '%',
      supplied: totals.proteinPct,
      target: targets.proteinPct,
      decimals: 1,
    },
    {
      name: t.energy,
      unit: 'MJ/kg',
      supplied: totals.energyMjPerKg,
      target: targets.energyMjPerKg,
      decimals: 1,
    },
    {
      name: t.calcium,
      unit: '%',
      supplied: totals.calciumPct,
      target: targets.calciumPct,
      decimals: 3,
    },
    {
      name: t.phosphorus,
      unit: '%',
      supplied: totals.phosphorusPct,
      target: targets.phosphorusPct,
      decimals: 3,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-4">
      <h4 className="text-sm font-bold text-gray-900 mb-3">{t.nutrientTable}</h4>
      <div className="space-y-3">
        {nutrients.map((n) => {
          const ratio = n.target > 0 ? (n.supplied / n.target) * 100 : 100;
          const isShort = n.supplied < n.target * 0.95;
          const isOver = n.supplied > n.target * 1.35;
          const isMet = !isShort && !isOver;

          return (
            <div key={n.name} className="border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-800">{n.name}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-gray-900">
                    {n.supplied.toFixed(n.decimals)} {n.unit}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">
                    {n.target.toFixed(n.decimals)} {n.unit}
                  </span>
                  {isMet && (
                    <span className="inline-flex items-center text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold ml-1">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" />
                      {t.met}
                    </span>
                  )}
                  {isShort && (
                    <span className="inline-flex items-center text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold ml-1">
                      <AlertCircle className="w-3 h-3 mr-0.5" />
                      {t.short}
                    </span>
                  )}
                  {isOver && (
                    <span className="inline-flex items-center text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold ml-1">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      {t.over}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${
                    isShort ? 'bg-red-500' : isOver ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(ratio, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
