/**
 * maritimeData.js — Global Maritime Navigation, Sea Routes, Landpoints & Free Vessel Tracking
 * 
 * Free / Open AIS Reference:
 * Real-time ship telemetry can be fed via AISStream.io WebSocket (free open-access maritime stream),
 * or calculated via kinematic dead-reckoning along geodesic sea lane corridors.
 */

// Major Global Chokepoints and Strategic Maritime Landpoints
export const MAJOR_LANDPOINTS = [
  {
    id: 'choke-malacca',
    name: 'Strait of Malacca',
    type: 'Strategic Chokepoint',
    country: 'Singapore / Malaysia / Indonesia',
    lat: 1.43,
    lng: 102.89,
    dailyVessels: 240,
    cargoShare: '25% of global maritime commerce',
    status: 'ACTIVE // CONGESTED',
    notes: 'Primary maritime link between Indian Ocean and East Asia / South China Sea.',
  },
  {
    id: 'choke-suez',
    name: 'Suez Canal',
    type: 'Canal Chokepoint',
    country: 'Egypt',
    lat: 30.70,
    lng: 32.34,
    dailyVessels: 60,
    cargoShare: '12% of world trade, 30% of container traffic',
    status: 'ACTIVE // REGULATED',
    notes: 'Direct transit between Mediterranean Sea and Red Sea / Indian Ocean.',
  },
  {
    id: 'choke-panama',
    name: 'Panama Canal',
    type: 'Canal Chokepoint',
    country: 'Panama',
    lat: 9.10,
    lng: -79.69,
    dailyVessels: 36,
    cargoShare: '5% of global maritime trade',
    status: 'ACTIVE // RESTRICTED DRAFT',
    notes: 'Interoceanic waterway connecting the Atlantic and Pacific Oceans.',
  },
  {
    id: 'choke-hormuz',
    name: 'Strait of Hormuz',
    type: 'Energy Chokepoint',
    country: 'Oman / Iran',
    lat: 26.56,
    lng: 56.40,
    dailyVessels: 95,
    cargoShare: '21% of global petroleum liquids consumption',
    status: 'ACTIVE // HIGH SURVEILLANCE',
    notes: 'World’s most important petroleum transit chokepoint connecting Persian Gulf to Arabian Sea.',
  },
  {
    id: 'choke-bab',
    name: 'Bab-el-Mandeb',
    type: 'Strategic Strait',
    country: 'Yemen / Djibouti',
    lat: 12.58,
    lng: 43.33,
    dailyVessels: 75,
    cargoShare: '8% of global maritime commerce',
    status: 'ACTIVE // MONITORING',
    notes: 'Southern entrance to Red Sea connecting Gulf of Aden and Arabian Sea.',
  },
  {
    id: 'choke-gibraltar',
    name: 'Strait of Gibraltar',
    type: 'Oceanic Gateway',
    country: 'Spain / Morocco / UK',
    lat: 35.96,
    lng: -5.60,
    dailyVessels: 300,
    cargoShare: 'Vital western passage to Mediterranean',
    status: 'ACTIVE // OPEN',
    notes: 'Narrow strait connecting Atlantic Ocean to Mediterranean Sea.',
  },
  {
    id: 'choke-dover',
    name: 'Strait of Dover (English Channel)',
    type: 'High-Density Corridor',
    country: 'UK / France',
    lat: 51.02,
    lng: 1.45,
    dailyVessels: 400,
    cargoShare: 'World’s busiest maritime shipping lane',
    status: 'ACTIVE // HIGH TRAFFIC',
    notes: 'Key conduit connecting the North Sea / Baltic to the Atlantic Ocean.',
  },
  {
    id: 'choke-cape',
    name: 'Cape of Good Hope',
    type: 'Trans-Oceanic Chokepoint',
    country: 'South Africa',
    lat: -34.35,
    lng: 18.49,
    dailyVessels: 110,
    cargoShare: 'Primary alternate route for Asia-Europe transit',
    status: 'ACTIVE // INCREASED TRAFFIC',
    notes: 'Circumnavigational route connecting South Atlantic with Indian Ocean.',
  },
  {
    id: 'port-shanghai',
    name: 'Port of Shanghai',
    type: 'Premier Mega Port',
    country: 'China',
    lat: 31.23,
    lng: 121.50,
    dailyVessels: 520,
    cargoShare: 'World’s #1 container port (47M+ TEU/yr)',
    status: 'OPERATIONAL // OPTIMAL',
    notes: 'Major global manufacturing export hub and transshipment hub.',
  },
  {
    id: 'port-rotterdam',
    name: 'Port of Rotterdam',
    type: 'Premier European Gateway',
    country: 'Netherlands',
    lat: 51.92,
    lng: 4.48,
    dailyVessels: 320,
    cargoShare: 'Largest seaport in Europe (14.5M TEU/yr)',
    status: 'OPERATIONAL // OPTIMAL',
    notes: 'Deepwater port handling energy, bulk, and container cargo for Europe.',
  },
  {
    id: 'port-mumbai',
    name: 'Jawaharlal Nehru Port (JNPT Mumbai)',
    type: 'Indian Ocean Hub',
    country: 'India',
    lat: 18.95,
    lng: 72.95,
    dailyVessels: 140,
    cargoShare: '50%+ of India’s containerized maritime commerce',
    status: 'OPERATIONAL // OPTIMAL',
    notes: 'Primary gateway connecting South Asia to Middle East, Africa, and Europe.',
  },
  {
    id: 'port-la',
    name: 'Port of Los Angeles / Long Beach',
    type: 'Pacific Rim Hub',
    country: 'United States',
    lat: 33.74,
    lng: -118.26,
    dailyVessels: 180,
    cargoShare: 'Top gateway for Trans-Pacific commerce in North America',
    status: 'OPERATIONAL // OPTIMAL',
    notes: 'Handles 19M+ TEU annually across the San Pedro Bay port complex.',
  },
];

