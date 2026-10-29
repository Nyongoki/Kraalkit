import React, { useEffect, useState } from 'react';
import { useSession } from '../store/sessionContext';
import { fetchNearestVets } from '../lib/api';
import { Vet } from '../types';
import { ScreenTab } from '../components/Navigation';
import {
  MapPin,
  Phone,
  Navigation,
  Search,
  ShieldCheck,
  CheckCircle,
  Building2,
  UserCheck,
  RefreshCw,
  AlertCircle,
  FileText,
  Map as MapIcon,
  MessageCircle,
} from 'lucide-react';

interface VetsDirectoryScreenProps {
  setCurrentTab: (tab: ScreenTab) => void;
}

export const VetsDirectoryScreen: React.FC<VetsDirectoryScreenProps> = ({
  setCurrentTab,
}) => {
  const { t, selectedSpecies, location, useCurrentGps, currentUser, openAuthModal } =
    useSession();

  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [refreshingGps, setRefreshingGps] = useState(false);

  const loadVets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch up to 20 nearest registered practitioners
      const list = await fetchNearestVets(
        location.latitude,
        location.longitude,
        selectedSpecies?.id,
        20,
        true
      );
      setVets(list);
    } catch (err: any) {
      setError(err.message || 'Could not load veterinary practitioners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVets();
  }, [location.latitude, location.longitude, selectedSpecies?.id]);

  const handleRefreshLocation = async () => {
    setRefreshingGps(true);
    try {
      await useCurrentGps();
      await loadVets();
    } finally {
      setRefreshingGps(false);
    }
  };

  // Filtered list
  const filteredVets = vets.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.county && v.county.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.phone && v.phone.includes(searchQuery));

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'REGISTERED_VET' && v.type === 'REGISTERED_VET') ||
      (typeFilter === 'CLINIC' && v.type === 'CLINIC') ||
      (typeFilter === 'ANIMAL_HEALTH_WORKER' && v.type === 'ANIMAL_HEALTH_WORKER');

    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'REGISTERED_VET':
        return {
          label: 'Registered Vet Surgeon',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'CLINIC':
        return {
          label: 'Veterinary Clinic / Hospital',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
        };
      case 'ANIMAL_HEALTH_WORKER':
        return {
          label: 'Paravet / Animal Health Worker',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
        };
      default:
        return {
          label: 'Veterinary Practitioner',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
        };
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto py-12 animate-fadeIn text-center">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">
              Veterinary Directory Locked
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a free farmer account to access certified Kenya Veterinary Board
              (KVB) registered veterinarians, direct calling, and on-farm clinic dispatch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs py-3 rounded-xl shadow-2xs active:scale-95 transition-all"
          >
            Create Farmer Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* 1. Directory Header */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-800/40 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kenya Veterinary Board (KVB) Certified Practitioners</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Veterinary Practitioners &amp; Clinics Directory
          </h2>
          <p className="text-xs text-slate-300 font-medium max-w-xl">
            Locate registered veterinary surgeons, artificial insemination technicians, and licensed animal health clinics near your farm.
          </p>
        </div>

        {/* GPS Location Pill & Refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{location.county} (GPS)</span>
          </div>

          <button
            type="button"
            onClick={handleRefreshLocation}
            disabled={refreshingGps}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-2xs active:scale-95 transition-all disabled:opacity-50"
            title="Recalculate distance using current GPS coordinates"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshingGps ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 2. Controls & Search Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name, clinic, county, or phone number..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Practitioner Type Filter Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold flex-wrap gap-1">
            {[
              { id: 'ALL', label: 'All Providers' },
              { id: 'REGISTERED_VET', label: 'Vets Only' },
              { id: 'CLINIC', label: 'Clinics' },
              { id: 'ANIMAL_HEALTH_WORKER', label: 'Paravets' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  typeFilter === tab.id
                    ? 'bg-emerald-700 text-white font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter & Emergency Notification */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{filteredVets.length}</strong> registered practitioners near {location.county}
          </span>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] text-slate-400">
              Suspecting an outbreak?
            </span>
            <button
              type="button"
              onClick={() => setCurrentTab('report')}
              className="text-purple-700 hover:underline font-black text-xs flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report to County Vet Officer</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Loading & Error States */}
      {loading && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-black text-slate-800">
            Finding certified practitioners near your location...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Practitioners Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVets.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-black text-slate-800">
                No Veterinary Practitioners Found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No practitioners match your active filter criteria in {location.county}. Try clearing the search query or switching to &ldquo;All Providers&rdquo;.
              </p>
            </div>
          )}

          {filteredVets.map((vet) => {
            const badge = getTypeBadge(vet.type);
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vet.latitude},${vet.longitude}`;
            const cleanPhone = vet.phone?.replace(/[^0-9+]/g, '') || '';
            const whatsappUrl = cleanPhone
              ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                  `Hello Dr. ${vet.name}, I am a farmer in ${location.county} needing veterinary assistance for my livestock.`
                )}`
              : null;

            return (
              <div
                key={vet.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-emerald-500 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Header & Verification */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-slate-900 text-sm leading-snug">
                          {vet.name}
                        </h4>
                        {vet.verified && (
                          <span
                            className="inline-flex items-center text-emerald-700"
                            title="Certified KVB Registered Practitioner"
                          >
                            <CheckCircle className="w-4 h-4 fill-emerald-100" />
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* GPS Distance Badge */}
                    <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-black px-2 py-1 rounded-xl flex-shrink-0 flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-emerald-600" />
                      <span>{vet.distanceKm} km</span>
                    </div>
                  </div>

                  {/* County & Location */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span>{vet.county || location.county || 'Kenya'}</span>
                  </div>

                  {/* Species Handled Tags */}
                  {vet.speciesServed && vet.speciesServed.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {vet.speciesServed.map((sp) => (
                        <span
                          key={sp.slug}
                          className="text-[9px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md"
                        >
                          {sp.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons: Call, WhatsApp, Directions */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Call Vet */}
                    {vet.phone ? (
                      <a
                        href={`tel:${vet.phone}`}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs py-2 px-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Vet</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="bg-slate-100 text-slate-400 font-bold text-xs py-2 px-2.5 rounded-xl cursor-not-allowed text-center"
                      >
                        No Phone
                      </button>
                    )}

                    {/* WhatsApp Doctor */}
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-2 px-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                      >
                        <MapIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Directions</span>
                      </a>
                    )}
                  </div>

                  {/* Directions link if WhatsApp was shown */}
                  {whatsappUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                    >
                      <MapIcon className="w-3 h-3 text-slate-500" />
                      <span>Open Directions on Map</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
