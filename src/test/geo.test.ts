import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  estimatedRoadDistanceFallbackKm,
  calculateDeliveryFee,
  getGoogleMapsNavigationUrl,
  getWazeNavigationUrl,
  getAppleMapsNavigationUrl,
  getGeoSchemeUrl,
  getWhatsAppContactUrl,
  DEFAULT_TMI_DEPOT,
} from "@/lib/geo";

describe("Geo and Routing Utilities", () => {
  it("calculates Haversine distance correctly between known Senegal points", () => {
    // Dakar (14.7167, -17.4677) to Thiès (14.7910, -16.9359) ~ 58-60 km as the crow flies
    const dakarLat = 14.7167;
    const dakarLng = -17.4677;
    const thiesLat = 14.791;
    const thiesLng = -16.9359;

    const dist = haversineDistanceKm(dakarLat, dakarLng, thiesLat, thiesLng);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(70);

    // Same point should be 0 km
    expect(haversineDistanceKm(dakarLat, dakarLng, dakarLat, dakarLng)).toBe(0);
  });

  it("applies road detour factor for fallback distance", () => {
    const lat1 = DEFAULT_TMI_DEPOT.lat;
    const lng1 = DEFAULT_TMI_DEPOT.lng;
    const lat2 = 12.6;
    const lng2 = -12.1;

    const straightLine = haversineDistanceKm(lat1, lng1, lat2, lng2);
    const roadEstimate = estimatedRoadDistanceFallbackKm(lat1, lng1, lat2, lng2);

    expect(roadEstimate).toBeGreaterThan(straightLine);
    expect(roadEstimate).toBeCloseTo(straightLine * 1.28, 0);
  });

  describe("Automatic Kilometer-based Delivery Fee Calculation", () => {
    const settings = {
      base_fee: 0,
      price_per_km: 200,
      min_fee: 0,
      free_delivery_enabled: true,
      free_delivery_min_amount: 50000,
    };

    it("calculates exact road distance fee: distance_km × price_per_km (e.g. 12 km × 200 F = 2400 F)", () => {
      const result = calculateDeliveryFee({
        distanceKm: 12,
        subtotal: 25000,
        settings,
      });

      // 12 × 200 = 2 400 FCFA
      expect(result.isFreeDelivery).toBe(false);
      expect(result.fee).toBe(2400);
      expect(result.pricingMethod).toBe("DISTANCE_ROAD");
      expect(result.breakdown.distanceCost).toBe(2400);
      expect(result.breakdown.finalFee).toBe(2400);
      expect(result.explanation).toContain("12 km × 200");
    });

    it("calculates for any distance and custom price_per_km", () => {
      const customSettings = {
        base_fee: 0,
        price_per_km: 350,
        min_fee: 0,
        free_delivery_enabled: false,
        free_delivery_min_amount: 50000,
      };

      const result = calculateDeliveryFee({
        distanceKm: 18.5,
        subtotal: 10000,
        settings: customSettings,
      });

      // 18.5 * 350 = 6475
      expect(result.fee).toBe(6475);
      expect(result.pricingMethod).toBe("DISTANCE_ROAD");
    });

    it("grants free delivery when subtotal meets promo threshold", () => {
      const result = calculateDeliveryFee({
        distanceKm: 25,
        subtotal: 60000,
        settings,
      });

      expect(result.isFreeDelivery).toBe(true);
      expect(result.fee).toBe(0);
      expect(result.pricingMethod).toBe("FREE_DELIVERY_PROMO");
      expect(result.breakdown.finalFee).toBe(0);
    });

    it("returns NOT_CALCULATED when distance is 0 km (pending map selection)", () => {
      const result = calculateDeliveryFee({
        distanceKm: 0,
        subtotal: 15000,
        settings,
      });

      expect(result.fee).toBe(0);
      expect(result.pricingMethod).toBe("NOT_CALCULATED");
    });
  });

  describe("Mobile Navigation URL Generators", () => {
    it("generates correct Google Maps URLs with and without origin", () => {
      const urlWithoutOrigin = getGoogleMapsNavigationUrl(12.55, -12.17);
      expect(urlWithoutOrigin).toContain("https://www.google.com/maps/dir/");
      expect(urlWithoutOrigin).toContain("destination=12.55,-12.17");
      expect(urlWithoutOrigin).not.toContain("origin=");

      const urlWithOrigin = getGoogleMapsNavigationUrl(12.55, -12.17, 12.5, -12.1);
      expect(urlWithOrigin).toContain("origin=12.5,-12.1");
      expect(urlWithOrigin).toContain("destination=12.55,-12.17");
    });

    it("generates correct Waze URL", () => {
      const wazeUrl = getWazeNavigationUrl(14.71, -17.46);
      expect(wazeUrl).toBe("https://waze.com/ul?ll=14.71,-17.46&navigate=yes");
    });

    it("generates correct Apple Maps URL", () => {
      const appleUrl = getAppleMapsNavigationUrl(14.71, -17.46);
      expect(appleUrl).toBe("https://maps.apple.com/?daddr=14.71,-17.46&dirflg=d");
    });

    it("generates correct Geo scheme URL", () => {
      const geoUrl = getGeoSchemeUrl(14.71, -17.46);
      expect(geoUrl).toBe("geo:14.71,-17.46?q=14.71,-17.46");
    });

    it("generates Senegal WhatsApp links with proper 221 prefix", () => {
      const url1 = getWhatsAppContactUrl("771234567", "Bonjour TMI");
      expect(url1).toBe("https://wa.me/221771234567?text=Bonjour%20TMI");

      const url2 = getWhatsAppContactUrl("+221 77 123 45 67");
      expect(url2).toBe("https://wa.me/221771234567");
    });
  });
});
