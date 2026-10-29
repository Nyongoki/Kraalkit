import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Species, SymptomResult, UserProfile, UserRole, AnimalTriageGroup, TriagePayload } from '../types';
import { InterfaceLang, translations } from '../lib/i18n';
import { findNearestKenyanCounty } from '../lib/kenyaCounties';
import {
  loginUser,
  registerUser,
  getMeProfile,
  loginFarmer,
  verifyFarmerCode,
  requestFarmerCode,
} from '../lib/api';

export interface AnimalIdentification {
  nameOrTag: string;
  stage: string;
  age: string;
  notes?: string;
}

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
  
  // Animal Identification
  animalInfo: AnimalIdentification;
  setAnimalInfo: React.Dispatch<React.SetStateAction<AnimalIdentification>>;
  updateAnimalInfo: (field: keyof AnimalIdentification, val: string) => void;

  selectedSymptoms: SymptomResult[];
  addSymptom: (symptom: SymptomResult) => void;
  removeSymptom: (symptomId: number) => void;
  clearSymptoms: () => void;

  // Single animal vs Herd Outbreak Scope
  isHerd: boolean;
  setIsHerd: (val: boolean) => void;
  herdSize: number;
  setHerdSize: (val: number) => void;
  affectedCount: number;
  setAffectedCount: (val: number) => void;

  // Multi-group Triage Payload & State
  triageGroups: AnimalTriageGroup[];
  setTriageGroups: React.Dispatch<React.SetStateAction<AnimalTriageGroup[]>>;
  triagePayload: TriagePayload | null;
  setTriagePayload: (payload: TriagePayload | null) => void;
  clearStaleResults: () => void;
  
  location: LocationState;
  setLocation: React.Dispatch<React.SetStateAction<LocationState>>;
  useCurrentGps: () => Promise<{ success: boolean; latitude?: number; longitude?: number; county?: string; error?: string }>;
  
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
  loginPhone: (phone: string, pin: string) => Promise<void>;
  registerPhone: (data: {
    phone: string;
    code: string;
    pin: string;
    name?: string;
    county?: string;
  }) => Promise<void>;
  requestCode: (phone: string) => Promise<string | undefined>;
  logout: () => void;
  
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
}

const defaultLocation: LocationState = {
  latitude: -0.6817,
  longitude: 34.7667,
  county: 'Kisii',
  isGps: false,
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interfaceLang, setInterfaceLangState] = useState<InterfaceLang>('en');
  const [searchLanguage, setSearchLanguage] = useState<string>('en');
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>({
    id: 1,
    slug: 'dairy-cattle',
    name: 'Dairy Cattle',
  });
  const [animalInfo, setAnimalInfo] = useState<AnimalIdentification>({
    nameOrTag: '',
    stage: 'Lactating Cow (In Milk)',
    age: '',
    notes: '',
  });

  const updateAnimalInfo = (field: keyof AnimalIdentification, val: string) => {
    setAnimalInfo((prev) => ({ ...prev, [field]: val }));
  };

  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomResult[]>([]);
  const [isHerd, setIsHerd] = useState<boolean>(false);
  const [herdSize, setHerdSize] = useState<number>(25);
  const [affectedCount, setAffectedCountState] = useState<number>(1);
  const [triageGroups, setTriageGroups] = useState<AnimalTriageGroup[]>([]);
  const [triagePayload, setTriagePayload] = useState<TriagePayload | null>(null);

  const clearStaleResults = () => {
    // Clears stored conditions/stale evaluation payload when farmer edits inputs
    setTriagePayload(null);
  };
  const [location, setLocation] = useState<LocationState>(defaultLocation);

  const setAffectedCount = (val: number) => {
    const num = Math.max(1, val || 1);
    setAffectedCountState(num);
    if (num > 1) {
      setIsHerd(true);
      if (herdSize < num) {
        setHerdSize(num * 2);
      }
    } else {
      setIsHerd(false);
    }
  };
  
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

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

  const loginPhone = async (phone: string, pin: string) => {
    const res = await loginFarmer(phone, pin);
    setAuthToken(res.token);
    setCurrentUser(res.farmer);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.farmer));
    if (res.farmer.county) {
      setLocation((prev) => ({ ...prev, county: res.farmer.county! }));
    }
    setAuthModalOpen(false);
  };

  const registerPhone = async (data: {
    phone: string;
    code: string;
    pin: string;
    name?: string;
    county?: string;
  }) => {
    const res = await verifyFarmerCode(data);
    setAuthToken(res.token);
    setCurrentUser(res.farmer);
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.farmer));
    if (res.farmer.county) {
      setLocation((prev) => ({ ...prev, county: res.farmer.county! }));
    }
    setAuthModalOpen(false);
  };

  const requestCode = async (phone: string): Promise<string | undefined> => {
    const res = await requestFarmerCode(phone);
    return res.demoCode;
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

  const useCurrentGps = async (): Promise<{
    success: boolean;
    latitude?: number;
    longitude?: number;
    county?: string;
    error?: string;
  }> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return { success: false, error: 'Geolocation is not supported by your browser/device.' };
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const nearest = findNearestKenyanCounty(lat, lng);
          setLocation({
            latitude: lat,
            longitude: lng,
            county: nearest.county,
            isGps: true,
          });
          resolve({
            success: true,
            latitude: lat,
            longitude: lng,
            county: nearest.county,
          });
        },
        (err) => {
          let msg = 'Could not access device GPS.';
          if (err.code === 1) {
            msg = 'GPS permission was denied. Please allow location access or select your county from the dropdown.';
          } else if (err.code === 2) {
            msg = 'GPS position unavailable. Please choose your county manually.';
          } else if (err.code === 3) {
            msg = 'GPS request timed out. Please try again or select your county.';
          }
          resolve({ success: false, error: msg });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });
  };

  const t = translations.en;

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
        animalInfo,
        setAnimalInfo,
        updateAnimalInfo,
        selectedSymptoms,
        addSymptom,
        removeSymptom,
        clearSymptoms,
        isHerd,
        setIsHerd,
        herdSize,
        setHerdSize,
        affectedCount,
        setAffectedCount,
        triageGroups,
        setTriageGroups,
        triagePayload,
        setTriagePayload,
        clearStaleResults,
        location,
        setLocation,
        useCurrentGps,
        currentUser,
        authToken,
        login,
        register,
        loginPhone,
        registerPhone,
        requestCode,
        logout,
        isAuthModalOpen,
        setAuthModalOpen,
        authModalTab,
        openAuthModal,
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
