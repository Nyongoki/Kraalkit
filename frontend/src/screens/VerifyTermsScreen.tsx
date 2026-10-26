import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { confirmTerm } from '../lib/api';
import { ScreenTab } from '../components/Navigation';
import {
  ShieldCheck,
  Lock,
  LogOut,
  Check,
  X,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface VerifyTermsScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const VerifyTermsScreen: React.FC<VerifyTermsScreenProps> = () => {
  const { t, authToken, currentUser, login, logout } = useSession();

  const [email, setEmail] = useState('vet@livestock.local');
  const [password, setPassword] = useState('vet123456');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Queue of terms awaiting verification
  const [pendingQueue, setPendingQueue] = useState([
    {
      id: 54,
      text: 'Omwiko omorutu',
      symptom: 'Fever (High Temperature)',
      language: 'Ekegusii (guz)',
      contributor: 'Farmer John, Kisii',
      createdAt: 'Today',
      confirmed: false,
    },
    {
      id: 55,
      text: 'Kuvimba kwa matiti',
      symptom: 'Mastitis / Swollen Udder',
      language: 'Kiswahili (sw)',
      contributor: 'Mifugo Bora Co-op',
      createdAt: 'Yesterday',
      confirmed: false,
    },
    {
      id: 56,
      text: 'Amasasi amanyinyi',
      symptom: 'Nasal Discharge (Excessive)',
      language: 'Ekegusii (guz)',
      contributor: 'Community Elder, Nyamira',
      createdAt: '2 days ago',
      confirmed: false,
    },
  ]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleConfirm = async (termId: number) => {
    if (!authToken) return;
    try {
      await confirmTerm(termId, authToken);
      setPendingQueue((prev) =>
        prev.map((item) => (item.id === termId ? { ...item, confirmed: true } : item))
      );
    } catch (err: any) {
      alert(`Could not confirm term: ${err.message}`);
    }
  };

  const handleReject = (termId: number) => {
    setPendingQueue((prev) => prev.filter((item) => item.id !== termId));
  };

  const isVet = currentUser && (currentUser.role === 'VET' || currentUser.role === 'ADMIN');

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">
              {t.vetPortal}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Review and certify community-submitted local symptom words for live search ranking
            </p>
          </div>
        </div>

        {currentUser && (
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2.5 rounded-xl border border-gray-200 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {!isVet ? (
        /* Login Form */
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xs max-w-md mx-auto">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900">
                Veterinary Officer Verification Login
              </h3>
              <p className="text-xs text-gray-400">
                Demo practitioner account pre-filled
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold py-3.5 rounded-xl shadow-xs active:scale-95 transition-all"
            >
              {loggingIn ? 'Authenticating...' : t.login}
            </button>
          </form>
        </div>
      ) : (
        /* Authenticated Verifier Queue */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-blue-700" />
              <div>
                <span className="text-sm font-black text-blue-950 block">
                  Logged in: {currentUser?.name}
                </span>
                <span className="text-xs text-blue-700">
                  Certified Veterinary Practitioner • {currentUser?.county || 'Kenya'}
                </span>
              </div>
            </div>
            <span className="text-xs font-black bg-blue-200 text-blue-800 px-3 py-1 rounded-full">
              Vet Verifier
            </span>
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">
              {t.pendingTermsQueue} ({pendingQueue.filter((p) => !p.confirmed).length} pending)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingQueue.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                  item.confirmed ? 'border-green-300 bg-green-50/30' : 'border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-lg font-black text-gray-900 block leading-tight">
                        "{item.text}"
                      </span>
                      <span className="text-xs text-primary-700 font-extrabold mt-0.5 block">
                        → Clinical Concept: {item.symptom}
                      </span>
                    </div>
                    <span className="text-[11px] font-black bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full flex-shrink-0">
                      {item.language}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 mb-4">
                    Contributed by: <strong>{item.contributor}</strong> • {item.createdAt}
                  </p>
                </div>

                {item.confirmed ? (
                  <div className="flex items-center gap-2 text-green-800 text-xs font-black bg-green-100 p-3 rounded-2xl">
                    <Check className="w-4 h-4 text-green-700 stroke-[3]" />
                    <span>Verified & Live in Global Search</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleConfirm(item.id)}
                      className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      {t.approve}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(item.id)}
                      className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-700 text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all"
                    >
                      <X className="w-4 h-4" />
                      {t.reject}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
