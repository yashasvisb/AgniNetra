// // import {
// //   useEffect,
// //   useRef,
// //   useState,
// //   type Dispatch,
// //   type SetStateAction,
// // } from "react";

// // import {
// //   MapContainer,
// //   TileLayer,
// //   CircleMarker,
// //   Popup,
// //   useMap,
// // } from "react-leaflet";

// // import "leaflet/dist/leaflet.css";

// // import {
// //   getLiveFires,
// //   predictLiveFire,
// //   getGISLayer,
// // } from "../services/api";

// // // ============================================================
// // // TYPES
// // // ============================================================

// // interface LiveFire {
// //   latitude: number;
// //   longitude: number;
// //   frp?: number;
// //   acq_date?: string;
// //   acq_datetime?: string;
// //   satellite?: string;
// //   instrument?: string;
// //   confidence?: string | number;
// //   daynight?: string;
// //   acq_time?: number | string;
// //   bright_ti4?: number;
// //   bright_ti5?: number;
// //   scan?: number;
// //   track?: number;
// // }

// // type PriorityLevel =
// //   | "CRITICAL"
// //   | "HIGH"
// //   | "MODERATE"
// //   | "LOW";

// // interface FirePriority {
// //   level: PriorityLevel;
// //   reasons?: string[];
// //   score?: number;
// // }

// // interface AnalysisResult {
// //   prediction?: {
// //     predicted_class?: string;
// //     confidence?: number;
// //     probabilities?: Record<string, number>;
// //   };

// //   industrial_association?: {
// //     level?: string;
// //     evidence?: string[];
// //     context_score?: number;
// //   };

// //   gas_assessment?: {
// //     assessment?: string;
// //     evidence?: string[];
// //     score?: number;
// //   };

// //   supporting_evidence?: string[];

// //   context_distance_m?: number;

// //   priority?: FirePriority;
// // }

// // interface GISPoint {
// //   latitude: number;
// //   longitude: number;
// //   value: number;
// // }

// // type LayerName =
// //   | "landCover"
// //   | "ndvi"
// //   | "ndwi"
// //   | "ndbi"
// //   | "no2"
// //   | "so2"
// //   | "co"
// //   | "ch4"
// //   | "persistence";

// // interface GISLayers {
// //   firms: boolean;
// //   landCover: boolean;
// //   ndvi: boolean;
// //   ndwi: boolean;
// //   ndbi: boolean;
// //   no2: boolean;
// //   so2: boolean;
// //   co: boolean;
// //   ch4: boolean;
// //   persistence: boolean;
// // }

// // // ============================================================
// // // CONSTANTS
// // // ============================================================

// // const PRIORITY_COLORS: Record<
// //   PriorityLevel | "NOT_ANALYZED",
// //   string
// // > = {
// //   CRITICAL: "#ff3030",
// //   HIGH: "#ff8c00",
// //   MODERATE: "#ffd21c",
// //   LOW: "#32c759",
// //   NOT_ANALYZED: "#f59e0b",
// // };

// // const GIS_LAYER_NAMES: LayerName[] = [
// //   "landCover",
// //   "ndvi",
// //   "ndwi",
// //   "ndbi",
// //   "no2",
// //   "so2",
// //   "co",
// //   "ch4",
// //   "persistence",
// // ];

// // // ============================================================
// // // HELPERS
// // // ============================================================

// // function normalizePriorityResult(
// //   result: any
// // ): AnalysisResult {
// //   /*
// //    * Keep the complete backend result.
// //    *
// //    * Priority can arrive either as:
// //    * {
// //    *   priority: {
// //    *     level: "HIGH"
// //    *   }
// //    * }
// //    *
// //    * or in alternative forms such as:
// //    * {
// //    *   priority: "HIGH"
// //    * }
// //    *
// //    * or:
// //    * {
// //    *   priority: {
// //    *     priority: "HIGH"
// //    *   }
// //    *
// //    * This function normalizes all of those into:
// //    *
// //    * result.priority.level
// //    */

// //   const backendResult =
// //     result?.analysis ||
// //     result?.result ||
// //     result?.data ||
// //     result ||
// //     {};

// //   const rawPriority =
// //     backendResult?.priority;

// //   let normalizedLevel:
// //     | PriorityLevel
// //     | undefined;

// //   let priorityObject: any = {};

// //   if (
// //     rawPriority &&
// //     typeof rawPriority === "object" &&
// //     !Array.isArray(rawPriority)
// //   ) {
// //     priorityObject = rawPriority;

// //     const possible = String(
// //       rawPriority.level ||
// //         rawPriority.priority ||
// //         rawPriority.classification ||
// //         ""
// //     )
// //       .trim()
// //       .toUpperCase();

// //     if (
// //       possible === "CRITICAL" ||
// //       possible === "HIGH" ||
// //       possible === "MODERATE" ||
// //       possible === "LOW"
// //     ) {
// //       normalizedLevel = possible;
// //     }
// //   }

// //   if (
// //     typeof rawPriority === "string"
// //   ) {
// //     const possible =
// //       rawPriority
// //         .trim()
// //         .toUpperCase();

// //     if (
// //       possible === "CRITICAL" ||
// //       possible === "HIGH" ||
// //       possible === "MODERATE" ||
// //       possible === "LOW"
// //     ) {
// //       normalizedLevel = possible;
// //     }
// //   }

// //   /*
// //    * Some backends may return priority_class
// //    * or priority_level directly.
// //    */
// //   if (!normalizedLevel) {
// //     const possible = String(
// //       backendResult?.priority_level ||
// //         backendResult?.priority_class ||
// //         ""
// //     )
// //       .trim()
// //       .toUpperCase();

// //     if (
// //       possible === "CRITICAL" ||
// //       possible === "HIGH" ||
// //       possible === "MODERATE" ||
// //       possible === "LOW"
// //     ) {
// //       normalizedLevel = possible;
// //     }
// //   }

// //   return {
// //     ...backendResult,

// //     priority: normalizedLevel
// //       ? {
// //           ...priorityObject,
// //           level: normalizedLevel,
// //         }
// //       : undefined,
// //   };
// // }

// // // ============================================================
// // // WORLD → ODISHA ANIMATION
// // // ============================================================

// // function WorldToOdisha() {
// //   const map = useMap();

// //   useEffect(() => {
// //     map.setView([20, 0], 2, {
// //       animate: false,
// //     });

// //     const timer =
// //       window.setTimeout(() => {
// //         map.flyTo(
// //           [20.3, 84.5],
// //           7,
// //           {
// //             animate: true,
// //             duration: 2.5,
// //           }
// //         );
// //       }, 900);

// //     return () => {
// //       window.clearTimeout(timer);
// //     };
// //   }, [map]);

// //   return null;
// // }

// // // ============================================================
// // // GIS LEGEND
// // // ============================================================

// // function GISLegend({
// //   layer,
// // }: {
// //   layer: LayerName;
// // }) {
// //   const legends: Record<
// //     LayerName,
// //     {
// //       title: string;
// //       items: {
// //         label: string;
// //         color: string;
// //       }[];
// //     }
// //   > = {
// //     landCover: {
// //       title: "LAND COVER",
// //       items: [
// //         { label: "Water", color: "#3498db" },
// //         { label: "Trees", color: "#228b22" },
// //         { label: "Grass", color: "#7fbf5b" },
// //         {
// //           label: "Flooded vegetation",
// //           color: "#20b2aa",
// //         },
// //         { label: "Crops", color: "#d4b84c" },
// //         { label: "Shrub", color: "#8fbc8f" },
// //         { label: "Built-up", color: "#d95f59" },
// //         { label: "Bare", color: "#b9a58a" },
// //         {
// //           label: "Snow / ice",
// //           color: "#f5f5f5",
// //         },
// //       ],
// //     },

// //     ndvi: {
// //       title: "NDVI",
// //       items: [
// //         { label: "< 0", color: "#b56576" },
// //         {
// //           label: "0 – 0.2",
// //           color: "#e6a23c",
// //         },
// //         {
// //           label: "0.2 – 0.4",
// //           color: "#d6c44c",
// //         },
// //         {
// //           label: "0.4 – 0.6",
// //           color: "#7cb342",
// //         },
// //         {
// //           label: "> 0.6",
// //           color: "#1b8a3b",
// //         },
// //       ],
// //     },

// //     ndwi: {
// //       title: "NDWI",
// //       items: [
// //         {
// //           label: "< -0.3",
// //           color: "#8c510a",
// //         },
// //         {
// //           label: "-0.3 – 0",
// //           color: "#d8b365",
// //         },
// //         {
// //           label: "0 – 0.3",
// //           color: "#80cdc1",
// //         },
// //         {
// //           label: "> 0.3",
// //           color: "#016c9a",
// //         },
// //       ],
// //     },

// //     ndbi: {
// //       title: "NDBI",
// //       items: [
// //         {
// //           label: "< -0.2",
// //           color: "#1a9850",
// //         },
// //         {
// //           label: "-0.2 – 0",
// //           color: "#91cf60",
// //         },
// //         {
// //           label: "0 – 0.2",
// //           color: "#fee08b",
// //         },
// //         {
// //           label: "0.2 – 0.4",
// //           color: "#f46d43",
// //         },
// //         {
// //           label: "> 0.4",
// //           color: "#d73027",
// //         },
// //       ],
// //     },

// //     no2: {
// //       title: "NO₂ ANOMALY",
// //       items: [
// //         {
// //           label: "< 0×",
// //           color: "#4c78a8",
// //         },
// //         {
// //           label: "0 – 1×",
// //           color: "#9ecae1",
// //         },
// //         {
// //           label: "1 – 2×",
// //           color: "#fddc7a",
// //         },
// //         {
// //           label: "2 – 4×",
// //           color: "#f28e2b",
// //         },
// //         {
// //           label: "> 4×",
// //           color: "#d73027",
// //         },
// //       ],
// //     },

// //     so2: {
// //       title: "SO₂ ANOMALY",
// //       items: [
// //         {
// //           label: "< 0×",
// //           color: "#4c78a8",
// //         },
// //         {
// //           label: "0 – 1×",
// //           color: "#9ecae1",
// //         },
// //         {
// //           label: "1 – 2×",
// //           color: "#fddc7a",
// //         },
// //         {
// //           label: "2 – 4×",
// //           color: "#f28e2b",
// //         },
// //         {
// //           label: "> 4×",
// //           color: "#d73027",
// //         },
// //       ],
// //     },

// //     co: {
// //       title: "CO ANOMALY",
// //       items: [
// //         {
// //           label: "< 0×",
// //           color: "#4c78a8",
// //         },
// //         {
// //           label: "0 – 1×",
// //           color: "#9ecae1",
// //         },
// //         {
// //           label: "1 – 2×",
// //           color: "#fddc7a",
// //         },
// //         {
// //           label: "2 – 4×",
// //           color: "#f28e2b",
// //         },
// //         {
// //           label: "> 4×",
// //           color: "#d73027",
// //         },
// //       ],
// //     },

// //     ch4: {
// //       title: "CH₄ ANOMALY",
// //       items: [
// //         {
// //           label: "< 0×",
// //           color: "#4c78a8",
// //         },
// //         {
// //           label: "0 – 1×",
// //           color: "#9ecae1",
// //         },
// //         {
// //           label: "1 – 2×",
// //           color: "#fddc7a",
// //         },
// //         {
// //           label: "2 – 4×",
// //           color: "#f28e2b",
// //         },
// //         {
// //           label: "> 4×",
// //           color: "#d73027",
// //         },
// //       ],
// //     },

// //     persistence: {
// //       title: "FIRE PERSISTENCE",
// //       items: [
// //         {
// //           label: "0",
// //           color: "#7f7f7f",
// //         },
// //         {
// //           label: "1 – 9",
// //           color: "#f6d55c",
// //         },
// //         {
// //           label: "10 – 49",
// //           color: "#ed9b40",
// //         },
// //         {
// //           label: "50 – 99",
// //           color: "#e76f51",
// //         },
// //         {
// //           label: "100+",
// //           color: "#b2182b",
// //         },
// //       ],
// //     },
// //   };

// //   const legend = legends[layer];

// //   return (
// //     <div
// //       style={{
// //         position: "absolute",
// //         bottom: "18px",
// //         left: "18px",
// //         zIndex: 1000,
// //         background:
// //           "rgba(8, 15, 25, 0.94)",
// //         color: "white",
// //         padding: "12px 14px",
// //         borderRadius: "8px",
// //         minWidth: "145px",
// //         maxWidth: "190px",
// //         boxShadow:
// //           "0 8px 25px rgba(0,0,0,0.35)",
// //         fontFamily:
// //           "Inter, Arial, sans-serif",
// //       }}
// //     >
// //       <div
// //         style={{
// //           fontSize: "10px",
// //           fontWeight: 800,
// //           letterSpacing: "1px",
// //           marginBottom: "8px",
// //         }}
// //       >
// //         {legend.title}
// //       </div>

// //       {legend.items.map((item) => (
// //         <div
// //           key={item.label}
// //           style={{
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "7px",
// //             marginBottom: "5px",
// //             fontSize: "10px",
// //           }}
// //         >
// //           <span
// //             style={{
// //               width: "9px",
// //               height: "9px",
// //               borderRadius: "50%",
// //               background: item.color,
// //               display: "inline-block",
// //               flexShrink: 0,
// //               border:
// //                 item.color === "#f5f5f5"
// //                   ? "1px solid #999"
// //                   : "none",
// //             }}
// //           />

// //           <span>{item.label}</span>
// //         </div>
// //       ))}
// //     </div>
// //   );
// // }

// // // ============================================================
// // // FIRMS PRIORITY LEGEND
// // // ============================================================

// // function FirePriorityLegend() {
// //   const items: Array<
// //     [PriorityLevel, string]
// //   > = [
// //     [
// //       "CRITICAL",
// //       PRIORITY_COLORS.CRITICAL,
// //     ],
// //     [
// //       "HIGH",
// //       PRIORITY_COLORS.HIGH,
// //     ],
// //     [
// //       "MODERATE",
// //       PRIORITY_COLORS.MODERATE,
// //     ],
// //     [
// //       "LOW",
// //       PRIORITY_COLORS.LOW,
// //     ],
// //   ];

// //   return (
// //     <div
// //       style={{
// //         position: "absolute",
// //         bottom: "18px",
// //         left: "18px",
// //         zIndex: 1000,
// //         background:
// //           "rgba(8, 15, 25, 0.94)",
// //         color: "white",
// //         padding: "12px 14px",
// //         borderRadius: "8px",
// //         minWidth: "155px",
// //         boxShadow:
// //           "0 8px 25px rgba(0,0,0,0.35)",
// //         fontFamily:
// //           "Inter, Arial, sans-serif",
// //       }}
// //     >
// //       <div
// //         style={{
// //           fontSize: "10px",
// //           fontWeight: 800,
// //           letterSpacing: "1px",
// //           marginBottom: "8px",
// //           opacity: 0.9,
// //         }}
// //       >
// //         FIRE RESPONSE PRIORITY
// //       </div>

// //       {items.map(
// //         ([label, color]) => (
// //           <div
// //             key={label}
// //             style={{
// //               display: "flex",
// //               alignItems: "center",
// //               gap: "7px",
// //               marginBottom: "5px",
// //               fontSize: "10px",
// //             }}
// //           >
// //             <span
// //               style={{
// //                 width: "9px",
// //                 height: "9px",
// //                 borderRadius: "50%",
// //                 background: color,
// //                 display: "inline-block",
// //                 flexShrink: 0,
// //               }}
// //             />

// //             <span>{label}</span>
// //           </div>
// //         )
// //       )}
// //     </div>
// //   );
// // }

// // // ============================================================
// // // GIS LAYER CONTROL
// // // ============================================================

// // interface GISLayerControlProps {
// //   layers: GISLayers;
// //   setLayers: Dispatch<
// //     SetStateAction<GISLayers>
// //   >;
// // }

// // function GISLayerControl({
// //   layers,
// //   setLayers,
// // }: GISLayerControlProps) {
// //   const [minimized, setMinimized] =
// //     useState(false);

// //   const toggleLayer = (
// //     layer: keyof GISLayers
// //   ) => {
// //     setLayers((previous) => ({
// //       ...previous,
// //       [layer]: !previous[layer],
// //     }));
// //   };

// //   const renderCheckbox = (
// //     key: keyof GISLayers,
// //     label: string
// //   ) => (
// //     <label
// //       key={key}
// //       style={{
// //         display: "flex",
// //         alignItems: "center",
// //         gap: "7px",
// //         marginBottom: "7px",
// //         cursor: "pointer",
// //       }}
// //     >
// //       <input
// //         type="checkbox"
// //         checked={layers[key]}
// //         onChange={() =>
// //           toggleLayer(key)
// //         }
// //       />

// //       {label}
// //     </label>
// //   );

// //   if (minimized) {
// //     return (
// //       <div
// //         style={{
// //           position: "absolute",
// //           top: "15px",
// //           right: "15px",
// //           zIndex: 1000,
// //           background:
// //             "rgba(8, 15, 25, 0.95)",
// //           padding: "10px 13px",
// //           borderRadius: "10px",
// //           color: "white",
// //           boxShadow:
// //             "0 8px 25px rgba(0,0,0,0.35)",
// //         }}
// //       >
// //         <button
// //           onClick={() =>
// //             setMinimized(false)
// //           }
// //           style={{
// //             border: "none",
// //             background: "transparent",
// //             color: "white",
// //             cursor: "pointer",
// //             padding: 0,
// //             fontSize: "12px",
// //             fontWeight: 700,
// //           }}
// //         >
// //           GIS LAYERS ▲
// //         </button>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div
// //       style={{
// //         position: "absolute",
// //         top: "15px",
// //         right: "15px",
// //         zIndex: 1000,
// //         background:
// //           "rgba(8, 15, 25, 0.95)",
// //         padding: "14px",
// //         borderRadius: "10px",
// //         color: "white",
// //         width: "210px",
// //         boxShadow:
// //           "0 8px 25px rgba(0,0,0,0.35)",
// //         fontSize: "13px",
// //       }}
// //     >
// //       <div
// //         style={{
// //           display: "flex",
// //           alignItems: "center",
// //           justifyContent:
// //             "space-between",
// //           marginBottom: "10px",
// //         }}
// //       >
// //         <div
// //           style={{
// //             fontWeight: 700,
// //             letterSpacing: "0.5px",
// //           }}
// //         >
// //           GIS LAYERS
// //         </div>

// //         <button
// //           onClick={() =>
// //             setMinimized(true)
// //           }
// //           style={{
// //             border: "none",
// //             background:
// //               "rgba(255,255,255,0.08)",
// //             color: "white",
// //             cursor: "pointer",
// //             width: "24px",
// //             height: "24px",
// //             borderRadius: "5px",
// //             fontSize: "14px",
// //             padding: 0,
// //           }}
// //         >
// //           −
// //         </button>
// //       </div>

// //       {renderCheckbox(
// //         "firms",
// //         "Live FIRMS"
// //       )}

// //       {renderCheckbox(
// //         "landCover",
// //         "Land Cover"
// //       )}

// //       {renderCheckbox(
// //         "ndvi",
// //         "NDVI"
// //       )}

// //       {renderCheckbox(
// //         "ndwi",
// //         "NDWI"
// //       )}

// //       {renderCheckbox(
// //         "ndbi",
// //         "NDBI"
// //       )}

// //       <div
// //         style={{
// //           height: "1px",
// //           background:
// //             "rgba(255,255,255,0.15)",
// //           margin: "8px 0",
// //         }}
// //       />

// //       <div
// //         style={{
// //           fontSize: "11px",
// //           opacity: 0.6,
// //           marginBottom: "6px",
// //         }}
// //       >
// //         ATMOSPHERIC
// //       </div>

// //       {renderCheckbox(
// //         "no2",
// //         "NO₂ anomaly"
// //       )}

// //       {renderCheckbox(
// //         "so2",
// //         "SO₂ anomaly"
// //       )}

// //       {renderCheckbox(
// //         "co",
// //         "CO anomaly"
// //       )}

// //       {renderCheckbox(
// //         "ch4",
// //         "CH₄ anomaly"
// //       )}

// //       <div
// //         style={{
// //           height: "1px",
// //           background:
// //             "rgba(255,255,255,0.15)",
// //           margin: "8px 0",
// //         }}
// //       />

