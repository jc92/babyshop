# BabyBloom - Smart Baby Essentials Planner

BabyBloom is an intelligent baby essentials subscription planner that provides personalized product recommendations based on your baby's developmental milestones, preferences, and budget. The application uses AI-powered recommendations and a comprehensive product catalog to help new parents make informed decisions about baby products.

## 🚀 Features

- **Personalized Recommendations**: AI-powered product suggestions based on baby's age, preferences, and milestones
- **Milestone Timeline**: Interactive timeline from prenatal preparation through 36 months
- **Smart Filtering**: Category toggles and preference-aware scoring for relevant product discovery
- **User Profiles**: Comprehensive intake forms for due date, budget tier, gender, style, and eco priorities
- **Admin Dashboard**: Database management and user analytics
- **Real-time Updates**: Dynamic product recommendations that adapt to your baby's growth
- **Quick Home Shortcut**: Tap the navigation badge (BB) to jump back to the hero landing page from anywhere
- **Guided Overview**: Follow the "See how it works" walkthrough for a quick tour of the milestone workflow

## 🏗️ Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Next.js 15)"]
        MainApp["Main App\n(page.tsx)"]
        CalendarView["Calendar View"]
        TimelineComponent["Timeline Component"]
        AdminPanel["Admin Panel"]
        AdminPanelV2["Admin Panel V2"]
        ProfileForms["Profile Forms"]
    end

    subgraph APILayer["API Layer (Next.js API Routes)"]
        ProductsAPI["Products API"]
        ProfileAPI["Profile API"]
        UsersAPI["Users API"]
        DatabaseMigration["Database Migration"]
        AIAgent["AI Agent"]
        AuthAPI["Auth (Clerk)"]
    end

    subgraph Services["Services Layer"]
        ProductDomain["ProductDomain Service\n• Query normalization\n• Repository access\n• Caching & validation"]
        AmazonExtraction["Amazon Service + AI Extraction\n• Scrape & LLM parsing\n• Returns product payloads"]
        ProductRepository["Product Repository\n• Typed SQL queries\n• AI category linking"]
        CacheService["Cache Service\n• In-memory query caching"]
    end

    subgraph External["External Services"]
        VercelPostgres["Vercel Postgres"]
        OpenAIAPI["OpenAI API"]
        ClerkAuth["Clerk Auth"]
    end

    MainApp --> ProductsAPI
    CalendarView --> ProductsAPI
    TimelineComponent --> ProductsAPI
    AdminPanel --> UsersAPI
    AdminPanelV2 --> UsersAPI
    ProfileForms --> ProfileAPI
    ProductsAPI --> ProductDomain
    ProfileAPI --> ProductDomain
    UsersAPI --> ProductDomain
    DatabaseMigration --> ProductRepository
    AIAgent --> AmazonExtraction
    AuthAPI --> ClerkAuth
    ProductDomain --> ProductRepository
    ProductDomain --> CacheService
    AmazonExtraction --> ProductRepository
    AmazonExtraction --> OpenAIAPI
    ProductRepository --> VercelPostgres
    CacheService -.-> ProductDomain
```

### Core Components

- **Frontend**: React 19 with Next.js 15, TypeScript, Tailwind CSS
- **Authentication**: Clerk for user management and authentication
- **Database**: Vercel Postgres with comprehensive schema for users, products, and profiles
- **AI Integration**: OpenAI API for intelligent product recommendations
- **State Management**: React hooks and context for local state
- **UI Components**: Custom components with FullCalendar and Vis Timeline

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 9+
- Vercel account (for database)
- Clerk account (for authentication)
- OpenAI account (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd babyshop
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in the required environment variables (see Environment Variables section below).

4. **Set up the database**
   
   Run the database migration to create tables and seed initial data:
   ```bash
   # Start the development server first
   pnpm dev
   
   # In another terminal, run the migration
   curl -X POST http://localhost:3000/api/database/migrate
   
   # Seed the products database
   curl -X POST http://localhost:3000/api/products/seed
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) for the main experience and
   [http://localhost:3000/how-it-works](http://localhost:3000/how-it-works) for the guided walkthrough.

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Clerk Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Required)
POSTGRES_URL=postgresql://...

