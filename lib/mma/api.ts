const API_BASE_URL =
  process.env.MMA_API_BASE_URL ?? "https://v1.mma.api-sports.io";

export interface ApiFight {
  id: number;
  date: string;
  time: string;
  timestamp: number;
  timezone: string;
  slug: string;
  is_main: boolean;
  category: string | null;

  status: {
    long: string;
    short: string;
  };

  fighters: {
    first: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
    second: {
      id: number;
      name: string;
      logo: string | null;
      winner: boolean | null;
    };
  };
}

interface ApiResponse<T> {
  response: T[];
  errors?: Record<string, string> | string[];
}

async function mmaFetch<T>(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.MMA_API_KEY;

  if (!apiKey) {
    throw new Error("MMA_API_KEY is not configured.");
  }

  const url = new URL(path, API_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`MMA API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (payload.errors && Object.keys(payload.errors).length > 0) {
    throw new Error(
      `MMA API returned an error: ${JSON.stringify(payload.errors)}`
    );
  }

  return payload.response ?? [];
}

export function getFightsByDate(date: string) {
  return mmaFetch<ApiFight>("/fights", { date });
}

export interface ApiFightResult {
  fight: {
    id: number;
  };
  won_type: string | null;
  round: number | null;
  minute: string | null;
  ko_type: string | null;
  target: string | null;
  sub_type: string | null;
}

export async function getFightResult(fightId: number) {
  const results = await mmaFetch<ApiFightResult>("/fights/results", {
    id: fightId,
  });

  return results[0] ?? null;
}