// //       {renderCheckbox(
// //         "persistence",
// //         "Fire Persistence"
// //       )}
// //     </div>
// //   );
// // }

// // // ============================================================
// // // GIS DATA LAYER
// // // ============================================================

// // interface GISDataLayerProps {
// //   layer: LayerName;
// //   points: GISPoint[];
// // }

// // function GISDataLayer({
// //   layer,
// //   points,
// // }: GISDataLayerProps) {
// //   const getColor = (
// //     value: number
// //   ): string => {
// //     if (layer === "landCover") {
// //       const colors: Record<
// //         number,
// //         string
// //       > = {
// //         0: "#3498db",
// //         1: "#228b22",
// //         2: "#7fbf5b",
// //         3: "#20b2aa",
// //         4: "#d4b84c",
// //         5: "#8fbc8f",
// //         6: "#d95f59",
// //         7: "#b9a58a",
// //         8: "#f5f5f5",
// //       };

// //       return (
// //         colors[
// //           Math.round(value)
// //         ] || "#999999"
// //       );
// //     }

// //     if (layer === "ndvi") {
// //       if (value < 0)
// //         return "#b56576";

// //       if (value < 0.2)
// //         return "#e6a23c";

// //       if (value < 0.4)
// //         return "#d6c44c";

// //       if (value < 0.6)
// //         return "#7cb342";

// //       return "#1b8a3b";
// //     }

// //     if (layer === "ndwi") {
// //       if (value < -0.3)
// //         return "#8c510a";

// //       if (value < 0)
// //         return "#d8b365";

// //       if (value < 0.3)
// //         return "#80cdc1";

// //       return "#016c9a";
// //     }

// //     if (layer === "ndbi") {
// //       if (value < -0.2)
// //         return "#1a9850";

// //       if (value < 0)
// //         return "#91cf60";

// //       if (value < 0.2)
// //         return "#fee08b";

// //       if (value < 0.4)
// //         return "#f46d43";

// //       return "#d73027";
// //     }

// //     if (
// //       layer === "no2" ||
// //       layer === "so2" ||
// //       layer === "co" ||
// //       layer === "ch4"
// //     ) {
// //       if (value < 0)
// //         return "#4c78a8";

// //       if (value < 1)
// //         return "#9ecae1";

// //       if (value < 2)
// //         return "#fddc7a";

// //       if (value < 4)
// //         return "#f28e2b";

// //       return "#d73027";
// //     }

// //     if (layer === "persistence") {
// //       if (value <= 0)
// //         return "#7f7f7f";

// //       if (value < 10)
// //         return "#f6d55c";

// //       if (value < 50)
// //         return "#ed9b40";

// //       if (value < 100)
// //         return "#e76f51";

// //       return "#b2182b";
// //     }

// //     return "#ffffff";
// //   };

// //   return (
// //     <>
// //       {points.map(
// //         (point, index) => {
// //           const color =
// //             getColor(
// //               point.value
// //             );

// //           return (
// //             <CircleMarker
// //               key={`${layer}-${index}`}
// //               center={[
// //                 point.latitude,
// //                 point.longitude,
// //               ]}
// //               radius={
// //                 layer ===
// //                 "persistence"
// //                   ? 4
// //                   : 3
// //               }
// //               pathOptions={{
// //                 color,
// //                 fillColor: color,
// //                 fillOpacity: 0.35,
// //                 weight: 0,
// //               }}
// //             />
// //           );
// //         }
// //       )}
// //     </>
// //   );
// // }

// // // ============================================================
// // // MAIN FIRE MAP
// // // ============================================================

// // function FireMap() {
// //   const [fires, setFires] =
// //     useState<LiveFire[]>([]);

// //   const [analysis, setAnalysis] =
// //     useState<
// //       Record<
// //         string,
// //         AnalysisResult
// //       >
// //     >({});

// //   const [loadingFire, setLoadingFire] =
// //     useState<
// //       Record<string, boolean>
// //     >({});

// //   // ----------------------------------------------------------
// //   // IMPORTANT:
// //   // These refs prevent duplicate analysis requests.
// //   // They also prevent React StrictMode / stale-state issues.
// //   // ----------------------------------------------------------

// //   const analysisRef =
// //     useRef<
// //       Record<
// //         string,
// //         AnalysisResult
// //       >
// //     >({});

// //   const analyzingRef =
// //     useRef<Set<string>>(
// //       new Set()
// //     );

// //   const [layers, setLayers] =
// //     useState<GISLayers>({
// //       firms: true,

// //       landCover: false,
// //       ndvi: false,
// //       ndwi: false,
// //       ndbi: false,

// //       no2: false,
// //       so2: false,
// //       co: false,
// //       ch4: false,

// //       persistence: false,
// //     });

// //   const [gisData, setGISData] =
// //     useState<
// //       Record<
// //         string,
// //         GISPoint[]
// //       >
// //     >({});

// //   const [loadingGIS, setLoadingGIS] =
// //     useState<string | null>(
// //       null
// //     );

// //   // Keep ref synchronized with state
// //   useEffect(() => {
// //     analysisRef.current =
// //       analysis;
// //   }, [analysis]);

// //   // ==========================================================
// //   // FIRE KEY
// //   // ==========================================================

// //   const getFireKey = (
// //     fire: LiveFire
// //   ): string => {
// //     const lat = Number(fire.latitude ?? 0);
// //     const lng = Number(fire.longitude ?? 0);
// //     return `${lat.toFixed(
// //       6
// //     )}-${lng.toFixed(
// //       6
// //     )}-${fire.acq_date || ""}-${fire.acq_time || ""}`;
// //   };

// //   // ==========================================================
// //   // LOAD LIVE FIRMS
// //   // ==========================================================

// //   useEffect(() => {
// //     let mounted = true;

// //     async function loadFires() {
// //       try {
// //         const result =
// //           await getLiveFires();

// //         if (!mounted) return;

// //         const incomingFires: LiveFire[] = (
// //           Array.isArray(
// //             result?.fires
// //           )
// //             ? result.fires
// //             : Array.isArray(result)
// //             ? result
// //             : []
// //         ).filter(
// //           (f: any) =>
// //             f &&
// //             Number.isFinite(Number(f.latitude)) &&
// //             Number.isFinite(Number(f.longitude))
// //         );

// //         console.log(
// //           "Agni Netra - Live FIRMS fires:",
// //           incomingFires.length
// //         );

// //         setFires(
// //           incomingFires
// //         );
// //       } catch (error) {
// //         console.error(
// //           "Failed to load live FIRMS fires:",
// //           error
// //         );
// //       }
// //     }

// //     loadFires();

// //     const interval =
// //       window.setInterval(
// //         loadFires,
// //         5 * 60 * 1000
// //       );

// //     return () => {
// //       mounted = false;

// //       window.clearInterval(
// //         interval
// //       );
// //     };
// //   }, []);

// //   // ==========================================================
// //   // ANALYZE ONE FIRE
// //   // ==========================================================

// //   async function analyzeFire(
// //     fire: LiveFire
// //   ) {
// //     const key =
// //       getFireKey(fire);

// //     // Already analyzed
// //     if (
// //       analysisRef.current[key]
// //     ) {
// //       return;
// //     }

// //     // Already being analyzed
// //     if (
// //       analyzingRef.current.has(
// //         key
// //       )
// //     ) {
// //       return;
// //     }

// //     analyzingRef.current.add(
// //       key
// //     );

// //     setLoadingFire(
// //       (previous) => ({
// //         ...previous,
// //         [key]: true,
// //       })
// //     );

// //     try {
// //       console.log(
// //         "Agni Netra - Analyzing fire:",
// //         fire.latitude,
// //         fire.longitude
// //       );

// //       const result =
// //         await predictLiveFire(
// //           fire
// //         );

// //       console.log(
// //         "Agni Netra - Analysis result:",
// //         result
// //       );

// //       if (result?.success === false) {
// //         console.error(
// //           "Agni Netra - Prediction FAILED for fire:",
// //           fire.latitude,
// //           fire.longitude,
// //           "Backend error:",
// //           result.error
// //         );
// //         // Do NOT cache this as analyzed.
// //         // It will be retried on the next fires refresh.
// //         return;
// //       }

// //       const normalizedResult =
// //         normalizePriorityResult(
// //           result
// //         );

// //       /*
// //        * IMPORTANT:
// //        * Update the ref immediately.
// //        * This prevents another worker/effect from
// //        * sending the same fire again.
// //        */
// //       analysisRef.current = {
// //         ...analysisRef.current,
// //         [key]:
// //           normalizedResult,
// //       };

// //       setAnalysis(
// //         (previous) => ({
// //           ...previous,
// //           [key]:
// //             normalizedResult,
// //         })
// //       );
// //     } catch (error) {
// //       console.error(
// //         "Fire analysis failed:",
// //         fire,
// //         error
// //       );
// //     } finally {
// //       analyzingRef.current.delete(
// //         key
// //       );

// //       setLoadingFire(
// //         (previous) => ({
// //           ...previous,
// //           [key]: false,
// //         })
// //       );
// //     }
// //   }

// //   // ==========================================================
// //   // AUTOMATIC ANALYSIS OF ALL NEW FIRMS FIRES
// //   // ==========================================================

// //   useEffect(() => {
// //     if (fires.length === 0) {
// //       return;
// //     }

// //     /*
// //      * Build a snapshot of every fire that has not
// //      * already been analyzed or queued.
// //      */
// //     const queue =
// //       fires.filter((fire) => {
// //         const key =
// //           getFireKey(fire);

// //         return (
// //           !analysisRef.current[
// //             key
// //           ] &&
// //           !analyzingRef.current.has(
// //             key
// //           )
// //         );
// //       });

// //     console.log(
// //       "Agni Netra - New fires waiting for analysis:",
// //       queue.length
// //     );

// //     if (queue.length === 0) {
// //       return;
// //     }

// //     /*
// //      * Four workers allow four fires to be analyzed
// //      * simultaneously while still processing every fire.
// //      */
// //     let currentIndex = 0;

// //     const worker = async () => {
// //       while (true) {
// //         const index =
// //           currentIndex++;

// //         if (
// //           index >=
// //           queue.length
// //         ) {
// //           break;
// //         }

// //         const fire =
// //           queue[index];

// //         if (!fire) {
// //           continue;
// //         }

// //         await analyzeFire(
// //           fire
// //         );
// //       }
// //     };

// //     const workerCount =
// //       Math.min(
// //         4,
// //         queue.length
// //       );

// //     Promise.all(
// //       Array.from(
// //         {
// //           length:
// //             workerCount,
// //         },
// //         () => worker()
// //       )
// //     ).catch((error) => {
// //       console.error(
// //         "Automatic FIRMS analysis failed:",
// //         error
// //       );
// //     });

// //     // This effect intentionally runs when
// //     // the FIRMS fire list changes.
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [fires]);

// //   // ==========================================================
// //   // GIS DATA
// //   // ==========================================================

// //   useEffect(() => {
// //     const layerMap: Record<
// //       LayerName,
// //       string
// //     > = {
// //       landCover:
// //         "landcover",
// //       ndvi: "ndvi",
// //       ndwi: "ndwi",
// //       ndbi: "ndbi",
// //       no2: "no2",
// //       so2: "so2",
// //       co: "co",
// //       ch4: "ch4",
// //       persistence:
// //         "persistence",
// //     };

// //     async function loadLayer(
// //       layerName: LayerName
// //     ) {
// //       const endpoint =
// //         layerMap[layerName];

// //       if (!endpoint) {
// //         return;
// //       }

// //       if (
// //         gisData[layerName]
// //       ) {
// //         return;
// //       }

// //       try {
// //         setLoadingGIS(
// //           layerName
// //         );

// //         const result =
// //           await getGISLayer(
// //             endpoint
// //           );

// //         if (
// //           result?.success &&
// //           Array.isArray(
// //             result.points
// //           )
// //         ) {
// //           setGISData(
// //             (previous) => ({
// //               ...previous,
// //               [layerName]:
// //                 result.points,
// //             })
// //           );
// //         }
// //       } catch (error) {
// //         console.error(
// //           `Failed to load GIS layer ${layerName}:`,
// //           error
// //         );
// //       } finally {
// //         setLoadingGIS(null);
// //       }
// //     }

// //     GIS_LAYER_NAMES.forEach(
// //       (layerName) => {
// //         if (
// //           layers[layerName]
// //         ) {
// //           loadLayer(
// //             layerName
// //           );
// //         }
// //       }
// //     );

// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [layers]);

// //   // ==========================================================
// //   // GET PRIORITY
// //   // ==========================================================

// //   const getPriority = (
// //     fire: LiveFire
// //   ): PriorityLevel | undefined => {
// //     const result =
// //       analysis[
// //         getFireKey(fire)
// //       ];

// //     const level =
// //       result?.priority
// //         ?.level;

// //     if (
// //       level === "CRITICAL" ||
// //       level === "HIGH" ||
// //       level === "MODERATE" ||
// //       level === "LOW"
// //     ) {
// //       return level;
// //     }

// //     return undefined;
// //   };

// //   // ==========================================================
// //   // GET DOT COLOR
// //   // ==========================================================

// //   const getPriorityColor = (
// //     fire: LiveFire
// //   ): string => {
// //     const priority =
// //       getPriority(fire);

// //     if (!priority) {
// //       return PRIORITY_COLORS.NOT_ANALYZED;
// //     }

// //     return PRIORITY_COLORS[
// //       priority
// //     ];
// //   };

// //   // ==========================================================
// //   // PRIORITY COUNTS
// //   // ==========================================================

// //   const priorityCounts: Record<
// //     PriorityLevel,
// //     number
// //   > = {
// //     CRITICAL: 0,
// //     HIGH: 0,
// //     MODERATE: 0,
// //     LOW: 0,
// //   };

// //   fires.forEach(
// //     (fire) => {
// //       const priority =
// //         getPriority(fire);

// //       if (priority) {
// //         priorityCounts[
// //           priority
// //         ] += 1;
// //       }
// //     }
// //   );

// //   // ==========================================================
// //   // ANALYZED COUNT
// //   // ==========================================================

// //   const analyzedCount =
// //     fires.reduce(
// //       (
// //         count,
// //         fire
// //       ) => {
// //         const key =
// //           getFireKey(fire);

// //         if (
// //           analysis[key]
// //             ?.priority
// //             ?.level
// //         ) {
// //           return count + 1;
// //         }

// //         return count;
// //       },
// //       0
// //     );

// //   // ==========================================================
// //   // CRITICAL LOCATIONS
// //   // ==========================================================

// //   const criticalFires =
// //     fires
// //       .filter(
// //         (fire) =>
// //           getPriority(
// //             fire
// //           ) === "CRITICAL"
// //       )
// //       .sort(
// //         (a, b) =>
// //           Number(
// //             b.frp || 0
// //           ) -
// //           Number(
// //             a.frp || 0
// //           )
// //       )
// //       .slice(0, 3);

// //   // ==========================================================
// //   // ACTIVE GIS LEGEND
// //   // ==========================================================

// //   const activeGISLayer:
// //     | LayerName
// //     | undefined =
// //     GIS_LAYER_NAMES.find(
// //       (layer) =>
// //         layers[layer]
// //     );

// //   // ==========================================================
// //   // RENDER
// //   // ==========================================================

// //   return (
// //     <div
// //       style={{
// //         position: "relative",
// //         width: "100%",
// //         height: "100%",
// //         overflow: "hidden",
// //       }}
// //     >
// //       <MapContainer
// //         center={[
// //           20.3,
// //           84.5,
// //         ]}
// //         zoom={2}
// //         minZoom={2}
// //         maxZoom={18}
// //         style={{
// //           width: "100%",
// //           height: "100%",
// //         }}
// //       >
// //         {/* BASE MAP */}

// //         <TileLayer
// //           attribution="© OpenStreetMap contributors"
// //           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
// //         />

// //         {/* WORLD → ODISHA */}

// //         <WorldToOdisha />

// //         {/* GIS OVERLAYS */}

// //         {GIS_LAYER_NAMES.map(
// //           (layerName) => {
// //             if (
// //               !layers[layerName]
// //             ) {
// //               return null;
// //             }

// //             const points =
// //               gisData[
// //                 layerName
// //               ];

// //             if (
// //               !points ||
// //               points.length === 0
// //             ) {
// //               return null;
// //             }

// //             return (
// //               <GISDataLayer
// //                 key={
// //                   layerName
// //                 }
// //                 layer={
// //                   layerName
// //                 }
// //                 points={points}
// //               />
// //             );
// //           }
// //         )}

// //         {/* LIVE FIRMS */}

// //         {layers.firms &&
// //           fires.map(
// //             (
// //               fire,
// //               index
// //             ) => {
// //               const key =
// //                 getFireKey(
// //                   fire
// //                 );

// //               const result =
// //                 analysis[key];

// //               const priority =
// //                 getPriority(
// //                   fire
// //                 );

// //               const color =
// //                 getPriorityColor(
// //                   fire
// //                 );

// //               const isLoading =
// //                 Boolean(
// //                   loadingFire[
// //                     key
// //                   ]
// //                 );

// //               return (
// //                 <CircleMarker
// //                   key={`${key}-${index}`}
// //                   center={[
// //                     fire.latitude,
// //                     fire.longitude,
// //                   ]}
// //                   radius={
// //                     priority ===
// //                     "CRITICAL"
// //                       ? 7
// //                       : priority ===
// //                         "HIGH"
// //                       ? 6
// //                       : 5
// //                   }
// //                   pathOptions={{
// //                     color,
// //                     fillColor:
// //                       color,
// //                     fillOpacity:
// //                       0.95,
// //                     weight:
// //                       priority ===
// //                       "CRITICAL"
// //                         ? 2
// //                         : 1.5,
// //                   }}
// //                   eventHandlers={{
// //                     click: () =>
// //                       analyzeFire(
// //                         fire
// //                       ),
// //                   }}
// //                 >
// //                   <Popup
// //                     maxWidth={
// //                       380
// //                     }
// //                     minWidth={
// //                       300
// //                     }
// //                     autoPan
// //                     autoPanPadding={[
// //                       30,
// //                       30,
// //                     ]}
// //                   >
// //                     <div
// //                       style={{
// //                         width:
// //                           "100%",
// //                         maxHeight:
// //                           "430px",
// //                         overflowY:
// //                           "auto",
// //                         overflowX:
// //                           "hidden",
// //                         paddingRight:
// //                           "8px",
// //                         boxSizing:
// //                           "border-box",
// //                         fontFamily:
// //                           "Inter, Arial, sans-serif",
// //                       }}
// //                     >
// //                       {/* BRAND */}

// //                       <div
// //                         style={{
// //                           fontSize:
// //                             "11px",
// //                           fontWeight:
// //                             800,
// //                           letterSpacing:
// //                             "1.8px",
// //                           color:
// //                             "#e53935",
// //                           marginBottom:
// //                             "5px",
// //                         }}
// //                       >
// //                         AGNI NETRA
// //                       </div>

// //                       <h3
// //                         style={{
// //                           margin:
// //                             "0 0 5px 0",
// //                           fontSize:
// //                             "20px",
// //                         }}
// //                       >
// //                         Fire Detection
// //                       </h3>

// //                       <div
// //                         style={{
// //                           fontSize:
// //                             "12px",
// //                           color:
// //                             "#666",
// //                           marginBottom:
// //                             "12px",
// //                         }}
// //                       >
// //                         NASA FIRMS
// //                         Detection
// //                       </div>

// //                       {/* FIRMS DATA */}

// //                       <div
// //                         style={{
// //                           display:
// //                             "grid",
// //                           gridTemplateColumns:
// //                             "1fr 1fr",
// //                           gap:
// //                             "7px",
// //                           fontSize:
// //                             "12px",
// //                         }}
// //                       >
// //                         <div>
// //                           <strong>
// //                             FRP:
// //                           </strong>{" "}
// //                           {fire.frp ??
// //                             "N/A"}{" "}
// //                           MW
// //                         </div>

// //                         <div>
// //                           <strong>
// //                             Date:
// //                           </strong>{" "}
// //                           {fire.acq_date ??
// //                             "N/A"}
// //                         </div>

// //                         <div>
// //                           <strong>
// //                             Satellite:
// //                           </strong>{" "}
// //                           {fire.satellite ??
// //                             fire.instrument ??
// //                             "VIIRS"}
// //                         </div>

// //                         <div>
// //                           <strong>
// //                             Confidence:
// //                           </strong>{" "}
// //                           {fire.confidence ??
// //                             "N/A"}
// //                         </div>
// //                       </div>

