// ========================================================
// MÓDULO IA GEMINI: REESCRITURA DE RESPUESTAS Y CLASIFICACIÓN DE HOOKS
// ========================================================

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
const DEFAULT_AI_TIMEOUT_MS = 2800;
const DEFAULT_CLASSIFY_TIMEOUT_MS = 2400;

function getActiveGeminiModel() {
  return String(process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
}

function extractRequiredUrls(text) {
  const matches = String(text || '').match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const cleaned = matches.map(u => u.replace(/[.,;!?)]+$/, '')).filter(Boolean);
  return Array.from(new Set(cleaned));
}

function extractMenuOptionNumbers(text) {
  const nums = new Set();
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^([1-9]\d?)(?:\uFE0F?\u20E3|[.):\-]\s|\s+[\-*])/);
    if (match) nums.add(match[1]);
  }
  return Array.from(nums);
}

function cleanGeminiOutput(raw, baseText) {
  let out = String(raw || '').trim();
  out = out.replace(/^```(?:\w+)?\s*\r?\n?/, '').replace(/\r?\n?```$/, '').trim();
  if (!/^["'«“]/.test(String(baseText || '').trim())) {
    if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith('“') && out.endsWith('”'))) {
      out = out.slice(1, -1).trim();
    }
  }
  return out;
}

const GREETING_CORE = '(?:hola|hey(?:\\s+qu[eé]\\s+(?:tal|xop[aá]|sop[aá]|m[aá]s))?|buenas(?:\\s+(?:tardes|noches|d[ií]as))?|buenos\\s+d[ií]as|qu[eé]\\s+(?:tal|xop[aá]|sop[aá]|hay|m[aá]s)|xop[aá]|saludos|bienvenid[oa]s?(?:\\s+a\\s+[^!.,:\\n]+)?)';
const STARTS_WITH_GREETING_RE = new RegExp(`^[¡!*\\s]*${GREETING_CORE}(?=$|[\\s,!?.:;*\\-)])`, 'i');
const LEADING_GREETING_RE = new RegExp(
  `^(?:[¡!*\\s]*${GREETING_CORE}(?=$|[\\s,!?.:;*\\-)])(?:[\\s,]+@[\\w.]+)?[!.,:,\\-\\s]*(?:¿?\\s*(?:c[oó]mo\\s+(?:est[aá]s|te\\s+va|andas|va\\s+todo)|todo\\s+bien)\\??[!.,\\s]*)?)(?:\\r?\\n)?`,
  'i'
);

function startsWithGreeting(text) {
  return STARTS_WITH_GREETING_RE.test(String(text || '').trim());
}

function stripLeadingGreetingIfNeeded(baseText, candidate, isInitialStep) {
  if (isInitialStep || startsWithGreeting(baseText) || !startsWithGreeting(candidate)) {
    return candidate;
  }
  const original = String(candidate || '').trim();
  let current = original;
  for (let i = 0; i < 3; i++) {
    if (!startsWithGreeting(current)) break;
    const next = current.replace(LEADING_GREETING_RE, '').trim();
    if (!next || next === current || next.length < 6) break;
    current = next;
  }
  if (current !== original && current.length >= 6) {
    return current.charAt(0).toUpperCase() + current.slice(1);
  }
  return candidate;
}

function validateRewrittenMessage(baseText, rawCandidate, context = {}) {
  const isInitialStep = Boolean(context?.isInitialStep);
  let candidate = cleanGeminiOutput(rawCandidate, baseText);
  candidate = stripLeadingGreetingIfNeeded(baseText, candidate, isInitialStep);
  if (!candidate || candidate.length < 4) {
    return { valid: false, reason: 'empty_output' };
  }

  const maxLen = Math.max(950, Math.round(String(baseText || '').length * 2.2));
  if (candidate.length > maxLen) {
    return { valid: false, reason: 'too_long' };
  }

  // Verificar que todos los enlaces del mensaje base permanezcan intactos
  const requiredUrls = extractRequiredUrls(baseText);
  for (const url of requiredUrls) {
    if (!candidate.includes(url)) {
      return { valid: false, reason: 'missing_url' };
    }
  }

  // Verificar que los números de opciones de menú no se hayan perdido
  const requiredNums = extractMenuOptionNumbers(baseText);
  for (const num of requiredNums) {
    const hasNum = new RegExp(`(?:^|\\D)${num}(?:\\uFE0F?\\u20E3|[.):\\-]|\\b)`, 'm').test(candidate);
    if (!hasNum) {
      return { valid: false, reason: `missing_option_${num}` };
    }
  }

  // Si el saludo/base ya incluía el usuario del cliente, comprobar que se conserve
  const uname = String(
    context?.customer?.username
    || context?.username
    || context?.customer?.name
    || context?.name
    || ''
  ).trim().replace(/^@+/, '');
  if (uname && String(baseText).toLowerCase().includes(uname.toLowerCase())) {
    if (!candidate.toLowerCase().includes(uname.toLowerCase())) {
      return { valid: false, reason: 'missing_username' };
    }
  }

  return { valid: true, text: candidate };
}

