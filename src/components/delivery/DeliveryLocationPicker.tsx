import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  Route as RouteIcon,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  calculateRoadRoute,
  calculateDeliveryFee,
  reverseGeocodeSenegal,
  searchSenegalLocations,
  DEFAULT_TMI_DEPOT,
  type Coordinates,
  type RouteResult,
  type DeliveryPricingSettings,
} from "@/lib/geo";
import { formatFCFA } from "@/hooks/useProducts";
import { createDepotIcon, createDestinationIcon } from "./mapIcons";

export interface SelectedLocationData {
  lat: number;
  lng: number;
  address: string;
  region: string;
  city: string;
  commune: string;
  quartier: string;
  distanceKm: number;
  durationMinutes: number;
  fee: number;
  isFreeDelivery: boolean;
  pricingMethod: string;
  routeGeometry?: string;
  isFallback: boolean;
}

interface DeliveryLocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  subtotal: number;
  pricingSettings?: DeliveryPricingSettings | null;
  onLocationConfirmed: (data: SelectedLocationData) => void;
  className?: string;
}

export const DeliveryLocationPicker: React.FC<DeliveryLocationPickerProps> = ({
  initialLat,
  initialLng,
  subtotal,
  pricingSettings,
  onLocationConfirmed,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const depotMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coordonnées du dépôt TMI configurables
  const depotCoords: Coordinates = useMemo(() => ({
    lat: pricingSettings?.departure_lat ?? DEFAULT_TMI_DEPOT.lat,
    lng: pricingSettings?.departure_lng ?? DEFAULT_TMI_DEPOT.lng,
  }), [pricingSettings?.departure_lat, pricingSettings?.departure_lng]);
  const depotName = pricingSettings?.departure_name || DEFAULT_TMI_DEPOT.name;
  const pricePerKm = pricingSettings?.price_per_km ?? 200;

  // Position sélectionnée
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ displayName: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [geocodedAddress, setGeocodedAddress] = useState<string>("");
  const [detectedCity, setDetectedCity] = useState<string>("");
  const [detectedCommune, setDetectedCommune] = useState<string>("");
  const [detectedQuartier, setDetectedQuartier] = useState<string>("");
  const [detectedRegion, setDetectedRegion] = useState<string>("");
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Calcul automatique au kilomètre
  const pricingResult = calculateDeliveryFee({
    distanceKm: routeInfo?.distanceKm ?? 0,
    subtotal,
    settings: pricingSettings,
  });

  // Met à jour la destination, le marqueur, et calcule l'itinéraire
  const updateDestination = useCallback(
    async (coords: Coordinates) => {
      setSelectedCoords(coords);
      setGpsError(null);
      const map = mapInstanceRef.current;
      if (!map) return;

      // Déplacer ou créer le marqueur destination
      if (!destMarkerRef.current) {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: createDestinationIcon("Lieu de livraison", true),
          draggable: true,
          zIndexOffset: 2000,
        }).addTo(map);

        marker.on("dragend", () => {
          const newPos = marker.getLatLng();
          debouncedUpdateDestination({ lat: newPos.lat, lng: newPos.lng });
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <strong style="color: #15803d;">Lieu de livraison sélectionné</strong><br/>
            <span style="color: #64748b; font-size: 11px;">Faites glisser pour ajuster la position exacte</span>
          </div>
        `);

        destMarkerRef.current = marker;
      } else {
        destMarkerRef.current.setLatLng([coords.lat, coords.lng]);
      }

      // Calcul d'itinéraire routier
      setIsCalculatingRoute(true);
      try {
        const route = await calculateRoadRoute(depotCoords, coords);
        setRouteInfo(route);

        // Dessiner le tracé polyline
        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
        }

        const polyline = L.polyline(route.coordinates, {
          color: route.isEstimatedFlight ? "#9333ea" : "#2563eb",
          weight: 4,
          opacity: 0.85,
          dashArray: route.isEstimatedFlight ? "8, 8" : undefined,
          lineJoin: "round",
        }).addTo(map);

        routePolylineRef.current = polyline;

        // Ajuster la vue pour voir le dépôt et la destination
        const bounds = L.latLngBounds([
          [depotCoords.lat, depotCoords.lng],
          [coords.lat, coords.lng],
        ]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });

        // Géocodage inverse automatique pour renseigner l'adresse
        const geoInfo = await reverseGeocodeSenegal(coords);
        let finalAddr = "";
        let finalRegion = "Sénégal";
        let finalCity = "Zone de livraison";
        let finalCommune = "";
        let finalQuartier = "";

        if (geoInfo) {
          if (geoInfo.formattedAddress) {
            setGeocodedAddress(geoInfo.formattedAddress);
            finalAddr = geoInfo.formattedAddress;
          }
          if (geoInfo.city) {
            setDetectedCity(geoInfo.city);
            finalCity = geoInfo.city;
          }
          if (geoInfo.commune) {
            setDetectedCommune(geoInfo.commune);
            finalCommune = geoInfo.commune;
          }
          if (geoInfo.quartier) {
            setDetectedQuartier(geoInfo.quartier);
            finalQuartier = geoInfo.quartier;
          }
          if (geoInfo.region) {
            setDetectedRegion(geoInfo.region);
            finalRegion = geoInfo.region;
          }
        }

        // Calcul automatique instantané
        const calculatedFee = Math.round(route.distanceKm * pricePerKm);
        const isFree = pricingSettings?.free_delivery_enabled && subtotal >= (pricingSettings?.free_delivery_min_amount ?? 50000);
        const finalFee = isFree ? 0 : calculatedFee;

        // Mise à jour automatique instantanée du panier parent
        onLocationConfirmed({
          lat: coords.lat,
          lng: coords.lng,
          address: finalAddr || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
          region: finalRegion,
          city: finalCity,
          commune: finalCommune,
          quartier: finalQuartier,
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          fee: finalFee,
          isFreeDelivery: !!isFree,
          pricingMethod: isFree ? "FREE_DELIVERY_PROMO" : "DISTANCE_ROAD",
          routeGeometry: JSON.stringify(route.coordinates),
          isFallback: route.isEstimatedFlight,
        });
      } catch (e) {
        console.error("Erreur calcul itinéraire", e);
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depotCoords, onLocationConfirmed, pricePerKm, pricingSettings, subtotal]
  );

  // Version temporisée (debounced) pour éviter les requêtes intempestives lors du glisser-déplacer
  const debouncedUpdateDestination = useCallback(
    (coords: Coordinates) => {
      setSelectedCoords(coords);
      setGpsError(null);

      // Repositionner le marqueur immédiatement sur la carte pour une réactivité visuelle instantanée
      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([coords.lat, coords.lng]);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        updateDestination(coords);
      }, 350);
    },
    [updateDestination]
  );

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = selectedCoords || depotCoords;

    const map = L.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: selectedCoords ? 13 : 9,
      zoomControl: true,
    });

    // Tuiles OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Marqueur du Dépôt / Magasin TMI
    const depotMarker = L.marker([depotCoords.lat, depotCoords.lng], {
      icon: createDepotIcon(depotName),
      zIndexOffset: 1000,
    }).addTo(map);

    depotMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
        <strong style="color: #85581A; font-size: 13px;">${depotName}</strong><br/>
        <span>Point de départ des livraisons</span><br/>
        <span style="color: #64748b; font-size: 11px;">${pricingSettings?.departure_address || DEFAULT_TMI_DEPOT.address}</span>
      </div>
    `);

    depotMarkerRef.current = depotMarker;
    mapInstanceRef.current = map;

    // Clic direct sur la carte pour définir la destination (avec debounce)
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      debouncedUpdateDestination({ lat, lng });
    });

    // Si on a déjà des coordonnées initiales, placer le marqueur
    if (selectedCoords) {
      updateDestination(selectedCoords);
    }

    // Nettoyage lors du démontage
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Géolocalisation GPS du navigateur / smartphone
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGPS(false);
        const coords: Coordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([coords.lat, coords.lng], 15);
        }
        updateDestination(coords);
      },
      (err) => {
        setIsLocatingGPS(false);
        let msg = "Impossible d'obtenir votre position GPS.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Autorisation GPS refusée. Veuillez autoriser la localisation ou cliquer sur la carte.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Délai d'attente GPS dépassé. Veuillez réessayer ou cliquer sur la carte.";
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Recherche de quartier ou commune
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchSenegalLocations(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: { lat: number; lng: number; displayName: string }) => {
    setSearchResults([]);
    setSearchQuery("");
    setGeocodedAddress(res.displayName);
    const map = mapInstanceRef.current;
    if (map) {
      map.setView([res.lat, res.lng], 14);
    }
    updateDestination({ lat: res.lat, lng: res.lng });
  };

  // Confirmation explicite manuelle
  const handleConfirmLocation = () => {
    if (!selectedCoords) return;

    const distanceKm = routeInfo?.distanceKm ?? 0;
    const durationMinutes = routeInfo?.durationMinutes ?? 0;
    const isFree = pricingResult.isFreeDelivery;
    const calculatedFee = pricingResult.fee;

    onLocationConfirmed({
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      address: geocodedAddress || `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`,
      region: detectedRegion || "Sénégal",
      city: detectedCity || "Zone de livraison",
      commune: detectedCommune || "",
      quartier: detectedQuartier || "",
      distanceKm,
      durationMinutes,
      fee: calculatedFee,
      isFreeDelivery: isFree,
      pricingMethod: pricingResult.pricingMethod,
      routeGeometry: routeInfo ? JSON.stringify(routeInfo.coordinates) : undefined,
      isFallback: routeInfo?.isEstimatedFlight ?? false,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barre d'outils et recherche */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un quartier, commune ou ville (ex: Mermoz, Kédougou, Thiès)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
            </Button>
          </form>

          {/* Liste déroulante des résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden divide-y divide-border">
              {searchResults.map((res, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-2.5 hover:bg-muted/60 text-xs flex items-start gap-2 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{res.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocatingGPS}
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 border-primary/30 hover:bg-primary/5 text-primary"
        >
          {isLocatingGPS ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Localisation en cours...</span>
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              <span>Ma position GPS</span>
            </>
          )}
        </Button>
      </div>

      {/* Message d'erreur GPS le cas échéant */}
      {gpsError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold">Notification GPS</p>
            <p>{gpsError}</p>
          </div>
        </div>
      )}

      {/* Notice explicative : adresse de livraison vs position actuelle */}
      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/60 text-muted-foreground text-xs">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <p>
          <strong>Pratique :</strong> Cliquez directement sur la carte ou déplacez le marqueur vert 📍 à l'endroit exact de
          votre livraison. La distance routière et les frais au kilomètre sont calculés automatiquement en temps réel.
        </p>
      </div>

      {/* Conteneur de la Carte Leaflet */}
      <div className="relative rounded-xl overflow-hidden border border-border shadow-inner bg-card h-[340px] sm:h-[400px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Overlay indicateur de calcul d'itinéraire */}
        {isCalculatingRoute && (
          <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur-xs border border-border rounded-lg px-3 py-1.5 shadow-md flex items-center gap-2 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Calcul de l'itinéraire routier...</span>
          </div>
        )}

        {/* Badge récapitulatif flottant sur la carte */}
        {selectedCoords && routeInfo && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-card/95 backdrop-blur-sm border border-border/80 rounded-xl p-3 shadow-lg max-w-sm space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <RouteIcon className="h-4 w-4 text-primary" />
                <span>Distance :</span>
                <span className="font-bold text-foreground">{routeInfo.distanceKm} km</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>~{routeInfo.durationMinutes} min</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">Frais de livraison :</span>
              {pricingResult.isFreeDelivery ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30 gap-1 font-bold">
                  <Sparkles className="h-3 w-3" /> Gratuit
                </Badge>
              ) : (
                <div className="text-right">
                  <span className="font-heading font-bold text-sm text-primary">
                    {formatFCFA(pricingResult.fee)}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    ({routeInfo.distanceKm} km × {formatFCFA(pricePerKm)}/km)
                  </span>
                </div>
              )}
            </div>

            {routeInfo.isEstimatedFlight && (
              <p className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-500/10 rounded px-1.5 py-0.5">
                Distance routière estimée par détour géographique de sécurité.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Récapitulatif instantané clair et transparent */}
      {selectedCoords && routeInfo ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                Lieu de livraison pointé
              </p>
              <p className="text-sm font-medium text-foreground">
                {geocodedAddress || "Position GPS sélectionnée sur la carte"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Coordonnées : {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
              </p>
            </div>
          </div>

          {/* Tableau détaillé des 5 éléments exigés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border text-xs">
            <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5">
              <span className="text-muted-foreground text-[11px] block">Montant produits</span>
              <span className="font-semibold text-sm">{formatFCFA(subtotal)}</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5">
              <span className="text-muted-foreground text-[11px] block">Distance routière</span>
              <span className="font-semibold text-sm text-primary">{routeInfo.distanceKm} km</span>
            </div>
            <div className="bg-muted/40 p-2.5 rounded-lg space-y-0.5">
              <span className="text-muted-foreground text-[11px] block">Prix du kilomètre</span>
              <span className="font-semibold text-sm">{formatFCFA(pricePerKm)} / km</span>
            </div>
            <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-lg space-y-0.5">
              <span className="text-primary font-medium text-[11px] block">Frais livraison</span>
              <span className="font-bold text-sm text-primary">
                {pricingResult.isFreeDelivery ? "Gratuit" : formatFCFA(pricingResult.fee)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
              <Calculator className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Calcul automatique :{" "}
                <strong className="text-foreground">
                  {routeInfo.distanceKm} km × {formatFCFA(pricePerKm)} = {formatFCFA(pricingResult.fee)}
                </strong>
              </span>
            </div>

            <Button
              type="button"
              onClick={handleConfirmLocation}
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider cette position
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
          <MapPin className="h-8 w-8 mx-auto text-primary/60" />
          <p className="text-sm font-medium text-foreground">
            Veuillez pointer votre lieu de livraison sur la carte
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Cliquez sur « Ma position GPS » ou cliquez sur la carte ci-dessus. La distance exacte et les frais au kilomètre seront calculés automatiquement.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeliveryLocationPicker;