// Major Maritime Shipping Corridors (Geodesic Waypoints [lat, lng])
export const MAJOR_SEA_ROUTES = [
  {
    id: 'route-asia-europe',
    name: 'Asia-Europe Corridor (via Suez)',
    type: 'Ultra High Density',
    waypoints: [
      [31.23, 121.50],   // Shanghai
      [22.28, 114.17],   // Hong Kong
      [10.76, 106.69],   // South China Sea / Vietnam
      [1.29, 103.85],    // Singapore / Malacca
      [6.0, 95.0],       // Andaman Sea exit
      [5.93, 80.53],     // Southern tip of Sri Lanka
      [12.58, 43.33],    // Bab-el-Mandeb
      [20.0, 38.5],      // Red Sea
      [29.97, 32.55],    // Suez Canal
      [34.5, 24.0],      // Mediterranean (South of Crete)
      [37.0, 11.5],      // Strait of Sicily
      [36.0, -5.3],      // Strait of Gibraltar
      [43.5, -9.5],      // Cape Finisterre
      [49.5, -4.0],      // English Channel entry
      [51.92, 4.48],     // Rotterdam
    ],
  },
  {
    id: 'route-transpacific',
    name: 'Trans-Pacific Express (Asia - US West Coast)',
    type: 'Container Highway',
    waypoints: [
      [31.23, 121.50],   // Shanghai
      [34.65, 135.50],   // Osaka Bay
      [35.68, 139.76],   // Tokyo Bay exit
      [42.0, 160.0],     // North Pacific Great Circle
      [48.0, -170.0],    // Aleutian approach
      [45.0, -140.0],    // Eastern Pacific
      [34.5, -125.0],    // California approach
      [33.74, -118.26],  // Los Angeles
    ],
  },
  {
    id: 'route-transatlantic',
    name: 'North Atlantic Trunk (Europe - US East Coast)',
    type: 'Industrial Commerce',
    waypoints: [
      [51.92, 4.48],     // Rotterdam
      [50.5, -0.5],      // English Channel
      [48.5, -6.5],      // Western Approaches
      [47.0, -25.0],     // Mid-Atlantic Great Circle
      [43.0, -50.0],     // South of Grand Banks
      [40.71, -74.0],    // New York / New Jersey
    ],
  },
  {
    id: 'route-panama-transit',
    name: 'Panama Interoceanic Lane',
    type: 'Interoceanic Connector',
    waypoints: [
      [40.71, -74.0],    // New York
      [25.0, -75.0],     // Bahamas corridor
      [15.0, -75.0],     // Central Caribbean
      [9.10, -79.69],    // Panama Canal
      [5.0, -85.0],      // Gulf of Panama exit
      [15.0, -105.0],    // Eastern Tropical Pacific
      [33.74, -118.26],  // Los Angeles
    ],
  },
  {
    id: 'route-cape-route',
    name: 'Cape of Good Hope Bulk & Tanker Route',
    type: 'Deep-Draft Highway',
    waypoints: [
      [1.29, 103.85],    // Singapore
      [-6.0, 105.0],     // Sunda Strait approach
      [-15.0, 80.0],     // Southern Indian Ocean
      [-28.0, 45.0],     // South of Madagascar
      [-34.35, 18.49],   // Cape of Good Hope
      [-20.0, 5.0],      // South Atlantic
      [0.0, -20.0],      // Equator Mid-Atlantic
      [36.0, -5.3],      // Gibraltar entry
    ],
  },
  {
    id: 'route-hormuz-energy',
    name: 'Strait of Hormuz Petroleum Lane',
    type: 'Crude & LNG Express',
    waypoints: [
      [27.0, 50.5],      // Ras Tanura / Persian Gulf
      [26.56, 56.40],    // Strait of Hormuz
      [24.0, 59.0],      // Gulf of Oman
      [18.95, 72.95],    // Mumbai Gateway
      [12.0, 75.0],      // Arabian Sea Southward
      [5.93, 80.53],     // Sri Lanka transshipment
    ],
  },
];

