/**
-- ============================================================
-- Terra Matériaux International (T.M.I.)
-- Module de Cartographie, Géolocalisation & Calcul Logistique
-- ============================================================
*/

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
  isEstimatedFlight: boolean;
  statusMessage?: string;
  summary?: string;
}

export interface DeliveryPricingSettings {
  base_fee: number;
  price_per_km: number;
  min_fee: number;
  free_delivery_enabled: boolean;
  free_delivery_min_amount: number;
  departure_name?: string;
  departure_address?: string;
  departure_lat?: number;
  departure_lng?: number;
}

export interface PricingCalculationResult {
  fee: number;
  isFreeDelivery: boolean;
  pricingMethod: "FREE_DELIVERY_PROMO" | "DISTANCE_ROAD" | "MINIMUM_APPLIED" | "ZONE_FLAT" | "DEFAULT_MINIMUM" | "NOT_CALCULATED";
  explanation: string;
  breakdown: {
    baseFee: number;
    distanceKm: number;
    pricePerKm: number;
    distanceCost: number;
    minFee: number;
    rawCalculated: number;
    finalFee: number;
  };
}

export interface GeocodedAddress {
  formattedAddress: string;
  region?: string;
  city?: string;
  commune?: string;
  quartier?: string;
}

// Emplacement par défaut du Siège T.M.I. à Kédougou (configurable dynamiquement via l'admin)
export const DEFAULT_TMI_DEPOT = {
  name: "Siège & Dépôt Central T.M.I.",
  address: "Quartier Dandé Mayo, Kédougou, Sénégal",
  lat: 12.5568,
  lng: -12.1764,
};

// Coordonnées de référence au Sénégal pour le centrage par défaut
export const SENEGAL_CENTER: Coordinates = {
  lat: 14.4974,
  lng: -14.4524,
};

// Facteur de détour moyen sur le réseau routier sénégalais en l'absence de routage dynamique
const SENEGAL_ROAD_DETOUR_FACTOR = 1.28;

/**
 * Calcul de la distance à vol d'oiseau (formule de Haversine).
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Estimation de secours de la distance routière à partir de Haversine.
 */
export function estimatedRoadDistanceFallbackKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const straightLine = haversineDistanceKm(lat1, lon1, lat2, lon2);
  const estimatedRoad = straightLine * SENEGAL_ROAD_DETOUR_FACTOR;
  return Math.round(estimatedRoad * 10) / 10;
}

/**
 * Calcul d'itinéraire routier réel via OSRM (Open Source Routing Machine).
 * Comprend gestion d'erreurs, timeout et repli Haversine sans bloquer l'interface.
 */
