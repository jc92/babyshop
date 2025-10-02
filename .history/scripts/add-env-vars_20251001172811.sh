#!/bin/bash

echo "Adding Clerk environment variables to Vercel..."

# Add the publishable key
echo "pk_test_d2FybS1yYXZlbi0yOS5jbGVyay5hY2NvdW50cy5kZXYk" | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production

# Add the secret key
echo "sk_test_4tR2yzAh4Q5l4VUBWMqakJCTu80QqsGvXAMM5dfiiB" | vercel env add CLERK_SECRET_KEY production

echo "Environment variables added successfully!"
echo "You may need to redeploy your project for the changes to take effect."
