export interface CountyInfo {
  name: string;
  latitude: number;
  longitude: number;
}

export const KENYA_COUNTIES: Record<string, { lat: number; lng: number }> = {
  'Nairobi': { lat: -1.286389, lng: 36.817223 },
  'Kiambu': { lat: -1.1714, lng: 36.8356 },
  'Nakuru': { lat: -0.3031, lng: 36.0800 },
  'Uasin Gishu': { lat: 0.5143, lng: 35.2698 },
  'Kisii': { lat: -0.6817, lng: 34.7667 },
  'Nyamira': { lat: -0.5633, lng: 34.9358 },
  'Kisumu': { lat: -0.0917, lng: 34.7680 },
  'Siaya': { lat: 0.0607, lng: 34.2882 },
  'Homa Bay': { lat: -0.5273, lng: 34.4571 },
  'Migori': { lat: -1.0634, lng: 34.4731 },
  'Kericho': { lat: -0.3689, lng: 35.2863 },
  'Bomet': { lat: -0.7813, lng: 35.3416 },
  'Narok': { lat: -1.0783, lng: 35.8601 },
  'Kajiado': { lat: -1.8524, lng: 36.7768 },
  'Nandi': { lat: 0.1836, lng: 35.1056 },
  'Baringo': { lat: 0.4859, lng: 35.7412 },
  'Elgeyo-Marakwet': { lat: 0.8037, lng: 35.5394 },
  'Trans-Nzoia': { lat: 1.0157, lng: 34.9982 },
  'West Pokot': { lat: 1.4990, lng: 35.1147 },
  'Turkana': { lat: 3.1167, lng: 35.6000 },
  'Marsabit': { lat: 2.3347, lng: 37.9900 },
  'Samburu': { lat: 1.2155, lng: 36.9366 },
  'Isiolo': { lat: 0.3546, lng: 37.5822 },
  'Meru': { lat: 0.0463, lng: 37.6559 },
  'Tharaka-Nithi': { lat: -0.2970, lng: 37.8739 },
  'Embu': { lat: -0.5346, lng: 37.4574 },
  'Kitui': { lat: -1.3748, lng: 38.0106 },
  'Machakos': { lat: -1.5177, lng: 37.2634 },
  'Makueni': { lat: -1.8041, lng: 37.6300 },
  'Nyandarua': { lat: -0.1804, lng: 36.5230 },
  'Nyeri': { lat: -0.4201, lng: 36.9476 },
  'Kirinyaga': { lat: -0.4990, lng: 37.2803 },
  'Murang\'a': { lat: -0.7210, lng: 37.1526 },
  'Laikipia': { lat: 0.3606, lng: 36.7820 },
  'Kakamega': { lat: 0.2827, lng: 34.7519 },
  'Bungoma': { lat: 0.5695, lng: 34.5584 },
  'Busia': { lat: 0.4608, lng: 34.1115 },
  'Vihiga': { lat: 0.0765, lng: 34.7224 },
  'Mombasa': { lat: -4.0435, lng: 39.6682 },
  'Kilifi': { lat: -3.6305, lng: 39.8499 },
  'Kwale': { lat: -4.1737, lng: 39.4521 },
  'Taita-Taveta': { lat: -3.3161, lng: 38.3569 },
  'Garissa': { lat: -0.4532, lng: 39.6461 },
  'Wajir': { lat: 1.7471, lng: 40.0573 },
  'Mandera': { lat: 3.9373, lng: 41.8569 },
  'Tana River': { lat: -1.5000, lng: 39.5000 },
  'Lamu': { lat: -2.2717, lng: 40.9020 },
};

export const KENYAN_COUNTIES_LIST = Object.keys(KENYA_COUNTIES);

/**
 * Calculates distance in kilometers between two GPS coordinates using Haversine formula
 */
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest Kenyan county for a given GPS coordinate
 */
export function findNearestKenyanCounty(lat: number, lng: number): { county: string; distanceKm: number } {
  let nearestCounty = 'Kisii';
  let minDistance = Infinity;

  for (const [county, coords] of Object.entries(KENYA_COUNTIES)) {
    const dist = getDistanceKm(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCounty = county;
    }
  }

  return { county: nearestCounty, distanceKm: minDistance };
}

/**
 * Get coordinates for a named Kenyan County
 */
export function getCountyCoordinates(countyName: string): { lat: number; lng: number } {
  const normalized = countyName.replace(/\s*County$/i, '').trim();
  return KENYA_COUNTIES[normalized] || KENYA_COUNTIES['Kisii'];
}
