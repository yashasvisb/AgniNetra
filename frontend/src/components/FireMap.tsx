import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import {
  getLiveFires,
  predictLiveFire,
  getGISLayer,
  getEmergencyRoute,
} from "../services/api";

// ============================================================
// DESIGN TOKENS
// ============================================================

const PANEL_BG = "rgba(8, 9, 11, 0.94)";
const PANEL_BORDER = "1px solid rgba(255, 255, 255, 0.08)";
const PANEL_SHADOW = "0 12px 32px rgba(0, 0, 0, 0.45)";
const PANEL_RADIUS = "12px";
const FONT =
  "'Instrument Sans', 'Segoe UI', system-ui, -apple-system, sans-serif";
const BRAND_ACCENT = "#c1440e";

// ============================================================
// TYPES
// ============================================================

interface LiveFire {
  latitude: number;
  longitude: number;
  frp?: number;
  acq_date?: string;
  acq_datetime?: string;
  satellite?: string;
  instrument?: string;
  confidence?: string | number;
  daynight?: string;
  acq_time?: number | string;
  bright_ti4?: number;
  bright_ti5?: number;
  scan?: number;
  track?: number;
}

type PriorityLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

interface FirePriority {
  level: PriorityLevel;
  reasons?: string[];
  score?: number;
}

interface AnalysisResult {
  prediction?: {
    predicted_class?: string;
    confidence?: number;
    probabilities?: Record<string, number>;
  };
  industrial_association?: {
    level?: string;
    evidence?: string[];
    context_score?: number;
  };
  gas_assessment?: {
    assessment?: string;
    evidence?: string[];
    score?: number;
  };
  supporting_evidence?: string[];
  context_distance_m?: number;
  priority?: FirePriority;
}

interface GISPoint {
  latitude: number;
  longitude: number;
  value: number;
}

type LayerName =
  | "landCover"
  | "ndvi"
  | "ndwi"
  | "ndbi"
  | "no2"
  | "so2"
  | "co"
  | "ch4"
  | "persistence";

interface GISLayers {
  firms: boolean;
  landCover: boolean;
  ndvi: boolean;
  ndwi: boolean;
  ndbi: boolean;
  no2: boolean;
  so2: boolean;
  co: boolean;
  ch4: boolean;
  persistence: boolean;
}

// ---- Emergency route types ----

interface RouteStation {
  station_id: number;
  station_name: string;
  district: string;
  coordinate_status?: string;
  station_latitude: number;
  station_longitude: number;
  straight_line_distance_km: number;
  road_distance_km: number;
  eta_minutes: number;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
}

