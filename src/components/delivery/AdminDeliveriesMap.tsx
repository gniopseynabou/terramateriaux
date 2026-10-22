import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Truck, RefreshCw, User, Phone, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeliveryWithDetails } from "@/hooks/useDeliveries";
import { DEFAULT_TMI_DEPOT, type Coordinates } from "@/lib/geo";
import { formatFCFA } from "@/hooks/useProducts";
import { createDepotIcon, createStatusDeliveryIcon } from "./mapIcons";

interface AdminDeliveriesMapProps {
  deliveries: DeliveryWithDetails[];
  depotCoords?: Coordinates;
  depotName?: string;
  onSelectDelivery?: (delivery: DeliveryWithDetails) => void;
  height?: string;
}

export const AdminDeliveriesMap: React.FC<AdminDeliveriesMapProps> = ({
  deliveries,
  depotCoords = { lat: DEFAULT_TMI_DEPOT.lat, lng: DEFAULT_TMI_DEPOT.lng },
  depotName = DEFAULT_TMI_DEPOT.name,
  onSelectDelivery,
  height = "520px",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Filtrer les livraisons ayant des coordonnées valides
  const localizedDeliveries = deliveries.filter(
    (d) => d.orders?.delivery_lat != null && d.orders?.delivery_lng != null
  );

  const filteredDeliveries = localizedDeliveries.filter((d) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return ["A_PREPARER", "PRETE", "AFFECTEE", "EN_COURS"].includes(d.status);
    if (statusFilter === "LIVREE") return d.status === "LIVREE";
    if (statusFilter === "PROBLEMS") return ["ECHEC", "CLIENT_ABSENT", "ADRESSE_INCORRECTE", "REPORTEE"].includes(d.status);
    return d.status === statusFilter;
  });

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [depotCoords.lat, depotCoords.lng],
      zoom: 12,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Marqueur Dépôt TMI
    L.marker([depotCoords.lat, depotCoords.lng], {
      icon: createDepotIcon(depotName),
      zIndexOffset: 1000,
    })
      .addTo(map)
      .bindPopup(`<strong>${depotName}</strong><br/>Siège & Dépôt Central`);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [depotCoords.lat, depotCoords.lng, depotName]);

  // Rendu des marqueurs selon les livraisons filtrées
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const boundsPoints: [number, number][] = [[depotCoords.lat, depotCoords.lng]];

    filteredDeliveries.forEach((delivery) => {
      const lat = delivery.orders?.delivery_lat;
      const lng = delivery.orders?.delivery_lng;
      if (lat == null || lng == null) return;

      boundsPoints.push([lat, lng]);

      const orderNumber = delivery.orders?.order_number || delivery.id.slice(0, 6);
      const marker = L.marker([lat, lng], {
        icon: createStatusDeliveryIcon(delivery.status, orderNumber),
      });

      const customer = delivery.orders?.customer_name || "Client";
      const phone = delivery.orders?.customer_phone || "";
      const address = delivery.orders?.delivery_address || "";
      const commune = delivery.orders?.delivery_commune || delivery.orders?.delivery_city || "";
      const dist = delivery.orders?.estimated_distance_km;
      const total = delivery.orders?.final_total ?? delivery.orders?.estimated_total ?? delivery.orders?.total ?? 0;
      const driver = delivery.delivery_drivers ? `${delivery.delivery_drivers.first_name} ${delivery.delivery_drivers.last_name}` : "Non affecté";

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #85581A; margin-bottom: 2px;">
            ${orderNumber}
          </div>
          <div style="font-weight: 600;">${customer}</div>
          ${phone ? `<div style="color: #64748b;">📞 ${phone}</div>` : ""}
          <div style="margin-top: 4px; color: #334155;">📍 ${address}</div>
          ${commune ? `<div style="color: #64748b; font-size: 11px;">Zone: ${commune}</div>` : ""}
          ${dist != null ? `<div style="color: #2563eb; font-weight: 600; margin-top: 2px;">🛣️ ${dist} km du dépôt</div>` : ""}
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
            <span>Livreur:</span>
            <strong>${driver}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: #85581A;">
            <span>Total:</span>
            <span>${formatFCFA(total)}</span>
          </div>
        </div>
      `);

      marker.on("click", () => {
        if (onSelectDelivery) onSelectDelivery(delivery);
      });

      group.addLayer(marker);
    });

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredDeliveries, depotCoords.lat, depotCoords.lng, onSelectDelivery]);

  return (
    <div className="space-y-3">
      {/* Filtres de la carte */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card border border-border p-3 rounded-xl shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className="text-xs h-8"
            onClick={() => setStatusFilter("ALL")}
          >
            Toutes ({localizedDeliveries.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            className="text-xs h-8 text-amber-700 dark:text-amber-300"
            onClick={() => setStatusFilter("ACTIVE")}
          >
            En cours / À livrer
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "LIVREE" ? "default" : "outline"}
            className="text-xs h-8 text-green-700 dark:text-green-300"
            onClick={() => setStatusFilter("LIVREE")}
          >
            Livrées
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "PROBLEMS" ? "default" : "outline"}
            className="text-xs h-8 text-destructive"
            onClick={() => setStatusFilter("PROBLEMS")}
          >
            Problèmes signalés
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {localizedDeliveries.length} / {deliveries.length} commandes géolocalisées
        </div>
      </div>

      {/* Conteneur de carte Leaflet */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-card shadow-inner" style={{ height }}>
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Légende rapide en bas à droite */}
        <div className="absolute bottom-3 right-3 z-10 bg-card/95 backdrop-blur-xs border border-border rounded-lg p-2.5 shadow-md text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">Légende :</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#85581A]"></span> Dépôt T.M.I.</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#d97706]"></span> À préparer / Prête</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]"></span> En cours de livraison</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span> Livrée</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]"></span> Problème / Échec</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeliveriesMap;
