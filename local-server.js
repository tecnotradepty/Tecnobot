// Servidor express para pruebas locales opcionales
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const handler = require('./api/webhook');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.all('/api/webhook', (req, res) => handler(req, res));
app.all('/webhook', (req, res) => handler(req, res));

app.listen(PORT, () => {
  console.log(`[Tecnobot Local] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`[Tecnobot Local] Webhook URL: http://localhost:${PORT}/api/webhook`);
});
