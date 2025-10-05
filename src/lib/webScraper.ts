import * as cheerio from 'cheerio';
import { getScrapeHostPatterns } from './webScraperConfig';

const SCRAPE_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 8000);
const SCRAPE_MAX_ATTEMPTS = Math.max(1, Number(process.env.SCRAPE_RETRY_ATTEMPTS ?? 4));
const SCRAPE_RETRY_DELAY_MS = Math.max(0, Number(process.env.SCRAPE_RETRY_DELAY_MS ?? 250));
const SCRAPE_CACHE_TTL_MS = Math.max(0, Number(process.env.SCRAPE_CACHE_TTL_MS ?? 5 * 60_000));
const ROBOTS_CACHE_TTL_MS = Math.max(60_000, Number(process.env.SCRAPE_ROBOTS_CACHE_TTL_MS ?? 10 * 60_000));

const BASE_HEADERS: Record<string, string> = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1',
};

const STATIC_HEADER_VARIANTS: Array<Record<string, string>> = [
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Accept-Language': 'en-GB,en;q=0.8',
  },
  {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:118.0) Gecko/20100101 Firefox/118.0',
    'Accept-Language': 'en-US,en;q=0.7',
  },
];

const RETRYABLE_STATUS_CODES = new Set([403, 407, 408, 425, 429, 500, 502, 503, 504]);
const META_ROBOTS_BLOCKLIST = ['noindex', 'nofollow', 'noarchive', 'none'];
const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₩': 'KRW',
  '₽': 'RUB',
  'C$': 'CAD',
  'A$': 'AUD',
  '₫': 'VND',
  '₺': 'TRY',
  '₪': 'ILS',
  'CHF': 'CHF',
};
const ISO_CURRENCY_PATTERN = /(USD|EUR|GBP|CAD|AUD|CHF|JPY|CNY|RMB|INR|SEK|NOK|DKK|PLN|MXN|BRL|ZAR)/i;

const htmlCache = new Map<string, { html: string; expiresAt: number }>();
const robotsCache = new Map<string, { disallows: string[]; expiresAt: number }>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function logDiagnostic(
  event: string,
  payload: Record<string, unknown> = {},
  level: 'info' | 'warn' | 'error' = 'info',
) {
  const message = `[webScraper] ${event}`;
  if (level === 'error') {
    console.error(message, payload);
  } else if (level === 'warn') {
    console.warn(message, payload);
  } else {
    console.info(message, payload);
  }
}

function parseAdditionalUserAgents(): Array<Record<string, string>> {
  const raw = process.env.SCRAPE_USER_AGENTS ?? '';
  return raw
    .split(/\r?\n|\|/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((userAgent) => ({
      'User-Agent': userAgent,
      'Accept-Language': 'en-US,en;q=0.9',
    }));
}

function shuffle<T>(input: T[]): T[] {
  const items = [...input];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function buildHeaderVariants(): Array<Record<string, string>> {
  const merged = [...STATIC_HEADER_VARIANTS, ...parseAdditionalUserAgents()];
  return merged.length > 0 ? merged : [...STATIC_HEADER_VARIANTS];
}

function buildUrlVariants(original: URL): URL[] {
  const variants = new Map<string, URL>();

  const addVariant = (candidate: URL) => {
    const key = candidate.toString();
    if (!variants.has(key)) {
      variants.set(key, candidate);
    }
  };

  addVariant(new URL(original.toString()));

  const hostnameWithoutWww = original.hostname.replace(/^www\./i, '');
  if (hostnameWithoutWww !== original.hostname) {
    const noWww = new URL(original.toString());
    noWww.hostname = hostnameWithoutWww;
    addVariant(noWww);
  } else {
    const withWww = new URL(original.toString());
    withWww.hostname = `www.${original.hostname}`;
    addVariant(withWww);
  }

  if (original.search) {
    const noQuery = new URL(original.toString());
    noQuery.search = '';
    addVariant(noQuery);
  }

  return Array.from(variants.values());
}

function matchesHostPattern(host: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '*.*') {
    return true;
  }

  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // retain leading dot
    return host === pattern.slice(2) || host.endsWith(suffix);
  }

  if (pattern.startsWith('*')) {
    const suffix = pattern.slice(1);
    return host.endsWith(suffix);
  }

  return host === pattern;
}

