// ========================================================
// SERVICIO DE ALMACENAMIENTO DE CONFIGURACIÓN
// ========================================================
// Si UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN están presentes en Vercel,
// almacena y lee directamente desde Redis. De lo contrario, usa memoria / DEFAULT_CONFIG.

const { DEFAULT_CONFIG } = require('./responses');

let inMemoryConfig = { ...DEFAULT_CONFIG };

async function getConfig() {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const res = await fetch(`${upstashUrl}/get/tecnobot_config`, {
        headers: { Authorization: `Bearer ${upstashToken}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (err) {
      console.error('[Storage] Error leyendo de Upstash Redis:', err);
    }
  }

  return inMemoryConfig;
}

async function saveConfig(newConfig) {
  inMemoryConfig = { ...DEFAULT_CONFIG, ...newConfig };

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl}/set/tecnobot_config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inMemoryConfig)
      });
      return { success: true, persistence: 'upstash_redis' };
    } catch (err) {
      console.error('[Storage] Error guardando en Upstash Redis:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: true, persistence: 'memory' };
}

module.exports = {
  getConfig,
  saveConfig
};
