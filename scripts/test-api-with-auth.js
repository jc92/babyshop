import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testAPIWithAuth() {
  console.log('🧪 Testing API with authentication...');
  
  // Test URLs
  const testUrls = [
    'https://www.amazon.com/GLOSKIN-Childrens-Care-Kit-13-Piece/dp/B08N5KJ8XQ',
    'https://www.amazon.com/Organic-Cotton-Baby-Bodysuit-Newborn/dp/B07XYZ123',
    'https://www.amazon.com/Premium-Baby-Monitor-Wireless/dp/B08ABC456'
  ];
  
  for (let i = 0; i < testUrls.length; i++) {
    const testUrl = testUrls[i];
    console.log(`\n${i + 1}️⃣ Testing URL ${i + 1}: ${testUrl}`);
    
    try {
      // First, try to get a session or auth token
      console.log('  🔐 Attempting to get authentication...');
      
      // For now, let's test the endpoint directly and see what happens
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
      
      console.log('  📊 Response status:', response.status);
      console.log('  📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('  ✅ Success! Product added:', {
          productId: data.productId,
          message: data.message
        });
      } else {
        console.log('  ❌ Error response:', data);
        
        if (response.status === 401) {
          console.log('  🔐 Authentication required - this is expected for protected endpoints');
        }
      }
      
    } catch (error) {
      console.error('  💥 Request failed:', error.message);
    }
    
    // Wait a bit between requests
    if (i < testUrls.length - 1) {
      console.log('  ⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🎉 API testing completed!');
  console.log('📝 Note: 401 errors are expected since the API requires authentication');
  console.log('📝 To test fully, use the admin panel at http://localhost:3007/admin-v2');
}

testAPIWithAuth();