async function filterAllowedVariants(original: URL): Promise<URL[]> {
  const patterns = (await getScrapeHostPatterns()).map((pattern) => pattern.trim());

  if (patterns.length === 0) {
    throw new Error('No scraping hosts configured.');
  }

  const allowAll = patterns.some((pattern) => pattern === '*' || pattern === '*.*');

  const host = original.hostname.toLowerCase();
  if (!allowAll && !patterns.some((pattern) => matchesHostPattern(host, pattern))) {
    throw new Error(`Scraping blocked for host: ${original.hostname}`);
  }

  const variants = buildUrlVariants(original).filter((candidate) => {
    if (allowAll) {
      return true;
    }

    return patterns.some((pattern) => matchesHostPattern(candidate.hostname.toLowerCase(), pattern));
  });

  if (variants.length === 0) {
    throw new Error(`Scraping blocked for host: ${original.hostname}`);
  }

  return variants;
}

function buildRequestVariants(urlVariants: URL[]): Array<{ url: URL; headers: Record<string, string> }> {
  const requests: Array<{ url: URL; headers: Record<string, string> }> = [];
  const headerVariants = shuffle(buildHeaderVariants());

  for (const targetUrl of urlVariants) {
    for (const headerVariant of headerVariants) {
      requests.push({
        url: targetUrl,
        headers: {
          ...BASE_HEADERS,
          ...headerVariant,
          Referer: `${targetUrl.protocol}//${targetUrl.hostname}/`,
        },
      });
    }
  }

  return requests.slice(0, SCRAPE_MAX_ATTEMPTS);
}

function extractMeta($: cheerio.Root, key: string, attribute: 'name' | 'property' = 'property'): string | null {
  const content = $(`meta[${attribute}="${key}"]`).attr('content');
  return content ? content.trim() : null;
}

function extractJsonLdProducts($: cheerio.Root): Array<Record<string, unknown>> {
  const products: Array<Record<string, unknown>> = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') {
          continue;
        }

        const type = (candidate as Record<string, unknown>)['@type'];
        if (!type) {
          continue;
        }

        const types = Array.isArray(type) ? type.map(String) : [String(type)];
        if (types.some((value) => value.toLowerCase().includes('product'))) {
          products.push(candidate as Record<string, unknown>);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  });

  return products;
}

function extractFirstString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const stringified = extractFirstString(item);
      if (stringified) {
        return stringified;
      }
    }
  }
  if (value && typeof value === 'object' && 'name' in value) {
    return extractFirstString((value as Record<string, unknown>).name);
  }
  return null;
}