// //                       <div
// //                         style={{
// //                           marginTop:
// //                             "8px",
// //                           fontSize:
// //                             "11px",
// //                           color:
// //                             "#666",
// //                         }}
// //                       >
// //                         Coordinates:{" "}
// //                         {fire.latitude.toFixed(
// //                           4
// //                         )}
// //                         ,{" "}
// //                         {fire.longitude.toFixed(
// //                           4
// //                         )}
// //                       </div>

// //                       {/* RESPONSE PRIORITY */}

// //                       {priority && (
// //                         <div
// //                           style={{
// //                             marginTop:
// //                               "14px",
// //                             padding:
// //                               "12px",
// //                             borderRadius:
// //                               "8px",
// //                             background:
// //                               priority ===
// //                               "CRITICAL"
// //                                 ? "#fff0f0"
// //                                 : priority ===
// //                                   "HIGH"
// //                                 ? "#fff7ed"
// //                                 : priority ===
// //                                   "MODERATE"
// //                                 ? "#fffbea"
// //                                 : "#f2faf3",
// //                             border:
// //                               `1px solid ${color}`,
// //                           }}
// //                         >
// //                           <div
// //                             style={{
// //                               fontSize:
// //                                 "10px",
// //                               fontWeight:
// //                                 800,
// //                               color:
// //                                 "#777",
// //                               letterSpacing:
// //                                 "0.8px",
// //                               marginBottom:
// //                                 "5px",
// //                             }}
// //                           >
// //                             FIRE RESPONSE
// //                             PRIORITY
// //                           </div>

// //                           <div
// //                             style={{
// //                               display:
// //                                 "flex",
// //                               alignItems:
// //                                 "center",
// //                               gap:
// //                                 "8px",
// //                               fontSize:
// //                                 "19px",
// //                               fontWeight:
// //                                 800,
// //                               color,
// //                             }}
// //                           >
// //                             <span
// //                               style={{
// //                                 width:
// //                                   "10px",
// //                                 height:
// //                                   "10px",
// //                                 borderRadius:
// //                                   "50%",
// //                                 background:
// //                                   color,
// //                                 display:
// //                                   "inline-block",
// //                               }}
// //                             />

// //                             {priority}
// //                           </div>

// //                           {result
// //                             ?.priority
// //                             ?.score !==
// //                             undefined && (
// //                             <div
// //                               style={{
// //                                 marginTop:
// //                                   "5px",
// //                                 fontSize:
// //                                   "10px",
// //                                 color:
// //                                   "#777",
// //                               }}
// //                             >
// //                               Priority
// //                               score:{" "}
// //                               {
// //                                 result
// //                                   .priority
// //                                   .score
// //                               }
// //                             </div>
// //                           )}

// //                           {result
// //                             ?.priority
// //                             ?.reasons &&
// //                             result
// //                               .priority
// //                               .reasons
// //                               .length >
// //                               0 && (
// //                               <div
// //                                 style={{
// //                                   marginTop:
// //                                     "9px",
// //                                 }}
// //                               >
// //                                 <div
// //                                   style={{
// //                                     fontSize:
// //                                       "10px",
// //                                     fontWeight:
// //                                       800,
// //                                     color:
// //                                       "#777",
// //                                     letterSpacing:
// //                                       "0.7px",
// //                                     marginBottom:
// //                                       "4px",
// //                                   }}
// //                                 >
// //                                   DECISION SUPPORT
// //                                 </div>

// //                                 {result.priority.reasons.map(
// //                                   (
// //                                     reason,
// //                                     i
// //                                   ) => (
// //                                     <div
// //                                       key={
// //                                         i
// //                                       }
// //                                       style={{
// //                                         fontSize:
// //                                           "11px",
// //                                         color:
// //                                           "#555",
// //                                         marginTop:
// //                                           "4px",
// //                                       }}
// //                                     >
// //                                       •{" "}
// //                                       {
// //                                         reason
// //                                       }
// //                                     </div>
// //                                   )
// //                                 )}
// //                               </div>
// //                             )}
// //                         </div>
// //                       )}

// //                       {/* MODEL ANALYSIS */}

// //                       {result?.prediction && (
// //                         <div
// //                           style={{
// //                             marginTop:
// //                               "14px",
// //                             padding:
// //                               "11px",
// //                             borderRadius:
// //                               "7px",
// //                             background:
// //                               "#f7f9fc",
// //                             border:
// //                               "1px solid #dce3ec",
// //                           }}
// //                         >
// //                           <div
// //                             style={{
// //                               fontSize:
// //                                 "10px",
// //                               fontWeight:
// //                                 800,
// //                               color:
// //                                 "#777",
// //                               letterSpacing:
// //                                 "0.8px",
// //                               marginBottom:
// //                                 "7px",
// //                             }}
// //                           >
// //                             AI FIRE CLASSIFICATION
// //                           </div>

// //                           {result
// //                             .prediction
// //                             .predicted_class && (
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "12px",
// //                                 marginBottom:
// //                                   "5px",
// //                               }}
// //                             >
// //                               <strong>
// //                                 Predicted
// //                                 class:
// //                               </strong>{" "}
// //                               {
// //                                 result
// //                                   .prediction
// //                                   .predicted_class
// //                               }
// //                             </div>
// //                           )}

// //                           {result
// //                             .prediction
// //                             .confidence !==
// //                             undefined && (
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "12px",
// //                               }}
// //                             >
// //                               <strong>
// //                                 Model
// //                                 confidence:
// //                               </strong>{" "}
// //                               {(
// //                                 Number(
// //                                   result
// //                                     .prediction
// //                                     .confidence
// //                                 ) * 100
// //                               ).toFixed(
// //                                 1
// //                               )}
// //                               %
// //                             </div>
// //                           )}

// //                           {result
// //                             .prediction
// //                             .probabilities && (
// //                             <div
// //                               style={{
// //                                 marginTop:
// //                                   "8px",
// //                               }}
// //                             >
// //                               {Object.entries(
// //                                 result
// //                                   .prediction
// //                                   .probabilities
// //                               ).map(
// //                                 ([
// //                                   label,
// //                                   probability,
// //                                 ]) => (
// //                                   <div
// //                                     key={
// //                                       label
// //                                     }
// //                                     style={{
// //                                       fontSize:
// //                                         "11px",
// //                                       marginTop:
// //                                         "4px",
// //                                       display:
// //                                         "flex",
// //                                       justifyContent:
// //                                         "space-between",
// //                                     }}
// //                                   >
// //                                     <span>
// //                                       {label}
// //                                     </span>

// //                                     <strong>
// //                                       {(
// //                                         Number(
// //                                           probability
// //                                         ) *
// //                                         100
// //                                       ).toFixed(
// //                                         1
// //                                       )}
// //                                       %
// //                                     </strong>
// //                                   </div>
// //                                 )
// //                               )}
// //                             </div>
// //                           )}
// //                         </div>
// //                       )}

// //                       {/* INDUSTRIAL ASSOCIATION */}

// //                       {result?.industrial_association && (
// //                         <div
// //                           style={{
// //                             marginTop:
// //                               "12px",
// //                             padding:
// //                               "11px",
// //                             borderRadius:
// //                               "7px",
// //                             background:
// //                               "#f7f7f7",
// //                             border:
// //                               "1px solid #ddd",
// //                           }}
// //                         >
// //                           <div
// //                             style={{
// //                               fontSize:
// //                                 "10px",
// //                               fontWeight:
// //                                 800,
// //                               color:
// //                                 "#777",
// //                               letterSpacing:
// //                                 "0.8px",
// //                               marginBottom:
// //                                 "7px",
// //                             }}
// //                           >
// //                             INDUSTRIAL FIRE
// //                             ASSESSMENT
// //                           </div>

// //                           {result
// //                             .industrial_association
// //                             .level && (
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "12px",
// //                                 marginBottom:
// //                                   "5px",
// //                               }}
// //                             >
// //                               <strong>
// //                                 Association:
// //                               </strong>{" "}
// //                               {
// //                                 result
// //                                   .industrial_association
// //                                   .level
// //                               }
// //                             </div>
// //                           )}

// //                           {result
// //                             .industrial_association
// //                             .context_score !==
// //                             undefined && (
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "11px",
// //                                 color:
// //                                   "#666",
// //                               }}
// //                             >
// //                               Context
// //                               score:{" "}
// //                               {
// //                                 result
// //                                   .industrial_association
// //                                   .context_score
// //                               }
// //                             </div>
// //                           )}

// //                           {result
// //                             .industrial_association
// //                             .evidence &&
// //                             result
// //                               .industrial_association
// //                               .evidence
// //                               .length >
// //                               0 && (
// //                               <div
// //                                 style={{
// //                                   marginTop:
// //                                     "7px",
// //                                 }}
// //                               >
// //                                 {result.industrial_association.evidence.map(
// //                                   (
// //                                     evidence,
// //                                     i
// //                                   ) => (
// //                                     <div
// //                                       key={
// //                                         i
// //                                       }
// //                                       style={{
// //                                         fontSize:
// //                                           "11px",
// //                                         color:
// //                                           "#555",
// //                                         marginTop:
// //                                           "4px",
// //                                       }}
// //                                     >
// //                                       •{" "}
// //                                       {
// //                                         evidence
// //                                       }
// //                                     </div>
// //                                   )
// //                                 )}
// //                               </div>
// //                             )}
// //                         </div>
// //                       )}

// //                       {/* GAS LEAK ASSESSMENT */}

// //                       {result?.gas_assessment && (
// //                         <div
// //                           style={{
// //                             marginTop:
// //                               "12px",
// //                             padding:
// //                               "11px",
// //                             borderRadius:
// //                               "7px",
// //                             background:
// //                               "#f7f7f7",
// //                             border:
// //                               "1px solid #ddd",
// //                           }}
// //                         >
// //                           <div
// //                             style={{
// //                               fontSize:
// //                                 "10px",
// //                               fontWeight:
// //                                 800,
// //                               color:
// //                                 "#777",
// //                               letterSpacing:
// //                                 "0.8px",
// //                               marginBottom:
// //                                 "7px",
// //                             }}
// //                           >
// //                             GAS LEAK
// //                             ASSESSMENT
// //                           </div>

// //                           {result
// //                             .gas_assessment
// //                             .assessment && (
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "12px",
// //                                 marginBottom:
// //                                   "5px",
// //                               }}
// //                             >
// //                               <strong>
// //                                 Assessment:
// //                               </strong>{" "}
// //                               {
// //                                 result
// //                                   .gas_assessment
// //                                   .assessment
// //                               }
// //                             </div>
// //                           )}

// //                           {result
// //                             .gas_assessment
// //                             .score !==
// //                             undefined && (
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "11px",
// //                                 color:
// //                                   "#666",
// //                               }}
// //                             >
// //                               Gas anomaly
// //                               score:{" "}
// //                               {
// //                                 result
// //                                   .gas_assessment
// //                                   .score
// //                               }
// //                             </div>
// //                           )}

// //                           {result
// //                             .gas_assessment
// //                             .evidence &&
// //                             result
// //                               .gas_assessment
// //                               .evidence
// //                               .length >
// //                               0 && (
// //                               <div
// //                                 style={{
// //                                   marginTop:
// //                                     "7px",
// //                                 }}
// //                               >
// //                                 {result.gas_assessment.evidence.map(
// //                                   (
// //                                     evidence,
// //                                     i
// //                                   ) => (
// //                                     <div
// //                                       key={
// //                                         i
// //                                       }
// //                                       style={{
// //                                         fontSize:
// //                                           "11px",
// //                                         color:
// //                                           "#555",
// //                                         marginTop:
// //                                           "4px",
// //                                       }}
// //                                     >
// //                                       •{" "}
// //                                       {
// //                                         evidence
// //                                       }
// //                                     </div>
// //                                   )
// //                                 )}
// //                               </div>
// //                             )}
// //                         </div>
// //                       )}

// //                       {/* SUPPORTING EVIDENCE */}

// //                       {result
// //                         ?.supporting_evidence &&
// //                         result
// //                           .supporting_evidence
// //                           .length >
// //                           0 && (
// //                           <div
// //                             style={{
// //                               marginTop:
// //                                 "12px",
// //                               padding:
// //                                 "11px",
// //                               borderRadius:
// //                                 "7px",
// //                               background:
// //                                 "#f7f7f7",
// //                               border:
// //                                 "1px solid #ddd",
// //                             }}
// //                           >
// //                             <div
// //                               style={{
// //                                 fontSize:
// //                                   "10px",
// //                                 fontWeight:
// //                                   800,
// //                                 color:
// //                                   "#777",
// //                                 letterSpacing:
// //                                   "0.8px",
// //                                 marginBottom:
// //                                   "7px",
// //                               }}
// //                             >
// //                               SUPPORTING EVIDENCE
// //                             </div>

// //                             {result.supporting_evidence.map(
// //                               (
// //                                 evidence,
// //                                 i
// //                               ) => (
// //                                 <div
// //                                   key={
// //                                     i
// //                                   }
// //                                   style={{
// //                                     fontSize:
// //                                       "11px",
// //                                     color:
// //                                       "#555",
// //                                     marginTop:
// //                                       "4px",
// //                                   }}
// //                                 >
// //                                   •{" "}
// //                                   {
// //                                     evidence
// //                                   }
// //                                 </div>
// //                               )
// //                             )}
// //                           </div>
// //                         )}

// //                       {/* CONTEXT DISTANCE */}

// //                       {result?.context_distance_m !==
// //                         undefined && (
// //                         <div
// //                           style={{
// //                             marginTop:
// //                               "10px",
// //                             fontSize:
// //                               "11px",
// //                             color:
// //                               "#666",
// //                           }}
// //                         >
// //                           Context distance:{" "}
// //                           {Number(
// //                             result.context_distance_m
// //                           ).toFixed(
// //                             0
// //                           )}{" "}
// //                           m
// //                         </div>
// //                       )}

// //                       {/* ANALYSIS IN PROGRESS */}

// //                       {!priority &&
// //                         isLoading && (
// //                           <div
// //                             style={{
// //                               marginTop:
// //                                 "14px",
// //                               padding:
// //                                 "11px",
// //                               borderRadius:
// //                                 "7px",
// //                               background:
// //                                 "#fff7ed",
// //                               border:
// //                                 "1px solid #f59e0b",
// //                               fontSize:
// //                                 "11px",
// //                               color:
// //                                 "#8a4b08",
// //                             }}
// //                           >
// //                             <strong>
// //                               Analyzing fire
// //                               response
// //                               priority...
// //                             </strong>
// //                           </div>
// //                         )}

// //                       {/* NOT AVAILABLE */}

// //                       {!priority &&
// //                         !isLoading && (
// //                           <div
// //                             style={{
// //                               marginTop:
// //                                 "14px",
// //                               padding:
// //                                 "10px",
// //                               borderRadius:
// //                                 "7px",
// //                               background:
// //                                 "#f7f7f7",
// //                               fontSize:
// //                                 "11px",
// //                               color:
// //                                 "#666",
// //                             }}
// //                           >
// //                             Response
// //                             priority
// //                             unavailable.
// //                             Click the
// //                             detection to
// //                             retry analysis.
// //                           </div>
// //                         )}

// //                       {/* BASIS / DISCLAIMER */}

// //                       <div
// //                         style={{
// //                           marginTop:
// //                             "14px",
// //                           paddingTop:
// //                             "9px",
// //                           borderTop:
// //                             "1px solid #e5e5e5",
// //                           fontSize:
// //                             "9px",
// //                           lineHeight:
// //                             1.45,
// //                           color:
// //                             "#888",
// //                         }}
// //                       >
// //                         Analysis is based on
// //                         NASA FIRMS detection
// //                         data and the
// //                         supporting satellite,
// //                         environmental,
// //                         industrial and
// //                         atmospheric evidence
// //                         available to the Agni
// //                         Netra model.
// //                       </div>
// //                     </div>
// //                   </Popup>
// //                 </CircleMarker>
// //               );
// //             }
// //           )}
// //       </MapContainer>

// //       {/* ====================================================
// //           RESPONSE PRIORITY SUMMARY
// //       ==================================================== */}

// //       <div
// //         style={{
// //           position:
// //             "absolute",
// //           top: "15px",
// //           left: "15px",
// //           zIndex: 1000,
// //           width: "225px",
// //           background:
// //             "rgba(8, 15, 25, 0.95)",
// //           color: "white",
// //           padding: "13px",
// //           borderRadius: "9px",
// //           boxShadow:
// //             "0 8px 25px rgba(0,0,0,0.35)",
// //           fontFamily:
// //             "Inter, Arial, sans-serif",
// //         }}
// //       >
// //         <div
// //           style={{
// //             fontSize:
// //               "9px",
// //             fontWeight:
// //               800,
// //             letterSpacing:
// //               "1.8px",
// //             color:
// //               "#ff7a00",
// //             marginBottom:
// //               "3px",
// //           }}
// //         >
// //           AGNI NETRA
// //         </div>

// //         <div
// //           style={{
// //             fontSize:
// //               "15px",
// //             fontWeight:
// //               800,
// //             marginBottom:
// //               "10px",
// //           }}
// //         >
// //           Response Priority
// //         </div>

// //         <div
// //           style={{
// //             display:
// //               "grid",
// //             gridTemplateColumns:
// //               "1fr 1fr",
// //             gap: "6px",
// //           }}
// //         >
// //           {(
// //             [
// //               [
// //                 "CRITICAL",
// //                 priorityCounts.CRITICAL,
// //                 PRIORITY_COLORS.CRITICAL,
// //               ],
// //               [
// //                 "HIGH",
// //                 priorityCounts.HIGH,
// //                 PRIORITY_COLORS.HIGH,
// //               ],
// //               [
// //                 "MODERATE",
// //                 priorityCounts.MODERATE,
// //                 PRIORITY_COLORS.MODERATE,
// //               ],
// //               [
// //                 "LOW",
// //                 priorityCounts.LOW,
// //                 PRIORITY_COLORS.LOW,
// //               ],
// //             ] as [
// //               PriorityLevel,
// //               number,
// //               string
// //             ][]
// //           ).map(
// //             ([
// //               label,
// //               count,
// //               color,
// //             ]) => (
// //               <div
// //                 key={
// //                   label
// //                 }
// //                 style={{
// //                   padding:
// //                     "8px",
// //                   borderRadius:
// //                     "6px",
// //                   background:
// //                     `${color}18`,
// //                   border:
// //                     `1px solid ${color}55`,
// //                 }}
// //               >
// //                 <div
// //                   style={{
// //                     fontSize:
// //                       "8px",
// //                     fontWeight:
// //                       800,
// //                     color,
// //                     marginBottom:
// //                       "3px",
// //                   }}
// //                 >
// //                   {label}
// //                 </div>

// //                 <div
// //                   style={{
// //                     fontSize:
// //                       "18px",
// //                     fontWeight:
// //                       800,
// //                   }}
// //                 >
// //                   {count}
// //                 </div>
// //               </div>
// //             )
// //           )}
// //         </div>

// //         <div
// //           style={{
// //             marginTop:
// //               "9px",
// //             paddingTop:
// //               "8px",
// //             borderTop:
// //               "1px solid rgba(255,255,255,0.12)",
// //             fontSize:
// //               "10px",
// //             color:
// //               "#b9b9b9",
// //           }}
// //         >
// //           Analyzed:{" "}
// //           <strong
// //             style={{
// //               color:
// //                 "white",
// //             }}
// //           >
// //             {analyzedCount}
// //           </strong>{" "}
// //           /{" "}
// //           {fires.length}
// //         </div>

// //         {criticalFires.length >
// //           0 && (
// //           <div
// //             style={{
// //               marginTop:
// //                 "9px",
// //               paddingTop:
// //                 "8px",
// //               borderTop:
// //                 "1px solid rgba(255,255,255,0.12)",
// //             }}
// //           >
// //             <div
// //               style={{
// //                 fontSize:
// //                   "9px",
// //                 fontWeight:
// //                   800,
// //                 color:
// //                   PRIORITY_COLORS.CRITICAL,
// //                 letterSpacing:
// //                   "0.8px",
// //                 marginBottom:
// //                   "7px",
// //               }}
// //             >
// //               CRITICAL LOCATIONS
// //             </div>

