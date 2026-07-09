import { useEffect, useState } from "react";
import { getRoutingPathAStar, Point } from "@/lib/aStarRouting";

export function useEmergencyMapLogic({
  triggerLat,
  triggerLon,
  responderLat,
  responderLon,
}: {
  triggerLat: number;
  triggerLon: number;
  responderLat?: number;
  responderLon?: number;
}) {
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

  return { path, center, defaultZoom };
}
