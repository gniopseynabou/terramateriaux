import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  Phone,
  MessageCircle,
  ExternalLink,
  MapPin,
  Clock,
  Route as RouteIcon,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  calculateRoadRoute,
  getGoogleMapsNavigationUrl,
  getWazeNavigationUrl,
  getAppleMapsNavigationUrl,
  getWhatsAppContactUrl,
  DEFAULT_TMI_DEPOT,
  type Coordinates,
  type RouteResult,
} from "@/lib/geo";
import { createDepotIcon, createDestinationIcon, createDriverLiveIcon } from "./mapIcons";

interface DeliveryRouteViewerProps {
  destination: Coordinates;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryCommune?: string;
  deliveryQuarter?: string;
  deliveryInstructions?: string;
  depotCoords?: Coordinates;
  depotName?: string;
  driverLiveCoords?: Coordinates | null;
  driverName?: string;
  height?: string;
  showNavigationActions?: boolean;
}

export const DeliveryRouteViewer: React.FC<DeliveryRouteViewerProps> = ({
  destination,
  customerName = "Client T.M.I.",
  customerPhone,
  deliveryAddress,
  deliveryCommune,
  deliveryQuarter,
  deliveryInstructions,
  depotCoords = { lat: DEFAULT_TMI_DEPOT.lat, lng: DEFAULT_TMI_DEPOT.lng },
  depotName = DEFAULT_TMI_DEPOT.name,
  driverLiveCoords,
  driverName = "Livreur",
  height = "320px",
  showNavigationActions = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);

  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Nettoyer si déjà initialisé
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [destination.lat, destination.lng],
      zoom: 13,
      scrollWheelZoom: "center",
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Marqueur Dépôt T.M.I.
    L.marker([depotCoords.lat, depotCoords.lng], {
      icon: createDepotIcon(depotName),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup(`<strong>${depotName}</strong><br/>Point de départ de la livraison`);

    // Marqueur Destination
    L.marker([destination.lat, destination.lng], {
      icon: createDestinationIcon(customerName),
      zIndexOffset: 2000,
    })
      .addTo(map)
      .bindPopup(`
        <div style="font-size: 12px; line-height: 1.4;">
          <strong style="color: #15803d; font-size: 13px;">${customerName}</strong><br/>
          <span>${deliveryAddress || "Adresse de livraison"}</span><br/>
          ${deliveryCommune ? `<span style="color: #64748b;">${deliveryCommune}</span>` : ""}
        </div>
      `);

    mapInstanceRef.current = map;

    // Calcul de l'itinéraire
    let isMounted = true;
    setLoadingRoute(true);

    calculateRoadRoute(depotCoords, destination)
      .then((route) => {
        if (!isMounted || !mapInstanceRef.current) return;
        setRouteInfo(route);

        if (routePolylineRef.current) {
          routePolylineRef.current.remove();
        }

        const polyline = L.polyline(route.coordinates, {
          color: route.isEstimatedFlight ? "#9333ea" : "#2563eb",
          weight: 5,
          opacity: 0.85,
          dashArray: route.isEstimatedFlight ? "8, 8" : undefined,
          lineJoin: "round",
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = polyline;

        const bounds = L.latLngBounds([
          [depotCoords.lat, depotCoords.lng],
          [destination.lat, destination.lng],
        ]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 16 });
      })
      .catch((err) => console.error("Erreur calcul d'itinéraire", err))
      .finally(() => {
        if (isMounted) setLoadingRoute(false);
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [destination.lat, destination.lng, depotCoords.lat, depotCoords.lng]);

  // Mise à jour du marqueur livreur en direct si disponible
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (driverLiveCoords) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driverLiveCoords.lat, driverLiveCoords.lng], {
          icon: createDriverLiveIcon(driverName),
          zIndexOffset: 3000,
        }).addTo(map);
      } else {
        driverMarkerRef.current.setLatLng([driverLiveCoords.lat, driverLiveCoords.lng]);
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
  }, [driverLiveCoords, driverName]);

  const googleMapsUrl = getGoogleMapsNavigationUrl(
    destination.lat,
    destination.lng,
    depotCoords.lat,
    depotCoords.lng
  );
  const wazeUrl = getWazeNavigationUrl(destination.lat, destination.lng);
  const appleMapsUrl = getAppleMapsNavigationUrl(destination.lat, destination.lng);

  return (
    <div className="space-y-3">
      {/* Conteneur de carte */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-xs" style={{ height }}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Badge récapitulatif flottant */}
        {routeInfo && (
          <div className="absolute top-3 left-3 z-10 bg-card/95 backdrop-blur-xs border border-border/80 rounded-lg px-3 py-1.5 shadow-md flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <RouteIcon className="h-3.5 w-3.5 text-primary" />
              <span>{routeInfo.distanceKm} km</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>~{routeInfo.durationMinutes} min</span>
            </div>
            {driverLiveCoords && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-[10px]">
                <Radio className="h-3 w-3 animate-pulse text-blue-600" /> Livreur actif
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Détails du point d'arrivée & instructions */}
      <div className="bg-card border border-border rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{deliveryAddress || "Adresse non spécifiée"}</p>
            {(deliveryCommune || deliveryQuarter) && (
              <p className="text-muted-foreground">
                {[deliveryCommune, deliveryQuarter].filter(Boolean).join(" • ")}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              GPS : {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
            </p>
          </div>
        </div>

        {deliveryInstructions && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-amber-800 dark:text-amber-200 text-xs">
            <span className="font-semibold block mb-0.5">Instructions d'accès & repère :</span>
            <p>{deliveryInstructions}</p>
          </div>
        )}
      </div>

      {/* Boutons d'action de guidage & contact */}
      {showNavigationActions && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-3.5 w-3.5" />
              <span>Google Maps</span>
            </a>
          </Button>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="w-full gap-1.5 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10"
          >
            <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-3.5 w-3.5" />
              <span>Waze</span>
            </a>
          </Button>

          {customerPhone && (
            <>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-500/10"
              >
                <a href={getWhatsAppContactUrl(customerPhone, `Bonjour ${customerName}, je suis votre livreur TMI pour votre commande.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                  <span>WhatsApp</span>
                </a>
              </Button>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full gap-1.5 border-border hover:bg-muted"
              >
                <a href={`tel:${customerPhone}`}>
                  <Phone className="h-3.5 w-3.5" />
                  <span>Appeler</span>
                </a>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryRouteViewer;
