import React, { useState } from 'react';
import { useSession } from '../store/sessionContext';
import { UserRole } from '../types';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  LogOut,
  Sparkles,
  Tractor,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    currentUser,
    login,
    register,
    logout,
  } = useSession();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('FARMER');
  const [phone, setPhone] = useState('');
  const [county, setCounty] = useState('Kisii');
  const [farmSize, setFarmSize] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          name,
          role,
          phone: phone || undefined,
          county,
          farmSize: farmSize || undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const setDemoFarmer = () => {
    setEmail('farmer.timo@gmail.com');
    setPassword('secretpassword');
    setMode('login');
  };

  const setDemoVet = () => {
    setEmail('vet@livestock.local');
    setPassword('vet123456');
    setMode('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* Profile Overview */
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-extrabold text-2xl mx-auto mb-3 shadow-inner">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
              {currentUser.name}
            </h3>
            <p className="text-xs text-gray-500 font-medium mb-3">
              {currentUser.email}
            </p>

            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-primary-50 text-primary-800 border border-primary-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {currentUser.role}
              </span>
              {currentUser.county && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                  {currentUser.county} County
                </span>
              )}
            </div>

            {currentUser.farmSize && (
              <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mb-5">
                Farm scale: <strong>{currentUser.farmSize}</strong>
              </p>
            )}

            <button
              type="button"
              onClick={logout}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold py-3 rounded-xl border border-red-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          /* Sign In / Register Form */
          <div className="p-6">
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900">
                {mode === 'login' ? 'Welcome to Mifugo Health' : 'Create Your Account'}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {mode === 'login'
                  ? 'Access your saved farm records, rations & vet reports'
                  : 'Join Kenya’s community livestock health network'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Omondi"
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      I am a: *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      {[
                        { key: 'FARMER' as UserRole, label: 'Farmer 🌾' },
                        { key: 'VET' as UserRole, label: 'Vet 🩺' },
                        { key: 'CONTRIBUTOR' as UserRole, label: 'Contributor ✍️' },
                      ].map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setRole(r.key)}
                          className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                            role === r.key
                              ? 'border-primary-600 bg-primary-50 text-primary-900 ring-2 ring-primary-200'
                              : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      County
                    </label>
                    <select
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900"
                    >
                      <option value="Kisii">Kisii</option>
                      <option value="Nyamira">Nyamira</option>
                      <option value="Migori">Migori</option>
                      <option value="Homa Bay">Homa Bay</option>
                      <option value="Kericho">Kericho</option>
                      <option value="Bomet">Bomet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+254 7..."
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-3 rounded-xl shadow-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In to Account'
                  : 'Complete Registration'}
              </button>
            </form>

            {/* Quick Demo Pre-fill helpers */}
            {mode === 'login' && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                <span>Demo Accounts:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={setDemoFarmer}
                    className="text-primary-700 font-bold hover:underline"
                  >
                    Farmer
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={setDemoVet}
                    className="text-blue-700 font-bold hover:underline"
                  >
                    Vet
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
