// Scrapes Kadolog search results with optional login, pagination, and deduplication.
// Adjust selectors via CLI flags if Kadolog changes its markup.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { load } from 'cheerio';

function loadEnvFile(relativePath) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) continue;
      const rawKey = line.slice(0, equalsIndex).trim().replace(/^export\s+/, '');
      if (!rawKey || Object.prototype.hasOwnProperty.call(process.env, rawKey)) continue;
      let value = line.slice(equalsIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      value = value.replace(/\\n/g, '\n');
      process.env[rawKey] = value;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`Unable to load ${relativePath}: ${(error && error.message) || error}`);
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

export const DEFAULT_OPTIONS = {
  baseUrl: 'https://www.kadolog.com/fr/gift-search/65/12211098',
  query: 'babubjorn',
  pages: 3,
  delayMs: 2_000,
  outputPath: path.resolve(process.cwd(), 'tmp/kadolog-sample.json'),
  credentials: {
    email: process.env.KADOLOG_EMAIL?.trim() || undefined,
    password: process.env.KADOLOG_PASSWORD?.trim() || undefined,
  },
  selectors: {
    item: '.views-row, .gift-item, .gift-card',
    title: 'h2 a, h3 a, .gift-title, .product-title',
    price: '.price, .gift-price, .product-price',
    brand: '.brand, .gift-brand',
    url: 'h2 a, h3 a, .gift-title a, .product-title a',
    image: 'img',
  },
  verbose: false,
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

class CookieJar {
  constructor() {
    this.jar = new Map();
  }

  toHeader() {
    if (!this.jar.size) return undefined;
    return Array.from(this.jar.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  updateFrom(response) {
    const setCookie = getSetCookieHeaders(response.headers);
    for (const raw of setCookie) {
      const parsed = parseSetCookie(raw);
      if (parsed) {
        this.jar.set(parsed.name, parsed.value);
      }
    }
  }
}

function getSetCookieHeaders(headers) {
  const maybeGetter = headers.getSetCookie?.bind(headers);
  if (typeof maybeGetter === 'function') {
    return maybeGetter() ?? [];
  }
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  return raw.split(/,(?=[^;]+=[^;]+)/).map((part) => part.trim());
}

function parseSetCookie(raw) {
  const [pair] = raw.split(';');
  const eqIndex = pair.indexOf('=');
  if (eqIndex === -1) return null;
  const name = pair.slice(0, eqIndex).trim();
  const value = pair.slice(eqIndex + 1).trim();
  if (!name) return null;
  return { name, value };
}

async function fetchWithCookies(url, init, jar, depth = 0) {
  if (depth > 10) {
    throw new Error('Too many redirects while fetching');
  }
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('user-agent')) headers.set('user-agent', USER_AGENT);
  if (!headers.has('accept')) headers.set('accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
  if (!headers.has('accept-language')) headers.set('accept-language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
  const cookieHeader = jar.toHeader();
  if (cookieHeader) headers.set('cookie', cookieHeader);

  const response = await fetch(url, { ...init, headers, redirect: 'manual' });
  jar.updateFrom(response);

  if (response.status >= 300 && response.status <= 399 && response.headers.has('location')) {
    const location = response.headers.get('location');
    if (!location) return response;
    const nextUrl = new URL(location, url).toString();
    return fetchWithCookies(nextUrl, { method: 'GET' }, jar, depth + 1);
  }

  return response;
}

export function parseScraperArgs(argv) {
  const options = {
    ...DEFAULT_OPTIONS,
    selectors: { ...DEFAULT_OPTIONS.selectors },
    credentials: { ...DEFAULT_OPTIONS.credentials },
    showHelp: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    switch (key) {
      case 'base':
        if (value) {
          options.baseUrl = value;
          i += 1;
        }
        break;
      case 'query':
        if (value) {
          options.query = value;
          i += 1;
        }
        break;
      case 'pages':
        if (value) {
          options.pages = Math.max(1, Number.parseInt(value, 10));
          i += 1;
        }
        break;
      case 'delay':
        if (value) {
          options.delayMs = Math.max(0, Number.parseInt(value, 10));
          i += 1;
        }
        break;
      case 'output':
        if (value) {
          options.outputPath = path.resolve(process.cwd(), value);
          i += 1;
        }
        break;
      case 'email':
        if (value) {
          options.credentials.email = value;
          i += 1;
        }
        break;
      case 'password':
        if (value) {
          options.credentials.password = value;
          i += 1;
        }
        break;
      case 'item-selector':
        if (value) {
          options.selectors.item = value;
          i += 1;
        }
        break;
      case 'title-selector':
        if (value) {
          options.selectors.title = value;
          i += 1;
        }
        break;
      case 'price-selector':
        if (value) {
          options.selectors.price = value;
          i += 1;
        }
        break;
      case 'brand-selector':
        if (value) {
          options.selectors.brand = value;
          i += 1;
        }
        break;
      case 'url-selector':
        if (value) {
          options.selectors.url = value;
          i += 1;
        }
        break;
      case 'image-selector':
        if (value) {
          options.selectors.image = value;
          i += 1;
        }
        break;
      case 'verbose':
        options.verbose = true;
        break;
      case 'help':
        options.showHelp = true;
        break;
      default:
        console.warn(`Unknown option --${key}`);
        break;
    }
  }

  return options;
}

function printHelp() {
  const lines = [
    'Usage: node scripts/kadolog-scraper.mjs [options]',
    '',
    'Options:',
    `  --base <url>             Base Kadolog search URL (default: ${DEFAULT_OPTIONS.baseUrl})`,
    `  --query <term>           Search term to apply (default: ${DEFAULT_OPTIONS.query})`,
    `  --pages <n>              How many pages to fetch (default: ${DEFAULT_OPTIONS.pages})`,
    `  --delay <ms>             Delay between page requests in ms (default: ${DEFAULT_OPTIONS.delayMs})`,
    '  --output <path>          Where to write JSON data (default: tmp/kadolog-sample.json)',
    '  --email <value>          Kadolog account email (optional)',
    '  --password <value>       Kadolog account password (optional)',
    '  --item-selector <css>    CSS selector for each result container',
    '  --title-selector <css>   CSS selector for the product title within container',
    '  --price-selector <css>   CSS selector for the price element within container',
    '  --brand-selector <css>   CSS selector for the brand text within container',
    '  --url-selector <css>     CSS selector for link node (href will be extracted)',
    '  --image-selector <css>   CSS selector for image node (src will be extracted)',
    '  --verbose                Print additional debugging logs',
    '  --help                   Show this help message',
    '  (or set KADOLOG_EMAIL/KADOLOG_PASSWORD env vars for one-click runs)',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

function buildSearchUrl(baseUrl, query, page) {
  const url = new URL(baseUrl);
  if (query) url.searchParams.set('search_api_fulltext', query);
  if (page > 0) url.searchParams.set('page', String(page));
  else url.searchParams.delete('page');
  return url.toString();
}

function extractLoginPayload(html, fallbackUrl) {
  const $ = load(html);
  const form = $('form.user-login-form');
  if (!form.length) return null;
  const action = form.attr('action') ? new URL(form.attr('action'), fallbackUrl).toString() : fallbackUrl;
  const formBuildId = form.find('input[name="form_build_id"]').attr('value');
  const formId = form.find('input[name="form_id"]').attr('value');
  const op = form.find('button[name="op"]').attr('value') ?? 'Se connecter';
  if (!formBuildId || !formId) return null;
  return { action, formBuildId, formId, op };
}

function sanitizeText(text) {
  if (!text) return undefined;
  const value = text.replace(/\s+/g, ' ').trim();
  return value || undefined;
}

function parsePrice(text) {
  const cleaned = text ? text.replace(/\s+/g, ' ') : undefined;
  if (!cleaned) return {};
  const match = cleaned.match(/([€$£]|EUR|USD|GBP)\s*([0-9.,]+)/i);
  if (!match) return { raw: cleaned };
  const currency = match[1].toUpperCase().replace('EUR', '€').replace('USD', '$').replace('GBP', '£');
  const amountText = match[2];
  const amount = normalizePrice(amountText);
  return { amount: amount ?? undefined, currency, raw: cleaned };
}

function normalizePrice(raw) {
  let candidate = raw.replace(/[^0-9,.-]/g, '');
  if (!candidate) return null;
  const decimalSeparator = candidate.includes(',') && candidate.includes('.')
    ? (candidate.lastIndexOf('.') > candidate.lastIndexOf(',') ? '.' : ',')
    : (candidate.includes(',') ? ',' : '.');
  if (decimalSeparator === ',') {
    candidate = candidate.replace(/\./g, '');
    candidate = candidate.replace(/,/g, '.');
  } else {
    candidate = candidate.replace(/,(?=\d{3}(?:\D|$))/g, '');
  }
  const parsed = Number.parseFloat(candidate);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveUrl(baseUrl, link) {
  if (!link) return undefined;
  try {
    return new URL(link, baseUrl).toString();
  } catch (error) {
    return undefined;
  }
}

function extractProducts(html, selectors, baseUrl, page, verbose) {
  const $ = load(html);
  const nodes = $(selectors.item);
  const products = [];
  const skipped = [];

  nodes.each((_, element) => {
    const container = $(element);
    const titleNode = selectors.title ? container.find(selectors.title).first() : container.find('h2, h3, a').first();
    const title = sanitizeText(titleNode.text() || container.text());
    const priceNode = selectors.price ? container.find(selectors.price).first() : container.find(':contains("€"), :contains("EUR")').first();
    const priceInfo = parsePrice(sanitizeText(priceNode.text()));
    const urlNode = selectors.url ? container.find(selectors.url).first() : titleNode;
    const imageNode = selectors.image ? container.find(selectors.image).first() : container.find('img').first();
    const brandNode = selectors.brand ? container.find(selectors.brand).first() : container.find('[class*="brand"]').first();

    if (!title) {
      skipped.push(container.html() ?? '[empty container]');
      return;
    }

    const product = {
      title,
      url: resolveUrl(baseUrl, urlNode.attr('href')),
      price: priceInfo.amount,
      priceText: priceInfo.raw,
      currency: priceInfo.currency,
      brand: sanitizeText(brandNode.text()),
      imageUrl: resolveUrl(baseUrl, imageNode.attr('src') ?? imageNode.attr('data-src')),
      page,
    };

    products.push(product);
  });

  if (!nodes.length && verbose) {
    console.warn(`No elements matched selector '${selectors.item}'.`);
  }

  return { products, skipped };
}

export function makeProductKey(product) {
  return product.url ?? `${product.title}|${product.priceText ?? ''}`;
}

async function sleep(ms) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrape(options) {
  const jar = new CookieJar();
  const seen = new Map();
  const skipped = [];
  const startUrl = buildSearchUrl(options.baseUrl, options.query, 0);

  const initialResponse = await fetchWithCookies(startUrl, { method: 'GET' }, jar);
  let initialHtml = await initialResponse.text();

  let hasLoginForm = initialHtml.includes('user-login-form');

  if (options.credentials.email && options.credentials.password && hasLoginForm) {
    const payload = extractLoginPayload(initialHtml, startUrl);
    if (!payload) {
      throw new Error('Unable to locate login form payload. Check the page markup manually.');
    }
    const body = new URLSearchParams({
      name: options.credentials.email,
      pass: options.credentials.password,
      form_build_id: payload.formBuildId,
      form_id: payload.formId,
      op: payload.op,
    });

    const loginResponse = await fetchWithCookies(payload.action, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }, jar);

    if (loginResponse.status >= 400) {
      throw new Error(`Login failed with status ${loginResponse.status}`);
    }

    const loginHtml = await loginResponse.text();
    hasLoginForm = loginHtml.includes('user-login-form');
    if (hasLoginForm) {
      throw new Error('Login appears to have failed (login form still visible). Check credentials.');
    }
    initialHtml = loginHtml;
  } else if (hasLoginForm && (!options.credentials.email || !options.credentials.password)) {
    console.warn('⚠️  Page shows a login form. Provide --email and --password if the search results require authentication.');
  }

  for (let pageIndex = 0; pageIndex < options.pages; pageIndex += 1) {
    let html;
    if (pageIndex === 0 && !hasLoginForm) {
      html = initialHtml;
    } else {
      if (pageIndex > 0) await sleep(options.delayMs);
      const url = buildSearchUrl(options.baseUrl, options.query, pageIndex);
      const response = await fetchWithCookies(url, { method: 'GET' }, jar);
      if (response.status >= 400) {
        console.warn(`Failed to fetch page ${pageIndex + 1} (status ${response.status}).`);
        break;
      }
      html = await response.text();
      if (html.includes('user-login-form') && options.credentials.email && options.credentials.password) {
        throw new Error('Session appears to have expired (login form returned).');
      }
    }

    const { products, skipped: skippedOnPage } = extractProducts(html, options.selectors, options.baseUrl, pageIndex + 1, options.verbose);
    skipped.push(...skippedOnPage);

    if (!products.length && options.verbose) {
      console.warn(`No products detected on page ${pageIndex + 1}. Adjust selectors if needed.`);
    }

    for (const product of products) {
      const key = makeProductKey(product);
      if (!seen.has(key)) {
        seen.set(key, product);
      }
    }
  }

  const records = Array.from(seen.values());
  if (options.outputPath) {
    await mkdir(path.dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, JSON.stringify({
      scrapedAt: new Date().toISOString(),
      baseUrl: options.baseUrl,
      query: options.query,
      records,
    }, null, 2), 'utf-8');

    console.log(`Saved ${records.length} unique records to ${options.outputPath}`);
    if (skipped.length && options.verbose) {
      console.log(`Skipped ${skipped.length} containers without titles.`);
    }
  } else if (options.verbose) {
    console.log(`Captured ${records.length} records for query '${options.query}'.`);
    if (skipped.length) {
      console.log(`Skipped ${skipped.length} containers without titles.`);
    }
  }

  return { records, skipped };
}

if (import.meta.main) {
  (async () => {
    const options = parseScraperArgs(process.argv.slice(2));
    if (options.showHelp) {
      printHelp();
      return;
    }
    try {
      await scrape(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Scrape failed: ${message}`);
      process.exit(1);
    }
  })();
}
