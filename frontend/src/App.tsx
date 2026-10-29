import React, { useState } from 'react';
import { SessionProvider, useSession } from './store/sessionContext';
import { Navigation, ScreenTab } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { PortalLayout } from './components/PortalLayout';
import { HomeScreen } from './screens/HomeScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { StrawScreen } from './screens/StrawScreen';
import { RationScreen } from './screens/RationScreen';
import { OutbreakMapScreen } from './screens/OutbreakMapScreen';
import { AddTermScreen } from './screens/AddTermScreen';
import { VerifyTermsScreen } from './screens/VerifyTermsScreen';
import { ReportCaseScreen } from './screens/ReportCaseScreen';
import { VetsDirectoryScreen } from './screens/VetsDirectoryScreen';
import { VetCopilotScreen } from './screens/VetCopilotScreen';
import { VetDictionaryScreen } from './screens/VetDictionaryScreen';
import { ShieldCheck, PhoneCall } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser } = useSession();
  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return currentUser ? (
          <DashboardScreen setCurrentTab={setCurrentTab} />
        ) : (
          <HomeScreen setCurrentTab={setCurrentTab} />
        );
      case 'search':
        return <SearchScreen setCurrentTab={setCurrentTab} />;
      case 'results':
        return <ResultsScreen setCurrentTab={setCurrentTab} />;
      case 'copilot':
        return <VetCopilotScreen setCurrentTab={setCurrentTab} />;
      case 'dictionary':
        return <VetDictionaryScreen setCurrentTab={setCurrentTab} />;
      case 'vets':
        return <VetsDirectoryScreen setCurrentTab={setCurrentTab} />;
      case 'straw':
        return <StrawScreen setCurrentTab={setCurrentTab} initialMode="quick" />;
      case 'ledger':
        return <StrawScreen setCurrentTab={setCurrentTab} initialMode="ledger" />;
      case 'ration':
        return <RationScreen />;
      case 'map':
        return <OutbreakMapScreen />;
      case 'contribute':
        return <AddTermScreen setCurrentTab={setCurrentTab} />;
      case 'verify':
        return <VerifyTermsScreen setCurrentTab={setCurrentTab} />;
      case 'report':
        return <ReportCaseScreen setCurrentTab={setCurrentTab} />;
      default:
        return currentUser ? (
          <DashboardScreen setCurrentTab={setCurrentTab} />
        ) : (
          <HomeScreen setCurrentTab={setCurrentTab} />
        );
    }
  };

  // If user is logged in, show the portal layout matching the reference screenshots
  if (currentUser) {
    return (
      <>
        <PortalLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
          {renderScreen()}
        </PortalLayout>
        <AuthModal />
      </>
    );
  }

  // Public Landing Page layout when not logged in
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col antialiased text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navigation currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        {renderScreen()}
      </main>

      {/* Slim, Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900">Kraalkit Kenya</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Livestock Health, Breeding & Nutrition</span>
          </div>

          <div className="flex items-center gap-4 font-semibold text-[11px]">
            <span className="flex items-center gap-1 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>KVB Certified Practice</span>
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>24/7 Hotline: 0800-720-021</span>
            </span>
          </div>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <MainApp />
    </SessionProvider>
  );
};

export default App;
