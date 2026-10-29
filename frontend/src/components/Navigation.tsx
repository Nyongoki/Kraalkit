import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import {
  Home,
  Search,
  Wheat,
  Map,
  ShieldCheck,
  Menu,
  X,
  Dna,
  UserPlus,
  LogIn,
  ClipboardList,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export type ScreenTab =
  | 'home'
  | 'search'
  | 'results'
  | 'copilot'
  | 'dictionary'
  | 'vets'
  | 'straw'
  | 'ledger'
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
    selectedSymptoms,
    currentUser,
    openAuthModal,
  } = useSession();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Short, punchy links to prevent navigation bar overload
  const navLinks = [
    { id: 'home' as ScreenTab, label: 'Home', icon: Home, badge: null },
    { id: 'straw' as ScreenTab, label: 'Verify Straw', icon: Dna, badge: null },
    ...(currentUser ? [{ id: 'ledger' as ScreenTab, label: 'Ledger', icon: ClipboardList, badge: null }] : []),
    {
      id: 'search' as ScreenTab,
      label: 'Triage',
      icon: Search,
      badge: selectedSymptoms.length > 0 ? selectedSymptoms.length : null,
    },
    {
      id: 'copilot' as ScreenTab,
      label: 'Vet Co-Pilot',
      icon: Sparkles,
      badge: currentUser ? 'AI' : '🔒',
    },
    {
      id: 'dictionary' as ScreenTab,
      label: 'Dictionary',
      icon: BookOpen,
      badge: 'Vets',
    },
    { id: 'ration' as ScreenTab, label: 'Feeds', icon: Wheat, badge: null },
    { id: 'map' as ScreenTab, label: 'Alerts', icon: Map, badge: null },
    { id: 'vets' as ScreenTab, label: 'Vets', icon: ShieldCheck, badge: null },
  ];

  const handleNavClick = (tab: ScreenTab) => {
    // Vet Co-Pilot strictly requires an authenticated account
    if (tab === 'copilot' && !currentUser) {
      openAuthModal('login');
      setMobileMenuOpen(false);
      return;
    }

    // Triage, Vets, or Ledger strictly requires creating/having a farmer account
    if ((tab === 'search' || tab === 'results' || tab === 'vets' || tab === 'ledger') && !currentUser) {
      openAuthModal('register');
      setMobileMenuOpen(false);
      return;
    }
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Slim, Compact Navigation Bar (h-14 / 56px) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-5">
          <div className="flex items-center justify-between h-14">
            {/* 1. Compact Brand Logo */}
            <div
              onClick={() => handleNavClick('home')}
              className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-sm font-black shadow-2xs">
                🐄
              </div>
              <span className="text-base font-black text-slate-900 tracking-tight leading-none">
                Kraal<span className="text-emerald-600">kit</span>
              </span>
              <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                KE
              </span>
            </div>

            {/* 2. Minimized Desktop Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item, idx) => {
                const Icon = item.icon;
                const isActive =
                  currentTab === item.id ||
                  (item.id === 'search' && currentTab === 'results');

                return (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all relative ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-950 font-black shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge !== null && (
                      <span className="bg-emerald-600 text-white text-[9px] font-black rounded-full px-1.5 py-0.1 ml-0.5">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 3. Utility Controls & Prominent Authentication */}
            <div className="flex items-center gap-1.5">
              {/* Account Controls */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl px-2.5 py-1 text-xs font-black transition-all"
                  title="View Account"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black text-[10px] flex items-center justify-center">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <span className="hidden sm:inline max-w-[75px] truncate">
                    {currentUser.name ? currentUser.name.split(' ')[0] : 'Profile'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-2xs active:scale-95 transition-all flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden py-2 border-t border-slate-100 space-y-1 animate-fadeIn">
              {!currentUser && (
                <div className="p-2 mb-1.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-emerald-950 block">Save Your Farm Records</span>
                    <span className="text-[10px] text-emerald-700">Phone or email account</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('register');
                    }}
                    className="bg-emerald-700 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-2xs"
                  >
                    Create Account
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1">
                {navLinks.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive =
                    currentTab === item.id ||
                    (item.id === 'search' && currentTab === 'results');

                  return (
                    <button
                      key={`m-${item.id}-${idx}`}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-950 font-black'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{item.label}</span>
                      {item.badge !== null && (
                        <span className="bg-emerald-600 text-white text-[9px] font-black rounded-full px-1.5 py-0.1 ml-auto">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

    </>
  );
};
