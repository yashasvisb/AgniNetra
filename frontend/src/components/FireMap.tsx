import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
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

// VIIRS single-letter codes used by NASA FIRMS
const SATELLITE_LABELS: Record<string, string> = {
  N: "Suomi NPP",
  "1": "NOAA-20",
  "2": "NOAA-21",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  l: "Low",
  n: "Nominal",
  h: "High",
};

// ============================================================
// POPUP STYLES (injected once, scoped to .agni-popup)
// ============================================================

const POPUP_CSS = `
.agni-popup .leaflet-popup-content-wrapper {
  background: #0d0f12;
  color: #e8eaed;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(0,0,0,0.6);
  padding: 0;
}
.agni-popup .leaflet-popup-content { margin: 0; font-family: ${FONT}; }
.agni-popup .leaflet-popup-tip { background: #0d0f12; }
.agni-popup a.leaflet-popup-close-button { color: #8b9098; top: 12px; right: 12px; }
.agni-popup a.leaflet-popup-close-button:hover { color: #fff; }

.an-scroll { max-height: 470px; overflow-y: auto; overflow-x: hidden; padding: 22px 22px 18px; box-sizing: border-box; }
.an-scroll::-webkit-scrollbar { width: 6px; }
.an-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }

.an-brand { font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${BRAND_ACCENT}; }
.an-title { font-size: 20px; font-weight: 700; margin: 6px 0 4px; color: #fff; }
.an-sub { font-size: 12px; color: #8b9098; line-height: 1.5; }

.an-tabs { display: flex; gap: 4px; margin: 18px 0 20px; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 11px; }
.an-tab { flex: 1; padding: 8px 0; border: none; border-radius: 8px; background: transparent; color: #8b9098; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; }
.an-tab:hover { color: #fff; }
.an-tab.active { background: rgba(255,255,255,0.11); color: #fff; }

.an-hero { padding: 16px 18px; border-radius: 12px; }
.an-hero-label { font-size: 11px; color: #9aa0a6; margin-bottom: 6px; }
.an-hero-level { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; line-height: 1.1; }
.an-dot { width: 11px; height: 11px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

.an-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 20px; margin-top: 22px; }
.an-stat-label { font-size: 11px; color: #8b9098; margin-bottom: 4px; }
.an-stat-value { font-size: 14px; font-weight: 600; color: #fff; }

.an-h { font-size: 11px; font-weight: 600; color: #8b9098; margin: 22px 0 10px; }
.an-h:first-child { margin-top: 0; }
.an-bullets { display: flex; flex-direction: column; gap: 9px; }
.an-bullet { display: flex; gap: 10px; font-size: 12.5px; line-height: 1.55; color: #c9cdd3; }
.an-bullet::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: #5f656d; margin-top: 8px; flex-shrink: 0; }
.an-bullet strong { color: #fff; font-weight: 700; }

.an-verdict-name { font-size: 22px; font-weight: 800; line-height: 1.15; }
.an-verdict-note { font-size: 12.5px; color: #9aa0a6; margin-top: 5px; }

.an-bar-row + .an-bar-row { margin-top: 14px; }
.an-bar-top { display: flex; justify-content: space-between; font-size: 12.5px; color: #c9cdd3; margin-bottom: 6px; }
.an-bar-top strong { color: #fff; font-weight: 600; }
.an-bar-track { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
.an-bar-fill { height: 100%; border-radius: 3px; }

.an-kv { display: flex; justify-content: space-between; gap: 14px; font-size: 12.5px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.an-kv:last-child { border-bottom: none; }
.an-kv span:first-child { color: #8b9098; }
.an-kv span:last-child { color: #fff; font-weight: 600; text-align: right; }

.an-btn { width: 100%; margin-top: 22px; padding: 12px 14px; border: none; border-radius: 10px; color: #fff; font-size: 13px; font-weight: 700; font-family: inherit; }
.an-route { margin-top: 14px; padding: 16px; border-radius: 12px; background: rgba(30,144,255,0.09); border: 1px solid rgba(30,144,255,0.4); }
.an-route-name { font-size: 15px; font-weight: 700; color: #fff; margin-top: 4px; }
.an-route-meta { display: flex; gap: 18px; margin-top: 12px; font-size: 13px; color: #c9cdd3; }
.an-route-meta strong { color: #fff; }
.an-alts { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(30,144,255,0.25); }
.an-alt { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: #9aa0a6; margin-top: 7px; }

.an-note { margin-top: 16px; padding: 12px 14px; border-radius: 10px; font-size: 12.5px; line-height: 1.5; }
.an-empty { padding: 26px 8px; text-align: center; font-size: 12.5px; color: #8b9098; }
.an-foot { margin-top: 22px; font-size: 10px; line-height: 1.55; color: #626870; }
`;

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
    .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
}

