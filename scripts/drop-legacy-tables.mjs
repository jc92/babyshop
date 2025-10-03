import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

dotenv.config({ path: '.env.local' });

async function dropLegacyTables() {
  try {
    console.log('Dropping table if exists: profile_overviews');
    await sql`DROP TABLE IF EXISTS profile_overviews`;
    console.log('✔️  profile_overviews dropped (if it existed)');
  } catch (error) {
    console.error('Failed to drop legacy tables:', error);
    process.exitCode = 1;
  }
}

await dropLegacyTables();
