import L from "leaflet";

/**
 * Création d'icônes HTML/SVG vectorielles pour Leaflet.
 * Évite les problèmes de chemins d'images et assure un rendu net sur écrans Retina/HD.
 */

export const createDepotIcon = (name: string = "Dépôt T.M.I.") => {
  return L.divIcon({
    className: "tmi-depot-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #85581A; color: white; border: 2px solid #ffffff; border-radius: 9999px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); font-size: 18px;">
          🏢
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #85581A; margin-top: -1px;"></div>
        <div style="background: rgba(30, 20, 10, 0.85); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-top: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          ${name}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export const createDestinationIcon = (label: string = "Destination", isDraggable: boolean = false) => {
  return L.divIcon({
    className: "tmi-destination-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: ${isDraggable ? "grab" : "pointer"};">
        <div style="background: #15803d; color: white; border: 2px solid #ffffff; border-radius: 9999px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(21,128,61,0.45); font-size: 18px; animation: ${isDraggable ? "bounce 1.5s infinite" : "none"};">
          📍
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #15803d; margin-top: -1px;"></div>
        <div style="background: rgba(15, 23, 42, 0.9); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-top: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          ${label} ${isDraggable ? "• Déplaçable" : ""}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export const createDriverLiveIcon = (driverName: string = "Livreur en route") => {
  return L.divIcon({
    className: "tmi-driver-live-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; top: -5px;"></div>
        <div style="background: #2563eb; color: white; border: 2px solid #ffffff; border-radius: 9999px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.45); font-size: 18px; z-index: 10;">
          🚚
        </div>
        <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #2563eb; margin-top: -1px; z-index: 10;"></div>
        <div style="background: rgba(15, 23, 42, 0.9); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-top: 2px; z-index: 10;">
          ${driverName}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

export const createStatusDeliveryIcon = (status: string, orderNumber: string) => {
  let bg = "#6b7280";
  let emoji = "📦";

  switch (status) {
    case "A_PREPARER":
    case "PRETE":
      bg = "#d97706";
      emoji = "⏳";
      break;
    case "AFFECTEE":
      bg = "#2563eb";
      emoji = "👤";
      break;
    case "EN_COURS":
      bg = "#4f46e5";
      emoji = "🚚";
      break;
    case "LIVREE":
      bg = "#16a34a";
      emoji = "✓";
      break;
    case "ECHEC":
    case "CLIENT_ABSENT":
    case "ADRESSE_INCORRECTE":
      bg = "#dc2626";
      emoji = "⚠";
      break;
    case "REPORTEE":
      bg = "#9333ea";
      emoji = "📅";
      break;
  }

  return L.divIcon({
    className: "tmi-status-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: ${bg}; color: white; border: 2px solid #ffffff; border-radius: 9999px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.25); font-size: 14px; font-weight: bold;">
          ${emoji}
        </div>
        <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${bg}; margin-top: -1px;"></div>
        <div style="background: rgba(15, 23, 42, 0.85); color: #fff; font-size: 9px; font-weight: 600; padding: 1px 4px; border-radius: 3px; white-space: nowrap; margin-top: 1px;">
          ${orderNumber}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};