interface RouteResponse {
  recommended_station: RouteStation;
  alternatives: RouteStation[];
  candidates_checked: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const PRIORITY_COLORS: Record<PriorityLevel | "NOT_ANALYZED", string> = {
  CRITICAL: "#ff3030",
  HIGH: "#ff8c00",
  MODERATE: "#ffd21c",
  LOW: "#32c759",
  NOT_ANALYZED: "#f59e0b",
};

const PRIORITY_BACKGROUNDS: Record<PriorityLevel, string> = {
  CRITICAL: "#fff0f0",
  HIGH: "#fff7ed",
  MODERATE: "#fffbea",
  LOW: "#f2faf3",
};

const GIS_LAYER_NAMES: LayerName[] = [
  "landCover",
  "ndvi",
  "ndwi",
  "ndbi",
  "no2",
  "so2",
  "co",
  "ch4",
  "persistence",
];

// Same colour scale is used for all four gas anomaly layers
const ANOMALY_LEGEND_ITEMS = [
  { label: "< 0×", color: "#4c78a8" },
  { label: "0 – 1×", color: "#9ecae1" },
  { label: "1 – 2×", color: "#fddc7a" },
  { label: "2 – 4×", color: "#f28e2b" },
  { label: "> 4×", color: "#d73027" },
];

// ============================================================
// HELPERS
// ============================================================

function isPriorityLevel(value: string): value is PriorityLevel {
  return (
    value === "CRITICAL" ||
    value === "HIGH" ||
    value === "MODERATE" ||
    value === "LOW"
  );
}

function normalizePriorityResult(result: any): AnalysisResult {
  const backendResult =
    result?.analysis || result?.result || result?.data || result || {};

  const rawPriority = backendResult?.priority;

  let normalizedLevel: PriorityLevel | undefined;
  let priorityObject: any = {};

  if (
    rawPriority &&
    typeof rawPriority === "object" &&
    !Array.isArray(rawPriority)
  ) {
    priorityObject = rawPriority;

    const possible = String(
      rawPriority.level ||
        rawPriority.priority ||
        rawPriority.classification ||
        ""
    )
      .trim()
      .toUpperCase();

    if (isPriorityLevel(possible)) {
      normalizedLevel = possible;
    }
  }

  if (typeof rawPriority === "string") {
    const possible = rawPriority.trim().toUpperCase();

    if (isPriorityLevel(possible)) {
      normalizedLevel = possible;
    }
  }

  if (!normalizedLevel) {
    const possible = String(
      backendResult?.priority_level || backendResult?.priority_class || ""
    )
      .trim()
      .toUpperCase();

    if (isPriorityLevel(possible)) {
      normalizedLevel = possible;
    }
  }

  return {
    ...backendResult,
    priority: normalizedLevel
      ? { ...priorityObject, level: normalizedLevel }
      : undefined,
  };
}

/**
 * Mapbox returns GeoJSON coordinates as [longitude, latitude].
 * Leaflet needs [latitude, longitude], so we swap them here.
 */
function geometryToLatLng(geometry: any): [number, number][] {
  const coordinates = geometry?.coordinates;

  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .filter((point: any) => Array.isArray(point) && point.length >= 2)
    .map(
      (point: any) => [Number(point[1]), Number(point[0])] as [number, number]
    )
    .filter(
      ([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon)
    );
}

// ============================================================
// SMALL REUSABLE POPUP PIECES
// ============================================================

function InfoCard({
  title,
  children,
  background = "#f7f7f7",
  border = "1px solid #ddd",
}: {
  title: string;
  children: ReactNode;
  background?: string;
  border?: string;
}) {
  return (
    <div
      style={{
        marginTop: "12px",
        padding: "11px",
        borderRadius: "7px",
        background,
        border,
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 800,
          color: "#777",
          letterSpacing: "0.5px",
          marginBottom: "7px",
        }}
      >
        {title}
      </div>

      {children}
    </div>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: "7px" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}
        >
          • {item}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// WORLD → ODISHA ANIMATION
// ============================================================

function WorldToOdisha() {
  const map = useMap();

  useEffect(() => {
    map.setView([20, 0], 2, { animate: false });

    const timer = window.setTimeout(() => {
      map.flyTo([20.3, 84.5], 7, { animate: true, duration: 2.5 });
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

// ============================================================
// ZOOM MAP TO THE EMERGENCY ROUTE
// ============================================================

function FitRoute({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [70, 70] });
    }
  }, [positions, map]);

  return null;
}

// ============================================================
// GIS LEGEND
// ============================================================

function GISLegend({ layer }: { layer: LayerName }) {
  const legends: Record<
    LayerName,
    { title: string; items: { label: string; color: string }[] }
  > = {
    landCover: {
      title: "Land Cover",
      items: [
        { label: "Water", color: "#3498db" },
        { label: "Trees", color: "#228b22" },
        { label: "Grass", color: "#7fbf5b" },
        { label: "Flooded vegetation", color: "#20b2aa" },
        { label: "Crops", color: "#d4b84c" },
        { label: "Shrub", color: "#8fbc8f" },
        { label: "Built-up", color: "#d95f59" },
        { label: "Bare", color: "#b9a58a" },
        { label: "Snow / ice", color: "#f5f5f5" },
      ],
    },
    ndvi: {
      title: "NDVI",
      items: [
        { label: "< 0", color: "#b56576" },
        { label: "0 – 0.2", color: "#e6a23c" },
        { label: "0.2 – 0.4", color: "#d6c44c" },
        { label: "0.4 – 0.6", color: "#7cb342" },
        { label: "> 0.6", color: "#1b8a3b" },
      ],
    },
    ndwi: {
      title: "NDWI",
      items: [
        { label: "< -0.3", color: "#8c510a" },
        { label: "-0.3 – 0", color: "#d8b365" },
        { label: "0 – 0.3", color: "#80cdc1" },
        { label: "> 0.3", color: "#016c9a" },
      ],
    },
    ndbi: {
      title: "NDBI",
      items: [
        { label: "< -0.2", color: "#1a9850" },
        { label: "-0.2 – 0", color: "#91cf60" },
        { label: "0 – 0.2", color: "#fee08b" },
        { label: "0.2 – 0.4", color: "#f46d43" },
        { label: "> 0.4", color: "#d73027" },
      ],
    },
    no2: { title: "NO₂ Anomaly", items: ANOMALY_LEGEND_ITEMS },
    so2: { title: "SO₂ Anomaly", items: ANOMALY_LEGEND_ITEMS },
    co: { title: "CO Anomaly", items: ANOMALY_LEGEND_ITEMS },
    ch4: { title: "CH₄ Anomaly", items: ANOMALY_LEGEND_ITEMS },
    persistence: {
      title: "Fire Persistence",
      items: [
        { label: "0", color: "#7f7f7f" },
        { label: "1 – 9", color: "#f6d55c" },
        { label: "10 – 49", color: "#ed9b40" },
        { label: "50 – 99", color: "#e76f51" },
        { label: "100+", color: "#b2182b" },
      ],
    },
  };

  const legend = legends[layer];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "18px",
        left: "18px",
        zIndex: 1000,
        background: PANEL_BG,
        border: PANEL_BORDER,
        color: "white",
        padding: "14px 16px",
        borderRadius: PANEL_RADIUS,
        minWidth: "150px",
        maxWidth: "195px",
        boxShadow: PANEL_SHADOW,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.3px",
          marginBottom: "10px",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        {legend.title}
      </div>

      {legend.items.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: item.color,
              display: "inline-block",
              flexShrink: 0,
              border: item.color === "#f5f5f5" ? "1px solid #999" : "none",
            }}
          />

          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// FIRMS PRIORITY LEGEND
// ============================================================

function FirePriorityLegend() {
  const items: Array<[PriorityLevel, string]> = [
    ["CRITICAL", PRIORITY_COLORS.CRITICAL],
    ["HIGH", PRIORITY_COLORS.HIGH],
    ["MODERATE", PRIORITY_COLORS.MODERATE],
    ["LOW", PRIORITY_COLORS.LOW],
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "18px",
        left: "18px",
        zIndex: 1000,
        background: PANEL_BG,
        border: PANEL_BORDER,
        color: "white",
        padding: "14px 16px",
        borderRadius: PANEL_RADIUS,
        minWidth: "160px",
        boxShadow: PANEL_SHADOW,
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.3px",
          marginBottom: "10px",
          color: "rgba(255,255,255,0.85)",
        }}
      >
        Fire response priority
      </div>

      {items.map(([label, color]) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
            fontSize: "11px",
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: color,
              display: "inline-block",
              flexShrink: 0,
            }}
          />

          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// GIS LAYER CONTROL
// ============================================================

interface GISLayerControlProps {
  layers: GISLayers;
  setLayers: Dispatch<SetStateAction<GISLayers>>;
}

function GISLayerControl({ layers, setLayers }: GISLayerControlProps) {
  const [minimized, setMinimized] = useState(false);

  const toggleLayer = (layer: keyof GISLayers) => {
    setLayers((previous) => ({
      ...previous,
      [layer]: !previous[layer],
    }));
  };

  const renderCheckbox = (key: keyof GISLayers, label: string) => (
    <label
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "8px",
        cursor: "pointer",
        color: "rgba(255,255,255,0.8)",
      }}
    >
      <input
        type="checkbox"
        checked={layers[key]}
        onChange={() => toggleLayer(key)}
        style={{ accentColor: BRAND_ACCENT }}
      />

      {label}
    </label>
  );

  if (minimized) {
    return (
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 1000,
          background: PANEL_BG,
          border: PANEL_BORDER,
          padding: "10px 14px",
          borderRadius: PANEL_RADIUS,
          color: "white",
          boxShadow: PANEL_SHADOW,
        }}
      >
        <button
          onClick={() => setMinimized(false)}
          style={{
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            padding: 0,
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: FONT,
          }}
        >
          GIS Layers ▲
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        zIndex: 1000,
        background: PANEL_BG,
        border: PANEL_BORDER,
        padding: "16px",
        borderRadius: PANEL_RADIUS,
        color: "white",
        width: "215px",
        boxShadow: PANEL_SHADOW,
        fontSize: "13px",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ fontWeight: 700, letterSpacing: "0.2px" }}>
          GIS Layers
        </div>