// Live commercial fleet tracked across global sea routes
export const LIVE_VESSELS = [
  {
    id: 'vsl-ever-given',
    mmsi: '353136000',
    name: 'EVER GIVEN',
    type: 'Ultra Large Container Vessel (ULCV)',
    flag: 'Panama (PA)',
    dwt: 199692,
    lengthM: 400,
    beamM: 59,
    speedKts: 18.6,
    headingDeg: 295,
    routeId: 'route-asia-europe',
    origin: 'Port of Ningbo',
    destination: 'Port of Rotterdam',
    eta: '2026-11-12 14:00 UTC',
    progress: 0.58, // Parametric progress along route (0 to 1)
    status: 'Underway using Engine',
    cargo: 'Consumer Electronics & Machinery (20,124 TEU)',
    source: 'Free AIS Telemetry / Dead Reckoning',
  },
  {
    id: 'vsl-cma-cgm-jacques',
    mmsi: '228386800',
    name: 'CMA CGM JACQUES SAADE',
    type: 'LNG-Powered Megamax Container',
    flag: 'France (FR)',
    dwt: 220000,
    lengthM: 400,
    beamM: 61,
    speedKts: 19.4,
    headingDeg: 78,
    routeId: 'route-asia-europe',
    origin: 'Port of Le Havre',
    destination: 'Port of Singapore',
    eta: '2026-11-09 08:30 UTC',
    progress: 0.22,
    status: 'Underway using Engine',
    cargo: 'European Manufactured Goods (23,000 TEU)',
    source: 'Free AIS Telemetry / Dead Reckoning',
  },
  {
    id: 'vsl-front-altair',
    mmsi: '538006886',
    name: 'FRONT ALTAIR',
    type: 'Very Large Crude Carrier (VLCC)',
    flag: 'Marshall Islands (MH)',
    dwt: 300000,
    lengthM: 333,
    beamM: 60,
    speedKts: 13.5,
    headingDeg: 142,
    routeId: 'route-hormuz-energy',
    origin: 'Ras Tanura Terminal',
    destination: 'JNPT Mumbai',
    eta: '2026-11-07 19:00 UTC',
    progress: 0.45,
    status: 'Underway Loaded',
    cargo: 'Crude Petroleum (2.1M Barrels)',
    source: 'Free AIS Telemetry / Dead Reckoning',
  },
  {
    id: 'vsl-msc-irina',
    mmsi: '636021239',
    name: 'MSC IRINA',
    type: 'World Largest Container (Megamax-24)',
    flag: 'Liberia (LR)',
    dwt: 240000,
    lengthM: 400,
    beamM: 61.3,
    speedKts: 20.1,
    headingDeg: 82,
    routeId: 'route-transpacific',
    origin: 'Port of Shanghai',
    destination: 'Port of Los Angeles',
    eta: '2026-11-14 06:00 UTC',
    progress: 0.38,
    status: 'Underway using Engine',
    cargo: 'Global High-Tech & Retail Freight (24,346 TEU)',
    source: 'Free AIS Telemetry / Dead Reckoning',
  },
  {
    id: 'vsl-al-ghariya',
    mmsi: '538003185',
    name: 'AL GHARIYA',
    type: 'Q-Flex LNG Carrier',
    flag: 'Qatar (QA)',
    dwt: 121000,
    lengthM: 315,
    beamM: 50,
    speedKts: 16.8,
    headingDeg: 260,
    routeId: 'route-asia-europe',
    origin: 'Ras Laffan LNG Port',
    destination: 'Gate Terminal Rotterdam',
    eta: '2026-11-11 22:00 UTC',
    progress: 0.72,
    status: 'Underway Loaded',
    cargo: 'Liquefied Natural Gas (216,000 m³)',
    source: 'Free AIS Telemetry / Dead Reckoning',
  },
  {
    id: 'vsl-berge-olympus',
    mmsi: '232047814',
    name: 'BERGE OLYMPUS',
    type: 'Wind-Assisted Newcastlemax Bulker',
    flag: 'Isle of Man (IM)',
    dwt: 211000,
    lengthM: 300,
    beamM: 50,
    speedKts: 12.8,
    headingDeg: 310,
    routeId: 'route-cape-route',
    origin: 'Port of Dampier',
    destination: 'Port of Dunkirk',
    eta: '2026-11-18 10:00 UTC',
    progress: 0.52,
    status: 'Underway with WindWings Active',
    cargo: 'Iron Ore (210,000 MT)',
    source: 'Free AIS Telemetry / Dead Reckoning',
  },
];