export async function calculateRoadRoute(
  start: Coordinates,
  destination: Coordinates
): Promise<RouteResult> {
  const straightLine = haversineDistanceKm(start.lat, start.lng, destination.lat, destination.lng);

  // Sécurité : si la distance est nulle ou négligeable (< 50m)
  if (straightLine < 0.05) {
    return {
      distanceKm: 0,
      durationMinutes: 0,
      coordinates: [
        [start.lat, start.lng],
        [destination.lat, destination.lng],
      ],
      isEstimatedFlight: false,
      summary: "Même emplacement",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  try {
    // Appel OSRM public (ou URL configurée via VITE_OSRM_URL)
    const baseUrl =
      (import.meta.env.VITE_OSRM_URL as string) || "https://router.project-osrm.org";
    const url = `${baseUrl}/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const distanceMeters = primaryRoute.distance;
      const durationSeconds = primaryRoute.duration;

      const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      // Inverser [lng, lat] de GeoJSON vers [lat, lng] de Leaflet
      const geojsonCoords: [number, number][] = primaryRoute.geometry.coordinates || [];
      const leafletCoords: [number, number][] = geojsonCoords.map(([lng, lat]) => [lat, lng]);

      return {
        distanceKm,
        durationMinutes,
        coordinates: leafletCoords,
        isEstimatedFlight: false,
        summary: primaryRoute.legs?.[0]?.summary || "Itinéraire routier direct",
      };
    } else {
      throw new Error(`OSRM return code: ${data.code || "unknown"}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);

    // Repli de secours : distance à vol d'oiseau pondérée
    const fallbackKm = estimatedRoadDistanceFallbackKm(start.lat, start.lng, destination.lat, destination.lng);
    // Vitesse moyenne estimée à 45 km/h
    const estimatedMinutes = Math.max(5, Math.round((fallbackKm / 45) * 60));

    return {
      distanceKm: fallbackKm,
      durationMinutes: estimatedMinutes,
      coordinates: [
        [start.lat, start.lng],
        [destination.lat, destination.lng],
      ],
      isEstimatedFlight: true,
      statusMessage:
        "Service d'itinéraire en ligne indisponible. Estimation routière calculée par distance pondérée.",
    };
  }
}

/**
 * Calcul automatique des frais de livraison selon la formule stricte T.M.I. :
 * Frais de livraison = distance routière en kilomètres × prix du kilomètre configuré
 * Plus aucun tarif par zone ou commune n'est nécessaire.
 */
export function calculateDeliveryFee(params: {
  distanceKm: number;
  subtotal: number;
  settings?: DeliveryPricingSettings | null;
  zoneFlatFee?: number | null;
}): PricingCalculationResult {
  const { distanceKm, subtotal, settings } = params;

  const pricePerKm = settings?.price_per_km ?? 200;
  const freeEnabled = settings?.free_delivery_enabled ?? false;
  const freeMinAmount = settings?.free_delivery_min_amount ?? 50000;

  // 1. Offre de livraison gratuite si le seuil d'achat est atteint
  if (freeEnabled && subtotal >= freeMinAmount) {
    return {
      fee: 0,
      isFreeDelivery: true,
      pricingMethod: "FREE_DELIVERY_PROMO",
      explanation: `Livraison Gratuite offerte (commande ≥ ${freeMinAmount.toLocaleString("fr-FR")} FCFA)`,
      breakdown: {
        baseFee: 0,
        distanceKm,
        pricePerKm,
        distanceCost: Math.round(distanceKm * pricePerKm),
        minFee: 0,
        rawCalculated: Math.round(distanceKm * pricePerKm),
        finalFee: 0,
      },
    };
  }

  // 2. Calcul strict par kilomètre : distance routière (km) × prix du kilomètre (FCFA/km)
  if (distanceKm > 0) {
    const fee = Math.round(distanceKm * pricePerKm);
    return {
      fee,
      isFreeDelivery: false,
      pricingMethod: "DISTANCE_ROAD",
      explanation: `${distanceKm} km × ${pricePerKm.toLocaleString("fr-FR")} FCFA/km = ${fee.toLocaleString("fr-FR")} FCFA`,
      breakdown: {
        baseFee: 0,
        distanceKm,
        pricePerKm,
        distanceCost: fee,
        minFee: 0,
        rawCalculated: fee,
        finalFee: fee,
      },
    };
  }

  // 3. Distance non calculée / en attente de pointage sur la carte
  return {
    fee: 0,
    isFreeDelivery: false,
    pricingMethod: "NOT_CALCULATED",
    explanation: "Sélectionnez votre lieu sur la carte pour calculer la distance routière",
    breakdown: {
      baseFee: 0,
      distanceKm: 0,
      pricePerKm,
      distanceCost: 0,
      minFee: 0,
      rawCalculated: 0,
      finalFee: 0,
    },
  };
}

/**
 * Géocodage inverse : traduit des coordonnées GPS en adresse textuelle lisible.
 * Utilise Nominatim OpenStreetMap avec identification conforme de l'application.
 */
export async function reverseGeocodeSenegal(coords: Coordinates): Promise<GeocodedAddress | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1&accept-language=fr`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TMI-Logistics-Platform/2.0 (contact@terramateriaux.com)",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const region = addr.state || addr.region || addr.county;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
    const commune = addr.suburb || addr.city_district || addr.municipality;
    const quartier = addr.neighbourhood || addr.suburb || addr.hamlet || addr.road;

    return {
      formattedAddress: data.display_name || "",
      region,
      city,
      commune,
      quartier,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Recherche d'adresses ou quartiers au Sénégal via OpenStreetMap Nominatim.
 */
export async function searchSenegalLocations(query: string): Promise<
  Array<{
    displayName: string;
    lat: number;
    lng: number;
  }>
> {
  if (!query || query.trim().length < 2) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const encoded = encodeURIComponent(`${query.trim()}, Senegal`);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&countrycodes=sn&limit=5&addressdetails=1&accept-language=fr`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TMI-Logistics-Platform/2.0 (contact@terramateriaux.com)",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();

    return (data || []).map((item: { display_name: string; lat: string; lon: string }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}

/**
 * Liens profonds de navigation pour téléphone mobile.
 */
export function getGoogleMapsNavigationUrl(
  destLat: number,
  destLng: number,
  startLat?: number,
  startLng?: number
): string {
  if (startLat != null && startLng != null) {
    return `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
}

export function getWazeNavigationUrl(destLat: number, destLng: number): string {
  return `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
}

export function getAppleMapsNavigationUrl(destLat: number, destLng: number): string {
  return `https://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=d`;
}

export function getGeoSchemeUrl(destLat: number, destLng: number): string {
  return `geo:${destLat},${destLng}?q=${destLat},${destLng}`;
}

export function getWhatsAppContactUrl(phone: string, text?: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  // Préfixe 221 pour le Sénégal si absent
  const fullPhone = cleanPhone.startsWith("221") ? cleanPhone : `221${cleanPhone}`;
  const encodedText = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${fullPhone}${encodedText}`;
}
