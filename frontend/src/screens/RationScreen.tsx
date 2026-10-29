import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { calculateRation } from '../lib/api';
import { RationResponse } from '../types';
import { NutrientTable } from '../components/NutrientTable';
import {
  Wheat,
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  Sparkles,
  DollarSign,
  Info,
} from 'lucide-react';

export const RationScreen: React.FC = () => {
  const { t, selectedSpecies, searchLanguage } = useSession();

  // Common production stages by species
  const getStages = () => {
    switch (selectedSpecies?.slug) {
      case 'dairy-cattle':
        return [
          { key: 'early-lactation', label: 'Early Lactation (High Milk Yield)' },
          { key: 'mid-lactation', label: 'Mid Lactation' },
          { key: 'late-lactation', label: 'Late Lactation' },
          { key: 'dry', label: 'Dry Cow (Resting / In-Calf)' },
          { key: 'heifer', label: 'Growing Heifer' },
        ];
      case 'goats':
        return [
          { key: 'lactating', label: 'Lactating Doe (Milk Production)' },
          { key: 'pregnant', label: 'Pregnant Doe' },
          { key: 'growing', label: 'Growing Kid' },
          { key: 'maintenance', label: 'Maintenance' },
        ];
      case 'sheep':
        return [
          { key: 'lactating', label: 'Lactating Ewe' },
          { key: 'pregnant', label: 'Pregnant Ewe' },
          { key: 'growing', label: 'Growing Lamb' },
          { key: 'maintenance', label: 'Maintenance' },
        ];
      case 'poultry':
        return [
          { key: 'layer', label: 'Laying Hen (Egg Production)' },
          { key: 'broiler-starter', label: 'Broiler Starter (0-3 wks)' },
          { key: 'broiler-finisher', label: 'Broiler Finisher (4+ wks)' },
          { key: 'grower', label: 'Grower Pullet' },
        ];
      default:
        return [{ key: 'maintenance', label: 'Standard Maintenance' }];
    }
  };

  const stages = getStages();
  const [selectedStage, setSelectedStage] = useState(stages[0].key);

  const defaultFeeds = [
    { name: 'Napier Grass', kg: 15 },
    { name: 'Dairy Meal (Commercial)', kg: 4 },
    { name: 'Sunflower Cake', kg: 2 },
  ];

  const commonFeedOptions = [
    'Napier Grass',
    'Rhodes Grass Hay',
    'Maize Silage',
    'Maize Grain',
    'Wheat Bran',
    'Soybean Meal',
    'Sunflower Cake',
    'Cottonseed Cake',
    'Molasses',
    'Dairy Meal (Commercial)',
    'Lucerne Hay',
    'Sweet Potato Vines',
    'Desmodium',
    'Bone Meal',
    'Limestone',
    'Dicalcium Phosphate',
    'Millet Grain',
    'Sorghum Grain',
    'Fish Meal',
    'Groundnut Cake',
  ];

  const [farmerFeeds, setFarmerFeeds] = useState<Array<{ name: string; kg: number }>>(defaultFeeds);
  const [newFeedName, setNewFeedName] = useState(commonFeedOptions[0]);
  const [newFeedKg, setNewFeedKg] = useState(5);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<RationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddFeed = () => {
    if (!newFeedName || newFeedKg <= 0) return;
    setFarmerFeeds((prev) => {
      const existing = prev.find((f) => f.name === newFeedName);
      if (existing) {
        return prev.map((f) =>
          f.name === newFeedName ? { ...f, kg: f.kg + newFeedKg } : f
        );
      }
      return [...prev, { name: newFeedName, kg: newFeedKg }];
    });
  };

  const handleRemoveFeed = (index: number) => {
    setFarmerFeeds((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    if (!selectedSpecies || farmerFeeds.length === 0) return;
    setCalculating(true);
    setError(null);

    try {
      const res = await calculateRation(
        selectedSpecies.id,
        selectedStage,
        farmerFeeds.map((f) => ({ name: f.name, kgAvailable: f.kg })),
        searchLanguage
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Error balancing ration');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-yellow-950 text-white p-4 sm:p-5 rounded-2xl border border-amber-700/50 shadow-2xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Wheat className="w-4 h-4 text-amber-300" />
            <h2 className="text-sm sm:text-base font-black">
              {t.rationTitle} — {selectedSpecies?.name}
            </h2>
          </div>
          <p className="text-xs text-amber-100 font-medium max-w-2xl">
            Balance protein, energy, calcium and phosphorus proportions to maximize milk and meat yield while keeping feed expenses minimal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Stage Selector & Feed Inventory */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            {/* Stage Selector */}
            <div>
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                {t.selectStage}
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500"
              >
                {stages.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Feeds on Farm */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  {t.availableFeeds}
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  {farmerFeeds.length} feeds
                </span>
              </div>

              <div className="space-y-1.5 mb-2.5">
                {farmerFeeds.map((feed, idx) => (
                  <div
                    key={feed.name}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {feed.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {feed.kg} kg daily allotment
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={feed.kg}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFarmerFeeds((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, kg: val } : f))
                          );
                        }}
                        className="w-16 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-extrabold text-center"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeed(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Feed Dropdown + Input */}
              <div className="pt-2 border-t border-slate-100 flex gap-1.5">
                <select
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                >
                  {commonFeedOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={newFeedKg}
                  onChange={(e) => setNewFeedKg(parseFloat(e.target.value) || 1)}
                  className="w-14 bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-center"
                />
                <button
                  type="button"
                  onClick={handleAddFeed}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCalculate}
                disabled={calculating || farmerFeeds.length === 0}
                className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
              >
                {calculating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Calculator className="w-3.5 h-3.5" />
                )}
                <span>{calculating ? 'Balancing Linear Program...' : t.calculateMix}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Mix Breakdown, Nutrient Analysis & Recommendations */}
        <div className="lg:col-span-7 space-y-3">
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 text-xs font-bold">
              {error}
            </div>
          )}

          {!result && !calculating && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1">
                <Wheat className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-slate-900">
                Configure Your Feed Inventory
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                Select your animal stage and list what feeds are in your store to balance energy, crude protein, and minerals.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fadeIn">
              {/* Proportional Mix Card */}
              <div className="bg-white p-5 rounded-3xl border border-primary-300 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-extrabold text-gray-900">
                    {t.mixResults}
                  </h3>
                  {result.totalCost !== null && (
                    <span className="text-xs font-extrabold text-primary-800 bg-primary-50 px-3 py-1 rounded-full border border-primary-200 flex items-center">
                      <DollarSign className="w-3.5 h-3.5 -mr-0.5" />
                      Cost: ~{result.totalCost} KES / head / day
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.mix.map((m) => (
                    <div
                      key={m.feedName}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <span className="text-xs font-bold text-gray-800">{m.feedName}</span>
                      <div className="text-right">
                        <span className="text-xs font-black text-gray-900 block font-mono">
                          {m.kgUsed} kg
                        </span>
                        <span className="text-[10px] text-gray-400 font-semibold">
                          ({(m.proportion * 100).toFixed(0)}% of diet)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nutrient Table */}
              <NutrientTable totals={result.totals} targets={result.targets} />

              {/* Gaps Recommendations */}
              {result.gaps.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                      {t.gapsTitle}
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {result.gaps.map((gap, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-950 font-medium list-disc list-inside leading-snug"
                      >
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plain-Language Explanation */}
              {result.explanation && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-5 rounded-3xl shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary-700" />
                    <h4 className="text-xs font-bold text-primary-900">
                      {t.llmAdviceTitle}
                    </h4>
                  </div>
                  <p className="text-xs text-green-950 leading-relaxed font-medium">
                    {result.explanation}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-gray-400 px-1">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{result.disclaimer}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