function formatConfidence(value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "N/A";
  if (typeof value === "number") return `${value}%`;
  return CONFIDENCE_LABELS[value.toLowerCase()] ?? value;
}

function formatSatellite(fire: LiveFire): string {
  const raw = fire.satellite;
  if (!raw) return fire.instrument ?? "VIIRS";
  return SATELLITE_LABELS[String(raw).toUpperCase()] ?? String(raw);
}

/** Colour for a fire class name coming from the model. */
function classColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("forest")) return "#4ade80";
  if (n.includes("industrial")) return "#fb923c";
  return "#60a5fa";
}

/** Colour for the gas assessment word. */
function gasColor(assessment: string): string {
  const u = assessment.toUpperCase();
  if (u.includes("INCONCLUSIVE")) return "#fbbf24";
  if (/^(NO|NONE|NORMAL|LOW)\b/.test(u)) return "#4ade80";
  return "#ff5a4d";
}

/** Splits "Label: value" evidence strings; returns null when not in that shape. */
function splitKeyValue(text: string): [string, string] | null {
  const index = text.indexOf(": ");
  if (index <= 0 || index > 40) return null;
  return [text.slice(0, index), text.slice(index + 2)];
}

// ============================================================
// SMALL POPUP PIECES
// ============================================================

/** Turns a 0–1 model score into a word, so no percentages are shown. */
function levelWord(value: number): string {
  if (value >= 0.75) return "High";
  if (value >= 0.5) return "Moderate";
  if (value >= 0.25) return "Low";
  return "Very low";
}

/** Bolds any "3.15×" style multiplier so gas anomalies stand out. */
function Highlight({ text }: { text: string }) {
  const parts = text.split(/(\d+(?:\.\d+)?×)/g);

  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </span>
  );
}

