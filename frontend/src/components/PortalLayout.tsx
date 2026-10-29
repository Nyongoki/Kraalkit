import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { ScreenTab } from './Navigation';
import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  Home,
  Dna,
  ClipboardList,
  Search,
  Wheat,
  Map,
  ShieldCheck,
  FileText,
  User,
  Shield,
  Layers,
  Sparkles,
  BookOpen,
  Check,
  X,
} from 'lucide-react';

interface PortalLayoutProps {
  currentTab: ScreenTab;
  setCurrentTab: (tab: ScreenTab) => void;
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children,
}) => {
  const {
    currentUser,
    logout,
    selectedSymptoms,
  } = useSession();

  // Sidebar expanded vs collapsed rail state
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isVet = currentUser?.role === 'VET';

  const navLinks = isVet
    ? [
        { id: 'home' as ScreenTab, label: 'Dashboard', icon: Home, badge: null },
        {
          id: 'dictionary' as ScreenTab,
          label: 'Dictionary Contribution',
          icon: BookOpen,
          badge: 'KVB Hub',
        },
        {
          id: 'search' as ScreenTab,
          label: 'Clinical Triage',
          icon: Search,
          badge: selectedSymptoms.length > 0 ? selectedSymptoms.length : null,
        },
        {
          id: 'copilot' as ScreenTab,
          label: 'Vet Co-Pilot',
          icon: Sparkles,
          badge: 'AI',
        },
        { id: 'map' as ScreenTab, label: 'Outbreak Map', icon: Map, badge: 'Alerts' },
        { id: 'report' as ScreenTab, label: 'Case Reports', icon: FileText, badge: null },
        { id: 'straw' as ScreenTab, label: 'Verify Straw', icon: Dna, badge: null },
        { id: 'ledger' as ScreenTab, label: 'Breeding Records', icon: ClipboardList, badge: null },
        { id: 'vets' as ScreenTab, label: 'Colleagues & SCVO', icon: ShieldCheck, badge: null },
      ]
    : [
        { id: 'home' as ScreenTab, label: 'Dashboard', icon: Home, badge: null },
        { id: 'straw' as ScreenTab, label: 'Verify Straw', icon: Dna, badge: null },
        { id: 'ledger' as ScreenTab, label: 'Breeding Ledger', icon: ClipboardList, badge: null },
        {
          id: 'search' as ScreenTab,
          label: 'Symptom Triage',
          icon: Search,
          badge: selectedSymptoms.length > 0 ? selectedSymptoms.length : null,
        },
        {
          id: 'copilot' as ScreenTab,
          label: 'Vet Co-Pilot',
          icon: Sparkles,
          badge: 'AI',
        },
        {
          id: 'dictionary' as ScreenTab,
          label: 'Native Dictionary',
          icon: BookOpen,
          badge: 'Vets',
        },
        { id: 'ration' as ScreenTab, label: 'Feed Balancer', icon: Wheat, badge: null },
        { id: 'map' as ScreenTab, label: 'Outbreak Map', icon: Map, badge: null },
        { id: 'vets' as ScreenTab, label: 'Vets Directory', icon: ShieldCheck, badge: null },
        { id: 'report' as ScreenTab, label: 'Case Reports', icon: FileText, badge: null },
      ];

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Farmer';

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col antialiased text-slate-900">
      {/* 1. TOP HEADER (Matching reference images) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs h-14">
        <div className="flex items-center justify-between h-full px-3 sm:px-5">
          {/* Left: Brand Logo + Hamburger Toggle ≡ */}
          <div className="flex items-center gap-3">
            {/* Desktop Hamburger Toggle ≡ (Toggles sidebar between expanded & collapsed rail) */}
            <button
              type="button"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="hidden md:flex p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title={sidebarExpanded ? 'Collapse menu' : 'Expand menu'}
            >
              <Menu className="w-5 h-5 text-emerald-800" />
            </button>

            {/* Mobile Sidebar Toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5 text-emerald-800" />
            </button>

            {/* Brand Logo & Name */}
            <div
              onClick={() => setCurrentTab('home')}
              className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-sm font-black shadow-2xs">
                🐄
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black text-slate-900 tracking-tight leading-none">
                  Kraal<span className="text-emerald-600">kit</span>
                </span>
                {isVet ? (
                  <span className="hidden sm:inline text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                    Veterinary Portal • KVB
                  </span>
                ) : (
                  <span className="hidden sm:inline text-xs font-bold text-slate-500">
                    Farm Portal
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Notification Bell & User Greeting Pill */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Notification Bell (No red 0 badge when zero notifications) */}
            <button
              type="button"
              onClick={() => setCurrentTab('map')}
              className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Active Alerts"
            >
              <Bell className="w-4 h-4 text-emerald-800" />
            </button>

            {/* User Profile Pill ("Hi, Timothy ▾" matching reference image) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs font-black text-slate-800 transition-all active:scale-95"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white font-black text-xs flex items-center justify-center">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '👤'}
                </div>
                <span className="max-w-[100px] truncate">
                  Hi, {firstName}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn text-xs">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="font-black text-slate-900 truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {currentUser?.phone || currentUser?.email}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                      {currentUser?.role || 'Farmer'} • {currentUser?.county || 'Kenya'}
                    </span>
                  </div>

                  <div className="p-1">
                    {isVet ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('dictionary');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-black flex items-center justify-between mb-1"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Dictionary Contribution</span>
                          </div>
                          <span className="text-[9px] font-black bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                            KVB
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('search');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                        >
                          <Search className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Clinical Triage</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('copilot');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Vet Co-Pilot (AI)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('map');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                        >
                          <Map className="w-3.5 h-3.5 text-purple-600" />
                          <span>Outbreak Surveillance</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('straw');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                          <span>My Herd Ledger</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentTab('search');
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-2"
                        >
                          <Search className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Clinical Triage</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-2 mt-1 border-t border-slate-100"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. BODY WITH COLLAPSIBLE SIDEBAR & MAIN CONTENT */}
      <div className="flex-1 flex">
        {/* DESKTOP SIDEBAR (Collapsible between ~220px expanded & ~64px rail) */}
        <aside
          className={`hidden md:flex flex-col border-r border-slate-200/90 bg-white transition-all duration-200 ${
            sidebarExpanded ? 'w-56' : 'w-16'
          }`}
        >
          {/* Navigation Links */}
          <div className="p-2 space-y-1 flex-1 overflow-y-auto">
            {navLinks.map((item, idx) => {
              const Icon = item.icon;
              const isActive =
                (item.id === 'home' && currentTab === 'home') ||
                (item.id === 'straw' && currentTab === 'straw') ||
                (item.id === 'ledger' && currentTab === 'ledger') ||
                (item.id === 'search' && (currentTab === 'search' || currentTab === 'results')) ||
                (item.id === 'copilot' && currentTab === 'copilot') ||
                (item.id === 'dictionary' && currentTab === 'dictionary') ||
                (item.id === 'ration' && currentTab === 'ration') ||
                (item.id === 'map' && currentTab === 'map') ||
                (item.id === 'vets' && currentTab === 'vets') ||
                (item.id === 'report' && currentTab === 'report');

              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  title={!sidebarExpanded ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                    isActive
                      ? 'bg-emerald-700 text-white font-black shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  } ${!sidebarExpanded ? 'justify-center px-2' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  />
                  {sidebarExpanded && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {sidebarExpanded && item.badge !== null && (
                    <span className="ml-auto bg-emerald-600 text-white text-[9px] font-black rounded-full px-1.5 py-0.1">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info & Logout */}
          <div className="p-2 border-t border-slate-100 space-y-1">
            {sidebarExpanded && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-0.5">
                <span className="font-black text-slate-800 block truncate">
                  {currentUser?.county || 'Kenya'} Farm Node
                </span>
                <span className="text-emerald-700 font-bold block flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Cloud Backup Active</span>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={logout}
              title={!sidebarExpanded ? 'Sign Out' : undefined}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors ${
                !sidebarExpanded ? 'justify-center px-2' : ''
              }`}
            >
              <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-600" />
              {sidebarExpanded && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWER */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative w-64 bg-white h-full flex flex-col p-3 shadow-2xl z-10 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🐄</span>
                  <span className="font-black text-sm text-slate-900">Kraalkit Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto">
                {navLinks.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`m-${item.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        setCurrentTab(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Icon className="w-4 h-4 text-emerald-700" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 p-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
