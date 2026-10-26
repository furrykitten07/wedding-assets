const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRouter = require('./api.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`Wedding System MySQL API Server berjalan di http://localhost:${PORT}`);
});