function Bullets({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="an-bullets">
      {items.map((item, i) => (
        <div className="an-bullet" key={i}>
          <Highlight text={item} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// FIRE POPUP CONTENT
// ============================================================

type PopupTab = "overview" | "classification" | "gas";

interface FirePopupContentProps {
  fire: LiveFire;
  result?: AnalysisResult;
  priority?: PriorityLevel;
  isLoading: boolean;
  isRouteLoading: boolean;
  routeData: RouteResponse | null;
  routeError: string | null;
  onRoute: () => void;
}

function FirePopupContent({
  fire,
  result,
  priority,
  isLoading,
  isRouteLoading,
  routeData,
  routeError,
  onRoute,
}: FirePopupContentProps) {
  const [tab, setTab] = useState<PopupTab>("overview");

  const color = priority ? PRIORITY_COLORS[priority] : PRIORITY_COLORS.NOT_ANALYZED;

  const prediction = result?.prediction;
  const industrial = result?.industrial_association;
  const gas = result?.gas_assessment;

  // Class probabilities, biggest first
  const probabilities = prediction?.probabilities
    ? Object.entries(prediction.probabilities)
        .map(([label, value]) => [label, Number(value)] as [string, number])
        .sort((a, b) => b[1] - a[1])
    : [];

  // Supporting evidence: "Label: value" rows vs. plain sentences
  const evidenceRows: [string, string][] = [];
  const evidenceNotes: string[] = [];

  (result?.supporting_evidence ?? []).forEach((item) => {
    const kv = splitKeyValue(item);
    if (kv) evidenceRows.push(kv);
    else evidenceNotes.push(item);
  });

  const station = routeData?.recommended_station;

  const pending = (
    <div className="an-empty">
      {isLoading
        ? "Analyzing this detection…"
        : "Analysis unavailable. Close and click the detection again to retry."}
    </div>
  );

  const tabs: [PopupTab, string][] = [
    ["overview", "Overview"],
    ["classification", "Classification"],
    ["gas", "Gas"],
  ];

  return (
    <div className="an-scroll">
      {/* HEADER */}
      <div className="an-brand">Agni Netra</div>
      <div className="an-title">Fire Detection</div>
      <div className="an-sub">
        NASA FIRMS · {fire.latitude.toFixed(4)}, {fire.longitude.toFixed(4)}
      </div>

      {/* TABS */}
      <div className="an-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`an-tab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ================= */}
      {tab === "overview" && (
        <>
          {priority ? (
            <div
              className="an-hero"
              style={{ background: `${color}14`, border: `1px solid ${color}55` }}
            >
              <div className="an-hero-label">Fire response priority</div>
              <div className="an-hero-level" style={{ color }}>
                <span className="an-dot" style={{ background: color }} />
                {priority}
              </div>
            </div>
          ) : (
            pending
          )}

          {priority && result?.priority?.reasons && result.priority.reasons.length > 0 && (
            <>
              <div className="an-h" style={{ marginTop: 22 }}>
                Decision support
              </div>
              <Bullets items={result.priority.reasons} />
            </>
          )}

          <div className="an-stats">
            <div>
              <div className="an-stat-label">Fire power (FRP)</div>
              <div className="an-stat-value">{fire.frp ?? "N/A"} MW</div>
            </div>
            <div>
              <div className="an-stat-label">Detected on</div>
              <div className="an-stat-value">{fire.acq_date ?? "N/A"}</div>
            </div>
            <div>
              <div className="an-stat-label">Satellite</div>
              <div className="an-stat-value">{formatSatellite(fire)}</div>
            </div>
            <div>
              <div className="an-stat-label">Detection confidence</div>
              <div className="an-stat-value">
                {formatConfidence(fire.confidence)}
              </div>
            </div>
          </div>

          {/* EMERGENCY ROUTE */}
          <button
            type="button"
            className="an-btn"
            onClick={onRoute}
            disabled={isRouteLoading}
            style={{
              background: isRouteLoading ? "#555b63" : BRAND_ACCENT,
              cursor: isRouteLoading ? "wait" : "pointer",
            }}
          >
            {isRouteLoading ? "Calculating route…" : "Get Emergency Route"}
          </button>

          {station && (
            <div className="an-route">
              <div className="an-sub">Recommended station</div>
              <div className="an-route-name">🚒 {station.station_name}</div>
              <div className="an-sub">{station.district} district</div>

              <div className="an-route-meta">
                <span>
                  ⏱ <strong>{Math.round(station.eta_minutes)} min</strong>
                </span>
                <span>
                  📍 <strong>{station.road_distance_km} km</strong> by road
                </span>
              </div>

              {routeData && routeData.alternatives.length > 0 && (
                <div className="an-alts">
                  <div className="an-sub">Alternatives</div>
                  {routeData.alternatives.map((alt) => (
                    <div className="an-alt" key={alt.station_id}>
                      <span>{alt.station_name}</span>
                      <span>
                        {Math.round(alt.eta_minutes)} min · {alt.road_distance_km} km
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {station.coordinate_status === "NOT_VERIFIED" && (
                <div style={{ marginTop: 12, fontSize: 11, color: "#fbbf24", lineHeight: 1.5 }}>
                  ⚠ Station location was found by geocoding and is not
                  officially verified.
                </div>
              )}
            </div>
          )}

          {routeError && (
            <div
              className="an-note"
              style={{
                background: "rgba(255,48,48,0.1)",
                border: "1px solid rgba(255,48,48,0.45)",
                color: "#ff8a80",
              }}
            >
              Could not calculate a route: {routeError}
            </div>
          )}
        </>
      )}

      {/* ================= CLASSIFICATION ================= */}
      {tab === "classification" &&
        (prediction ? (
          <>
            <div className="an-h">Predicted class</div>
            <div
              className="an-verdict-name"
              style={{
                color: prediction.predicted_class
                  ? classColor(prediction.predicted_class)
                  : "#fff",
              }}
            >
              {prediction.predicted_class ?? "Unknown"}
            </div>
            {prediction.confidence !== undefined && (
              <div className="an-verdict-note">
                {levelWord(Number(prediction.confidence))} model confidence
              </div>
            )}

            {probabilities.length > 0 && (
              <>
                <div className="an-h">Likelihood by class</div>
                {probabilities.map(([label, value]) => (
                  <div className="an-bar-row" key={label}>
                    <div className="an-bar-top">
                      <span>{label}</span>
                      <strong>{levelWord(value)}</strong>
                    </div>
                    <div className="an-bar-track">
                      <div
                        className="an-bar-fill"
                        style={{
                          width: `${Math.max(2, Math.min(100, value * 100))}%`,
                          background: classColor(label),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}

            {industrial && industrial.evidence && industrial.evidence.length > 0 && (
              <>
                <div className="an-h">
                  Industrial context
                  {industrial.level ? ` · ${industrial.level} association` : ""}
                </div>
                <Bullets items={industrial.evidence} />
              </>
            )}

            {(evidenceRows.length > 0 || evidenceNotes.length > 0) && (
              <>
                <div className="an-h">Supporting evidence</div>

                {evidenceRows.map(([label, value], i) => (
                  <div className="an-kv" key={`${label}-${i}`}>
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}

                {evidenceNotes.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <Bullets items={evidenceNotes} />
                  </div>
                )}
              </>
            )}

            {result?.context_distance_m !== undefined && (
              <div className="an-sub" style={{ marginTop: 16 }}>
                Nearest context: {Number(result.context_distance_m).toFixed(0)} m
                from the detection
              </div>
            )}
          </>
        ) : (
          pending
        ))}

      {/* ================= GAS ================= */}
      {tab === "gas" &&
        (gas ? (
          <>
            <div className="an-h">Assessment</div>
            <div
              className="an-verdict-name"
              style={{ color: gas.assessment ? gasColor(gas.assessment) : "#fff" }}
            >
              {gas.assessment ?? "No assessment"}
            </div>

            <div className="an-h">Gas readings vs baseline</div>
            {gas.evidence && gas.evidence.length > 0 ? (
              <Bullets items={gas.evidence} />
            ) : (
              <div className="an-sub">No elevated gas readings detected.</div>
            )}
          </>
        ) : (
          pending
        ))}

      {/* DISCLAIMER */}
      <div className="an-foot">
        Based on NASA FIRMS detection data and the satellite, environmental,
        industrial and atmospheric evidence available to the Agni Netra model.
      </div>
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
// LEGENDS
// ============================================================

const LEGEND_BOX_STYLE = {
  position: "absolute" as const,
  bottom: "18px",
  left: "18px",
  zIndex: 1000,
  background: PANEL_BG,
  border: PANEL_BORDER,
  color: "white",
  padding: "14px 16px",
  borderRadius: PANEL_RADIUS,
  boxShadow: PANEL_SHADOW,
  fontFamily: FONT,
};

const LEGEND_TITLE_STYLE = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.3px",
  marginBottom: "10px",
  color: "rgba(255,255,255,0.85)",
};

function LegendRow({ label, color }: { label: string; color: string }) {
  return (
    <div
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
          border: color === "#f5f5f5" ? "1px solid #999" : "none",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

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
    <div style={{ ...LEGEND_BOX_STYLE, minWidth: "150px", maxWidth: "195px" }}>
      <div style={LEGEND_TITLE_STYLE}>{legend.title}</div>

      {legend.items.map((item) => (
        <LegendRow key={item.label} label={item.label} color={item.color} />
      ))}
    </div>
  );
}

function FirePriorityLegend() {
  const levels: PriorityLevel[] = ["CRITICAL", "HIGH", "MODERATE", "LOW"];

  return (
    <div style={{ ...LEGEND_BOX_STYLE, minWidth: "160px" }}>
      <div style={LEGEND_TITLE_STYLE}>Fire response priority</div>

      {levels.map((level) => (
        <LegendRow key={level} label={level} color={PRIORITY_COLORS[level]} />
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

  const divider = (
    <div
      style={{
        height: "1px",
        background: "rgba(255,255,255,0.1)",
        margin: "10px 0",
      }}
    />
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

      {divider}

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

      {divider}

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
  const [analysis, setAnalysis] = useState<Record<string, AnalysisResult>>({});
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
      <style>{POPUP_CSS}</style>

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
            const priority = getPriority(fire);
            const color = getPriorityColor(fire);
            const isRouteForThisFire = routeFireKey === key && !loadingRoute;

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
                  className="agni-popup"
                  maxWidth={400}
                  minWidth={360}
                  autoPan
                  autoPanPadding={[30, 30]}
                >
                  <FirePopupContent
                    fire={fire}
                    result={analysis[key]}
                    priority={priority}
                    isLoading={Boolean(loadingFire[key])}
                    isRouteLoading={loadingRoute && routeFireKey === key}
                    routeData={isRouteForThisFire ? routeData : null}
                    routeError={isRouteForThisFire ? routeError : null}
                    onRoute={() => calculateEmergencyRoute(fire)}
                  />
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