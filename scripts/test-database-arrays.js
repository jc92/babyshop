import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testDatabaseArrays() {
  console.log('🧪 Testing PostgreSQL array handling...');
  
  try {
    // Test 1: Simple array insertion
    console.log('\n1️⃣ Testing simple array insertion...');
    const testArray1 = ['test1', 'test2'];
    const testArray2 = [];
    
    console.log('Test array 1:', testArray1);
    console.log('Test array 2:', testArray2);
    console.log('JSON.stringify(array1):', JSON.stringify(testArray1));
    console.log('JSON.stringify(array2):', JSON.stringify(testArray2));
    
    // Test 2: Check if we can query existing data
    console.log('\n2️⃣ Testing existing data query...');
    const existingProducts = await sql`
      SELECT id, name, milestone_ids, tags 
      FROM products 
      LIMIT 3
    `;
    
    console.log('Existing products with arrays:');
    existingProducts.rows.forEach((product, index) => {
      console.log(`  Product ${index + 1}:`, {
        name: product.name,
        milestone_ids: product.milestone_ids,
        tags: product.tags,
        milestone_ids_type: typeof product.milestone_ids,
        tags_type: typeof product.tags
      });
    });
    
    // Test 3: Try different array insertion methods
    console.log('\n3️⃣ Testing different array insertion methods...');
    
    // Method 1: Direct array (should work)
    console.log('Method 1: Direct array');
    try {
      const result1 = await sql`
        INSERT INTO products (
          name, category, milestone_ids, tags, eco_friendly, premium, in_stock
        ) VALUES (
          'Test Product 1', 'accessories', ${testArray1}, ${testArray2}, false, false, true
        )
        RETURNING id
      `;
      console.log('✅ Method 1 success:', result1.rows[0]);
      
      // Clean up
      await sql`DELETE FROM products WHERE id = ${result1.rows[0].id}`;
      console.log('🧹 Cleaned up test product 1');
    } catch (error) {
      console.error('❌ Method 1 failed:', error.message);
    }
    
    // Method 2: JSON.stringify with ::text[] casting
    console.log('Method 2: JSON.stringify with ::text[] casting');
    try {
      const result2 = await sql`
        INSERT INTO products (
          name, category, milestone_ids, tags, eco_friendly, premium, in_stock
        ) VALUES (
          'Test Product 2', 'accessories', 
          ${JSON.stringify(testArray1)}::text[], 
          ${JSON.stringify(testArray2)}::text[], 
          false, false, true
        )
        RETURNING id
      `;
      console.log('✅ Method 2 success:', result2.rows[0]);
      
      // Clean up
      await sql`DELETE FROM products WHERE id = ${result2.rows[0].id}`;
      console.log('🧹 Cleaned up test product 2');
    } catch (error) {
      console.error('❌ Method 2 failed:', error.message);
    }
    
    // Method 3: JSON.stringify without casting
    console.log('Method 3: JSON.stringify without casting');
    try {
      const result3 = await sql`
        INSERT INTO products (
          name, category, milestone_ids, tags, eco_friendly, premium, in_stock
        ) VALUES (
          'Test Product 3', 'accessories', 
          ${JSON.stringify(testArray1)}, 
          ${JSON.stringify(testArray2)}, 
          false, false, true
        )
        RETURNING id
      `;
      console.log('✅ Method 3 success:', result3.rows[0]);
      
      // Clean up
      await sql`DELETE FROM products WHERE id = ${result3.rows[0].id}`;
      console.log('🧹 Cleaned up test product 3');
    } catch (error) {
      console.error('❌ Method 3 failed:', error.message);
    }
    
    console.log('\n🎉 Database array testing completed!');
    
  } catch (error) {
    console.error('💥 Database test failed:', error);
  }
}

testDatabaseArrays();
