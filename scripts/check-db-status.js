// Check current database status
const checkStatus = async () => {
  try {
    console.log('Checking database status...');
    
    const response = await fetch('https://babyshop-d1z44bcpk-jc92s-projects.vercel.app/api/database/migrate', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('📊 Database Status:');
      console.log('Status:', result.status);
      console.log('Existing tables:', result.existing_tables);
      console.log('Schema entries:', result.schema?.length || 0);
      
      if (result.existing_tables.length === 6) {
        console.log('✅ All tables exist!');
      } else {
        console.log('❌ Missing tables. Need to run migration.');
        console.log('Expected: users, user_profiles, products, user_product_recommendations, user_product_interactions, advisor_chat_states');
      }
    } else {
      console.error('❌ Failed to check status:', result.error);
    }
  } catch (error) {
    console.error('❌ Error checking status:', error);
  }
};

checkStatus();
