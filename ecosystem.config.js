module.exports = {
    apps : [{
      name: 'maldomed',
      script: 'server.js',
      exp_backoff_restart_delay: 100,
      args: '--inspect server.js',
      watch: true,
      ignore_watch: ["node_modules", "logs"],
    
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }]
  };
  