// //             {criticalFires.map(
// //               (
// //                 fire,
// //                 index
// //               ) => (
// //                 <div
// //                   key={getFireKey(
// //                     fire
// //                   )}
// //                   style={{
// //                     display:
// //                       "grid",
// //                     gridTemplateColumns:
// //                       "18px 1fr",
// //                     gap:
// //                       "3px",
// //                     marginBottom:
// //                       "6px",
// //                     fontSize:
// //                       "9px",
// //                   }}
// //                 >
// //                   <strong
// //                     style={{
// //                       color:
// //                         PRIORITY_COLORS.CRITICAL,
// //                     }}
// //                   >
// //                     {index +
// //                       1}
// //                     .
// //                   </strong>

// //                   <div>
// //                     <div>
// //                       {fire.latitude.toFixed(
// //                         4
// //                       )}
// //                       ,{" "}
// //                       {fire.longitude.toFixed(
// //                         4
// //                       )}
// //                     </div>

// //                     <div
// //                       style={{
// //                         color:
// //                           "#999",
// //                         marginTop:
// //                           "2px",
// //                       }}
// //                     >
// //                       {Number(
// //                         fire.frp ||
// //                           0
// //                       ).toFixed(
// //                         1
// //                       )}{" "}
// //                       MW
// //                     </div>
// //                   </div>
// //                 </div>
// //               )
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* GIS CONTROL */}

// //       <GISLayerControl
// //         layers={layers}
// //         setLayers={
// //           setLayers
// //         }
// //       />

// //       {/* LEGEND */}

// //       {layers.firms &&
// //         !activeGISLayer && (
// //           <FirePriorityLegend />
// //         )}

// //       {activeGISLayer && (
// //         <GISLegend
// //           layer={
// //             activeGISLayer
// //           }
// //         />
// //       )}

// //       {/* GIS LOADING */}

// //       {loadingGIS && (
// //         <div
// //           style={{
// //             position:
// //               "absolute",
// //             bottom:
// //               "18px",
// //             left:
// //               activeGISLayer
// //                 ? "215px"
// //                 : "18px",
// //             zIndex:
// //               1000,
// //             background:
// //               "rgba(8, 15, 25, 0.92)",
// //             color:
// //               "white",
// //             padding:
// //               "9px 12px",
// //             borderRadius:
// //               "7px",
// //             fontSize:
// //               "11px",
// //           }}
// //         >
// //           Loading{" "}
// //           {loadingGIS} GIS
// //           layer...
// //         </div>
// //       )}

// //       {/* LIVE DETECTION COUNT */}

// //       <div
// //         style={{
// //           position:
// //             "absolute",
// //           bottom:
// //             "18px",
// //           right:
// //             "18px",
// //           zIndex:
// //             1000,
// //           background:
// //             "rgba(8, 15, 25, 0.92)",
// //           color:
// //             "white",
// //           padding:
// //             "9px 13px",
// //           borderRadius:
// //             "7px",
// //           fontSize:
// //             "12px",
// //         }}
// //       >
// //         Live detections:{" "}
// //         <strong>
// //           {fires.length}
// //         </strong>
// //       </div>
// //     </div>
// //   );
// // }

// // export default FireMap;





// import {
//   useEffect,
//   useRef,
//   useState,
//   type Dispatch,
//   type SetStateAction,
// } from "react";

// import {
//   MapContainer,
//   TileLayer,
//   CircleMarker,
//   Popup,
//   useMap,
// } from "react-leaflet";

// import "leaflet/dist/leaflet.css";

// import {
//   getLiveFires,
//   predictLiveFire,
//   getGISLayer,
// } from "../services/api";

// // ============================================================
// // DESIGN TOKENS
// // Shared visual constants so every floating panel, legend and
// // popup on the map reads as one consistent system rather than
// // several separately-styled widgets.
// // ============================================================

// const PANEL_BG = "rgba(8, 9, 11, 0.94)";
// const PANEL_BORDER = "1px solid rgba(255, 255, 255, 0.08)";
// const PANEL_SHADOW = "0 12px 32px rgba(0, 0, 0, 0.45)";
// const PANEL_RADIUS = "12px";
// const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
// const BRAND_ACCENT = "#ff6a00";

// // ============================================================
// // TYPES
// // ============================================================

// interface LiveFire {
//   latitude: number;
//   longitude: number;
//   frp?: number;
//   acq_date?: string;
//   acq_datetime?: string;
//   satellite?: string;
//   instrument?: string;
//   confidence?: string | number;
//   daynight?: string;
//   acq_time?: number | string;
//   bright_ti4?: number;
//   bright_ti5?: number;
//   scan?: number;
//   track?: number;
// }

// type PriorityLevel =
//   | "CRITICAL"
//   | "HIGH"
//   | "MODERATE"
//   | "LOW";

// interface FirePriority {
//   level: PriorityLevel;
//   reasons?: string[];
//   score?: number;
// }

// interface AnalysisResult {
//   prediction?: {
//     predicted_class?: string;
//     confidence?: number;
//     probabilities?: Record<string, number>;
//   };

//   industrial_association?: {
//     level?: string;
//     evidence?: string[];
//     context_score?: number;
//   };

//   gas_assessment?: {
//     assessment?: string;
//     evidence?: string[];
//     score?: number;
//   };

//   supporting_evidence?: string[];

//   context_distance_m?: number;

//   priority?: FirePriority;
// }

// interface GISPoint {
//   latitude: number;
//   longitude: number;
//   value: number;
// }

// type LayerName =
//   | "landCover"
//   | "ndvi"
//   | "ndwi"
//   | "ndbi"
//   | "no2"
//   | "so2"
//   | "co"
//   | "ch4"
//   | "persistence";

// interface GISLayers {
//   firms: boolean;
//   landCover: boolean;
//   ndvi: boolean;
//   ndwi: boolean;
//   ndbi: boolean;
//   no2: boolean;
//   so2: boolean;
//   co: boolean;
//   ch4: boolean;
//   persistence: boolean;
// }

// // ============================================================
// // CONSTANTS
// // ============================================================

// const PRIORITY_COLORS: Record<
//   PriorityLevel | "NOT_ANALYZED",
//   string
// > = {
//   CRITICAL: "#ff3030",
//   HIGH: "#ff8c00",
//   MODERATE: "#ffd21c",
//   LOW: "#32c759",
//   NOT_ANALYZED: "#f59e0b",
// };

// const GIS_LAYER_NAMES: LayerName[] = [
//   "landCover",
//   "ndvi",
//   "ndwi",
//   "ndbi",
//   "no2",
//   "so2",
//   "co",
//   "ch4",
//   "persistence",
// ];

// // ============================================================
// // HELPERS
// // ============================================================

// function normalizePriorityResult(
//   result: any
// ): AnalysisResult {
//   /*
//    * Keep the complete backend result.
//    *
//    * Priority can arrive either as:
//    * {
//    *   priority: {
//    *     level: "HIGH"
//    *   }
//    * }
//    *
//    * or in alternative forms such as:
//    * {
//    *   priority: "HIGH"
//    * }
//    *
//    * or:
//    * {
//    *   priority: {
//    *     priority: "HIGH"
//    *   }
//    *
//    * This function normalizes all of those into:
//    *
//    * result.priority.level
//    */

//   const backendResult =
//     result?.analysis ||
//     result?.result ||
//     result?.data ||
//     result ||
//     {};

//   const rawPriority =
//     backendResult?.priority;

//   let normalizedLevel:
//     | PriorityLevel
//     | undefined;

//   let priorityObject: any = {};

//   if (
//     rawPriority &&
//     typeof rawPriority === "object" &&
//     !Array.isArray(rawPriority)
//   ) {
//     priorityObject = rawPriority;

//     const possible = String(
//       rawPriority.level ||
//         rawPriority.priority ||
//         rawPriority.classification ||
//         ""
//     )
//       .trim()
//       .toUpperCase();

//     if (
//       possible === "CRITICAL" ||
//       possible === "HIGH" ||
//       possible === "MODERATE" ||
//       possible === "LOW"
//     ) {
//       normalizedLevel = possible;
//     }
//   }

//   if (
//     typeof rawPriority === "string"
//   ) {
//     const possible =
//       rawPriority
//         .trim()
//         .toUpperCase();

//     if (
//       possible === "CRITICAL" ||
//       possible === "HIGH" ||
//       possible === "MODERATE" ||
//       possible === "LOW"
//     ) {
//       normalizedLevel = possible;
//     }
//   }

//   /*
//    * Some backends may return priority_class
//    * or priority_level directly.
//    */
//   if (!normalizedLevel) {
//     const possible = String(
//       backendResult?.priority_level ||
//         backendResult?.priority_class ||
//         ""
//     )
//       .trim()
//       .toUpperCase();

//     if (
//       possible === "CRITICAL" ||
//       possible === "HIGH" ||
//       possible === "MODERATE" ||
//       possible === "LOW"
//     ) {
//       normalizedLevel = possible;
//     }
//   }

//   return {
//     ...backendResult,

//     priority: normalizedLevel
//       ? {
//           ...priorityObject,
//           level: normalizedLevel,
//         }
//       : undefined,
//   };
// }

// // ============================================================
// // WORLD → ODISHA ANIMATION
// // ============================================================

// function WorldToOdisha() {
//   const map = useMap();

//   useEffect(() => {
//     map.setView([20, 0], 2, {
//       animate: false,
//     });

//     const timer =
//       window.setTimeout(() => {
//         map.flyTo(
//           [20.3, 84.5],
//           7,
//           {
//             animate: true,
//             duration: 2.5,
//           }
//         );
//       }, 900);

//     return () => {
//       window.clearTimeout(timer);
//     };
//   }, [map]);

//   return null;
// }

// // ============================================================
// // GIS LEGEND
// // ============================================================

// function GISLegend({
//   layer,
// }: {
//   layer: LayerName;
// }) {
//   const legends: Record<
//     LayerName,
//     {
//       title: string;
//       items: {
//         label: string;
//         color: string;
//       }[];
//     }
//   > = {
//     landCover: {
//       title: "Land Cover",
//       items: [
//         { label: "Water", color: "#3498db" },
//         { label: "Trees", color: "#228b22" },
//         { label: "Grass", color: "#7fbf5b" },
//         {
//           label: "Flooded vegetation",
//           color: "#20b2aa",
//         },
//         { label: "Crops", color: "#d4b84c" },
//         { label: "Shrub", color: "#8fbc8f" },
//         { label: "Built-up", color: "#d95f59" },
//         { label: "Bare", color: "#b9a58a" },
//         {
//           label: "Snow / ice",
//           color: "#f5f5f5",
//         },
//       ],
//     },

//     ndvi: {
//       title: "NDVI",
//       items: [
//         { label: "< 0", color: "#b56576" },
//         {
//           label: "0 – 0.2",
//           color: "#e6a23c",
//         },
//         {
//           label: "0.2 – 0.4",
//           color: "#d6c44c",
//         },
//         {
//           label: "0.4 – 0.6",
//           color: "#7cb342",
//         },
//         {
//           label: "> 0.6",
//           color: "#1b8a3b",
//         },
//       ],
//     },

//     ndwi: {
//       title: "NDWI",
//       items: [
//         {
//           label: "< -0.3",
//           color: "#8c510a",
//         },
//         {
//           label: "-0.3 – 0",
//           color: "#d8b365",
//         },
//         {
//           label: "0 – 0.3",
//           color: "#80cdc1",
//         },
//         {
//           label: "> 0.3",
//           color: "#016c9a",
//         },
//       ],
//     },

//     ndbi: {
//       title: "NDBI",
//       items: [
//         {
//           label: "< -0.2",
//           color: "#1a9850",
//         },
//         {
//           label: "-0.2 – 0",
//           color: "#91cf60",
//         },
//         {
//           label: "0 – 0.2",
//           color: "#fee08b",
//         },
//         {
//           label: "0.2 – 0.4",
//           color: "#f46d43",
//         },
//         {
//           label: "> 0.4",
//           color: "#d73027",
//         },
//       ],
//     },

//     no2: {
//       title: "NO₂ Anomaly",
//       items: [
//         {
//           label: "< 0×",
//           color: "#4c78a8",
//         },
//         {
//           label: "0 – 1×",
//           color: "#9ecae1",
//         },
//         {
//           label: "1 – 2×",
//           color: "#fddc7a",
//         },
//         {
//           label: "2 – 4×",
//           color: "#f28e2b",
//         },
//         {
//           label: "> 4×",
//           color: "#d73027",
//         },
//       ],
//     },

//     so2: {
//       title: "SO₂ Anomaly",
//       items: [
//         {
//           label: "< 0×",
//           color: "#4c78a8",
//         },
//         {
//           label: "0 – 1×",
//           color: "#9ecae1",
//         },
//         {
//           label: "1 – 2×",
//           color: "#fddc7a",
//         },
//         {
//           label: "2 – 4×",
//           color: "#f28e2b",
//         },
//         {
//           label: "> 4×",
//           color: "#d73027",
//         },
//       ],
//     },

//     co: {
//       title: "CO Anomaly",
//       items: [
//         {
//           label: "< 0×",
//           color: "#4c78a8",
//         },
//         {
//           label: "0 – 1×",
//           color: "#9ecae1",
//         },
//         {
//           label: "1 – 2×",
//           color: "#fddc7a",
//         },
//         {
//           label: "2 – 4×",
//           color: "#f28e2b",
//         },
//         {
//           label: "> 4×",
//           color: "#d73027",
//         },
//       ],
//     },

//     ch4: {
//       title: "CH₄ Anomaly",
//       items: [
//         {
//           label: "< 0×",
//           color: "#4c78a8",
//         },
//         {
//           label: "0 – 1×",
//           color: "#9ecae1",
//         },
//         {
//           label: "1 – 2×",
//           color: "#fddc7a",
//         },
//         {
//           label: "2 – 4×",
//           color: "#f28e2b",
//         },
//         {
//           label: "> 4×",
//           color: "#d73027",
//         },
//       ],
//     },

//     persistence: {
//       title: "Fire Persistence",
//       items: [
//         {
//           label: "0",
//           color: "#7f7f7f",
//         },
//         {
//           label: "1 – 9",
//           color: "#f6d55c",
//         },
//         {
//           label: "10 – 49",
//           color: "#ed9b40",
//         },
//         {
//           label: "50 – 99",
//           color: "#e76f51",
//         },
//         {
//           label: "100+",
//           color: "#b2182b",
//         },
//       ],
//     },
//   };

//   const legend = legends[layer];

//   return (
//     <div
//       style={{
//         position: "absolute",
//         bottom: "18px",
//         left: "18px",
//         zIndex: 1000,
//         background: PANEL_BG,
//         border: PANEL_BORDER,
//         color: "white",
//         padding: "14px 16px",
//         borderRadius: PANEL_RADIUS,
//         minWidth: "150px",
//         maxWidth: "195px",
//         boxShadow: PANEL_SHADOW,
//         fontFamily: FONT,
//       }}
//     >
//       <div
//         style={{
//           fontSize: "11px",
//           fontWeight: 700,
//           letterSpacing: "0.3px",
//           marginBottom: "10px",
//           color: "rgba(255,255,255,0.85)",
//         }}
//       >
//         {legend.title}
//       </div>

//       {legend.items.map((item) => (
//         <div
//           key={item.label}
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: "8px",
//             marginBottom: "6px",
//             fontSize: "11px",
//             color: "rgba(255,255,255,0.75)",
//           }}
//         >
//           <span
//             style={{
//               width: "9px",
//               height: "9px",
//               borderRadius: "50%",
//               background: item.color,
//               display: "inline-block",
//               flexShrink: 0,
//               border:
//                 item.color === "#f5f5f5"
//                   ? "1px solid #999"
//                   : "none",
//             }}
//           />

//           <span>{item.label}</span>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ============================================================
// // FIRMS PRIORITY LEGEND
// // ============================================================

// function FirePriorityLegend() {
//   const items: Array<
//     [PriorityLevel, string]
//   > = [
//     [
//       "CRITICAL",
//       PRIORITY_COLORS.CRITICAL,
//     ],
//     [
//       "HIGH",
//       PRIORITY_COLORS.HIGH,
//     ],
//     [
//       "MODERATE",
//       PRIORITY_COLORS.MODERATE,
//     ],
//     [
//       "LOW",
//       PRIORITY_COLORS.LOW,
//     ],
//   ];

//   return (
//     <div
//       style={{
//         position: "absolute",
//         bottom: "18px",
//         left: "18px",
//         zIndex: 1000,
//         background: PANEL_BG,
//         border: PANEL_BORDER,
//         color: "white",
//         padding: "14px 16px",
//         borderRadius: PANEL_RADIUS,
//         minWidth: "160px",
//         boxShadow: PANEL_SHADOW,
//         fontFamily: FONT,
//       }}
//     >
//       <div
//         style={{
//           fontSize: "11px",
//           fontWeight: 700,
//           letterSpacing: "0.3px",
//           marginBottom: "10px",
//           color: "rgba(255,255,255,0.85)",
//         }}
//       >
//         Fire response priority
//       </div>

//       {items.map(
//         ([label, color]) => (
//           <div
//             key={label}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "8px",
//               marginBottom: "6px",
//               fontSize: "11px",
//               color: "rgba(255,255,255,0.75)",
//             }}
//           >
//             <span
//               style={{
//                 width: "9px",
//                 height: "9px",
//                 borderRadius: "50%",
//                 background: color,
//                 display: "inline-block",
//                 flexShrink: 0,
//               }}
//             />

//             <span>{label}</span>
//           </div>
//         )
//       )}
//     </div>
//   );
// }

// // ============================================================
// // GIS LAYER CONTROL
// // ============================================================

// interface GISLayerControlProps {
//   layers: GISLayers;
//   setLayers: Dispatch<
//     SetStateAction<GISLayers>
//   >;
// }

// function GISLayerControl({
//   layers,
//   setLayers,
// }: GISLayerControlProps) {
//   const [minimized, setMinimized] =
//     useState(false);

//   const toggleLayer = (
//     layer: keyof GISLayers
//   ) => {
//     setLayers((previous) => ({
//       ...previous,
//       [layer]: !previous[layer],
//     }));
//   };

//   const renderCheckbox = (
//     key: keyof GISLayers,
//     label: string
//   ) => (
//     <label
//       key={key}
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: "8px",
//         marginBottom: "8px",
//         cursor: "pointer",
//         color: "rgba(255,255,255,0.8)",
//       }}
//     >
//       <input
//         type="checkbox"
//         checked={layers[key]}
//         onChange={() =>
//           toggleLayer(key)
//         }
//         style={{ accentColor: BRAND_ACCENT }}
//       />

//       {label}
//     </label>
//   );

//   if (minimized) {
//     return (
//       <div
//         style={{
//           position: "absolute",
//           top: "16px",
//           right: "16px",
//           zIndex: 1000,
//           background: PANEL_BG,
//           border: PANEL_BORDER,
//           padding: "10px 14px",
//           borderRadius: PANEL_RADIUS,
//           color: "white",
//           boxShadow: PANEL_SHADOW,
//         }}
//       >
//         <button
//           onClick={() =>
//             setMinimized(false)
//           }
//           style={{
//             border: "none",
//             background: "transparent",
//             color: "white",
//             cursor: "pointer",
//             padding: 0,
//             fontSize: "12px",
//             fontWeight: 600,
//             fontFamily: FONT,
//           }}
//         >
//           GIS Layers ▲
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         position: "absolute",
//         top: "16px",
//         right: "16px",
//         zIndex: 1000,
//         background: PANEL_BG,
//         border: PANEL_BORDER,
//         padding: "16px",
//         borderRadius: PANEL_RADIUS,
//         color: "white",
//         width: "215px",
//         boxShadow: PANEL_SHADOW,
//         fontSize: "13px",
//         fontFamily: FONT,
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent:
//             "space-between",
//           marginBottom: "12px",
//         }}
//       >
//         <div
//           style={{
//             fontWeight: 700,
//             letterSpacing: "0.2px",
//           }}
//         >
//           GIS Layers
//         </div>

//         <button
//           onClick={() =>
//             setMinimized(true)
//           }
//           style={{
//             border: "none",
//             background:
//               "rgba(255,255,255,0.08)",
//             color: "white",
//             cursor: "pointer",
//             width: "24px",
//             height: "24px",
//             borderRadius: "6px",
//             fontSize: "14px",
//             padding: 0,
//           }}
//         >
//           −
//         </button>
//       </div>

//       {renderCheckbox(
//         "firms",
//         "Live FIRMS"
//       )}

