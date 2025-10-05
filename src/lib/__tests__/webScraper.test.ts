import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/webScraperConfig', () => ({
  getScrapeHostPatterns: vi.fn(async () => ['example.com', 'www.example.com', '*.example.com']),
}));

describe('webScraper', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('retries scraping attempts before succeeding', async () => {
    const sampleHtml = `
      <html>
        <body>
          <script type="application/ld+json">
            ${JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'Test Product',
              description: 'Great for testing via JSON-LD.',
              brand: {
                '@type': 'Brand',
                name: 'BrandCo',
              },
              image: 'https://cdn.example.com/product.jpg',
              offers: {
                '@type': 'Offer',
                price: '199.99',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.5',
                reviewCount: '120',
              },
            })}
          </script>
          <h1 class="product-title">Test Product</h1>
          <div class="product-price">$199</div>
          <span class="brand">BrandCo</span>
          <div class="product-description">Great for testing.</div>
          <img class="product-image" src="/images/product.jpg" />
        </body>
      </html>
    `;

    const productResponses = [
      new Response('Forbidden', { status: 403 }),
      new Response(sampleHtml, { status: 200, headers: { 'Content-Type': 'text/html' } }),
    ];

    const fetchMock = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.endsWith('/robots.txt')) {
        return new Response('User-agent: *\nDisallow:\n', { status: 200 });
      }

      return productResponses.shift() ?? productResponses[0]!;
    });

    vi.stubGlobal('fetch', fetchMock);

    const { scrapeProductPage } = await import('@/lib/webScraper');

    const payload = await scrapeProductPage('https://www.example.com/product');
    const parsed = JSON.parse(payload);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(parsed.title).toBe('Test Product');
    expect(parsed.description).toContain('Great for testing');
    expect(parsed.priceNumber).toBeCloseTo(199.99);
    expect(parsed.currency).toBe('USD');
    expect(parsed.image).toBe('https://cdn.example.com/product.jpg');
  });

  test('falls back to meta tags when JSON-LD is absent', async () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Meta Product" />
          <meta property="og:description" content="Meta description content." />
          <meta property="product:price:amount" content="79,95" />
          <meta property="product:price:currency" content="EUR" />
          <meta property="og:image" content="https://cdn.example.com/meta-product.jpg" />
        </head>
        <body>
          <h1>Fallback Heading</h1>
          <div class="product-price">EUR 79,95</div>
        </body>
      </html>
    `;

    const fetchMock = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/robots.txt')) {
        return new Response('User-agent: *\nDisallow:\n', { status: 200 });
      }
      return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
    });

    vi.stubGlobal('fetch', fetchMock);
    const { scrapeProductPage } = await import('@/lib/webScraper');

    const payload = await scrapeProductPage('https://shop.example.com/widget');
    const parsed = JSON.parse(payload);

    expect(parsed.title).toBe('Meta Product');
    expect(parsed.description).toBe('Meta description content.');
    expect(parsed.priceNumber).toBeCloseTo(79.95);
    expect(parsed.currency).toBe('EUR');
    expect(parsed.image).toBe('https://cdn.example.com/meta-product.jpg');
  });

  test('buildUrlVariants adds www version when missing', async () => {
    const { __scraperInternals } = await import('@/lib/webScraper');
    const baseUrl = new URL('https://example.com/path');
    const variants = __scraperInternals.buildUrlVariants(baseUrl);

    const hostnames = variants.map((variant: URL) => variant.hostname);

    expect(hostnames).toContain('example.com');
    expect(hostnames).toContain('www.example.com');
  });
});
