module.exports = {
  apps: [
    {
      name: 'ecommerce-starter',
      script: 'backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
