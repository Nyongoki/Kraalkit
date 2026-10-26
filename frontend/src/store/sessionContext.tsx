import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Species, SymptomResult, UserProfile, UserRole } from '../types';
import { InterfaceLang, translations } from '../lib/i18n';
import { loginUser, registerUser, getMeProfile } from '../lib/api';

interface LocationState {
  latitude: number;
  longitude: number;
  county: string;
  isGps: boolean;
}

interface SessionContextType {
  interfaceLang: InterfaceLang;
  setInterfaceLang: (lang: InterfaceLang) => void;
  t: typeof translations['en'];
  
  searchLanguage: string;
  setSearchLanguage: (code: string) => void;
  
  selectedSpecies: Species | null;
  setSelectedSpecies: (species: Species | null) => void;
  
  selectedSymptoms: SymptomResult[];
  addSymptom: (symptom: SymptomResult) => void;
  removeSymptom: (symptomId: number) => void;
  clearSymptoms: () => void;

  // Single animal vs Herd Outbreak Scope
  isHerd: boolean;
  setIsHerd: (val: boolean) => void;
  herdSize: number;
  setHerdSize: (val: number) => void;
  
  location: LocationState;
  setLocation: React.Dispatch<React.SetStateAction<LocationState>>;
  useCurrentGps: () => Promise<void>;
  
  // Authentication
  currentUser: UserProfile | null;
  authToken: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
    county?: string;
    farmSize?: string;
  }) => Promise<void>;
  logout: () => void;
  
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

const defaultLocation: LocationState = {
  latitude: -0.6817,
  longitude: 34.7667,
  county: 'Kisii',
  isGps: false,
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interfaceLang, setInterfaceLangState] = useState<InterfaceLang>('sw');
  const [searchLanguage, setSearchLanguage] = useState<string>('sw');
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>({
    id: 1,
    slug: 'dairy-cattle',
    name: 'Dairy Cattle',
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomResult[]>([]);
  const [isHerd, setIsHerd] = useState<boolean>(false);
  const [herdSize, setHerdSize] = useState<number>(25);
  const [location, setLocation] = useState<LocationState>(defaultLocation);
  
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Sync token validation on load
  useEffect(() => {
    if (authToken && !currentUser) {
      getMeProfile(authToken)
        .then((res) => {
          setCurrentUser(res.user);
          localStorage.setItem('auth_user', JSON.stringify(res.user));
        })
        .catch(() => {
          logout();
        });
    }
  }, [authToken]);

  const login = async (email: string, pass: string) => {
    const res = await loginUser(email, pass);
    setAuthToken(res.token);
    setCurrentUser(res.user);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    // Also sync location county if user has one
    if (res.user.county) {
      setLocation((prev) => ({ ...prev, county: res.user.county! }));
    }
    setAuthModalOpen(false);
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
    county?: string;
    farmSize?: string;
  }) => {
    const res = await registerUser(data);
    setAuthToken(res.token);
    setCurrentUser(res.user);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    if (res.user.county) {
      setLocation((prev) => ({ ...prev, county: res.user.county! }));
    }
    setAuthModalOpen(false);
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const setInterfaceLang = (lang: InterfaceLang) => {
    setInterfaceLangState(lang);
    localStorage.setItem('interface_lang', lang);
  };

  const addSymptom = (symptom: SymptomResult) => {
    if (!selectedSymptoms.find((s) => s.id === symptom.id)) {
      setSelectedSymptoms((prev) => [...prev, symptom]);
    }
  };

  const removeSymptom = (symptomId: number) => {
    setSelectedSymptoms((prev) => prev.filter((s) => s.id !== symptomId));
  };

  const clearSymptoms = () => {
    setSelectedSymptoms([]);
  };

  const useCurrentGps = async (): Promise<void> => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            county: 'GPS Detected',
            isGps: true,
          });
          resolve();
        },
        () => {
          alert('GPS location permission denied. Keeping county location.');
          resolve();
        },
        { timeout: 8000 }
      );
    });
  };

  const t = translations[interfaceLang] || translations.en;

  return (
    <SessionContext.Provider
      value={{
        interfaceLang,
        setInterfaceLang,
        t,
        searchLanguage,
        setSearchLanguage,
        selectedSpecies,
        setSelectedSpecies,
        selectedSymptoms,
        addSymptom,
        removeSymptom,
        clearSymptoms,
        isHerd,
        setIsHerd,
        herdSize,
        setHerdSize,
        location,
        setLocation,
        useCurrentGps,
        currentUser,
        authToken,
        login,
        register,
        logout,
        isAuthModalOpen,
        setAuthModalOpen,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};
