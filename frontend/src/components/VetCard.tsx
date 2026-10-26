import React from 'react';
import { Vet } from '../types';
import { Phone, MapPin, CheckCircle, Navigation } from 'lucide-react';
import { useSession } from '../store/sessionContext';

interface VetCardProps {
  vet: Vet;
}

export const VetCard: React.FC<VetCardProps> = ({ vet }) => {
  const { t } = useSession();

  const getTypeLabel = () => {
    switch (vet.type) {
      case 'REGISTERED_VET':
        return 'Registered Vet';
      case 'CLINIC':
        return 'Veterinary Clinic';
      case 'ANIMAL_HEALTH_WORKER':
        return 'Animal Health Worker';
      default:
        return 'Vet Provider';
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vet.latitude},${vet.longitude}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3 shadow-sm hover:border-primary-400 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-bold text-gray-900 text-base leading-snug">
              {vet.name}
            </h4>
            {vet.verified && (
              <span className="inline-flex items-center text-primary-700 text-xs font-semibold" title="Verified Practitioner">
                <CheckCircle className="w-4 h-4 fill-primary-100" />
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {getTypeLabel()} • {vet.county || 'Western Kenya'}
          </p>
        </div>

        {/* Distance Badge */}
        <div className="bg-primary-50 text-primary-800 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 flex items-center">
          <Navigation className="w-3 h-3 mr-1" />
          {vet.distanceKm} km {t.distance}
        </div>
      </div>

      {/* Species Served */}
      {vet.speciesServed && vet.speciesServed.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {vet.speciesServed.map((sp) => (
            <span
              key={sp.slug}
              className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium"
            >
              {sp.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions: Call & Map Directions */}
      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-gray-100">
        {vet.phone ? (
          <a
            href={`tel:${vet.phone}`}
            className="flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-sm transition-colors active:scale-95 text-center"
          >
            <Phone className="w-3.5 h-3.5" />
            {t.callNow}
          </a>
        ) : (
          <button
            disabled
            className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-400 text-xs font-bold py-2.5 px-3 rounded-lg cursor-not-allowed"
          >
            <Phone className="w-3.5 h-3.5" />
            No Phone
          </button>
        )}

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors active:scale-95 text-center"
        >
          <MapPin className="w-3.5 h-3.5 text-gray-500" />
          Map / Directions
        </a>
      </div>
    </div>
  );
};
