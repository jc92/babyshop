// Simple script to run database migration
// You need to be authenticated to run this

const runMigration = async () => {
  try {
    console.log('Running database migration...');
    
    const response = await fetch('https://babyshop-d1z44bcpk-jc92s-projects.vercel.app/api/database/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Migration successful!');
      console.log('Tables created:', result.tables);
      console.log('Message:', result.message);
    } else {
      console.error('❌ Migration failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error running migration:', error);
  }
};

const seedProducts = async () => {
  try {
    console.log('Seeding products...');
    
    const response = await fetch('https://babyshop-d1z44bcpk-jc92s-projects.vercel.app/api/products/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Products seeded successfully!');
      console.log('Products inserted:', result.products_inserted);
      console.log('Total products:', result.total_products);
    } else {
      console.error('❌ Seeding failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error seeding products:', error);
  }
};

// Run both migrations
runMigration().then(() => {
  console.log('\n---\n');
  return seedProducts();
}).then(() => {
  console.log('\n🎉 Database setup complete!');
}).catch(console.error);
