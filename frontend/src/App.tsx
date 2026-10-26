import React, { useState } from 'react';
import { SessionProvider } from './store/sessionContext';
import { Navigation, ScreenTab } from './components/Navigation';
import { AuthModal } from './components/AuthModal';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { RationScreen } from './screens/RationScreen';
import { OutbreakMapScreen } from './screens/OutbreakMapScreen';
import { AddTermScreen } from './screens/AddTermScreen';
import { VerifyTermsScreen } from './screens/VerifyTermsScreen';
import { ReportCaseScreen } from './screens/ReportCaseScreen';
import { ShieldCheck, HeartHandshake, PhoneCall } from 'lucide-react';

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('home');

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return <HomeScreen setCurrentTab={setCurrentTab} />;
      case 'search':
        return <SearchScreen setCurrentTab={setCurrentTab} />;
      case 'results':
        return <ResultsScreen setCurrentTab={setCurrentTab} />;
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
        return <HomeScreen setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col antialiased text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navigation currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {renderScreen()}
      </main>

      {/* Professional Agricultural Portal Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🐄
            </div>
            <div>
              <p className="font-black text-slate-900">
                Mifugo Health Kenya • National Epizootic Intelligence Platform
              </p>
              <p className="text-[11px] text-slate-400">
                Veterinary differential matching & nutrition balancers across 13 Kenyan indigenous languages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>KVB Certified Practice Support</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>Emergency 0800-720-021</span>
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
