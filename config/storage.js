// ========================================================
// SERVICIO DE ALMACENAMIENTO, CLIENTES Y ESTADO EN REDIS
// ========================================================

const { DEFAULT_CONFIG } = require('./responses');

const CURRENT_SCHEMA_VERSION = 4;

let inMemoryConfig = { ...DEFAULT_CONFIG, schemaVersion: CURRENT_SCHEMA_VERSION };
let inMemoryCustomers = {};
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
 */
function upgradeAndMergeConfig(saved) {
  if (!saved || typeof saved !== 'object') {
    return { ...DEFAULT_CONFIG, schemaVersion: CURRENT_SCHEMA_VERSION };
  }

  const mergedSettings = {
    ...DEFAULT_CONFIG.settings,
    ...(saved.settings || {}),
    silentFallback: saved.settings?.silentFallback !== undefined ? saved.settings.silentFallback : true
  };

  const savedHooks = Array.isArray(saved.hooks) ? saved.hooks : DEFAULT_CONFIG.hooks;

  // Fusionar inteligentemente los hooks por defecto con lo guardado en Redis
  const mergedHooks = DEFAULT_CONFIG.hooks.map(defaultHook => {
    const savedMatch = savedHooks.find(s => s.id === defaultHook.id);
    if (!savedMatch) return defaultHook;

    const userKws = Array.isArray(savedMatch.keywords) ? savedMatch.keywords : [];
    const defaultKws = Array.isArray(defaultHook.keywords) ? defaultHook.keywords : [];
    const combinedKeywords = Array.from(new Set([...defaultKws, ...userKws]));

    const userNegs = Array.isArray(savedMatch.negativeKeywords) ? savedMatch.negativeKeywords : [];
    const defaultNegs = Array.isArray(defaultHook.negativeKeywords) ? defaultHook.negativeKeywords : [];
    const combinedNegatives = Array.from(new Set([...defaultNegs, ...userNegs]));

    return {
      ...defaultHook,
      ...savedMatch,
      response: savedMatch.response || defaultHook.response,
      keywords: combinedKeywords,
      negativeKeywords: combinedNegatives,
      autoPause: savedMatch.autoPause !== undefined ? savedMatch.autoPause : defaultHook.autoPause,
      priority: savedMatch.priority !== undefined ? savedMatch.priority : defaultHook.priority,
      allowedWhenPaused: savedMatch.allowedWhenPaused !== undefined ? savedMatch.allowedWhenPaused : defaultHook.allowedWhenPaused,
      unpauseOnTrigger: savedMatch.unpauseOnTrigger !== undefined ? savedMatch.unpauseOnTrigger : defaultHook.unpauseOnTrigger
    };
  });

  // Conservar ganchos personalizados creados por el usuario que no estén en DEFAULT_CONFIG
  const extraUserHooks = savedHooks.filter(s => !DEFAULT_CONFIG.hooks.some(d => d.id === s.id));
  const finalHooks = [...mergedHooks, ...extraUserHooks];

  // Fusionar e inicializar el Workflow de Pasos (Mapa Conceptual)
  const defaultWorkflow = DEFAULT_CONFIG.workflow;
  const savedWorkflow = saved.workflow || {};
  const savedSteps = Array.isArray(savedWorkflow.steps) ? savedWorkflow.steps : [];

  const mergedSteps = defaultWorkflow.steps.map(defaultStep => {
    const savedMatch = savedSteps.find(s => s.id === defaultStep.id);
    if (!savedMatch) return defaultStep;
    return {
      ...defaultStep,
      ...savedMatch,
      message: savedMatch.message || defaultStep.message,
      routes: Array.isArray(savedMatch.routes) && savedMatch.routes.length > 0 ? savedMatch.routes : defaultStep.routes,
      invalidMessage: savedMatch.invalidMessage !== undefined ? savedMatch.invalidMessage : defaultStep.invalidMessage,
      autoPause: savedMatch.autoPause !== undefined ? savedMatch.autoPause : defaultStep.autoPause
    };
  });

  const extraUserSteps = savedSteps.filter(s => !defaultWorkflow.steps.some(d => d.id === s.id));
  const finalWorkflow = {
    enabled: savedWorkflow.enabled !== undefined ? savedWorkflow.enabled : true,
    initialStepId: savedWorkflow.initialStepId || "step_welcome",
    steps: [...mergedSteps, ...extraUserSteps]
  };

  return {
    ...DEFAULT_CONFIG,
    ...saved,
    botActive: saved.botActive !== undefined ? saved.botActive : true,
    settings: mergedSettings,
    hooks: finalHooks,
    workflow: finalWorkflow,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
}

// ========================================================
// 1. CONFIGURACIÓN DEL BOT
// ========================================================
async function getConfig() {
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    const raw = await executeRedis(["GET", "tecnobot_config"]);
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const upgraded = upgradeAndMergeConfig(parsed);
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

// ========================================================
// 2. REGISTRO VISUAL DE CLIENTES Y CONTADOR DE PAUSA
// ========================================================

async function getCustomersMap() {
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    const raw = await executeRedis(["GET", "tecnobot_customers"]);
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') {
          inMemoryCustomers = parsed;
          return parsed;
        }
      } catch (e) {
        console.error('Error parseando tecnobot_customers:', e);
      }
    }
  }
  return inMemoryCustomers;
}