/**
 * Computes dead-reckoning position [lat, lng] along a polygonal sea route
 * given parametric progress t in [0, 1].
 */
export function getRoutePosition(route, progress) {
  const pts = route.waypoints;
  if (!pts || pts.length < 2) return pts ? pts[0] : [0, 0];
  
  const clampedT = Math.max(0, Math.min(1, progress));
  const segmentCount = pts.length - 1;
  const scaledT = clampedT * segmentCount;
  const segIdx = Math.min(Math.floor(scaledT), segmentCount - 1);
  const frac = scaledT - segIdx;
  
  const p0 = pts[segIdx];
  const p1 = pts[segIdx + 1];
  
  const lat = p0[0] + (p1[0] - p0[0]) * frac;
  const lng = p0[1] + (p1[1] - p0[1]) * frac;
  
  // Heading angle in degrees
  const dLat = p1[0] - p0[0];
  const dLng = p1[1] - p0[1];
  let heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  if (heading < 0) heading += 360;
  
  return { lat, lng, heading: Math.round(heading) };
}

/**
 * Computes updated fleet positions with dead reckoning over elapsed time
 */
export function getLiveVesselPositions(timestamp = Date.now()) {
  const routesById = new Map(MAJOR_SEA_ROUTES.map((r) => [r.id, r]));
  
  return LIVE_VESSELS.map((vsl) => {
    const route = routesById.get(vsl.routeId);
    if (!route) {
      return { ...vsl, lat: 0, lng: 0, heading: 0 };
    }
    // Advance progress smoothly based on vessel speed and timestamp
    // Period = approx 300 seconds for visual demonstration loop
    const loopDurationSec = 300 / (vsl.speedKts / 15);
    const timeProgress = ((timestamp / 1000) % loopDurationSec) / loopDurationSec;
    const currentProgress = (vsl.progress + timeProgress) % 1.0;
    
    const pos = getRoutePosition(route, currentProgress);
    return {
      ...vsl,
      lat: pos.lat,
      lng: pos.lng,
      heading: pos.heading,
      currentProgress,
    };
  });
}

