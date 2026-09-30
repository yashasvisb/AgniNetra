// ---------------------------------------------------------
// Agni Netra - API service
// Every call from the website to the backend lives here.
// ---------------------------------------------------------

// In development this points to your local backend.
// In production (Vercel) set VITE_API_BASE_URL to your deployed backend URL.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://172.198.137.243";

// ---------------------------------------------------------
// Model test
// ---------------------------------------------------------
export async function testPrediction() {
  const response = await fetch(`${API_BASE_URL}/test-prediction`);

  if (!response.ok) {
    throw new Error("Failed to connect to Agni Netra backend");
  }

  return response.json();
}

// ---------------------------------------------------------
// NASA FIRMS live fires
// ---------------------------------------------------------
export async function getLiveFires() {
  const response = await fetch(`${API_BASE_URL}/live-fires`);

  if (!response.ok) {
    throw new Error("Failed to fetch live FIRMS data");
  }

  return response.json();
}

// ---------------------------------------------------------
// Analyze one live fire
// ---------------------------------------------------------
export async function predictLiveFire(fire: any) {
  const response = await fetch(`${API_BASE_URL}/predict-live`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fire),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze live fire");
  }

  return response.json();
}

// ---------------------------------------------------------
// GIS layers (defined ONCE - it was duplicated before)
// ---------------------------------------------------------
export async function getGISLayer(layer: string) {
  const response = await fetch(`${API_BASE_URL}/gis-layer/${layer}`);

  if (!response.ok) {
    throw new Error(`Failed to load GIS layer: ${layer}`);
  }

  return response.json();
}

// ---------------------------------------------------------
// Emergency route optimization
// ---------------------------------------------------------
export async function getEmergencyRoute(fireLat: number, fireLon: number) {
  const response = await fetch(
    `${API_BASE_URL}/route?fire_lat=${fireLat}&fire_lon=${fireLon}`
  );

  if (!response.ok) {
    // Our backend sends the reason in a "detail" field
    const errorBody = await response.json().catch(() => ({}));

    throw new Error(
      errorBody.detail || "Failed to calculate emergency response route"
    );
  }

  return response.json();
}