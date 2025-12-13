const fs = require('fs');
const path = require('path');

// Create .env file content
const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development
API_PREFIX=/api
API_VERSION=v1
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:5000

# MongoDB Database
MONGODB_URI=mongodb+srv://crmcmt:<db_password>@crm.ct8puzi.mongodb.net/?retryWrites=true&w=majority&appName=CRM
DB_PASSWORD=crmcmt12

# JWT Authentication
JWT_SECRET=F3V7w2XQbZjvcHJLqEuCRTaKSyAeD5Gm
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=HpW8cY9kLzJs2MbNeXfAqDrG5vU4tT7R
JWT_REFRESH_EXPIRES_IN=30d

# File Storage
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760
STORAGE_PROVIDER=local

# Seed Database
SEED_DATABASE=true`;

// Write .env file to the backend directory
const envPath = path.join(__dirname, 'backend', '.env');
fs.writeFileSync(envPath, envContent);

console.log(`Created .env file at ${envPath}`); 