//       {renderCheckbox(
//         "landCover",
//         "Land cover"
//       )}

//       {renderCheckbox(
//         "ndvi",
//         "NDVI"
//       )}

//       {renderCheckbox(
//         "ndwi",
//         "NDWI"
//       )}

//       {renderCheckbox(
//         "ndbi",
//         "NDBI"
//       )}

//       <div
//         style={{
//           height: "1px",
//           background:
//             "rgba(255,255,255,0.1)",
//           margin: "10px 0",
//         }}
//       />

//       <div
//         style={{
//           fontSize: "11px",
//           fontWeight: 600,
//           opacity: 0.55,
//           marginBottom: "8px",
//         }}
//       >
//         Atmospheric
//       </div>

//       {renderCheckbox(
//         "no2",
//         "NO₂ anomaly"
//       )}

//       {renderCheckbox(
//         "so2",
//         "SO₂ anomaly"
//       )}

//       {renderCheckbox(
//         "co",
//         "CO anomaly"
//       )}

//       {renderCheckbox(
//         "ch4",
//         "CH₄ anomaly"
//       )}

//       <div
//         style={{
//           height: "1px",
//           background:
//             "rgba(255,255,255,0.1)",
//           margin: "10px 0",
//         }}
//       />

//       {renderCheckbox(
//         "persistence",
//         "Fire persistence"
//       )}
//     </div>
//   );
// }

// // ============================================================
// // GIS DATA LAYER
// // ============================================================

// interface GISDataLayerProps {
//   layer: LayerName;
//   points: GISPoint[];
// }

// function GISDataLayer({
//   layer,
//   points,
// }: GISDataLayerProps) {
//   const getColor = (
//     value: number
//   ): string => {
//     if (layer === "landCover") {
//       const colors: Record<
//         number,
//         string
//       > = {
//         0: "#3498db",
//         1: "#228b22",
//         2: "#7fbf5b",
//         3: "#20b2aa",
//         4: "#d4b84c",
//         5: "#8fbc8f",
//         6: "#d95f59",
//         7: "#b9a58a",
//         8: "#f5f5f5",
//       };

//       return (
//         colors[
//           Math.round(value)
//         ] || "#999999"
//       );
//     }

//     if (layer === "ndvi") {
//       if (value < 0)
//         return "#b56576";

//       if (value < 0.2)
//         return "#e6a23c";

//       if (value < 0.4)
//         return "#d6c44c";

//       if (value < 0.6)
//         return "#7cb342";

//       return "#1b8a3b";
//     }

//     if (layer === "ndwi") {
//       if (value < -0.3)
//         return "#8c510a";

//       if (value < 0)
//         return "#d8b365";

//       if (value < 0.3)
//         return "#80cdc1";

//       return "#016c9a";
//     }

//     if (layer === "ndbi") {
//       if (value < -0.2)
//         return "#1a9850";

//       if (value < 0)
//         return "#91cf60";

//       if (value < 0.2)
//         return "#fee08b";

//       if (value < 0.4)
//         return "#f46d43";

//       return "#d73027";
//     }

//     if (
//       layer === "no2" ||
//       layer === "so2" ||
//       layer === "co" ||
//       layer === "ch4"
//     ) {
//       if (value < 0)
//         return "#4c78a8";

//       if (value < 1)
//         return "#9ecae1";

//       if (value < 2)
//         return "#fddc7a";

//       if (value < 4)
//         return "#f28e2b";

//       return "#d73027";
//     }

//     if (layer === "persistence") {
//       if (value <= 0)
//         return "#7f7f7f";

//       if (value < 10)
//         return "#f6d55c";

//       if (value < 50)
//         return "#ed9b40";

//       if (value < 100)
//         return "#e76f51";

//       return "#b2182b";
//     }

//     return "#ffffff";
//   };

//   return (
//     <>
//       {points.map(
//         (point, index) => {
//           const color =
//             getColor(
//               point.value
//             );

//           return (
//             <CircleMarker
//               key={`${layer}-${index}`}
//               center={[
//                 point.latitude,
//                 point.longitude,
//               ]}
//               radius={
//                 layer ===
//                 "persistence"
//                   ? 4
//                   : 3
//               }
//               pathOptions={{
//                 color,
//                 fillColor: color,
//                 fillOpacity: 0.35,
//                 weight: 0,
//               }}
//             />
//           );
//         }
//       )}
//     </>
//   );
// }

// // ============================================================
// // MAIN FIRE MAP
// // ============================================================

// function FireMap() {
//   const [fires, setFires] =
//     useState<LiveFire[]>([]);

//   const [analysis, setAnalysis] =
//     useState<
//       Record<
//         string,
//         AnalysisResult
//       >
//     >({});

//   const [loadingFire, setLoadingFire] =
//     useState<
//       Record<string, boolean>
//     >({});

//   // ----------------------------------------------------------
//   // IMPORTANT:
//   // These refs prevent duplicate analysis requests.
//   // They also prevent React StrictMode / stale-state issues.
//   // ----------------------------------------------------------

//   const analysisRef =
//     useRef<
//       Record<
//         string,
//         AnalysisResult
//       >
//     >({});

//   const analyzingRef =
//     useRef<Set<string>>(
//       new Set()
//     );

//   const [layers, setLayers] =
//     useState<GISLayers>({
//       firms: true,

//       landCover: false,
//       ndvi: false,
//       ndwi: false,
//       ndbi: false,

//       no2: false,
//       so2: false,
//       co: false,
//       ch4: false,

//       persistence: false,
//     });

//   const [gisData, setGISData] =
//     useState<
//       Record<
//         string,
//         GISPoint[]
//       >
//     >({});

//   const [loadingGIS, setLoadingGIS] =
//     useState<string | null>(
//       null
//     );

//   // Keep ref synchronized with state
//   useEffect(() => {
//     analysisRef.current =
//       analysis;
//   }, [analysis]);

//   // ==========================================================
//   // FIRE KEY
//   // ==========================================================

//   const getFireKey = (
//     fire: LiveFire
//   ): string => {
//     const lat = Number(fire.latitude ?? 0);
//     const lng = Number(fire.longitude ?? 0);
//     return `${lat.toFixed(
//       6
//     )}-${lng.toFixed(
//       6
//     )}-${fire.acq_date || ""}-${fire.acq_time || ""}`;
//   };

//   // ==========================================================
//   // LOAD LIVE FIRMS
//   // ==========================================================

//   useEffect(() => {
//     let mounted = true;

//     async function loadFires() {
//       try {
//         const result =
//           await getLiveFires();

//         if (!mounted) return;

//         const incomingFires: LiveFire[] = (
//           Array.isArray(
//             result?.fires
//           )
//             ? result.fires
//             : Array.isArray(result)
//             ? result
//             : []
//         ).filter(
//           (f: any) =>
//             f &&
//             Number.isFinite(Number(f.latitude)) &&
//             Number.isFinite(Number(f.longitude))
//         );

//         console.log(
//           "Agni Netra - Live FIRMS fires:",
//           incomingFires.length
//         );

//         setFires(
//           incomingFires
//         );
//       } catch (error) {
//         console.error(
//           "Failed to load live FIRMS fires:",
//           error
//         );
//       }
//     }

//     loadFires();

//     const interval =
//       window.setInterval(
//         loadFires,
//         5 * 60 * 1000
//       );

//     return () => {
//       mounted = false;

//       window.clearInterval(
//         interval
//       );
//     };
//   }, []);

//   // ==========================================================
//   // ANALYZE ONE FIRE
//   // ==========================================================

//   async function analyzeFire(
//     fire: LiveFire
//   ) {
//     const key =
//       getFireKey(fire);

//     // Already analyzed
//     if (
//       analysisRef.current[key]
//     ) {
//       return;
//     }

//     // Already being analyzed
//     if (
//       analyzingRef.current.has(
//         key
//       )
//     ) {
//       return;
//     }

//     analyzingRef.current.add(
//       key
//     );

//     setLoadingFire(
//       (previous) => ({
//         ...previous,
//         [key]: true,
//       })
//     );

//     try {
//       console.log(
//         "Agni Netra - Analyzing fire:",
//         fire.latitude,
//         fire.longitude
//       );

//       const result =
//         await predictLiveFire(
//           fire
//         );

//       console.log(
//         "Agni Netra - Analysis result:",
//         result
//       );

//       if (result?.success === false) {
//         console.error(
//           "Agni Netra - Prediction FAILED for fire:",
//           fire.latitude,
//           fire.longitude,
//           "Backend error:",
//           result.error
//         );
//         // Do NOT cache this as analyzed.
//         // It will be retried on the next fires refresh.
//         return;
//       }

//       const normalizedResult =
//         normalizePriorityResult(
//           result
//         );

//       /*
//        * IMPORTANT:
//        * Update the ref immediately.
//        * This prevents another worker/effect from
//        * sending the same fire again.
//        */
//       analysisRef.current = {
//         ...analysisRef.current,
//         [key]:
//           normalizedResult,
//       };

//       setAnalysis(
//         (previous) => ({
//           ...previous,
//           [key]:
//             normalizedResult,
//         })
//       );
//     } catch (error) {
//       console.error(
//         "Fire analysis failed:",
//         fire,
//         error
//       );
//     } finally {
//       analyzingRef.current.delete(
//         key
//       );

//       setLoadingFire(
//         (previous) => ({
//           ...previous,
//           [key]: false,
//         })
//       );
//     }
//   }

//   // ==========================================================
//   // AUTOMATIC ANALYSIS OF ALL NEW FIRMS FIRES
//   // ==========================================================

//   useEffect(() => {
//     if (fires.length === 0) {
//       return;
//     }

//     /*
//      * Build a snapshot of every fire that has not
//      * already been analyzed or queued.
//      */
//     const queue =
//       fires.filter((fire) => {
//         const key =
//           getFireKey(fire);

//         return (
//           !analysisRef.current[
//             key
//           ] &&
//           !analyzingRef.current.has(
//             key
//           )
//         );
//       });

//     console.log(
//       "Agni Netra - New fires waiting for analysis:",
//       queue.length
//     );

//     if (queue.length === 0) {
//       return;
//     }

//     /*
//      * Four workers allow four fires to be analyzed
//      * simultaneously while still processing every fire.
//      */
//     let currentIndex = 0;

//     const worker = async () => {
//       while (true) {
//         const index =
//           currentIndex++;

//         if (
//           index >=
//           queue.length
//         ) {
//           break;
//         }

//         const fire =
//           queue[index];

//         if (!fire) {
//           continue;
//         }

//         await analyzeFire(
//           fire
//         );
//       }
//     };

//     const workerCount =
//       Math.min(
//         4,
//         queue.length
//       );

//     Promise.all(
//       Array.from(
//         {
//           length:
//             workerCount,
//         },
//         () => worker()
//       )
//     ).catch((error) => {
//       console.error(
//         "Automatic FIRMS analysis failed:",
//         error
//       );
//     });

//     // This effect intentionally runs when
//     // the FIRMS fire list changes.
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [fires]);

//   // ==========================================================
//   // GIS DATA
//   // ==========================================================

//   useEffect(() => {
//     const layerMap: Record<
//       LayerName,
//       string
//     > = {
//       landCover:
//         "landcover",
//       ndvi: "ndvi",
//       ndwi: "ndwi",
//       ndbi: "ndbi",
//       no2: "no2",
//       so2: "so2",
//       co: "co",
//       ch4: "ch4",
//       persistence:
//         "persistence",
//     };

//     async function loadLayer(
//       layerName: LayerName
//     ) {
//       const endpoint =
//         layerMap[layerName];

//       if (!endpoint) {
//         return;
//       }

//       if (
//         gisData[layerName]
//       ) {
//         return;
//       }

//       try {
//         setLoadingGIS(
//           layerName
//         );

//         const result =
//           await getGISLayer(
//             endpoint
//           );

//         if (
//           result?.success &&
//           Array.isArray(
//             result.points
//           )
//         ) {
//           setGISData(
//             (previous) => ({
//               ...previous,
//               [layerName]:
//                 result.points,
//             })
//           );
//         }
//       } catch (error) {
//         console.error(
//           `Failed to load GIS layer ${layerName}:`,
//           error
//         );
//       } finally {
//         setLoadingGIS(null);
//       }
//     }

//     GIS_LAYER_NAMES.forEach(
//       (layerName) => {
//         if (
//           layers[layerName]
//         ) {
//           loadLayer(
//             layerName
//           );
//         }
//       }
//     );

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [layers]);

//   // ==========================================================
//   // GET PRIORITY
//   // ==========================================================

//   const getPriority = (
//     fire: LiveFire
//   ): PriorityLevel | undefined => {
//     const result =
//       analysis[
//         getFireKey(fire)
//       ];

//     const level =
//       result?.priority
//         ?.level;

//     if (
//       level === "CRITICAL" ||
//       level === "HIGH" ||
//       level === "MODERATE" ||
//       level === "LOW"
//     ) {
//       return level;
//     }

//     return undefined;
//   };

//   // ==========================================================
//   // GET DOT COLOR
//   // ==========================================================

//   const getPriorityColor = (
//     fire: LiveFire
//   ): string => {
//     const priority =
//       getPriority(fire);

//     if (!priority) {
//       return PRIORITY_COLORS.NOT_ANALYZED;
//     }

//     return PRIORITY_COLORS[
//       priority
//     ];
//   };

//   // ==========================================================
//   // PRIORITY COUNTS
//   // ==========================================================

//   const priorityCounts: Record<
//     PriorityLevel,
//     number
//   > = {
//     CRITICAL: 0,
//     HIGH: 0,
//     MODERATE: 0,
//     LOW: 0,
//   };

//   fires.forEach(
//     (fire) => {
//       const priority =
//         getPriority(fire);

//       if (priority) {
//         priorityCounts[
//           priority
//         ] += 1;
//       }
//     }
//   );

//   // ==========================================================
//   // ANALYZED COUNT
//   // ==========================================================

//   const analyzedCount =
//     fires.reduce(
//       (
//         count,
//         fire
//       ) => {
//         const key =
//           getFireKey(fire);

//         if (
//           analysis[key]
//             ?.priority
//             ?.level
//         ) {
//           return count + 1;
//         }

//         return count;
//       },
//       0
//     );

//   // ==========================================================
//   // CRITICAL LOCATIONS
//   // ==========================================================

//   const criticalFires =
//     fires
//       .filter(
//         (fire) =>
//           getPriority(
//             fire
//           ) === "CRITICAL"
//       )
//       .sort(
//         (a, b) =>
//           Number(
//             b.frp || 0
//           ) -
//           Number(
//             a.frp || 0
//           )
//       )
//       .slice(0, 3);

//   // ==========================================================
//   // ACTIVE GIS LEGEND
//   // ==========================================================

//   const activeGISLayer:
//     | LayerName
//     | undefined =
//     GIS_LAYER_NAMES.find(
//       (layer) =>
//         layers[layer]
//     );

//   // ==========================================================
//   // RENDER
//   // ==========================================================

//   return (
//     <div
//       style={{
//         position: "relative",
//         width: "100%",
//         height: "100%",
//         overflow: "hidden",
//       }}
//     >
//       <MapContainer
//         center={[
//           20.3,
//           84.5,
//         ]}
//         zoom={2}
//         minZoom={2}
//         maxZoom={18}
//         style={{
//           width: "100%",
//           height: "100%",
//         }}
//       >
//         {/* BASE MAP */}

//         <TileLayer
//           attribution="© OpenStreetMap contributors"
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* WORLD → ODISHA */}

//         <WorldToOdisha />

//         {/* GIS OVERLAYS */}

//         {GIS_LAYER_NAMES.map(
//           (layerName) => {
//             if (
//               !layers[layerName]
//             ) {
//               return null;
//             }

//             const points =
//               gisData[
//                 layerName
//               ];

//             if (
//               !points ||
//               points.length === 0
//             ) {
//               return null;
//             }

//             return (
//               <GISDataLayer
//                 key={
//                   layerName
//                 }
//                 layer={
//                   layerName
//                 }
//                 points={points}
//               />
//             );
//           }
//         )}

//         {/* LIVE FIRMS */}

//         {layers.firms &&
//           fires.map(
//             (
//               fire,
//               index
//             ) => {
//               const key =
//                 getFireKey(
//                   fire
//                 );

//               const result =
//                 analysis[key];

//               const priority =
//                 getPriority(
//                   fire
//                 );

//               const color =
//                 getPriorityColor(
//                   fire
//                 );

//               const isLoading =
//                 Boolean(
//                   loadingFire[
//                     key
//                   ]
//                 );

//               return (
//                 <CircleMarker
//                   key={`${key}-${index}`}
//                   center={[
//                     fire.latitude,
//                     fire.longitude,
//                   ]}
//                   radius={
//                     priority ===
//                     "CRITICAL"
//                       ? 7
//                       : priority ===
//                         "HIGH"
//                       ? 6
//                       : 5
//                   }
//                   pathOptions={{
//                     color,
//                     fillColor:
//                       color,
//                     fillOpacity:
//                       0.95,
//                     weight:
//                       priority ===
//                       "CRITICAL"
//                         ? 2
//                         : 1.5,
//                   }}
//                   eventHandlers={{
//                     click: () =>
//                       analyzeFire(
//                         fire
//                       ),
//                   }}
//                 >
//                   <Popup
//                     maxWidth={
//                       380
//                     }
//                     minWidth={
//                       300
//                     }
//                     autoPan
//                     autoPanPadding={[
//                       30,
//                       30,
//                     ]}
//                   >
//                     <div
//                       style={{
//                         width:
//                           "100%",
//                         maxHeight:
//                           "430px",
//                         overflowY:
//                           "auto",
//                         overflowX:
//                           "hidden",
//                         paddingRight:
//                           "8px",
//                         boxSizing:
//                           "border-box",
//                         fontFamily: FONT,
//                       }}
//                     >
//                       {/* BRAND */}

//                       <div
//                         style={{
//                           fontSize:
//                             "11px",
//                           fontWeight:
//                             800,
//                           letterSpacing:
//                             "1.6px",
//                           color: BRAND_ACCENT,
//                           marginBottom:
//                             "5px",
//                         }}
//                       >
//                         Agni Netra
//                       </div>

//                       <h3
//                         style={{
//                           margin:
//                             "0 0 5px 0",
//                           fontSize:
//                             "20px",
//                         }}
//                       >
//                         Fire Detection
//                       </h3>

//                       <div
//                         style={{
//                           fontSize:
//                             "12px",
//                           color:
//                             "#666",
//                           marginBottom:
//                             "12px",
//                         }}
//                       >
//                         NASA FIRMS
//                         Detection
//                       </div>

//                       {/* FIRMS DATA */}

//                       <div
//                         style={{
//                           display:
//                             "grid",
//                           gridTemplateColumns:
//                             "1fr 1fr",
//                           gap:
//                             "7px",
//                           fontSize:
//                             "12px",
//                         }}
//                       >
//                         <div>
//                           <strong>
//                             FRP:
//                           </strong>{" "}
//                           {fire.frp ??
//                             "N/A"}{" "}
//                           MW
//                         </div>

//                         <div>
//                           <strong>
//                             Date:
//                           </strong>{" "}
//                           {fire.acq_date ??
//                             "N/A"}
//                         </div>

//                         <div>
//                           <strong>
//                             Satellite:
//                           </strong>{" "}
//                           {fire.satellite ??
//                             fire.instrument ??
//                             "VIIRS"}
//                         </div>

//                         <div>
//                           <strong>
//                             Confidence:
//                           </strong>{" "}
//                           {fire.confidence ??
//                             "N/A"}
//                         </div>
//                       </div>

//                       <div
//                         style={{
//                           marginTop:
//                             "8px",
//                           fontSize:
//                             "11px",
//                           color:
//                             "#666",
//                         }}
//                       >
//                         Coordinates:{" "}
//                         {fire.latitude.toFixed(
//                           4
//                         )}
//                         ,{" "}
//                         {fire.longitude.toFixed(
//                           4
//                         )}
//                       </div>

//                       {/* RESPONSE PRIORITY */}

