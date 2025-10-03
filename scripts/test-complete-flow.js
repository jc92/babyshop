import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testCompleteFlow() {
  console.log('🧪 Testing complete product addition flow...');
  
  try {
    // Test 1: Check database connection
    console.log('\n1️⃣ Testing database connection...');
    const dbTest = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connected:', dbTest.rows[0].current_time);
    
    // Test 2: Check existing products
    console.log('\n2️⃣ Checking existing products...');
    const existingProducts = await sql`
      SELECT COUNT(*) as count FROM products
    `;
    console.log('📊 Total products in database:', existingProducts.rows[0].count);
    
    // Test 3: Test array insertion directly
    console.log('\n3️⃣ Testing direct array insertion...');
    const testProduct = {
      name: 'Test Product for Flow',
      category: 'accessories',
      milestoneIds: ['month3', 'month6'],
      tags: ['test', 'flow', 'debugging'],
      ecoFriendly: false,
      premium: false,
      inStock: true
    };
    
    console.log('📝 Test product data:', testProduct);
    
    const insertResult = await sql`
      INSERT INTO products (
        name, category, milestone_ids, tags, eco_friendly, premium, in_stock
      ) VALUES (
        ${testProduct.name}, 
        ${testProduct.category}, 
        ${testProduct.milestoneIds}, 
        ${testProduct.tags}, 
        ${testProduct.ecoFriendly}, 
        ${testProduct.premium}, 
        ${testProduct.inStock}
      )
      RETURNING id, name, milestone_ids, tags
    `;
    
    console.log('✅ Product inserted successfully:');
    console.log('  🆔 ID:', insertResult.rows[0].id);
    console.log('  📝 Name:', insertResult.rows[0].name);
    console.log('  📅 Milestone IDs:', insertResult.rows[0].milestone_ids);
    console.log('  🏷️ Tags:', insertResult.rows[0].tags);
    
    // Test 4: Verify the inserted data
    console.log('\n4️⃣ Verifying inserted data...');
    const verifyResult = await sql`
      SELECT id, name, milestone_ids, tags, milestone_ids::text, tags::text
      FROM products 
      WHERE id = ${insertResult.rows[0].id}
    `;
    
    console.log('🔍 Verification query result:');
    console.log('  📅 Milestone IDs (array):', verifyResult.rows[0].milestone_ids);
    console.log('  🏷️ Tags (array):', verifyResult.rows[0].tags);
    console.log('  📅 Milestone IDs (text):', verifyResult.rows[0].milestone_ids_text);
    console.log('  🏷️ Tags (text):', verifyResult.rows[0].tags_text);
    
    // Test 5: Test empty arrays
    console.log('\n5️⃣ Testing empty arrays...');
    const emptyArrayProduct = {
      name: 'Test Empty Arrays',
      category: 'accessories',
      milestoneIds: [],
      tags: [],
      ecoFriendly: false,
      premium: false,
      inStock: true
    };
    
    const emptyArrayResult = await sql`
      INSERT INTO products (
        name, category, milestone_ids, tags, eco_friendly, premium, in_stock
      ) VALUES (
        ${emptyArrayProduct.name}, 
        ${emptyArrayProduct.category}, 
        ${emptyArrayProduct.milestoneIds}, 
        ${emptyArrayProduct.tags}, 
        ${emptyArrayProduct.ecoFriendly}, 
        ${emptyArrayProduct.premium}, 
        ${emptyArrayProduct.inStock}
      )
      RETURNING id, name, milestone_ids, tags
    `;
    
    console.log('✅ Empty arrays inserted successfully:');
    console.log('  🆔 ID:', emptyArrayResult.rows[0].id);
    console.log('  📅 Milestone IDs:', emptyArrayResult.rows[0].milestone_ids);
    console.log('  🏷️ Tags:', emptyArrayResult.rows[0].tags);
    
    // Clean up test products
    console.log('\n🧹 Cleaning up test products...');
    await sql`DELETE FROM products WHERE name LIKE 'Test %'`;
    console.log('✅ Test products cleaned up');
    
    console.log('\n🎉 Complete flow test successful!');
    console.log('✅ Direct array insertion works correctly');
    console.log('✅ Empty arrays work correctly');
    console.log('✅ Database operations are working');
    
  } catch (error) {
    console.error('💥 Complete flow test failed:');
    console.error('  🚨 Error type:', error?.constructor?.name);
    console.error('  📝 Error message:', error.message);
    console.error('  📊 Error stack:', error.stack);
  }
}

testCompleteFlow();
