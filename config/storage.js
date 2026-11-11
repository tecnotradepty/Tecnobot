// ========================================================
// SERVICIO DE ALMACENAMIENTO Y ESTADO EN REDIS
// ========================================================

const { DEFAULT_CONFIG } = require('./responses');

let inMemoryConfig = { ...DEFAULT_CONFIG };
const inMemoryPausedUsers = new Map();
const inMemorySeenUsers = new Set();

function getRedisCredentials() {
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

// Ejecutor de comandos Redis genéricos (Upstash REST API)
async function executeRedis(commandArray) {
  const { url, token, isConnected } = getRedisCredentials();
  if (!isConnected) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commandArray)
    });
    const data = await res.json();
    return data?.result;
  } catch (err) {
    console.error('[Redis Error]:', err);
    return null;
  }
}

// 1. Configuración del Bot
async function getConfig() {
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    const raw = await executeRedis(["GET", "tecnobot_config"]);
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return { ...DEFAULT_CONFIG, ...parsed };
      } catch (e) {
        console.error('Error parseando tecnobot_config:', e);
      }
    }
  }
  return inMemoryConfig;
}

async function saveConfig(newConfig) {
  inMemoryConfig = { ...DEFAULT_CONFIG, ...newConfig };
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    const res = await executeRedis(["SET", "tecnobot_config", JSON.stringify(inMemoryConfig)]);
    if (res !== null) {
      return { success: true, persistence: 'upstash_redis' };
    }
  }
  return { success: true, persistence: 'memory' };
}

// 2. Control de Pausa por Usuario (Handoff a Asesor y Silencio por Intervención Humana)
async function isUserPaused(userId) {
  if (!userId) return false;
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    const val = await executeRedis(["GET", `tecnobot:paused:${userId}`]);
    return Boolean(val);
  }

  const expiry = inMemoryPausedUsers.get(userId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    inMemoryPausedUsers.delete(userId);
    return false;
  }
  return true;
}

async function pauseUser(userId, ttlSeconds = 43200) { // 12 horas por defecto
  if (!userId) return;
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    await executeRedis(["SET", `tecnobot:paused:${userId}`, "1", "EX", String(ttlSeconds)]);
  } else {
    inMemoryPausedUsers.set(userId, Date.now() + (ttlSeconds * 1000));
  }
}

async function unpauseUser(userId) {
  if (!userId) return;
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    await executeRedis(["DEL", `tecnobot:paused:${userId}`]);
  } else {
    inMemoryPausedUsers.delete(userId);
  }
}

// 3. Control de Primer Contacto (Bienvenida para usuarios nuevos)
async function isFirstTimeUser(userId) {
  if (!userId) return false;
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    const seen = await executeRedis(["GET", `tecnobot:seen:${userId}`]);
    if (!seen) {
      // Marcar como visto (persiste 90 días)
      await executeRedis(["SET", `tecnobot:seen:${userId}`, "1", "EX", "7776000"]);
      return true;
    }
    return false;
  }

  if (!inMemorySeenUsers.has(userId)) {
    inMemorySeenUsers.add(userId);
    return true;
  }
  return false;
}

module.exports = {
  getRedisCredentials,
  getConfig,
  saveConfig,
  isUserPaused,
  pauseUser,
  unpauseUser,
  isFirstTimeUser
};
