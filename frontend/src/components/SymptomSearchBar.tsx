import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { searchSymptoms, fetchLanguages } from '../lib/api';
import { Language, SymptomSearchResult } from '../types';
import { useSession } from '../store/sessionContext';
import {
  Search,
  X,
  Loader2,
  Plus,
  Check,
  Globe,
  Clock,
  Sparkles,
  ClipboardPaste,
} from 'lucide-react';

interface SymptomSearchBarProps {
  speciesId: number;
  onSelectSymptom: (symptom: SymptomSearchResult) => void;
  selectedSymptomIds: number[];
}

export const SymptomSearchBar: React.FC<SymptomSearchBarProps> = ({
  speciesId,
  onSelectSymptom,
  selectedSymptomIds,
}) => {
  const { t, searchLanguage, setSearchLanguage } = useSession();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SymptomSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsingMulti, setParsingMulti] = useState(false);
  const [placeholderNotice, setPlaceholderNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load languages for language picker
  useEffect(() => {
    let mounted = true;
    fetchLanguages()
      .then((langs) => {
        if (mounted && langs.length > 0) {
          setLanguages(langs);
        }
      })
      .catch((err) => console.error('Failed to load languages for search', err));
    return () => {
      mounted = false;
    };
  }, []);

  // 300ms debounce on typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Execute search when debouncedQuery changes
  useEffect(() => {
    let active = true;

    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchSymptoms(debouncedQuery, speciesId, searchLanguage)
      .then((results) => {
        if (active) {
          setSuggestions(results);
          setLoading(false);
          setIsOpen(true);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Search error:', err);
          setSuggestions([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, speciesId, searchLanguage]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selection
  const handlePick = (item: SymptomSearchResult) => {
    onSelectSymptom(item);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle keyboard: comma, "na", Enter
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handlePick(suggestions[0]);
      } else if (query.includes(',') || query.toLowerCase().includes(' na ')) {
        handleMultiParse(query);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Check for comma or " na "
    if (val.endsWith(',') || val.toLowerCase().endsWith(' na ')) {
      const term = val.replace(/,\s*$|\s+na\s*$/i, '').trim();
      if (term.length >= 2) {
        handleMultiParse(term);
        setQuery('');
        return;
      }
    }
    setQuery(val);
  };

  // Multi-term parser for comma, "na", or paste box
  const handleMultiParse = async (raw: string) => {
    if (!raw.trim()) return;
    setParsingMulti(true);
    const subTerms = raw
      .split(/[,;\n]|(?:\s+na\s+)|(?:\s+and\s+)/i)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);

    for (const term of subTerms) {
      try {
        const found = await searchSymptoms(term, speciesId, searchLanguage);
        if (found.length > 0) {
          onSelectSymptom(found[0]);
        }
      } catch (err) {
        console.error('Multi parse subterm error:', err);
      }
    }
    setParsingMulti(false);
    setQuery('');
    setPasteText('');
    setShowPasteBox(false);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {/* Search Input Bar + Language Picker Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-700" /> : <Search className="w-5 h-5 text-slate-400" />}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (debouncedQuery.length >= 2) setIsOpen(true);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs min-h-[44px]"
            aria-label="Search symptoms"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 min-h-[44px] min-w-[44px] justify-center"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Clean Language Picker (Reads from languages list, no redundant label) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative flex items-center">
            <Globe className="w-4 h-4 text-emerald-700 absolute left-3 pointer-events-none" />
            <select
              value={searchLanguage}
              onChange={(e) => setSearchLanguage(e.target.value)}
              className="pl-8 pr-7 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs min-h-[44px]"
              aria-label="Search language"
            >
              {languages.length > 0 ? (
                languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName || l.name} ({l.name})
                  </option>
                ))
              ) : (
                <>
                  <option value="sw">Kiswahili</option>
                  <option value="en">English</option>
                </>
              )}
            </select>
          </div>

          {/* Paste Multiple Toggle Button */}
          <button
            type="button"
            onClick={() => setShowPasteBox(!showPasteBox)}
            className={`px-3 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all min-h-[44px] ${
              showPasteBox
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Paste multiple symptoms at once"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span className="hidden sm:inline">{t.pasteMultipleBtn}</span>
          </button>
        </div>
      </div>

      {/* Paste Multiple Input Tray */}
      {showPasteBox && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>{t.pasteMultipleBtn}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowPasteBox(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={2}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t.pasteMultiplePlaceholder}
            className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Separate with commas (e.g. "homa, kukohoa, kuharisha") or "na"
            </p>
            <button
              type="button"
              disabled={parsingMulti || !pasteText.trim()}
              onClick={() => handleMultiParse(pasteText)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold shadow-2xs transition-all min-h-[44px] flex items-center gap-2"
            >
              {parsingMulti ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add symptoms</span>
            </button>
          </div>
        </div>
      )}

      {/* Suggestion Dropdown */}
      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-slate-100">
          {loading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>Searching symptoms...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div>
              <div className="px-3.5 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide">
                Suggestions matching "{debouncedQuery}"
              </div>
              {suggestions.map((item) => {
                const isSelected = selectedSymptomIds.includes(item.symptomId);
                return (
                  <button
                    key={item.symptomId}
                    type="button"
                    onClick={() => handlePick(item)}
                    className="w-full px-4 py-3 text-left hover:bg-emerald-50/70 transition-colors flex items-center justify-between gap-3 min-h-[44px]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-slate-900 truncate">
                          {item.matchedTerm}
                        </span>
                        {item.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>{t.notYetConfirmed}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        English: <span className="font-medium text-slate-700">{item.englishName}</span>
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-500 flex items-center justify-center transition-colors">
                          <Plus className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-center space-y-2.5">
              <p className="text-sm font-semibold text-slate-700">
                {t.noMatchingSymptoms}
              </p>
              <p className="text-xs text-slate-500">
                No verified symptom matched "{debouncedQuery}". You can suggest this local term to the dictionary.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPlaceholderNotice(`Word suggestion for "${debouncedQuery}" recorded for the symptom dictionary.`);
                    setTimeout(() => setPlaceholderNotice(null), 4000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors min-h-[44px]"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>{t.addThisWordPlaceholder}</span>
                </button>
              </div>

              {placeholderNotice && (
                <div className="p-2 text-xs font-semibold text-emerald-900 bg-emerald-100 rounded-lg animate-fadeIn">
                  {placeholderNotice}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