        <button
          onClick={() => setMinimized(true)}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "white",
            cursor: "pointer",
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            fontSize: "14px",
            padding: 0,
          }}
        >
          −
        </button>
      </div>

      {renderCheckbox("firms", "Live FIRMS")}
      {renderCheckbox("landCover", "Land cover")}
      {renderCheckbox("ndvi", "NDVI")}
      {renderCheckbox("ndwi", "NDWI")}
      {renderCheckbox("ndbi", "NDBI")}

      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.1)",
          margin: "10px 0",
        }}
      />

      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          opacity: 0.55,
          marginBottom: "8px",
        }}
      >
        Atmospheric
      </div>

      {renderCheckbox("no2", "NO₂ anomaly")}
      {renderCheckbox("so2", "SO₂ anomaly")}
      {renderCheckbox("co", "CO anomaly")}
      {renderCheckbox("ch4", "CH₄ anomaly")}

      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.1)",
          margin: "10px 0",
        }}
      />

      {renderCheckbox("persistence", "Fire persistence")}
    </div>
  );
}

// ============================================================
// GIS DATA LAYER
// ============================================================

interface GISDataLayerProps {
  layer: LayerName;
  points: GISPoint[];
}

function GISDataLayer({ layer, points }: GISDataLayerProps) {
  const getColor = (value: number): string => {
    if (layer === "landCover") {
      const colors: Record<number, string> = {
        0: "#3498db",
        1: "#228b22",
        2: "#7fbf5b",
        3: "#20b2aa",
        4: "#d4b84c",
        5: "#8fbc8f",
        6: "#d95f59",
        7: "#b9a58a",
        8: "#f5f5f5",
      };

      return colors[Math.round(value)] || "#999999";
    }

    if (layer === "ndvi") {
      if (value < 0) return "#b56576";
      if (value < 0.2) return "#e6a23c";
      if (value < 0.4) return "#d6c44c";
      if (value < 0.6) return "#7cb342";
      return "#1b8a3b";
    }

    if (layer === "ndwi") {
      if (value < -0.3) return "#8c510a";
      if (value < 0) return "#d8b365";
      if (value < 0.3) return "#80cdc1";
      return "#016c9a";
    }

    if (layer === "ndbi") {
      if (value < -0.2) return "#1a9850";
      if (value < 0) return "#91cf60";
      if (value < 0.2) return "#fee08b";
      if (value < 0.4) return "#f46d43";
      return "#d73027";
    }

    if (
      layer === "no2" ||
      layer === "so2" ||
      layer === "co" ||
      layer === "ch4"
    ) {
      if (value < 0) return "#4c78a8";
      if (value < 1) return "#9ecae1";
      if (value < 2) return "#fddc7a";
      if (value < 4) return "#f28e2b";
      return "#d73027";
    }

    if (layer === "persistence") {
      if (value <= 0) return "#7f7f7f";
      if (value < 10) return "#f6d55c";
      if (value < 50) return "#ed9b40";
      if (value < 100) return "#e76f51";
      return "#b2182b";
    }

    return "#ffffff";
  };

  return (
    <>
      {points.map((point, index) => {
        const color = getColor(point.value);

        return (
          <CircleMarker
            key={`${layer}-${index}`}
            center={[point.latitude, point.longitude]}
            radius={layer === "persistence" ? 4 : 3}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.35,
              weight: 0,
            }}
          />
        );
      })}
    </>
  );
}

