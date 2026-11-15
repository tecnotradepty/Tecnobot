// ========================================================
// REESCRITURA NATURAL DE RESPUESTAS CON GEMINI (OPCIONAL POR VENTANA)
// ========================================================

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
const DEFAULT_AI_TIMEOUT_MS = 2800;

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

function validateRewrittenMessage(baseText, rawCandidate, context = {}) {
  const candidate = cleanGeminiOutput(rawCandidate, baseText);
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

async function callGeminiGenerate({ apiKey, model, systemPrompt, userPrompt, timeoutMs = DEFAULT_AI_TIMEOUT_MS }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const generationConfig = {
    maxOutputTokens: 450
  };
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

async function maybeRewriteWithGemini({
  baseText,
  userMessage = '',
  businessName = '',
  customer = null,
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

  const configuredModel = String(process.env.GEMINI_MODEL || '').trim();
  const modelCandidates = configuredModel ? [configuredModel] : FALLBACK_GEMINI_MODELS;

  const systemPrompt = [
    `Eres el asistente de estilo de atención al cliente por DM de Instagram${businessName ? ` para "${businessName}"` : ''}.`,
    'Tu única tarea es reescribir el MENSAJE BASE con un tono natural, cercano, humano y conciso en español, manteniendo exactamente su sentido.',
    'Reglas obligatorias:',
    '1. NO inventes precios, modelos, stock, direcciones, horarios, garantías ni servicios que no aparezcan en el mensaje base.',
    '2. Mantén EXACTOS y sin cambios todos los enlaces URL (https://...), teléfonos y nombres de usuario si aparecen.',
    '3. Si el mensaje base incluye números de menú u opciones (1, 2, 3, etc.), conserva TODOS esos números y opciones claros para que sigan funcionando igual.',
    '4. No agregues preguntas abiertas ni texto de relleno si no aportan claridad.',
    '5. Responde ÚNICAMENTE con el mensaje final listo para enviar en Instagram (sin comillas alrededor ni explicaciones).'
  ].join('\n');

  const safeClientMsg = String(userMessage || '').trim().slice(0, 260);
  const userPrompt = [
    safeClientMsg ? `Mensaje del cliente (solo para adaptar el tono del saludo/contexto): "${safeClientMsg}"` : '',
    'Mensaje base obligatorio a reescribir:',
    `"""\n${safeBase}\n"""`
  ].filter(Boolean).join('\n\n');

  let lastReason = 'api_error';
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i];
    const result = await callGeminiGenerate({ apiKey, model, systemPrompt, userPrompt, timeoutMs });
    if (result.ok) {
      const check = validateRewrittenMessage(safeBase, result.text, { customer });
      if (check.valid) {
        return { text: check.text, rewritten: true, model };
      }
      return { text: safeBase, rewritten: false, reason: check.reason, model };
    }
    lastReason = result.error || `http_${result.status}`;
    // Solo intentar modelo alternativo si este modelo devolvió 404 (no encontrado en este proyecto)
    if (result.status !== 404) break;
  }

  return { text: safeBase, rewritten: false, reason: lastReason };
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  getActiveGeminiModel,
  extractRequiredUrls,
  extractMenuOptionNumbers,
  validateRewrittenMessage,
  maybeRewriteWithGemini
};
