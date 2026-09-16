// const API_BASE_URL = "http://127.0.0.1:8000";

// export async function testPrediction() {
//   const response = await fetch(
//     `${API_BASE_URL}/test-prediction`
//   );

//   if (!response.ok) {
//     throw new Error("Failed to connect to Agni Netra backend");
//   }

//   return response.json();
// }

// export async function getLiveFires() {
//   const response = await fetch(
//     `${API_BASE_URL}/live-fires`
//   );

//   if (!response.ok) {
//     throw new Error("Failed to fetch live FIRMS data");
//   }

//   return response.json();
// }

// export async function predictLiveFire(fire: any) {
//   const response = await fetch(`${API_BASE_URL}/predict-live`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(fire),
//   });

//   if (!response.ok) {
//     throw new Error("Failed to analyze live fire");
//   }

//   return response.json();
// }


// export async function getGISLayer(
//   layer: string
// ) {
//   const response = await fetch(
//     `${API_BASE_URL}/gis-layer/${layer}`
//   );

//   if (!response.ok) {
//     throw new Error(
//       `Failed to load GIS layer: ${layer}`
//     );
//   }

//   return response.json();
// }

// In development this falls back to your local FastAPI/Flask server.
// In production, set VITE_API_BASE_URL in your deployment platform's
// environment variables (e.g. Vercel/Netlify project settings) to
// point at your deployed backend.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function testPrediction() {
  const response = await fetch(`${API_BASE_URL}/test-prediction`);

  if (!response.ok) {
    throw new Error("Failed to connect to Agni Netra backend");
  }

  return response.json();
}

export async function getLiveFires() {
  const response = await fetch(`${API_BASE_URL}/live-fires`);

  if (!response.ok) {
    throw new Error("Failed to fetch live FIRMS data");
  }

  return response.json();
}

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

export async function getGISLayer(layer: string) {
  const response = await fetch(`${API_BASE_URL}/gis-layer/${layer}`);

  if (!response.ok) {
    throw new Error(`Failed to load GIS layer: ${layer}`);
  }

  return response.json();
}