// ============================================================
// MAIN FIRE MAP
// ============================================================

function FireMap() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [fires, setFires] = useState<LiveFire[]>([]);

  const [analysis, setAnalysis] = useState<Record<string, AnalysisResult>>(
    {}
  );

  const [loadingFire, setLoadingFire] = useState<Record<string, boolean>>({});

  // ---- Emergency route state ----
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeFireKey, setRouteFireKey] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [layers, setLayers] = useState<GISLayers>({
    firms: true,
    landCover: false,
    ndvi: false,
    ndwi: false,
    ndbi: false,
    no2: false,
    so2: false,
    co: false,
    ch4: false,
    persistence: false,
  });

  const [gisData, setGISData] = useState<Record<string, GISPoint[]>>({});

  const [loadingGIS, setLoadingGIS] = useState<string | null>(null);

  // ==========================================================
  // REFS
  // ==========================================================

  const analysisRef = useRef<Record<string, AnalysisResult>>({});
  const analyzingRef = useRef<Set<string>>(new Set());

  // Keep analysis ref synchronized with analysis state
  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);

  // ==========================================================
  // FIRE KEY (unique id for each fire)
  // ==========================================================

  const getFireKey = (fire: LiveFire): string => {
    const lat = Number(fire.latitude ?? 0);
    const lng = Number(fire.longitude ?? 0);

    return `${lat.toFixed(6)}-${lng.toFixed(6)}-${fire.acq_date || ""}-${
      fire.acq_time || ""
    }`;
  };

  // ==========================================================
  // EMERGENCY ROUTE
  // ==========================================================

  async function calculateEmergencyRoute(fire: LiveFire) {
    const key = getFireKey(fire);

    setLoadingRoute(true);
    setRouteFireKey(key);
    setRouteData(null);
    setRouteError(null);

    try {
      const result = await getEmergencyRoute(fire.latitude, fire.longitude);

      console.log("Agni Netra - Emergency route:", result);

      setRouteData(result as RouteResponse);
    } catch (error) {
      console.error("Emergency route calculation failed:", error);

      setRouteData(null);
      setRouteError(
        error instanceof Error
          ? error.message
          : "Could not calculate a route."
      );
    } finally {
      setLoadingRoute(false);
    }
  }

  // useMemo means these are only recalculated when routeData changes.
  // This stops the map from re-zooming every time something else updates.
  const routeCoordinates = useMemo(
    () => geometryToLatLng(routeData?.recommended_station?.geometry),
    [routeData]
  );

  const alternativeRoutes = useMemo(
    () =>
      (routeData?.alternatives ?? []).map((alternative) => ({
        station: alternative,
        positions: geometryToLatLng(alternative.geometry),
      })),
    [routeData]
  );

  // ==========================================================
  // LOAD LIVE FIRMS
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function loadFires() {
      try {
        const result = await getLiveFires();

        if (!mounted) return;

        const incomingFires: LiveFire[] = (
          Array.isArray(result?.fires)
            ? result.fires
            : Array.isArray(result)
            ? result
            : []
        ).filter(
          (f: any) =>
            f &&
            Number.isFinite(Number(f.latitude)) &&
            Number.isFinite(Number(f.longitude))
        );

        console.log("Agni Netra - Live FIRMS fires:", incomingFires.length);

        setFires(incomingFires);
      } catch (error) {
        console.error("Failed to load live FIRMS fires:", error);
      }
    }

    loadFires();

    const interval = window.setInterval(loadFires, 5 * 60 * 1000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  // ==========================================================
  // ANALYZE ONE FIRE
  // ==========================================================

  async function analyzeFire(fire: LiveFire) {
    const key = getFireKey(fire);

    if (analysisRef.current[key]) {
      return;
    }

    if (analyzingRef.current.has(key)) {
      return;
    }

    analyzingRef.current.add(key);

    setLoadingFire((previous) => ({ ...previous, [key]: true }));

    try {
      const result = await predictLiveFire(fire);

      if (result?.success === false) {
        console.error("Agni Netra - Prediction FAILED:", result.error);
        return;
      }

      const normalizedResult = normalizePriorityResult(result);

      analysisRef.current = {
        ...analysisRef.current,
        [key]: normalizedResult,
      };

      setAnalysis((previous) => ({
        ...previous,
        [key]: normalizedResult,
      }));
    } catch (error) {
      console.error("Fire analysis failed:", fire, error);
    } finally {
      analyzingRef.current.delete(key);

      setLoadingFire((previous) => ({ ...previous, [key]: false }));
    }
  }

  // ==========================================================
  // AUTOMATIC ANALYSIS OF ALL NEW FIRMS FIRES
  // ==========================================================

  useEffect(() => {
    if (fires.length === 0) {
      return;
    }

    const queue = fires.filter((fire) => {
      const key = getFireKey(fire);

      return !analysisRef.current[key] && !analyzingRef.current.has(key);
    });

    if (queue.length === 0) {
      return;
    }

    let currentIndex = 0;

    const worker = async () => {
      while (true) {
        const index = currentIndex++;

        if (index >= queue.length) {
          break;
        }

        const fire = queue[index];

        if (!fire) {
          continue;
        }

        await analyzeFire(fire);
      }
    };

    const workerCount = Math.min(4, queue.length);

    Promise.all(Array.from({ length: workerCount }, () => worker())).catch(
      (error) => {
        console.error("Automatic FIRMS analysis failed:", error);
      }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fires]);

  // ==========================================================
  // GIS DATA
  // ==========================================================

  useEffect(() => {
    const layerMap: Record<LayerName, string> = {
      landCover: "landcover",
      ndvi: "ndvi",
      ndwi: "ndwi",
      ndbi: "ndbi",
      no2: "no2",
      so2: "so2",
      co: "co",
      ch4: "ch4",
      persistence: "persistence",
    };

    async function loadLayer(layerName: LayerName) {
      const endpoint = layerMap[layerName];

      if (!endpoint) {
        return;
      }

      if (gisData[layerName]) {
        return;
      }

      try {
        setLoadingGIS(layerName);

        const result = await getGISLayer(endpoint);

        if (result?.success && Array.isArray(result.points)) {
          setGISData((previous) => ({
            ...previous,
            [layerName]: result.points,
          }));
        }
      } catch (error) {
        console.error(`Failed to load GIS layer ${layerName}:`, error);
      } finally {
        setLoadingGIS(null);
      }
    }

    GIS_LAYER_NAMES.forEach((layerName) => {
      if (layers[layerName]) {
        loadLayer(layerName);
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // ==========================================================
  // PRIORITY HELPERS
  // ==========================================================

  const getPriority = (fire: LiveFire): PriorityLevel | undefined => {
    const level = analysis[getFireKey(fire)]?.priority?.level;

    return level && isPriorityLevel(level) ? level : undefined;
  };

  const getPriorityColor = (fire: LiveFire): string => {
    const priority = getPriority(fire);

    if (!priority) {
      return PRIORITY_COLORS.NOT_ANALYZED;
    }

    return PRIORITY_COLORS[priority];
  };

  // ==========================================================
  // PRIORITY COUNTS
  // ==========================================================

  const priorityCounts: Record<PriorityLevel, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
  };

  fires.forEach((fire) => {
    const priority = getPriority(fire);

    if (priority) {
      priorityCounts[priority] += 1;
    }
  });

  const analyzedCount = fires.reduce((count, fire) => {
    return analysis[getFireKey(fire)]?.priority?.level ? count + 1 : count;
  }, 0);

  // ==========================================================
  // CRITICAL LOCATIONS
  // ==========================================================

  const criticalFires = fires
    .filter((fire) => getPriority(fire) === "CRITICAL")
    .sort((a, b) => Number(b.frp || 0) - Number(a.frp || 0))
    .slice(0, 3);

  // ==========================================================
  // ACTIVE GIS LEGEND
  // ==========================================================

  const activeGISLayer: LayerName | undefined = GIS_LAYER_NAMES.find(
    (layer) => layers[layer]
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[20.3, 84.5]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        {/* BASE MAP */}
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* WORLD → ODISHA */}
        <WorldToOdisha />

        {/* GIS OVERLAYS */}
        {GIS_LAYER_NAMES.map((layerName) => {
          if (!layers[layerName]) {
            return null;
          }

          const points = gisData[layerName];

          if (!points || points.length === 0) {
            return null;
          }

          return (
            <GISDataLayer key={layerName} layer={layerName} points={points} />
          );
        })}

        {/* ALTERNATIVE ROUTES (grey, dashed) */}
        {alternativeRoutes.map(({ station, positions }) =>
          positions.length > 1 ? (
            <Polyline
              key={`alt-route-${station.station_id}`}
              positions={positions}
              pathOptions={{
                color: "#8a94a6",
                weight: 3,
                opacity: 0.7,
                dashArray: "6 8",
              }}
            />
          ) : null
        )}

        {/* RECOMMENDED ROUTE (red) */}
        {routeCoordinates.length > 1 && (
          <>
            <FitRoute positions={routeCoordinates} />

            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "#ff3030",
                weight: 5,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* RECOMMENDED STATION MARKER (blue) */}
        {routeData?.recommended_station && (
          <CircleMarker
            center={[
              routeData.recommended_station.station_latitude,
              routeData.recommended_station.station_longitude,
            ]}
            radius={10}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#1e90ff",
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <strong>🚒 {routeData.recommended_station.station_name}</strong>
              <br />
              Recommended station
              <br />
              {Math.round(routeData.recommended_station.eta_minutes)} min ·{" "}
              {routeData.recommended_station.road_distance_km} km
            </Popup>
          </CircleMarker>
        )}

        {/* ALTERNATIVE STATION MARKERS (grey) */}
        {routeData?.alternatives?.map((alternative) => (
          <CircleMarker
            key={`alt-station-${alternative.station_id}`}
            center={[
              alternative.station_latitude,
              alternative.station_longitude,
            ]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#7a8ca5",
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Popup>
              <strong>🚒 {alternative.station_name}</strong>
              <br />
              Alternative station
              <br />
              {Math.round(alternative.eta_minutes)} min ·{" "}
              {alternative.road_distance_km} km
            </Popup>
          </CircleMarker>
        ))}

        {/* LIVE FIRMS */}
        {layers.firms &&
          fires.map((fire, index) => {
            const key = getFireKey(fire);
            const result = analysis[key];
            const priority = getPriority(fire);
            const color = getPriorityColor(fire);
            const isLoading = Boolean(loadingFire[key]);
            const isRouteLoading = loadingRoute && routeFireKey === key;
            const showRouteResult =
              routeFireKey === key && !loadingRoute && routeData;
            const showRouteError =
              routeFireKey === key && !loadingRoute && routeError;

            return (
              <CircleMarker
                key={`${key}-${index}`}
                center={[fire.latitude, fire.longitude]}
                radius={
                  priority === "CRITICAL" ? 7 : priority === "HIGH" ? 6 : 5
                }
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.95,
                  weight: priority === "CRITICAL" ? 2 : 1.5,
                }}
                eventHandlers={{
                  click: () => analyzeFire(fire),
                }}
              >
                <Popup
                  maxWidth={380}
                  minWidth={300}
                  autoPan
                  autoPanPadding={[30, 30]}
                >
                  <div
                    style={{
                      width: "100%",
                      maxHeight: "430px",
                      overflowY: "auto",
                      overflowX: "hidden",
                      paddingRight: "8px",
                      boxSizing: "border-box",
                      fontFamily: FONT,
                    }}
                  >
                    {/* BRAND */}
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "1.6px",
                        color: BRAND_ACCENT,
                        marginBottom: "5px",
                      }}
                    >
                      Agni Netra
                    </div>

                    <h3 style={{ margin: "0 0 5px 0", fontSize: "20px" }}>
                      Fire Detection
                    </h3>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginBottom: "12px",
                      }}
                    >
                      NASA FIRMS Detection
                    </div>

                    {/* FIRMS DATA */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "7px",
                        fontSize: "12px",
                      }}
                    >
                      <div>
                        <strong>FRP:</strong> {fire.frp ?? "N/A"} MW
                      </div>

                      <div>
                        <strong>Date:</strong> {fire.acq_date ?? "N/A"}
                      </div>

                      <div>
                        <strong>Satellite:</strong>{" "}
                        {fire.satellite ?? fire.instrument ?? "VIIRS"}
                      </div>

                      <div>
                        <strong>Confidence:</strong>{" "}
                        {fire.confidence ?? "N/A"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "11px",
                        color: "#666",
                      }}
                    >
                      Coordinates: {fire.latitude.toFixed(4)},{" "}
                      {fire.longitude.toFixed(4)}
                    </div>

                    {/* RESPONSE PRIORITY */}
                    {priority && (
                      <div
                        style={{
                          marginTop: "14px",
                          padding: "12px",
                          borderRadius: "8px",
                          background: PRIORITY_BACKGROUNDS[priority],
                          border: `1px solid ${color}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#777",
                            letterSpacing: "0.5px",
                            marginBottom: "5px",
                          }}
                        >
                          Fire response priority
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "19px",
                            fontWeight: 800,
                            color,
                          }}
                        >
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: color,
                              display: "inline-block",
                            }}
                          />

                          {priority}
                        </div>

                        {result?.priority?.score !== undefined && (
                          <div
                            style={{
                              marginTop: "5px",
                              fontSize: "10px",
                              color: "#777",
                            }}
                          >
                            Priority score: {result.priority.score}
                          </div>
                        )}

                        {result?.priority?.reasons &&
                          result.priority.reasons.length > 0 && (
                            <div style={{ marginTop: "9px" }}>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 800,
                                  color: "#777",
                                  letterSpacing: "0.4px",
                                  marginBottom: "4px",
                                }}
                              >
                                Decision support
                              </div>

                              <BulletList items={result.priority.reasons} />
                            </div>
                          )}
                      </div>
                    )}

                    {/* EMERGENCY ROUTE BUTTON */}
                    <button
                      type="button"
                      onClick={() => calculateEmergencyRoute(fire)}
                      disabled={isRouteLoading}
                      style={{
                        width: "100%",
                        marginTop: "14px",
                        padding: "10px 12px",
                        border: "none",
                        borderRadius: "7px",
                        background: isRouteLoading ? "#999" : BRAND_ACCENT,
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: isRouteLoading ? "wait" : "pointer",
                      }}
                    >
                      {isRouteLoading
                        ? "Calculating emergency route..."
                        : "Get Emergency Route"}
                    </button>

                    {/* EMERGENCY ROUTE RESULT */}
                    {showRouteResult && routeData?.recommended_station && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "11px",
                          borderRadius: "7px",
                          background: "#eef6ff",
                          border: "1px solid #1e90ff",
                          fontSize: "11px",
                          color: "#1f2937",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#777",
                            letterSpacing: "0.5px",
                            marginBottom: "5px",
                          }}
                        >
                          Recommended response
                        </div>

                        <div style={{ fontSize: "15px", fontWeight: 800 }}>
                          🚒 {routeData.recommended_station.station_name}
                        </div>

                        <div style={{ color: "#555" }}>
                          {routeData.recommended_station.district} district
                        </div>

                        <div style={{ marginTop: "6px", fontSize: "12px" }}>
                          ⏱️{" "}
                          <strong>
                            {Math.round(
                              routeData.recommended_station.eta_minutes
                            )}{" "}
                            min
                          </strong>{" "}
                          · 📍 {routeData.recommended_station.road_distance_km}{" "}
                          km by road
                        </div>

                        {routeData.alternatives.length > 0 && (
                          <div
                            style={{
                              marginTop: "9px",
                              paddingTop: "8px",
                              borderTop: "1px solid #c9dff5",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#555",
                                marginBottom: "3px",
                              }}
                            >
                              Alternative stations
                            </div>

                            {routeData.alternatives.map((alternative) => (
                              <div
                                key={alternative.station_id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: "3px",
                                }}
                              >
                                <span>{alternative.station_name}</span>

                                <span>
                                  {Math.round(alternative.eta_minutes)} min ·{" "}
                                  {alternative.road_distance_km} km
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {routeData.recommended_station.coordinate_status ===
                          "NOT_VERIFIED" && (
                          <div
                            style={{
                              marginTop: "8px",
                              color: "#8a4b08",
                              fontSize: "10px",
                            }}
                          >
                            ⚠ This station location was found by geocoding and
                            is not officially verified.
                          </div>
                        )}
                      </div>
                    )}

                    {/* EMERGENCY ROUTE ERROR */}
                    {showRouteError && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "9px",
                          borderRadius: "7px",
                          background: "#fff0f0",
                          border: "1px solid #ff3030",
                          fontSize: "11px",
                          color: "#8a1c1c",
                        }}
                      >
                        Could not calculate a route: {routeError}
                      </div>
                    )}

                    {/* MODEL ANALYSIS */}
                    {result?.prediction && (
                      <InfoCard
                        title="AI fire classification"
                        background="#f7f9fc"
                        border="1px solid #dce3ec"
                      >
                        {result.prediction.predicted_class && (
                          <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                            <strong>Predicted class:</strong>{" "}
                            {result.prediction.predicted_class}
                          </div>
                        )}

                        {result.prediction.confidence !== undefined && (
                          <div style={{ fontSize: "12px" }}>
                            <strong>Model confidence:</strong>{" "}
                            {(
                              Number(result.prediction.confidence) * 100
                            ).toFixed(1)}
                            %
                          </div>
                        )}

                        {result.prediction.probabilities && (
                          <div style={{ marginTop: "8px" }}>
                            {Object.entries(
                              result.prediction.probabilities
                            ).map(([label, probability]) => (
                              <div
                                key={label}
                                style={{
                                  fontSize: "11px",
                                  marginTop: "4px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span>{label}</span>

                                <strong>
                                  {(Number(probability) * 100).toFixed(1)}%
                                </strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </InfoCard>
                    )}

                    {/* INDUSTRIAL ASSOCIATION */}
                    {result?.industrial_association && (
                      <InfoCard title="Industrial fire assessment">
                        {result.industrial_association.level && (
                          <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                            <strong>Association:</strong>{" "}
                            {result.industrial_association.level}
                          </div>
                        )}

                        {result.industrial_association.context_score !==
                          undefined && (
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            Context score:{" "}
                            {result.industrial_association.context_score}
                          </div>
                        )}

                        <BulletList
                          items={result.industrial_association.evidence}
                        />
                      </InfoCard>
                    )}

                    {/* GAS ASSESSMENT */}
                    {result?.gas_assessment && (
                      <InfoCard title="Gas anomaly assessment">
                        {result.gas_assessment.assessment && (
                          <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                            <strong>Assessment:</strong>{" "}
                            {result.gas_assessment.assessment}
                          </div>
                        )}

                        {result.gas_assessment.score !== undefined && (
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            Gas anomaly score: {result.gas_assessment.score}
                          </div>
                        )}

                        <BulletList items={result.gas_assessment.evidence} />
                      </InfoCard>
                    )}

                    {/* SUPPORTING EVIDENCE */}
                    {result?.supporting_evidence &&
                      result.supporting_evidence.length > 0 && (
                        <InfoCard title="Supporting evidence">
                          {result.supporting_evidence.map((evidence, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: "11px",
                                color: "#555",
                                marginTop: "4px",
                              }}
                            >
                              • {evidence}
                            </div>
                          ))}
                        </InfoCard>
                      )}

                    {/* CONTEXT DISTANCE */}
                    {result?.context_distance_m !== undefined && (
                      <div
                        style={{
                          marginTop: "10px",
                          fontSize: "11px",
                          color: "#666",
                        }}
                      >
                        Context distance:{" "}
                        {Number(result.context_distance_m).toFixed(0)} m
                      </div>
                    )}

                    {/* ANALYSIS IN PROGRESS */}
                    {!priority && isLoading && (
                      <div
                        style={{
                          marginTop: "14px",
                          padding: "11px",
                          borderRadius: "7px",
                          background: "#fff7ed",
                          border: "1px solid #f59e0b",
                          fontSize: "11px",
                          color: "#8a4b08",
                        }}
                      >
                        <strong>Analyzing fire response priority...</strong>
                      </div>
                    )}

                    {/* NOT AVAILABLE */}
                    {!priority && !isLoading && (
                      <div
                        style={{
                          marginTop: "14px",
                          padding: "10px",
                          borderRadius: "7px",
                          background: "#f7f7f7",
                          fontSize: "11px",
                          color: "#666",
                        }}
                      >
                        Response priority unavailable. Click the detection to
                        retry analysis.
                      </div>
                    )}

                    {/* DISCLAIMER */}
                    <div
                      style={{
                        marginTop: "14px",
                        paddingTop: "9px",
                        borderTop: "1px solid #e5e5e5",
                        fontSize: "9px",
                        lineHeight: 1.45,
                        color: "#888",
                      }}
                    >
                      Analysis is based on NASA FIRMS detection data and the
                      supporting satellite, environmental, industrial and
                      atmospheric evidence available to the Agni Netra model.
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* ====================================================
          RESPONSE PRIORITY SUMMARY
      ==================================================== */}

      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 1000,
          width: "228px",
          background: PANEL_BG,
          border: PANEL_BORDER,
          color: "white",
          padding: "15px",
          borderRadius: PANEL_RADIUS,
          boxShadow: PANEL_SHADOW,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1.4px",
            textTransform: "uppercase",
            color: BRAND_ACCENT,
            marginBottom: "4px",
          }}
        >
          Agni Netra
        </div>

        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          Response Priority
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "7px",
          }}
        >
          {(
            [
              ["CRITICAL", priorityCounts.CRITICAL, PRIORITY_COLORS.CRITICAL],
              ["HIGH", priorityCounts.HIGH, PRIORITY_COLORS.HIGH],
              ["MODERATE", priorityCounts.MODERATE, PRIORITY_COLORS.MODERATE],
              ["LOW", priorityCounts.LOW, PRIORITY_COLORS.LOW],
            ] as [PriorityLevel, number, string][]
          ).map(([label, count, color]) => (
            <div
              key={label}
              style={{
                padding: "9px",
                borderRadius: "8px",
                background: `${color}18`,
                border: `1px solid ${color}55`,
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.3px",
                  color,
                  marginBottom: "4px",
                }}
              >
                {label}
              </div>

              <div style={{ fontSize: "19px", fontWeight: 700 }}>{count}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "10px",
            paddingTop: "9px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: "11px",
            color: "#b0b0b0",
          }}
        >
          Analyzed:{" "}
          <strong style={{ color: "white" }}>{analyzedCount}</strong> /{" "}
          {fires.length}
        </div>

        {criticalFires.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              paddingTop: "9px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: PRIORITY_COLORS.CRITICAL,
                letterSpacing: "0.4px",
                marginBottom: "8px",
              }}
            >
              Critical locations
            </div>

            {criticalFires.map((fire, index) => (
              <div
                key={getFireKey(fire)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px 1fr",
                  gap: "3px",
                  marginBottom: "7px",
                  fontSize: "10px",
                }}
              >
                <strong style={{ color: PRIORITY_COLORS.CRITICAL }}>
                  {index + 1}.
                </strong>

                <div>
                  <div>
                    {fire.latitude.toFixed(4)}, {fire.longitude.toFixed(4)}
                  </div>

                  <div style={{ color: "#999", marginTop: "2px" }}>
                    {Number(fire.frp || 0).toFixed(1)} MW
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GIS CONTROL */}
      <GISLayerControl layers={layers} setLayers={setLayers} />

      {/* LEGEND */}
      {layers.firms && !activeGISLayer && <FirePriorityLegend />}

      {activeGISLayer && <GISLegend layer={activeGISLayer} />}

      {/* GIS LOADING */}
      {loadingGIS && (
        <div
          style={{
            position: "absolute",
            bottom: "18px",
            left: activeGISLayer ? "220px" : "18px",
            zIndex: 1000,
            background: PANEL_BG,
            border: PANEL_BORDER,
            color: "white",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: FONT,
          }}
        >
          Loading {loadingGIS} GIS layer...
        </div>
      )}

      {/* ROUTE STATUS */}
      {routeCoordinates.length > 1 && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "260px",
            zIndex: 1000,
            background: PANEL_BG,
            border: PANEL_BORDER,
            color: "white",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: FONT,
            boxShadow: PANEL_SHADOW,
          }}
        >
          Emergency route active
        </div>
      )}

      {/* LIVE DETECTION COUNT */}
      <div
        style={{
          position: "absolute",
          bottom: "18px",
          right: "18px",
          zIndex: 1000,
          background: PANEL_BG,
          border: PANEL_BORDER,
          color: "white",
          padding: "10px 15px",
          borderRadius: "8px",
          fontSize: "12px",
          fontFamily: FONT,
        }}
      >
        Live detections: <strong>{fires.length}</strong>
      </div>
    </div>
  );
}

export default FireMap;