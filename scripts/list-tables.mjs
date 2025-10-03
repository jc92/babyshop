import dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

dotenv.config({ path: '.env.local' });

async function listTables() {
  try {
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    if (!result.rows.length) {
      console.log('No tables found.');
      return;
    }

    console.log('Public schema tables:');
    for (const row of result.rows) {
      console.log(` - ${row.table_name}`);
    }
  } catch (error) {
    console.error('Failed to list tables:', error);
    process.exitCode = 1;
  }
}

await listTables();