//                       {priority && (
//                         <div
//                           style={{
//                             marginTop:
//                               "14px",
//                             padding:
//                               "12px",
//                             borderRadius:
//                               "8px",
//                             background:
//                               priority ===
//                               "CRITICAL"
//                                 ? "#fff0f0"
//                                 : priority ===
//                                   "HIGH"
//                                 ? "#fff7ed"
//                                 : priority ===
//                                   "MODERATE"
//                                 ? "#fffbea"
//                                 : "#f2faf3",
//                             border:
//                               `1px solid ${color}`,
//                           }}
//                         >
//                           <div
//                             style={{
//                               fontSize:
//                                 "10px",
//                               fontWeight:
//                                 800,
//                               color:
//                                 "#777",
//                               letterSpacing:
//                                 "0.5px",
//                               marginBottom:
//                                 "5px",
//                             }}
//                           >
//                             Fire response
//                             priority
//                           </div>

//                           <div
//                             style={{
//                               display:
//                                 "flex",
//                               alignItems:
//                                 "center",
//                               gap:
//                                 "8px",
//                               fontSize:
//                                 "19px",
//                               fontWeight:
//                                 800,
//                               color,
//                             }}
//                           >
//                             <span
//                               style={{
//                                 width:
//                                   "10px",
//                                 height:
//                                   "10px",
//                                 borderRadius:
//                                   "50%",
//                                 background:
//                                   color,
//                                 display:
//                                   "inline-block",
//                               }}
//                             />

//                             {priority}
//                           </div>

//                           {result
//                             ?.priority
//                             ?.score !==
//                             undefined && (
//                             <div
//                               style={{
//                                 marginTop:
//                                   "5px",
//                                 fontSize:
//                                   "10px",
//                                 color:
//                                   "#777",
//                               }}
//                             >
//                               Priority
//                               score:{" "}
//                               {
//                                 result
//                                   .priority
//                                   .score
//                               }
//                             </div>
//                           )}

//                           {result
//                             ?.priority
//                             ?.reasons &&
//                             result
//                               .priority
//                               .reasons
//                               .length >
//                               0 && (
//                               <div
//                                 style={{
//                                   marginTop:
//                                     "9px",
//                                 }}
//                               >
//                                 <div
//                                   style={{
//                                     fontSize:
//                                       "10px",
//                                     fontWeight:
//                                       800,
//                                     color:
//                                       "#777",
//                                     letterSpacing:
//                                       "0.4px",
//                                     marginBottom:
//                                       "4px",
//                                   }}
//                                 >
//                                   Decision support
//                                 </div>

//                                 {result.priority.reasons.map(
//                                   (
//                                     reason,
//                                     i
//                                   ) => (
//                                     <div
//                                       key={
//                                         i
//                                       }
//                                       style={{
//                                         fontSize:
//                                           "11px",
//                                         color:
//                                           "#555",
//                                         marginTop:
//                                           "4px",
//                                       }}
//                                     >
//                                       •{" "}
//                                       {
//                                         reason
//                                       }
//                                     </div>
//                                   )
//                                 )}
//                               </div>
//                             )}
//                         </div>
//                       )}

//                       {/* MODEL ANALYSIS */}

//                       {result?.prediction && (
//                         <div
//                           style={{
//                             marginTop:
//                               "14px",
//                             padding:
//                               "11px",
//                             borderRadius:
//                               "7px",
//                             background:
//                               "#f7f9fc",
//                             border:
//                               "1px solid #dce3ec",
//                           }}
//                         >
//                           <div
//                             style={{
//                               fontSize:
//                                 "10px",
//                               fontWeight:
//                                 800,
//                               color:
//                                 "#777",
//                               letterSpacing:
//                                 "0.5px",
//                               marginBottom:
//                                 "7px",
//                             }}
//                           >
//                             AI fire classification
//                           </div>

//                           {result
//                             .prediction
//                             .predicted_class && (
//                             <div
//                               style={{
//                                 fontSize:
//                                   "12px",
//                                 marginBottom:
//                                   "5px",
//                               }}
//                             >
//                               <strong>
//                                 Predicted
//                                 class:
//                               </strong>{" "}
//                               {
//                                 result
//                                   .prediction
//                                   .predicted_class
//                               }
//                             </div>
//                           )}

//                           {result
//                             .prediction
//                             .confidence !==
//                             undefined && (
//                             <div
//                               style={{
//                                 fontSize:
//                                   "12px",
//                               }}
//                             >
//                               <strong>
//                                 Model
//                                 confidence:
//                               </strong>{" "}
//                               {(
//                                 Number(
//                                   result
//                                     .prediction
//                                     .confidence
//                                 ) * 100
//                               ).toFixed(
//                                 1
//                               )}
//                               %
//                             </div>
//                           )}

//                           {result
//                             .prediction
//                             .probabilities && (
//                             <div
//                               style={{
//                                 marginTop:
//                                   "8px",
//                               }}
//                             >
//                               {Object.entries(
//                                 result
//                                   .prediction
//                                   .probabilities
//                               ).map(
//                                 ([
//                                   label,
//                                   probability,
//                                 ]) => (
//                                   <div
//                                     key={
//                                       label
//                                     }
//                                     style={{
//                                       fontSize:
//                                         "11px",
//                                       marginTop:
//                                         "4px",
//                                       display:
//                                         "flex",
//                                       justifyContent:
//                                         "space-between",
//                                     }}
//                                   >
//                                     <span>
//                                       {label}
//                                     </span>

//                                     <strong>
//                                       {(
//                                         Number(
//                                           probability
//                                         ) *
//                                         100
//                                       ).toFixed(
//                                         1
//                                       )}
//                                       %
//                                     </strong>
//                                   </div>
//                                 )
//                               )}
//                             </div>
//                           )}
//                         </div>
//                       )}

//                       {/* INDUSTRIAL ASSOCIATION */}

//                       {result?.industrial_association && (
//                         <div
//                           style={{
//                             marginTop:
//                               "12px",
//                             padding:
//                               "11px",
//                             borderRadius:
//                               "7px",
//                             background:
//                               "#f7f7f7",
//                             border:
//                               "1px solid #ddd",
//                           }}
//                         >
//                           <div
//                             style={{
//                               fontSize:
//                                 "10px",
//                               fontWeight:
//                                 800,
//                               color:
//                                 "#777",
//                               letterSpacing:
//                                 "0.5px",
//                               marginBottom:
//                                 "7px",
//                             }}
//                           >
//                             Industrial fire
//                             assessment
//                           </div>

//                           {result
//                             .industrial_association
//                             .level && (
//                             <div
//                               style={{
//                                 fontSize:
//                                   "12px",
//                                 marginBottom:
//                                   "5px",
//                               }}
//                             >
//                               <strong>
//                                 Association:
//                               </strong>{" "}
//                               {
//                                 result
//                                   .industrial_association
//                                   .level
//                               }
//                             </div>
//                           )}

//                           {result
//                             .industrial_association
//                             .context_score !==
//                             undefined && (
//                             <div
//                               style={{
//                                 fontSize:
//                                   "11px",
//                                 color:
//                                   "#666",
//                               }}
//                             >
//                               Context
//                               score:{" "}
//                               {
//                                 result
//                                   .industrial_association
//                                   .context_score
//                               }
//                             </div>
//                           )}

//                           {result
//                             .industrial_association
//                             .evidence &&
//                             result
//                               .industrial_association
//                               .evidence
//                               .length >
//                               0 && (
//                               <div
//                                 style={{
//                                   marginTop:
//                                     "7px",
//                                 }}
//                               >
//                                 {result.industrial_association.evidence.map(
//                                   (
//                                     evidence,
//                                     i
//                                   ) => (
//                                     <div
//                                       key={
//                                         i
//                                       }
//                                       style={{
//                                         fontSize:
//                                           "11px",
//                                         color:
//                                           "#555",
//                                         marginTop:
//                                           "4px",
//                                       }}
//                                     >
//                                       •{" "}
//                                       {
//                                         evidence
//                                       }
//                                     </div>
//                                   )
//                                 )}
//                               </div>
//                             )}
//                         </div>
//                       )}

//                       {/* GAS LEAK ASSESSMENT */}

//                       {result?.gas_assessment && (
//                         <div
//                           style={{
//                             marginTop:
//                               "12px",
//                             padding:
//                               "11px",
//                             borderRadius:
//                               "7px",
//                             background:
//                               "#f7f7f7",
//                             border:
//                               "1px solid #ddd",
//                           }}
//                         >
//                           <div
//                             style={{
//                               fontSize:
//                                 "10px",
//                               fontWeight:
//                                 800,
//                               color:
//                                 "#777",
//                               letterSpacing:
//                                 "0.5px",
//                               marginBottom:
//                                 "7px",
//                             }}
//                           >
//                             Gas leak
//                             assessment
//                           </div>

//                           {result
//                             .gas_assessment
//                             .assessment && (
//                             <div
//                               style={{
//                                 fontSize:
//                                   "12px",
//                                 marginBottom:
//                                   "5px",
//                               }}
//                             >
//                               <strong>
//                                 Assessment:
//                               </strong>{" "}
//                               {
//                                 result
//                                   .gas_assessment
//                                   .assessment
//                               }
//                             </div>
//                           )}

//                           {result
//                             .gas_assessment
//                             .score !==
//                             undefined && (
//                             <div
//                               style={{
//                                 fontSize:
//                                   "11px",
//                                 color:
//                                   "#666",
//                               }}
//                             >
//                               Gas anomaly
//                               score:{" "}
//                               {
//                                 result
//                                   .gas_assessment
//                                   .score
//                               }
//                             </div>
//                           )}

//                           {result
//                             .gas_assessment
//                             .evidence &&
//                             result
//                               .gas_assessment
//                               .evidence
//                               .length >
//                               0 && (
//                               <div
//                                 style={{
//                                   marginTop:
//                                     "7px",
//                                 }}
//                               >
//                                 {result.gas_assessment.evidence.map(
//                                   (
//                                     evidence,
//                                     i
//                                   ) => (
//                                     <div
//                                       key={
//                                         i
//                                       }
//                                       style={{
//                                         fontSize:
//                                           "11px",
//                                         color:
//                                           "#555",
//                                         marginTop:
//                                           "4px",
//                                       }}
//                                     >
//                                       •{" "}
//                                       {
//                                         evidence
//                                       }
//                                     </div>
//                                   )
//                                 )}
//                               </div>
//                             )}
//                         </div>
//                       )}

//                       {/* SUPPORTING EVIDENCE */}

//                       {result
//                         ?.supporting_evidence &&
//                         result
//                           .supporting_evidence
//                           .length >
//                           0 && (
//                           <div
//                             style={{
//                               marginTop:
//                                 "12px",
//                               padding:
//                                 "11px",
//                               borderRadius:
//                                 "7px",
//                               background:
//                                 "#f7f7f7",
//                               border:
//                                 "1px solid #ddd",
//                             }}
//                           >
//                             <div
//                               style={{
//                                 fontSize:
//                                   "10px",
//                                 fontWeight:
//                                   800,
//                                 color:
//                                   "#777",
//                                 letterSpacing:
//                                   "0.5px",
//                                 marginBottom:
//                                   "7px",
//                               }}
//                             >
//                               Supporting evidence
//                             </div>

//                             {result.supporting_evidence.map(
//                               (
//                                 evidence,
//                                 i
//                               ) => (
//                                 <div
//                                   key={
//                                     i
//                                   }
//                                   style={{
//                                     fontSize:
//                                       "11px",
//                                     color:
//                                       "#555",
//                                     marginTop:
//                                       "4px",
//                                   }}
//                                 >
//                                   •{" "}
//                                   {
//                                     evidence
//                                   }
//                                 </div>
//                               )
//                             )}
//                           </div>
//                         )}

//                       {/* CONTEXT DISTANCE */}

//                       {result?.context_distance_m !==
//                         undefined && (
//                         <div
//                           style={{
//                             marginTop:
//                               "10px",
//                             fontSize:
//                               "11px",
//                             color:
//                               "#666",
//                           }}
//                         >
//                           Context distance:{" "}
//                           {Number(
//                             result.context_distance_m
//                           ).toFixed(
//                             0
//                           )}{" "}
//                           m
//                         </div>
//                       )}

//                       {/* ANALYSIS IN PROGRESS */}

//                       {!priority &&
//                         isLoading && (
//                           <div
//                             style={{
//                               marginTop:
//                                 "14px",
//                               padding:
//                                 "11px",
//                               borderRadius:
//                                 "7px",
//                               background:
//                                 "#fff7ed",
//                               border:
//                                 "1px solid #f59e0b",
//                               fontSize:
//                                 "11px",
//                               color:
//                                 "#8a4b08",
//                             }}
//                           >
//                             <strong>
//                               Analyzing fire
//                               response
//                               priority...
//                             </strong>
//                           </div>
//                         )}

//                       {/* NOT AVAILABLE */}

//                       {!priority &&
//                         !isLoading && (
//                           <div
//                             style={{
//                               marginTop:
//                                 "14px",
//                               padding:
//                                 "10px",
//                               borderRadius:
//                                 "7px",
//                               background:
//                                 "#f7f7f7",
//                               fontSize:
//                                 "11px",
//                               color:
//                                 "#666",
//                             }}
//                           >
//                             Response
//                             priority
//                             unavailable.
//                             Click the
//                             detection to
//                             retry analysis.
//                           </div>
//                         )}

//                       {/* BASIS / DISCLAIMER */}

//                       <div
//                         style={{
//                           marginTop:
//                             "14px",
//                           paddingTop:
//                             "9px",
//                           borderTop:
//                             "1px solid #e5e5e5",
//                           fontSize:
//                             "9px",
//                           lineHeight:
//                             1.45,
//                           color:
//                             "#888",
//                         }}
//                       >
//                         Analysis is based on
//                         NASA FIRMS detection
//                         data and the
//                         supporting satellite,
//                         environmental,
//                         industrial and
//                         atmospheric evidence
//                         available to the Agni
//                         Netra model.
//                       </div>
//                     </div>
//                   </Popup>
//                 </CircleMarker>
//               );
//             }
//           )}
//       </MapContainer>

//       {/* ====================================================
//           RESPONSE PRIORITY SUMMARY
//       ==================================================== */}

//       <div
//         style={{
//           position:
//             "absolute",
//           top: "16px",
//           left: "16px",
//           zIndex: 1000,
//           width: "228px",
//           background: PANEL_BG,
//           border: PANEL_BORDER,
//           color: "white",
//           padding: "15px",
//           borderRadius: PANEL_RADIUS,
//           boxShadow: PANEL_SHADOW,
//           fontFamily: FONT,
//         }}
//       >
//         <div
//           style={{
//             fontSize:
//               "10px",
//             fontWeight:
//               700,
//             letterSpacing:
//               "1.4px",
//             textTransform:
//               "uppercase",
//             color: BRAND_ACCENT,
//             marginBottom:
//               "4px",
//           }}
//         >
//           Agni Netra
//         </div>

//         <div
//           style={{
//             fontSize:
//               "16px",
//             fontWeight:
//               700,
//             marginBottom:
//               "12px",
//           }}
//         >
//           Response Priority
//         </div>

//         <div
//           style={{
//             display:
//               "grid",
//             gridTemplateColumns:
//               "1fr 1fr",
//             gap: "7px",
//           }}
//         >
//           {(
//             [
//               [
//                 "CRITICAL",
//                 priorityCounts.CRITICAL,
//                 PRIORITY_COLORS.CRITICAL,
//               ],
//               [
//                 "HIGH",
//                 priorityCounts.HIGH,
//                 PRIORITY_COLORS.HIGH,
//               ],
//               [
//                 "MODERATE",
//                 priorityCounts.MODERATE,
//                 PRIORITY_COLORS.MODERATE,
//               ],
//               [
//                 "LOW",
//                 priorityCounts.LOW,
//                 PRIORITY_COLORS.LOW,
//               ],
//             ] as [
//               PriorityLevel,
//               number,
//               string
//             ][]
//           ).map(
//             ([
//               label,
//               count,
//               color,
//             ]) => (
//               <div
//                 key={
//                   label
//                 }
//                 style={{
//                   padding:
//                     "9px",
//                   borderRadius:
//                     "8px",
//                   background:
//                     `${color}18`,
//                   border:
//                     `1px solid ${color}55`,
//                 }}
//               >
//                 <div
//                   style={{
//                     fontSize:
//                       "9px",
//                     fontWeight:
//                       700,
//                     letterSpacing:
//                       "0.3px",
//                     color,
//                     marginBottom:
//                       "4px",
//                   }}
//                 >
//                   {label}
//                 </div>

//                 <div
//                   style={{
//                     fontSize:
//                       "19px",
//                     fontWeight:
//                       700,
//                   }}
//                 >
//                   {count}
//                 </div>
//               </div>
//             )
//           )}
//         </div>

//         <div
//           style={{
//             marginTop:
//               "10px",
//             paddingTop:
//               "9px",
//             borderTop:
//               "1px solid rgba(255,255,255,0.1)",
//             fontSize:
//               "11px",
//             color:
//               "#b0b0b0",
//           }}
//         >
//           Analyzed:{" "}
//           <strong
//             style={{
//               color:
//                 "white",
//             }}
//           >
//             {analyzedCount}
//           </strong>{" "}
//           /{" "}
//           {fires.length}
//         </div>

//         {criticalFires.length >
//           0 && (
//           <div
//             style={{
//               marginTop:
//                 "10px",
//               paddingTop:
//                 "9px",
//               borderTop:
//                 "1px solid rgba(255,255,255,0.1)",
//             }}
//           >
//             <div
//               style={{
//                 fontSize:
//                   "10px",
//                 fontWeight:
//                   700,
//                 color:
//                   PRIORITY_COLORS.CRITICAL,
//                 letterSpacing:
//                   "0.4px",
//                 marginBottom:
//                   "8px",
//               }}
//             >
//               Critical locations
//             </div>

//             {criticalFires.map(
//               (
//                 fire,
//                 index
//               ) => (
//                 <div
//                   key={getFireKey(
//                     fire
//                   )}
//                   style={{
//                     display:
//                       "grid",
//                     gridTemplateColumns:
//                       "18px 1fr",
//                     gap:
//                       "3px",
//                     marginBottom:
//                       "7px",
//                     fontSize:
//                       "10px",
//                   }}
//                 >
//                   <strong
//                     style={{
//                       color:
//                         PRIORITY_COLORS.CRITICAL,
//                     }}
//                   >
//                     {index +
//                       1}
//                     .
//                   </strong>

//                   <div>
//                     <div>
//                       {fire.latitude.toFixed(
//                         4
//                       )}
//                       ,{" "}
//                       {fire.longitude.toFixed(
//                         4
//                       )}
//                     </div>

//                     <div
//                       style={{
//                         color:
//                           "#999",
//                         marginTop:
//                           "2px",
//                       }}
//                     >
//                       {Number(
//                         fire.frp ||
//                           0
//                       ).toFixed(
//                         1
//                       )}{" "}
//                       MW
//                     </div>
//                   </div>
//                 </div>
//               )
//             )}
//           </div>
//         )}
//       </div>

//       {/* GIS CONTROL */}

//       <GISLayerControl
//         layers={layers}
//         setLayers={
//           setLayers
//         }
//       />

//       {/* LEGEND */}

//       {layers.firms &&
//         !activeGISLayer && (
//           <FirePriorityLegend />
//         )}

//       {activeGISLayer && (
//         <GISLegend
//           layer={
//             activeGISLayer
//           }
//         />
//       )}

//       {/* GIS LOADING */}

//       {loadingGIS && (
//         <div
//           style={{
//             position:
//               "absolute",
//             bottom:
//               "18px",
//             left:
//               activeGISLayer
//                 ? "220px"
//                 : "18px",
//             zIndex:
//               1000,
//             background: PANEL_BG,
//             border: PANEL_BORDER,
//             color:
//               "white",
//             padding:
//               "10px 14px",
//             borderRadius:
//               "8px",
//             fontSize:
//               "11px",
//             fontFamily: FONT,
//           }}
//         >
//           Loading{" "}
//           {loadingGIS} GIS
//           layer...
//         </div>
//       )}

//       {/* LIVE DETECTION COUNT */}

//       <div
//         style={{
//           position:
//             "absolute",
//           bottom:
//             "18px",
//           right:
//             "18px",
//           zIndex:
//             1000,
//           background: PANEL_BG,
//           border: PANEL_BORDER,
//           color:
//             "white",
//           padding:
//             "10px 15px",
//           borderRadius:
//             "8px",
//           fontSize:
//             "12px",
//           fontFamily: FONT,
//         }}
//       >
//         Live detections:{" "}
//         <strong>
//           {fires.length}
//         </strong>
//       </div>
//     </div>
//   );
// }

