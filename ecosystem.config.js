module.exports = {
  apps: [
    {
      name: 'na-shary-marketplace',
      script: 'backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
