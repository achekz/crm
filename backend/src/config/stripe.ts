import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe with API key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here', {
  apiVersion: '2023-10-16', // This is still compatible with stripe@14.25.0
});

export default stripe; 