async function callGeminiGenerate({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
  maxOutputTokens = 450,
  responseMimeType = null
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const generationConfig = {
    maxOutputTokens
  };
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }
  if (/^gemini-3/i.test(model)) {
    generationConfig.thinkingConfig = { thinkingLevel: 'MINIMAL' };
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig
  };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
      ...(controller ? { signal: controller.signal } : {})
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error?.message || `HTTP ${res.status}`
      };
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p?.text || '').join('').trim();
    if (!text) {
      return { ok: false, status: res.status, error: 'empty_candidates' };
    }

    return { ok: true, status: res.status, text };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network_error') };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getModelCandidates() {
  const configuredModel = String(process.env.GEMINI_MODEL || '').trim();
  return configuredModel ? [configuredModel] : FALLBACK_GEMINI_MODELS;
}

async function runGeminiWithFallback({
  apiKey,
  systemPrompt,
  userPrompt,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
  maxOutputTokens = 450,
  responseMimeType = null
}) {
  const modelCandidates = getModelCandidates();
  let lastReason = 'api_error';
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i];
    const result = await callGeminiGenerate({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      timeoutMs,
      maxOutputTokens,
      responseMimeType
    });
    if (result.ok) {
      return { ...result, model };
    }
    lastReason = result.error || `http_${result.status}`;
    // Solo intentar modelo alternativo si este modelo devolvió 404 (no encontrado en este proyecto)
    if (result.status !== 404) break;
  }
  return { ok: false, error: lastReason };
}

