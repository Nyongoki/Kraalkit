import React, { useState, useEffect } from 'react';
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
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Shield,
  Stethoscope,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    authModalTab,
    currentUser,
    login,
    register,
    loginPhone,
    registerPhone,
    requestCode,
    logout,
  } = useSession();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [demoCodeNotice, setDemoCodeNotice] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('FARMER');
  const [county, setCounty] = useState('Kiambu');
  const [farmSize, setFarmSize] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authModalTab) {
      setMode(authModalTab);
    }
  }, [authModalTab, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const kenyanCounties = [
    'Kiambu', 'Nyeri', 'Murang\'a', 'Kirinyaga', 'Nyandarua',
    'Nakuru', 'Uasin Gishu', 'Nandi', 'Kericho', 'Bomet',
    'Kisii', 'Nyamira', 'Migori', 'Homa Bay', 'Kisumu', 'Kakamega',
    'Bungoma', 'Machakos', 'Makueni', 'Meru', 'Kajiado', 'Narok',
    'Garissa', 'Turkana', 'Nairobi'
  ];

  // Request SMS Code for Phone Registration
  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your mobile phone number first');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const code = await requestCode(phoneNumber.trim());
      setCodeSent(true);
      if (code) {
        setDemoCodeNotice(code);
        setOtpCode(code); // Pre-fill for instant demo frictionlessness
      }
    } catch (err: any) {
      setError(err.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (method === 'phone') {
        if (mode === 'login') {
          if (!phoneNumber.trim() || !pin.trim()) {
            setError('Please enter your mobile phone number and 4-digit PIN');
            setLoading(false);
            return;
          }
          await loginPhone(phoneNumber.trim(), pin.trim());
        } else {
          // Registration validation with second digital PIN confirmation
          if (!phoneNumber.trim()) {
            setError('Please enter your mobile phone number');
            setLoading(false);
            return;
          }
          if (!/^\d{4}$/.test(pin.trim())) {
            setError('Digital Security PIN must be exactly 4 numeric digits (e.g. 1234)');
            setLoading(false);
            return;
          }
          if (pin.trim() !== confirmPin.trim()) {
            setError('Digital Security PIN confirmation failed: PINs do not match');
            setLoading(false);
            return;
          }
          if (!codeSent) {
            await handleSendCode();
            setLoading(false);
            return;
          }
          await registerPhone({
            phone: phoneNumber.trim(),
            code: otpCode.trim() || '123456',
            pin: pin.trim(),
            name: name.trim() || 'Kenyan Livestock Farmer',
            county,
          });
        }
      } else {
        // Email method
        if (mode === 'login') {
          await login(email.trim(), password);
        } else {
          if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
          }
          if (password !== confirmPassword) {
            setError('Password confirmation failed: Passwords do not match');
            setLoading(false);
            return;
          }
          await register({
            email: email.trim(),
            password,
            name: name.trim(),
            role,
            phone: phoneNumber.trim() || undefined,
            county,
            farmSize: farmSize.trim() || undefined,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo credentials
  const fillDemoFarmer = () => {
    setMethod('phone');
    setPhoneNumber('0712345678');
    setPin('1234');
    setMode('login');
    setError(null);
  };

  const fillDemoVet = () => {
    setMethod('email');
    setEmail('vet@livestock.local');
    setPassword('vet123456');
    setMode('login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full overflow-hidden relative">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* ==========================================
             SIGNED-IN PROFILE OVERVIEW
             ========================================== */
          <div className="p-6 sm:p-7 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-2xl mx-auto shadow-inner">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">
                {currentUser.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {currentUser.phone || currentUser.email}
              </p>
              <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-black border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Account • {currentUser.role}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">County Location:</span>
                <span className="font-bold text-slate-900">{currentUser.county || 'Kenya'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account ID:</span>
                <span className="font-mono font-bold text-slate-700">#{currentUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data Storage:</span>
                <span className="font-bold text-emerald-700">Encrypted Cloud Sync Active</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors"
              >
                Continue to App
              </button>
              <button
                type="button"
                onClick={logout}
                className="w-full text-xs font-bold text-rose-600 hover:bg-rose-50 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* ==========================================
             AUTHENTICATION FORM (CREATE / SIGN IN)
             ========================================== */
          <div className="p-6 sm:p-7 space-y-5">
            {/* Header Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 mb-2">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secure Livestock Cloud Account</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {mode === 'register' ? 'Create Your Account' : 'Sign In to Your Account'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {mode === 'register'
                  ? 'Save your cow records, semen straws, ration plans & outbreak reports'
                  : 'Access your saved farm records, verified straws & health reports'}
              </p>
            </div>

            {/* Mode Toggle (Register vs Login) */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Method Toggle (Phone / PIN vs Email) */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold pb-1">
              <span className="text-slate-400">Sign in with:</span>
              <button
                type="button"
                onClick={() => setMethod('phone')}
                className={`px-3 py-1 rounded-xl border transition-all flex items-center gap-1.5 ${
                  method === 'phone'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mobile Phone (Fastest)</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`px-3 py-1 rounded-xl border transition-all flex items-center gap-1.5 ${
                  method === 'email'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-slate-600" />
                <span>Email</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* --- PHONE METHOD --- */}
              {method === 'phone' && (
                <>
                  {mode === 'register' && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Kiprotich Chemutai"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      M-Pesa / Mobile Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0712 345 678"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className={mode === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : ''}>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {mode === 'register' ? 'Create 4-Digit Security PIN *' : '4-Digit Security PIN *'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-4 h-4 text-emerald-600" />
                        </div>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 1234"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    {mode === 'register' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 block">
                            Confirm Security PIN *
                          </label>
                          {confirmPin && (
                            <span
                              className={`text-[10px] font-black ${
                                pin === confirmPin ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {pin === confirmPin ? '✓ Matched' : 'Differs'}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </div>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            required
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="Re-enter PIN"
                            className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-black tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white ${
                              confirmPin && pin !== confirmPin ? 'border-rose-400 ring-1 ring-rose-200' : 'border-slate-200'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {mode === 'register' && (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          County Location
                        </label>
                        <select
                          value={county}
                          onChange={(e) => setCounty(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                        >
                          {kenyanCounties.map((c) => (
                            <option key={c} value={c}>
                              {c} County
                            </option>
                          ))}
                        </select>
                      </div>

                      {codeSent && (
                        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-2xl space-y-2 animate-fadeIn">
                          <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                            <span>SMS Verification Code:</span>
                            {demoCodeNotice && (
                              <span className="text-[11px] bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-md font-mono">
                                Demo OTP: {demoCodeNotice}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Enter 6-digit code"
                            className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-center text-sm font-black tracking-widest text-slate-900"
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* --- EMAIL METHOD --- */}
              {method === 'email' && (
                <>
                  {mode === 'register' && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Jane Mwangi"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div className={mode === 'register' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                    {mode === 'register' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 block">
                            Confirm Password *
                          </label>
                          {confirmPassword && (
                            <span
                              className={`text-[10px] font-black ${
                                password === confirmPassword ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {password === confirmPassword ? '✓ Matched' : 'Differs'}
                            </span>
                          )}
                        </div>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 ${
                            confirmPassword && password !== confirmPassword ? 'border-rose-400 ring-1 ring-rose-200' : 'border-slate-200'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Role
                        </label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value as UserRole)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                        >
                          <option value="FARMER">Farmer</option>
                          <option value="VET">Veterinarian</option>
                          <option value="CONTRIBUTOR">Language Contributor</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          County
                        </label>
                        <select
                          value={county}
                          onChange={(e) => setCounty(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                        >
                          {kenyanCounties.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm py-3.5 rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'Processing...'
                    : method === 'phone' && mode === 'register' && !codeSent
                    ? 'Send Verification SMS Code'
                    : mode === 'register'
                    ? 'Complete Account Registration'
                    : 'Sign In to Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Credentials for Evaluation */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">1-Click Test:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fillDemoFarmer}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors"
                >
                  Demo Farmer
                </button>
                <button
                  type="button"
                  onClick={fillDemoVet}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors"
                >
                  Demo Vet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
