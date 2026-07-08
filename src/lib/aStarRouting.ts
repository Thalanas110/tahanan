export interface Point {
  lat: number;
  lon: number;
}

export interface Node extends Point {
  id: string;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  neighbors: Node[];
}

// Haversine distance for heuristic (in km)
function calculateDistance(p1: Point, p2: Point): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Custom A* Algorithm
 * Evaluates a set of nodes to find the shortest path from start to goal.
 */
export function runAStar(nodes: Node[], startNode: Node, goalNode: Node): Point[] {
  const openSet: Node[] = [startNode];
  const closedSet: Set<string> = new Set();

  startNode.g = 0;
  startNode.h = calculateDistance(startNode, goalNode);
  startNode.f = startNode.g + startNode.h;

  while (openSet.length > 0) {
    // Find node with lowest f score
    let current = openSet[0];
    let currentIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < current.f) {
        current = openSet[i];
        currentIndex = i;
      }
    }

    // Check if we reached the goal
    if (current.id === goalNode.id) {
      const path: Point[] = [];
      let temp: Node | null = current;
      while (temp) {
        path.push({ lat: temp.lat, lon: temp.lon });
        temp = temp.parent;
      }
      return path.reverse();
    }

    openSet.splice(currentIndex, 1);
    closedSet.add(current.id);

    for (const neighbor of current.neighbors) {
      if (closedSet.has(neighbor.id)) {
        continue; // Already evaluated
      }

      const tentativeG = current.g + calculateDistance(current, neighbor);

      let isNewPath = false;
      if (!openSet.find((n) => n.id === neighbor.id)) {
        openSet.push(neighbor);
        isNewPath = true;
      } else if (tentativeG < neighbor.g) {
        isNewPath = true;
      }

      if (isNewPath) {
        neighbor.parent = current;
        neighbor.g = tentativeG;
        neighbor.h = calculateDistance(neighbor, goalNode);
        neighbor.f = neighbor.g + neighbor.h;
      }
    }
  }

  return []; // No path found
}

/**
 * Fetches a route from OSRM and runs our custom A* algorithm over its points.
 */
export async function getRoutingPathAStar(start: Point, end: Point): Promise<Point[]> {
  try {
    // 1. Get raw route from a real routing API (OSRM)
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson`
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch route from OSRM");
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return [start, end]; // Fallback to straight line
    }

    const coordinates = data.routes[0].geometry.coordinates as [number, number][]; // [lon, lat]
    
    // 2. Build graph nodes from the route for our custom A*
    const nodes: Node[] = coordinates.map((coord, i) => ({
      id: `node_${i}`,
      lat: coord[1],
      lon: coord[0],
      g: Infinity,
      h: 0,
      f: Infinity,
      parent: null,
      neighbors: [],
    }));

    // Connect neighbors (linear since it's a pre-calculated route)
    for (let i = 0; i < nodes.length; i++) {
      if (i > 0) nodes[i].neighbors.push(nodes[i - 1]);
      if (i < nodes.length - 1) nodes[i].neighbors.push(nodes[i + 1]);
    }

    const startNode = nodes[0];
    const goalNode = nodes[nodes.length - 1];

    // 3. Run Custom A* Algorithm
    return runAStar(nodes, startNode, goalNode);

  } catch (error) {
    console.error("Routing error:", error);
    // Fallback: Custom A* on just a straight line
    const startNode: Node = { ...start, id: 'start', g: Infinity, h: 0, f: Infinity, parent: null, neighbors: [] };
    const goalNode: Node = { ...end, id: 'end', g: Infinity, h: 0, f: Infinity, parent: null, neighbors: [] };
    startNode.neighbors.push(goalNode);
    goalNode.neighbors.push(startNode);
    
    return runAStar([startNode, goalNode], startNode, goalNode);
  }
}
