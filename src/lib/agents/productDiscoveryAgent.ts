import { AmazonService, type AmazonSearchResult } from '@/lib/amazonService';
import { DEFAULT_AGENT_MODEL, getOpenAIClient } from '@/lib/openaiAgent';
import type { ProductCreatePayload } from '@/lib/products/types';

export interface DiscoveryPreferences {
  budgetTier?: 'budget' | 'standard' | 'premium' | 'luxury';
  ecoPriority?: boolean;
  style?: string;
  milestoneId?: string;
  mustInclude?: string[];
  avoidKeywords?: string[];
}

export interface ProductDiscoveryRequest {
  query: string;
  limit?: number;
  preferences?: DiscoveryPreferences;
}

export interface ProductDiscoveryCandidate {
  search: AmazonSearchResult;
  product: ProductCreatePayload & {
    asin?: string | null;
    title?: string;
    price?: number | null;
    rating?: number | null;
    reviewCount?: number;
  };
  summary?: string;
  score?: number;
  rationale?: string;
}

export interface ProductRecommendationSummary {
  asin?: string | null;
  title: string;
  score: number;
  summary: string;
  reasoning?: string;
  confidence?: string;
  idealFor?: string[];
  cautions?: string[];
  affiliateUrl?: string | null;
  imageUrl?: string | null;
}

export interface ProductDiscoveryResponse {
  query: string;
  model: string;
  generatedAt: string;
  candidates: ProductDiscoveryCandidate[];
  recommendations: ProductRecommendationSummary[];
  warnings: string[];
}

function buildDisplayPrice(candidate: ProductDiscoveryCandidate): string | undefined {
  if (typeof candidate.product.priceCents === 'number') {
    return `$${(candidate.product.priceCents / 100).toFixed(2)}`;
  }
  if (candidate.search.priceText) {
    return candidate.search.priceText;
  }
  if (typeof candidate.product.price === 'number') {
    return `$${(candidate.product.price / 100).toFixed(2)}`;
  }
  return undefined;
}

