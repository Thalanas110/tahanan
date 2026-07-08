import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getRoutingPathAStar, Point } from "@/lib/aStarRouting";

// Fix missing marker icons in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const SOSIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-8 h-8 bg-destructive rounded-full flex items-center justify-center animate-bounce shadow-xl border-2 border-white text-white font-bold text-xs">SOS</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface EmergencyMapProps {
  triggerLat: number;
  triggerLon: number;
  responderLat?: number;
  responderLon?: number;
}

export function EmergencyMap({ triggerLat, triggerLon, responderLat, responderLon }: EmergencyMapProps) {
  const [path, setPath] = useState<Point[]>([]);

  useEffect(() => {
    if (responderLat && responderLon) {
      const start = { lat: responderLat, lon: responderLon };
      const end = { lat: triggerLat, lon: triggerLon };
      
      getRoutingPathAStar(start, end).then((computedPath) => {
        setPath(computedPath);
      });
    }
  }, [triggerLat, triggerLon, responderLat, responderLon]);

  const center: [number, number] = responderLat && responderLon 
    ? [(triggerLat + responderLat) / 2, (triggerLon + responderLon) / 2]
    : [triggerLat, triggerLon];

  // Adjust zoom based on distance, but keep it simple with a default
  const defaultZoom = responderLat ? 13 : 15;

  return (
    <div className="w-full h-64 md:h-96 rounded-xl overflow-hidden border-2 border-border shadow-inner z-0 relative">
      <MapContainer center={center} zoom={defaultZoom} scrollWheelZoom={true} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[triggerLat, triggerLon]} icon={SOSIcon}>
          <Popup>
            <strong className="text-destructive">Emergency Location</strong>
          </Popup>
        </Marker>

        {responderLat && responderLon && (
          <Marker position={[responderLat, responderLon]}>
            <Popup>
              <strong>You are here</strong>
            </Popup>
          </Marker>
        )}

        {path.length > 0 && (
          <Polyline 
            positions={path.map(p => [p.lat, p.lon])} 
            color="#3b82f6" 
            weight={5} 
            opacity={0.7} 
            dashArray="10, 10" 
          />
        )}
      </MapContainer>
    </div>
  );
}