async function saveCustomersMap(mapObj) {
  inMemoryCustomers = mapObj || {};
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    await executeRedis(["SET", "tecnobot_customers", JSON.stringify(inMemoryCustomers)]);
  }
}

/**
 * Obtiene el perfil de Instagram (username y foto) desde Meta Graph API
 */
async function fetchInstagramProfile(userId, accessToken) {
  if (!userId || !accessToken) return null;
  try {
    const url = `https://graph.facebook.com/v21.0/${userId}?fields=name,username,profile_pic&access_token=${accessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && !data.error) {
      return {
        username: data.username || null,
        name: data.name || data.username || null,
        profilePic: data.profile_pic || null
      };
    }
  } catch (err) {
    console.error('[Profile Fetch Error]:', err);
  }
  return null;
}

/**
 * Registra o actualiza un cliente que interactuó con el bot
 */
async function upsertCustomer(userId, patch = {}, accessToken = '') {
  if (!userId) return null;
  const map = await getCustomersMap();
  const now = Date.now();

  const existing = map[userId] || {
    id: String(userId),
    username: null,
    name: null,
    profilePic: null,
    firstSeenAt: now,
    lastInteractionAt: now,
    lastMessage: '',
    lastHookId: null,
    pausedUntil: null,
    pauseDurationMs: null,
    pauseReason: null,
    messageCount: 0
  };

  // Si aún no tenemos el @username de Instagram (o pasaron >24h) y hay token, consultarlo a Meta
  const effectiveToken = accessToken || process.env.PAGE_ACCESS_TOKEN || '';
  const shouldFetchProfile = (!existing.username || !existing.profileFetchedAt || (now - existing.profileFetchedAt > 86400000)) && effectiveToken;

  if (shouldFetchProfile && !patch.username) {
    const profile = await fetchInstagramProfile(userId, effectiveToken);
    existing.profileFetchedAt = now;
    if (profile) {
      existing.username = profile.username;
      existing.name = profile.name;
      existing.profilePic = profile.profilePic;
    }
  }

  const updated = {
    ...existing,
    ...patch,
    lastInteractionAt: patch.lastInteractionAt || now,
    messageCount: (existing.messageCount || 0) + (patch.incrementCount ? 1 : 0)
  };
  delete updated.incrementCount;

  map[userId] = updated;
  await saveCustomersMap(map);
  return updated;
}

/**
 * Devuelve la lista ordenada de clientes con su estado y tiempo restante de pausa en vivo.
 * Hidrata automáticamente clientes previos existentes en Redis (seen / paused).
 */
async function getCustomersList() {
  const map = await getCustomersMap();
  const now = Date.now();
  const effectiveToken = process.env.PAGE_ACCESS_TOKEN || '';
  const { isConnected } = getRedisCredentials();
  let mapChanged = false;

  // Descubrir clientes existentes en claves Redis previas (seen / paused)
  if (isConnected) {
    try {
      const [pausedKeys, seenKeys] = await Promise.all([
        executeRedis(["KEYS", "tecnobot:paused:*"]),
        executeRedis(["KEYS", "tecnobot:seen:*"])
      ]);

      const allDiscoveredIds = new Set();
      if (Array.isArray(pausedKeys)) {
        pausedKeys.forEach(k => {
          const id = String(k).replace('tecnobot:paused:', '');
          if (id) allDiscoveredIds.add(id);
        });
      }
      if (Array.isArray(seenKeys)) {
        seenKeys.forEach(k => {
          const id = String(k).replace('tecnobot:seen:', '');
          if (id) allDiscoveredIds.add(id);
        });
      }

      for (const id of allDiscoveredIds) {
        if (!map[id]) {
          map[id] = {
            id,
            username: null,
            name: null,
            profilePic: null,
            firstSeenAt: now,
            lastInteractionAt: now,
            lastMessage: 'Conversación previa en Instagram',
            lastHookId: null,
            pausedUntil: null,
            pauseDurationMs: 43200000,
            pauseReason: null,
            messageCount: 1
          };
          mapChanged = true;
        }

        // Si tiene llave de pausa activa en Redis pero no en el mapa, sincronizar su TTL
        if (Array.isArray(pausedKeys) && pausedKeys.includes(`tecnobot:paused:${id}`)) {
          if (!map[id].pausedUntil || Number(map[id].pausedUntil) <= now) {
            const ttl = await executeRedis(["TTL", `tecnobot:paused:${id}`]);
            if (typeof ttl === 'number' && ttl > 0) {
              map[id].pausedUntil = now + (ttl * 1000);
              map[id].pauseDurationMs = map[id].pauseDurationMs || 43200000;
              map[id].pauseReason = map[id].pauseReason || 'En atención humana';
              mapChanged = true;
            }
          }
        }
      }
    } catch (e) {
      console.error('[Customer Discovery Error]:', e);
    }
  }

  // Hidratar perfiles de Instagram faltantes
  for (const cust of Object.values(map)) {
    if ((!cust.username && !cust.profileFetchedAt) && effectiveToken) {
      const profile = await fetchInstagramProfile(cust.id, effectiveToken);
      cust.profileFetchedAt = now;
      if (profile) {
        cust.username = profile.username;
        cust.name = profile.name;
        cust.profilePic = profile.profilePic;
      }
      mapChanged = true;
    }
  }

  if (mapChanged) {
    await saveCustomersMap(map);
  }

  const list = Object.values(map).map(cust => {
    const pausedUntil = cust.pausedUntil ? Number(cust.pausedUntil) : 0;
    const isPaused = pausedUntil > now;
    const remainingMs = isPaused ? Math.max(0, pausedUntil - now) : 0;

    return {
      ...cust,
      isPaused,
      remainingMs,
      pausedUntil: isPaused ? pausedUntil : null,
      pauseReason: isPaused ? (cust.pauseReason || 'En atención humana') : null
    };
  });

  // Ordenar: primero los que están en pausa, luego por interacción más reciente
  list.sort((a, b) => {
    if (a.isPaused !== b.isPaused) return a.isPaused ? -1 : 1;
    return (b.lastInteractionAt || 0) - (a.lastInteractionAt || 0);
  });
  return list;
}

// ========================================================
// 3. CONTROL DE PAUSA Y CONTEO REGRESIVO POR USUARIO
// ========================================================
async function isUserPaused(userId) {
  if (!userId) return false;

  // 1. Verificar en el mapa de clientes (tiene timestamp exacto)
  const map = await getCustomersMap();
  const cust = map[userId];
  if (cust && cust.pausedUntil) {
    if (Number(cust.pausedUntil) > Date.now()) {
      return true;
    } else {
      // Ya expiró la pausa, limpiar
      cust.pausedUntil = null;
      cust.pauseReason = null;
      await saveCustomersMap(map);
    }
  }

  // 2. Respaldo con clave TTL directa en Redis
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    const ttl = await executeRedis(["TTL", `tecnobot:paused:${userId}`]);
    if (typeof ttl === 'number' && ttl > 0) {
      // Sincronizar en el mapa de clientes si no estaba
      const pausedUntil = Date.now() + (ttl * 1000);
      await upsertCustomer(userId, { pausedUntil, pauseReason: 'En atención humana' });
      return true;
    }
    return false;
  }

  const expiry = inMemoryPausedUsers.get(userId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    inMemoryPausedUsers.delete(userId);
    return false;
  }
  return true;
}

async function pauseUser(userId, ttlSeconds = 43200, reason = 'En atención humana', accessToken = '') {
  if (!userId) return;
  const durationMs = Number(ttlSeconds) * 1000;
  const pausedUntil = Date.now() + durationMs;

  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    await executeRedis(["SET", `tecnobot:paused:${userId}`, "1", "EX", String(Math.round(ttlSeconds))]);
  } else {
    inMemoryPausedUsers.set(userId, pausedUntil);
  }

  await upsertCustomer(userId, {
    pausedUntil,
    pauseDurationMs: durationMs,
    pauseReason: reason
  }, accessToken);
}

async function unpauseUser(userId) {
  if (!userId) return;
  const { isConnected } = getRedisCredentials();

  if (isConnected) {
    await executeRedis(["DEL", `tecnobot:paused:${userId}`]);
  } else {
    inMemoryPausedUsers.delete(userId);
  }

  const map = await getCustomersMap();
  if (map[userId]) {
    map[userId].pausedUntil = null;
    map[userId].pauseReason = null;
    await saveCustomersMap(map);
  }
}

async function deleteCustomer(userId) {
  if (!userId) return;
  const { isConnected } = getRedisCredentials();
  if (isConnected) {
    await executeRedis(["DEL", `tecnobot:paused:${userId}`]);
    await executeRedis(["DEL", `tecnobot:seen:${userId}`]);
  }
  inMemoryPausedUsers.delete(userId);
  inMemorySeenUsers.delete(userId);

  const map = await getCustomersMap();
  if (map[userId]) {
    delete map[userId];
    await saveCustomersMap(map);
  }
}

// ========================================================
// 4. CONTROL DE PRIMER CONTACTO (CLIENTES NUEVOS)
// ========================================================
async function isFirstTimeUser(userId) {
  if (!userId) return false;

  const map = await getCustomersMap();
  if (map[userId]) {
    return false;
  }

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

async function getCustomerStep(userId) {
  if (!userId) return null;
  const map = await getCustomersMap();
  return map[userId]?.currentStep || null;
}

module.exports = {
  getRedisCredentials,
  getConfig,
  saveConfig,
  upgradeAndMergeConfig,
  getCustomersList,
  getCustomerStep,
  upsertCustomer,
  deleteCustomer,
  isUserPaused,
  pauseUser,
  unpauseUser,
  isFirstTimeUser
};
