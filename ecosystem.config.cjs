module.exports = {
  apps: [{
    name: 'canva-studio-pro',
    script: 'npx',
    args: 'tsx server/index.ts',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    time: true,
  }],
};