# OpenAI Integration (Required for AI features)
OPENAI_API_KEY=sk-...
OPENAI_PROJECT=proj_...
OPENAI_AGENT_MODEL=gpt-4.1-mini
```

#### Environment Variable Details

- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: Your Clerk publishable key for frontend authentication
- **CLERK_SECRET_KEY**: Your Clerk secret key for backend authentication
- **POSTGRES_URL**: Vercel Postgres connection string (format: `postgresql://username:password@host:port/database`)
- **OPENAI_API_KEY**: Your OpenAI API key for AI-powered recommendations
- **OPENAI_PROJECT**: Your OpenAI project ID (optional)
- **OPENAI_AGENT_MODEL**: OpenAI model to use (default: gpt-4.1-mini)

### Database Setup

The application uses Vercel Postgres with a comprehensive schema designed for baby product recommendations and user management.

#### Database Schema

```mermaid
erDiagram
    USERS {
        string clerk_id PK
        string email
        string first_name
        string last_name
        datetime created_at
        datetime updated_at
    }

    USER_PROFILES {
        string user_id FK
        date due_date
        string baby_gender
        string budget_tier
        string color_palette
        string material_focus
        boolean eco_priority
        string hospital
        string provider
        string household_setup
        string care_network
        text medical_notes
        date birth_date
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        int id PK
        string name
        text description
        string category
        string subcategory
        string brand
        string image_url
        int price_cents
        string currency
        int age_range_min
        int age_range_max
        string tags
        boolean eco_friendly
        boolean premium
        boolean in_stock
        float rating
        int review_count
        string affiliate_url
        string source_url
        datetime created_at
        datetime updated_at
    }

    PRODUCT_REVIEWS {
        int id PK
        int product_id FK
        string user_id FK
        int rating
        text review_text
        datetime created_at
        datetime updated_at
    }

    RECOMMENDATIONS {
        int id PK
        string user_id FK
        int product_id FK
        float score
        text rationale
        datetime created_at
        datetime updated_at
    }

    PRODUCT_AI_CATEGORIES {
        int id PK
        int product_id FK
        int ai_category_id FK
    }

    AI_CATEGORIES {
        int id PK
        string name
        text description
    }

    USERS ||--|| USER_PROFILES : "has profile"
    USERS ||--o{ PRODUCT_REVIEWS : "writes"
    USERS ||--o{ RECOMMENDATIONS : "receives"
    PRODUCTS ||--o{ PRODUCT_REVIEWS : "is reviewed by"
    PRODUCTS ||--o{ RECOMMENDATIONS : "featured in"
    PRODUCTS ||--o{ PRODUCT_AI_CATEGORIES : "tagged with"
    AI_CATEGORIES ||--o{ PRODUCT_AI_CATEGORIES : "categorizes"
```

#### Main Tables

- **users**: Clerk user information and metadata
- **user_profiles**: User preferences, baby information, and settings
- **products**: Product catalog with categories, pricing, and metadata
- **product_reviews**: Product reviews and ratings
- **recommendations**: AI-generated product recommendations

#### Key Relationships

- `users.clerk_id` → `user_profiles.user_id` (One-to-One)
- `products.id` → `product_reviews.product_id` (One-to-Many)
- `users.clerk_id` → `product_reviews.user_id` (One-to-Many)
- `users.clerk_id` → `recommendations.user_id` (One-to-Many)
- `products.id` → `recommendations.product_id` (One-to-Many)

#### Setup Instructions

1. Create a Vercel Postgres database
2. Copy the connection string to `POSTGRES_URL`
3. Run the migration endpoint: `POST /api/database/migrate`
4. Seed products: `POST /api/products/seed`

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Import the repository in Vercel
   - Connect your Vercel Postgres database
   - Add environment variables in Vercel dashboard
   - Deploy with default settings

3. **Post-deployment setup**
   - Run database migration: `POST https://your-app.vercel.app/api/database/migrate`
   - Seed products: `POST https://your-app.vercel.app/api/products/seed`

