import { sql } from '@vercel/postgres';

type HostCache = {
  patterns: string[];
  expiresAt: number;
};

const CACHE_TTL_MS = Math.max(30_000, Number(process.env.SCRAPE_HOST_CACHE_TTL_MS ?? 5 * 60_000));
const DEFAULT_ALLOWED_HOSTS = process.env.SCRAPE_ALLOWED_HOSTS ?? '*';

let hostCache: HostCache | null = null;

function parseHostPatterns(raw: string): string[] {
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

async function fetchDatabasePatterns(): Promise<string[]> {
  try {
    const result = await sql<{
      hostname_pattern: string;
    }>`
      SELECT hostname_pattern
      FROM scrape_allowed_hosts
      WHERE is_enabled = true
      ORDER BY hostname_pattern ASC
    `;

    return result.rows.map((row) => row.hostname_pattern.toLowerCase());
  } catch (error) {
    console.warn('[webScraperConfig] database.fetch.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function getScrapeHostPatterns(): Promise<string[]> {
  const now = Date.now();
  if (hostCache && hostCache.expiresAt > now) {
    return hostCache.patterns;
  }

  const envPatterns = parseHostPatterns(DEFAULT_ALLOWED_HOSTS);
  const dbPatterns = await fetchDatabasePatterns();

  const merged = Array.from(new Set([...envPatterns, ...dbPatterns]));

  hostCache = {
    patterns: merged,
    expiresAt: now + CACHE_TTL_MS,
  };

  return merged;
}

export function invalidateScrapeHostCache() {
  hostCache = null;
}

export function __testables() {
  return {
    parseHostPatterns,
    fetchDatabasePatterns,
    get hostCache() {
      return hostCache;
    },
  };
}
