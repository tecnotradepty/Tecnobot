// Servidor express para pruebas locales opcionales
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const webhookHandler = require('./api/webhook');
const configHandler = require('./api/config');

const app = express();
app.use(express.json());

// Servir archivos estáticos del panel visual
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// Rutas de API
app.all('/api/webhook', (req, res) => webhookHandler(req, res));
app.all('/webhook', (req, res) => webhookHandler(req, res));
app.all('/api/config', (req, res) => configHandler(req, res));

app.listen(PORT, () => {
  console.log(`[Tecnobot Studio] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`[Tecnobot Studio] Panel Visual: http://localhost:${PORT}`);
  console.log(`[Tecnobot Studio] Webhook URL: http://localhost:${PORT}/api/webhook`);
});