// export default FireMap;




import {
  useEffect,
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
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import {
  getLiveFires,
  predictLiveFire,
  getGISLayer,
} from "../services/api";

// ============================================================
// DESIGN TOKENS
// Shared visual constants so every floating panel, legend and
// popup on the map reads as one consistent system rather than
// several separately-styled widgets.
// ============================================================

const PANEL_BG = "rgba(8, 9, 11, 0.94)";
const PANEL_BORDER = "1px solid rgba(255, 255, 255, 0.08)";
const PANEL_SHADOW = "0 12px 32px rgba(0, 0, 0, 0.45)";
const PANEL_RADIUS = "12px";
const FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
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

type PriorityLevel =
  | "CRITICAL"
  | "HIGH"
  | "MODERATE"
  | "LOW";

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

// ============================================================
// CONSTANTS
// ============================================================

const PRIORITY_COLORS: Record<
  PriorityLevel | "NOT_ANALYZED",
  string
> = {
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

// ============================================================
// HELPERS
// ============================================================

function normalizePriorityResult(
  result: any
): AnalysisResult {
  /*
   * Keep the complete backend result.
   *
   * Priority can arrive either as:
   * {
   *   priority: {
   *     level: "HIGH"
   *   }
   * }
   *
   * or in alternative forms such as:
   * {
   *   priority: "HIGH"
   * }
   *
   * or:
   * {
   *   priority: {
   *     priority: "HIGH"
   *   }
   *
   * This function normalizes all of those into:
   *
   * result.priority.level
   */

  const backendResult =
    result?.analysis ||
    result?.result ||
    result?.data ||
    result ||
    {};

  const rawPriority =
    backendResult?.priority;

  let normalizedLevel:
    | PriorityLevel
    | undefined;

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

    if (
      possible === "CRITICAL" ||
      possible === "HIGH" ||
      possible === "MODERATE" ||
      possible === "LOW"
    ) {
      normalizedLevel = possible;
    }
  }

  if (
    typeof rawPriority === "string"
  ) {
    const possible =
      rawPriority
        .trim()
        .toUpperCase();

    if (
      possible === "CRITICAL" ||
      possible === "HIGH" ||
      possible === "MODERATE" ||
      possible === "LOW"
    ) {
      normalizedLevel = possible;
    }
  }

  /*
   * Some backends may return priority_class
   * or priority_level directly.
   */
  if (!normalizedLevel) {
    const possible = String(
      backendResult?.priority_level ||
        backendResult?.priority_class ||
        ""
    )
      .trim()
      .toUpperCase();

    if (
      possible === "CRITICAL" ||
      possible === "HIGH" ||
      possible === "MODERATE" ||
      possible === "LOW"
    ) {
      normalizedLevel = possible;
    }
  }

  return {
    ...backendResult,

    priority: normalizedLevel
      ? {
          ...priorityObject,
          level: normalizedLevel,
        }
      : undefined,
  };
}

// ============================================================
// WORLD → ODISHA ANIMATION
// ============================================================

function WorldToOdisha() {
  const map = useMap();

  useEffect(() => {
    map.setView([20, 0], 2, {
      animate: false,
    });

    const timer =
      window.setTimeout(() => {
        map.flyTo(
          [20.3, 84.5],
          7,
          {
            animate: true,
            duration: 2.5,
          }
        );
      }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

// ============================================================
// GIS LEGEND
// ============================================================

function GISLegend({
  layer,
}: {
  layer: LayerName;
}) {
  const legends: Record<
    LayerName,
    {
      title: string;
      items: {
        label: string;
        color: string;
      }[];
    }
  > = {
    landCover: {
      title: "Land Cover",
      items: [
        { label: "Water", color: "#3498db" },
        { label: "Trees", color: "#228b22" },
        { label: "Grass", color: "#7fbf5b" },
        {
          label: "Flooded vegetation",
          color: "#20b2aa",
        },
        { label: "Crops", color: "#d4b84c" },
        { label: "Shrub", color: "#8fbc8f" },
        { label: "Built-up", color: "#d95f59" },
        { label: "Bare", color: "#b9a58a" },
        {
          label: "Snow / ice",
          color: "#f5f5f5",
        },
      ],
    },

    ndvi: {
      title: "NDVI",
      items: [
        { label: "< 0", color: "#b56576" },
        {
          label: "0 – 0.2",
          color: "#e6a23c",
        },
        {
          label: "0.2 – 0.4",
          color: "#d6c44c",
        },
        {
          label: "0.4 – 0.6",
          color: "#7cb342",
        },
        {
          label: "> 0.6",
          color: "#1b8a3b",
        },
      ],
    },

    ndwi: {
      title: "NDWI",
      items: [
        {
          label: "< -0.3",
          color: "#8c510a",
        },
        {
          label: "-0.3 – 0",
          color: "#d8b365",
        },
        {
          label: "0 – 0.3",
          color: "#80cdc1",
        },
        {
          label: "> 0.3",
          color: "#016c9a",
        },
      ],
    },

    ndbi: {
      title: "NDBI",
      items: [
        {
          label: "< -0.2",
          color: "#1a9850",
        },
        {
          label: "-0.2 – 0",
          color: "#91cf60",
        },
        {
          label: "0 – 0.2",
          color: "#fee08b",
        },
        {
          label: "0.2 – 0.4",
          color: "#f46d43",
        },
        {
          label: "> 0.4",
          color: "#d73027",
        },
      ],
    },

    no2: {
      title: "NO₂ Anomaly",
      items: [
        {
          label: "< 0×",
          color: "#4c78a8",
        },
        {
          label: "0 – 1×",
          color: "#9ecae1",
        },
        {
          label: "1 – 2×",
          color: "#fddc7a",
        },
        {
          label: "2 – 4×",
          color: "#f28e2b",
        },
        {
          label: "> 4×",
          color: "#d73027",
        },
      ],
    },

    so2: {
      title: "SO₂ Anomaly",
      items: [
        {
          label: "< 0×",
          color: "#4c78a8",
        },
        {
          label: "0 – 1×",
          color: "#9ecae1",
        },
        {
          label: "1 – 2×",
          color: "#fddc7a",
        },
        {
          label: "2 – 4×",
          color: "#f28e2b",
        },
        {
          label: "> 4×",
          color: "#d73027",
        },
      ],
    },

    co: {
      title: "CO Anomaly",
      items: [
        {
          label: "< 0×",
          color: "#4c78a8",
        },
        {
          label: "0 – 1×",
          color: "#9ecae1",
        },
        {
          label: "1 – 2×",
          color: "#fddc7a",
        },
        {
          label: "2 – 4×",
          color: "#f28e2b",
        },
        {
          label: "> 4×",
          color: "#d73027",
        },
      ],
    },

    ch4: {
      title: "CH₄ Anomaly",
      items: [
        {
          label: "< 0×",
          color: "#4c78a8",
        },
        {
          label: "0 – 1×",
          color: "#9ecae1",
        },
        {
          label: "1 – 2×",
          color: "#fddc7a",
        },
        {
          label: "2 – 4×",
          color: "#f28e2b",
        },
        {
          label: "> 4×",
          color: "#d73027",
        },
      ],
    },

    persistence: {
      title: "Fire Persistence",
      items: [
        {
          label: "0",
          color: "#7f7f7f",
        },
        {
          label: "1 – 9",
          color: "#f6d55c",
        },
        {
          label: "10 – 49",
          color: "#ed9b40",
        },
        {
          label: "50 – 99",
          color: "#e76f51",
        },
        {
          label: "100+",
          color: "#b2182b",
        },
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
              border:
                item.color === "#f5f5f5"
                  ? "1px solid #999"
                  : "none",
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
  const items: Array<
    [PriorityLevel, string]
  > = [
    [
      "CRITICAL",
      PRIORITY_COLORS.CRITICAL,
    ],
    [
      "HIGH",
      PRIORITY_COLORS.HIGH,
    ],
    [
      "MODERATE",
      PRIORITY_COLORS.MODERATE,
    ],
    [
      "LOW",
      PRIORITY_COLORS.LOW,
    ],
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

      {items.map(
        ([label, color]) => (
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
        )
      )}
    </div>
  );
}

// ============================================================
// GIS LAYER CONTROL
// ============================================================

interface GISLayerControlProps {
  layers: GISLayers;
  setLayers: Dispatch<
    SetStateAction<GISLayers>
  >;
}

function GISLayerControl({
  layers,
  setLayers,
}: GISLayerControlProps) {
  const [minimized, setMinimized] =
    useState(false);

  const toggleLayer = (
    layer: keyof GISLayers
  ) => {
    setLayers((previous) => ({
      ...previous,
      [layer]: !previous[layer],
    }));
  };

  const renderCheckbox = (
    key: keyof GISLayers,
    label: string
  ) => (
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
        onChange={() =>
          toggleLayer(key)
        }
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
          onClick={() =>
            setMinimized(false)
          }
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
          justifyContent:
            "space-between",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            letterSpacing: "0.2px",
          }}
        >
          GIS Layers
        </div>

        <button
          onClick={() =>
            setMinimized(true)
          }
          style={{
            border: "none",
            background:
              "rgba(255,255,255,0.08)",
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

      {renderCheckbox(
        "firms",
        "Live FIRMS"
      )}

      {renderCheckbox(
        "landCover",
        "Land cover"
      )}

      {renderCheckbox(
        "ndvi",
        "NDVI"
      )}

      {renderCheckbox(
        "ndwi",
        "NDWI"
      )}

      {renderCheckbox(
        "ndbi",
        "NDBI"
      )}

      <div
        style={{
          height: "1px",
          background:
            "rgba(255,255,255,0.1)",
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

      {renderCheckbox(
        "no2",
        "NO₂ anomaly"
      )}

      {renderCheckbox(
        "so2",
        "SO₂ anomaly"
      )}

      {renderCheckbox(
        "co",
        "CO anomaly"
      )}

      {renderCheckbox(
        "ch4",
        "CH₄ anomaly"
      )}

      <div
        style={{
          height: "1px",
          background:
            "rgba(255,255,255,0.1)",
          margin: "10px 0",
        }}
      />

      {renderCheckbox(
        "persistence",
        "Fire persistence"
      )}
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

function GISDataLayer({
  layer,
  points,
}: GISDataLayerProps) {
  const getColor = (
    value: number
  ): string => {
    if (layer === "landCover") {
      const colors: Record<
        number,
        string
      > = {
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

      return (
        colors[
          Math.round(value)
        ] || "#999999"
      );
    }

    if (layer === "ndvi") {
      if (value < 0)
        return "#b56576";

      if (value < 0.2)
        return "#e6a23c";

      if (value < 0.4)
        return "#d6c44c";

      if (value < 0.6)
        return "#7cb342";

      return "#1b8a3b";
    }

    if (layer === "ndwi") {
      if (value < -0.3)
        return "#8c510a";

      if (value < 0)
        return "#d8b365";

      if (value < 0.3)
        return "#80cdc1";

      return "#016c9a";
    }

    if (layer === "ndbi") {
      if (value < -0.2)
        return "#1a9850";

      if (value < 0)
        return "#91cf60";

      if (value < 0.2)
        return "#fee08b";

      if (value < 0.4)
        return "#f46d43";

      return "#d73027";
    }

    if (
      layer === "no2" ||
      layer === "so2" ||
      layer === "co" ||
      layer === "ch4"
    ) {
      if (value < 0)
        return "#4c78a8";

      if (value < 1)
        return "#9ecae1";

      if (value < 2)
        return "#fddc7a";

      if (value < 4)
        return "#f28e2b";

      return "#d73027";
    }

    if (layer === "persistence") {
      if (value <= 0)
        return "#7f7f7f";

      if (value < 10)
        return "#f6d55c";

      if (value < 50)
        return "#ed9b40";

      if (value < 100)
        return "#e76f51";

      return "#b2182b";
    }

    return "#ffffff";
  };

  return (
    <>
      {points.map(
        (point, index) => {
          const color =
            getColor(
              point.value
            );

          return (
            <CircleMarker
              key={`${layer}-${index}`}
              center={[
                point.latitude,
                point.longitude,
              ]}
              radius={
                layer ===
                "persistence"
                  ? 4
                  : 3
              }
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 0,
              }}
            />
          );
        }
      )}
    </>
  );
}

// ============================================================
// MAIN FIRE MAP
// ============================================================

function FireMap() {
  const [fires, setFires] =
    useState<LiveFire[]>([]);

  const [analysis, setAnalysis] =
    useState<
      Record<
        string,
        AnalysisResult
      >
    >({});

  const [loadingFire, setLoadingFire] =
    useState<
      Record<string, boolean>
    >({});

  // ----------------------------------------------------------
  // IMPORTANT:
  // These refs prevent duplicate analysis requests.
  // They also prevent React StrictMode / stale-state issues.
  // ----------------------------------------------------------

  const analysisRef =
    useRef<
      Record<
        string,
        AnalysisResult
      >
    >({});

  const analyzingRef =
    useRef<Set<string>>(
      new Set()
    );

  const [layers, setLayers] =
    useState<GISLayers>({
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

  const [gisData, setGISData] =
    useState<
      Record<
        string,
        GISPoint[]
      >
    >({});

  const [loadingGIS, setLoadingGIS] =
    useState<string | null>(
      null
    );

  // Keep ref synchronized with state
  useEffect(() => {
    analysisRef.current =
      analysis;
  }, [analysis]);

  // ==========================================================
  // FIRE KEY
  // ==========================================================

  const getFireKey = (
    fire: LiveFire
  ): string => {
    const lat = Number(fire.latitude ?? 0);
    const lng = Number(fire.longitude ?? 0);
    return `${lat.toFixed(
      6
    )}-${lng.toFixed(
      6
    )}-${fire.acq_date || ""}-${fire.acq_time || ""}`;
  };

  // ==========================================================
  // LOAD LIVE FIRMS
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    async function loadFires() {
      try {
        const result =
          await getLiveFires();

        if (!mounted) return;

        const incomingFires: LiveFire[] = (
          Array.isArray(
            result?.fires
          )
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

        console.log(
          "Agni Netra - Live FIRMS fires:",
          incomingFires.length
        );

        setFires(
          incomingFires
        );
      } catch (error) {
        console.error(
          "Failed to load live FIRMS fires:",
          error
        );
      }
    }

    loadFires();

    const interval =
      window.setInterval(
        loadFires,
        5 * 60 * 1000
      );

    return () => {
      mounted = false;

      window.clearInterval(
        interval
      );
    };
  }, []);

  // ==========================================================
  // ANALYZE ONE FIRE
  // ==========================================================

  async function analyzeFire(
    fire: LiveFire
  ) {
    const key =
      getFireKey(fire);

    // Already analyzed
    if (
      analysisRef.current[key]
    ) {
      return;
    }

    // Already being analyzed
    if (
      analyzingRef.current.has(
        key
      )
    ) {
      return;
    }

    analyzingRef.current.add(
      key
    );

    setLoadingFire(
      (previous) => ({
        ...previous,
        [key]: true,
      })
    );

    try {
      console.log(
        "Agni Netra - Analyzing fire:",
        fire.latitude,
        fire.longitude
      );

      const result =
        await predictLiveFire(
          fire
        );

      console.log(
        "Agni Netra - Analysis result:",
        result
      );

      if (result?.success === false) {
        console.error(
          "Agni Netra - Prediction FAILED for fire:",
          fire.latitude,
          fire.longitude,
          "Backend error:",
          result.error
        );
        // Do NOT cache this as analyzed.
        // It will be retried on the next fires refresh.
        return;
      }

      const normalizedResult =
        normalizePriorityResult(
          result
        );

      /*
       * IMPORTANT:
       * Update the ref immediately.
       * This prevents another worker/effect from
       * sending the same fire again.
       */
      analysisRef.current = {
        ...analysisRef.current,
        [key]:
          normalizedResult,
      };

      setAnalysis(
        (previous) => ({
          ...previous,
          [key]:
            normalizedResult,
        })
      );
    } catch (error) {
      console.error(
        "Fire analysis failed:",
        fire,
        error
      );
    } finally {
      analyzingRef.current.delete(
        key
      );

      setLoadingFire(
        (previous) => ({
          ...previous,
          [key]: false,
        })
      );
    }
  }

  // ==========================================================
  // AUTOMATIC ANALYSIS OF ALL NEW FIRMS FIRES
  // ==========================================================

  useEffect(() => {
    if (fires.length === 0) {
      return;
    }

    /*
     * Build a snapshot of every fire that has not
     * already been analyzed or queued.
     */
    const queue =
      fires.filter((fire) => {
        const key =
          getFireKey(fire);

        return (
          !analysisRef.current[
            key
          ] &&
          !analyzingRef.current.has(
            key
          )
        );
      });

    console.log(
      "Agni Netra - New fires waiting for analysis:",
      queue.length
    );

    if (queue.length === 0) {
      return;
    }

    /*
     * Four workers allow four fires to be analyzed
     * simultaneously while still processing every fire.
     */
    let currentIndex = 0;

    const worker = async () => {
      while (true) {
        const index =
          currentIndex++;

        if (
          index >=
          queue.length
        ) {
          break;
        }

        const fire =
          queue[index];

        if (!fire) {
          continue;
        }

        await analyzeFire(
          fire
        );
      }
    };

    const workerCount =
      Math.min(
        4,
        queue.length
      );

    Promise.all(
      Array.from(
        {
          length:
            workerCount,
        },
        () => worker()
      )
    ).catch((error) => {
      console.error(
        "Automatic FIRMS analysis failed:",
        error
      );
    });

    // This effect intentionally runs when
    // the FIRMS fire list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fires]);

  // ==========================================================
  // GIS DATA
  // ==========================================================

  useEffect(() => {
    const layerMap: Record<
      LayerName,
      string
    > = {
      landCover:
        "landcover",
      ndvi: "ndvi",
      ndwi: "ndwi",
      ndbi: "ndbi",
      no2: "no2",
      so2: "so2",
      co: "co",
      ch4: "ch4",
      persistence:
        "persistence",
    };

    async function loadLayer(
      layerName: LayerName
    ) {
      const endpoint =
        layerMap[layerName];

      if (!endpoint) {
        return;
      }

      if (
        gisData[layerName]
      ) {
        return;
      }

      try {
        setLoadingGIS(
          layerName
        );

        const result =
          await getGISLayer(
            endpoint
          );

        if (
          result?.success &&
          Array.isArray(
            result.points
          )
        ) {
          setGISData(
            (previous) => ({
              ...previous,
              [layerName]:
                result.points,
            })
          );
        }
      } catch (error) {
        console.error(
          `Failed to load GIS layer ${layerName}:`,
          error
        );
      } finally {
        setLoadingGIS(null);
      }
    }

    GIS_LAYER_NAMES.forEach(
      (layerName) => {
        if (
          layers[layerName]
        ) {
          loadLayer(
            layerName
          );
        }
      }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // ==========================================================
  // GET PRIORITY
  // ==========================================================

  const getPriority = (
    fire: LiveFire
  ): PriorityLevel | undefined => {
    const result =
      analysis[
        getFireKey(fire)
      ];

    const level =
      result?.priority
        ?.level;

    if (
      level === "CRITICAL" ||
      level === "HIGH" ||
      level === "MODERATE" ||
      level === "LOW"
    ) {
      return level;
    }

    return undefined;
  };

  // ==========================================================
  // GET DOT COLOR
  // ==========================================================

  const getPriorityColor = (
    fire: LiveFire
  ): string => {
    const priority =
      getPriority(fire);

    if (!priority) {
      return PRIORITY_COLORS.NOT_ANALYZED;
    }

    return PRIORITY_COLORS[
      priority
    ];
  };

  // ==========================================================
  // PRIORITY COUNTS
  // ==========================================================

  const priorityCounts: Record<
    PriorityLevel,
    number
  > = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
  };

  fires.forEach(
    (fire) => {
      const priority =
        getPriority(fire);

      if (priority) {
        priorityCounts[
          priority
        ] += 1;
      }
    }
  );

  // ==========================================================
  // ANALYZED COUNT
  // ==========================================================

  const analyzedCount =
    fires.reduce(
      (
        count,
        fire
      ) => {
        const key =
          getFireKey(fire);

        if (
          analysis[key]
            ?.priority
            ?.level
        ) {
          return count + 1;
        }

        return count;
      },
      0
    );

  // ==========================================================
  // CRITICAL LOCATIONS
  // ==========================================================

  const criticalFires =
    fires
      .filter(
        (fire) =>
          getPriority(
            fire
          ) === "CRITICAL"
      )
      .sort(
        (a, b) =>
          Number(
            b.frp || 0
          ) -
          Number(
            a.frp || 0
          )
      )
      .slice(0, 3);

  // ==========================================================
  // ACTIVE GIS LEGEND
  // ==========================================================

  const activeGISLayer:
    | LayerName
    | undefined =
    GIS_LAYER_NAMES.find(
      (layer) =>
        layers[layer]
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
        center={[
          20.3,
          84.5,
        ]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* BASE MAP */}

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* WORLD → ODISHA */}

        <WorldToOdisha />

        {/* GIS OVERLAYS */}

        {GIS_LAYER_NAMES.map(
          (layerName) => {
            if (
              !layers[layerName]
            ) {
              return null;
            }

            const points =
              gisData[
                layerName
              ];

            if (
              !points ||
              points.length === 0
            ) {
              return null;
            }

            return (
              <GISDataLayer
                key={
                  layerName
                }
                layer={
                  layerName
                }
                points={points}
              />
            );
          }
        )}

        {/* LIVE FIRMS */}

        {layers.firms &&
          fires.map(
            (
              fire,
              index
            ) => {
              const key =
                getFireKey(
                  fire
                );

              const result =
                analysis[key];

              const priority =
                getPriority(
                  fire
                );

              const color =
                getPriorityColor(
                  fire
                );

              const isLoading =
                Boolean(
                  loadingFire[
                    key
                  ]
                );

              return (
                <CircleMarker
                  key={`${key}-${index}`}
                  center={[
                    fire.latitude,
                    fire.longitude,
                  ]}
                  radius={
                    priority ===
                    "CRITICAL"
                      ? 7
                      : priority ===
                        "HIGH"
                      ? 6
                      : 5
                  }
                  pathOptions={{
                    color,
                    fillColor:
                      color,
                    fillOpacity:
                      0.95,
                    weight:
                      priority ===
                      "CRITICAL"
                        ? 2
                        : 1.5,
                  }}
                  eventHandlers={{
                    click: () =>
                      analyzeFire(
                        fire
                      ),
                  }}
                >
                  <Popup
                    maxWidth={
                      380
                    }
                    minWidth={
                      300
                    }
                    autoPan
                    autoPanPadding={[
                      30,
                      30,
                    ]}
                  >
                    <div
                      style={{
                        width:
                          "100%",
                        maxHeight:
                          "430px",
                        overflowY:
                          "auto",
                        overflowX:
                          "hidden",
                        paddingRight:
                          "8px",
                        boxSizing:
                          "border-box",
                        fontFamily: FONT,
                      }}
                    >
                      {/* BRAND */}

                      <div
                        style={{
                          fontSize:
                            "11px",
                          fontWeight:
                            800,
                          letterSpacing:
                            "1.6px",
                          color: BRAND_ACCENT,
                          marginBottom:
                            "5px",
                        }}
                      >
                        Agni Netra
                      </div>

                      <h3
                        style={{
                          margin:
                            "0 0 5px 0",
                          fontSize:
                            "20px",
                        }}
                      >
                        Fire Detection
                      </h3>

                      <div
                        style={{
                          fontSize:
                            "12px",
                          color:
                            "#666",
                          marginBottom:
                            "12px",
                        }}
                      >
                        NASA FIRMS
                        Detection
                      </div>

                      {/* FIRMS DATA */}

                      <div
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap:
                            "7px",
                          fontSize:
                            "12px",
                        }}
                      >
                        <div>
                          <strong>
                            FRP:
                          </strong>{" "}
                          {fire.frp ??
                            "N/A"}{" "}
                          MW
                        </div>

                        <div>
                          <strong>
                            Date:
                          </strong>{" "}
                          {fire.acq_date ??
                            "N/A"}
                        </div>

                        <div>
                          <strong>
                            Satellite:
                          </strong>{" "}
                          {fire.satellite ??
                            fire.instrument ??
                            "VIIRS"}
                        </div>

                        <div>
                          <strong>
                            Confidence:
                          </strong>{" "}
                          {fire.confidence ??
                            "N/A"}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop:
                            "8px",
                          fontSize:
                            "11px",
                          color:
                            "#666",
                        }}
                      >
                        Coordinates:{" "}
                        {fire.latitude.toFixed(
                          4
                        )}
                        ,{" "}
                        {fire.longitude.toFixed(
                          4
                        )}
                      </div>

                      {/* RESPONSE PRIORITY */}

                      {priority && (
                        <div
                          style={{
                            marginTop:
                              "14px",
                            padding:
                              "12px",
                            borderRadius:
                              "8px",
                            background:
                              priority ===
                              "CRITICAL"
                                ? "#fff0f0"
                                : priority ===
                                  "HIGH"
                                ? "#fff7ed"
                                : priority ===
                                  "MODERATE"
                                ? "#fffbea"
                                : "#f2faf3",
                            border:
                              `1px solid ${color}`,
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              color:
                                "#777",
                              letterSpacing:
                                "0.5px",
                              marginBottom:
                                "5px",
                            }}
                          >
                            Fire response
                            priority
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap:
                                "8px",
                              fontSize:
                                "19px",
                              fontWeight:
                                800,
                              color,
                            }}
                          >
                            <span
                              style={{
                                width:
                                  "10px",
                                height:
                                  "10px",
                                borderRadius:
                                  "50%",
                                background:
                                  color,
                                display:
                                  "inline-block",
                              }}
                            />

                            {priority}
                          </div>

                          {result
                            ?.priority
                            ?.score !==
                            undefined && (
                            <div
                              style={{
                                marginTop:
                                  "5px",
                                fontSize:
                                  "10px",
                                color:
                                  "#777",
                              }}
                            >
                              Priority
                              score:{" "}
                              {
                                result
                                  .priority
                                  .score
                              }
                            </div>
                          )}

                          {result
                            ?.priority
                            ?.reasons &&
                            result
                              .priority
                              .reasons
                              .length >
                              0 && (
                              <div
                                style={{
                                  marginTop:
                                    "9px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize:
                                      "10px",
                                    fontWeight:
                                      800,
                                    color:
                                      "#777",
                                    letterSpacing:
                                      "0.4px",
                                    marginBottom:
                                      "4px",
                                  }}
                                >
                                  Decision support
                                </div>

                                {result.priority.reasons.map(
                                  (
                                    reason,
                                    i
                                  ) => (
                                    <div
                                      key={
                                        i
                                      }
                                      style={{
                                        fontSize:
                                          "11px",
                                        color:
                                          "#555",
                                        marginTop:
                                          "4px",
                                      }}
                                    >
                                      •{" "}
                                      {
                                        reason
                                      }
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      )}

                      {/* MODEL ANALYSIS */}

                      {result?.prediction && (
                        <div
                          style={{
                            marginTop:
                              "14px",
                            padding:
                              "11px",
                            borderRadius:
                              "7px",
                            background:
                              "#f7f9fc",
                            border:
                              "1px solid #dce3ec",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              color:
                                "#777",
                              letterSpacing:
                                "0.5px",
                              marginBottom:
                                "7px",
                            }}
                          >
                            AI fire classification
                          </div>

                          {result
                            .prediction
                            .predicted_class && (
                            <div
                              style={{
                                fontSize:
                                  "12px",
                                marginBottom:
                                  "5px",
                              }}
                            >
                              <strong>
                                Predicted
                                class:
                              </strong>{" "}
                              {
                                result
                                  .prediction
                                  .predicted_class
                              }
                            </div>
                          )}

                          {result
                            .prediction
                            .confidence !==
                            undefined && (
                            <div
                              style={{
                                fontSize:
                                  "12px",
                              }}
                            >
                              <strong>
                                Model
                                confidence:
                              </strong>{" "}
                              {(
                                Number(
                                  result
                                    .prediction
                                    .confidence
                                ) * 100
                              ).toFixed(
                                1
                              )}
                              %
                            </div>
                          )}

                          {result
                            .prediction
                            .probabilities && (
                            <div
                              style={{
                                marginTop:
                                  "8px",
                              }}
                            >
                              {Object.entries(
                                result
                                  .prediction
                                  .probabilities
                              ).map(
                                ([
                                  label,
                                  probability,
                                ]) => (
                                  <div
                                    key={
                                      label
                                    }
                                    style={{
                                      fontSize:
                                        "11px",
                                      marginTop:
                                        "4px",
                                      display:
                                        "flex",
                                      justifyContent:
                                        "space-between",
                                    }}
                                  >
                                    <span>
                                      {label}
                                    </span>

                                    <strong>
                                      {(
                                        Number(
                                          probability
                                        ) *
                                        100
                                      ).toFixed(
                                        1
                                      )}
                                      %
                                    </strong>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* INDUSTRIAL ASSOCIATION */}

                      {result?.industrial_association && (
                        <div
                          style={{
                            marginTop:
                              "12px",
                            padding:
                              "11px",
                            borderRadius:
                              "7px",
                            background:
                              "#f7f7f7",
                            border:
                              "1px solid #ddd",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              color:
                                "#777",
                              letterSpacing:
                                "0.5px",
                              marginBottom:
                                "7px",
                            }}
                          >
                            Industrial fire
                            assessment
                          </div>

                          {result
                            .industrial_association
                            .level && (
                            <div
                              style={{
                                fontSize:
                                  "12px",
                                marginBottom:
                                  "5px",
                              }}
                            >
                              <strong>
                                Association:
                              </strong>{" "}
                              {
                                result
                                  .industrial_association
                                  .level
                              }
                            </div>
                          )}

                          {result
                            .industrial_association
                            .context_score !==
                            undefined && (
                            <div
                              style={{
                                fontSize:
                                  "11px",
                                color:
                                  "#666",
                              }}
                            >
                              Context
                              score:{" "}
                              {
                                result
                                  .industrial_association
                                  .context_score
                              }
                            </div>
                          )}

                          {result
                            .industrial_association
                            .evidence &&
                            result
                              .industrial_association
                              .evidence
                              .length >
                              0 && (
                              <div
                                style={{
                                  marginTop:
                                    "7px",
                                }}
                              >
                                {result.industrial_association.evidence.map(
                                  (
                                    evidence,
                                    i
                                  ) => (
                                    <div
                                      key={
                                        i
                                      }
                                      style={{
                                        fontSize:
                                          "11px",
                                        color:
                                          "#555",
                                        marginTop:
                                          "4px",
                                      }}
                                    >
                                      •{" "}
                                      {
                                        evidence
                                      }
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      )}

                      {/* GAS LEAK ASSESSMENT */}

                      {result?.gas_assessment && (
                        <div
                          style={{
                            marginTop:
                              "12px",
                            padding:
                              "11px",
                            borderRadius:
                              "7px",
                            background:
                              "#f7f7f7",
                            border:
                              "1px solid #ddd",
                          }}
                        >
                          <div
                            style={{
                              fontSize:
                                "10px",
                              fontWeight:
                                800,
                              color:
                                "#777",
                              letterSpacing:
                                "0.5px",
                              marginBottom:
                                "7px",
                            }}
                          >
                            Gas leak
                            assessment
                          </div>

                          {result
                            .gas_assessment
                            .assessment && (
                            <div
                              style={{
                                fontSize:
                                  "12px",
                                marginBottom:
                                  "5px",
                              }}
                            >
                              <strong>
                                Assessment:
                              </strong>{" "}
                              {
                                result
                                  .gas_assessment
                                  .assessment
                              }
                            </div>
                          )}

                          {result
                            .gas_assessment
                            .score !==
                            undefined && (
                            <div
                              style={{
                                fontSize:
                                  "11px",
                                color:
                                  "#666",
                              }}
                            >
                              Gas anomaly
                              score:{" "}
                              {
                                result
                                  .gas_assessment
                                  .score
                              }
                            </div>
                          )}

                          {result
                            .gas_assessment
                            .evidence &&
                            result
                              .gas_assessment
                              .evidence
                              .length >
                              0 && (
                              <div
                                style={{
                                  marginTop:
                                    "7px",
                                }}
                              >
                                {result.gas_assessment.evidence.map(
                                  (
                                    evidence,
                                    i
                                  ) => (
                                    <div
                                      key={
                                        i
                                      }
                                      style={{
                                        fontSize:
                                          "11px",
                                        color:
                                          "#555",
                                        marginTop:
                                          "4px",
                                      }}
                                    >
                                      •{" "}
                                      {
                                        evidence
                                      }
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      )}

                      {/* SUPPORTING EVIDENCE */}

                      {result
                        ?.supporting_evidence &&
                        result
                          .supporting_evidence
                          .length >
                          0 && (
                          <div
                            style={{
                              marginTop:
                                "12px",
                              padding:
                                "11px",
                              borderRadius:
                                "7px",
                              background:
                                "#f7f7f7",
                              border:
                                "1px solid #ddd",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "10px",
                                fontWeight:
                                  800,
                                color:
                                  "#777",
                                letterSpacing:
                                  "0.5px",
                                marginBottom:
                                  "7px",
                              }}
                            >
                              Supporting evidence
                            </div>

                            {result.supporting_evidence.map(
                              (
                                evidence,
                                i
                              ) => (
                                <div
                                  key={
                                    i
                                  }
                                  style={{
                                    fontSize:
                                      "11px",
                                    color:
                                      "#555",
                                    marginTop:
                                      "4px",
                                  }}
                                >
                                  •{" "}
                                  {
                                    evidence
                                  }
                                </div>
                              )
                            )}
                          </div>
                        )}

                      {/* CONTEXT DISTANCE */}

                      {result?.context_distance_m !==
                        undefined && (
                        <div
                          style={{
                            marginTop:
                              "10px",
                            fontSize:
                              "11px",
                            color:
                              "#666",
                          }}
                        >
                          Context distance:{" "}
                          {Number(
                            result.context_distance_m
                          ).toFixed(
                            0
                          )}{" "}
                          m
                        </div>
                      )}

                      {/* ANALYSIS IN PROGRESS */}

                      {!priority &&
                        isLoading && (
                          <div
                            style={{
                              marginTop:
                                "14px",
                              padding:
                                "11px",
                              borderRadius:
                                "7px",
                              background:
                                "#fff7ed",
                              border:
                                "1px solid #f59e0b",
                              fontSize:
                                "11px",
                              color:
                                "#8a4b08",
                            }}
                          >
                            <strong>
                              Analyzing fire
                              response
                              priority...
                            </strong>
                          </div>
                        )}

                      {/* NOT AVAILABLE */}

                      {!priority &&
                        !isLoading && (
                          <div
                            style={{
                              marginTop:
                                "14px",
                              padding:
                                "10px",
                              borderRadius:
                                "7px",
                              background:
                                "#f7f7f7",
                              fontSize:
                                "11px",
                              color:
                                "#666",
                            }}
                          >
                            Response
                            priority
                            unavailable.
                            Click the
                            detection to
                            retry analysis.
                          </div>
                        )}

                      {/* BASIS / DISCLAIMER */}

                      <div
                        style={{
                          marginTop:
                            "14px",
                          paddingTop:
                            "9px",
                          borderTop:
                            "1px solid #e5e5e5",
                          fontSize:
                            "9px",
                          lineHeight:
                            1.45,
                          color:
                            "#888",
                        }}
                      >
                        Analysis is based on
                        NASA FIRMS detection
                        data and the
                        supporting satellite,
                        environmental,
                        industrial and
                        atmospheric evidence
                        available to the Agni
                        Netra model.
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            }
          )}
      </MapContainer>

      {/* ====================================================
          RESPONSE PRIORITY SUMMARY
      ==================================================== */}

      <div
        style={{
          position:
            "absolute",
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
            fontSize:
              "10px",
            fontWeight:
              700,
            letterSpacing:
              "1.4px",
            textTransform:
              "uppercase",
            color: BRAND_ACCENT,
            marginBottom:
              "4px",
          }}
        >
          Agni Netra
        </div>

        <div
          style={{
            fontSize:
              "16px",
            fontWeight:
              700,
            marginBottom:
              "12px",
          }}
        >
          Response Priority
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "7px",
          }}
        >
          {(
            [
              [
                "CRITICAL",
                priorityCounts.CRITICAL,
                PRIORITY_COLORS.CRITICAL,
              ],
              [
                "HIGH",
                priorityCounts.HIGH,
                PRIORITY_COLORS.HIGH,
              ],
              [
                "MODERATE",
                priorityCounts.MODERATE,
                PRIORITY_COLORS.MODERATE,
              ],
              [
                "LOW",
                priorityCounts.LOW,
                PRIORITY_COLORS.LOW,
              ],
            ] as [
              PriorityLevel,
              number,
              string
            ][]
          ).map(
            ([
              label,
              count,
              color,
            ]) => (
              <div
                key={
                  label
                }
                style={{
                  padding:
                    "9px",
                  borderRadius:
                    "8px",
                  background:
                    `${color}18`,
                  border:
                    `1px solid ${color}55`,
                }}
              >
                <div
                  style={{
                    fontSize:
                      "9px",
                    fontWeight:
                      700,
                    letterSpacing:
                      "0.3px",
                    color,
                    marginBottom:
                      "4px",
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    fontSize:
                      "19px",
                    fontWeight:
                      700,
                  }}
                >
                  {count}
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            marginTop:
              "10px",
            paddingTop:
              "9px",
            borderTop:
              "1px solid rgba(255,255,255,0.1)",
            fontSize:
              "11px",
            color:
              "#b0b0b0",
          }}
        >
          Analyzed:{" "}
          <strong
            style={{
              color:
                "white",
            }}
          >
            {analyzedCount}
          </strong>{" "}
          /{" "}
          {fires.length}
        </div>

        {criticalFires.length >
          0 && (
          <div
            style={{
              marginTop:
                "10px",
              paddingTop:
                "9px",
              borderTop:
                "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                fontSize:
                  "10px",
                fontWeight:
                  700,
                color:
                  PRIORITY_COLORS.CRITICAL,
                letterSpacing:
                  "0.4px",
                marginBottom:
                  "8px",
              }}
            >
              Critical locations
            </div>

            {criticalFires.map(
              (
                fire,
                index
              ) => (
                <div
                  key={getFireKey(
                    fire
                  )}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "18px 1fr",
                    gap:
                      "3px",
                    marginBottom:
                      "7px",
                    fontSize:
                      "10px",
                  }}
                >
                  <strong
                    style={{
                      color:
                        PRIORITY_COLORS.CRITICAL,
                    }}
                  >
                    {index +
                      1}
                    .
                  </strong>

                  <div>
                    <div>
                      {fire.latitude.toFixed(
                        4
                      )}
                      ,{" "}
                      {fire.longitude.toFixed(
                        4
                      )}
                    </div>

                    <div
                      style={{
                        color:
                          "#999",
                        marginTop:
                          "2px",
                      }}
                    >
                      {Number(
                        fire.frp ||
                          0
                      ).toFixed(
                        1
                      )}{" "}
                      MW
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* GIS CONTROL */}

      <GISLayerControl
        layers={layers}
        setLayers={
          setLayers
        }
      />

      {/* LEGEND */}

      {layers.firms &&
        !activeGISLayer && (
          <FirePriorityLegend />
        )}

      {activeGISLayer && (
        <GISLegend
          layer={
            activeGISLayer
          }
        />
      )}

      {/* GIS LOADING */}

      {loadingGIS && (
        <div
          style={{
            position:
              "absolute",
            bottom:
              "18px",
            left:
              activeGISLayer
                ? "220px"
                : "18px",
            zIndex:
              1000,
            background: PANEL_BG,
            border: PANEL_BORDER,
            color:
              "white",
            padding:
              "10px 14px",
            borderRadius:
              "8px",
            fontSize:
              "11px",
            fontFamily: FONT,
          }}
        >
          Loading{" "}
          {loadingGIS} GIS
          layer...
        </div>
      )}

      {/* LIVE DETECTION COUNT */}

      <div
        style={{
          position:
            "absolute",
          bottom:
            "18px",
          right:
            "18px",
          zIndex:
            1000,
          background: PANEL_BG,
          border: PANEL_BORDER,
          color:
            "white",
          padding:
            "10px 15px",
          borderRadius:
            "8px",
          fontSize:
            "12px",
          fontFamily: FONT,
        }}
      >
        Live detections:{" "}
        <strong>
          {fires.length}
        </strong>
      </div>
    </div>
  );
}

export default FireMap;