import * as cheerio from 'cheerio';

function getBestProductImage($: cheerio.Root, baseUrl?: string): string | undefined {
  // Try multiple selectors in order of preference for product images
  const imageSelectors = [
    // Amazon specific
    'img[data-testid="product-image"]',
    '.a-dynamic-image',
    '#landingImage',
    '.a-dynamic-image[data-old-hires]',
    
    // Generic product image selectors
    '.product-image img',
    '.product-photo img',
    '.main-image img',
    '.hero-image img',
    '.product-gallery img',
    '.image-gallery img',
    
    // Common e-commerce patterns
    '.product-main-image img',
    '.product-detail-image img',
    '.product-thumbnail img',
    '.product-view img',
    
    // Fallback to any img with product-related classes or data attributes
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
        // Convert relative URLs to absolute
        if (src.startsWith('//')) {
          return `https:${src}`;
        } else if (src.startsWith('/')) {
          if (baseUrl) {
            try {
              const url = new URL(baseUrl);
              return `${url.protocol}//${url.hostname}${src}`;
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

export async function scrapeProductPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract relevant product information with improved selectors
    const productData = {
      title: $('h1#title, .product-title, [data-testid="product-title"], h1, .product-name, .product-title-main').first().text().trim(),
      price: $('.a-price-whole, .a-offscreen, [data-testid="price"], .price, .product-price, .current-price').first().text().trim(),
      brand: $('[data-testid="brand-name"], .brand, .a-brand, .product-brand, .manufacturer').first().text().trim(),
      description: $('[data-testid="product-description"], .product-description, #feature-bullets, .product-details, .description').first().text().trim(),
      rating: $('.a-icon-alt, [data-testid="rating"], .rating, .stars, .review-rating').first().text().trim(),
      reviewCount: $('[data-testid="review-count"], .a-size-base, .review-count, .num-reviews').first().text().trim(),
      image: getBestProductImage($, url),
      features: $('.a-unordered-list .a-list-item, .feature-bullets li, .product-features li, .features li').map((i, el) => $(el).text().trim()).get(),
      availability: $('[data-testid="availability"], .a-size-medium, .availability, .stock-status').first().text().trim(),
    };
    
    // Clean up the data
    const cleanedData = Object.entries(productData).reduce((acc, [key, value]) => {
      if (Array.isArray(value)) {
        acc[key] = value.length > 0 ? value.join(', ') : null;
      } else {
        acc[key] = value && value.length > 0 ? value : null;
      }
      return acc;
    }, {} as Record<string, string | null>);
    
    return JSON.stringify(cleanedData, null, 2);
    
  } catch (error) {
    console.error('Web scraping error:', error);
    throw new Error(`Failed to scrape product page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
