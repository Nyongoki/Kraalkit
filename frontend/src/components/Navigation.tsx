import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { KENYAN_LANGUAGES, InterfaceLang } from '../lib/i18n';
import {
  Home,
  Search,
  Wheat,
  Map,
  ShieldCheck,
  Globe,
  MapPin,
  User,
  Menu,
  X,
  BookOpen,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';

export type ScreenTab =
  | 'home'
  | 'search'
  | 'results'
  | 'ration'
  | 'map'
  | 'contribute'
  | 'verify'
  | 'report';

interface NavigationProps {
  currentTab: ScreenTab;
  setCurrentTab: (tab: ScreenTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, setCurrentTab }) => {
  const {
    t,
    interfaceLang,
    setInterfaceLang,
    searchLanguage,
    setSearchLanguage,
    selectedSpecies,
    selectedSymptoms,
    location,
    useCurrentGps,
    currentUser,
    setAuthModalOpen,
  } = useSession();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);

  const navLinks = [
    { id: 'home' as ScreenTab, label: 'Home', icon: Home },
    {
      id: 'search' as ScreenTab,
      label: t.checkSymptoms,
      icon: Search,
      badge: selectedSymptoms.length > 0 ? selectedSymptoms.length : null,
    },
    { id: 'ration' as ScreenTab, label: t.feedRation, icon: Wheat },
    { id: 'map' as ScreenTab, label: t.outbreakMap, icon: Map },
    { id: 'contribute' as ScreenTab, label: 'Add Term', icon: BookOpen },
    { id: 'verify' as ScreenTab, label: 'Vet Portal', icon: ShieldCheck },
  ];

  const getSpeciesEmoji = (slug?: string) => {
    switch (slug) {
      case 'dairy-cattle':
        return '🐄';
      case 'goats':
        return '🐐';
      case 'sheep':
        return '🐑';
      case 'poultry':
        return '🐔';
      default:
        return '🐾';
    }
  };

  const handleNavClick = (tab: ScreenTab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const currentLangMeta = KENYAN_LANGUAGES.find((l) => l.code === interfaceLang) || KENYAN_LANGUAGES[0];

  const handleSelectLanguage = (code: string) => {
    setInterfaceLang(code as InterfaceLang);
    setSearchLanguage(code);
    setLangModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* 1. Left: Brand Logo & Title */}
            <div
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-700 via-green-600 to-teal-500 flex items-center justify-center text-white shadow-md text-xl group-hover:shadow-emerald-200 transition-all">
                🐄
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-none">
                    Mifugo<span className="text-emerald-600">Health</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                    Kenya
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block mt-0.5">
                  National Epizootic Intelligence & Veterinary Triage
                </p>
              </div>
            </div>

            {/* 2. Center: Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentTab === item.id ||
                  (item.id === 'search' && currentTab === 'results');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                      isActive
                        ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.badge !== null && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black rounded-full px-1.5 py-0.2 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 3. Right: Utility Controls & Kenya Multilingual Selector */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Active Species Indicator */}
              {selectedSpecies && (
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
                  title="Switch target livestock species"
                >
                  <span className="text-sm">{getSpeciesEmoji(selectedSpecies.slug)}</span>
                  <span>{selectedSpecies.name}</span>
                </button>
              )}

              {/* GPS Location Pill */}
              <button
                type="button"
                onClick={useCurrentGps}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                  location.isGps
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title="Click to detect current GPS location"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span className="truncate max-w-[90px]">{location.county}</span>
              </button>

              {/* 13 Kenyan Languages Switcher Button */}
              <button
                type="button"
                onClick={() => setLangModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200 active:scale-95 transition-all shadow-2xs"
                title="Select Kenyan Dialect / Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-extrabold">{currentLangMeta.nativeName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Auth Profile / Sign In */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-xl p-1 sm:px-3 sm:py-1.5 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="text-xs font-black block leading-tight">
                      {currentUser.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block leading-tight">
                      {currentUser.role}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{t.login}</span>
                </button>
              )}

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-3 border-t border-slate-100 space-y-1 animate-fadeIn">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentTab === item.id ||
                  (item.id === 'search' && currentTab === 'results');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-emerald-600" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Kenyan Languages Selector Modal */}
      {langModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-600" />
                  <span>Choose Kenyan Language / Dialect</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select any of the 13 official & indigenous languages for symptom search and triage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLangModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-2.5 flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {KENYAN_LANGUAGES.map((lang) => {
                  const isSelected = interfaceLang === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-200 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {lang.nativeName}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            ({lang.name})
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                          {lang.region}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {lang.counties}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>208+ indigenous terms verified across all Kenyan pastoralist & agrarian zones</span>
              </div>
              <button
                type="button"
                onClick={() => setLangModalOpen(false)}
                className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
