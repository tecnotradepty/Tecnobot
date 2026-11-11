// ========================================================
// SERVICIO DE ALMACENAMIENTO Y ESTADO EN REDIS
// ========================================================

const { DEFAULT_CONFIG } = require('./responses');

const CURRENT_SCHEMA_VERSION = 2;

let inMemoryConfig = { ...DEFAULT_CONFIG, schemaVersion: CURRENT_SCHEMA_VERSION };
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

/**
 * Sincroniza e hidrata configuraciones guardadas en versiones anteriores
 * para asegurar que siempre cuenten con negativeKeywords, autoPause y hook_repairs
 */
function upgradeAndMergeConfig(saved) {
  if (!saved || typeof saved !== 'object') {
    return { ...DEFAULT_CONFIG, schemaVersion: CURRENT_SCHEMA_VERSION };
  }

  // Si la configuración guardada en Redis es del esquema antiguo (sin negativeKeywords ni Taller),
  // migrar inteligentemente preservando textos personalizados de Trade-In y URLs
  const isOldSchema = !saved.schemaVersion || saved.schemaVersion < CURRENT_SCHEMA_VERSION;

  const mergedSettings = {
    ...DEFAULT_CONFIG.settings,
    ...(saved.settings || {}),
    silentFallback: saved.settings?.silentFallback !== undefined ? saved.settings.silentFallback : true
  };

  if (isOldSchema) {
    return {
      ...DEFAULT_CONFIG,
      botActive: saved.botActive !== undefined ? saved.botActive : true,
      settings: mergedSettings,
      schemaVersion: CURRENT_SCHEMA_VERSION
    };
  }

  // Si ya es versión 2+, combinar cada gancho asegurando que no falten propiedades clave
  const savedHooks = Array.isArray(saved.hooks) ? saved.hooks : DEFAULT_CONFIG.hooks;
  const mergedHooks = savedHooks.map(hook => {
    const defaultMatch = DEFAULT_CONFIG.hooks.find(d => d.id === hook.id);
    if (!defaultMatch) return hook;
    return {
      ...defaultMatch,
      ...hook,
      negativeKeywords: Array.isArray(hook.negativeKeywords) ? hook.negativeKeywords : defaultMatch.negativeKeywords,
      autoPause: hook.autoPause !== undefined ? hook.autoPause : defaultMatch.autoPause,
      priority: hook.priority !== undefined ? hook.priority : defaultMatch.priority,
      allowedWhenPaused: hook.allowedWhenPaused !== undefined ? hook.allowedWhenPaused : defaultMatch.allowedWhenPaused,
      unpauseOnTrigger: hook.unpauseOnTrigger !== undefined ? hook.unpauseOnTrigger : defaultMatch.unpauseOnTrigger
    };
  });

  return {
    ...DEFAULT_CONFIG,
    ...saved,
    settings: mergedSettings,
    hooks: mergedHooks,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
}

// 1. Configuración del Bot
async function getConfig() {
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    const raw = await executeRedis(["GET", "tecnobot_config"]);
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const upgraded = upgradeAndMergeConfig(parsed);
        // Si fue migrado desde versión antigua, actualizar Redis de inmediato
        if (!parsed.schemaVersion || parsed.schemaVersion < CURRENT_SCHEMA_VERSION) {
          await executeRedis(["SET", "tecnobot_config", JSON.stringify(upgraded)]);
        }
        return upgraded;
      } catch (e) {
        console.error('Error parseando tecnobot_config:', e);
      }
    }
  }
  return inMemoryConfig;
}

async function saveConfig(newConfig) {
  inMemoryConfig = {
    ...DEFAULT_CONFIG,
    ...newConfig,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    const res = await executeRedis(["SET", "tecnobot_config", JSON.stringify(inMemoryConfig)]);
    if (res !== null) {
      return { success: true, persistence: 'upstash_redis' };
    }
  }
  return { success: true, persistence: 'memory' };
}

// 2. Control de Pausa por Usuario (Handoff a Asesor y Auto-Pausa en Cuestionarios)
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