function sanitizeNumberString(raw: string): string | null {
  let value = raw.trim();
  if (!value) {
    return null;
  }

  // Remove non-numeric separators except decimal candidates
  value = value.replace(/[^0-9.,]/g, '');

  if (!value) {
    return null;
  }

  const commaCount = (value.match(/,/g) || []).length;
  const dotCount = (value.match(/\./g) || []).length;

  if (commaCount && dotCount) {
    if (value.lastIndexOf('.') > value.lastIndexOf(',')) {
      value = value.replace(/,/g, '');
    } else {
      value = value.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (commaCount && !dotCount) {
    value = value.replace(/,/g, '.');
  } else {
    value = value.replace(/,/g, '');
  }

  return value;
}

function parsePrice(raw: string | null | undefined, fallbackCurrency?: string | null): { amount: number | null; currency: string | null } {
  if (!raw) {
    return { amount: null, currency: fallbackCurrency ?? null };
  }

  let currency: string | null = null;

  // Symbol detection (handle two-character symbols first)
  const symbolMatches = Object.keys(CURRENCY_SYMBOL_MAP).sort((a, b) => b.length - a.length);
  for (const symbol of symbolMatches) {
    if (raw.includes(symbol)) {
      currency = CURRENCY_SYMBOL_MAP[symbol];
      break;
    }
  }

  if (!currency) {
    const isoMatch = raw.match(ISO_CURRENCY_PATTERN);
    if (isoMatch) {
      currency = isoMatch[1].toUpperCase().replace('RMB', 'CNY');
    }
  }

  if (!currency) {
    currency = fallbackCurrency ?? null;
  }

  const numberMatch = raw.match(/-?\d[\d.,\s]*/);
  if (!numberMatch) {
    return { amount: null, currency };
  }

  const sanitized = sanitizeNumberString(numberMatch[0]);
  if (!sanitized) {
    return { amount: null, currency };
  }

  const amount = Number.parseFloat(sanitized);
  if (Number.isNaN(amount)) {
    return { amount: null, currency };
  }

  return { amount, currency };
}

function extractStructuredData($: cheerio.Root, baseUrl: URL): Record<string, unknown> {
  const jsonLdProducts = extractJsonLdProducts($);
  const merged: Record<string, unknown> = {};

  for (const product of jsonLdProducts) {
    if (!merged.title) {
      merged.title = extractFirstString(product.name);
    }
    if (!merged.description) {
      merged.description = extractFirstString(product.description);
    }
    if (!merged.brand) {
      merged.brand = extractFirstString(product.brand);
    }
    if (!merged.image) {
      merged.image = extractFirstString(product.image);
    }

    if (!merged.rating) {
      const aggregate = (product.aggregateRating ?? {}) as Record<string, unknown>;
      const ratingValue = extractFirstString(aggregate.ratingValue);
      if (ratingValue) {
        const ratingNumber = Number.parseFloat(ratingValue);
        if (!Number.isNaN(ratingNumber)) {
          merged.rating = ratingNumber;
        }
      }

      const reviewCount = extractFirstString(aggregate.reviewCount ?? aggregate.ratingCount);
      if (reviewCount) {
        const countNumber = Number.parseInt(sanitizeNumberString(reviewCount) ?? '', 10);
        if (!Number.isNaN(countNumber)) {
          merged.reviewCount = countNumber;
        }
      }
    }

    const offers = Array.isArray(product.offers)
      ? product.offers
      : product.offers
        ? [product.offers]
        : [];

    for (const offer of offers) {
      if (typeof offer !== 'object' || !offer) {
        continue;
      }

      const price = extractFirstString((offer as Record<string, unknown>).price ?? (offer as Record<string, unknown>).priceSpecification);
      const currency = extractFirstString((offer as Record<string, unknown>).priceCurrency);
      if (price && !merged.price) {
        merged.price = price;
      }
      if (currency && !merged.currency) {
        merged.currency = currency.toUpperCase();
      }

      const availability = extractFirstString((offer as Record<string, unknown>).availability);
      if (availability && !merged.availability) {
        merged.availability = availability;
      }

      const url = extractFirstString((offer as Record<string, unknown>).url);
      if (url && !merged.offerUrl) {
        try {
          const absolute = new URL(url, baseUrl);
          merged.offerUrl = absolute.toString();
        } catch {
          merged.offerUrl = url;
        }
      }
    }
  }

  const ogImage = extractMeta($, 'og:image') ?? extractMeta($, 'twitter:image', 'name');
  if (ogImage && !merged.image) {
    try {
      merged.image = new URL(ogImage, baseUrl).toString();
    } catch {
      merged.image = ogImage;
    }
  }

  const metaDescription =
    extractMeta($, 'og:description') ??
    extractMeta($, 'twitter:description', 'name') ??
    extractMeta($, 'description', 'name');
  if (metaDescription && !merged.description) {
    merged.description = metaDescription;
  }

  const metaTitle =
    extractMeta($, 'og:title') ??
    extractMeta($, 'twitter:title', 'name') ??
    extractMeta($, 'title', 'name');
  if (metaTitle && !merged.title) {
    merged.title = metaTitle;
  }

  const metaPrice = extractMeta($, 'product:price:amount') ?? extractMeta($, 'og:price:amount');
  if (metaPrice && !merged.price) {
    merged.price = metaPrice;
  }

  const metaCurrency = extractMeta($, 'product:price:currency') ?? extractMeta($, 'og:price:currency');
  if (metaCurrency && !merged.currency) {
    merged.currency = metaCurrency.toUpperCase();
  }

  const metaBrand = extractMeta($, 'product:brand');
  if (metaBrand && !merged.brand) {
    merged.brand = metaBrand;
  }

  return merged;
}

async function fetchWithTimeout(targetUrl: URL, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, Math.max(1000, SCRAPE_TIMEOUT_MS));

  try {
    return await fetch(targetUrl.toString(), {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobots(content: string): string[] {
  const disallows: string[] = [];
  const lines = content.split(/\r?\n/);

  let applies = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const [directiveRaw, valueRaw] = line.split(':', 2);
    if (!directiveRaw || typeof valueRaw === 'undefined') {
      continue;
    }

    const directive = directiveRaw.trim().toLowerCase();
    const value = valueRaw.trim();

    if (directive === 'user-agent') {
      const lowered = value.toLowerCase();
      applies = lowered === '*' || lowered === 'babyshop-scraper';
    }

    if (!applies) {
      continue;
    }

    if (directive === 'disallow') {
      if (value === '') {
        continue;
      }
      disallows.push(value);
    }
  }

  return disallows;
}

function isPathDisallowed(pathname: string, disallows: string[]): boolean {
  return disallows.some((rule) => {
    if (!rule || rule === '/') {
      return true;
    }

    const normalizedRule = rule.endsWith('*') ? rule.slice(0, -1) : rule;
    return pathname.startsWith(normalizedRule);
  });
}

async function ensureRobotsAllowed(url: URL): Promise<void> {
  if (ROBOTS_CACHE_TTL_MS <= 0) {
    return;
  }

  const host = url.origin;
  const now = Date.now();
  const cached = robotsCache.get(host);

  if (cached && cached.expiresAt > now) {
    if (isPathDisallowed(url.pathname, cached.disallows)) {
      throw new Error(`Scraping blocked by robots.txt for ${url.origin}`);
    }
    return;
  }

  try {
    const robotsUrl = new URL('/robots.txt', url.origin);
    const response = await fetchWithTimeout(robotsUrl, BASE_HEADERS);
    if (!response.ok) {
      logDiagnostic('robots.fetch.failed', {
        url: robotsUrl.toString(),
        status: response.status,
      }, 'warn');
      robotsCache.set(host, { disallows: [], expiresAt: now + ROBOTS_CACHE_TTL_MS });
      return;
    }

    const content = await response.text();
    const disallows = parseRobots(content);

    robotsCache.set(host, {
      disallows,
      expiresAt: now + ROBOTS_CACHE_TTL_MS,
    });

    if (isPathDisallowed(url.pathname, disallows)) {
      throw new Error(`Scraping blocked by robots.txt for ${url.origin}`);
    }
  } catch (error) {
    logDiagnostic('robots.fetch.error', {
      host: url.origin,
      error: error instanceof Error ? error.message : String(error),
    }, 'warn');
    robotsCache.set(host, { disallows: [], expiresAt: now + ROBOTS_CACHE_TTL_MS });
  }
}

function getBestProductImage($: cheerio.Root, baseUrl?: string): string | undefined {
  const imageSelectors = [
    'img[data-testid="product-image"]',
    '.a-dynamic-image',
    '#landingImage',
    '.a-dynamic-image[data-old-hires]',
    '.product-image img',
    '.product-photo img',
    '.main-image img',
    '.hero-image img',
    '.product-gallery img',
    '.image-gallery img',
    '.product-main-image img',
    '.product-detail-image img',
    '.product-thumbnail img',
    '.product-view img',
    'img[class*="product"]',
    'img[class*="main"]',
    'img[data-src*="product"]',
    'img[alt*="product"]',
    'img[alt*="main"]',
  ];

  for (const selector of imageSelectors) {
    const img = $(selector).first();
    if (img.length) {
      const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy');
      if (src && !src.includes('placeholder') && !src.includes('loading')) {
        if (src.startsWith('//')) {
          return `https:${src}`;
        } else if (src.startsWith('/')) {
          if (baseUrl) {
            try {
              const url = new URL(baseUrl);
              return `${url.origin}${src}`;
            } catch {
              return src;
            }
          }
          return src;
        } else if (src.startsWith('http')) {
          return src;
        }
      }
    }
  }

  return undefined;
}

function checkMetaRobots($: cheerio.Root, url: URL) {
  const metaContent = $('meta[name="robots"], meta[name="googlebot"]').first().attr('content');
  if (!metaContent) {
    return;
  }

  const tokens = metaContent
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.some((token) => META_ROBOTS_BLOCKLIST.includes(token))) {
    throw new Error(`Scraping blocked by meta robots policy for ${url.hostname}`);
  }
}

function getCachedHtml(url: string): string | null {
  if (SCRAPE_CACHE_TTL_MS <= 0) {
    return null;
  }

  const cached = htmlCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    logDiagnostic('cache.hit', { url });
    return cached.html;
  }

  if (cached) {
    htmlCache.delete(url);
  }

  return null;
}

function setCachedHtml(url: string, html: string) {
  if (SCRAPE_CACHE_TTL_MS <= 0) {
    return;
  }

  htmlCache.set(url, {
    html,
    expiresAt: Date.now() + SCRAPE_CACHE_TTL_MS,
  });
}

export async function scrapeProductPage(url: string): Promise<string> {
  try {
    const parsedUrl = new URL(url);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP(S) URLs can be scraped.');
    }

    const urlVariants = await filterAllowedVariants(parsedUrl);
    const cacheKey = parsedUrl.toString();

    await ensureRobotsAllowed(parsedUrl);

    let html: string | null = getCachedHtml(cacheKey);
    let successfulUrl: URL | null = html ? parsedUrl : null;

    if (!html) {
      const requests = buildRequestVariants(urlVariants);
      if (requests.length === 0) {
        throw new Error('No valid scraping attempts available for this host.');
      }

      const attemptErrors: string[] = [];

      for (let attemptIndex = 0; attemptIndex < requests.length; attemptIndex++) {
        const { url: targetUrl, headers } = requests[attemptIndex];

        try {
          await ensureRobotsAllowed(targetUrl);
          const response = await fetchWithTimeout(targetUrl, headers);

          if (!response.ok) {
            const reason = `HTTP ${response.status}`;
            attemptErrors.push(
              `Attempt ${attemptIndex + 1} for ${targetUrl.hostname} failed: ${reason}`,
            );

            if (!RETRYABLE_STATUS_CODES.has(response.status)) {
              break;
            }

            continue;
          }

          const body = await response.text();

          if (!body.trim()) {
            attemptErrors.push(
              `Attempt ${attemptIndex + 1} for ${targetUrl.hostname} returned an empty response`,
            );
            continue;
          }

          html = body;
          successfulUrl = targetUrl;
          setCachedHtml(cacheKey, body);
          break;
        } catch (attemptError) {
          const message = attemptError instanceof Error ? attemptError.message : 'Unknown failure';
          attemptErrors.push(
            `Attempt ${attemptIndex + 1} for ${targetUrl.hostname} threw error: ${message}`,
          );
        }

        if (attemptIndex < requests.length - 1 && SCRAPE_RETRY_DELAY_MS > 0) {
          await delay(SCRAPE_RETRY_DELAY_MS * (attemptIndex + 1));
        }
      }

      if (!html || !successfulUrl) {
        const detail = attemptErrors.join(' | ') || 'No attempts executed';
        throw new Error(`All scraping attempts failed. ${detail}`);
      }
    }

    const $ = cheerio.load(html);
    checkMetaRobots($, successfulUrl ?? parsedUrl);

    const structured = extractStructuredData($, successfulUrl ?? parsedUrl);

    const domTitle = $('h1#title, .product-title, [data-testid="product-title"], h1, .product-name, .product-title-main').first().text().trim();
    const domDescription = $('[data-testid="product-description"], .product-description, #feature-bullets, .product-details, .description').first().text().trim();
    const domBrand = $('[data-testid="brand-name"], .brand, .a-brand, .product-brand, .manufacturer').first().text().trim();
    const domPrice = $('.a-price-whole, .a-offscreen, [data-testid="price"], .price, .product-price, .current-price').first().text().trim();
    const domRating = $('.a-icon-alt, [data-testid="rating"], .rating, .stars, .review-rating').first().text().trim();
    const domReviewCount = $('[data-testid="review-count"], .a-size-base, .review-count, .num-reviews').first().text().trim();
    const domAvailability = $('[data-testid="availability"], .a-size-medium, .availability, .stock-status').first().text().trim();
    const domImage = getBestProductImage($, (successfulUrl ?? parsedUrl).toString());

    const finalTitle = (structured.title as string | undefined) || domTitle || null;
    const finalDescription = (structured.description as string | undefined) || domDescription || null;
    const finalBrand = (structured.brand as string | undefined) || domBrand || null;
    const rawPrice = (structured.price as string | undefined) || domPrice || null;
    const currencyHint = (structured.currency as string | undefined) || null;
    const finalPrice = parsePrice(rawPrice, currencyHint);
    const finalRating =
      typeof structured.rating === 'number'
        ? structured.rating
        : (() => {
            const parsed = parsePrice(domRating ?? '')?.amount;
            return parsed && parsed >= 0 && parsed <= 5 ? parsed : null;
          })();
    const finalReviewCount =
      typeof structured.reviewCount === 'number'
        ? structured.reviewCount
        : (() => {
            const maybe = sanitizeNumberString(domReviewCount ?? '');
            if (!maybe) {
              return null;
            }
            const parsed = Number.parseInt(maybe, 10);
            return Number.isNaN(parsed) ? null : parsed;
          })();
    const finalAvailability =
      (structured.availability as string | undefined) || domAvailability || null;
    const finalImage = (structured.image as string | undefined) || domImage || null;

    const features = $('.a-unordered-list .a-list-item, .feature-bullets li, .product-features li, .features li')
      .map((i, el) => $(el).text().trim())
      .get()
      .filter((value) => value.length > 0);

    const cleanedData: Record<string, unknown> = {
      title: finalTitle,
      description: finalDescription,
      brand: finalBrand,
      priceText: rawPrice,
      price: rawPrice,
      priceNumber: finalPrice.amount,
      currency: finalPrice.currency,
      rating: finalRating,
      reviewCount: finalReviewCount,
      image: finalImage,
      availability: finalAvailability,
      features: features.length ? features : null,
      offerUrl: structured.offerUrl ?? null,
      sourceUrl: (successfulUrl ?? parsedUrl).toString(),
    };

    Object.keys(cleanedData).forEach((key) => {
      const value = cleanedData[key];
      if (value === undefined || value === null || value === '') {
        cleanedData[key] = null;
      } else if (Array.isArray(value) && value.length === 0) {
        cleanedData[key] = null;
      }
    });

    return JSON.stringify(cleanedData, null, 2);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timed out fetching product page after ${SCRAPE_TIMEOUT_MS}ms`);
    }

    logDiagnostic('scrape.error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'error');

    throw new Error(`Failed to scrape product page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const __scraperInternals = {
  buildUrlVariants,
  buildRequestVariants,
  matchesHostPattern,
};
