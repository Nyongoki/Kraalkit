import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { submitTerm } from '../lib/api';
import { ScreenTab } from '../components/Navigation';
import { KENYAN_LANGUAGES } from '../lib/i18n';
import { PlusCircle, CheckCircle2, ArrowLeft, BookOpen, Globe } from 'lucide-react';

interface AddTermScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const AddTermScreen: React.FC<AddTermScreenProps> = ({ setCurrentTab }) => {
  const { t, searchLanguage } = useSession();

  const [symptomId, setSymptomId] = useState(1);
  const [languageCode, setLanguageCode] = useState(searchLanguage);
  const [text, setText] = useState('');
  const [variant, setVariant] = useState('');
  const [contributor, setContributor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const symptomOptions = [
    { id: 1, name: 'Fever (High body temperature)' },
    { id: 2, name: 'Nasal Discharge (Mucus from nose)' },
    { id: 3, name: 'Coughing (Chest congestion)' },
    { id: 4, name: 'Diarrhea (Watery stools)' },
    { id: 5, name: 'Loss of Appetite' },
    { id: 6, name: 'Lameness (Cannot walk)' },
    { id: 7, name: 'Milk Drop (Sudden drop in yield)' },
    { id: 8, name: 'Bloat (Swollen left flank)' },
    { id: 9, name: 'Mouth Lesions (Sores on tongue/lips)' },
    { id: 10, name: 'Foot Lesions (Blisters/cracks on hooves)' },
    { id: 11, name: 'Skin Lesions (Lumps or nodular skin)' },
    { id: 16, name: 'Pale Mucous (White gums / eye rims)' },
    { id: 17, name: 'Swollen Lymph Nodes' },
    { id: 18, name: 'Difficulty Breathing' },
    { id: 19, name: 'Sudden Death' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitTerm({
        symptomId,
        languageCode,
        text: text.trim(),
        variant: variant.trim() || undefined,
        contributor: contributor.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error submitting term');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setCurrentTab('home')}
          className="p-1 text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-1.5">
          <BookOpen className="w-5 h-5 text-primary-600" />
          {t.contributeTitle}
        </h2>
      </div>

      {success ? (
        <div className="bg-white p-6 rounded-2xl border border-green-200 text-center shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2.5" />
          <h3 className="text-base font-bold text-gray-900 mb-1">
            Asante Sana! Word Submitted
          </h3>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Your word <strong>"{text}"</strong> has been recorded and marked as <em>pending</em>. Once verified by a local veterinarian, it will rank in search results for all farmers!
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setText('');
                setVariant('');
              }}
              className="bg-primary-50 text-primary-800 text-xs font-bold px-4 py-2 rounded-xl"
            >
              Add Another Term
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('search')}
              className="bg-primary-600 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              Back to Search
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3.5">
          {/* Symptom Concept Selection */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Clinical Symptom Concept
            </label>
            <select
              value={symptomId}
              onChange={(e) => setSymptomId(parseInt(e.target.value, 10))}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900"
            >
              {symptomOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language Selection */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Kenyan Language / Indigenous Dialect
            </label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900"
            >
              {KENYAN_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name}) — {l.region}
                </option>
              ))}
            </select>
          </div>

          {/* Local Word */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Local Word in your Language *
            </label>
            <input
              type="text"
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Omwiko, Makamasi, Entumba..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Spelling Variant */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Alternative Spelling / Dialect Variant (Optional)
            </label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="e.g. Omwiko omorutu"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900"
            />
          </div>

          {/* Contributor Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Your Name or Farm (Optional)
            </label>
            <input
              type="text"
              value={contributor}
              onChange={(e) => setContributor(e.target.value)}
              placeholder="e.g. Mkulima Timo, Kisii South"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-medium text-gray-900"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-3 rounded-xl shadow-xs active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting word...' : 'Submit Local Word'}
          </button>
        </form>
      )}
    </div>
  );
};
