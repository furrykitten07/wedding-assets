const express = require('express');
const path = require('path');
const apiRouter = require('./api.cjs');

function mysqlApiPlugin() {
  return {
    name: 'mysql-api-plugin',
    configureServer(server) {
      const app = express();
      // Serve public/uploads directly if needed
      app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));
      app.use('/api', apiRouter);
      server.middlewares.use(app);
    },
    configurePreviewServer(server) {
      const app = express();
      app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));
      app.use('/api', apiRouter);
      server.middlewares.use(app);
    }
  };
}

module.exports = mysqlApiPlugin;

