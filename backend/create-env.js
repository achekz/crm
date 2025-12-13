const fs = require('fs');
const crypto = require('crypto');

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Create .env file content
const envContent = `# Database Configuration
MONGODB_URI=mongodb+srv://crmcmt:crmcmt12@crm.ct8puzi.mongodb.net/?retryWrites=true&w=majority&appName=CRM

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password_here
`;

// Write to .env file
fs.writeFileSync('.env', envContent);

console.log('.env file created successfully with a secure JWT secret and Stripe API keys placeholders.');
console.log('Remember to replace the Stripe API keys with your actual keys from the Stripe dashboard.');
console.log('Also add your Google Calendar API credentials for calendar integration.'); 