## 📚 API Endpoints

### Authentication
- All API endpoints require Clerk authentication
- User context available via `auth()` from `@clerk/nextjs/server`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | Get products with filtering and pagination |
| `POST` | `/api/products` | Create new product |
| `POST` | `/api/products/seed` | Seed products database |
| `GET` | `/api/profile` | Get user profile |
| `POST` | `/api/profile` | Update user profile |
| `GET` | `/api/users` | Get all users (admin) |
| `DELETE` | `/api/users` | Clear all user data (admin) |
| `GET` | `/api/database` | Get database schema and stats |
| `POST` | `/api/database/migrate` | Run database migration |
| `POST` | `/api/ai/recommendations` | Get AI-powered recommendations |
| `POST` | `/api/agent/discover` | Look up live products online and return AI-ranked suggestions |

#### Product Discovery Agent

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "newborn sleep sacks",
    "limit": 4,
    "preferences": {
      "budgetTier": "standard",
      "ecoPriority": true,
      "milestoneId": "0-3months"
    }
  }' \
  http://localhost:3000/api/agent/discover
```

The agent performs an Amazon search, scrapes candidate product pages, and asks the OpenAI model to return parent-friendly recommendations. Ensure `OPENAI_API_KEY` is configured and the runtime can reach Amazon product pages.

### Query Parameters

**Products API** (`/api/products`):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category
- `ageMonths`: Filter by baby age in months
- `budgetTier`: Filter by budget tier (budget, standard, premium, luxury)
- `ecoFriendly`: Filter eco-friendly products (true/false)
- `search`: Search in name, description, or brand

## 🧪 Development Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Database
pnpm migrate      # Run database migration (if script exists)
pnpm seed         # Seed database with sample data (if script exists)
```

## 📁 Project Structure

```mermaid
graph TD
    src["src/\nSource root"]
    src --> app["app/\nNext.js app directory"]
    app --> admin["admin/\nAdmin dashboard"]
    app --> adminv2["admin-v2/\nEnhanced admin panel"]
    app --> howItWorks["how-it-works/\nGuided overview"]
    app --> apiDir["api/\nRoute handlers"]
    apiDir --> apiAi["ai/\nAI recommendations"]
    apiDir --> apiAuth["auth/\nClerk integration"]
    apiDir --> apiDatabase["database/\nMigration utilities"]
    apiDir --> apiProducts["products/\nProduct management"]
    apiDir --> apiProfile["profile/\nUser profiles"]
    app --> globals["globals.css\nGlobal styles"]
    app --> layout["layout.tsx\nRoot layout"]
    app --> page["page.tsx\nMain app entry"]
    src --> components["components/\nShared UI"]
    components --> calendarView["CalendarView.tsx\nCalendar component"]
    components --> timeline["Timeline.tsx\nMilestone timeline"]
    src --> dataDir["data/\nStatic data"]
    dataDir --> catalog["catalog.ts\nProduct catalog"]
    dataDir --> preferences["preferences.ts\nPreference types"]
    src --> libDir["lib/\nUtility libraries"]
    libDir --> dateCalculations["dateCalculations.ts\nDate helpers"]
    libDir --> openaiAgent["openaiAgent.ts\nOpenAI client"]
    libDir --> recommendation["recommendation.ts\nRecommendation logic"]
    src --> middleware["middleware.ts\nRequest middleware"]
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify `POSTGRES_URL` is correct
   - Ensure Vercel Postgres database is active
   - Check network connectivity

2. **Authentication Issues**
   - Verify Clerk keys are correct
   - Check domain configuration in Clerk dashboard
   - Ensure environment variables are loaded

3. **AI Recommendations Not Working**
   - Verify `OPENAI_API_KEY` is valid
   - Check API quota and billing
   - Ensure model name is correct

4. **Products Not Loading**
   - Run database migration: `POST /api/database/migrate`
   - Seed products: `POST /api/products/seed`
   - Check database connection

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `pnpm lint`
5. Commit changes: `git commit -m "Add feature"`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the API documentation
- Open an issue on GitHub
- Contact the development team
