// ========================================================
// API DE CONFIGURACIÓN Y CONTROL DEL BOT
// ========================================================
const { getConfig, saveConfig } = require('../config/storage');

const DEFAULT_PIN = process.env.ADMIN_PIN || "047514";

module.exports = async function handler(req, res) {
  // CORS básico para permitir llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Obtener la configuración actual (GET)
  if (req.method === 'GET') {
    const config = await getConfig();
    const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_URL);
    return res.status(200).json({
      ...config,
      hasUpstash
    });
  }

  // 2. Guardar o modificar configuración (POST)
  if (req.method === 'POST') {
    const pin = req.headers['x-admin-pin'] || req.body?.pin;

    if (pin !== DEFAULT_PIN) {
      return res.status(401).json({ error: 'PIN de seguridad incorrecto' });
    }

    const { action } = req.query;

    // Acción rápida: Alternar estado activo/pausado
    if (action === 'toggle') {
      const current = await getConfig();
      const updated = { ...current, botActive: !current.botActive };
      const result = await saveConfig(updated);
      return res.status(200).json({ 
        success: true, 
        botActive: updated.botActive,
        persistence: result.persistence 
      });
    }

    // Guardar configuración completa de ganchos y respuestas
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Payload de configuración inválido' });
    }

    const result = await saveConfig(newConfig);
    return res.status(200).json({
      success: true,
      message: 'Configuración actualizada con éxito',
      persistence: result.persistence
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
};
