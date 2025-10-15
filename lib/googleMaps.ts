type LatLng = {
  lat: number;
  lng: number;
};

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

function hasApiKey(): boolean {
  if (!API_KEY) {
    console.warn("GOOGLE_MAPS_API_KEY is not set");
    return false;
  }
  return true;
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  if (!hasApiKey()) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", API_KEY!);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error("Geocoding request failed", await response.text());
    return null;
  }

  const data = (await response.json()) as {
    status: string;
    results: Array<{ geometry: { location: LatLng } }>;
  };

  if (data.status !== "OK" || !data.results?.length) {
    console.warn("Geocoding returned no results", address, data.status);
    return null;
  }

  return data.results[0].geometry.location;
}

export async function getDrivingDistanceKm(
  origin: LatLng,
  destination: LatLng
): Promise<number | null> {
  if (!hasApiKey()) {
    return haversineKm(origin, destination);
  }

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("units", "metric");
  url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destinations", `${destination.lat},${destination.lng}`);
  url.searchParams.set("key", API_KEY!);

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.error("Distance Matrix request failed", await response.text());
    return haversineKm(origin, destination);
  }

  const data = (await response.json()) as {
    status: string;
    rows?: Array<{ elements: Array<{ status: string; distance?: { value: number } }> }>;
  };

  const element = data.rows?.[0]?.elements?.[0];
  if (data.status === "OK" && element && element.status === "OK" && element.distance) {
    return element.distance.value / 1000;
  }

  console.warn("Distance Matrix returned no route", data.status, element?.status);
  return haversineKm(origin, destination);
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(
        sinLat * sinLat +
          Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon
      ),
      Math.sqrt(
        1 -
          (sinLat * sinLat +
            Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon)
      )
    );

  return R * c;
}

export { LatLng };
