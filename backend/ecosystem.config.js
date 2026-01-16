module.exports = {
  apps: [
    {
      name: 'crm-backend',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
