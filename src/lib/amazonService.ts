import * as cheerio from 'cheerio';
import { getOpenAIClient, DEFAULT_AGENT_MODEL } from './openaiAgent';
import { scrapeProductPage } from './webScraper';
import type { ProductCreatePayload } from './products/types';

export interface AmazonSearchResult {
  asin: string;
  title: string;
  url: string;
  imageUrl?: string;
  priceText?: string;
  ratingText?: string;
  sponsored?: boolean;
}

export interface AmazonProductData {
  asin?: string;
  title: string;
  brand?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  features?: string[];
  description?: string;
  category?: string;
  subcategory?: string;
  ageRange?: string;
  safetyNotes?: string;
  ecoFriendly?: boolean;
  premium?: boolean;
  affiliateUrl?: string;
  milestoneIds?: string[];
  tags?: string[];
}

type AmazonExtractedProduct = ProductCreatePayload & {
  asin?: string;
  title?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
};

export class AmazonService {
  /**
   * Extract ASIN from Amazon URL
   */
  static extractASIN(url: string): string | null {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/product\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /asin=([A-Z0-9]{10})/,
      /\/[^\/]*\/([A-Z0-9]{10})(?:\/|$|\?)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Perform an Amazon search and return candidate product listings
   */
  static async searchAmazonProducts(
    query: string,
    options: { limit?: number } = {}
  ): Promise<AmazonSearchResult[]> {
    const limit = Math.max(1, Math.min(options.limit ?? 6, 20));
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=baby-products&language=en_US`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.7',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`Amazon search failed with status ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const items: AmazonSearchResult[] = [];

      $('.s-main-slot .s-result-item[data-asin]').each((_, element) => {
        if (items.length >= limit) {
          return false;
        }

        const asin = $(element).attr('data-asin');
        if (!asin) {
          return;
        }

        const title = $(element).find('h2 a span').first().text().trim();
        if (!title) {
          return;
        }

        const href = $(element).find('h2 a').attr('href') ?? '';
        const url = href.startsWith('http') ? href : `https://www.amazon.com${href}`;

        const priceWhole = $(element).find('.a-price-whole').first().text().replace(/[^0-9]/g, '');
        const priceFraction = $(element).find('.a-price-fraction').first().text().replace(/[^0-9]/g, '');
        const priceText = priceWhole
          ? `$${priceWhole}${priceFraction ? `.${priceFraction}` : ''}`
          : undefined;

        const ratingText = $(element).find('.a-icon-alt').first().text().trim() || undefined;
        const imageUrl = $(element).find('img.s-image').attr('src');
        const sponsored = $(element).find('.s-sponsored-label-text, .s-label-popover-default').length > 0;

        items.push({ asin, title, url, imageUrl, priceText, ratingText, sponsored });
      });

      return items;
    } catch (error) {
      console.error('Amazon search error:', error);
      throw new Error(
        `Failed to search Amazon: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Enhanced Amazon product extraction with specialized prompts
   */
  static async extractAmazonProduct(url: string): Promise<AmazonExtractedProduct> {
    try {
      console.log(`🛒 Extracting Amazon product from: ${url}`);
      
      // Extract ASIN for better identification
      const asin = this.extractASIN(url);
      console.log(`📦 ASIN: ${asin || 'Not found'}`);

      // Scrape the page
      const scrapedData = await scrapeProductPage(url);
      console.log(`📄 Scraped data length: ${scrapedData.length} characters`);

      // Use specialized Amazon extraction prompt
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: DEFAULT_AGENT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting product information from Amazon product pages. Focus specifically on baby products and extract the most relevant information.

IMPORTANT GUIDELINES:
- Extract ASIN if available in the URL or page content
- Prioritize high-quality product images (main product image, not thumbnails)
- For baby products, determine appropriate age ranges and safety considerations
- Identify eco-friendly indicators (organic, natural, sustainable materials)
- Extract key features and benefits
- Determine if it's a premium product based on price and features
- Use the original Amazon URL as affiliate URL
- Convert prices to cents (multiply by 100)
- Categorize baby products appropriately

Return JSON in this exact format:
{
  "asin": "B123456789",
  "title": "Product Name",
  "brand": "Brand Name", 
  "price": 2500,
  "currency": "USD",
  "imageUrl": "https://...",
  "rating": 4.5,
  "reviewCount": 150,
  "availability": "In Stock",
  "features": ["Feature 1", "Feature 2"],
  "description": "Product description",
  "category": "feeding",
  "subcategory": "bottles",
  "ageRange": "0-6 months",
  "safetyNotes": "Safety information",
  "ecoFriendly": true,
  "premium": false,
  "affiliateUrl": "https://amazon.com/..."
}`
          },
          {
            role: "user",
            content: `Extract product information from this Amazon product page data: ${scrapedData}

URL: ${url}
${asin ? `ASIN: ${asin}` : ''}

Focus on extracting accurate product details, especially for baby products. Pay attention to age recommendations, safety features, and material composition.`
          }
        ],
        response_format: {
          type: "json_object"
        }
      });

      const output = response.choices[0]?.message?.content;
      if (!output) {
        throw new Error("No response from AI agent");
      }

      const parsedData: AmazonProductData = JSON.parse(output);
      console.log(`✅ Successfully extracted Amazon product data`);

      const categorized = this.categorizeBabyProduct(parsedData.title, parsedData.description);
      const { ageRangeMonthsMin, ageRangeMonthsMax } = this.parseAgeRange(parsedData.ageRange);

      const payload: ProductCreatePayload = {
        name: parsedData.title,
        description: parsedData.description ?? null,
        category: categorized.category,
        subcategory: categorized.subcategory ?? null,
        brand: parsedData.brand ?? null,
        imageUrl: parsedData.imageUrl ?? null,
        priceCents: typeof parsedData.price === 'number' ? parsedData.price : null,
        currency: parsedData.currency ?? 'USD',
        rating: typeof parsedData.rating === 'number' ? parsedData.rating : null,
        reviewCount: typeof parsedData.reviewCount === 'number' ? parsedData.reviewCount : 0,
        affiliateUrl: parsedData.affiliateUrl ?? url,
        inStock: parsedData.availability ? parsedData.availability.toLowerCase().includes('stock') : true,
        ecoFriendly: Boolean(parsedData.ecoFriendly),
        premium: Boolean(parsedData.premium),
        safetyNotes: parsedData.safetyNotes ?? null,
        milestoneIds: Array.isArray(parsedData.milestoneIds) ? parsedData.milestoneIds : [],
        tags: Array.isArray(parsedData.features) ? parsedData.features : Array.isArray(parsedData.tags) ? parsedData.tags : [],
        aiCategoryIds: [],
        sourceUrl: url,
        ageRangeMonthsMin,
        ageRangeMonthsMax,
        reviewSources: [],
        externalReviewUrls: [],
      };

      return {
        ...payload,
        asin: parsedData.asin ?? asin ?? undefined,
        title: parsedData.title,
        price: typeof parsedData.price === 'number' ? parsedData.price : undefined,
        rating: typeof parsedData.rating === 'number' ? parsedData.rating : undefined,
        reviewCount: typeof parsedData.reviewCount === 'number' ? parsedData.reviewCount : 0,
      };

    } catch (error) {
      console.error('Amazon extraction error:', error);
      throw new Error(`Failed to extract Amazon product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static parseAgeRange(ageRange?: string): { ageRangeMonthsMin: number | null; ageRangeMonthsMax: number | null } {
    if (!ageRange) {
      return { ageRangeMonthsMin: null, ageRangeMonthsMax: null };
    }

    const pattern = /(\d+)\s*(?:-|to)?\s*(\d+)?\s*(week|month|year)s?/i;
    const match = ageRange.match(pattern);
    if (!match) {
      return { ageRangeMonthsMin: null, ageRangeMonthsMax: null };
    }

    const [, startStr, endStr, unit] = match;
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : start;
    const multiplier = unit.toLowerCase().startsWith('year') ? 12 : unit.toLowerCase().startsWith('week') ? 0.25 : 1;

    const min = Number.isNaN(start) ? null : Math.round(start * multiplier);
    const max = Number.isNaN(end) ? min : Math.round(end * multiplier);

    return { ageRangeMonthsMin: min, ageRangeMonthsMax: max };
  }

  /**
   * Get Amazon product by ASIN using web scraping
   */
  static async getProductByASIN(asin: string): Promise<AmazonExtractedProduct> {
    const url = `https://www.amazon.com/dp/${asin}`;
    return this.extractAmazonProduct(url);
  }

  /**
   * Enhanced Amazon-specific web scraping
   */
  static async scrapeAmazonPage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Enhanced Amazon-specific data extraction
      const productData = {
        url,
        html: html.substring(0, 50000), // Limit size for AI processing
        timestamp: new Date().toISOString()
      };
      
      return JSON.stringify(productData, null, 2);
      
    } catch (error) {
      console.error('Amazon scraping error:', error);
      throw new Error(`Failed to scrape Amazon page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Amazon URL
   */
  static isValidAmazonUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('amazon.') && 
             (urlObj.pathname.includes('/dp/') || 
              urlObj.pathname.includes('/product/') ||
              urlObj.pathname.includes('/gp/product/'));
    } catch {
      return false;
    }
  }

  /**
   * Get Amazon product categories for baby products
   */
  static getBabyProductCategories(): Record<string, string[]> {
    return {
      'feeding': ['bottles', 'formula', 'baby food', 'high chairs', 'bibs'],
      'sleeping': ['cribs', 'mattresses', 'sleep sacks', 'swaddles', 'monitors'],
      'clothing': ['onesies', 'sleepers', 'socks', 'hats', 'mittens'],
      'safety': ['car seats', 'gates', 'outlet covers', 'monitors', 'thermometers'],
      'travel': ['strollers', 'carriers', 'diaper bags', 'travel cribs'],
      'bathing': ['bathtubs', 'towels', 'washcloths', 'soap', 'shampoo'],
      'play': ['toys', 'books', 'activity mats', 'bouncers', 'swings'],
      'monitoring': ['baby monitors', 'thermometers', 'scales', 'trackers']
    };
  }

  /**
   * Categorize Amazon product based on title and description
   */
  static categorizeBabyProduct(title: string, description?: string): { category: string; subcategory?: string } {
    const text = `${title} ${description || ''}`.toLowerCase();
    const categories = this.getBabyProductCategories();

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return { category, subcategory: keyword };
        }
      }
    }

    // Default categorization based on common patterns
    if (text.includes('bottle') || text.includes('feeding')) return { category: 'feeding' };
    if (text.includes('sleep') || text.includes('crib')) return { category: 'sleeping' };
    if (text.includes('clothes') || text.includes('onesie')) return { category: 'clothing' };
    if (text.includes('car seat') || text.includes('safety')) return { category: 'safety' };
    if (text.includes('stroller') || text.includes('carrier')) return { category: 'travel' };
    if (text.includes('bath') || text.includes('towel')) return { category: 'bathing' };
    if (text.includes('toy') || text.includes('play')) return { category: 'play' };
    if (text.includes('monitor') || text.includes('tracker')) return { category: 'monitoring' };

    return { category: 'accessories' };
  }
}
