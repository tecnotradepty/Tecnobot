// ========================================================
// SERVICIO DE ALMACENAMIENTO DE CONFIGURACIÓN
// ========================================================
// Detecta automáticamente cualquier formato de credenciales que Vercel Storage
// o Upstash Redis inyecte (KV_REST_API_URL, UPSTASH_REDIS_REST_URL, etc.)

const { DEFAULT_CONFIG } = require('./responses');

let inMemoryConfig = { ...DEFAULT_CONFIG };

function getRedisCredentials() {
  // 1. Lista de nombres habituales inyectados por Vercel Storage / Upstash
  const urlCandidates = [
    process.env.KV_REST_API_URL,
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.STORAGE_REST_API_URL,
    process.env.UPSTASH_URL,
    process.env.REDIS_REST_API_URL
  ];

  const tokenCandidates = [
    process.env.KV_REST_API_TOKEN,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.STORAGE_REST_API_TOKEN,
    process.env.UPSTASH_TOKEN,
    process.env.REDIS_REST_API_TOKEN
  ];

  let url = urlCandidates.find(Boolean);
  let token = tokenCandidates.find(Boolean);

  // 2. Búsqueda inteligente en process.env si Vercel usó un prefijo personalizado
  if (!url || !token) {
    for (const [key, val] of Object.entries(process.env)) {
      if (!val || typeof val !== 'string') continue;
      if (!url && (key.includes('REST_API_URL') || key.includes('REDIS_URL') || key.includes('UPSTASH_URL'))) {
        url = val;
      }
      if (!token && (key.includes('REST_API_TOKEN') || key.includes('REDIS_TOKEN') || key.includes('UPSTASH_TOKEN'))) {
        token = val;
      }
    }
  }

  if (url && !url.startsWith('http')) {
    url = `https://${url}`;
  }

  return { url, token, isConnected: Boolean(url && token) };
}

async function getConfig() {
  const { url, token, isConnected } = getRedisCredentials();

  if (isConnected) {
    try {
      const res = await fetch(`${url}/get/tecnobot_config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.result) {
        const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (err) {
      console.error('[Storage] Error leyendo de Redis:', err);
    }
  }

  return inMemoryConfig;
}

async function saveConfig(newConfig) {
  inMemoryConfig = { ...DEFAULT_CONFIG, ...newConfig };
  const { url, token, isConnected } = getRedisCredentials();

  if (isConnected) {
    try {
      await fetch(`${url}/set/tecnobot_config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inMemoryConfig)
      });
      return { success: true, persistence: 'upstash_redis' };
    } catch (err) {
      console.error('[Storage] Error guardando en Redis:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: true, persistence: 'memory' };
}

module.exports = {
  getRedisCredentials,
  getConfig,
  saveConfig
};
