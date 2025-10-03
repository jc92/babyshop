import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testAddProduct() {
  const testUrl = 'https://www.amazon.com/GLOSKIN-Childrens-Care-Kit-13-Piece/dp/B08N5KJ8XQ';
  
  console.log('🧪 Testing product addition API...');
  console.log('📝 Test URL:', testUrl);
  
  try {
    const response = await fetch('http://localhost:3007/api/products/add-from-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any auth headers if needed
      },
      body: JSON.stringify({
        sourceUrl: testUrl,
        milestoneId: 'month3',
        aiCategoryIds: ['care-organization']
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Product added:', data);
    } else {
      console.error('❌ Error:', data);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testAddProduct();