export class ProductDiscoveryAgent {
  static async discover(
    request: ProductDiscoveryRequest
  ): Promise<ProductDiscoveryResponse> {
    const { query, limit = 4, preferences } = request;
    const warnings: string[] = [];

    if (!query || query.trim().length === 0) {
      throw new Error('Query is required for product discovery');
    }

    const searchResults = await AmazonService.searchAmazonProducts(query, {
      limit: Math.max(limit, 3),
    });

    if (!searchResults.length) {
      warnings.push('No Amazon search results were returned for the query.');
      return {
        query,
        model: DEFAULT_AGENT_MODEL,
        generatedAt: new Date().toISOString(),
        candidates: [],
        recommendations: [],
        warnings,
      };
    }

    const candidates: ProductDiscoveryCandidate[] = [];

    for (const result of searchResults) {
      try {
        const product = await AmazonService.extractAmazonProduct(result.url);

        if (preferences?.milestoneId && product.milestoneIds?.length === 0) {
          product.milestoneIds = [preferences.milestoneId];
        }

        candidates.push({ search: result, product });
      } catch (error) {
        const asin = result.asin || AmazonService.extractASIN(result.url) || 'unknown';
        warnings.push(
          `Failed to extract Amazon product ${asin}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    if (!candidates.length) {
      warnings.push('No product details could be extracted from the search results.');
      return {
        query,
        model: DEFAULT_AGENT_MODEL,
        generatedAt: new Date().toISOString(),
        candidates: [],
        recommendations: [],
        warnings,
      };
    }

    const client = getOpenAIClient();
    const modelInput = {
      query,
      preferences,
      timestamp: new Date().toISOString(),
      candidates: candidates.map((candidate) => ({
        asin: candidate.product.asin ?? candidate.search.asin,
        title: candidate.product.name ?? candidate.search.title,
        description: candidate.product.description,
        category: candidate.product.category,
        subcategory: candidate.product.subcategory,
        rating: candidate.product.rating ?? null,
        reviewCount: candidate.product.reviewCount ?? null,
        ecoFriendly: candidate.product.ecoFriendly ?? false,
        premium: candidate.product.premium ?? false,
        milestoneIds: candidate.product.milestoneIds ?? [],
        tags: candidate.product.tags ?? [],
        safetyNotes: candidate.product.safetyNotes ?? null,
        displayPrice: buildDisplayPrice(candidate),
        affiliateUrl: candidate.product.affiliateUrl ?? candidate.product.sourceUrl ?? candidate.search.url,
        imageUrl: candidate.product.imageUrl ?? candidate.search.imageUrl,
      })),
    };

    let modelRecommendations: ProductRecommendationSummary[] = [];

    try {
      const completion = await client.chat.completions.create({
        model: DEFAULT_AGENT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              "You are BabyBloom's product discovery agent. Review the provided product candidates and select the best options for caregivers based on their preferences. Favor safety, age appropriateness, eco credentials, and credible review signals when forming recommendations.",
          },
          {
            role: 'user',
            content: `Return structured JSON for these candidates: ${JSON.stringify(modelInput)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'ProductRecommendations',
            schema: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      asin: { type: ['string', 'null'] },
                      title: { type: 'string' },
                      score: { type: 'number' },
                      summary: { type: 'string' },
                      reasoning: { type: 'string' },
                      confidence: { type: 'string' },
                      idealFor: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      cautions: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      affiliateUrl: { type: ['string', 'null'] },
                      imageUrl: { type: ['string', 'null'] },
                    },
                    required: ['title', 'score', 'summary'],
                  },
                },
                notes: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['recommendations'],
            },
          },
        },
      });

      const output = completion.choices[0]?.message?.content;
      if (output) {
        const parsed = JSON.parse(output) as {
          recommendations?: ProductRecommendationSummary[];
          notes?: string[];
        };

        if (parsed.recommendations?.length) {
          modelRecommendations = parsed.recommendations.map((item) => {
            const match = candidates.find((candidate) => {
              const asin = candidate.product.asin ?? candidate.search.asin;
              if (asin && item.asin) {
                return asin === item.asin;
              }
              return (
                candidate.product.name?.toLowerCase() === item.title.toLowerCase() ||
                candidate.search.title.toLowerCase() === item.title.toLowerCase()
              );
            });

            if (match) {
              match.summary = item.summary;
              match.score = item.score;
              match.rationale = item.reasoning ?? item.summary;
            }

            return {
              asin: item.asin ?? match?.product.asin ?? null,
              title: item.title,
              score: item.score,
              summary: item.summary,
              reasoning: item.reasoning,
              confidence: item.confidence,
              idealFor: item.idealFor,
              cautions: item.cautions,
              affiliateUrl:
                item.affiliateUrl ??
                match?.product.affiliateUrl ??
                match?.product.sourceUrl ??
                match?.search.url ??
                null,
              imageUrl: item.imageUrl ?? match?.product.imageUrl ?? match?.search.imageUrl ?? null,
            };
          });

          if (parsed.notes?.length) {
            warnings.push(...parsed.notes);
          }
        }
      }
    } catch (error) {
      warnings.push(
        `OpenAI recommendation step failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    if (!modelRecommendations.length) {
      // Fall back to simple rating-based ordering
      const fallback = [...candidates].sort((a, b) => {
        const ratingA = a.product.rating ?? 0;
        const ratingB = b.product.rating ?? 0;
        if (ratingA === ratingB) {
          const reviewsA = a.product.reviewCount ?? 0;
          const reviewsB = b.product.reviewCount ?? 0;
          return reviewsB - reviewsA;
        }
        return ratingB - ratingA;
      });

      modelRecommendations = fallback.slice(0, limit).map((candidate) => ({
        asin: candidate.product.asin ?? candidate.search.asin ?? null,
        title: candidate.product.name ?? candidate.search.title,
        score: candidate.product.rating ?? 0,
        summary:
          candidate.product.description ??
          'Selected based on rating and review count due to unavailable AI summary.',
        affiliateUrl:
          candidate.product.affiliateUrl ??
          candidate.product.sourceUrl ??
          candidate.search.url ??
          null,
        imageUrl: candidate.product.imageUrl ?? candidate.search.imageUrl ?? null,
      }));
    }

    return {
      query,
      model: DEFAULT_AGENT_MODEL,
      generatedAt: new Date().toISOString(),
      candidates,
      recommendations: modelRecommendations,
      warnings,
    };
  }
}