function parseHookClassificationResponse(rawText, allowedIds) {
  let cleaned = String(rawText || '').trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\r?\n?/i, '').replace(/\r?\n?```$/, '').trim();
  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (__) {
        parsed = null;
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, matchedStepId: null, confidence: 'low', reason: 'invalid_json' };
  }

  const rawConf = String(parsed.confidence || 'medium').trim().toLowerCase();
  const confidence = (rawConf === 'high' || rawConf === 'medium' || rawConf === 'low') ? rawConf : 'medium';
  const reason = String(parsed.reason || '').trim().slice(0, 180);
  const rawId = parsed.matchedStepId;

  if (rawId === null || rawId === undefined || String(rawId).trim().toLowerCase() === 'null' || String(rawId).trim() === '') {
    return { ok: true, matchedStepId: null, confidence, reason };
  }

  const candidateId = String(rawId).trim();
  if (!allowedIds.has(candidateId)) {
    return { ok: false, matchedStepId: null, confidence: 'low', reason: 'unknown_step_id' };
  }

  if (confidence === 'low') {
    return { ok: true, matchedStepId: null, confidence: 'low', reason: reason || 'low_confidence' };
  }

  return { ok: true, matchedStepId: candidateId, confidence, reason };
}

function formatCandidatesForClassifier(candidates = []) {
  return candidates.map(c => {
    const item = {
      id: c.id,
      title: String(c.title || '').slice(0, 90),
      type: c.type || 'response'
    };
    if (c.isRoot) item.isRoot = true;
    if (c.connectedFromCurrentStep) {
      item.connectedFromCurrentStep = true;
      if (c.routeTrigger) item.routeTrigger = String(c.routeTrigger).slice(0, 120);
    }
    if (c.aiDescription) item.whenToChoose = String(c.aiDescription).trim().slice(0, 320);
    if (Array.isArray(c.keywords) && c.keywords.length > 0) {
      item.keywords = c.keywords.slice(0, 40);
    }
    if (Array.isArray(c.negativeKeywords) && c.negativeKeywords.length > 0) {
      item.avoidIf = c.negativeKeywords.slice(0, 35);
    }
    if (c.messagePreview) {
      item.replyPreview = String(c.messagePreview).trim().slice(0, 220);
    }
    return item;
  });
}

async function classifyHookWithGemini({
  userMessage = '',
  businessName = '',
  isNewCustomer = false,
  currentStep = null,
  candidates = [],
  timeoutMs = DEFAULT_CLASSIFY_TIMEOUT_MS
} = {}) {
  const safeMsg = String(userMessage || '').trim().slice(0, 500);
  if (!safeMsg || !Array.isArray(candidates) || candidates.length === 0) {
    return { ok: false, matchedStepId: null, confidence: 'low', reason: 'no_candidates' };
  }

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return { ok: false, matchedStepId: null, confidence: 'low', reason: 'missing_api_key' };
  }

  const formattedCandidates = formatCandidatesForClassifier(candidates);
  const allowedIds = new Set(formattedCandidates.map(c => c.id));

  const systemPrompt = [
    `Eres el clasificador de intención (hook router) para mensajes DM de Instagram${businessName ? ` de "${businessName}"` : ''} en Panamá.`,
    'Tu tarea es leer el mensaje completo del cliente y determinar cuál de los HOOKS CANDIDATOS es el mejor para responderle, o devolver null si ninguno aplica.',
    'Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:',
    '{"matchedStepId": "<id exacto del candidato o null>", "confidence": "high" | "medium" | "low", "reason": "<motivo breve en español>"}',
    'Reglas críticas:',
    '1. Analiza la intención real de TODA la frase completa, no te dejes engañar por palabras aisladas. Comprende español coloquial panameño (ej: "qué xopá", "agarran", "en cuánto me toman", "se me estrelló", "mandan pa\'l interior", "cuánto sale"), abreviaturas ("xq", "q", "disp", "cel") y errores de escritura.',
    '2. Si un candidato incluye "whenToChoose", úsalo como guía prioritaria de cuándo elegirlo.',
    '3. Respeta "avoidIf" (exclusiones): si la intención principal del cliente corresponde a una exclusión de un candidato, NO elijas ese candidato (elige el candidato correcto o null).',
    '   - Ejemplo: "En cuánto me toman mi iPhone 13 con pantalla rota?" -> la intención principal es vender/entregar el equipo (Trade-In), NO repararlo aunque mencione "pantalla".',
    '   - Ejemplo: "Tienen iPhone 14 de 128gb disponible y qué salud de batería trae?" -> la intención es comprar/consultar catálogo, NO taller ni ficha de venta.',
    '4. Si "currentStep" está presente y un candidato tiene "connectedFromCurrentStep": true, dale prioridad cuando el mensaje responda a las opciones o preguntas de ese paso actual.',
    '5. El paso raíz ("isRoot": true) SOLO debe elegirse si el cliente está saludando sin hacer otra consulta concreta o pidiendo el menú/opciones generales. Si saluda y además pregunta algo específico ("Hola, hasta qué hora abren?"), elige el hook específico (Horarios), NO el paso raíz.',
    '6. Devuelve "matchedStepId": null si el mensaje es solo un agradecimiento/cierre corto ("gracias", "ok", "dale", "listo", "perfecto"), charla casual sin intención de negocio, emojis sin consulta, o únicamente una ficha técnica suelta sin pregunta ("85% 128gb esim sin piezas cambiadas").',
    '7. Si no estás seguro, usa "confidence": "low" o "matchedStepId": null. NUNCA inventes un ID que no exista en los candidatos.'
  ].join('\n');

  const userPrompt = JSON.stringify({
    isNewCustomer: Boolean(isNewCustomer),
    currentStep: currentStep ? { id: currentStep.id, title: currentStep.title || '' } : null,
    customerMessage: safeMsg,
    candidates: formattedCandidates
  });

  const apiRes = await runGeminiWithFallback({
    apiKey,
    systemPrompt,
    userPrompt,
    timeoutMs,
    maxOutputTokens: 160,
    responseMimeType: 'application/json'
  });

  if (!apiRes.ok) {
    return { ok: false, matchedStepId: null, confidence: 'low', reason: apiRes.error || 'api_error' };
  }

  const parsed = parseHookClassificationResponse(apiRes.text, allowedIds);
  return {
    ...parsed,
    model: apiRes.model
  };
}

async function maybeRewriteWithGemini({
  baseText,
  userMessage = '',
  businessName = '',
  customer = null,
  isInitialStep = false,
  enabled = false,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS
} = {}) {
  const safeBase = String(baseText || '');
  if (!enabled || !safeBase.trim()) {
    return { text: safeBase, rewritten: false, reason: 'disabled' };
  }

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return { text: safeBase, rewritten: false, reason: 'missing_api_key' };
  }

  const systemPrompt = [
    `Eres el asistente de atención al cliente por DM de Instagram${businessName ? ` para "${businessName}"` : ''} en Panamá.`,
    'Tu única tarea es reescribir el MENSAJE BASE con un español panameño natural, cercano y amigable de tienda moderna (puedes usar toques suaves y naturales de jerga panameña como "qué xopá" al saludar, "por acá", "chequea", "con gusto", "dale", "me avisas", "cualquier cosa nos escribes", sin exagerar ni sonar vulgar o forzado).',
    'NO uses modismos de otros países (prohibido decir "wey", "güey", "chamo", "pana", "parcero", "che", "tío", "bacano", "qué onda", "órale").',
    isInitialStep
      ? 'CONTEXTO DEL PASO (Paso 0 / Primer saludo): SÍ puedes abrir con un saludo panameño breve y amigable (ej: "¡Qué xopá!", "¡Hola!", "¡Buenas!") conservando el usuario si aparece en el mensaje base.'
      : 'CONTEXTO DEL PASO (Después del Paso 0 — conversación ya iniciada): ESTÁ ESTRICTAMENTE PROHIBIDO iniciar o incluir saludos o bienvenidas ("Hola", "Buenas", "Qué tal", "Qué xopá", "Bienvenido", "¿Cómo estás?"). Ve DIRECTO al punto con la información de este paso.',
    'Reglas obligatorias:',
    '1. NO inventes precios, modelos, stock, direcciones, horarios, garantías ni servicios que no aparezcan en el mensaje base.',
    '2. Mantén EXACTOS y sin cambios todos los enlaces URL (https://...), teléfonos y nombres de usuario si aparecen.',
    '3. Si el mensaje base incluye números de menú u opciones (1, 2, 3, etc.), conserva TODOS esos números y opciones claros para que sigan funcionando igual.',
    '4. Responde ÚNICAMENTE con el mensaje final listo para enviar en Instagram (sin comillas alrededor ni explicaciones).'
  ].join('\n');

  const safeClientMsg = String(userMessage || '').trim().slice(0, 260);
  const userPrompt = [
    safeClientMsg ? `Mensaje del cliente (solo para adaptar el tono): "${safeClientMsg}"` : '',
    isInitialStep ? 'Posición en flujo: Paso 0 (inicio, puede llevar saludo panameño).' : 'Posición en flujo: Posterior al Paso 0 (NO incluir ningún saludo).',
    'Mensaje base obligatorio a reescribir:',
    `"""\n${safeBase}\n"""`
  ].filter(Boolean).join('\n\n');

  const result = await runGeminiWithFallback({
    apiKey,
    systemPrompt,
    userPrompt,
    timeoutMs,
    maxOutputTokens: 450
  });

  if (result.ok) {
    const check = validateRewrittenMessage(safeBase, result.text, { customer, isInitialStep });
    if (check.valid) {
      return { text: check.text, rewritten: true, model: result.model };
    }
    return { text: safeBase, rewritten: false, reason: check.reason, model: result.model };
  }

  return { text: safeBase, rewritten: false, reason: result.error || 'api_error' };
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  getActiveGeminiModel,
  extractRequiredUrls,
  extractMenuOptionNumbers,
  validateRewrittenMessage,
  parseHookClassificationResponse,
  classifyHookWithGemini,
  maybeRewriteWithGemini
};
