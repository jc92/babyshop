import 'dotenv/config';

import { sql } from '@vercel/postgres';
import { prepareCoreDatabase } from '../src/lib/database/schema';

async function summarizeTables() {
  const result = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'users',
        'user_profiles',
        'milestones',
        'products',
        'user_product_recommendations',
        'user_product_interactions',
        'ai_categories',
        'product_ai_categories',
        'product_reviews'
      )
    ORDER BY table_name
  `;

  return result.rows.map((row) => row.table_name);
}

async function main() {
  console.log('Preparing core database schema…');
  await prepareCoreDatabase();

  const tables = await summarizeTables();
  console.log('✅ Database ready');
  console.table(tables.map((table) => ({ table })));
}

main().catch((error) => {
  console.error('❌ Failed to prepare database');
  console.error(error);
  process.exit(1);
});

